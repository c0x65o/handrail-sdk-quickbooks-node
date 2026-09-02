# Handrail QuickBooks Node SDK

Internal TypeScript package foundation for Handrail ERP-style apps that need to consume normalized QuickBooks data through the central Handrail QuickBooks integration service.

ERP apps must call the Handrail integration service through the service URL resolved from
`HANDRAIL_QBO_SERVICE_ENV`. The staging host is
`https://quickbooks.handrail.staging.handrail-daas.com`; the production host is
`https://quickbooks.handrail-daas.com`.
They must not store Intuit OAuth tokens, refresh tokens, webhooks, or call Intuit/QuickBooks
APIs directly. OAuth, token custody, webhooks, CDC/imports, raw imports, normalized object
feeds, and sync jobs remain owned by the central service. ERP Financials owns normalized
financial tables and generated financial views.

Service ownership and the Future ERP tenant-mapping contract are documented in the sibling service repo:
[QuickBooks Production Integration](../handrail-service-quickbooks/docs/quickbooks-production.md#service-responsibility)
and [Future ERP QuickBooks Tenant Mapping Contract](../handrail-service-quickbooks/docs/future-erp-tenant-mapping-contract.md).

## Install

This package is private and internal-first. Until Handrail publishes a registry package, consume it from the repo or a workspace reference:

```json
{
  "dependencies": {
    "@handrail/quickbooks-node-sdk": "workspace:*"
  }
}
```

## Cross-project Adoption Guide

ERP apps should treat this package as their only QuickBooks-facing dependency. The app boundary is:

1. The ERP app imports `@handrail/quickbooks-node-sdk` and configures it with Handrail runtime config.
2. The SDK calls the central Handrail QuickBooks integration service.
3. The central service owns Intuit OAuth, token custody, webhook handling, CDC/imports, raw imports, normalized object feeds, sync jobs, and QuickBooks API calls.

ERP apps must not store Intuit access tokens, refresh tokens, OAuth client secrets, webhook secrets, or call Intuit/QuickBooks APIs directly. If an ERP app needs data not exposed here, add a stable integration-service contract and SDK method instead of bypassing the service.

This SDK repo owns only reusable consumer code: runtime config helpers, TypeScript request and
response types, CLI smoke/status helpers, tenant-map resolution support, and HTTP calls to the
Handrail QuickBooks service API. It must not own service deployment, Intuit app credentials,
Intuit token custody, owner/admin tenant administration, API-key issuance, or direct
Intuit/QuickBooks API calls.

Hitcents Future ERP is the current consumer project. Future ERP owns only server-side storage
of its QuickBooks service tenant id, or its account/company-to-service-tenant mapping when it
needs multi-company resolution, plus server-only use of this SDK and runtime config. Future ERP
must not store Intuit tokens or call Intuit/QuickBooks APIs directly.

Recommended adoption steps:

1. Add the package through a workspace reference or internal package source.
2. Configure `HANDRAIL_QBO_SERVICE_ENV`, `HANDRAIL_QBO_PROVIDER_MODE`,
   `HANDRAIL_QBO_API_KEY`, and `HANDRAIL_QBO_TENANT_ID` through Handrail runtime
   configuration for each single-tenant environment. Use a server-only tenant map only when
   the ERP needs account/company-to-service-tenant resolution.
3. Pass the configured service tenant id to SDK calls, or resolve the selected Future ERP
   account/company to a QuickBooks service tenant id from the tenant map before making SDK calls.
4. Instantiate `HandrailQuickBooksClient` from server-side code only. Do not bundle service
   credentials or tenant-map payloads into browser code.
5. Use stable business namespaces for application workflows and reserve `audit` fields for support/debug links.
6. Use the CLI locally or in operator shells for smoke/status tests with redacted runtime credentials.

For Handrail-managed deploys, these values should be provided as env/config rows and rendered
into the consuming app runtime by Handrail. Do not patch Kubernetes Secrets directly; a later
deploy regenerates them from Handrail-owned configuration.

## Runtime Configuration

Configure the SDK explicitly in application code or through runtime env injected by Handrail:

| Env var | Purpose |
| --- | --- |
| `HANDRAIL_QBO_SERVICE_ENV` | Standard Future ERP runtime selector for the QuickBooks service environment: `dev`, `staging`, or `production`. SDK runtime config support belongs in this repo and should derive the service base URL from this value. |
| `HANDRAIL_QBO_PROVIDER_MODE` | Standard Future ERP runtime selector for the Intuit provider mode: `sandbox` or `production`. SDK calls and status helpers should preserve this value where the service contract requires provider-mode context. |
| `HANDRAIL_QBO_API_KEY` | Required server-only service API key or bearer credential issued by the QuickBooks Integration service. Do not commit real values or expose them to browser code. |
| `HANDRAIL_QBO_TENANT_ID` | Standard single-tenant Future ERP service tenant id issued by the QuickBooks Integration service. Use this when the runtime targets one known service tenant. |
| `HANDRAIL_QBO_TENANT_MAP_JSON` | Optional server-only Future ERP mapping artifact for account/company-to-service-tenant resolution. Use this only when one runtime must select among multiple service tenants. The artifact shape is defined by `future-erp.quickbooks-tenant-mapping.v1` in the service repo. |
| `HANDRAIL_QBO_BASE_URL` | Local developer override only, for pointing at a manually started service. Normal Future ERP runtime config must not require this value. |

Current SDK-owned service-env URL resolution:

| Service env | Service base URL |
| --- | --- |
| `dev` | `https://quickbooks.handrail.staging.handrail-daas.com` |
| `staging` | `https://quickbooks.handrail.staging.handrail-daas.com` |
| `production` | `https://quickbooks.handrail-daas.com` |

Local development may still pass an explicit `baseUrl` option or use the CLI/local
`HANDRAIL_QBO_BASE_URL` override when pointing at a manually started service.

No Intuit credentials belong in this package or in ERP app repositories.
Provider credentials and profile secrets stay service-owned. `HANDRAIL_QBO_PROVIDER_MODE` is
consumer configuration and status context, not an Intuit credential.

The CLI reads the same env vars, or the equivalent flags:

```sh
export HANDRAIL_QBO_SERVICE_ENV="staging"
export HANDRAIL_QBO_PROVIDER_MODE="sandbox"
export HANDRAIL_QBO_API_KEY="REDACTED_QBO_SERVICE_API_KEY"
export HANDRAIL_QBO_TENANT_ID="future-erp-dev-sandbox-tenant"
```

Never commit real `HANDRAIL_QBO_API_KEY` values, full tenant-map payloads, or Intuit token material.
Do not print API keys or full tenant-map payloads in logs, screenshots, browser-visible config,
analytics, or support tickets.

Application code may also pass config explicitly:

```ts
const quickBooks = new HandrailQuickBooksClient({
  apiKey: process.env.HANDRAIL_QBO_API_KEY,
  providerMode: process.env.HANDRAIL_QBO_PROVIDER_MODE === "production" ? "production" : "sandbox",
  tenantId: process.env.HANDRAIL_QBO_TENANT_ID,
  timeoutMs: 10_000
});
```

For multi-company resolution, pass `tenantMapJson` and `futureErpTenantContext` to
`createQuickBooksSdkConfig`, or resolve the service tenant id with the exported tenant-map helper
before constructing the client. The resolved value is a QuickBooks service tenant id, not an
Intuit `realmId`. Keep `apiKey`, tenant-map payloads, and any custom `auth.token` values
server-side. Logs, test fixtures, snapshots, and support tickets should redact those values.

## Usage

```ts
import { HandrailQuickBooksClient } from "@handrail/quickbooks-node-sdk";

const quickBooks = new HandrailQuickBooksClient({
  apiKey: process.env.HANDRAIL_QBO_API_KEY,
  providerMode: "sandbox",
  tenantId: "future-erp-dev-sandbox-tenant"
});

const health = await quickBooks.health.get();
const connection = await quickBooks.connections.status();
const connect = await quickBooks.connections.connectUrl({
  returnUrl: "https://erp.example.test/settings/accounting"
});
const sync = await quickBooks.syncJobs.start({
  entities: ["accounts", "items", "classes", "locations", "ledger_entries"],
  mode: "incremental"
});
const incrementalSync = await quickBooks.incrementalSync({
  entities: ["accounts", "ledger_entries"],
  since: "2026-05-01T00:00:00.000Z"
});
const ledgerEntries = await quickBooks.ledgerEntries.search({
  accountId: "100",
  from: "2026-05-01",
  to: "2026-05-31"
});
const transactionLines = await quickBooks.transactionLines.search({
  transactionId: "700",
  transactionType: "payment"
});
const items = await quickBooks.items.list({ active: true });
const classes = await quickBooks.classes.list({ active: true });
const locations = await quickBooks.locations.list({ active: true });
const checkpoint = await quickBooks.checkpoints.get("quickbooks_incremental_accounts_Account");
```

The public surface exposes stable Handrail business concepts through resource modules:

- `connections.status()`, `connections.tokenStatus()`, and `connections.connectUrl()`
- `health.get()`
- `fullSync()`, `incrementalSync()`, `syncJobs.fullSync()`, `syncJobs.incrementalSync()`,
  `syncJobs.start()`, `syncJobs.get()`, and `syncJobs.list()`
- `rawImports.status()` and `rawImports.list()`
- `importBatches.get()` and `importBatches.list()`
- `checkpoints.get()` and `checkpoints.list()`
- `accounts.list()` and `accounts.get()`
- `items.list()` and `items.get()`
- `classes.list()` and `classes.get()`
- `locations.list()` and `locations.get()`
- `parties.list()` and `parties.get()`
- `transactions.list()` and `transactions.get()`
- `transactionLines.list()`, `transactionLines.search()`, and `transactionLines.get()`
- `ledgerEntries.search()` and `ledgerEntries.get()`

The SDK keeps Intuit-specific details bounded to safe metadata such as `realmId`, QBO object IDs, source refs, checkpoint refs, sync tokens, and import batches. Consumers should treat `audit` fields as diagnostics, not as a direct QuickBooks API contract.

Object pulls use the integration service's normalized accounting API:
`/v1/tenants/:tenantId/accounting/accounts`, `/accounting/items`,
`/accounting/classes`, `/accounting/locations`, `/accounting/parties`,
`/accounting/transactions`, `/accounting/transaction-lines`, and
`/accounting/ledger-entries/search`. The SDK and CLI return
paginated `{ data, page }` responses unchanged, including optional filters such as `limit` and
`cursor` where supported. Generated financial views and close workflows belong in ERP Financials
or consuming ERP applications.

Account hierarchy is normalized at the SDK boundary. `accounts.list()`,
`accounts.get()`, `fullSync()`, and `incrementalSync()` accept either
`parentRef.value` or `parentAccountId`, trim the provider id, and return the
same stable id in both fields. A parent id implies `subAccount: true` when the
service omits that flag. Conflicting parent fields, an explicit root flag with
a parent, a sub-account without a parent id, and self-parenting throw
`HandrailQuickBooksAccountHierarchyError` with code
`INVALID_ACCOUNT_HIERARCHY`. The SDK never derives parents from account names,
indentation, `FullyQualifiedName`, `hierarchyPath`, or `hierarchyLevel`.

Products are normalized from the QuickBooks Accounting API `Item` object. Locations are normalized
from the QuickBooks `Department` object with `locationSource: "department"` and
`locationObjectStatus: "mapped_to_department"`; the SDK does not invent a distinct QuickBooks
`Location` object contract.

Ledger entries are canonical posting rows only when the QuickBooks service provides an explicit
`postingType: "Debit" | "Credit"`. Future ERP and other consumers must persist that value directly
instead of inferring polarity from amount signs, account classes, or shell-owned accounting rules.

Raw import and sync job responses expose first-class status metadata for initial loads and delta syncs. `syncMode` is `full` for initial load work and `incremental` for checkpoint-resumed CDC/query work; `syncPhase` is `initial_load` or `delta_sync`. `importVolume` repeats the service-normalized object/entity totals, errors, and warnings directly on `rawImports` and `syncJobs`, while `checkpoint` includes the checkpoint id/ref/kind, sync mode, provider-updated-at watermark, cursor refs, job refs, timestamps, status, and bounded audit refs. These fields are safe SDK contract fields and must not contain raw QuickBooks payloads.

`fullSync()` and `incrementalSync()` are typed wrappers around the existing service-owned
`POST /v1/tenants/:tenantId/quickbooks/sync-jobs` endpoint. They force `mode: "full"` or
`mode: "incremental"` and map the returned sanitized sync job summary into
`NormalizedQuickBooksFullSyncResponseEnvelope` or
`NormalizedQuickBooksIncrementalSyncResponseEnvelope`. The envelope repeats only normalized sync
evidence: tenant/company ids, import batch id, job id, status, delta counts, import volume,
normalized resource counts, checkpoint metadata, bounded audit refs, and the sanitized sync job
summary. When the service includes `normalizedCompleteness`, the SDK preserves that service-owned
map for accounts, transactions, transaction lines, and ledger entries on the envelope and nested
sync job/import batch/checkpoint objects. Completeness describes whether the requested sync
window, import batch, or checkpoint has enough service-owned evidence to claim the normalized
family complete; it is separate from pagination metadata such as `page.hasMore` and `page.cursor`.
When the service includes bounded `normalizedResources`, the SDK preserves those
entity-keyed resources for ERP Financials canonical persistence. It does not expose raw provider
payloads, Intuit tokens, Authorization headers, client secrets, tenant-map JSON, or API key values.

Future ERP deterministic sync contract examples are pinned in `examples/contracts/full-sync.response.json`
and `examples/contracts/incremental-sync.response.json`. ERP product financial views should read
persisted ERP Financials canonical tables built from the synced object feed.

Raw import and sync job responses may include a `retry` object with `retryable`, `attemptCount`, `maxAttempts`, optional `nextRetryAt`, `lastErrorCode`, and `retryReason`. These fields describe central-service retry readiness only; they use service-owned codes and must not contain Intuit tokens, Authorization headers, raw provider errors, or raw QuickBooks payloads.

Stable namespaces are the SDK compatibility surface. Method names, request/response shapes, normalized business identifiers, source refs, and checkpoint refs should change only through versioned updates. Bounded audit fields may help support teams correlate central-service state with QuickBooks objects, but product workflows should not depend on raw Intuit payload structure.

## ERP Contract Exports

ERP Financials and Future ERP should import from the package root, `@handrail/quickbooks-node-sdk`.
The package currently publishes one export path, `"."`, backed by `dist/index.js` and
`dist/index.d.ts`. Stable consumer contract names include:

| Surface | SDK names | Service path |
| --- | --- | --- |
| Health | `health.get()`, `HealthResource`, `HandrailQuickBooksHealthResponse` | `GET /.well-known/healthz` |
| Connection/token status | `connections.status()`, `connections.tokenStatus()`, `ConnectionsResource`, `HandrailQuickBooksConnectionStatusResponse`, `HandrailQuickBooksTokenStatusResponse` | `GET /v1/tenants/:tenantId/quickbooks/connections/status`, `GET /v1/tenants/:tenantId/quickbooks/connections/token-status` |
| Full/incremental sync | `fullSync()`, `incrementalSync()`, `syncJobs.fullSync()`, `syncJobs.incrementalSync()`, `syncJobs.start()`, `syncJobs.get()`, `syncJobs.list()`, `SyncJobsResource`, `HandrailQuickBooksStartSyncRequest`, `NormalizedQuickBooksFullSyncRequest`, `NormalizedQuickBooksIncrementalSyncRequest`, `NormalizedQuickBooksFullSyncResponseEnvelope`, `NormalizedQuickBooksIncrementalSyncResponseEnvelope`, `NormalizedQuickBooksSyncResponseEnvelopeBase`, `HandrailQuickBooksNormalizedCompletenessMap`, `HandrailQuickBooksNormalizedResourceCompleteness`, `HandrailQuickBooksSyncJobSummary`, `HandrailQuickBooksSyncJobListResponse` | `POST /v1/tenants/:tenantId/quickbooks/sync-jobs`, `GET /v1/tenants/:tenantId/quickbooks/sync-jobs/:jobId`, `GET /v1/tenants/:tenantId/quickbooks/sync-jobs` |
| Accounts | `accounts.list()`, `accounts.get()`, `AccountsResource`, `ListAccountsRequest`, `HandrailQuickBooksAccount`, `HandrailQuickBooksAccountListResponse` | `GET /v1/tenants/:tenantId/accounting/accounts`, `GET /v1/tenants/:tenantId/accounting/accounts/:accountId` |
| Parties | `parties.list()`, `parties.get()`, `PartiesResource`, `ListPartiesRequest`, `HandrailQuickBooksParty`, `HandrailQuickBooksPartyListResponse` | `GET /v1/tenants/:tenantId/accounting/parties`, `GET /v1/tenants/:tenantId/accounting/parties/:partyId` |
| Transactions | `transactions.list()`, `transactions.get()`, `TransactionsResource`, `ListTransactionsRequest`, `HandrailQuickBooksTransaction`, `HandrailQuickBooksTransactionListResponse` | `GET /v1/tenants/:tenantId/accounting/transactions`, `GET /v1/tenants/:tenantId/accounting/transactions/:transactionId` |
| Transaction lines | `transactionLines.list()`, `transactionLines.search()`, `transactionLines.get()`, `TransactionLinesResource`, `ListTransactionLinesRequest`, `SearchTransactionLinesRequest`, `HandrailQuickBooksTransactionLine`, `HandrailQuickBooksTransactionLineListResponse`, `HandrailQuickBooksTransactionLineSearchResponse`, `HandrailQuickBooksTransactionLineGetResponse` | `GET /v1/tenants/:tenantId/accounting/transaction-lines`, `GET /v1/tenants/:tenantId/accounting/transaction-lines/:transactionLineId` |
| Ledger entries/postings | `ledgerEntries.list()`, `ledgerEntries.search()`, `ledgerEntries.get()`, `LedgerEntriesResource`, `HandrailQuickBooksLedgerEntry`, `HandrailQuickBooksLedgerEntryListResponse`, `HandrailQuickBooksLedgerSearchRequest` | `GET /v1/tenants/:tenantId/accounting/ledger-entries`, `POST /v1/tenants/:tenantId/accounting/ledger-entries/search`, `GET /v1/tenants/:tenantId/accounting/ledger-entries/:ledgerEntryId` |
| Checkpoints | `checkpoints.get()`, `checkpoints.list()`, `CheckpointsResource`, `HandrailQuickBooksSyncCheckpoint`, `HandrailQuickBooksSyncCheckpointMetadata`, `HandrailQuickBooksSyncCheckpointListResponse`, `HandrailQuickBooksCheckpointListRequest` | `GET /v1/tenants/:tenantId/quickbooks/checkpoints/:checkpointId`, `GET /v1/tenants/:tenantId/quickbooks/checkpoints` |
| Source timestamps | `sourceUpdatedAt` on `HandrailQuickBooksAccount`, `HandrailQuickBooksItem`, `HandrailQuickBooksClass`, `HandrailQuickBooksLocation`, `HandrailQuickBooksParty`, `HandrailQuickBooksTransaction`, `HandrailQuickBooksTransactionLine`, `HandrailQuickBooksLedgerEntry`; `providerUpdatedAtWatermark` on checkpoint metadata | Same normalized resource, sync job, raw import, and checkpoint paths above |

The type-level consumer gate is `npm run check:consumer-types`, which builds the SDK and compiles
`examples/type-consumer/future-erp-contract.ts` through the package export path.

## CLI

The package exposes a `handrail-qbo` CLI for developer smoke tests and operator workflows. It wraps `HandrailQuickBooksClient`; it does not call QuickBooks or Intuit directly.

```sh
handrail-qbo --help
handrail-qbo connect-url --tenant-id tenant_123 --api-key <redacted> --return-url https://erp.example.test/settings/accounting
handrail-qbo pull-accounts --tenant-id tenant_123 --api-key <redacted> --active --type asset
handrail-qbo sync --tenant-id tenant_123 --api-key <redacted> --mode incremental --entities accounts,ledger_entries
handrail-qbo smoke --tenant-id tenant_123 --api-key <redacted> --import-batch-id batch_123 --sync-job-id job_123 --checkpoint-id quickbooks_incremental_accounts_Account
handrail-qbo status --tenant-id tenant_123 --api-key <redacted>
handrail-qbo token-status --tenant-id tenant_123 --api-key <redacted>
handrail-qbo raw-import-status --tenant-id tenant_123 --api-key <redacted> --import-batch-id batch_123
```

Supported commands:

- `connect-url` creates a service-owned QuickBooks connect URL.
- `pull-accounts` reads normalized accounts from `/v1/tenants/:tenantId/accounting/accounts`, with optional `--active`, `--inactive`, `--type`, `--limit`, and `--cursor` filters.
- `sync` starts a sync job with optional `--mode`, `--entities`, `--since`, `--import-batch-id`, and `--idempotency-key`.
- `smoke` prints a redacted operator JSON summary for connection/provider status, token custody state, raw import and sync job metadata, import volume, normalized account/item/class/location/party/transaction/ledger-entry counts, and checkpoint position.
- `status` reads tenant connection status.
- `status` may include sanitized service-owned provider metadata such as `providerMode`, `providerEnvironment`, and `providerProfile` when the integration service reports it.
- `token-status` reads bounded token custody diagnostics without exposing token values.
- `raw-import-status` reads one import batch with `--import-batch-id` or lists recent batches.

Successful CLI commands print JSON. `status` and `smoke` append a `futureErpConfig`
artifact with copyable, redacted `HANDRAIL_QBO_SERVICE_ENV`,
`HANDRAIL_QBO_PROVIDER_MODE`, `HANDRAIL_QBO_API_KEY`, and
`HANDRAIL_QBO_TENANT_ID` values for simple owner/operator handoff, or
`HANDRAIL_QBO_TENANT_MAP_JSON` when a tenant map is supplied. If
`HANDRAIL_QBO_BASE_URL` or `--base-url` is present, it is reported only in
`localOverrideDiagnostics` as a local operator override and is excluded from
the copyable Future ERP config block. Most other commands return the SDK method
value directly. `smoke` intentionally reshapes successful SDK responses into bounded operator evidence: status values, ids, timestamps, import volume/object/entity counts, normalized resource counts, and checkpoint id/ref/kind/watermark/cursor refs. It omits audit payload references except bounded checkpoint cursor refs and does not print raw resource rows. Use `--import-batch-id`, `--sync-job-id`, `--checkpoint-id`, `--limit`, `--account-id`, `--party-id`, and `--transaction-id` for deterministic probes.

For `status`, `token-status`, and `raw-import-status`, JSON is the service-owned diagnostics contract and may include bounded audit references such as `realmId`, `sourcePayloadRef`, `sourcePayloadRefs`, `connectionId`, `importBatchId`, checkpoint refs, checkpoint watermarks, import volume counts, and safe retry metadata for failed raw imports or sync jobs. CLI output must not include Intuit access tokens, refresh tokens, OAuth client secrets, raw Authorization headers, API keys, raw provider error payloads, or full raw QuickBooks payloads.

CLI errors print safe diagnostics only: message, code, HTTP status, request id, and retryability. They do not print API keys, Intuit tokens, or raw service error details.

## Local Smoke-test Flow

Use offline tests for normal development and reserve live smoke tests for environments with
Handrail-provided service credentials and a service tenant id or server-only tenant map.

1. Install dependencies in this package.
2. Run the offline unit tests when changing SDK or CLI behavior.
3. Export runtime config from a safe local shell or operator environment.
4. Use `HANDRAIL_QBO_TENANT_ID` for a single controlled service tenant, or resolve the service
   tenant id from the tenant map for the Future ERP account/company under test.
5. Verify connection status before running commands that start sync work.

```sh
npm install
npm run test

export HANDRAIL_QBO_SERVICE_ENV="staging"
export HANDRAIL_QBO_PROVIDER_MODE="sandbox"
export HANDRAIL_QBO_API_KEY="REDACTED_QBO_SERVICE_API_KEY"
export HANDRAIL_QBO_TENANT_ID="future-erp-dev-sandbox-tenant"

SERVICE_TENANT_ID="$HANDRAIL_QBO_TENANT_ID"

handrail-qbo status --tenant-id "$SERVICE_TENANT_ID"
handrail-qbo token-status --tenant-id "$SERVICE_TENANT_ID"
handrail-qbo raw-import-status --tenant-id "$SERVICE_TENANT_ID" --import-batch-id batch_123
handrail-qbo smoke --tenant-id "$SERVICE_TENANT_ID" --import-batch-id batch_123 --checkpoint-id quickbooks_incremental_accounts_Account
handrail-qbo pull-accounts --tenant-id "$SERVICE_TENANT_ID" --active --limit 25
handrail-qbo sync --tenant-id "$SERVICE_TENANT_ID" --mode incremental --entities accounts,ledger_entries
```

Safe diagnostics guidance:

- Prefer `status`, `token-status`, and `raw-import-status` for operator checks.
- Prefer `smoke` when support needs one bounded JSON summary that proves connection, token custody, import volume, normalized counts, and checkpoint position.
- Share `requestId`, command name, tenant id, job id, import batch id, and timestamps with support.
- Do not paste API keys, full tenant-map payloads, Intuit OAuth values, raw Authorization headers,
  webhook secrets, or full raw QuickBooks payloads into logs or tickets.
- Treat `realmId`, QBO object IDs, sync tokens, source payload refs, and import batch ids as bounded audit references, not reusable credentials.

## Request Behavior

`HandrailQuickBooksClient` sends requests to the Handrail integration service only. It supports:

- Runtime config derived from `HANDRAIL_QBO_SERVICE_ENV`, `HANDRAIL_QBO_PROVIDER_MODE`,
  `HANDRAIL_QBO_API_KEY`, and a server-only tenant id or tenant mapping as the Future ERP contract evolves.
- Local-only `baseUrl` overrides, explicit `tenantId` targeting, `apiKey`, or explicit `auth`
  configuration for developer/operator smoke paths.
- Per-client `timeoutMs`, defaulting to 10 seconds.
- Safe retries for idempotent reads. Mutating calls are not retried unless an idempotency key is supplied where supported.
- Structured `HandrailQuickBooksError` failures with `code`, `status`, `requestId`, `retryable`, and safe diagnostic `details`.

## Tests and Contract Examples

Unit tests are fully offline and use mocked fetch/SDK clients plus fixtures from `tests/fixtures/accounting.ts`. They do not require Intuit credentials, a QuickBooks tenant, or access to `https://quickbooks.handrail-daas.com`.

```sh
npm run test
```

Example service response contracts live in `examples/contracts/` for health, connection status, token status, raw import status, connect URL, normalized accounting resources, full sync envelopes, CDC/incremental sync start and normalized envelopes, import batches, checkpoints, and ledger search. The transaction and ledger examples include sandbox-backed Bill, Payment, and Deposit contracts; no-data transaction objects remain visible through zero object counts in import metadata. The raw import example demonstrates `syncMode: "full"` / `syncPhase: "initial_load"` metadata, and the CDC sync start plus incremental envelope examples demonstrate `syncMode: "incremental"` / `syncPhase: "delta_sync"` metadata. The `*.response.json` files describe the successful SDK return value and successful CLI stdout shape for those commands; the CLI does not wrap or reshape successful responses. These examples include normalized Handrail accounting concepts and bounded audit/debug references only; they do not include token material, real credentials, raw provider payloads, or direct Intuit API contracts.

Later smoke tests against the integration service should use the CLI with Handrail-provided runtime config:

```sh
HANDRAIL_QBO_SERVICE_ENV="staging" \
HANDRAIL_QBO_PROVIDER_MODE="sandbox" \
HANDRAIL_QBO_API_KEY="REDACTED_QBO_SERVICE_API_KEY" \
handrail-qbo status --tenant-id "future-erp-dev-sandbox-tenant"
```

## Scripts

```sh
npm run lint
npm run test
npm run build
```

`npm run build` emits ESM JavaScript, source maps, and `.d.ts` files into `dist/`.

## Future ERP Type Handoff

Future ERP should import SDK runtime and contract types from the package root:

```ts
import { HandrailQuickBooksClient } from "@handrail/quickbooks-node-sdk";
import type {
  HandrailQuickBooksSdkConfigInput,
  HandrailQuickBooksConnectionStatusResponse,
  HandrailQuickBooksSyncJobSummary,
  HandrailQuickBooksSyncCheckpoint,
  HandrailQuickBooksImportBatchSummary,
  HandrailQuickBooksNormalizedCompletenessMap,
  HandrailQuickBooksNormalizedResourceCompleteness,
  HandrailQuickBooksAccount,
  HandrailQuickBooksParty,
  HandrailQuickBooksTransaction,
  HandrailQuickBooksTransactionLine,
  HandrailQuickBooksLedgerEntry,
  HandrailQuickBooksAuditReference
} from "@handrail/quickbooks-node-sdk";
```

The package root is `dist/index.js`, and TypeScript resolves declarations through
`package.json` `types` and `exports["."].types` at `dist/index.d.ts`. The declaration bundle
re-exports public contract names from `dist/types.d.ts` plus resource request types from
`dist/resources/*.d.ts`. `npm run check:consumer-types` builds the package and verifies a
Future ERP-style consumer can import the public contract through `@handrail/quickbooks-node-sdk`
without depending on the old ambient `src/server/quickbooks/quickbooks-node-sdk.d.ts` fallback.

## Versioning Expectations

The package starts at `0.x` while the central service contract is still stabilizing. During this phase:

- Patch versions should be used for documentation, tests, fixtures, and bug fixes that do not change the consumer contract.
- Minor versions may add SDK namespaces, methods, optional request fields, optional response fields, or CLI commands.
- Breaking changes to method names, required config, required request fields, response semantics, or CLI command names should be coordinated with consuming ERP apps before adoption.
- Consumers should pin an exact workspace, commit, or internal package version for production services until Handrail publishes a stronger registry/release process.

## Future Hardening Path

Future work, after the central QuickBooks integration service API stabilizes, should move this package toward contract-generated hardening without making that part of the initial feature:

- Publish a canonical OpenAPI spec from the central service for normalized accounting, sync, raw import, checkpoint, and diagnostics endpoints.
- Generate or verify SDK request/response types from that spec while keeping the current stable business namespaces as the ergonomic public API.
- Add contract tests that compare generated types, examples in `examples/contracts/`, and mocked SDK behavior against the service spec.
- Introduce an internal registry publishing flow with changelog, provenance, and semver release gates.
- Consider a public package release only after API stability, security review, credential-handling review, and support ownership are agreed.

This hardening path must not add direct Intuit OAuth, direct token storage, direct QuickBooks API calls, production credentials, or service deployment responsibilities to this SDK repo.

## Non-goals

- No public npm release yet.
- No OpenAPI-generated SDK contract yet.
- No direct Intuit SDK dependency.
- No direct Intuit OAuth or token storage.
- No direct Intuit or QuickBooks API calls from ERP apps, the SDK, or the CLI.
- No production credentials or checked-in secrets.
- No service deployment from this SDK repo.
