import { describe, expect, test } from "bun:test";
import { authRules } from "./auth-rules";

describe("what the auth forms accept", () => {
  // Each message as its translation key, to tell which rule spoke.
  const rules = authRules((key) => key);
  const errorOf = (rule: keyof typeof rules, value: string | boolean) => {
    const result = rules[rule].safeParse(value);
    return result.success ? undefined : result.error.issues[0]?.message;
  };

  test("an email address, with spaces around it as pasted", () => {
    expect(errorOf("email", "ada@example.com")).toBeUndefined();
    expect(errorOf("email", "  ada+coins@example.com ")).toBeUndefined();
    expect(errorOf("email", "o'brien@example.ie")).toBeUndefined();
  });

  test("no email address, or half of one", () => {
    expect(errorOf("email", "")).toBe("auth.fields.emailInvalid");
    expect(errorOf("email", "ada")).toBe("auth.fields.emailInvalid");
    expect(errorOf("email", "ada@example")).toBe("auth.fields.emailInvalid");
  });

  test("any password to sign in with, but not none", () => {
    expect(errorOf("password", "x")).toBeUndefined();
    expect(errorOf("password", "")).toBe("auth.fields.passwordRequired");
  });

  test("a new password of at least eight characters", () => {
    expect(errorOf("newPassword", "12345678")).toBeUndefined();
    expect(errorOf("newPassword", "1234567")).toBe(
      "auth.fields.passwordTooShort",
    );
  });

  test("the emailed code's eight digits, with spaces around them", () => {
    expect(errorOf("code", " 12345678 ")).toBeUndefined();
    expect(errorOf("code", "1234567")).toBe("auth.fields.codeInvalid");
    expect(errorOf("code", "1234 5678")).toBe("auth.fields.codeInvalid");
  });

  test("the terms, ticked", () => {
    expect(errorOf("acceptTerms", true)).toBeUndefined();
    expect(errorOf("acceptTerms", false)).toBe("auth.signUp.termsRequired");
  });
});
