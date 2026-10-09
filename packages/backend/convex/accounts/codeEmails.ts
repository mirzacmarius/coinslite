import { defaultLocale } from "@coinslite/i18n";
import { Email } from "@convex-dev/auth/providers/Email";
import type { GenericActionCtxWithAuthConfig } from "@convex-dev/auth/server";
import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { alphabet, generateRandomString } from "oslo/crypto";
import { components, internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { env } from "../_generated/server";
import { sendEmail } from "../email";
import { type CodeEmailKind, codeEmailMessages } from "./codeEmailMessages";
import {
  CODE_LENGTH,
  CODE_LIFETIME_MINUTES,
  credentialErrors,
} from "./credentials";

/** The app page that finishes each flow. */
const landingPage: Record<CodeEmailKind, string> = {
  "verify-email": "/verify",
  "reset-password": "/reset",
};

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

/** No more than five code emails an hour to any one address. */
const rateLimiter = new RateLimiter(components.rateLimiter, {
  codeEmail: { kind: "token bucket", rate: 5, period: HOUR, capacity: 5 },
});
export const tooManyCodeEmails = "TOO_MANY_CODE_EMAILS";

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
      return generateRandomString(CODE_LENGTH, alphabet("0-9"));
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
      const { ok } = await rateLimiter.limit(ctx, "codeEmail", { key: to });
      if (!ok) throw new ConvexError(tooManyCodeEmails);

      const language =
        (await ctx.runQuery(internal.accounts.emails.languageFor, {
          email: to,
        })) ?? defaultLocale;
      const message = codeEmailMessages[language][kind];
      const link = codeLink(kind, to, code, returnPathOf(url));
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
