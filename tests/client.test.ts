import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HandrailQuickBooksClient,
  HandrailQuickBooksConfigError,
  HandrailQuickBooksError,
  type HandrailQuickBooksFetch,
  type HandrailQuickBooksNormalizedCompletenessStatus,
  type NormalizedQuickBooksFullSyncResponseEnvelope,
  type NormalizedQuickBooksIncrementalSyncResponseEnvelope
} from "../src/index.js";
import {
  accountingFixtures,
  contractCheckpointId,
  contractApiKey,
  contractBaseUrl,
  contractImportBatchId,
  contractJobId,
  contractRequests,
  contractResponses,
  contractTenantId
} from "./fixtures/accounting.js";

interface CapturedRequest {
  readonly init?: RequestInit;
  readonly input: Request | string | URL;
}

const unsafeProviderPayloadPattern =
  /"access_token"|"refresh_token"|"client_secret"|"Authorization"|"authorization"|"clientId"|"clientSecret"|"apiKey"|"rawProviderPayload"|"rawPayload"|"QueryResponse"|"providerError"|"rawProviderError"|stored-access-token|stored-refresh-token|do-not-print|raw provider payload/i;

describe("HandrailQuickBooksClient", () => {
  it("posts tenant-scoped provider report requests and returns normalized totals", async () => {
    const providerReportResponse = {
      ok: true,
      tenantId: "tenant_123",
      realmId: "realm_demo",
      companyId: "realm_demo",
      providerEnvironment: "sandbox",
      reportName: "trial_balance",
      supportStatus: "supported",
      accountingBasis: "accrual",
      currencyCode: "USD",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      generatedAt: "2026-06-15T22:00:00.000Z",
      providerReportRef: {
        provider: "quickbooks",
        providerEnvironment: "sandbox",
        realmId: "realm_demo",
        reportName: "trial_balance",
        accountingBasis: "accrual",
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
        sourcePayloadRef: {
          sourceObjectType: "quickbooks_report_trial_balance",
          sourceObjectId: "realm_demo:trial_balance:2026-05-01:2026-05-31:accrual"
        }
      },
      totals: [
        { totalKey: "total_debits", label: "Total Debits", amount: "2202.25" },
        { totalKey: "total_credits", label: "Total Credits", amount: "2202.25" }
      ],
      accountTotals: [
        { accountSourceId: "35", label: "Checking", amount: "1201.00" },
        { accountSourceId: "79", label: "Sales of Product Income", amount: "-2202.25" }
      ]
    };
    const { fetch, requests } = mockFetch([providerReportResponse]);
    const client = new HandrailQuickBooksClient({
      apiKey: "test-api-key",
      baseUrl: "https://quickbooks.example.test/api",
      fetch,
      providerMode: "sandbox",
      tenantId: "tenant_123"
    });

    await expect(
      client.providerReports.trialBalance({
        accountingBasis: "accrual",
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31"
      })
    ).resolves.toEqual(providerReportResponse);

    expect(requests).toHaveLength(1);
    expect(requestUrl(requests[0])).toBe(
      "https://quickbooks.example.test/api/v1/tenants/tenant_123/quickbooks/provider-reports"
    );
    expect(requests[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
      reportName: "trial_balance",
      accountingBasis: "accrual",
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31"
    });
    expect(JSON.stringify(providerReportResponse)).not.toMatch(unsafeProviderPayloadPattern);
  });

  it("builds tenant-scoped connection status requests", async () => {
    const { fetch, requests } = mockFetch([
      {
        providerMode: "sandbox",
        status: "connected",
        tenantId: "tenant_123"
      }
    ]);
    const client = new HandrailQuickBooksClient({
      apiKey: "test-api-key",
      baseUrl: "https://quickbooks.example.test/api",
      fetch,
      providerMode: "sandbox",
      tenantId: "tenant_123"
    });

    await expect(client.connections.status()).resolves.toEqual({
      providerMode: "sandbox",
      status: "connected",
      tenantId: "tenant_123"
    });

    expect(client.config.providerMode).toBe("sandbox");
    expect(requests).toHaveLength(1);
    expect(requestUrl(requests[0])).toBe(
      "https://quickbooks.example.test/api/v1/tenants/tenant_123/quickbooks/connections/status"
    );
    expect(requests[0].init?.method).toBe("GET");
    const headers = new Headers(requests[0].init?.headers);
    expect(headers.get("authorization")).toBe("Bearer test-api-key");
    expect(headers.get("x-handrail-tenant-id")).toBe("tenant_123");
    expect(headers.has("x-handrail-qbo-provider-mode")).toBe(false);
  });

  it("uses fixture contracts for representative service requests and responses", async () => {
    const { fetch, requests } = mockFetch([
      contractResponses.health,
      contractResponses.connectionStatus,
      contractResponses.tokenStatus,
      contractResponses.connectUrl,
      contractResponses.accounts,
      contractResponses.parties,
      contractResponses.transactions,
      contractResponses.syncJob,
      contractResponses.syncJob,
      contractResponses.syncJobs,
      contractResponses.rawImportStatus,
      contractResponses.rawImports,
      contractResponses.importBatch,
      contractResponses.importBatches,
      contractResponses.checkpoint,
      contractResponses.checkpoints,
      contractResponses.ledgerEntries,
      contractResponses.ledgerEntries,
      contractResponses.transactionLines,
      contractResponses.transactionLines
    ]);
    const client = new HandrailQuickBooksClient({
      apiKey: contractApiKey,
      baseUrl: contractBaseUrl,
      fetch,
      tenantId: contractTenantId
    });

    const health = await client.health.get();
    const connectionStatus = await client.connections.status();
    const tokenStatus = await client.connections.tokenStatus();
    const connectUrl = await client.connections.connectUrl(contractRequests.connectUrl);
    const accounts = await client.accounts.list({
      accountType: "Bank",
      active: true,
      cursor: "cursor_accounts_after",
      limit: 25
    });
    const parties = await client.parties.list({
      limit: 25,
      partyType: "customer"
    });
    const transactions = await client.transactions.list({
      limit: 25,
      transactionType: "payment"
    });
    const syncJob = await client.syncJobs.start(contractRequests.startSync, {
      idempotencyKey: "sync-contract-idempotency-key"
    });
    const syncJobStatus = await client.syncJobs.get(contractJobId);
    const syncJobs = await client.syncJobs.list({
      limit: 10
    });
    const rawImportStatus = await client.rawImports.status(contractImportBatchId);
    const rawImports = await client.rawImports.list({
      limit: 10
    });
    const importBatch = await client.importBatches.get(contractImportBatchId);
    const importBatches = await client.importBatches.list({
      limit: 10
    });
    const checkpoint = await client.checkpoints.get(contractCheckpointId);
    const checkpoints = await client.checkpoints.list({
      entity: "accounts",
      limit: 2,
      objectType: "Account",
      syncMode: "incremental"
    });
    const ledgerList = await client.ledgerEntries.list({
      limit: 50
    });
    const ledgerEntries = await client.ledgerEntries.search(contractRequests.ledgerSearch);
    const transactionLineList = await client.transactionLines.list({
      limit: 50,
      transactionId: "700"
    });
    const transactionLineSearch = await client.transactionLines.search({
      accountId: "100",
      from: "2026-05-01",
      to: "2026-05-31",
      transactionType: "payment"
    });

    expect(health).toEqual(contractResponses.health);
    expect(connectionStatus).toEqual(contractResponses.connectionStatus);
    expect(tokenStatus).toEqual(contractResponses.tokenStatus);
    expect(connectUrl).toEqual(contractResponses.connectUrl);
    expect(accounts).toEqual(contractResponses.accounts);
    expect(accounts.data[0]).toMatchObject({
      provider: "intuit",
      source: "quickbooks_accounting_api",
      sourceObject: "Account",
      accountType: "Bank",
      classification: "Asset",
      sourceObjectId: "100"
    });
    expect(parties).toEqual(contractResponses.parties);
    expect(parties.data[0]).toMatchObject({
      partyType: "customer",
      sourceObject: "Customer"
    });
    expect(transactions).toEqual(contractResponses.transactions);
    expect(transactions.data[0]).toMatchObject({
      sourceObject: "Payment",
      transactionType: "payment"
    });
    expect(transactions.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceObject: "Bill",
          transactionType: "bill"
        }),
        expect.objectContaining({
          sourceObject: "Deposit",
          transactionType: "deposit"
        })
      ])
    );
    expect(syncJob).toEqual(contractResponses.syncJob);
    expect(syncJob).toMatchObject({
      tenantId: contractTenantId,
      objectType: "Account",
      deltaCounts: {
        changedCount: 1,
        failedCount: 0,
        insertedCount: 3,
        skippedCount: 2
      },
      importVolume: {
        objectCount: 3,
        totalObjectCount: 3
      },
      syncMode: "incremental",
      syncPhase: "delta_sync"
    });
    expect(syncJob.checkpoint).toMatchObject({
      checkpointId: "quickbooks_incremental_accounts_Account",
      checkpointKind: "provider_updated_at_watermark",
      checkpointRef:
        "checkpoint://quickbooks/tenant_contract_123/quickbooks_incremental_accounts_Account",
      providerUpdatedAtWatermark: "2026-06-15T19:25:00.000Z",
      syncMode: "incremental"
    });
    expect(syncJob.batch).toEqual(contractResponses.importBatch);
    expect(syncJobStatus).toEqual(contractResponses.syncJob);
    expect(syncJobs).toEqual(contractResponses.syncJobs);
    expect(rawImportStatus).toEqual(contractResponses.rawImportStatus);
    expect(rawImportStatus).toMatchObject({
      tenantId: contractTenantId,
      objectType: "Account",
      deltaCounts: {
        changedCount: 0,
        failedCount: 0,
        insertedCount: 8,
        skippedCount: 0
      },
      importVolume: {
        objectCount: 8,
        totalObjectCount: 8
      },
      syncMode: "full",
      syncPhase: "initial_load"
    });
    expect(rawImportStatus.checkpoint).toMatchObject({
      checkpointId: "quickbooks_full_initial_load_accounts_Account",
      checkpointKind: "provider_updated_at_watermark",
      checkpointRef:
        "checkpoint://quickbooks/tenant_contract_123/quickbooks_full_initial_load_accounts_Account",
      providerUpdatedAtWatermark: "2026-06-15T19:25:00.000Z",
      syncMode: "full"
    });
    expect(rawImports).toEqual(contractResponses.rawImports);
    expect(importBatch).toEqual(contractResponses.importBatch);
    expect(importBatches).toEqual(contractResponses.importBatches);
    expect(checkpoint).toEqual(contractResponses.checkpoint);
    expect(checkpoints).toEqual(contractResponses.checkpoints);
    expect(ledgerList).toEqual(contractResponses.ledgerEntries);
    expect(ledgerEntries).toEqual(contractResponses.ledgerEntries);
    expect(ledgerEntries.data[0]).toMatchObject({
      lineId: "1",
      postingType: "Debit",
      account: {
        value: "100"
      },
      party: {
        value: "300"
      }
    });
    expect(transactionLineList).toEqual(contractResponses.transactionLines);
    expect(transactionLineSearch).toEqual(contractResponses.transactionLines);
    expect(transactionLineList.data[0]).toMatchObject({
      lineId: "1",
      lineIndex: 0,
      lineOrder: 1,
      transactionId: "700",
      transactionType: "payment"
    });
    expect(requests).toHaveLength(20);
    expect(requestUrl(requests[0])).toBe(
      `${contractBaseUrl}/.well-known/healthz`
    );
    expect(requests[0].init?.method).toBe("GET");

    expect(requestUrl(requests[1])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/connections/status`
    );
    expect(requests[1].init?.method).toBe("GET");

    expect(requestUrl(requests[2])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/connections/token-status`
    );
    expect(requests[2].init?.method).toBe("GET");

    expect(requestUrl(requests[3])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/connections/connect-url`
    );
    expect(requests[3].init?.method).toBe("POST");
    expect(JSON.parse(String(requests[3].init?.body))).toEqual(contractRequests.connectUrl);

    const accountsUrl = new URL(requestUrl(requests[4]));
    expect(accountsUrl.origin + accountsUrl.pathname).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/accounting/accounts`
    );
    expect(accountsUrl.searchParams.get("accountType")).toBe("Bank");
    expect(accountsUrl.searchParams.get("active")).toBe("true");
    expect(accountsUrl.searchParams.get("cursor")).toBe("cursor_accounts_after");
    expect(accountsUrl.searchParams.get("limit")).toBe("25");
    expect(requests[4].init?.method).toBe("GET");

    expect(requestUrl(requests[5])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/accounting/parties?limit=25&partyType=customer`
    );
    expect(requests[5].init?.method).toBe("GET");

    expect(requestUrl(requests[6])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/accounting/transactions?limit=25&transactionType=payment`
    );
    expect(requests[6].init?.method).toBe("GET");

    expect(requestUrl(requests[7])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/sync-jobs`
    );
    expect(requests[7].init?.method).toBe("POST");
    expect(new Headers(requests[7].init?.headers).get("idempotency-key")).toBe(
      "sync-contract-idempotency-key"
    );
    expect(JSON.parse(String(requests[7].init?.body))).toEqual(contractRequests.startSync);

    expect(requestUrl(requests[8])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/sync-jobs/${contractJobId}`
    );
    expect(requests[8].init?.method).toBe("GET");

    expect(requestUrl(requests[9])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/sync-jobs?limit=10`
    );
    expect(requests[9].init?.method).toBe("GET");

    expect(requestUrl(requests[10])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/raw-imports/${contractImportBatchId}/status`
    );
    expect(requests[10].init?.method).toBe("GET");

    expect(requestUrl(requests[11])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/raw-imports?limit=10`
    );
    expect(requests[11].init?.method).toBe("GET");

    expect(requestUrl(requests[12])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/import-batches/${contractImportBatchId}`
    );
    expect(requests[12].init?.method).toBe("GET");

    expect(requestUrl(requests[13])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/import-batches?limit=10`
    );
    expect(requests[13].init?.method).toBe("GET");

    expect(requestUrl(requests[14])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/checkpoints/${contractCheckpointId}`
    );
    expect(requests[14].init?.method).toBe("GET");

    const checkpointsUrl = new URL(requestUrl(requests[15]));
    expect(checkpointsUrl.origin + checkpointsUrl.pathname).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/checkpoints`
    );
    expect(checkpointsUrl.searchParams.get("entity")).toBe("accounts");
    expect(checkpointsUrl.searchParams.get("limit")).toBe("2");
    expect(checkpointsUrl.searchParams.get("objectType")).toBe("Account");
    expect(checkpointsUrl.searchParams.get("syncMode")).toBe("incremental");
    expect(requests[15].init?.method).toBe("GET");

    expect(requestUrl(requests[16])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/accounting/ledger-entries?limit=50`
    );
    expect(requests[16].init?.method).toBe("GET");

    expect(requestUrl(requests[17])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/accounting/ledger-entries/search`
    );
    expect(requests[17].init?.method).toBe("POST");
    expect(JSON.parse(String(requests[17].init?.body))).toEqual(contractRequests.ledgerSearch);

    expect(requestUrl(requests[18])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/accounting/transaction-lines?limit=50&transactionId=700`
    );
    expect(requests[18].init?.method).toBe("GET");

    expect(requestUrl(requests[19])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/accounting/transaction-lines?accountId=100&from=2026-05-01&to=2026-05-31&transactionType=payment`
    );
    expect(requests[19].init?.method).toBe("GET");

    const headers = new Headers(requests[1].init?.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${contractApiKey}`);
    expect(headers.get("x-handrail-tenant-id")).toBe(contractTenantId);
    expect(JSON.stringify([
      connectionStatus,
      tokenStatus,
      connectUrl,
      accounts,
      syncJob,
      syncJobStatus,
      rawImportStatus,
      rawImports,
      importBatch,
      importBatches,
      checkpoint,
      checkpoints,
      ledgerList,
      ledgerEntries,
      transactionLineList,
      transactionLineSearch
    ])).not.toMatch(unsafeProviderPayloadPattern);
  });

  it("pins cursor query params and returned pages for list resources", async () => {
    const page = {
      cursor: "cursor_next_contract",
      hasMore: true,
      limit: 7
    };
    const { fetch, requests } = mockFetch([
      { data: accountingFixtures.accounts, page },
      { data: accountingFixtures.parties, page },
      { data: accountingFixtures.transactions, page },
      { data: accountingFixtures.transactionLines, page },
      { data: accountingFixtures.ledgerEntries, page },
      { data: [contractResponses.syncJob], page },
      { data: [contractResponses.rawImportStatus], page },
      { data: [contractResponses.importBatch], page },
      { data: [contractResponses.checkpoint], page }
    ]);
    const client = new HandrailQuickBooksClient({
      apiKey: contractApiKey,
      baseUrl: contractBaseUrl,
      fetch,
      tenantId: contractTenantId
    });

    const responses = [
      await client.accounts.list({ cursor: "cursor_in_accounts", limit: 7 }),
      await client.parties.list({ cursor: "cursor_in_parties", limit: 7 }),
      await client.transactions.list({ cursor: "cursor_in_transactions", limit: 7 }),
      await client.transactionLines.list({ cursor: "cursor_in_transaction_lines", limit: 7 }),
      await client.ledgerEntries.list({ cursor: "cursor_in_ledger", limit: 7 }),
      await client.syncJobs.list({ cursor: "cursor_in_sync_jobs", limit: 7 }),
      await client.rawImports.list({ cursor: "cursor_in_raw_imports", limit: 7 }),
      await client.importBatches.list({ cursor: "cursor_in_import_batches", limit: 7 }),
      await client.checkpoints.list({ cursor: "cursor_in_checkpoints", limit: 7 })
    ];

    expect(responses.map((response) => response.page)).toEqual([
      page,
      page,
      page,
      page,
      page,
      page,
      page,
      page,
      page
    ]);
    expect(requests.map((request) => new URL(requestUrl(request)).searchParams.get("limit"))).toEqual([
      "7",
      "7",
      "7",
      "7",
      "7",
      "7",
      "7",
      "7",
      "7"
    ]);
    expect(requests.map((request) => new URL(requestUrl(request)).searchParams.get("cursor"))).toEqual([
      "cursor_in_accounts",
      "cursor_in_parties",
      "cursor_in_transactions",
      "cursor_in_transaction_lines",
      "cursor_in_ledger",
      "cursor_in_sync_jobs",
      "cursor_in_raw_imports",
      "cursor_in_import_batches",
      "cursor_in_checkpoints"
    ]);
  });

  it("exposes optional item, class, and Department-backed location resources", async () => {
    const { fetch, requests } = mockFetch([
      contractResponses.items,
      contractResponses.classes,
      contractResponses.locations
    ]);
    const client = new HandrailQuickBooksClient({
      apiKey: contractApiKey,
      baseUrl: contractBaseUrl,
      fetch,
      tenantId: contractTenantId
    });

    const items = await client.items.list({
      active: true,
      itemType: "Service",
      limit: 25
    });
    const classes = await client.classes.list({
      active: true,
      limit: 25
    });
    const locations = await client.locations.list({
      active: true,
      limit: 25
    });

    expect(items).toEqual(contractResponses.items);
    expect(items.data[0]).toMatchObject({
      sourceObject: "Item",
      sourceObjectId: "700",
      itemType: "Service",
      incomeAccountRef: {
        value: "400"
      }
    });
    expect(classes).toEqual(contractResponses.classes);
    expect(classes.data[0]).toMatchObject({
      sourceObject: "Class",
      sourceObjectId: "810",
      status: "active"
    });
    expect(locations).toEqual(contractResponses.locations);
    expect(locations.data[0]).toMatchObject({
      sourceObject: "Department",
      locationSource: "department",
      locationObjectStatus: "mapped_to_department",
      unsupportedProviderObject: "Location"
    });

    expect(requestUrl(requests[0])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/accounting/items?active=true&itemType=Service&limit=25`
    );
    expect(requestUrl(requests[1])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/accounting/classes?active=true&limit=25`
    );
    expect(requestUrl(requests[2])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/accounting/locations?active=true&limit=25`
    );
    expect(JSON.stringify([items, classes, locations])).not.toMatch(unsafeProviderPayloadPattern);
  });

  it("gets transaction lines by id", async () => {
    const transactionLine = accountingFixtures.transactionLines[0];
    const { fetch, requests } = mockFetch([transactionLine]);
    const client = new HandrailQuickBooksClient({
      apiKey: contractApiKey,
      baseUrl: contractBaseUrl,
      fetch,
      tenantId: contractTenantId
    });

    await expect(client.transactionLines.get(transactionLine.id)).resolves.toEqual(transactionLine);
    expect(requestUrl(requests[0])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/accounting/transaction-lines/${transactionLine.id}`
    );
    expect(requests[0].init?.method).toBe("GET");
  });

  it("pins example response contracts and excludes provider payload leakage", () => {
    const contractsDir = new URL("../examples/contracts/", import.meta.url);
    const contractFiles = readdirSync(contractsDir)
      .filter((fileName) => fileName.endsWith(".response.json"))
      .sort();

    expect(contractFiles).toEqual([
      "account-map-or-create.response.json",
      "accounts.response.json",
      "cdc-sync-start.response.json",
      "checkpoints.response.json",
      "classes.response.json",
      "connect-url.response.json",
      "connection-status.response.json",
      "full-sync.response.json",
      "health.response.json",
      "import-batch.response.json",
      "incremental-sync.response.json",
      "items.response.json",
      "journal-entry-sync.response.json",
      "ledger-search.response.json",
      "locations.response.json",
      "parties.response.json",
      "raw-import-status.response.json",
      "token-status.response.json",
      "transaction-lines.response.json",
      "transactions.response.json"
    ]);

    const examples = Object.fromEntries(
      contractFiles.map((fileName) => [
        fileName,
        JSON.parse(readFileSync(new URL(fileName, contractsDir), "utf8")) as unknown
      ])
    );
    expect(JSON.stringify(examples)).not.toMatch(unsafeProviderPayloadPattern);
    expect(examples["health.response.json"]).toEqual(contractResponses.health);
    expect(examples["account-map-or-create.response.json"]).toMatchObject({
      idempotencyStatus: "created",
      mappingStatus: "created",
      provider: "quickbooks",
      providerAccountId: "41",
      providerEnvironment: "sandbox",
      sourceRef: {
        sourceEntityId: "cash",
        sourceEntityType: "ledger_account",
        sourceSystem: "hitcents_erp"
      },
      tenantId: "future-erp-dev-sandbox-tenant"
    });
    expect(examples["journal-entry-sync.response.json"]).toMatchObject({
      accountMappings: [
        {
          lineId: "debit-cash",
          mappingStatus: "mapped",
          providerAccountId: "41"
        },
        {
          lineId: "credit-revenue",
          mappingStatus: "mapped",
          providerAccountId: "79"
        }
      ],
      idempotencyStatus: "created",
      provider: "quickbooks",
      providerEnvironment: "sandbox",
      providerJournalEntryId: "900",
      sourceRef: {
        sourceEntityId: "journal-1001",
        sourceEntityType: "journal_entry",
        sourceSystem: "hitcents_erp"
      },
      syncStatus: "created",
      tenantId: "future-erp-dev-sandbox-tenant"
    });
    expect(examples["accounts.response.json"]).toMatchObject({
      data: [
        {
          accountType: "Bank",
          id: "accounting_account_100",
          provider: "intuit",
          source: "quickbooks_accounting_api",
          sourceObject: "Account",
          tenantId: contractTenantId
        }
      ],
      page: {
        cursor: "cursor_accounts_next",
        hasMore: false,
        limit: 25
      }
    });
    expect(examples["items.response.json"]).toMatchObject({
      data: [
        {
          id: "accounting_item_700",
          provider: "intuit",
          source: "quickbooks_accounting_api",
          sourceObject: "Item",
          tenantId: contractTenantId
        }
      ]
    });
    expect(examples["classes.response.json"]).toMatchObject({
      data: [
        {
          id: "accounting_class_810",
          provider: "intuit",
          source: "quickbooks_accounting_api",
          sourceObject: "Class",
          tenantId: contractTenantId
        }
      ]
    });
    expect(examples["locations.response.json"]).toMatchObject({
      data: [
        {
          id: "accounting_location_department_910",
          locationObjectStatus: "mapped_to_department",
          sourceObject: "Department",
          tenantId: contractTenantId,
          unsupportedProviderObject: "Location"
        }
      ]
    });
    expect(examples["raw-import-status.response.json"]).toMatchObject({
      checkpoint: {
        checkpointKind: "provider_updated_at_watermark",
        syncMode: "full"
      },
      importVolume: {
        objectCount: 8,
        totalObjectCount: 8
      },
      syncMode: "full",
      syncPhase: "initial_load"
    });
    expect(examples["cdc-sync-start.response.json"]).toMatchObject({
      checkpoint: {
        checkpointKind: "provider_updated_at_watermark",
        syncMode: "incremental"
      },
      importVolume: {
        objectCount: 3,
        totalObjectCount: 3
      },
      syncMode: "incremental",
      syncPhase: "delta_sync"
    });
    expect(examples["full-sync.response.json"]).toMatchObject({
      contractId: "handrail.quickbooks.normalized-sync-envelope.v1",
      syncMode: "full",
      syncPhase: "initial_load",
      normalizedResourceCounts: {
        accounts: 3,
        classes: 1,
        items: 1,
        ledger_entries: 4,
        locations: 1,
        parties: 2,
        transactions: 3,
        transaction_lines: 2
      },
      normalizedResources: {
        accounts: [
          expect.objectContaining({
            id: "accounting_account_100",
            sourceObject: "Account"
          })
        ],
        classes: [
          expect.objectContaining({
            id: "accounting_class_810",
            sourceObject: "Class"
          })
        ],
        items: [
          expect.objectContaining({
            id: "accounting_item_700",
            sourceObject: "Item"
          })
        ],
        ledger_entries: [
          expect.objectContaining({
            sourceObject: "Payment",
            transactionId: "700"
          })
        ],
        locations: [
          expect.objectContaining({
            id: "accounting_location_department_910",
            sourceObject: "Department"
          })
        ],
        parties: [
          expect.objectContaining({
            id: "accounting_party_customer_300",
            sourceObject: "Customer"
          })
        ],
        transactions: [
          expect.objectContaining({
            sourceObject: "Payment",
            transactionType: "payment"
          })
        ],
        transaction_lines: [
          expect.objectContaining({
            sourceObject: "Payment",
            transactionId: "700"
          })
        ]
      },
      normalizedCompleteness: {
        accounts: expect.objectContaining({
          complete: true,
          importBatchId: contractImportBatchId,
          normalizedRecordCount: 3,
          resourceFamily: "accounts",
          sourceObjectCount: 3,
          status: "complete",
          syncMode: "full",
          syncPhase: "initial_load"
        }),
        ledger_entries: expect.objectContaining({
          complete: true,
          importBatchId: contractImportBatchId,
          normalizedRecordCount: 4,
          resourceFamily: "ledger_entries",
          status: "complete",
          syncMode: "full",
          syncPhase: "initial_load"
        }),
        transactions: expect.objectContaining({
          complete: false,
          importBatchId: contractImportBatchId,
          reason: "provider_paging_Bill_incomplete",
          resourceFamily: "transactions",
          status: "incomplete"
        }),
        transaction_lines: expect.objectContaining({
          complete: false,
          importBatchId: contractImportBatchId,
          reason: "missing_object_count_Purchase",
          resourceFamily: "transaction_lines",
          status: "unknown"
        })
      },
      checkpoint: {
        syncMode: "full"
      }
    });
    expect(examples["incremental-sync.response.json"]).toMatchObject({
      contractId: "handrail.quickbooks.normalized-sync-envelope.v1",
      syncMode: "incremental",
      syncPhase: "delta_sync",
      deltaCounts: {
        changedCount: 1,
        failedCount: 0,
        insertedCount: 3,
        skippedCount: 2
      },
      normalizedResources: {
        accounts: [
          expect.objectContaining({
            id: "accounting_account_400",
            sourceObject: "Account"
          })
        ],
        ledger_entries: [
          expect.objectContaining({
            sourceObject: "Payment",
            transactionId: "700"
          })
        ]
      },
      checkpoint: {
        syncMode: "incremental"
      }
    });
  });

  it("builds connect URL requests", async () => {
    const { fetch, requests } = mockFetch([
      {
        connectUrl: "https://quickbooks.example.test/connect/abc",
        tenantId: "tenant_123"
      }
    ]);
    const client = new HandrailQuickBooksClient({
      apiKey: "test-api-key",
      baseUrl: "https://quickbooks.example.test",
      fetch,
      providerMode: "sandbox",
      tenantId: "tenant_123"
    });

    await client.connections.connectUrl({
      returnUrl: "https://erp.example.test/settings/accounting"
    });

    expect(requestUrl(requests[0])).toBe(
      "https://quickbooks.example.test/v1/tenants/tenant_123/quickbooks/connections/connect-url"
    );
    expect(requests[0].init?.method).toBe("POST");
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      returnUrl: "https://erp.example.test/settings/accounting"
    });
    expect(requestUrl(requests[0])).not.toContain("providerMode=");
  });

  it("returns normalized full and incremental sync envelopes through the client contract", async () => {
    const primaryOnlyFullSyncJob = {
      ...contractResponses.fullSyncJob,
      importVolume: {
        ...contractResponses.fullSyncJob.importVolume,
        objectCount: 3,
        objectCounts: { Account: 3 },
        entityCounts: { accounts: 3 },
        totalObjectCount: 3
      }
    };
    const { fetch, requests } = mockFetch([
      primaryOnlyFullSyncJob,
      contractResponses.syncJob
    ]);
    const client = new HandrailQuickBooksClient({
      apiKey: contractApiKey,
      baseUrl: contractBaseUrl,
      fetch,
      tenantId: contractTenantId
    });

    const fullEnvelope: NormalizedQuickBooksFullSyncResponseEnvelope = await client.fullSync(
      {
        entities: [
          "accounts",
          "items",
          "classes",
          "locations",
          "parties",
          "transactions",
          "ledger_entries"
        ],
        effectiveThrough: "2026-05-31",
        importBatchId: contractImportBatchId
      },
      {
        idempotencyKey: "full-sync-contract-idempotency-key"
      }
    );
    const incrementalEnvelope: NormalizedQuickBooksIncrementalSyncResponseEnvelope =
      await client.incrementalSync(
        {
          entities: ["accounts"],
          effectiveThrough: "2026-05-31",
          since: "2026-05-01T00:00:00.000Z"
        },
        {
          idempotencyKey: "incremental-sync-contract-idempotency-key"
        }
      );

    expect(fullEnvelope).toMatchObject({
      contractId: "handrail.quickbooks.normalized-sync-envelope.v1",
      syncMode: "full",
      syncPhase: "initial_load",
      tenantId: contractTenantId,
      jobId: contractJobId,
      importBatchId: contractImportBatchId,
      deltaCounts: {
        changedCount: 0,
        failedCount: 0,
        insertedCount: 8,
        skippedCount: 0
      },
      normalizedResourceCounts: {
        accounts: 3,
        classes: 1,
        items: 1,
        ledger_entries: 4,
        locations: 1,
        parties: 2,
        transactions: 3,
        transaction_lines: 2
      },
      normalizedResources: {
        accounts: expect.arrayContaining([
          expect.objectContaining({
            id: "accounting_account_100",
            sourceObject: "Account"
          })
        ]),
        classes: expect.arrayContaining([
          expect.objectContaining({
            id: "accounting_class_810",
            sourceObject: "Class"
          })
        ]),
        items: expect.arrayContaining([
          expect.objectContaining({
            id: "accounting_item_700",
            sourceObject: "Item"
          })
        ]),
        ledger_entries: expect.arrayContaining([
          expect.objectContaining({
            sourceObject: "Payment",
            transactionId: "700"
          })
        ]),
        locations: expect.arrayContaining([
          expect.objectContaining({
            id: "accounting_location_department_910",
            sourceObject: "Department"
          })
        ]),
        parties: expect.arrayContaining([
          expect.objectContaining({
            id: "accounting_party_customer_300",
            sourceObject: "Customer"
          })
        ]),
        transactions: expect.arrayContaining([
          expect.objectContaining({
            sourceObject: "Payment",
            transactionType: "payment"
          })
        ]),
        transaction_lines: expect.arrayContaining([
          expect.objectContaining({
            sourceObject: "Payment",
            transactionId: "700"
          })
        ])
      }
    });
    expect(Object.keys(fullEnvelope.normalizedResources ?? {}).sort()).toEqual([
      "accounts",
      "classes",
      "items",
      "ledger_entries",
      "locations",
      "parties",
      "transaction_lines",
      "transactions"
    ]);
    expect(fullEnvelope.syncJob).toEqual(primaryOnlyFullSyncJob);
    expect(fullEnvelope.importBatch).toEqual(contractResponses.importBatch);
    expect(fullEnvelope.importVolume).toEqual({
      objectCount: contractResponses.importBatch.totalObjectCount,
      objectCounts: contractResponses.importBatch.objectCounts,
      entityCounts: contractResponses.importBatch.entityCounts,
      totalObjectCount: contractResponses.importBatch.totalObjectCount,
      errorCount: contractResponses.importBatch.errorCount,
      warningCount: contractResponses.importBatch.warningCount
    });
    expect(fullEnvelope.checkpoint?.syncMode).toBe("full");
    expect(fullEnvelope.normalizedCompleteness).toMatchObject({
      accounts: {
        complete: true,
        importBatchId: contractImportBatchId,
        normalizedRecordCount: 3,
        providerPagingEvidenceRefs: expect.arrayContaining([
          "provider://quickbooks/batch_contract_2026_05/Account/pages/1"
        ]),
        resourceFamily: "accounts",
        sourceObjectCount: 3,
        status: "complete",
        syncMode: "full",
        syncPhase: "initial_load"
      },
      ledger_entries: {
        complete: true,
        importBatchId: contractImportBatchId,
        normalizedRecordCount: 4,
        resourceFamily: "ledger_entries",
        status: "complete",
        syncMode: "full",
        syncPhase: "initial_load"
      },
      transaction_lines: {
        complete: false,
        evidence: {
          missingObjectTypes: ["Purchase"],
          providerPagingEvidence: expect.arrayContaining([
            expect.objectContaining({
              objectType: "Payment",
              provider: "intuit",
              sourceOperation: "query",
              status: "completed"
            })
          ])
        },
        importBatchId: contractImportBatchId,
        normalizedRecordCount: 0,
        reason: "missing_object_count_Purchase",
        resourceFamily: "transaction_lines",
        status: "unknown",
        syncMode: "full",
        syncPhase: "initial_load"
      },
      transactions: {
        complete: false,
        evidence: {
          incompleteObjectTypes: ["Bill"]
        },
        importBatchId: contractImportBatchId,
        normalizedRecordCount: 3,
        reason: "provider_paging_Bill_incomplete",
        resourceFamily: "transactions",
        status: "incomplete",
        syncMode: "full",
        syncPhase: "initial_load"
      }
    });
    expect(fullEnvelope.normalizedCompleteness?.accounts?.evidence).toMatchObject({
      batchStatus: "succeeded",
      objectCounts: {
        Account: 3
      },
      providerPagingEvidence: expect.arrayContaining([
        expect.objectContaining({
          completed: true,
          fetchedObjectCount: 3,
          objectType: "Account",
          provider: "intuit",
          providerRequestRef: "provider://quickbooks/batch_contract_2026_05/Account/pages/1",
          sourceOperation: "query",
          status: "completed"
        })
      ])
    });
    expect(fullEnvelope.normalizedCompleteness?.transactions?.providerPagingEvidenceRefs).toEqual(
      expect.arrayContaining([
        "provider://quickbooks/batch_contract_2026_05/Bill/pages/1",
        "provider://quickbooks/batch_contract_2026_05/Payment/pages/1"
      ])
    );
    expect(fullEnvelope.normalizedCompleteness?.transaction_lines?.auditRefs).toContain(
      `raw://${contractImportBatchId}/sync-jobs/${contractJobId}`
    );
    expect(fullEnvelope.syncJob.normalizedCompleteness).toBe(fullEnvelope.normalizedCompleteness);
    expect(fullEnvelope.importBatch?.normalizedCompleteness).toEqual(fullEnvelope.normalizedCompleteness);
    expect(fullEnvelope.checkpoint?.normalizedCompleteness).toEqual(fullEnvelope.normalizedCompleteness);
    for (const [family, resources] of Object.entries(fullEnvelope.normalizedResources ?? {})) {
      expect(fullEnvelope.normalizedResourceCounts[family as keyof typeof fullEnvelope.normalizedResourceCounts]).toBe(
        resources.length
      );
    }

    expect(incrementalEnvelope).toMatchObject({
      contractId: "handrail.quickbooks.normalized-sync-envelope.v1",
      syncMode: "incremental",
      syncPhase: "delta_sync",
      tenantId: contractTenantId,
      jobId: contractJobId,
      importBatchId: contractImportBatchId,
      deltaCounts: {
        changedCount: 1,
        failedCount: 0,
        insertedCount: 3,
        skippedCount: 2
      },
      normalizedResourceCounts: {
        accounts: 3,
        ledger_entries: 4,
        parties: 2,
        transactions: 3
      },
      normalizedResources: {
        accounts: expect.arrayContaining([
          expect.objectContaining({
            id: "accounting_account_400",
            sourceObject: "Account"
          })
        ]),
        ledger_entries: expect.arrayContaining([
          expect.objectContaining({
            transactionId: "700",
            sourceObject: "Payment"
          })
        ])
      }
    });
    for (const [family, resources] of Object.entries(incrementalEnvelope.normalizedResources ?? {})) {
      expect(
        incrementalEnvelope.normalizedResourceCounts[
          family as keyof typeof incrementalEnvelope.normalizedResourceCounts
        ]
      ).toBe(resources.length);
    }
    expect(incrementalEnvelope.syncJob).toEqual(contractResponses.syncJob);
    expect(incrementalEnvelope.importBatch).toEqual(contractResponses.importBatch);
    expect(incrementalEnvelope.checkpoint?.syncMode).toBe("incremental");
    expect(incrementalEnvelope.normalizedCompleteness).toEqual(
      contractResponses.syncJob.normalizedCompleteness
    );
    expect(incrementalEnvelope.normalizedCompleteness?.accounts?.evidence).toMatchObject({
      batchStatus: "succeeded",
      objectCounts: {
        Account: 3
      },
      providerPagingEvidence: expect.arrayContaining([
        expect.objectContaining({
          providerRequestRef: "provider://quickbooks/batch_contract_2026_05/Account/pages/1"
        })
      ])
    });
    expect(incrementalEnvelope.normalizedCompleteness?.ledger_entries?.auditRefs).toContain(
      `raw://${contractImportBatchId}/sync-jobs/${contractJobId}`
    );
    const incrementalCompletenessStatuses: readonly HandrailQuickBooksNormalizedCompletenessStatus[] =
      [
        incrementalEnvelope.normalizedCompleteness?.accounts?.status ?? "unknown",
        incrementalEnvelope.normalizedCompleteness?.transactions?.status ?? "unknown",
        incrementalEnvelope.normalizedCompleteness?.transaction_lines?.status ?? "unknown",
        incrementalEnvelope.normalizedCompleteness?.ledger_entries?.status ?? "unknown"
      ];
    expect(incrementalCompletenessStatuses).toEqual([
      "complete",
      "incomplete",
      "unknown",
      "complete"
    ]);
    expect(JSON.stringify([fullEnvelope, incrementalEnvelope])).not.toMatch(unsafeProviderPayloadPattern);

    expect(requests).toHaveLength(2);
    expect(requestUrl(requests[0])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/sync-jobs`
    );
    expect(new Headers(requests[0].init?.headers).get("idempotency-key")).toBe(
      "full-sync-contract-idempotency-key"
    );
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      entities: [
        "accounts",
        "items",
        "classes",
        "locations",
        "parties",
        "transactions",
        "ledger_entries"
      ],
      effectiveThrough: "2026-05-31",
      importBatchId: contractImportBatchId,
      mode: "full"
    });
    expect(requestUrl(requests[1])).toBe(
      `${contractBaseUrl}/v1/tenants/${contractTenantId}/quickbooks/sync-jobs`
    );
    expect(new Headers(requests[1].init?.headers).get("idempotency-key")).toBe(
      "incremental-sync-contract-idempotency-key"
    );
    expect(JSON.parse(String(requests[1].init?.body))).toEqual({
      entities: ["accounts"],
      effectiveThrough: "2026-05-31",
      mode: "incremental",
      since: "2026-05-01T00:00:00.000Z"
    });
  });

  it("builds token status diagnostics requests", async () => {
    const { fetch, requests } = mockFetch([
      {
        status: "healthy",
        tenantId: "tenant_123"
      }
    ]);
    const client = new HandrailQuickBooksClient({
      apiKey: "test-api-key",
      baseUrl: "https://quickbooks.example.test",
      fetch,
      tenantId: "tenant_123"
    });

    await client.connections.tokenStatus();

    expect(requestUrl(requests[0])).toBe(
      "https://quickbooks.example.test/v1/tenants/tenant_123/quickbooks/connections/token-status"
    );
    expect(requests[0].init?.method).toBe("GET");
  });

  it("builds sync and ledger search requests", async () => {
    const { fetch, requests } = mockFetch([
      {
        jobId: "sync_123",
        status: "queued"
      },
      {
        data: [],
        page: {
          hasMore: false
        }
      }
    ]);
    const client = new HandrailQuickBooksClient({
      apiKey: "test-api-key",
      baseUrl: "https://quickbooks.example.test",
      fetch,
      tenantId: "tenant_123"
    });

    await client.syncJobs.start(
      {
        entities: ["accounts", "ledger_entries"],
        mode: "incremental"
      },
      {
        idempotencyKey: "sync-request-123"
      }
    );
    await client.ledgerEntries.search({
      accountId: "acct_100",
      from: "2026-05-01",
      to: "2026-05-31"
    });

    expect(requestUrl(requests[0])).toBe(
      "https://quickbooks.example.test/v1/tenants/tenant_123/quickbooks/sync-jobs"
    );
    expect(new Headers(requests[0].init?.headers).get("idempotency-key")).toBe("sync-request-123");
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      entities: ["accounts", "ledger_entries"],
      mode: "incremental"
    });

    expect(requestUrl(requests[1])).toBe(
      "https://quickbooks.example.test/v1/tenants/tenant_123/accounting/ledger-entries/search"
    );
    expect(JSON.parse(String(requests[1].init?.body))).toEqual({
      accountId: "acct_100",
      from: "2026-05-01",
      to: "2026-05-31"
    });
  });

  it("supports API-key auth header configuration", async () => {
    const { fetch, requests } = mockFetch([
      {
        data: [],
        page: {
          hasMore: false
        }
      },
      {
        data: [],
        page: {
          hasMore: false
        }
      },
      {
        data: [],
        page: {
          hasMore: false
        }
      }
    ]);
    const client = new HandrailQuickBooksClient({
      auth: {
        headerName: "x-handrail-api-key",
        scheme: "api-key",
        token: "test-api-key"
      },
      baseUrl: "https://quickbooks.example.test",
      fetch,
      tenantId: "tenant_123"
    });

    await client.accounts.list({
      isActive: true,
      limit: 50,
      type: "asset"
    });
    await client.parties.list({
      limit: 25,
      type: "customer"
    });
    await client.transactions.list({
      limit: 10,
      type: "invoice"
    });

    expect(requestUrl(requests[0])).toBe(
      "https://quickbooks.example.test/v1/tenants/tenant_123/accounting/accounts?isActive=true&limit=50&type=asset"
    );
    expect(requestUrl(requests[1])).toBe(
      "https://quickbooks.example.test/v1/tenants/tenant_123/accounting/parties?limit=25&type=customer"
    );
    expect(requestUrl(requests[2])).toBe(
      "https://quickbooks.example.test/v1/tenants/tenant_123/accounting/transactions?limit=10&type=invoice"
    );
    expect(new Headers(requests[0].init?.headers).get("x-handrail-api-key")).toBe("test-api-key");
  });

  it("throws structured service errors with sanitized details only", async () => {
    const { fetch } = mockFetch(
      [
        {
          code: "SERVICE_UNAVAILABLE",
          details: {
            authorization: "Bearer stored-access-token",
            clientSecret: "do-not-print",
            providerError: {
              Fault: {
                Error: [
                  {
                    Message: "raw provider payload"
                  }
                ]
              }
            },
            rawProviderPayload: {
              QueryResponse: {
                Account: [
                  {
                    Id: "100",
                    Name: "Provider shape must not cross the SDK boundary."
                  }
                ]
              }
            },
            retryAfterMs: 5000,
            tokenStatus: "redacted_by_service",
            upstream: "quickbooks-integration"
          },
          message: "Integration service is temporarily unavailable.",
          requestId: "req_123"
        }
      ],
      503
    );
    const client = new HandrailQuickBooksClient({
      apiKey: "test-api-key",
      baseUrl: "https://quickbooks.example.test",
      fetch,
      retries: 0,
      tenantId: "tenant_123"
    });

    let caughtError: unknown;
    try {
      await client.connections.status();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(HandrailQuickBooksError);
    const error = caughtError as HandrailQuickBooksError;
    expect(error).toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      details: {
        retryAfterMs: 5000,
        tokenStatus: "redacted_by_service",
        upstream: "quickbooks-integration"
      },
      requestId: "req_123",
      retryable: true,
      status: 503
    });
    const serializedError = JSON.stringify({
      code: error.code,
      details: error.details,
      message: error.message,
      requestId: error.requestId,
      retryable: error.retryable,
      status: error.status,
      url: error.url
    });
    expect(serializedError).toContain("quickbooks-integration");
    expect(serializedError).not.toMatch(unsafeProviderPayloadPattern);
  });

  it("uses service error as a code fallback for current integration error bodies", async () => {
    const { fetch } = mockFetch(
      [
        {
          ok: false,
          error: "quickbooks_reauthorization_required",
          tenantId: "tenant_123"
        }
      ],
      409
    );
    const client = new HandrailQuickBooksClient({
      apiKey: "test-api-key",
      baseUrl: "https://quickbooks.example.test",
      fetch,
      tenantId: "tenant_123"
    });

    let caughtError: unknown;
    try {
      await client.syncJobs.start();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(HandrailQuickBooksError);
    expect(caughtError).toMatchObject({
      code: "quickbooks_reauthorization_required",
      message: "quickbooks_reauthorization_required",
      retryable: false,
      status: 409
    });
  });

  it("requires tenantId for tenant-scoped calls", () => {
    const client = new HandrailQuickBooksClient({
      apiKey: "test-api-key",
      baseUrl: "https://quickbooks.example.test",
      fetch: mockFetch([]).fetch
    });

    expect(() => client.connections.status()).toThrow(HandrailQuickBooksConfigError);
  });

  it("retries idempotent reads", async () => {
    const { fetch, requests } = mockFetch(
      [
        {
          code: "TEMPORARY_FAILURE",
          message: "Try again."
        },
        {
          status: "connected",
          tenantId: "tenant_123"
        }
      ],
      [503, 200]
    );
    const client = new HandrailQuickBooksClient({
      apiKey: "test-api-key",
      baseUrl: "https://quickbooks.example.test",
      fetch,
      retries: 1,
      tenantId: "tenant_123"
    });

    await expect(client.connections.status()).resolves.toEqual({
      status: "connected",
      tenantId: "tenant_123"
    });
    expect(requests).toHaveLength(2);
  });
});

function mockFetch(
  bodies: readonly unknown[],
  statuses: number | readonly number[] = 200
): { fetch: HandrailQuickBooksFetch; requests: CapturedRequest[] } {
  const requests: CapturedRequest[] = [];
  let index = 0;
  const fetch: HandrailQuickBooksFetch = async (input, init) => {
    requests.push({
      init,
      input
    });

    const status = Array.isArray(statuses) ? statuses[index] ?? 200 : statuses;
    const body = bodies[index];
    index += 1;

    return Response.json(body, {
      status
    });
  };

  return {
    fetch,
    requests
  };
}

function requestUrl(request: CapturedRequest) {
  if (request.input instanceof Request) {
    return request.input.url;
  }

  return request.input.toString();
}
