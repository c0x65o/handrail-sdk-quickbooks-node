import {it,expect} from 'vitest';
import {HandrailQuickBooksClient} from '../src/index.js';
it('exposes all read-only reports and paired open-balance reads without starting a sync',async()=>{
 const calls:unknown[]=[];
 const client=new HandrailQuickBooksClient({tenantId:'fixture',apiKey:'test',providerMode:'sandbox',baseUrl:'https://example.test',fetch:async (_url,init)=>{calls.push(JSON.parse(String(init?.body)));return new Response(JSON.stringify({ok:true,totals:[]}));}});
 await client.providerReports.trialBalance({asOfDate:'2026-11-30'});
 await client.providerReports.agedReceivableDetail('2026-11-30');
 await client.providerReports.agedPayableDetail('2026-11-30');
 await client.providerReports.openBalances('2026-11-30');
 expect(calls).toEqual([
 {reportName:'trial_balance',asOfDate:'2026-11-30'},
 ...['aged_receivable_detail','aged_payable_detail','aged_receivables','aged_payables'].map(reportName=>({reportName,asOfDate:'2026-11-30',accountingBasis:'accrual'}))]);
});
