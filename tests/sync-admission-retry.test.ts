import { describe, expect, it, vi } from "vitest";
import { HandrailQuickBooksClient } from "../src/index.js";

describe("sync admission transport safety", () => {
  it.each(["timeout", "unavailable"])("does not replay a keyed start after %s", async failure => {
    const fetch = vi.fn(async (_url: Request | string | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("idempotency-key")).toBe("stable-sync-intent");
      expect(JSON.parse(String(init?.body)).responseMode).toBe("async");
      if (failure === "timeout") throw new DOMException("timeout", "AbortError");
      return new Response(JSON.stringify({ error: "unavailable" }), { status: 503 });
    });
    const client = new HandrailQuickBooksClient({ apiKey: "test-key", tenantId: "test-tenant", baseUrl: "https://quickbooks.example.test", retries: 2, fetch });
    await expect(client.syncJobs.start({ mode: "full", responseMode: "async" }, { idempotencyKey: "stable-sync-intent" })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

it("exposes a generated intent key after a timeout and recovers using a read", async () => {
  let key = "";
  const fetch = vi.fn(async (_url: Request | string | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      key = new Headers(init.headers).get("idempotency-key")!;
      throw new DOMException("timeout", "AbortError");
    }
    expect(String(_url)).toContain(`/sync-admissions/${key}`);
    return new Response(JSON.stringify({ jobId: "import-admitted", status: "queued" }), { status: 200 });
  });
  const client = new HandrailQuickBooksClient({ apiKey: "test-key", tenantId: "test-tenant", baseUrl: "https://quickbooks.example.test", fetch });
  await expect(client.syncJobs.start()).rejects.toMatchObject({ syncIdempotencyKey: expect.any(String) });
  expect(key).not.toBe("");
  expect((await client.syncJobs.recoverStart(key)).jobId).toBe("import-admitted");
  expect(fetch).toHaveBeenCalledTimes(2);
});
