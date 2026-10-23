import { type Locale, defaultLocale, isLocale } from "@coinslite/i18n";
import { Email } from "@convex-dev/auth/providers/Email";
import type { GenericActionCtxWithAuthConfig } from "@convex-dev/auth/server";
import { DAY, HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { alphabet, generateRandomString } from "oslo/crypto";
import { components, internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { type MutationCtx, env } from "../_generated/server";
import { sendEmail } from "../email";
import { type CodeEmailKind, codeEmailMessages } from "./codeEmailMessages";
import {
  CODE_LENGTH,
  CODE_LIFETIME_MINUTES,
  credentialErrors,
  mailboxOf,
} from "./credentials";

/** The app page that finishes each flow. */
const landingPage: Record<CodeEmailKind, string> = {
  "verify-email": "/verify",
  "reset-password": "/reset",
  "magic-link": "/verify",
};

/** Codes people may type are short; a sign-in link's token is only ever clicked. */
function newToken(kind: CodeEmailKind) {
  return kind === "magic-link"
    ? generateRandomString(32, alphabet("a-z", "A-Z", "0-9"))
    : generateRandomString(CODE_LENGTH, alphabet("0-9"));
}

/**
 * The emailed link. The email, the code and the page to return to travel in the
 * fragment, which never reaches a server or its logs.
 */
export function codeLink(
  kind: CodeEmailKind,
  email: string,
  code: string,
  next: string,
) {
  if (!env.SITE_URL) throw new Error("SITE_URL is not set on this deployment");
  const fragment = new URLSearchParams({
    email,
    code,
    // Tells the verify page this is a sign-in link, not an email verification.
    ...(kind === "magic-link" && { method: "link" }),
    ...(next !== "/" && { next }),
  });
  return `${env.SITE_URL}${landingPage[kind]}#${fragment}`;
}

/**
 * The page the person was heading to, which the sign-up form passes as
 * `redirectTo`. Convex Auth has already resolved it against SITE_URL.
 */
function returnPathOf(url: string) {
  const { pathname, searchParams } = new URL(url);
  searchParams.delete("code");
  const query = searchParams.toString();
  return pathname + (query ? `?${query}` : "");
}

/**
 * The sign-in link form passes the language on screen as a path prefix
 * ("/ro/welcome"), the only thing that reaches this email. It picks the
 * email's language; the link itself carries the path without it, since the
 * app takes the language from the session, not the URL (ADR 0004).
 */
function splitLanguage(path: string): { language?: Locale; path: string } {
  const [, first, ...rest] = path.split("/");
  return isLocale(first)
    ? { language: first, path: `/${rest.join("/")}` }
    : { path };
}

/**
 * No more than five code emails an hour to any one inbox. Emails to an
 * address no account has proven (sign-ups, mostly) also share one budget
 * across everyone, since each can name a new address: a launch day's
 * sign-ups fit in it, a script sending them by the thousand doesn't.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  codeEmail: { kind: "token bucket", rate: 5, period: HOUR, capacity: 5 },
  codeEmailToNewAddress: {
    kind: "token bucket",
    rate: 1000,
    period: DAY,
    capacity: 200,
  },
});
export const tooManyCodeEmails = "TOO_MANY_CODE_EMAILS";

/**
 * Counts a code email about to go to `email`, or refuses it
 * (TOO_MANY_CODE_EMAILS). Convex Auth's store runs this (auth.ts) before it
 * stores the code and, for a new address, the account, so a refused request
 * leaves nothing behind. auth:signIn can be called without the app, so the
 * limits hold here rather than in its forms.
 */
export async function countCodeEmail(ctx: MutationCtx, email: string) {
  const inbox = await rateLimiter.limit(ctx, "codeEmail", {
    key: mailboxOf(email),
  });
  if (!inbox.ok) throw new ConvexError(tooManyCodeEmails);
  const user = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
  if (user?.emailVerificationTime !== undefined) return;
  const everyone = await rateLimiter.limit(ctx, "codeEmailToNewAddress");
  if (!everyone.ok) throw new ConvexError(tooManyCodeEmails);
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * An email provider for Convex Auth that sends a one-time code, and a link
 * carrying it, in the user's language. With EMAIL_DELIVERY=outbox the email is
 * stored in the dev outbox instead of being sent.
 */
function codeEmail(kind: CodeEmailKind) {
  return Email({
    id: kind,
    maxAge: CODE_LIFETIME_MINUTES * 60,
    async generateVerificationToken() {
      return newToken(kind);
    },
    // Codes are looked up on their own, so also check they were sent to this address.
    async authorize(params, account) {
      if (params.email !== account.providerAccountId) {
        throw new ConvexError(credentialErrors.invalidCode);
      }
    },
    // Convex Auth passes its action context as a second argument.
    // @ts-expect-error The Auth.js type doesn't declare it.
    async sendVerificationRequest(
      {
        identifier: to,
        token: code,
        url,
      }: { identifier: string; token: string; url: string },
      ctx: GenericActionCtxWithAuthConfig<DataModel>,
    ) {
      // Already counted, when the code was stored (countCodeEmail).
      const { language: browsing, path: next } = splitLanguage(
        returnPathOf(url),
      );
      // The account's language, else the one the person was browsing in
      // (a sign-in link for a new email has no account language yet).
      const language =
        (await ctx.runQuery(internal.accounts.emails.languageFor, {
          email: to,
        })) ??
        browsing ??
        defaultLocale;
      const message = codeEmailMessages[language][kind];
      const link = codeLink(kind, to, code, next);
      const email = {
        to,
        subject: message.subject,
        text: `${message.body(code)}\n\n${message.linkLabel}: ${link}`,
      };
      if (env.EMAIL_DELIVERY === "outbox") {
        await ctx.runMutation(internal.accounts.emails.recordInOutbox, {
          ...email,
          code,
        });
        return;
      }
      await sendEmail({
        ...email,
        html: `<p>${escapeHtml(message.body(code))}</p><p><a href="${escapeHtml(link)}">${escapeHtml(message.linkLabel)}</a></p>`,
      });
    },
  });
}

export const verifyEmailCode = codeEmail("verify-email");
export const resetPasswordCode = codeEmail("reset-password");
/** Sign-in links: sign in, or sign up, by clicking a link sent to the address. */
export const magicLink = codeEmail("magic-link");
