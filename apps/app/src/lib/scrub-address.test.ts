import { describe, expect, test } from "bun:test";
import { withoutSecrets } from "./scrub-address";

const token = "0123456789abcdef0123456789abcdef";

describe("scrubbing an address", () => {
  test("drops the query string and hash of every address in a text", () => {
    expect(
      withoutSecrets(
        "GET https://app.coinslite.app/verify?code=123456 and /confirm-email#token=abc",
      ),
    ).toBe("GET https://app.coinslite.app/verify and /confirm-email");
  });

  test("replaces a share link's token with a placeholder", () => {
    expect(withoutSecrets(`https://app.coinslite.app/s/${token}`)).toBe(
      "https://app.coinslite.app/s/[token]",
    );
    expect(withoutSecrets(`/de/s/${token}?x=1`)).toBe("/de/s/[token]");
    expect(withoutSecrets(`Failed on /s/${token}: timeout`)).toBe(
      "Failed on /s/[token]: timeout",
    );
  });

  test("leaves other paths alone", () => {
    expect(withoutSecrets("/settings/billing")).toBe("/settings/billing");
    expect(withoutSecrets("/s/not-a-token")).toBe("/s/not-a-token");
    expect(withoutSecrets(`/s/${token}0`)).toBe(`/s/${token}0`);
  });
});
