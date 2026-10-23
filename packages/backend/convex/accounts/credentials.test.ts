import { describe, expect, test } from "bun:test";
import { mailboxOf } from "./credentials";

describe("mailboxOf", () => {
  test("case and spaces make no other inbox", () => {
    expect(mailboxOf(" Ada@Example.com ")).toBe("ada@example.com");
  });

  test("a +tag reaches the same inbox", () => {
    expect(mailboxOf("ada+coins@example.com")).toBe("ada@example.com");
    expect(mailboxOf("ada+coins+2@example.com")).toBe("ada@example.com");
  });

  test("Gmail ignores dots, and googlemail.com is Gmail", () => {
    expect(mailboxOf("a.d.a@gmail.com")).toBe("ada@gmail.com");
    expect(mailboxOf("A.da+coins@googlemail.com")).toBe("ada@gmail.com");
  });

  test("elsewhere, dots and dashes name another inbox", () => {
    expect(mailboxOf("a.da@example.com")).toBe("a.da@example.com");
    expect(mailboxOf("ada-coins@example.com")).toBe("ada-coins@example.com");
  });

  test("a + that starts the address is part of its name", () => {
    expect(mailboxOf("+ada@example.com")).toBe("+ada@example.com");
  });
});
