import { describe, expect, it, vi } from "vitest";

import {
  HandrailQuickBooksClient,
  HandrailQuickBooksError,
  type HandrailQuickBooksFetch,
  type HandrailQuickBooksJournalEntrySyncRequest
} from "../src/index.js";

type CapturedRequest = {
  input: string | URL | Request;
  init?: RequestInit;
};

const accountSourceRef = {
  sourceSystem: "hitcents_erp",
  sourceEntityType: "ledger_account",
  sourceEntityId: "cash"
} as const;

const journalRequest: HandrailQuickBooksJournalEntrySyncRequest = {
  sourceRef: {
    sourceSystem: "hitcents_erp",
    sourceEntityType: "journal_entry",
    sourceEntityId: "journal-1001"
  },
  postingDate: "2026-08-22",
  documentNumber: "JE-1001",
  lines: [
    {
      lineId: "debit-line",
      postingType: "Debit",
      amount: "25.00",
      accountSourceRef
    },
    {
      lineId: "credit-line",
      postingType: "Credit",
      amount: "25.00",
      accountSourceRef: {
        sourceSystem: "hitcents_erp",
        sourceEntityType: "ledger_account",
        sourceEntityId: "revenue"
      }
    }
  ]
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status
  });
}

describe("outbound journal mutation SDK", () => {
  it("exposes tenant-scoped account mapping and journal sync methods", async () => {
    const requests: CapturedRequest[] = [];
    const responses = [
      {
        tenantId: "tenant-alpha",
        provider: "quickbooks",
        providerEnvironment: "sandbox",
        providerAccountId: "41",
        sourceRef: accountSourceRef,
        mappingStatus: "created",
        idempotencyStatus: "created",
        syncedAt: "2026-08-22T17:00:00.000Z"
      },
      {
        tenantId: "tenant-alpha",
        provider: "quickbooks",
        providerEnvironment: "sandbox",
        providerJournalEntryId: "900",
        sourceRef: journalRequest.sourceRef,
        syncStatus: "created",
        idempotencyStatus: "created",
        accountMappings: [
          { lineId: "debit-line", providerAccountId: "41", sourceRef: accountSourceRef, mappingStatus: "mapped" },
          {
            lineId: "credit-line",
            providerAccountId: "79",
            sourceRef: journalRequest.lines[1]?.accountSourceRef,
            mappingStatus: "mapped"
          }
        ],
        syncedAt: "2026-08-22T17:00:00.000Z"
      }
    ];
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ input, init });
      return response(responses.shift(), requests.length === 1 ? 201 : 201);
    }) as HandrailQuickBooksFetch;
    const client = new HandrailQuickBooksClient({
      apiKey: "service-api-key-must-not-leak",
      baseUrl: "https://quickbooks.example.test/api",
      fetch,
      tenantId: "tenant-alpha"
    });

    const account = await client.accounts.mapOrCreate(
      {
        sourceRef: accountSourceRef,
        account: {
          name: "Operating Cash",
          accountType: "Bank",
          accountSubType: "Checking"
        }
      },
      { idempotencyKey: "acct-map-cash-000001" }
    );
    const journal = await client.journalEntries.sync(
      journalRequest,
      { idempotencyKey: "journal-sync-1001-0001" }
    );

    expect(account.providerAccountId).toBe("41");
    expect(journal.providerJournalEntryId).toBe("900");
    expect(String(requests[0]?.input)).toBe(
      "https://quickbooks.example.test/api/v1/tenants/tenant-alpha/accounting/accounts/map-or-create"
    );
    expect(String(requests[1]?.input)).toBe(
      "https://quickbooks.example.test/api/v1/tenants/tenant-alpha/accounting/journal-entries/sync"
    );
    expect(new Headers(requests[0]?.init?.headers).get("idempotency-key")).toBe("acct-map-cash-000001");
    expect(new Headers(requests[1]?.init?.headers).get("idempotency-key")).toBe("journal-sync-1001-0001");
    expect(JSON.parse(String(requests[1]?.init?.body))).toEqual(journalRequest);

    const publicResults = JSON.stringify({ account, journal });
    expect(publicResults).not.toContain("service-api-key-must-not-leak");
    expect(publicResults).not.toMatch(/access_token|refresh_token|client_secret|rawProviderPayload|QueryResponse/i);
  });

  it("retries a mutation only with its deterministic idempotency key", async () => {
    const requests: CapturedRequest[] = [];
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ input, init });
      if (requests.length === 1) {
        return response({ error: "quickbooks_provider_unavailable" }, 503);
      }
      return response({
        tenantId: "tenant-alpha",
        provider: "quickbooks",
        providerEnvironment: "sandbox",
        providerAccountId: "41",
        sourceRef: accountSourceRef,
        mappingStatus: "created",
        idempotencyStatus: "created",
        syncedAt: "2026-08-22T17:00:00.000Z"
      }, 201);
    }) as HandrailQuickBooksFetch;
    const client = new HandrailQuickBooksClient({
      baseUrl: "https://quickbooks.example.test",
      fetch,
      retries: 1,
      tenantId: "tenant-alpha"
    });

    await expect(client.accounts.mapOrCreate(
      {
        sourceRef: accountSourceRef,
        account: { name: "Operating Cash", accountType: "Bank" }
      },
      { idempotencyKey: "acct-map-retry-000001" }
    )).resolves.toMatchObject({ providerAccountId: "41" });

    expect(requests).toHaveLength(2);
    expect(requests.map((request) => new Headers(request.init?.headers).get("idempotency-key")))
      .toEqual(["acct-map-retry-000001", "acct-map-retry-000001"]);
    expect(requests[0]?.init?.body).toBe(requests[1]?.init?.body);
  });

  it("redacts unsafe service error messages and raw detail bodies", async () => {
    const fetch = vi.fn(async () => response({
      error: "quickbooks_provider_validation_failed",
      message: "access_token=provider-secret",
      details: {
        rawProviderPayload: { refresh_token: "provider-refresh-secret" },
        field: "account.accountType"
      }
    }, 422)) as HandrailQuickBooksFetch;
    const client = new HandrailQuickBooksClient({
      baseUrl: "https://quickbooks.example.test",
      fetch,
      tenantId: "tenant-alpha"
    });

    let caught: unknown;
    try {
      await client.accounts.mapOrCreate(
        {
          sourceRef: accountSourceRef,
          account: { name: "Operating Cash", accountType: "Bank" }
        },
        { idempotencyKey: "acct-map-error-000001" }
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HandrailQuickBooksError);
    const sdkError = caught as HandrailQuickBooksError;
    expect(sdkError.message).toBe("Handrail QuickBooks request failed with status 422.");
    expect(sdkError.details).toEqual({ field: "account.accountType" });
    expect(JSON.stringify(sdkError)).not.toContain("provider-secret");
    expect(JSON.stringify(sdkError)).not.toContain("provider-refresh-secret");
  });
});
