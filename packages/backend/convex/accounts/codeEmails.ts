import { defaultLocale } from "@coinslite/i18n";
import { Email } from "@convex-dev/auth/providers/Email";
import type { GenericActionCtxWithAuthConfig } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { alphabet, generateRandomString } from "oslo/crypto";
import { internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { env } from "../_generated/server";
import { sendEmail } from "../email";
import { type CodeEmailKind, codeEmailMessages } from "./codeEmailMessages";
import { accountErrors } from "./email";

const CODE_LIFETIME_SECONDS = 15 * 60;

/** The app page that finishes each flow; the email and code travel in the fragment, which never reaches a server. */
const landingPage: Record<CodeEmailKind, string> = {
  "verify-email": "/verify",
  "reset-password": "/reset",
};

export function codeLink(kind: CodeEmailKind, email: string, code: string) {
  if (!env.SITE_URL) throw new Error("SITE_URL is not set on this deployment");
  const fragment = new URLSearchParams({ email, code });
  return `${env.SITE_URL}${landingPage[kind]}#${fragment}`;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * An email provider for Convex Auth that sends an 8-digit one-time code, and a
 * link carrying it, in the user's language. With EMAIL_DELIVERY=outbox the
 * email is stored in the dev outbox instead of being sent.
 */
function codeEmail(kind: CodeEmailKind) {
  return Email({
    id: kind,
    maxAge: CODE_LIFETIME_SECONDS,
    async generateVerificationToken() {
      return generateRandomString(8, alphabet("0-9"));
    },
    // Codes are looked up on their own, so also check they were sent to this address.
    async authorize(params, account) {
      if (params.email !== account.providerAccountId) {
        throw new ConvexError(accountErrors.invalidCode);
      }
    },
    // Convex Auth passes its action context as a second argument.
    // @ts-expect-error The Auth.js type doesn't declare it.
    async sendVerificationRequest(
      { identifier: to, token: code }: { identifier: string; token: string },
      ctx: GenericActionCtxWithAuthConfig<DataModel>,
    ) {
      const language =
        (await ctx.runQuery(internal.accounts.emails.languageFor, {
          email: to,
        })) ?? defaultLocale;
      const message = codeEmailMessages[language][kind];
      const link = codeLink(kind, to, code);
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
