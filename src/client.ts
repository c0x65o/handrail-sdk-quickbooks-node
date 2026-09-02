import { HandrailQuickBooksHttpClient } from "./http.js";
import { createQuickBooksSdkConfig } from "./runtime.js";
import { AccountsResource } from "./resources/accounts.js";
import { CheckpointsResource } from "./resources/checkpoints.js";
import { ClassesResource } from "./resources/classes.js";
import { ConnectionsResource } from "./resources/connections.js";
import { HealthResource } from "./resources/health.js";
import { ImportBatchesResource } from "./resources/import-batches.js";
import { ItemsResource } from "./resources/items.js";
import { JournalEntriesResource } from "./resources/journal-entries.js";
import { LedgerEntriesResource } from "./resources/ledger-entries.js";
import { LocationsResource } from "./resources/locations.js";
import { PartiesResource } from "./resources/parties.js";
import { ProviderReportsResource } from "./resources/provider-reports.js";
import { RawImportsResource } from "./resources/raw-imports.js";
import { SyncJobsResource } from "./resources/sync-jobs.js";
import { TransactionLinesResource } from "./resources/transaction-lines.js";
import { TransactionsResource } from "./resources/transactions.js";
import type {
  HandrailQuickBooksClientConfig,
  HandrailQuickBooksSdkConfigInput,
  NormalizedQuickBooksFullSyncRequest,
  NormalizedQuickBooksIncrementalSyncRequest
} from "./types.js";
import type { HandrailQuickBooksSyncOptions } from "./resources/sync-jobs.js";

export class HandrailQuickBooksClient {
  readonly accounts: AccountsResource;
  readonly checkpoints: CheckpointsResource;
  readonly classes: ClassesResource;
  readonly config: HandrailQuickBooksClientConfig;
  readonly connections: ConnectionsResource;
  readonly health: HealthResource;
  readonly importBatches: ImportBatchesResource;
  readonly items: ItemsResource;
  readonly journalEntries: JournalEntriesResource;
  readonly ledgerEntries: LedgerEntriesResource;
  readonly locations: LocationsResource;
  readonly parties: PartiesResource;
  readonly providerReports: ProviderReportsResource;
  readonly rawImports: RawImportsResource;
  readonly syncJobs: SyncJobsResource;
  readonly transactionLines: TransactionLinesResource;
  readonly transactions: TransactionsResource;

  private readonly http: HandrailQuickBooksHttpClient;

  constructor(input: HandrailQuickBooksSdkConfigInput = {}) {
    this.config = createQuickBooksSdkConfig(input);
    this.http = new HandrailQuickBooksHttpClient(this.config);
    this.health = new HealthResource(this.config, this.http);
    this.connections = new ConnectionsResource(this.config, this.http);
    this.syncJobs = new SyncJobsResource(this.config, this.http);
    this.rawImports = new RawImportsResource(this.config, this.http);
    this.importBatches = new ImportBatchesResource(this.config, this.http);
    this.checkpoints = new CheckpointsResource(this.config, this.http);
    this.accounts = new AccountsResource(this.config, this.http);
    this.items = new ItemsResource(this.config, this.http);
    this.journalEntries = new JournalEntriesResource(this.config, this.http);
    this.classes = new ClassesResource(this.config, this.http);
    this.locations = new LocationsResource(this.config, this.http);
    this.parties = new PartiesResource(this.config, this.http);
    this.providerReports = new ProviderReportsResource(this.config, this.http);
    this.transactions = new TransactionsResource(this.config, this.http);
    this.transactionLines = new TransactionLinesResource(this.config, this.http);
    this.ledgerEntries = new LedgerEntriesResource(this.config, this.http);
  }

  fullSync(
    request: NormalizedQuickBooksFullSyncRequest = {},
    options: HandrailQuickBooksSyncOptions = {}
  ) {
    return this.syncJobs.fullSync(request, options);
  }

  incrementalSync(
    request: NormalizedQuickBooksIncrementalSyncRequest = {},
    options: HandrailQuickBooksSyncOptions = {}
  ) {
    return this.syncJobs.incrementalSync(request, options);
  }
}
