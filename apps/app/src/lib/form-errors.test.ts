import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { errorText } from "./form-errors";

describe("what a field's errors say", () => {
  test("a schema rule's issue shows its message", () => {
    expect(errorText([{ message: "Enter a title" }])).toBe("Enter a title");
  });

  test("a rule that returns a message shows it as is", () => {
    expect(errorText(["Too many"])).toBe("Too many");
  });

  test("several problems show together, as a list", () => {
    expect(errorText([{ message: "Too long" }, "not from Numista"])).toBe(
      "Too long, not from Numista",
    );
  });

  test("no problems show nothing", () => {
    expect(errorText([])).toBeUndefined();
  });

  test("anything without a message shows nothing", () => {
    expect(errorText([undefined, null, { code: "custom" }])).toBeUndefined();
  });

  /** What TanStack Form holds for a field after its zod rule judges `value`. */
  const errorsOf = (rule: z.ZodType, value: string) => {
    const result = rule["~standard"].validate(value);
    if (result instanceof Promise) throw new Error("A rule that waits");
    return result.issues ?? [];
  };

  test("a zod rule speaks with the message it was given", () => {
    const rule = z.string().trim().min(1, "Enter a title");
    expect(errorText(errorsOf(rule, "   "))).toBe("Enter a title");
  });

  test("a zod rule's refinement still speaks after a failed check", () => {
    const rule = z
      .string()
      .max(10, "Too long")
      .refine((text) => !/numista/i.test(text), "not from Numista");
    expect(errorText(errorsOf(rule, "Numista, 2024"))).toBe(
      "Too long, not from Numista",
    );
  });
});
