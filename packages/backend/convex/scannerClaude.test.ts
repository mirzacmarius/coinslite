import { afterEach, expect, test, vi } from "vitest";
import { claudeVision } from "./scanner/claude";
import type { CoinReading } from "./scanner/rules";

/** The scanner's Claude adapter, against a faked Anthropic API. */

afterEach(() => {
  vi.restoreAllMocks();
});

const photos = {
  front: { mediaType: "image/jpeg" as const, base64: "ZnJvbnQ=" },
  back: { mediaType: "image/png" as const, base64: "YmFjaw==" },
};

const read: CoinReading = {
  isCoin: true,
  title: "1 krone 1875",
  country: "NO",
  year: 1875,
  denomination: "1 krone",
  series: "Oscar II",
  material: "silver",
  mintMark: null,
  ruler: "Oscar II",
  diameter: null,
  inscriptions: "OSCAR II NORGES OG SVERIGES KONGE",
};

/** A Messages API response with `text` as its answer. */
const message = (
  text: string,
  extra: { stop_reason?: string; stop_details?: unknown } = {},
) =>
  new Response(
    JSON.stringify({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "claude-opus-5-5",
      content: text ? [{ type: "text", text }] : [],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 10 },
      ...extra,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

/** What a test reads back from a request's body. */
type SentBody = {
  model: string;
  fallbacks?: unknown;
  system: string;
  output_config: {
    format: { type: string; schema: { required: string[] } };
  };
  messages: {
    content: { type: string; text?: string; source?: unknown }[];
  }[];
};

/** The adapter with Anthropic's API answering `answer`; keeps the requests sent. */
function vision(
  answer: (request: Request) => Response | Promise<Response>,
  options: { model?: string; timeout?: number } = {},
) {
  const requests: { url: string; headers: Headers; body: SentBody }[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push({
      url: request.url,
      headers: request.headers,
      body: JSON.parse(String(init?.body)),
    });
    return await answer(request);
  });
  return {
    requests,
    vision: claudeVision({
      apiKey: "test-key",
      model: options.model ?? "claude-opus-5-5",
      fetch: fetch as typeof globalThis.fetch,
      timeout: options.timeout ?? 1000,
      maxRetries: 0,
    }),
  };
}

test("both photos are sent as images, and the answer is held to the reading's schema", async () => {
  const { vision: claude, requests } = vision(() =>
    message(JSON.stringify(read)),
  );

  expect(await claude.read(photos, "de")).toEqual(read);

  expect(requests).toHaveLength(1);
  const [request] = requests;
  expect(request?.url).toMatch(/\/v1\/messages/);
  expect(request?.headers.get("x-api-key")).toBe("test-key");
  expect(request?.headers.get("anthropic-beta")).toContain(
    "server-side-fallback-2026-07-01",
  );
  const body = request?.body;
  if (!body) throw new Error("expected a request");
  expect(body.model).toBe("claude-opus-5-5");
  expect(body.fallbacks).toBe("default");
  expect(body.output_config.format.type).toBe("json_schema");
  expect(body.output_config.format.schema.required).toContain("denomination");
  expect(body.system).toContain("German");
  const images = body.messages[0]?.content.filter(
    (block) => block.type === "image",
  );
  expect(images?.map((image) => image.source)).toEqual([
    { type: "base64", media_type: "image/jpeg", data: "ZnJvbnQ=" },
    { type: "base64", media_type: "image/png", data: "YmFjaw==" },
  ]);
});

test("a model without server-side fallbacks is asked without them", async () => {
  const { vision: claude, requests } = vision(
    () => message(JSON.stringify(read)),
    { model: "claude-haiku-5-5" },
  );

  await claude.read(photos, "en");

  expect(requests[0]?.body.model).toBe("claude-haiku-5-5");
  expect(requests[0]?.body.fallbacks).toBeUndefined();
});

test("a declined, cut-short, malformed or failed answer reads as nothing", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  const answers: Record<
    string,
    (request: Request) => Response | Promise<Response>
  > = {
    declined: () =>
      message("", {
        stop_reason: "refusal",
        stop_details: { type: "refusal", category: null, explanation: null },
      }),
    "cut short": () =>
      message('{"isCoin": true, "title": "1 kr', { stop_reason: "max_tokens" }),
    "not JSON": () => message("It looks like a Norwegian krone."),
    "another shape": () => message(JSON.stringify({ coin: "1 krone" })),
    "a server error": () =>
      new Response(
        JSON.stringify({
          type: "error",
          error: { type: "api_error", message: "Internal error" },
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      ),
    "a bad key": () =>
      new Response(
        JSON.stringify({
          type: "error",
          error: { type: "authentication_error", message: "invalid x-api-key" },
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      ),
    // Never answers; gives up, as fetch does, when the request is aborted.
    "no answer in time": (request) =>
      new Promise<Response>((_, reject) =>
        request.signal.addEventListener("abort", () =>
          reject(new DOMException("The request was aborted", "AbortError")),
        ),
      ),
  };
  for (const [why, answer] of Object.entries(answers)) {
    const { vision: claude } = vision(answer, { timeout: 50 });
    expect(await claude.read(photos, "en"), why).toBeNull();
  }
});

test("the pick is one of the Catalog entries offered, or none", async () => {
  const candidates = [
    { key: "no-krone-1875", title: "1 krone 1875", country: "NO" },
    { key: "no-krone-1876", title: "1 krone 1876", country: "NO" },
  ];
  const picked = vision(() => message('{"key": "no-krone-1875"}'));
  expect(await picked.vision.pick(read, candidates)).toBe("no-krone-1875");
  const sent = picked.requests[0]?.body.messages[0]?.content[0]?.text;
  expect(sent).toContain("no-krone-1876");
  expect(sent).toContain("OSCAR II NORGES");

  const none = vision(() => message('{"key": null}'));
  expect(await none.vision.pick(read, candidates)).toBeNull();
});
