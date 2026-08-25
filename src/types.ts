export interface HandrailQuickBooksSdkConfigInput {
  readonly apiKey?: string;
  readonly auth?: HandrailQuickBooksAuthConfig;
  readonly baseUrl?: string;
  readonly fetch?: HandrailQuickBooksFetch;
  readonly futureErpTenantContext?: HandrailQuickBooksFutureErpTenantContext;
  readonly providerMode?: HandrailQuickBooksProviderMode;
  readonly retries?: number;
  readonly serviceEnv?: HandrailQuickBooksServiceEnv;
  readonly tenantId?: string;
  readonly tenantMap?: HandrailQuickBooksFutureErpTenantMap;
  readonly tenantMapJson?: string;
  readonly timeoutMs?: number;
}

export type HandrailQuickBooksServiceEnv = "dev" | "staging" | "production";

export interface HandrailQuickBooksClientConfig {
  readonly apiKey?: string;
  readonly auth?: HandrailQuickBooksAuthConfig;
  readonly baseUrl: string;
  readonly fetch?: HandrailQuickBooksFetch;
  readonly providerMode?: HandrailQuickBooksProviderMode;
  readonly retries: number;
  readonly serviceEnv?: HandrailQuickBooksServiceEnv;
  readonly tenantId?: string;
  readonly timeoutMs: number;
}

export interface HandrailQuickBooksAuthConfig {
  readonly headerName?: string;
  readonly scheme?: "bearer" | "api-key";
  readonly token: string;
}

export type HandrailQuickBooksFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export interface HandrailQuickBooksPageInfo {
  readonly cursor?: string;
  readonly hasMore: boolean;
  readonly limit?: number;
}

export type HandrailQuickBooksQueryValue = boolean | number | string | null | undefined;

export interface HandrailQuickBooksListRequest {
  readonly [key: string]: HandrailQuickBooksQueryValue;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface HandrailQuickBooksListResponse<TItem> {
  readonly data: readonly TItem[];
  readonly page?: HandrailQuickBooksPageInfo;
}

export type HandrailQuickBooksConnectionStatus =
  | "not_connected"
  | "pending"
  | "connected"
  | "reauthorization_required"
  | "disabled";

export type HandrailQuickBooksProviderEnvironment = "sandbox" | "production";
export type HandrailQuickBooksProviderMode = HandrailQuickBooksProviderEnvironment;
export type HandrailQuickBooksReportedProviderMode =
  | HandrailQuickBooksProviderMode
  | "unavailable";

export type HandrailQuickBooksFutureErpTenantMapContractId =
  "future-erp.quickbooks-tenant-mapping.v1";

export type HandrailQuickBooksFutureErpTenantMappingStatus =
  | "active"
  | "disabled"
  | "pending_connection"
  | "reauthorization_required";

export interface HandrailQuickBooksFutureErpTenantContext {
  readonly futureErpAccountId: string;
  readonly futureErpCompanyId: string;
}

export interface HandrailQuickBooksFutureErpTenantMapping
  extends HandrailQuickBooksFutureErpTenantContext {
  readonly displayName?: string;
  readonly notes?: string;
  readonly serviceTenantId: string;
  readonly status: HandrailQuickBooksFutureErpTenantMappingStatus;
}

export interface HandrailQuickBooksFutureErpTenantMap {
  readonly schemaVersion: 1;
  readonly contractId: HandrailQuickBooksFutureErpTenantMapContractId;
  readonly consumerProject?: string;
  readonly sourceOfTruth?: string;
  readonly serviceEnv?: HandrailQuickBooksServiceEnv;
  readonly providerMode?: HandrailQuickBooksProviderMode;
  readonly tenantMappings: readonly HandrailQuickBooksFutureErpTenantMapping[];
}

export interface HandrailQuickBooksFutureErpTenantMapResolveOptions {
  readonly providerMode?: HandrailQuickBooksProviderMode;
  readonly serviceEnv?: HandrailQuickBooksServiceEnv;
}

export type HandrailQuickBooksProviderProfileStatus =
  | "configured"
  | "missing"
  | "unknown";

export interface HandrailQuickBooksHealthResponse {
  readonly ok: true;
  readonly service: "handrail-integration-quickbooks";
}

export interface HandrailQuickBooksProviderProfileMetadata {
  readonly environment?: HandrailQuickBooksProviderEnvironment;
  readonly name?: string;
  readonly status?: HandrailQuickBooksProviderProfileStatus;
}

export type HandrailQuickBooksEntityName =
  HandrailQuickBooksRawImportEntity;

export type HandrailQuickBooksRawImportEntity =
  | "accounts"
  | "classes"
  | "items"
  | "parties"
  | "taxes"
  | "transactions"
  | "locations"
  | "ledger_entries";

export type HandrailQuickBooksNormalizedResourceFamilyName =
  | Exclude<HandrailQuickBooksRawImportEntity, "taxes">
  | "transaction_lines";

export type HandrailQuickBooksRawImportObjectType =
  | "Account"
  | "Bill"
  | "BillPayment"
  | "Class"
  | "CreditMemo"
  | "Customer"
  | "Department"
  | "Deposit"
  | "Invoice"
  | "Item"
  | "JournalEntry"
  | "Payment"
  | "Purchase"
  | "RefundReceipt"
  | "SalesReceipt"
  | "TaxAgency"
  | "TaxCode"
  | "TaxRate"
  | "Transfer"
  | "Vendor"
  | "VendorCredit";

export type HandrailQuickBooksProviderDispositionKind = "skipped" | "voided";

export type HandrailQuickBooksProviderDispositionReason =
  | "zero_cash_deposit_vendor_credit_offset"
  | "zero_effect_empty_payment"
  | "zero_effect_voided";

/**
 * A provider-asserted per-record outcome whose source object remains available
 * through an immutable raw-payload reference. Consumers must not infer a
 * disposition from an object ID or from an absent/unknown record.
 */
export interface HandrailQuickBooksProviderDisposition {
  readonly disposition: HandrailQuickBooksProviderDispositionKind;
  readonly reason: HandrailQuickBooksProviderDispositionReason;
  readonly providerObjectType: HandrailQuickBooksRawImportObjectType;
  readonly providerObjectId: string;
  readonly rawPayloadProvenance: {
    readonly sourcePayloadRef: string;
  };
}

export interface HandrailQuickBooksAuditReference {
  readonly checkpointId?: string;
  readonly importBatchId?: string;
  readonly jobId?: string;
  readonly qboObjectId?: string;
  readonly realmId?: string;
  readonly sourcePayloadRef?: string;
  readonly sourcePayloadRefs?: readonly string[];
  readonly syncToken?: string;
}

export interface HandrailQuickBooksConnectionSummary {
  readonly connectionId: string;
  readonly connectedAt?: string;
  readonly disabledAt?: string;
  readonly lastSyncedAt?: string;
  readonly status: HandrailQuickBooksConnectionStatus;
  readonly tenantId: string;
  readonly audit?: HandrailQuickBooksAuditReference;
}

export interface HandrailQuickBooksConnectionStatusResponse {
  readonly connection?: HandrailQuickBooksConnectionSummary;
  readonly providerEnvironment?: HandrailQuickBooksProviderEnvironment;
  readonly providerMode?: HandrailQuickBooksReportedProviderMode;
  readonly providerProfile?: HandrailQuickBooksProviderProfileMetadata;
  readonly status: HandrailQuickBooksConnectionStatus;
  readonly tenantId: string;
}

export interface HandrailQuickBooksConnectUrlRequest {
  readonly connectionId?: string;
  readonly returnUrl?: string;
  readonly state?: string;
}

export interface HandrailQuickBooksConnectUrlResponse {
  readonly connectUrl: string;
  readonly expiresAt?: string;
  readonly tenantId: string;
}

export interface HandrailQuickBooksTokenStatusResponse {
  readonly connectionId?: string;
  readonly expiresAt?: string;
  readonly reauthorizationRequired?: boolean;
  readonly status: "healthy" | "expiring" | "reauthorization_required" | "unavailable";
  readonly tenantId: string;
  readonly audit?: HandrailQuickBooksAuditReference;
}

export type HandrailQuickBooksSyncJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type HandrailQuickBooksRetrySource = "raw_import" | "token_custody";

export type HandrailQuickBooksRetryLastErrorCode =
  | "quickbooks_connection_unavailable"
  | "quickbooks_fetch_failed"
  | "quickbooks_reauthorization_required";

export type HandrailQuickBooksRetryReason =
  | "connection_unavailable"
  | "provider_request_rejected"
  | "reauthorization_required"
  | "retry_exhausted"
  | "transient_provider_failure";

export interface HandrailQuickBooksRetryState {
  readonly source: HandrailQuickBooksRetrySource;
  readonly retryable: boolean;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly nextRetryAt?: string;
  readonly lastErrorCode: HandrailQuickBooksRetryLastErrorCode;
  readonly retryReason: HandrailQuickBooksRetryReason;
}

export type HandrailQuickBooksProviderPagingEvidenceStatus =
  | "completed"
  | "failed"
  | "incomplete";

export interface HandrailQuickBooksProviderPagingEvidence {
  readonly provider: "intuit";
  readonly source: "quickbooks_accounting_api";
  readonly sourceOperation: "query";
  readonly entity: HandrailQuickBooksRawImportEntity;
  readonly objectType: HandrailQuickBooksRawImportObjectType;
  readonly providerRequestRef: string;
  readonly importBatchId: string;
  readonly jobId: string;
  readonly syncJobRef: string;
  readonly sourcePayloadRef?: string;
  readonly startPosition: number;
  readonly pageSize: number;
  readonly pageCount: number;
  readonly fetchedObjectCount: number;
  readonly maxResults: number;
  readonly completed: boolean;
  readonly status: HandrailQuickBooksProviderPagingEvidenceStatus;
  readonly capturedAt: string;
}

export type HandrailQuickBooksNormalizedCompletenessResourceFamily =
  | "accounts"
  | "ledger_entries"
  | "transactions"
  | "transaction_lines";

export type HandrailQuickBooksNormalizedCompletenessStatus =
  | "complete"
  | "incomplete"
  | "unknown";

export interface HandrailQuickBooksNormalizedCompletenessEvidence {
  readonly batchStatus?: HandrailQuickBooksImportBatchStatus;
  readonly checkpointStatus?: HandrailQuickBooksSyncCheckpointStatus;
  readonly errorCount?: number;
  readonly warningCount?: number;
  readonly missingObjectTypes?: readonly HandrailQuickBooksRawImportObjectType[];
  readonly incompleteObjectTypes?: readonly HandrailQuickBooksRawImportObjectType[];
  readonly objectCounts: Partial<Record<HandrailQuickBooksRawImportObjectType, number>>;
  readonly providerPagingEvidence: readonly HandrailQuickBooksProviderPagingEvidence[];
}

export interface HandrailQuickBooksNormalizedResourceCompleteness {
  readonly resourceFamily: HandrailQuickBooksNormalizedCompletenessResourceFamily;
  readonly complete: boolean;
  readonly status: HandrailQuickBooksNormalizedCompletenessStatus;
  readonly importBatchId?: string;
  readonly syncMode?: HandrailQuickBooksSyncCheckpointMode;
  readonly syncPhase?: HandrailQuickBooksSyncPhase;
  readonly checkpointRefs?: readonly string[];
  readonly sourceEntity: HandrailQuickBooksRawImportEntity;
  readonly sourceObjectTypes: readonly HandrailQuickBooksRawImportObjectType[];
  readonly sourceObjectCount?: number;
  readonly normalizedRecordCount: number;
  readonly providerPagingEvidenceRefs: readonly string[];
  readonly auditRefs: readonly string[];
  readonly reason?: string;
  readonly evidence: HandrailQuickBooksNormalizedCompletenessEvidence;
}

export type HandrailQuickBooksNormalizedCompletenessMap = Partial<
  Record<
    HandrailQuickBooksNormalizedCompletenessResourceFamily,
    HandrailQuickBooksNormalizedResourceCompleteness
  >
>;

export interface HandrailQuickBooksSyncJobSummary {
  readonly tenantId: string;
  readonly jobId: string;
  readonly status: HandrailQuickBooksSyncJobStatus;
  readonly companyId: string;
  readonly entity: HandrailQuickBooksRawImportEntity;
  readonly importBatchId: string;
  readonly batch?: HandrailQuickBooksImportBatchSummary;
  readonly syncMode: HandrailQuickBooksSyncCheckpointMode;
  readonly syncPhase: HandrailQuickBooksSyncPhase;
  readonly importVolume: HandrailQuickBooksImportVolumeSummary;
  readonly deltaCounts: HandrailQuickBooksDeltaSyncCounts;
  readonly checkpoint?: HandrailQuickBooksSyncCheckpointMetadata;
  readonly normalizedResources?: HandrailQuickBooksNormalizedResourceMap;
  readonly normalizedCompleteness?: HandrailQuickBooksNormalizedCompletenessMap;
  readonly objectCount: number;
  readonly objectType: HandrailQuickBooksRawImportObjectType;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly retry?: HandrailQuickBooksRetryState;
  readonly audit: HandrailQuickBooksAuditReference;
  readonly providerDispositions?: readonly HandrailQuickBooksProviderDisposition[];
  readonly normalizationWarnings?: readonly HandrailQuickBooksNormalizationWarning[];
}

/**
 * A place where fail-closed normalization dropped accounting impact during
 * sync (for example a transaction that produced no balanced postings, or tax
 * detail without a resolvable tax account). Surfaced so downstream consumers
 * can warn instead of silently under-reporting.
 */
export interface HandrailQuickBooksNormalizationWarning {
  readonly code: string;
  /** Blocking warnings represent unresolved accounting impact. */
  readonly severity: "blocking" | "advisory";
  readonly objectType: string;
  readonly transactionId: string;
  readonly message: string;
}

export interface HandrailQuickBooksStartSyncRequest {
  readonly entities?: readonly HandrailQuickBooksRawImportEntity[];
  /** Inclusive transaction/posting date boundary for historical imports. */
  readonly effectiveThrough?: string;
  readonly importBatchId?: string;
  readonly mode?: "incremental" | "full";
  readonly since?: string;
}

export type NormalizedQuickBooksFullSyncRequest =
  Omit<HandrailQuickBooksStartSyncRequest, "mode"> & {
    readonly mode?: "full";
  };

export type NormalizedQuickBooksIncrementalSyncRequest =
  Omit<HandrailQuickBooksStartSyncRequest, "mode"> & {
    readonly mode?: "incremental";
  };

export interface NormalizedQuickBooksSyncResponseEnvelopeBase {
  readonly contractId: "handrail.quickbooks.normalized-sync-envelope.v1";
  readonly tenantId: string;
  readonly companyId: string;
  readonly importBatchId: string;
  readonly jobId: string;
  readonly status: HandrailQuickBooksSyncJobStatus;
  readonly deltaCounts: HandrailQuickBooksDeltaSyncCounts;
  readonly importVolume: HandrailQuickBooksImportVolumeSummary;
  readonly normalizedResourceCounts: Partial<Record<HandrailQuickBooksNormalizedResourceFamilyName, number>>;
  readonly normalizedResources?: HandrailQuickBooksNormalizedResourceMap;
  readonly normalizedCompleteness?: HandrailQuickBooksNormalizedCompletenessMap;
  readonly syncJob: HandrailQuickBooksSyncJobSummary;
  readonly importBatch?: HandrailQuickBooksImportBatchSummary;
  readonly checkpoint?: HandrailQuickBooksSyncCheckpointMetadata;
  readonly audit: HandrailQuickBooksAuditReference;
  readonly providerDispositions?: readonly HandrailQuickBooksProviderDisposition[];
  readonly normalizationWarnings?: readonly HandrailQuickBooksNormalizationWarning[];
}

export interface NormalizedQuickBooksFullSyncResponseEnvelope
  extends NormalizedQuickBooksSyncResponseEnvelopeBase {
  readonly syncMode: "full";
  readonly syncPhase: "initial_load";
}

export interface NormalizedQuickBooksIncrementalSyncResponseEnvelope
  extends NormalizedQuickBooksSyncResponseEnvelopeBase {
  readonly syncMode: "incremental";
  readonly syncPhase: "delta_sync";
}

export type HandrailQuickBooksDeltaSyncCounts = {
  readonly skippedCount: number;
  readonly changedCount: number;
  readonly insertedCount: number;
  readonly failedCount: number;
  readonly retryPendingCount?: number;
  readonly unchangedCount?: number;
  readonly updatedCount?: number;
};

export type HandrailQuickBooksSyncPhase = "initial_load" | "delta_sync";

export type HandrailQuickBooksImportBatchStatus =
  | "running"
  | "succeeded"
  | "failed"
  | "partial_failed";

export type HandrailQuickBooksSyncCheckpointMode = "full" | "incremental";

export type HandrailQuickBooksSyncCheckpointKind = "provider_updated_at_watermark";

export type HandrailQuickBooksSyncCheckpointStatus = "running" | "succeeded" | "failed";

export interface HandrailQuickBooksImportVolumeSummary {
  readonly objectCount: number;
  readonly objectCounts: Partial<Record<HandrailQuickBooksRawImportObjectType, number>>;
  /** Counts of fetched provider objects grouped by raw import entity. */
  readonly entityCounts: Partial<Record<HandrailQuickBooksRawImportEntity, number>>;
  readonly totalObjectCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
}

export interface HandrailQuickBooksSyncCheckpointMetadata {
  readonly checkpointId: string;
  readonly checkpointRef: string;
  readonly checkpointKind: HandrailQuickBooksSyncCheckpointKind;
  readonly syncMode: HandrailQuickBooksSyncCheckpointMode;
  readonly entity: HandrailQuickBooksRawImportEntity;
  readonly objectType: HandrailQuickBooksRawImportObjectType;
  readonly providerUpdatedAtWatermark?: string;
  readonly cursorRefs: readonly string[];
  readonly importBatchId: string;
  readonly jobIds: readonly string[];
  readonly syncJobRefs: readonly string[];
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly status: HandrailQuickBooksSyncCheckpointStatus;
  readonly normalizedCompleteness?: HandrailQuickBooksNormalizedCompletenessMap;
  readonly audit: HandrailQuickBooksAuditReference;
}

export interface HandrailQuickBooksImportBatchSummary {
  readonly tenantId: string;
  readonly realmId: string;
  readonly companyId: string;
  readonly importBatchId: string;
  readonly jobIds: readonly string[];
  readonly syncJobRefs: readonly string[];
  readonly checkpointRefs: readonly string[];
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly status: HandrailQuickBooksImportBatchStatus;
  readonly objectCounts: Partial<Record<HandrailQuickBooksRawImportObjectType, number>>;
  readonly entityCounts: Partial<Record<HandrailQuickBooksRawImportEntity, number>>;
  readonly totalObjectCount: number;
  readonly deltaCounts: HandrailQuickBooksDeltaSyncCounts;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly normalizedCompleteness?: HandrailQuickBooksNormalizedCompletenessMap;
  readonly audit: HandrailQuickBooksAuditReference;
}

export interface HandrailQuickBooksSyncCheckpoint {
  readonly tenantId: string;
  readonly realmId: string;
  readonly companyId: string;
  readonly checkpointId: string;
  readonly checkpointKind: HandrailQuickBooksSyncCheckpointKind;
  readonly syncMode: HandrailQuickBooksSyncCheckpointMode;
  readonly entity: HandrailQuickBooksRawImportEntity;
  readonly objectType: HandrailQuickBooksRawImportObjectType;
  readonly providerUpdatedAtWatermark?: string;
  readonly deltaCounts: HandrailQuickBooksDeltaSyncCounts;
  readonly importBatchId: string;
  readonly jobIds: readonly string[];
  readonly syncJobRefs: readonly string[];
  readonly cursorRefs: readonly string[];
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly status: HandrailQuickBooksSyncCheckpointStatus;
  readonly normalizedCompleteness?: HandrailQuickBooksNormalizedCompletenessMap;
  readonly audit: HandrailQuickBooksAuditReference;
}

export interface HandrailQuickBooksCheckpointListRequest extends HandrailQuickBooksListRequest {
  readonly entity?: HandrailQuickBooksRawImportEntity;
  readonly objectType?: HandrailQuickBooksRawImportObjectType;
  readonly syncMode?: HandrailQuickBooksSyncCheckpointMode;
}

export type HandrailQuickBooksImportBatchListRequest = HandrailQuickBooksListRequest;

export interface HandrailQuickBooksRawImportStatus {
  readonly tenantId: string;
  readonly companyId: string;
  readonly completedAt?: string;
  readonly entity: HandrailQuickBooksRawImportEntity;
  readonly syncMode: HandrailQuickBooksSyncCheckpointMode;
  readonly syncPhase: HandrailQuickBooksSyncPhase;
  readonly importVolume: HandrailQuickBooksImportVolumeSummary;
  readonly deltaCounts: HandrailQuickBooksDeltaSyncCounts;
  readonly checkpoint?: HandrailQuickBooksSyncCheckpointMetadata;
  readonly errorCount: number;
  readonly importBatchId: string;
  readonly objectCount: number;
  readonly objectType: HandrailQuickBooksRawImportObjectType;
  readonly startedAt: string;
  readonly status: "queued" | "importing" | "normalizing" | "completed" | "failed";
  readonly retry?: HandrailQuickBooksRetryState;
  readonly warningCount: number;
  readonly normalizedCompleteness?: HandrailQuickBooksNormalizedCompletenessMap;
  readonly audit: HandrailQuickBooksAuditReference;
}

export type HandrailQuickBooksAccountingReference = {
  readonly value?: string;
  readonly name?: string;
};

export type HandrailQuickBooksAccountingCurrencyReference = HandrailQuickBooksAccountingReference;

export interface HandrailQuickBooksProviderMetadata {
  readonly tenantId: string;
  readonly realmId: string;
  readonly companyId: string;
  readonly provider: "intuit";
  readonly providerEnvironment: HandrailQuickBooksProviderEnvironment;
  readonly source: "quickbooks_accounting_api";
  readonly sourceObjectId: string;
  readonly importBatchId: string;
  readonly jobId: string;
  readonly importedAt: string;
  readonly syncedAt: string;
  readonly sourceUpdatedAt?: string;
  readonly audit: HandrailQuickBooksAuditReference;
}

export type HandrailQuickBooksAccountType = string;

export interface HandrailQuickBooksAccount extends HandrailQuickBooksProviderMetadata {
  readonly id: string;
  readonly sourceObject: "Account";
  readonly name: string;
  readonly fullyQualifiedName?: string;
  readonly hierarchyPath?: readonly string[];
  readonly hierarchyLevel?: number;
  readonly accountType?: HandrailQuickBooksAccountType;
  readonly accountSubType?: string;
  readonly classification?: string;
  readonly active?: boolean;
  readonly subAccount?: boolean;
  readonly parentRef?: HandrailQuickBooksAccountingReference;
  readonly parentAccountId?: string;
  readonly parentAccountName?: string;
  readonly currentBalance?: number;
  readonly currentBalanceWithSubAccounts?: number;
  readonly currency?: HandrailQuickBooksAccountingCurrencyReference;
}

export type HandrailQuickBooksPartyType = "customer" | "vendor" | "employee" | "other";

export interface HandrailQuickBooksParty extends HandrailQuickBooksProviderMetadata {
  readonly id: string;
  readonly sourceObject: "Customer" | "Vendor";
  readonly displayName: string;
  readonly email?: string;
  readonly active?: boolean;
  readonly partyType: Extract<HandrailQuickBooksPartyType, "customer" | "vendor">;
  readonly companyName?: string;
}

export interface HandrailQuickBooksItem extends HandrailQuickBooksProviderMetadata {
  readonly id: string;
  readonly sourceObject: "Item";
  readonly name: string;
  readonly fullyQualifiedName?: string;
  readonly displayName: string;
  readonly itemType?: string;
  readonly status?: "active" | "inactive";
  readonly active?: boolean;
  readonly sku?: string;
  readonly description?: string;
  readonly taxable?: boolean;
  readonly unitPrice?: number;
  readonly purchaseCost?: number;
  readonly quantityOnHand?: number;
  readonly inventoryStartDate?: string;
  readonly parentRef?: HandrailQuickBooksAccountingReference;
  readonly parentItemId?: string;
  readonly parentItemName?: string;
  readonly hierarchyPath?: readonly string[];
  readonly hierarchyLevel?: number;
  readonly incomeAccountRef?: HandrailQuickBooksAccountingReference;
  readonly expenseAccountRef?: HandrailQuickBooksAccountingReference;
  readonly assetAccountRef?: HandrailQuickBooksAccountingReference;
}

export interface HandrailQuickBooksClass extends HandrailQuickBooksProviderMetadata {
  readonly id: string;
  readonly sourceObject: "Class";
  readonly name: string;
  readonly fullyQualifiedName?: string;
  readonly displayName: string;
  readonly status?: "active" | "inactive";
  readonly active?: boolean;
  readonly subClass?: boolean;
  readonly parentRef?: HandrailQuickBooksAccountingReference;
  readonly parentClassId?: string;
  readonly parentClassName?: string;
  readonly hierarchyPath?: readonly string[];
  readonly hierarchyLevel?: number;
}

export interface HandrailQuickBooksLocation extends HandrailQuickBooksProviderMetadata {
  readonly id: string;
  readonly sourceObject: "Department";
  readonly name: string;
  readonly fullyQualifiedName?: string;
  readonly displayName: string;
  readonly locationSource: "department";
  readonly locationObjectStatus: "mapped_to_department";
  readonly unsupportedProviderObject?: "Location";
  readonly status?: "active" | "inactive";
  readonly active?: boolean;
  readonly subLocation?: boolean;
  readonly parentRef?: HandrailQuickBooksAccountingReference;
  readonly parentLocationId?: string;
  readonly parentLocationName?: string;
  readonly hierarchyPath?: readonly string[];
  readonly hierarchyLevel?: number;
}

export type HandrailQuickBooksTransactionSourceObject = Exclude<
  HandrailQuickBooksRawImportObjectType,
  "Account" | "Class" | "Customer" | "Department" | "Item" | "JournalEntry" | "Vendor"
>;

export type HandrailQuickBooksTransactionType =
  | "bill"
  | "bill_payment"
  | "credit_memo"
  | "deposit"
  | "invoice"
  | "payment"
  | "purchase"
  | "refund_receipt"
  | "sales_receipt"
  | "transfer"
  | "vendor_credit";

export interface HandrailQuickBooksTransaction extends HandrailQuickBooksProviderMetadata {
  readonly id: string;
  readonly sourceObject: HandrailQuickBooksTransactionSourceObject;
  readonly transactionType: HandrailQuickBooksTransactionType;
  readonly transactionDate?: string;
  readonly amount?: number;
  readonly currency?: HandrailQuickBooksAccountingCurrencyReference;
  readonly party?: HandrailQuickBooksAccountingReference;
  readonly documentNumber?: string;
  readonly privateNote?: string;
  readonly balance?: number;
}

export interface HandrailQuickBooksTransactionLine extends HandrailQuickBooksProviderMetadata {
  readonly id: string;
  readonly sourceObject: HandrailQuickBooksTransactionSourceObject;
  readonly transactionType: HandrailQuickBooksTransactionType;
  readonly transactionId: string;
  readonly lineId: string;
  readonly lineIndex: number;
  readonly lineOrder: number;
  readonly transactionDate?: string;
  readonly documentNumber?: string;
  readonly amount?: number;
  readonly description?: string;
  readonly detailType?: string;
  readonly party?: HandrailQuickBooksAccountingReference;
  readonly account?: HandrailQuickBooksAccountingReference;
  readonly item?: HandrailQuickBooksAccountingReference;
  readonly classRef?: HandrailQuickBooksAccountingReference;
  readonly department?: HandrailQuickBooksAccountingReference;
}

export type HandrailQuickBooksLedgerPostingType = "Debit" | "Credit";

export interface HandrailQuickBooksLedgerEntry extends HandrailQuickBooksProviderMetadata {
  readonly id: string;
  readonly sourceObject: "JournalEntry" | HandrailQuickBooksTransactionSourceObject;
  readonly transactionType: "journal_entry" | HandrailQuickBooksTransactionType;
  readonly transactionId: string;
  readonly lineId: string;
  readonly transactionDate?: string;
  readonly postedAt?: string;
  readonly documentNumber?: string;
  readonly account?: HandrailQuickBooksAccountingReference;
  readonly postingType: HandrailQuickBooksLedgerPostingType;
  readonly amount?: number;
  readonly currency?: HandrailQuickBooksAccountingCurrencyReference;
  readonly description?: string;
  readonly party?: HandrailQuickBooksAccountingReference;
  readonly item?: HandrailQuickBooksAccountingReference;
  readonly classRef?: HandrailQuickBooksAccountingReference;
  readonly department?: HandrailQuickBooksAccountingReference;
}

export type HandrailQuickBooksProviderReportName =
  | "trial_balance"
  | "profit_and_loss"
  | "balance_sheet"
  | "general_ledger"
  | "cash_flow";

export type HandrailQuickBooksProviderReportBasis = "accrual" | "cash";

export interface HandrailQuickBooksProviderReportRequest {
  readonly reportName: HandrailQuickBooksProviderReportName;
  readonly accountingBasis?: HandrailQuickBooksProviderReportBasis;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly asOfDate?: string;
}

export interface HandrailQuickBooksProviderReportTotal {
  readonly totalKey: string;
  readonly label?: string;
  readonly amount: string;
}

export type HandrailQuickBooksProfitAndLossAccountClassification =
  | "income"
  | "cost_of_goods_sold"
  | "expense"
  | "other_income"
  | "other_expense";

export interface HandrailQuickBooksProviderReportAccountTotal {
  readonly accountSourceId: string;
  readonly label?: string;
  /** Debit-positive amount used to compare the row with normalized postings. */
  readonly amount: string;
  /** Exact amount displayed on the provider P&L. */
  readonly providerAmount?: string;
  readonly classification?: HandrailQuickBooksProfitAndLossAccountClassification;
  readonly reportName?: "profit_and_loss";
  readonly accountingBasis?: HandrailQuickBooksProviderReportBasis;
  readonly periodStart?: string;
  readonly periodEnd?: string;
}

/**
 * One QuickBooks-posted general ledger line as reported by the QuickBooks
 * GeneralLedger report. Amounts reflect QuickBooks' own posting engine
 * (FIFO inventory COGS, tax postings, adjustments).
 */
export interface HandrailQuickBooksProviderLedgerRow {
  readonly accountSourceId: string;
  readonly accountName?: string;
  readonly transactionId: string;
  readonly transactionType: string;
  readonly transactionTypeLabel?: string;
  readonly transactionDate: string;
  readonly documentNumber?: string;
  readonly partyName?: string;
  readonly description?: string;
  readonly splitAccountName?: string;
  readonly debitAmount: string;
  readonly creditAmount: string;
}

export interface HandrailQuickBooksProviderReportRef {
  readonly provider: "quickbooks";
  readonly providerEnvironment: HandrailQuickBooksProviderMode;
  readonly realmId: string;
  readonly reportName: HandrailQuickBooksProviderReportName;
  readonly accountingBasis?: HandrailQuickBooksProviderReportBasis;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly sourceUpdatedAt?: string;
  readonly sourcePayloadRef: {
    readonly sourceObjectType: string;
    readonly sourceObjectId: string;
    readonly sourceUpdatedAt?: string;
    readonly storageRef?: string;
  };
}

export interface HandrailQuickBooksProviderReportResponse {
  readonly ok: true;
  readonly tenantId: string;
  readonly realmId?: string;
  readonly companyId?: string;
  readonly providerEnvironment?: HandrailQuickBooksProviderMode;
  readonly reportName: HandrailQuickBooksProviderReportName;
  readonly supportStatus: "supported" | "unsupported";
  readonly unsupportedReason?: string;
  readonly accountingBasis: HandrailQuickBooksProviderReportBasis;
  readonly currencyCode?: string;
  readonly providerReportBasis?: string;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly asOfDate?: string;
  readonly generatedAt?: string;
  readonly providerReportRef?: HandrailQuickBooksProviderReportRef;
  readonly totals: readonly HandrailQuickBooksProviderReportTotal[];
  readonly accountTotals?: readonly HandrailQuickBooksProviderReportAccountTotal[];
  readonly ledgerRows?: readonly HandrailQuickBooksProviderLedgerRow[];
  readonly ledgerRowCount?: number;
}

export interface HandrailQuickBooksLedgerSearchRequest extends HandrailQuickBooksListRequest {
  readonly accountId?: string;
  readonly from?: string;
  readonly partyId?: string;
  readonly query?: string;
  readonly to?: string;
  readonly transactionId?: string;
}

export type HandrailQuickBooksAccountListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksAccount>;

export type HandrailQuickBooksItemListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksItem>;

export type HandrailQuickBooksClassListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksClass>;

export type HandrailQuickBooksLocationListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksLocation>;

export type HandrailQuickBooksPartyListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksParty>;

export type HandrailQuickBooksTransactionListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksTransaction>;

export type HandrailQuickBooksTransactionLineListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksTransactionLine>;

export type HandrailQuickBooksTransactionLineSearchResponse =
  HandrailQuickBooksTransactionLineListResponse;

export type HandrailQuickBooksTransactionLineGetResponse =
  HandrailQuickBooksTransactionLine;

export type HandrailQuickBooksLedgerEntryListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksLedgerEntry>;

export type HandrailQuickBooksSyncJobListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksSyncJobSummary>;

export type HandrailQuickBooksImportBatchListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksImportBatchSummary>;

export type HandrailQuickBooksSyncCheckpointListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksSyncCheckpoint>;

export type HandrailQuickBooksRawImportStatusListResponse =
  HandrailQuickBooksListResponse<HandrailQuickBooksRawImportStatus>;

export type HandrailQuickBooksNormalizedResource =
  | HandrailQuickBooksAccount
  | HandrailQuickBooksClass
  | HandrailQuickBooksItem
  | HandrailQuickBooksLedgerEntry
  | HandrailQuickBooksLocation
  | HandrailQuickBooksParty
  | HandrailQuickBooksTransaction
  | HandrailQuickBooksTransactionLine;

export interface HandrailQuickBooksNormalizedResourceMap {
  readonly accounts?: readonly HandrailQuickBooksAccount[];
  readonly classes?: readonly HandrailQuickBooksClass[];
  readonly items?: readonly HandrailQuickBooksItem[];
  readonly ledger_entries?: readonly HandrailQuickBooksLedgerEntry[];
  readonly locations?: readonly HandrailQuickBooksLocation[];
  readonly parties?: readonly HandrailQuickBooksParty[];
  readonly transactions?: readonly HandrailQuickBooksTransaction[];
  readonly transaction_lines?: readonly HandrailQuickBooksTransactionLine[];
}
