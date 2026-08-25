import { HandrailQuickBooksResource } from "./base.js";
import { normalizeQuickBooksAccountResources } from "../account-hierarchy.js";
import type {
  HandrailQuickBooksListRequest,
  HandrailQuickBooksListResponse,
  HandrailQuickBooksStartSyncRequest,
  HandrailQuickBooksSyncJobSummary,
  NormalizedQuickBooksFullSyncRequest,
  NormalizedQuickBooksFullSyncResponseEnvelope,
  NormalizedQuickBooksIncrementalSyncRequest,
  NormalizedQuickBooksIncrementalSyncResponseEnvelope
} from "../types.js";

export interface HandrailQuickBooksSyncOptions {
  readonly idempotencyKey?: string;
}

export class SyncJobsResource extends HandrailQuickBooksResource {
  async start(request: HandrailQuickBooksStartSyncRequest = {}, options: HandrailQuickBooksSyncOptions = {}) {
    const syncJob = await this.http.request<HandrailQuickBooksSyncJobSummary>(this.tenantPath("sync-jobs"), {
      body: request,
      idempotencyKey: options.idempotencyKey,
      method: "POST"
    });
    return normalizeSyncJobAccountResources(syncJob);
  }

  async fullSync(
    request: NormalizedQuickBooksFullSyncRequest = {},
    options: HandrailQuickBooksSyncOptions = {}
  ) {
    const syncJob = await this.start({ ...request, mode: "full" }, options);
    return toNormalizedQuickBooksFullSyncResponseEnvelope(syncJob);
  }

  async incrementalSync(
    request: NormalizedQuickBooksIncrementalSyncRequest = {},
    options: HandrailQuickBooksSyncOptions = {}
  ) {
    const syncJob = await this.start({ ...request, mode: "incremental" }, options);
    return toNormalizedQuickBooksIncrementalSyncResponseEnvelope(syncJob);
  }

  async get(jobId: string) {
    const syncJob = await this.http.request<HandrailQuickBooksSyncJobSummary>(
      this.tenantPath(`sync-jobs/${encodeURIComponent(jobId)}`)
    );
    return normalizeSyncJobAccountResources(syncJob);
  }

  async list(request: HandrailQuickBooksListRequest = {}) {
    const response = await this.http.request<HandrailQuickBooksListResponse<HandrailQuickBooksSyncJobSummary>>(
      this.tenantPath("sync-jobs"),
      {
        query: request
      }
    );
    return { ...response, data: response.data.map(normalizeSyncJobAccountResources) };
  }
}

export function toNormalizedQuickBooksFullSyncResponseEnvelope(
  syncJob: HandrailQuickBooksSyncJobSummary
): NormalizedQuickBooksFullSyncResponseEnvelope {
  return {
    ...toNormalizedQuickBooksSyncResponseEnvelopeBase(syncJob),
    syncMode: "full",
    syncPhase: "initial_load"
  };
}

export function toNormalizedQuickBooksIncrementalSyncResponseEnvelope(
  syncJob: HandrailQuickBooksSyncJobSummary
): NormalizedQuickBooksIncrementalSyncResponseEnvelope {
  return {
    ...toNormalizedQuickBooksSyncResponseEnvelopeBase(syncJob),
    syncMode: "incremental",
    syncPhase: "delta_sync"
  };
}

function toNormalizedQuickBooksSyncResponseEnvelopeBase(syncJob: HandrailQuickBooksSyncJobSummary) {
  syncJob = normalizeSyncJobAccountResources(syncJob);
  const importVolume = syncJob.batch
    ? {
        objectCount: syncJob.batch.totalObjectCount,
        objectCounts: syncJob.batch.objectCounts,
        entityCounts: syncJob.batch.entityCounts,
        totalObjectCount: syncJob.batch.totalObjectCount,
        errorCount: syncJob.batch.errorCount,
        warningCount: syncJob.batch.warningCount
      }
    : syncJob.importVolume;
  const normalizedResourceCounts = syncJob.normalizedResources
    ? Object.fromEntries(
        Object.entries(syncJob.normalizedResources).map(([family, resources]) => [family, resources.length])
      )
    : Object.fromEntries(
        Object.entries(syncJob.normalizedCompleteness ?? {}).map(([family, completeness]) => [
          family,
          completeness.normalizedRecordCount
        ])
      );

  return {
    audit: syncJob.audit,
    checkpoint: syncJob.checkpoint,
    companyId: syncJob.companyId,
    contractId: "handrail.quickbooks.normalized-sync-envelope.v1" as const,
    deltaCounts: syncJob.deltaCounts,
    importBatch: syncJob.batch,
    importBatchId: syncJob.importBatchId,
    // The root job can be a representative object job on older service
    // versions. The attached batch is the authoritative aggregate window.
    importVolume,
    jobId: syncJob.jobId,
    ...(syncJob.normalizedCompleteness ? { normalizedCompleteness: syncJob.normalizedCompleteness } : {}),
    // Batch entity counts are provider source-object counts. A normalized
    // family can contain zero, one, or many rows per source object, so expose
    // returned resource row counts under this normalized name.
    normalizedResourceCounts,
    normalizedResources: normalizeQuickBooksAccountResources(syncJob.normalizedResources),
    ...(syncJob.providerDispositions === undefined || syncJob.providerDispositions.length === 0
      ? {}
      : { providerDispositions: syncJob.providerDispositions }),
    ...(syncJob.normalizationWarnings === undefined || syncJob.normalizationWarnings.length === 0
      ? {}
      : { normalizationWarnings: syncJob.normalizationWarnings }),
    status: syncJob.status,
    syncJob,
    tenantId: syncJob.tenantId
  };
}

function normalizeSyncJobAccountResources(
  syncJob: HandrailQuickBooksSyncJobSummary
): HandrailQuickBooksSyncJobSummary {
  const normalizedResources = normalizeQuickBooksAccountResources(syncJob.normalizedResources);
  if (normalizedResources === undefined || normalizedResources === syncJob.normalizedResources) {
    return syncJob;
  }
  return { ...syncJob, normalizedResources };
}
