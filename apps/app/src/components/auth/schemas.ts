import { z } from "zod";

/** Field rules shared by the auth forms; messages come from the caller's dictionary. */
export const authSchemas = (messages: {
  emailInvalid: string;
  passwordTooShort: string;
  passwordRequired: string;
  codeInvalid: string;
}) => ({
  email: z.string().trim().email(messages.emailInvalid),
  newPassword: z.string().min(8, messages.passwordTooShort),
  password: z.string().min(1, messages.passwordRequired),
  code: z
    .string()
    .trim()
    .regex(/^\d{8}$/, messages.codeInvalid),
});
