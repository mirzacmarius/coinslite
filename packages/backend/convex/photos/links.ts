import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  env,
  httpAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { hex } from "../utils/hex";
import { photoSignatureLength, photoType } from "./rules";

/**
 * Links to Item photos. A photo is never handed out as a plain storage
 * address, which anyone holding it could open for good: its owner's queries
 * give a link to GET /photos on this deployment, signed for that file and
 * owner with a server secret, that works for an hour at most. Queries can't
 * read the clock, so the time a link is issued at is kept in one document
 * that a cron renews every half hour; queries rerun then and hand out fresh
 * links, each good for at least another half hour.
 *
 * The secret is PHOTO_LINK_SECRET. A deployment without it (local
 * development, tests) signs with a random secret it keeps in that document
 * instead, which never leaves the backend either.
 */

/** How long a link works after it's issued. */
export const photoLinkLifetime = 60 * 60 * 1000;
/** How much later than this deployment's clock a link may claim to be issued. */
const clockSkew = 60 * 1000;

const linkKeys = (ctx: QueryCtx) => ctx.db.query("photoLinkKeys").unique();

const secretOf = (keys: Doc<"photoLinkKeys">) =>
  env.PHOTO_LINK_SECRET || keys.fallbackSecret;

/** Starts issuing links as of now; makes the document on first use. */
async function issueAsOfNow(ctx: MutationCtx) {
  const keys = await linkKeys(ctx);
  if (keys) {
    await ctx.db.patch(keys._id, { issuedAt: Date.now() });
    return;
  }
  const random = crypto.getRandomValues(new Uint8Array(32));
  await ctx.db.insert("photoLinkKeys", {
    issuedAt: Date.now(),
    fallbackSecret: hex(random),
  });
}

/** Makes sure links can be issued: called whenever a photo is saved. */
export async function ensurePhotoLinks(ctx: MutationCtx) {
  if (!(await linkKeys(ctx))) await issueAsOfNow(ctx);
}

/** Every half hour (crons.ts): links are issued as of now from here on. */
export const renew = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await issueAsOfNow(ctx);
    return null;
  },
});

/**
 * A link to one of `ownerId`'s photos. Only call it for the owner's own
 * photo, from a query that checked who's asking. Null before any photo was
 * saved on this deployment.
 */
export async function photoLink(
  ctx: QueryCtx,
  ownerId: Id<"users">,
  storageId: Id<"_storage">,
) {
  const keys = await linkKeys(ctx);
  if (!keys) return null;
  const issued = String(keys.issuedAt);
  const signature = await sign(secretOf(keys), storageId, ownerId, issued);
  const query = new URLSearchParams({
    file: storageId,
    owner: ownerId,
    issued,
    signature,
  });
  return `${env.CONVEX_SITE_URL}/photos?${query}`;
}

/** What GET /photos needs to check a link's signature. */
export const keys = internalQuery({
  args: {},
  returns: v.union(v.null(), v.object({ secret: v.string() })),
  handler: async (ctx) => {
    const keys = await linkKeys(ctx);
    return keys && { secret: secretOf(keys) };
  },
});

const forbidden = () => new Response("Forbidden", { status: 403 });

/**
 * GET /photos: the photo a link names, if the link is signed and fresh.
 * Anything else is refused, the same way whatever is wrong with it.
 */
export const serve = httpAction(async (ctx, request) => {
  const params = new URL(request.url).searchParams;
  const file = params.get("file");
  const owner = params.get("owner");
  const issued = params.get("issued");
  const signature = params.get("signature");
  if (!file || !owner || !issued || !signature) return forbidden();
  const issuedAt = Number(issued);
  const now = Date.now();
  if (
    !Number.isSafeInteger(issuedAt) ||
    issuedAt > now + clockSkew ||
    issuedAt + photoLinkLifetime <= now
  )
    return forbidden();
  const keys = await ctx.runQuery(internal.photos.links.keys, {});
  if (
    !keys ||
    !sameText(await sign(keys.secret, file, owner, issued), signature)
  )
    return forbidden();
  const photo = await ctx.storage.get(file as Id<"_storage">);
  if (!photo) return new Response("Not found", { status: 404 });
  const head = await photo.slice(0, photoSignatureLength).arrayBuffer();
  // The browser keeps the file for as long as the link works, without asking
  // again even on a reload: a stored file never changes, so neither does
  // what a link shows. Shared caches keep nothing.
  const maxAge = Math.floor((issuedAt + photoLinkLifetime - now) / 1000);
  return new Response(photo, {
    headers: {
      "Content-Type":
        photoType(new Uint8Array(head)) ?? "application/octet-stream",
      "Cache-Control": `private, max-age=${maxAge}, immutable`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
});

const encoder = new TextEncoder();

/** HMAC-SHA256 of the file, owner and issue time, as hex. */
async function sign(
  secret: string,
  file: string,
  owner: string,
  issued: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${file}.${owner}.${issued}`),
  );
  return hex(new Uint8Array(mac));
}

/** Compares two strings in time that doesn't depend on where they differ. */
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let at = 0; at < a.length; at++)
    difference |= a.charCodeAt(at) ^ b.charCodeAt(at);
  return difference === 0;
}
