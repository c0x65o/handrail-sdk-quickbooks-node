import { describe, expect, it, vi } from "vitest";

import { runCli } from "../src/cli.js";
import {
  HANDRAIL_QUICKBOOKS_STAGING_BASE_URL,
  HandrailQuickBooksError
} from "../src/index.js";
import type { CliGlobalConfig, CliQuickBooksClient } from "../src/cli/types.js";
import {
  contractCheckpointId,
  contractImportBatchId,
  contractJobId,
  contractResponses,
  contractTenantId
} from "./fixtures/accounting.js";

describe("handrail-qbo CLI", () => {
  it("prints help without requiring tenant or API key config", async () => {
    const stdout = new StringWriter();
    const stderr = new StringWriter();

    const exitCode = await runCli(["--help"], {
      env: {},
      stderr,
      stdout
    });

    expect(exitCode).toBe(0);
    expect(stdout.value).toContain("handrail-qbo <command> [flags]");
    expect(stdout.value).toContain("connect-url");
    expect(stdout.value).toContain("smoke");
    expect(stdout.value).toContain("token-status");
    expect(stdout.value).not.toContain("report trial-balance");
    expect(stdout.value).not.toContain("reconcile");
    expect(stdout.value).toContain("HANDRAIL_QBO_PROVIDER_MODE");
    expect(stderr.value).toBe("");
  });

  it("reports missing required config without echoing secret values", async () => {
    const stdout = new StringWriter();
    const stderr = new StringWriter();

    const exitCode = await runCli(["status"], {
      env: {
        HANDRAIL_QBO_API_KEY: ""
      },
      stderr,
      stdout
    });

    expect(exitCode).toBe(2);
    expect(stderr.value).toContain("Missing required configuration");
    expect(stderr.value).toContain("tenantId");
    expect(stderr.value).toContain("apiKey");
    expect(stderr.value).not.toContain("HANDRAIL_QBO_API_KEY=");
  });

  it("calls the SDK client for connect-url using flag and env config", async () => {
    const stdout = new StringWriter();
    const stderr = new StringWriter();
    const client = createMockClient();
    let capturedConfig: CliGlobalConfig | undefined;

    const exitCode = await runCli(
      [
        "--tenant-id",
        "tenant_123",
        "connect-url",
        "--return-url",
        "https://erp.example.test/settings/accounting?tab=qbo",
        "--state",
        "state_123"
      ],
      {
        createClient: (config) => {
          capturedConfig = config;
          return client;
        },
        env: {
          HANDRAIL_QBO_API_KEY: "test-secret",
          HANDRAIL_QBO_BASE_URL: "https://quickbooks.example.test",
          HANDRAIL_QBO_PROVIDER_MODE: " production "
        },
        stderr,
        stdout
      }
    );

    expect(exitCode).toBe(0);
    expect(capturedConfig).toMatchObject({
      apiKey: "test-secret",
      baseUrlOverride: {
        envName: "HANDRAIL_QBO_BASE_URL",
        flagName: "--base-url",
        present: true,
        scope: "local_operator_override_only"
      },
      baseUrl: "https://quickbooks.example.test",
      providerMode: "production",
      tenantId: "tenant_123"
    });
    expect(client.connections.connectUrl).toHaveBeenCalledWith({
      returnUrl: "https://erp.example.test/settings/accounting?tab=qbo",
      state: "state_123"
    });
    expect(JSON.parse(stdout.value)).toEqual(contractResponses.connectUrl);
    expect(stderr.value).toBe("");
  });

  it("resolves HANDRAIL_QBO_SERVICE_ENV into CLI base URL config", async () => {
    const stdout = new StringWriter();
    const stderr = new StringWriter();
    const client = createMockClient();
    let capturedConfig: CliGlobalConfig | undefined;

    const exitCode = await runCli(["status"], {
      createClient: (config) => {
        capturedConfig = config;
        return client;
      },
      env: {
        HANDRAIL_QBO_API_KEY: "test-secret",
        HANDRAIL_QBO_SERVICE_ENV: " staging ",
        HANDRAIL_QBO_TENANT_ID: "tenant_123"
      },
      stderr,
      stdout
    });

    expect(exitCode).toBe(0);
    expect(capturedConfig?.baseUrl).toBe(HANDRAIL_QUICKBOOKS_STAGING_BASE_URL);
    expect(capturedConfig?.serviceEnv).toBe("staging");
    expect(stderr.value).toBe("");
  });

  it("accepts provider mode from a flag before env config without printing secrets", async () => {
    const stdout = new StringWriter();
    const stderr = new StringWriter();
    const client = createMockClient();
    let capturedConfig: CliGlobalConfig | undefined;

    const exitCode = await runCli(["--provider-mode", "production", "status"], {
      createClient: (config) => {
        capturedConfig = config;
        return client;
      },
      env: {
        HANDRAIL_QBO_API_KEY: "test-secret",
        HANDRAIL_QBO_PROVIDER_MODE: "sandbox",
        HANDRAIL_QBO_TENANT_ID: "tenant_123"
      },
      stderr,
      stdout
    });

    expect(exitCode).toBe(0);
    expect(capturedConfig?.providerMode).toBe("production");
    expect(stdout.value).not.toContain("test-secret");
    expect(stderr.value).toBe("");
  });

  it("rejects invalid provider mode config without echoing API keys", async () => {
    const stdout = new StringWriter();
    const stderr = new StringWriter();

    const exitCode = await runCli(["status"], {
      env: {
        HANDRAIL_QBO_API_KEY: "test-secret",
        HANDRAIL_QBO_PROVIDER_MODE: "dev",
        HANDRAIL_QBO_TENANT_ID: "tenant_123"
      },
      stderr,
      stdout
    });

    expect(exitCode).toBe(2);
    expect(stderr.value).toContain("HANDRAIL_QBO_PROVIDER_MODE must be one of: sandbox, production");
    expect(stderr.value).not.toContain("test-secret");
    expect(stdout.value).toBe("");
  });

  it("prints status with copyable redacted Future ERP config from env tenant map", async () => {
    const client = createMockClient();
    const stdout = new StringWriter();
    const stderr = new StringWriter();
    const tenantMapJson = futureErpTenantMapJson();

    const exitCode = await runCli(["status"], {
      createClient: () => client,
      env: {
        HANDRAIL_QBO_API_KEY: "real-status-api-key",
        HANDRAIL_QBO_BASE_URL: "https://local-operator-quickbooks.example.test",
        HANDRAIL_QBO_PROVIDER_MODE: "sandbox",
        HANDRAIL_QBO_SERVICE_ENV: "staging",
        HANDRAIL_QBO_TENANT_ID: contractTenantId,
        HANDRAIL_QBO_TENANT_MAP_JSON: tenantMapJson
      },
      stderr,
      stdout
    });

    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout.value);
    expect(output).toMatchObject({
      providerEnvironment: "sandbox",
      providerMode: "sandbox",
      status: "connected",
      futureErpConfig: {
        artifact: "future-erp.quickbooks-runtime-config.redacted.v1",
        copyableEnv: {
          HANDRAIL_QBO_API_KEY: "REDACTED_QBO_SERVICE_API_KEY",
          HANDRAIL_QBO_PROVIDER_MODE: "sandbox",
          HANDRAIL_QBO_SERVICE_ENV: "staging"
        },
        tenantMap: {
          envName: "HANDRAIL_QBO_TENANT_MAP_JSON",
          redacted: true,
          source: "env",
          value: {
            contractId: "future-erp.quickbooks-tenant-mapping.v1",
            providerMode: "sandbox",
            serviceEnv: "staging",
            tenantMappings: [
              {
                displayName: "REDACTED_DISPLAY_NAME_1",
                futureErpAccountId: "REDACTED_FUTURE_ERP_ACCOUNT_ID_1",
                futureErpCompanyId: "REDACTED_FUTURE_ERP_COMPANY_ID_1",
                serviceTenantId: contractTenantId,
                status: "active"
              }
            ]
          }
        }
      },
      localOverrideDiagnostics: {
        quickBooksBaseUrl: {
          envName: "HANDRAIL_QBO_BASE_URL",
          flagName: "--base-url",
          futureErpConfig: "excluded",
          present: true,
          scope: "local_operator_override_only"
        }
      }
    });
    expect(JSON.parse(output.futureErpConfig.copyableEnv.HANDRAIL_QBO_TENANT_MAP_JSON)).toEqual(
      output.futureErpConfig.tenantMap.value
    );
    expect(output.futureErpConfig.copyableEnv).not.toHaveProperty("HANDRAIL_QBO_BASE_URL");
    expect(JSON.stringify(output.futureErpConfig)).not.toContain("HANDRAIL_QBO_BASE_URL");
    expect(stdout.value).not.toContain(tenantMapJson);
    expect(stdout.value).not.toContain("real-status-api-key");
    expect(stdout.value).not.toContain("acct_sensitive_alpha");
    expect(stdout.value).not.toContain("company_sensitive_alpha");
    expect(stdout.value).not.toContain("Sensitive Alpha LLC");
    expect(stdout.value).not.toContain("Sensitive owner handoff notes");
    expect(stdout.value).not.toMatch(
      /"access_token"|"refresh_token"|"client_secret"|"clientId"|"clientSecret"|"Authorization"|"rawPayload"/
    );
    expect(stderr.value).toBe("");
  });

  it("prints fixture-backed status and account pull results", async () => {
    const client = createMockClient();
    const statusStdout = new StringWriter();
    const accountsStdout = new StringWriter();

    await expect(runCli(["status"], {
      createClient: () => client,
      env: requiredEnv(),
      stdout: statusStdout
    })).resolves.toBe(0);
    await expect(runCli(["pull-accounts", "--active", "--type", "asset", "--limit", "25"], {
      createClient: () => client,
      env: requiredEnv(),
      stdout: accountsStdout
    })).resolves.toBe(0);

    expect(client.connections.status).toHaveBeenCalledWith();
    expect(client.accounts.list).toHaveBeenCalledWith({
      isActive: true,
      limit: 25,
      type: "asset"
    });
    const statusOutput = JSON.parse(statusStdout.value);
    expect(statusOutput).toMatchObject(contractResponses.connectionStatus);
    expect(statusOutput.futureErpConfig).toBeDefined();
    expect(statusOutput.providerEnvironment).toBe("sandbox");
    expect(statusOutput.providerMode).toBe("sandbox");
    expect(statusOutput.providerProfile).toEqual({
      environment: "sandbox",
      name: "active",
      status: "configured"
    });
    expect(JSON.parse(accountsStdout.value)).toEqual(contractResponses.accounts);
    expect(statusStdout.value).not.toContain("test-secret");
    expect(statusStdout.value).not.toMatch(/access_token|refresh_token|client_secret|clientId|clientSecret/i);
    expect(accountsStdout.value).not.toMatch(
      /"access_token"|"refresh_token"|"client_secret"|"clientId"|"clientSecret"|"Authorization"|"rawPayload"/
    );
  });

  it("prints bounded token-status diagnostics without echoing API keys or token-shaped fields", async () => {
    const client = createMockClient();
    const stdout = new StringWriter();
    const stderr = new StringWriter();

    const exitCode = await runCli(["token-status"], {
      createClient: () => client,
      env: {
        HANDRAIL_QBO_API_KEY: "test-cli-api-key",
        HANDRAIL_QBO_TENANT_ID: contractTenantId
      },
      stderr,
      stdout
    });

    expect(exitCode).toBe(0);
    expect(client.connections.tokenStatus).toHaveBeenCalledWith();
    expect(JSON.parse(stdout.value)).toEqual(contractResponses.tokenStatus);
    expect(stdout.value).not.toContain("test-cli-api-key");
    expect(stdout.value).not.toMatch(
      /"access_token"|"refresh_token"|"client_secret"|"clientId"|"clientSecret"|"Authorization"/
    );
    expect(stdout.value).not.toMatch(/stored-access-token|stored-refresh-token|do-not-print/i);
    expect(stderr.value).toBe("");
  });

  it("prints bounded raw-import-status diagnostics without exposing credentials or raw provider payloads", async () => {
    const client = createMockClient();
    const stdout = new StringWriter();
    const stderr = new StringWriter();

    const exitCode = await runCli([
      "raw-import-status",
      "--import-batch-id",
      contractImportBatchId
    ], {
      createClient: () => client,
      env: {
        HANDRAIL_QBO_API_KEY: "test-cli-api-key",
        HANDRAIL_QBO_TENANT_ID: contractTenantId
      },
      stderr,
      stdout
    });

    expect(exitCode).toBe(0);
    expect(client.rawImports.status).toHaveBeenCalledWith(contractImportBatchId);
    expect(JSON.parse(stdout.value)).toEqual(contractResponses.rawImportStatus);
    expect(JSON.parse(stdout.value)).toMatchObject({
      checkpoint: {
        checkpointId: "quickbooks_full_initial_load_accounts_Account",
        syncMode: "full"
      },
      importVolume: {
        objectCount: 8,
        totalObjectCount: 8
      },
      syncMode: "full",
      syncPhase: "initial_load"
    });
    expect(stdout.value).not.toContain("test-cli-api-key");
    expect(stdout.value).not.toMatch(
      /"access_token"|"refresh_token"|"client_secret"|"clientId"|"clientSecret"|"Authorization"|"rawPayload"/
    );
    expect(stdout.value).not.toMatch(/stored-access-token|stored-refresh-token|do-not-print/i);
    expect(stderr.value).toBe("");
  });

  it("prints a redacted smoke summary with import, normalized, checkpoint, and synced object evidence", async () => {
    const client = createMockClient();
    const stdout = new StringWriter();
    const stderr = new StringWriter();

    const exitCode = await runCli([
      "smoke",
      "--import-batch-id",
      contractImportBatchId,
      "--sync-job-id",
      contractJobId,
      "--checkpoint-id",
      contractCheckpointId,
      "--limit",
      "7"
    ], {
      createClient: () => client,
      env: {
        HANDRAIL_QBO_API_KEY: "test-cli-api-key",
        HANDRAIL_QBO_PROVIDER_MODE: "sandbox",
        HANDRAIL_QBO_SERVICE_ENV: "staging",
        HANDRAIL_QBO_TENANT_ID: contractTenantId
      },
      stderr,
      stdout
    });

    expect(exitCode).toBe(0);
    expect(client.rawImports.status).toHaveBeenCalledWith(contractImportBatchId);
    expect(client.importBatches.get).toHaveBeenCalledWith(contractImportBatchId);
    expect(client.syncJobs.get).toHaveBeenCalledWith(contractJobId);
    expect(client.checkpoints.get).toHaveBeenCalledWith(contractCheckpointId);
    expect(client.accounts.list).toHaveBeenCalledWith({ limit: 7 });
    expect(client.parties.list).toHaveBeenCalledWith({ limit: 7 });
    expect(client.transactions.list).toHaveBeenCalledWith({ limit: 7 });
    expect(client.transactionLines.list).toHaveBeenCalledWith({ limit: 7 });
    expect(client.ledgerEntries.list).toHaveBeenCalledWith({ limit: 7 });

    const output = JSON.parse(stdout.value);
    expect(output).toMatchObject({
      checkpoint: {
        checkpointId: contractCheckpointId,
        checkpointKind: "provider_updated_at_watermark",
        checkpointRef: `checkpoint://quickbooks/${contractTenantId}/${contractCheckpointId}`,
        entity: "accounts",
        providerUpdatedAtWatermark: "2026-06-15T19:25:00.000Z",
        status: "succeeded",
        syncMode: "incremental"
      },
      connection: {
        available: true,
        providerEnvironment: "sandbox",
        status: "connected"
      },
      importBatch: {
        available: true,
        importBatchId: contractImportBatchId,
        status: "succeeded",
        totalObjectCount: 8
      },
      importVolume: {
        entityCounts: {
          accounts: 3,
          parties: 2,
          transactions: 3
        },
        objectCount: 8,
        objectCounts: {
          Account: 3,
          Customer: 1,
          Payment: 1
        },
        totalObjectCount: 8
      },
      normalizedCounts: {
        accounts: {
          available: true,
          count: 3,
          hasMore: false,
          limit: 25
        },
        ledgerEntries: {
          available: true,
          count: 4
        },
        parties: {
          available: true,
          count: 2
        },
        transactions: {
          available: true,
          count: 3
        },
        transactionLines: {
          available: true,
          count: 2
        }
      },
      normalizedCompleteness: {
        accounts: {
          available: true,
          complete: true,
          importBatchId: contractImportBatchId,
          normalizedRecordCount: 3,
          providerPagingEvidenceRefCount: 1,
          resourceFamily: "accounts",
          sourceObjectCount: 3,
          sourceObjectTypes: ["Account"],
          status: "complete",
          syncMode: "incremental",
          syncPhase: "delta_sync"
        },
        ledger_entries: {
          available: true,
          complete: true,
          evidence: {
            objectCounts: {
              Bill: 1,
              Deposit: 1,
              Payment: 1
            },
            providerPagingEvidenceCount: 1
          },
          normalizedRecordCount: 4,
          resourceFamily: "ledger_entries",
          status: "complete"
        },
        transactions: {
          available: true,
          complete: false,
          evidence: {
            incompleteObjectTypes: ["Bill"],
            providerPagingEvidenceCount: 2
          },
          normalizedRecordCount: 3,
          reason: "provider_paging_Bill_incomplete",
          resourceFamily: "transactions",
          status: "incomplete"
        },
        transaction_lines: {
          available: true,
          complete: false,
          evidence: {
            missingObjectTypes: ["Purchase"],
            providerPagingEvidenceCount: 2
          },
          normalizedRecordCount: 0,
          reason: "missing_object_count_Purchase",
          resourceFamily: "transaction_lines",
          status: "unknown"
        }
      },
      rawImport: {
        available: true,
        importBatchId: contractImportBatchId,
        status: "completed",
        syncMode: "full",
        syncPhase: "initial_load"
      },
      syncJob: {
        available: true,
        importBatchId: contractImportBatchId,
        jobId: contractJobId,
        status: "succeeded",
        syncMode: "incremental",
        syncPhase: "delta_sync"
      },
      tokenCustody: {
        available: true,
        status: "healthy"
      },
      tenantId: contractTenantId
    });
    expect(output).not.toHaveProperty("reports");
    expect(output.futureErpConfig).toMatchObject({
      artifact: "future-erp.quickbooks-runtime-config.redacted.v1",
      copyableEnv: {
        HANDRAIL_QBO_API_KEY: "REDACTED_QBO_SERVICE_API_KEY",
        HANDRAIL_QBO_PROVIDER_MODE: "sandbox",
        HANDRAIL_QBO_SERVICE_ENV: "staging",
        HANDRAIL_QBO_TENANT_ID: contractTenantId
      },
      tenantId: contractTenantId
    });
    expect(output.futureErpConfig).not.toHaveProperty("tenantMap");
    expect(output.futureErpConfig.copyableEnv).not.toHaveProperty("HANDRAIL_QBO_TENANT_MAP_JSON");
    expect(stdout.value).not.toContain("test-cli-api-key");
    expect(stdout.value).not.toContain("HANDRAIL_QBO_BASE_URL");
    expect(stdout.value).not.toMatch(
      /"access_token"|"refresh_token"|"client_secret"|"clientId"|"clientSecret"|"Authorization"|"rawPayload"|"sourcePayloadRef"|"sourcePayloadRefs"/
    );
    expect(stdout.value).not.toMatch(/stored-access-token|stored-refresh-token|do-not-print|raw provider payload/i);
    expect(stderr.value).toBe("");
  });

  it("parses sync command flags into the SDK start request", async () => {
    const stdout = new StringWriter();
    const client = createMockClient();

    const exitCode = await runCli(
      [
        "sync",
        "--entities",
        "accounts,taxes,ledger_entries",
        "--mode",
        "incremental",
        "--since",
        "2026-05-01",
        "--idempotency-key",
        "sync-request-123"
      ],
      {
        createClient: () => client,
        env: {
          HANDRAIL_QBO_API_KEY: "test-secret",
          HANDRAIL_QBO_TENANT_ID: "tenant_123"
        },
        stdout
      }
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.value)).toMatchObject({
      checkpoint: {
        checkpointId: "quickbooks_incremental_accounts_Account",
        syncMode: "incremental"
      },
      importVolume: {
        objectCount: 3,
        totalObjectCount: 3
      },
      syncMode: "incremental",
      syncPhase: "delta_sync"
    });
    expect(client.syncJobs.start).toHaveBeenCalledWith(
      {
        entities: ["accounts", "taxes", "ledger_entries"],
        mode: "incremental",
        since: "2026-05-01"
      },
      {
        idempotencyKey: "sync-request-123"
      }
    );
  });

  it("prints disposition provenance while removing raw payload and credential material", async () => {
    const stdout = new StringWriter();
    const client = createMockClient();
    vi.mocked(client.syncJobs.start).mockResolvedValueOnce({
      ...contractResponses.syncJob,
      authorization: "Bearer do-not-print",
      credentials: {
        access_token: "stored-access-token",
        clientSecret: "do-not-print"
      },
      providerDispositions: [
        {
          disposition: "skipped",
          providerObjectId: "credit-application:arbitrary/-42",
          providerObjectType: "BillPayment",
          rawPayloadProvenance: {
            sourcePayloadRef: "raw://batch_contract_2026_05/objects/BillPayment/arbitrary-42"
          },
          reason: "zero_cash_deposit_vendor_credit_offset"
        }
      ],
      providerPayloadBody: {
        BillPayment: [{ Id: "credit-application:arbitrary/-42" }]
      },
      rawPayload: {
        QueryResponse: {
          BillPayment: [{ Id: "credit-application:arbitrary/-42" }]
        }
      }
    });

    const exitCode = await runCli(["sync", "--mode", "incremental"], {
      createClient: () => client,
      env: requiredEnv(),
      stdout
    });

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.value)).toMatchObject({
      providerDispositions: [
        {
          disposition: "skipped",
          providerObjectId: "credit-application:arbitrary/-42",
          rawPayloadProvenance: {
            sourcePayloadRef: "raw://batch_contract_2026_05/objects/BillPayment/arbitrary-42"
          },
          reason: "zero_cash_deposit_vendor_credit_offset"
        }
      ]
    });
    expect(stdout.value).not.toMatch(
      /"access_token"|"credentials"|"clientSecret"|"Authorization"|"authorization"|"providerPayloadBody"|"rawPayload"|"QueryResponse"|stored-access-token|do-not-print/
    );
  });

  it("formats service errors with safe diagnostics only", async () => {
    const stdout = new StringWriter();
    const stderr = new StringWriter();
    const client = createMockClient();
    vi.mocked(client.connections.status).mockRejectedValueOnce(
      new HandrailQuickBooksError("Integration service unavailable.", {
        code: "SERVICE_UNAVAILABLE",
        details: {
          authorization: "Bearer do-not-print",
          clientSecret: "do-not-print",
          providerError: {
            QueryResponse: {
              Account: [
                {
                  Id: "100"
                }
              ]
            }
          },
          rawPayload: {
            access_token: "stored-access-token",
            refresh_token: "stored-refresh-token"
          },
          token: "do-not-print"
        },
        requestId: "req_123",
        retryable: true,
        status: 503,
        url: "https://quickbooks.example.test/path?apiKey=do-not-print"
      })
    );

    const exitCode = await runCli(["status"], {
      createClient: () => client,
      env: requiredEnv(),
      stderr,
      stdout
    });

    expect(exitCode).toBe(1);
    expect(stderr.value).toContain("Integration service unavailable.");
    expect(stderr.value).toContain("code=SERVICE_UNAVAILABLE");
    expect(stderr.value).toContain("status=503");
    expect(stderr.value).toContain("requestId=req_123");
    expect(stderr.value).not.toContain("do-not-print");
    expect(stderr.value).not.toMatch(
      /access_token|refresh_token|client_secret|Authorization|authorization|clientSecret|rawPayload|rawProviderPayload|QueryResponse|providerError|raw provider payload/i
    );
    expect(stdout.value).toBe("");
  });
});

class StringWriter {
  value = "";

  write(chunk: string) {
    this.value += chunk;
  }
}

function requiredEnv() {
  return {
    HANDRAIL_QBO_API_KEY: "test-secret",
    HANDRAIL_QBO_TENANT_ID: contractTenantId
  };
}

function futureErpTenantMapJson() {
  return JSON.stringify({
    schemaVersion: 1,
    contractId: "future-erp.quickbooks-tenant-mapping.v1",
    consumerProject: "Hitcents Future ERP",
    sourceOfTruth: "Handrail QuickBooks Integration service",
    serviceEnv: "staging",
    providerMode: "sandbox",
    tenantMappings: [
      {
        futureErpAccountId: "acct_sensitive_alpha",
        futureErpCompanyId: "company_sensitive_alpha",
        serviceTenantId: contractTenantId,
        displayName: "Sensitive Alpha LLC",
        notes: "Sensitive owner handoff notes",
        status: "active"
      }
    ]
  });
}

function createMockClient(): CliQuickBooksClient {
  return {
    accounts: {
      list: vi.fn().mockResolvedValue(contractResponses.accounts)
    },
    checkpoints: {
      get: vi.fn().mockResolvedValue(contractResponses.checkpoint),
      list: vi.fn().mockResolvedValue(contractResponses.checkpoints)
    },
    classes: {
      list: vi.fn().mockResolvedValue(contractResponses.classes)
    },
    connections: {
      connectUrl: vi.fn().mockResolvedValue(contractResponses.connectUrl),
      status: vi.fn().mockResolvedValue(contractResponses.connectionStatus),
      tokenStatus: vi.fn().mockResolvedValue(contractResponses.tokenStatus)
    },
    importBatches: {
      get: vi.fn().mockResolvedValue(contractResponses.importBatch),
      list: vi.fn().mockResolvedValue(contractResponses.importBatches)
    },
    items: {
      list: vi.fn().mockResolvedValue(contractResponses.items)
    },
    ledgerEntries: {
      list: vi.fn().mockResolvedValue(contractResponses.ledgerEntries)
    },
    transactionLines: {
      list: vi.fn().mockResolvedValue(contractResponses.transactionLines)
    },
    locations: {
      list: vi.fn().mockResolvedValue(contractResponses.locations)
    },
    parties: {
      list: vi.fn().mockResolvedValue(contractResponses.parties)
    },
    rawImports: {
      list: vi.fn().mockResolvedValue({
        data: [],
        page: {
          hasMore: false
        }
      }),
      status: vi.fn().mockResolvedValue(contractResponses.rawImportStatus)
    },
    syncJobs: {
      get: vi.fn().mockResolvedValue(contractResponses.syncJob),
      list: vi.fn().mockResolvedValue({
        data: [],
        page: {
          hasMore: false
        }
      }),
      start: vi.fn().mockResolvedValue(contractResponses.syncJob)
    },
    transactions: {
      list: vi.fn().mockResolvedValue(contractResponses.transactions)
    }
  };
}
