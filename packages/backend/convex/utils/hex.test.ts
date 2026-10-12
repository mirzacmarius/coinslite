import { expect, test } from "bun:test";
import { hex } from "./hex";

test("each byte becomes two lowercase hex digits", () => {
  expect(hex(new Uint8Array([0, 15, 16, 171, 255]))).toBe("000f10abff");
});
