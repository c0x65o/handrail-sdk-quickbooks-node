import { describe, expect, it, vi } from "vitest";
import { HandrailQuickBooksClient } from "../src/index.js";

describe("sync admission transport safety", () => {
  it.each(["timeout", "unavailable"])("does not replay a keyed start after %s", async failure => {
    const fetch = vi.fn(async (_url: Request | string | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("idempotency-key")).toBe("stable-sync-intent");
      if (failure === "timeout") throw new DOMException("timeout", "AbortError");
      return new Response(JSON.stringify({ error: "unavailable" }), { status: 503 });
    });
    const client = new HandrailQuickBooksClient({ apiKey: "test-key", tenantId: "test-tenant", baseUrl: "https://quickbooks.example.test", retries: 2, fetch });
    await expect(client.syncJobs.start({ mode: "full" }, { idempotencyKey: "stable-sync-intent" })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
