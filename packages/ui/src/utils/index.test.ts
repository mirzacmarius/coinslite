import { describe, expect, test } from "bun:test";
import { cn } from ".";

describe("cn", () => {
  test("keeps the theme's font sizes beside a text colour", () => {
    expect(cn("text-ui", "text-destructive")).toBe("text-ui text-destructive");
    expect(cn("text-ui-lg text-foreground")).toBe("text-ui-lg text-foreground");
  });

  test("lets the later font size win", () => {
    expect(cn("text-ui", "text-xs")).toBe("text-xs");
    expect(cn("text-sm", "text-ui-lg")).toBe("text-ui-lg");
  });
});
