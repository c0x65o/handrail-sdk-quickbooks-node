import { HandrailQuickBooksResource } from "./base.js";
import type {
  HandrailQuickBooksProviderReportRequest,
  HandrailQuickBooksProviderReportResponse
} from "../types.js";

/**
 * QuickBooks-owned report passthrough (Reports API) used for reconciling
 * downstream ERP statements against QuickBooks' own report engine.
 */
export class ProviderReportsResource extends HandrailQuickBooksResource {
  get(request: HandrailQuickBooksProviderReportRequest) {
    return this.http.request<HandrailQuickBooksProviderReportResponse>(
      this.tenantPath("provider-reports"),
      {
        body: request,
        method: "POST"
      }
    );
  }

  trialBalance(request: Omit<HandrailQuickBooksProviderReportRequest, "reportName">) {
    return this.get({ ...request, reportName: "trial_balance" });
  }

  profitAndLoss(request: Omit<HandrailQuickBooksProviderReportRequest, "reportName">) {
    return this.get({ ...request, reportName: "profit_and_loss" });
  }

  balanceSheet(request: Omit<HandrailQuickBooksProviderReportRequest, "reportName">) {
    return this.get({ ...request, reportName: "balance_sheet" });
  }

  generalLedger(request: Omit<HandrailQuickBooksProviderReportRequest, "reportName">) {
    return this.get({ ...request, reportName: "general_ledger" });
  }
  agedReceivables(asOfDate: string) { return this.get({reportName:"aged_receivables",asOfDate,accountingBasis:"accrual"}); }
  agedReceivableDetail(asOfDate: string) { return this.get({reportName:"aged_receivable_detail",asOfDate,accountingBasis:"accrual"}); }
  agedPayables(asOfDate: string) { return this.get({reportName:"aged_payables",asOfDate,accountingBasis:"accrual"}); }
  agedPayableDetail(asOfDate: string) { return this.get({reportName:"aged_payable_detail",asOfDate,accountingBasis:"accrual"}); }
  /** Open balances are the independently reported aging grand totals, including credits. */
  async openBalances(asOfDate: string) {
    const receivables=await this.agedReceivables(asOfDate);
    const payables=await this.agedPayables(asOfDate);
    return {asOfDate,receivables,payables};
  }

}
