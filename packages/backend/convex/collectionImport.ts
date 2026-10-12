import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  type QueryCtx,
  action,
  internalQuery,
  mutation,
} from "./_generated/server";
import { albumLimits, checkAlbum, nextColour } from "./albums/rules";
import {
  type ImportRow,
  type RejectedRow,
  defined,
  importErrors,
  importLimits,
  readImportFile,
  rowErrors,
} from "./collection/importRows";
import { countAlbumCreated } from "./collectionCounts";
import { catalogVisibleTo } from "./featureFlags";
import { checkAmountsWrite, holdsAmount } from "./homeCurrency/rules";
import { checkFields, latestPurchaseDate, storeNewItem } from "./items";
import { type CatalogEntryLink, catalogEntryByKey } from "./items/resolve";
import { checkSale } from "./items/rules";
import { itemsLeftToAdd, requireRoomForItems } from "./plans";
import { requireSetUpUser } from "./utils/auth";
import {
  grader,
  gradingScale,
  itemType,
  material,
  stampCatalogue,
  strike,
} from "./utils/validators";
import { clearWant } from "./wants";

/**
 * Importing Items from a CSV file laid out like the Collection export
 * (collection/importRows.ts reads it). First a preview: what would be added,
 * what's rejected and why, and what fits the person's plan; nothing is
 * written. Then the accepted rows are added a batch at a time, each batch
 * all or nothing, checked again by the same rules as adding an Item by hand.
 */

const importRow = v.object({
  row: v.number(),
  type: itemType,
  title: v.string(),
  year: v.optional(v.number()),
  denomination: v.optional(v.string()),
  gradingScale: v.optional(gradingScale),
  grade: v.optional(v.string()),
  strike: v.optional(strike),
  material: v.optional(material),
  materialNote: v.optional(v.string()),
  grader: v.optional(grader),
  graderName: v.optional(v.string()),
  certificateNumber: v.optional(v.string()),
  stampCatalogue: v.optional(stampCatalogue),
  stampCatalogueName: v.optional(v.string()),
  stampCatalogueNumber: v.optional(v.string()),
  perforation: v.optional(v.string()),
  watermark: v.optional(v.string()),
  colour: v.optional(v.string()),
  serialNumber: v.optional(v.string()),
  signatures: v.optional(v.string()),
  printer: v.optional(v.string()),
  country: v.optional(v.string()),
  quantity: v.optional(v.number()),
  purchasePrice: v.optional(v.number()),
  marketValue: v.optional(v.number()),
  currency: v.optional(v.string()),
  purchaseDate: v.optional(v.string()),
  source: v.optional(v.string()),
  notes: v.optional(v.string()),
  soldOn: v.optional(v.string()),
  salePrice: v.optional(v.number()),
  saleNote: v.optional(v.string()),
  album: v.optional(v.string()),
  catalogEntry: v.optional(v.string()),
});
// The validator and the reader's type describe the same row.
const _sameRow: Infer<typeof importRow> extends ImportRow ? true : never = true;

const rejectedRow = v.object({ row: v.number(), reason: v.string() });

const checkResult = v.object({
  rows: v.array(importRow),
  rejected: v.array(rejectedRow),
  albumsToCreate: v.array(v.string()),
  linked: v.number(),
  itemsLeft: v.union(v.number(), v.null()),
});

/** Album names compare without regard to capitals or surrounding spaces. */
const albumKey = (name: string) => name.trim().toLocaleLowerCase();

/**
 * The person's Albums: each one's id by name (the first, should two names
 * differ only in capitals) and every Album's colour, one per Album, so
 * `colours.length` is how many they have.
 */
async function albumsOf(ctx: QueryCtx, ownerId: Id<"users">) {
  const albums = await ctx.db
    .query("albums")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
    .take(albumLimits.count);
  const byName = new Map<string, Id<"albums">>();
  for (const album of albums)
    if (!byName.has(albumKey(album.name)))
      byName.set(albumKey(album.name), album._id);
  return { byName, colours: albums.map((album) => album.colour) };
}

/**
 * Checks rows against the person's Collection and the rules every Item meets:
 * the Home currency (and that it isn't being changed, for a row with an
 * amount), the Catalog entry, the fields and the sale. Each row's stored
 * fields, or the reason it's left out.
 */
async function checkRows(
  ctx: QueryCtx,
  owner: Doc<"users">,
  rows: ImportRow[],
) {
  const today = latestPurchaseDate();
  const catalogVisible = await catalogVisibleTo(ctx, owner);
  const entries = new Map<string, CatalogEntryLink | null>();
  const entryOf = async (key: string) => {
    if (!entries.has(key))
      entries.set(
        key,
        catalogVisible ? await catalogEntryByKey(ctx, key) : null,
      );
    return entries.get(key) ?? null;
  };
  const checked: Array<
    | {
        row: ImportRow;
        entry: CatalogEntryLink | null;
        fields: ReturnType<typeof checkFields>;
        sale: ReturnType<typeof checkSale> | null;
      }
    | RejectedRow
  > = [];
  for (const row of rows) {
    const {
      row: number,
      currency,
      album,
      catalogEntry,
      soldOn,
      salePrice,
      saleNote,
      ...input
    } = row;
    try {
      if (currency !== undefined && currency !== owner.homeCurrency)
        throw new ConvexError(rowErrors.otherCurrency);
      // Its currency column, if any, was just checked.
      if (holdsAmount(row)) checkAmountsWrite(owner, undefined);
      const entry = catalogEntry ? await entryOf(catalogEntry) : null;
      if (catalogEntry && !entry)
        throw new ConvexError(rowErrors.unknownCatalogEntry);
      if (album !== undefined) checkAlbum({ name: album, colour: "blue" });
      const fields = checkFields(input, entry);
      const sale =
        soldOn === undefined
          ? null
          : checkSale(
              { soldOn, salePrice, saleNote },
              today,
              fields.purchaseDate,
            );
      checked.push({ row, entry, fields, sale });
    } catch (error) {
      if (!(error instanceof ConvexError) || typeof error.data !== "string")
        throw error;
      checked.push({ row: number, reason: error.data });
    }
  }
  return checked;
}

/**
 * The preview's checks, run as the signed-in person: which rows would be
 * added and which are rejected, the Albums to create, the rows linked to the
 * Catalog, and how many more Items their plan takes (null: no limit).
 */
export const check = internalQuery({
  args: { rows: v.array(importRow) },
  returns: checkResult,
  handler: async (ctx, { rows }) => {
    const owner = await requireSetUpUser(ctx);
    const accepted: ImportRow[] = [];
    const rejected: RejectedRow[] = [];
    for (const result of await checkRows(ctx, owner, rows)) {
      if ("reason" in result) rejected.push(result);
      else accepted.push(result.row);
    }
    // New Albums, each named once, as the first row naming it writes it.
    const existing = await albumsOf(ctx, owner._id);
    const albumsToCreate = new Map<string, string>();
    for (const { album } of accepted)
      if (
        album &&
        !existing.byName.has(albumKey(album)) &&
        !albumsToCreate.has(albumKey(album))
      )
        albumsToCreate.set(albumKey(album), album.trim());
    const room = albumLimits.count - existing.colours.length;
    const tooMany = new Set([...albumsToCreate.keys()].slice(room));
    const fits = accepted.filter((row) => {
      if (!row.album || !tooMany.has(albumKey(row.album))) return true;
      rejected.push({ row: row.row, reason: rowErrors.tooManyAlbums });
      return false;
    });
    const left = await itemsLeftToAdd(ctx, owner._id);
    return {
      rows: fits,
      rejected: rejected.sort((a, b) => a.row - b.row),
      albumsToCreate: [...albumsToCreate]
        .filter(([key]) => !tooMany.has(key))
        .map(([, name]) => name),
      linked: fits.filter((row) => row.catalogEntry).length,
      itemsLeft: Number.isFinite(left) ? left : null,
    };
  },
});

/**
 * Reads a CSV file and previews its import: the rows that would be added,
 * the rows rejected with their row numbers and reasons, the headings it
 * ignores, the Albums it would create and the rows it would link to the
 * Catalog, and how many Items the person's plan still takes (null: no
 * limit). Nothing is written. A file it can't take at all (too large, too
 * many rows, unreadable, no heading it knows) is refused with the reason.
 */
export const preview = action({
  args: { text: v.string() },
  returns: v.object({
    rows: v.array(importRow),
    rejected: v.array(rejectedRow),
    ignoredHeadings: v.array(v.string()),
    albumsToCreate: v.array(v.string()),
    linked: v.number(),
    itemsLeft: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, { text }) => {
    const read = readImportFile(text);
    if (typeof read === "string") throw new ConvexError(read);
    // Annotated: a function calling one in its own module can't infer it.
    const checked: Infer<typeof checkResult> = await ctx.runQuery(
      internal.collectionImport.check,
      { rows: read.rows },
    );
    return {
      ...checked,
      rejected: [...read.rejected, ...checked.rejected].sort(
        (a, b) => a.row - b.row,
      ),
      ignoredHeadings: read.ignoredHeadings,
    };
  },
});

/** The Album a row names: an existing one, else a new one made once. */
async function albumFor(
  ctx: MutationCtx,
  ownerId: Id<"users">,
  albums: Awaited<ReturnType<typeof albumsOf>>,
  name: string,
) {
  const found = albums.byName.get(albumKey(name));
  if (found) return found;
  if (albums.colours.length >= albumLimits.count)
    throw new ConvexError(rowErrors.tooManyAlbums);
  const fields = checkAlbum({ name, colour: nextColour(albums.colours) });
  const albumId = await ctx.db.insert("albums", {
    ownerId,
    ...fields,
    itemCount: 0,
    soldItemCount: 0,
  });
  await countAlbumCreated(ctx, { ownerId });
  albums.byName.set(albumKey(name), albumId);
  albums.colours.push(fields.colour);
  return albumId;
}

/**
 * Adds a batch of previewed rows (at most `importLimits.batch`) as Items,
 * all or nothing: every row is checked again, the owned ones must fit the
 * person's plan, and a row that fails refuses the whole batch with its row
 * number and reason. Imported Items have no photos. Returns how many were
 * added.
 */
export const addBatch = mutation({
  args: { rows: v.array(importRow) },
  returns: v.number(),
  handler: async (ctx, { rows }) => {
    const owner = await requireSetUpUser(ctx);
    if (rows.length > importLimits.batch)
      throw new ConvexError(importErrors.batchTooLarge);
    const checked = await checkRows(ctx, owner, rows);
    const failed = checked.find((result) => "reason" in result);
    if (failed && "reason" in failed)
      throw new ConvexError({ row: failed.row, reason: failed.reason });
    await requireRoomForItems(
      ctx,
      owner._id,
      rows.filter((row) => row.soldOn === undefined).length,
    );
    const albums = await albumsOf(ctx, owner._id);
    for (const result of checked) {
      if ("reason" in result) continue;
      const { row, entry, fields, sale } = result;
      const albumId = row.album
        ? await albumFor(ctx, owner._id, albums, row.album)
        : undefined;
      await storeNewItem(ctx, {
        ownerId: owner._id,
        ...fields,
        ...(entry && { catalogEntryId: entry._id }),
        ...(albumId && { albumId }),
        ...(sale && defined(sale)),
      });
      // An owned Item made from a wanted entry takes it off the Wantlist.
      if (entry && !sale) await clearWant(ctx, owner._id, entry._id);
    }
    return rows.length;
  },
});
