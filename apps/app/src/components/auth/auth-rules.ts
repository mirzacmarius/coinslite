import {
  CODE_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@coinslite/backend/convex/accounts/credentials";
import { z } from "zod";

/** The messages the auth forms' rules show, by translation key. */
type RuleMessage =
  | "auth.fields.emailInvalid"
  | "auth.fields.passwordRequired"
  | "auth.fields.passwordTooShort"
  | "auth.fields.codeInvalid"
  | "auth.signUp.termsRequired";

/**
 * What the auth forms' fields accept, each rule with the message `t` gives
 * its translation key. They mirror the backend's (accounts/credentials.ts).
 */
export function authRules(t: (key: RuleMessage) => string) {
  return {
    email: z
      .string()
      .trim()
      .pipe(z.email(t("auth.fields.emailInvalid"))),
    password: z.string().min(1, t("auth.fields.passwordRequired")),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, t("auth.fields.passwordTooShort")),
    code: z
      .string()
      .trim()
      .regex(new RegExp(`^\\d{${CODE_LENGTH}}$`), t("auth.fields.codeInvalid")),
    /** The terms checkbox: it must be ticked. */
    acceptTerms: z.literal(true, { error: t("auth.signUp.termsRequired") }),
  };
}
