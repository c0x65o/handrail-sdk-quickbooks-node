import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HandrailQuickBooksClient,
  toNormalizedQuickBooksFullSyncResponseEnvelope,
  toNormalizedQuickBooksIncrementalSyncResponseEnvelope,
  type HandrailQuickBooksFetch,
  type HandrailQuickBooksProviderDisposition,
  type HandrailQuickBooksSyncJobSummary
} from "../src/index.js";

const providerDispositions = [
  {
    disposition: "skipped",
    reason: "zero_cash_deposit_vendor_credit_offset",
    providerObjectType: "BillPayment",
    providerObjectId: "credit-application:VendorCredit:arbitrary/-42",
    rawPayloadProvenance: {
      sourcePayloadRef: "raw://batch_provider_contract/objects/BillPayment/credit-application%3AVendorCredit%3Aarbitrary%2F-42"
    }
  },
  {
    disposition: "skipped",
    reason: "zero_effect_empty_payment",
    providerObjectType: "Payment",
    providerObjectId: "-9007199254740993",
    rawPayloadProvenance: {
      sourcePayloadRef: "raw://batch_provider_contract/objects/Payment/-9007199254740993"
    }
  },
  {
    disposition: "voided",
    reason: "zero_effect_voided",
    providerObjectType: "Purchase",
    providerObjectId: "purchase:voided:alpha/beta?revision=7",
    rawPayloadProvenance: {
      sourcePayloadRef: "raw://batch_provider_contract/objects/Purchase/purchase%3Avoided%3Aalpha%2Fbeta%3Frevision%3D7"
    }
  }
] as const satisfies readonly HandrailQuickBooksProviderDisposition[];

describe("provider disposition contract", () => {
  it("preserves typed arbitrary-ID dispositions through start, get, and list", async () => {
    const syncJob = createSyncJob("incremental", providerDispositions);
    const fetch = mockFetch([
      syncJob,
      syncJob,
      {
        data: [syncJob],
        page: { hasMore: false, limit: 10 }
      }
    ]);
    const client = new HandrailQuickBooksClient({
      apiKey: "test-api-key",
      baseUrl: "https://quickbooks.example.test",
      fetch,
      tenantId: "tenant_provider_contract"
    });

    const started = await client.syncJobs.start({ mode: "incremental" });
    const fetched = await client.syncJobs.get(syncJob.jobId);
    const listed = await client.syncJobs.list({ limit: 10 });

    expect(started.providerDispositions).toEqual(providerDispositions);
    expect(fetched.providerDispositions).toEqual(providerDispositions);
    expect(listed.data[0]?.providerDispositions).toEqual(providerDispositions);
  });

  it("exposes the same non-empty dispositions at the root and nested job for full and incremental syncs", () => {
    const fullJob = createSyncJob("full", providerDispositions);
    const incrementalJob = createSyncJob("incremental", providerDispositions);

    const fullEnvelope = toNormalizedQuickBooksFullSyncResponseEnvelope(fullJob);
    const incrementalEnvelope = toNormalizedQuickBooksIncrementalSyncResponseEnvelope(incrementalJob);

    expect(fullEnvelope.providerDispositions).toBe(providerDispositions);
    expect(fullEnvelope.syncJob.providerDispositions).toBe(providerDispositions);
    expect(incrementalEnvelope.providerDispositions).toBe(providerDispositions);
    expect(incrementalEnvelope.syncJob.providerDispositions).toBe(providerDispositions);
  });

  it("keeps legacy response shape when dispositions are absent and omits empty arrays at the envelope root", () => {
    const legacyJob = createSyncJob("full");
    const emptyJob = createSyncJob("incremental", []);

    const legacyEnvelope = toNormalizedQuickBooksFullSyncResponseEnvelope(legacyJob);
    const emptyEnvelope = toNormalizedQuickBooksIncrementalSyncResponseEnvelope(emptyJob);

    expect(legacyEnvelope).not.toHaveProperty("providerDispositions");
    expect(legacyEnvelope.syncJob).not.toHaveProperty("providerDispositions");
    expect(emptyEnvelope).not.toHaveProperty("providerDispositions");
    expect(emptyEnvelope.syncJob.providerDispositions).toEqual([]);
    expect(legacyEnvelope.contractId).toBe("handrail.quickbooks.normalized-sync-envelope.v1");
  });

  it("documents full and incremental dispositions using raw references without payload bodies", () => {
    const examples = ["full-sync.response.json", "incremental-sync.response.json"].map((fileName) =>
      JSON.parse(
        readFileSync(new URL(`../examples/contracts/${fileName}`, import.meta.url), "utf8")
      ) as { providerDispositions?: readonly HandrailQuickBooksProviderDisposition[] }
    );

    for (const example of examples) {
      expect(example.providerDispositions).not.toHaveLength(0);
      for (const disposition of example.providerDispositions ?? []) {
        expect(Object.keys(disposition).sort()).toEqual([
          "disposition",
          "providerObjectId",
          "providerObjectType",
          "rawPayloadProvenance",
          "reason"
        ]);
        expect(Object.keys(disposition.rawPayloadProvenance)).toEqual(["sourcePayloadRef"]);
        expect(disposition.rawPayloadProvenance.sourcePayloadRef).toMatch(/^raw:\/\//);
      }
    }

    expect(JSON.stringify(examples)).not.toMatch(
      /"access_token"|"refresh_token"|"client_secret"|"Authorization"|"rawPayload"|"rawProviderPayload"|"QueryResponse"/
    );
  });
});

function createSyncJob(
  syncMode: "full" | "incremental",
  dispositions?: readonly HandrailQuickBooksProviderDisposition[]
): HandrailQuickBooksSyncJobSummary {
  return {
    audit: {
      importBatchId: "batch_provider_contract",
      sourcePayloadRef: "raw://batch_provider_contract/sync-jobs/job_provider_contract"
    },
    companyId: "realm_provider_contract",
    deltaCounts: {
      changedCount: 0,
      failedCount: 0,
      insertedCount: 0,
      skippedCount: dispositions?.length ?? 0
    },
    entity: "transactions",
    importBatchId: "batch_provider_contract",
    importVolume: {
      entityCounts: { transactions: 3 },
      errorCount: 0,
      objectCount: 3,
      objectCounts: { BillPayment: 1, Payment: 1, Purchase: 1 },
      totalObjectCount: 3,
      warningCount: 0
    },
    jobId: "job_provider_contract",
    objectCount: 3,
    objectType: "Payment",
    ...(dispositions === undefined ? {} : { providerDispositions: dispositions }),
    startedAt: "2026-08-25T00:00:00.000Z",
    status: "succeeded",
    syncMode,
    syncPhase: syncMode === "full" ? "initial_load" : "delta_sync",
    tenantId: "tenant_provider_contract"
  };
}

function mockFetch(bodies: readonly unknown[]): HandrailQuickBooksFetch {
  let index = 0;
  return async () => Response.json(bodies[index++]);
}
