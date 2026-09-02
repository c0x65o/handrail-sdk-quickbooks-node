import { HandrailQuickBooksResource } from "./base.js";
import type {
  HandrailQuickBooksJournalEntrySyncRequest,
  HandrailQuickBooksJournalEntrySyncResult,
  HandrailQuickBooksMutationOptions
} from "../types.js";

export class JournalEntriesResource extends HandrailQuickBooksResource {
  sync(
    request: HandrailQuickBooksJournalEntrySyncRequest,
    options: HandrailQuickBooksMutationOptions
  ) {
    return this.http.request<HandrailQuickBooksJournalEntrySyncResult>(
      this.accountingTenantPath("journal-entries/sync"),
      {
        body: request,
        idempotencyKey: options.idempotencyKey,
        method: "POST",
        signal: options.signal
      }
    );
  }
}
