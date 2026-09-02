import {
  parseFutureErpQuickBooksTenantMapJson,
  resolveFutureErpQuickBooksTenantId,
  HandrailQuickBooksClient,
  type HandrailQuickBooksAccountMapOrCreateRequest,
  type HandrailQuickBooksJournalEntrySyncRequest,
  type HandrailQuickBooksFutureErpTenantContext,
  type HandrailQuickBooksFutureErpTenantMap,
  type HandrailQuickBooksFutureErpTenantMapContractId,
  type HandrailQuickBooksFutureErpTenantMapping,
  type HandrailQuickBooksFutureErpTenantMappingStatus,
  type HandrailQuickBooksFutureErpTenantMapResolveOptions,
  HandrailQuickBooksAccount,
  HandrailQuickBooksAccountListResponse,
  HandrailQuickBooksAuditReference,
  HandrailQuickBooksClass,
  HandrailQuickBooksClassListResponse,
  HandrailQuickBooksConnectionStatus,
  HandrailQuickBooksConnectionStatusResponse,
  HandrailQuickBooksDeltaSyncCounts,
  HandrailQuickBooksHealthResponse,
  HandrailQuickBooksImportBatchListResponse,
  HandrailQuickBooksImportBatchSummary,
  HandrailQuickBooksItem,
  HandrailQuickBooksItemListResponse,
  HandrailQuickBooksLedgerEntry,
  HandrailQuickBooksLedgerEntryListResponse,
  HandrailQuickBooksLedgerSearchRequest,
  HandrailQuickBooksListRequest,
  HandrailQuickBooksListResponse,
  HandrailQuickBooksLocation,
  HandrailQuickBooksLocationListResponse,
  HandrailQuickBooksNormalizedCompletenessMap,
  HandrailQuickBooksNormalizedCompletenessResourceFamily,
  HandrailQuickBooksNormalizedCompletenessStatus,
  HandrailQuickBooksNormalizedResource,
  HandrailQuickBooksNormalizedResourceCompleteness,
  HandrailQuickBooksNormalizedResourceMap,
  HandrailQuickBooksPageInfo,
  HandrailQuickBooksParty,
  HandrailQuickBooksPartyListResponse,
  HandrailQuickBooksProviderEnvironment,
  HandrailQuickBooksProviderDisposition,
  HandrailQuickBooksProviderDispositionKind,
  HandrailQuickBooksProviderDispositionReason,
  HandrailQuickBooksProviderMode,
  HandrailQuickBooksProviderPagingEvidence,
  HandrailQuickBooksRawImportObjectType,
  HandrailQuickBooksRawImportStatus,
  HandrailQuickBooksRawImportStatusListResponse,
  HandrailQuickBooksReportedProviderMode,
  HandrailQuickBooksRequestOptions,
  HandrailQuickBooksRetryState,
  HandrailQuickBooksSdkConfigInput,
  HandrailQuickBooksStartSyncRequest,
  HandrailQuickBooksSyncCheckpoint,
  HandrailQuickBooksSyncCheckpointListResponse,
  HandrailQuickBooksSyncCheckpointMetadata,
  HandrailQuickBooksSyncJobListResponse,
  HandrailQuickBooksSyncJobSummary,
  HandrailQuickBooksTokenStatusResponse,
  HandrailQuickBooksTransaction,
  HandrailQuickBooksTransactionLine,
  HandrailQuickBooksTransactionLineGetResponse,
  HandrailQuickBooksTransactionLineListResponse,
  HandrailQuickBooksTransactionLineSearchResponse,
  HandrailQuickBooksTransactionListResponse,
  NormalizedQuickBooksFullSyncResponseEnvelope,
  NormalizedQuickBooksIncrementalSyncResponseEnvelope,
  ListAccountsRequest,
  ListClassesRequest,
  ListItemsRequest,
  ListLocationsRequest,
  ListPartiesRequest,
  ListTransactionLinesRequest,
  SearchTransactionLinesRequest,
  ListTransactionsRequest
} from "@handrail/quickbooks-node-sdk";

const providerObjectTypeLabels = {
  Account: "Account",
  Bill: "Bill",
  BillPayment: "Bill payment",
  Class: "Class",
  CreditMemo: "Credit memo",
  Customer: "Customer",
  Department: "Department",
  Deposit: "Deposit",
  Invoice: "Invoice",
  Item: "Item",
  JournalEntry: "Journal entry",
  Payment: "Payment",
  Purchase: "Purchase",
  RefundReceipt: "Refund receipt",
  SalesReceipt: "Sales receipt",
  TaxAgency: "Tax agency",
  TaxCode: "Tax code",
  TaxRate: "Tax rate",
  Transfer: "Transfer",
  Vendor: "Vendor",
  VendorCredit: "Vendor credit"
} satisfies Record<HandrailQuickBooksRawImportObjectType, string>;

function readDispositionKind(value: HandrailQuickBooksProviderDispositionKind) {
  switch (value) {
    case "skipped":
      return "Skipped";
    case "voided":
      return "Voided";
    default:
      return assertNever(value);
  }
}

function readDispositionReason(value: HandrailQuickBooksProviderDispositionReason) {
  switch (value) {
    case "zero_cash_deposit_vendor_credit_offset":
      return "Zero-cash deposit/vendor-credit offset";
    case "zero_effect_empty_payment":
      return "Empty zero-effect payment";
    case "zero_effect_empty_transaction":
      return "Empty zero-effect transaction";
    case "zero_effect_voided":
      return "Provider-voided zero-effect object";
    default:
      return assertNever(value);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled provider contract value: ${String(value)}`);
}

const providerDispositions = [
  {
    disposition: "skipped",
    providerObjectId: "credit-application:VendorCredit:arbitrary/-42",
    providerObjectType: "BillPayment",
    rawPayloadProvenance: {
      sourcePayloadRef: "raw://batch_123/objects/BillPayment/credit-application-arbitrary-42"
    },
    reason: "zero_cash_deposit_vendor_credit_offset"
  },
  {
    disposition: "voided",
    providerObjectId: "purchase:voided:alpha/beta",
    providerObjectType: "Purchase",
    rawPayloadProvenance: {
      sourcePayloadRef: "raw://batch_123/objects/Purchase/purchase-voided-alpha-beta"
    },
    reason: "zero_effect_voided"
  }
] as const satisfies readonly HandrailQuickBooksProviderDisposition[];

const providerDispositionReadModel = providerDispositions.map((providerDisposition) => ({
  disposition: readDispositionKind(providerDisposition.disposition),
  providerObjectId: providerDisposition.providerObjectId,
  providerObjectType: providerObjectTypeLabels[providerDisposition.providerObjectType],
  rawPayloadRef: providerDisposition.rawPayloadProvenance.sourcePayloadRef,
  reason: readDispositionReason(providerDisposition.reason)
}));

const config: HandrailQuickBooksSdkConfigInput = {
  auth: {
    scheme: "bearer",
    token: "service-token"
  },
  providerMode: "sandbox",
  serviceEnv: "staging",
  tenantId: "tenant_123"
};

const futureErpTenantMapContractId: HandrailQuickBooksFutureErpTenantMapContractId =
  "future-erp.quickbooks-tenant-mapping.v1";
const futureErpTenantMappingStatus: HandrailQuickBooksFutureErpTenantMappingStatus = "active";
const futureErpTenantContext: HandrailQuickBooksFutureErpTenantContext = {
  futureErpAccountId: "acct_alpha",
  futureErpCompanyId: "company_alpha"
};
const futureErpTenantMapping: HandrailQuickBooksFutureErpTenantMapping = {
  ...futureErpTenantContext,
  serviceTenantId: "tenant_123",
  status: futureErpTenantMappingStatus
};
const futureErpTenantMap: HandrailQuickBooksFutureErpTenantMap = {
  contractId: futureErpTenantMapContractId,
  consumerProject: "Hitcents Future ERP",
  providerMode: "sandbox",
  schemaVersion: 1,
  serviceEnv: "staging",
  sourceOfTruth: "Handrail QuickBooks Integration service",
  tenantMappings: [futureErpTenantMapping]
};
const futureErpResolveOptions: HandrailQuickBooksFutureErpTenantMapResolveOptions = {
  providerMode: "sandbox",
  serviceEnv: "staging"
};
const parsedFutureErpTenantMap = parseFutureErpQuickBooksTenantMapJson(
  JSON.stringify(futureErpTenantMap)
);
const resolvedFutureErpTenantId = resolveFutureErpQuickBooksTenantId(
  parsedFutureErpTenantMap,
  futureErpTenantContext,
  futureErpResolveOptions
);
const futureErpConfig: HandrailQuickBooksSdkConfigInput = {
  apiKey: "service-api-key",
  futureErpTenantContext,
  providerMode: "sandbox",
  serviceEnv: "staging",
  tenantMap: parsedFutureErpTenantMap
};

const listRequest: HandrailQuickBooksListRequest = {
  cursor: "cursor_123",
  limit: 25
};

const pageInfo: HandrailQuickBooksPageInfo = {
  cursor: "cursor_next",
  hasMore: false,
  limit: 25
};

const accountRequest: ListAccountsRequest = { active: true, accountType: "Bank", ...listRequest };
const itemRequest: ListItemsRequest = { active: true, ...listRequest };
const classRequest: ListClassesRequest = { active: true, ...listRequest };
const locationRequest: ListLocationsRequest = { active: true, ...listRequest };
const partyRequest: ListPartiesRequest = { partyType: "customer", ...listRequest };
const transactionRequest: ListTransactionsRequest = { transactionType: "payment", ...listRequest };
const transactionLineRequest: ListTransactionLinesRequest = {
  accountId: "account_100",
  transactionId: "transaction_700",
  transactionType: "payment",
  ...listRequest
};
const transactionLineSearchRequest: SearchTransactionLinesRequest = {
  from: "2026-05-01",
  partyId: "party_300",
  to: "2026-05-31",
  ...transactionLineRequest
};
const ledgerSearchRequest: HandrailQuickBooksLedgerSearchRequest = {
  accountId: "account_100",
  from: "2026-05-01",
  to: "2026-05-31"
};

const audit: HandrailQuickBooksAuditReference = {
  checkpointId: "checkpoint_123",
  importBatchId: "batch_123",
  realmId: "realm_123",
  sourcePayloadRefs: ["raw://batch_123/object/Account/100"]
};

const retry: HandrailQuickBooksRetryState = {
  attemptCount: 1,
  lastErrorCode: "quickbooks_fetch_failed",
  maxAttempts: 3,
  retryReason: "transient_provider_failure",
  retryable: true,
  source: "raw_import"
};

const deltaCounts: HandrailQuickBooksDeltaSyncCounts = {
  changedCount: 1,
  failedCount: 0,
  insertedCount: 2,
  retryPendingCount: 0,
  skippedCount: 3,
  unchangedCount: 3,
  updatedCount: 1
};

const providerEnvironment: HandrailQuickBooksProviderEnvironment = "sandbox";
const providerMode: HandrailQuickBooksProviderMode = "sandbox";
const reportedProviderMode: HandrailQuickBooksReportedProviderMode = "unavailable";
const connectionStatus: HandrailQuickBooksConnectionStatus = "connected";
const completenessFamily: HandrailQuickBooksNormalizedCompletenessResourceFamily =
  "transaction_lines";
const completenessStatus: HandrailQuickBooksNormalizedCompletenessStatus = "unknown";
const providerPagingEvidence: HandrailQuickBooksProviderPagingEvidence = {
  capturedAt: "2026-05-31T00:01:00.000Z",
  completed: true,
  entity: "transactions",
  fetchedObjectCount: 2,
  importBatchId: "batch_123",
  jobId: "job_123",
  maxResults: 100,
  objectType: "Payment",
  pageCount: 1,
  pageSize: 100,
  provider: "intuit",
  providerRequestRef: "provider://quickbooks/batch_123/Payment/pages/1",
  source: "quickbooks_accounting_api",
  sourceOperation: "query",
  sourcePayloadRef: "raw://batch_123/objects/Payment",
  startPosition: 1,
  status: "completed",
  syncJobRef: "sync-job://quickbooks/tenant_123/job_123"
};
const accountCompleteness: HandrailQuickBooksNormalizedResourceCompleteness = {
  auditRefs: ["raw://batch_123", "sync-job://quickbooks/tenant_123/job_123"],
  checkpointRefs: ["checkpoint://quickbooks/tenant_123/checkpoint_123"],
  complete: true,
  evidence: {
    batchStatus: "succeeded",
    checkpointStatus: "succeeded",
    errorCount: 0,
    objectCounts: { Account: 2 },
    providerPagingEvidence: [providerPagingEvidence],
    warningCount: 0
  },
  importBatchId: "batch_123",
  normalizedRecordCount: 2,
  providerPagingEvidenceRefs: [providerPagingEvidence.providerRequestRef],
  resourceFamily: "accounts",
  sourceEntity: "accounts",
  sourceObjectCount: 2,
  sourceObjectTypes: ["Account"],
  status: "complete",
  syncMode: "incremental",
  syncPhase: "delta_sync"
};
const normalizedCompleteness: HandrailQuickBooksNormalizedCompletenessMap = {
  accounts: accountCompleteness,
  ledger_entries: {
    ...accountCompleteness,
    evidence: {
      ...accountCompleteness.evidence,
      objectCounts: { Bill: 1, Payment: 1 }
    },
    normalizedRecordCount: 4,
    providerPagingEvidenceRefs: [providerPagingEvidence.providerRequestRef],
    resourceFamily: "ledger_entries",
    sourceEntity: "transactions",
    sourceObjectCount: 2,
    sourceObjectTypes: ["Bill", "Payment"],
    status: "complete"
  },
  transactions: {
    ...accountCompleteness,
    complete: false,
    evidence: {
      ...accountCompleteness.evidence,
      incompleteObjectTypes: ["Bill"],
      objectCounts: { Bill: 1, Payment: 1 }
    },
    normalizedRecordCount: 2,
    reason: "provider_paging_Bill_incomplete",
    resourceFamily: "transactions",
    sourceEntity: "transactions",
    sourceObjectCount: 2,
    sourceObjectTypes: ["Bill", "Payment"],
    status: "incomplete"
  },
  transaction_lines: {
    ...accountCompleteness,
    complete: false,
    evidence: {
      ...accountCompleteness.evidence,
      missingObjectTypes: ["Purchase"]
    },
    reason: "missing_object_count_Purchase",
    resourceFamily: completenessFamily,
    sourceEntity: "transactions",
    sourceObjectTypes: ["Payment", "Purchase"],
    status: completenessStatus
  }
};
const checkpointMetadata: HandrailQuickBooksSyncCheckpointMetadata = {
  audit,
  checkpointId: "checkpoint_123",
  checkpointKind: "provider_updated_at_watermark",
  checkpointRef: "checkpoint://quickbooks/tenant_123/checkpoint_123",
  cursorRefs: ["cursor://quickbooks/tenant_123/accounts"],
  entity: "accounts",
  importBatchId: "batch_123",
  jobIds: ["job_123"],
  objectType: "Account",
  startedAt: "2026-05-31T00:00:00.000Z",
  status: "succeeded",
  normalizedCompleteness,
  syncJobRefs: ["sync-job://quickbooks/tenant_123/job_123"],
  syncMode: "incremental"
};
const checkpoint: HandrailQuickBooksSyncCheckpoint = {
  ...checkpointMetadata,
  companyId: "realm_123",
  deltaCounts,
  realmId: "realm_123",
  tenantId: "tenant_123"
};
const importBatch: HandrailQuickBooksImportBatchSummary = {
  audit,
  checkpointRefs: ["checkpoint://quickbooks/tenant_123/checkpoint_123"],
  companyId: "realm_123",
  deltaCounts,
  entityCounts: { accounts: 2 },
  errorCount: 0,
  importBatchId: "batch_123",
  jobIds: ["job_123"],
  normalizedCompleteness,
  objectCounts: { Account: 2 },
  realmId: "realm_123",
  startedAt: "2026-05-31T00:00:00.000Z",
  status: "succeeded",
  syncJobRefs: ["sync-job://quickbooks/tenant_123/job_123"],
  tenantId: "tenant_123",
  totalObjectCount: 2,
  warningCount: 0
};

declare const account: HandrailQuickBooksAccount;
declare const item: HandrailQuickBooksItem;
declare const classObject: HandrailQuickBooksClass;
declare const location: HandrailQuickBooksLocation;
declare const party: HandrailQuickBooksParty;
declare const transaction: HandrailQuickBooksTransaction;
declare const transactionLine: HandrailQuickBooksTransactionLine;
declare const ledgerEntry: HandrailQuickBooksLedgerEntry;

const normalizedResources: readonly HandrailQuickBooksNormalizedResource[] = [
  account,
  item,
  classObject,
  location,
  party,
  transaction,
  transactionLine,
  ledgerEntry
];
const normalizedResourceMap: HandrailQuickBooksNormalizedResourceMap = {
  accounts: [account],
  classes: [classObject],
  items: [item],
  ledger_entries: [ledgerEntry],
  locations: [location],
  parties: [party],
  transactions: [transaction],
  transaction_lines: [transactionLine]
};

const syncJob: HandrailQuickBooksSyncJobSummary = {
  audit,
  batch: importBatch,
  checkpoint: checkpointMetadata,
  companyId: "realm_123",
  deltaCounts,
  entity: "accounts",
  importBatchId: "batch_123",
  importVolume: {
    entityCounts: { accounts: 2 },
    errorCount: 0,
    objectCount: 2,
    objectCounts: { Account: 2 },
    totalObjectCount: 2,
    warningCount: 0
  },
  jobId: "job_123",
  normalizedCompleteness,
  objectCount: 2,
  objectType: "Account",
  providerDispositions,
  retry,
  startedAt: "2026-05-31T00:00:00.000Z",
  status: "succeeded",
  syncMode: "incremental",
  syncPhase: "delta_sync",
  tenantId: "tenant_123"
};
const fullSyncEnvelope: NormalizedQuickBooksFullSyncResponseEnvelope = {
  audit,
  checkpoint: {
    ...checkpointMetadata,
    syncMode: "full"
  },
  companyId: "realm_123",
  contractId: "handrail.quickbooks.normalized-sync-envelope.v1",
  deltaCounts: {
    changedCount: 0,
    failedCount: 0,
    insertedCount: 2,
    skippedCount: 0
  },
  importBatch,
  importBatchId: "batch_123",
  importVolume: syncJob.importVolume,
  jobId: "job_123",
  normalizedResourceCounts: {
    accounts: 2,
    classes: 1,
    items: 1,
    ledger_entries: 4,
    locations: 1,
    parties: 2,
    transactions: 2,
    transaction_lines: 1
  },
  normalizedCompleteness,
  normalizedResources: normalizedResourceMap,
  providerDispositions,
  status: "succeeded",
  syncJob: {
    ...syncJob,
    syncMode: "full",
    syncPhase: "initial_load"
  },
  syncMode: "full",
  syncPhase: "initial_load",
  tenantId: "tenant_123"
};
const incrementalSyncEnvelope: NormalizedQuickBooksIncrementalSyncResponseEnvelope = {
  audit,
  checkpoint: checkpointMetadata,
  companyId: "realm_123",
  contractId: "handrail.quickbooks.normalized-sync-envelope.v1",
  deltaCounts,
  importBatch,
  importBatchId: "batch_123",
  importVolume: syncJob.importVolume,
  jobId: "job_123",
  normalizedResourceCounts: {
    accounts: 2,
    ledger_entries: 4,
    transactions: 2,
    transaction_lines: 1
  },
  normalizedCompleteness,
  normalizedResources: {
    accounts: [account],
    ledger_entries: [ledgerEntry],
    transactions: [transaction],
    transaction_lines: [transactionLine]
  },
  providerDispositions,
  status: "succeeded",
  syncJob,
  syncMode: "incremental",
  syncPhase: "delta_sync",
  tenantId: "tenant_123"
};

const accountList: HandrailQuickBooksAccountListResponse = { data: [account], page: pageInfo };
const itemList: HandrailQuickBooksItemListResponse = { data: [item], page: pageInfo };
const classList: HandrailQuickBooksClassListResponse = { data: [classObject], page: pageInfo };
const locationList: HandrailQuickBooksLocationListResponse = { data: [location], page: pageInfo };
const partyList: HandrailQuickBooksPartyListResponse = { data: [party], page: pageInfo };
const transactionList: HandrailQuickBooksTransactionListResponse = {
  data: [transaction],
  page: pageInfo
};
const transactionLineList: HandrailQuickBooksTransactionLineListResponse = {
  data: [transactionLine],
  page: pageInfo
};
const transactionLineSearch: HandrailQuickBooksTransactionLineSearchResponse = transactionLineList;
const transactionLineGet: HandrailQuickBooksTransactionLineGetResponse = transactionLine;
const ledgerList: HandrailQuickBooksLedgerEntryListResponse = {
  data: [ledgerEntry],
  page: pageInfo
};
const genericList: HandrailQuickBooksListResponse<HandrailQuickBooksNormalizedResource> = {
  data: normalizedResources,
  page: pageInfo
};
const syncJobList: HandrailQuickBooksSyncJobListResponse = { data: [syncJob], page: pageInfo };
const checkpointList: HandrailQuickBooksSyncCheckpointListResponse = {
  data: [checkpoint],
  page: pageInfo
};
const importBatchList: HandrailQuickBooksImportBatchListResponse = {
  data: [importBatch],
  page: pageInfo
};
const rawImportStatus: HandrailQuickBooksRawImportStatus = {
  audit,
  checkpoint: checkpointMetadata,
  companyId: "realm_123",
  deltaCounts,
  entity: "accounts",
  errorCount: 0,
  importBatchId: "batch_123",
  importVolume: syncJob.importVolume,
  objectCount: 2,
  objectType: "Account",
  startedAt: "2026-05-31T00:00:00.000Z",
  status: "completed",
  normalizedCompleteness,
  syncMode: "full",
  syncPhase: "initial_load",
  tenantId: "tenant_123",
  warningCount: 0
};
const rawImportList: HandrailQuickBooksRawImportStatusListResponse = {
  data: [rawImportStatus],
  page: pageInfo
};

const connection: HandrailQuickBooksConnectionStatusResponse = {
  providerEnvironment,
  providerMode,
  status: connectionStatus,
  tenantId: "tenant_123"
};
const health: HandrailQuickBooksHealthResponse = {
  ok: true,
  service: "handrail-integration-quickbooks"
};
const tokenStatus: HandrailQuickBooksTokenStatusResponse = {
  audit,
  status: "healthy",
  tenantId: "tenant_123"
};
const syncRequest: HandrailQuickBooksStartSyncRequest = {
  entities: ["accounts", "parties", "transactions", "ledger_entries"],
  mode: "incremental",
  since: "2026-05-01T00:00:00.000Z"
};
const requestOptions: HandrailQuickBooksRequestOptions = {
  idempotencyKey: "future-erp-sync",
  method: "POST"
};
const outboundAccountRequest: HandrailQuickBooksAccountMapOrCreateRequest = {
  sourceRef: {
    sourceSystem: "hitcents_erp",
    sourceEntityType: "ledger_account",
    sourceEntityId: "cash"
  },
  account: { name: "Operating Cash", accountType: "Bank" }
};
const outboundJournalRequest: HandrailQuickBooksJournalEntrySyncRequest = {
  sourceRef: {
    sourceSystem: "hitcents_erp",
    sourceEntityType: "journal_entry",
    sourceEntityId: "journal-1001"
  },
  postingDate: "2026-08-22",
  lines: [
    { lineId: "debit", postingType: "Debit", amount: "1.00", accountSourceRef: outboundAccountRequest.sourceRef },
    { lineId: "credit", postingType: "Credit", amount: "1.00", accountSourceRef: outboundAccountRequest.sourceRef }
  ]
};
const outboundClient = new HandrailQuickBooksClient(config);
const outboundAccountResult = outboundClient.accounts.mapOrCreate(
  outboundAccountRequest,
  { idempotencyKey: "account:cash:v1:4d9f" }
);
const outboundJournalResult = outboundClient.journalEntries.sync(
  outboundJournalRequest,
  { idempotencyKey: "journal:journal-1001:v1:91a2" }
);

void [
  accountRequest,
  itemRequest,
  classRequest,
  locationRequest,
  partyRequest,
  transactionRequest,
  transactionLineRequest,
  transactionLineSearchRequest,
  ledgerSearchRequest,
  accountList,
  itemList,
  classList,
  locationList,
  partyList,
  transactionList,
  transactionLineList,
  transactionLineSearch,
  transactionLineGet,
  ledgerList,
  genericList,
  syncJobList,
  checkpointList,
  importBatchList,
  rawImportList,
  connection,
  health,
  tokenStatus,
  syncRequest,
  fullSyncEnvelope,
  incrementalSyncEnvelope,
  normalizedResourceMap,
  requestOptions,
  providerDispositionReadModel,
  outboundAccountResult,
  outboundJournalResult,
  config,
  futureErpConfig,
  resolvedFutureErpTenantId,
  reportedProviderMode,
];
