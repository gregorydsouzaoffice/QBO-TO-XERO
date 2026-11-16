/**
 * Discrepancies found while QuickBooks Online and Xero run in parallel after
 * the conversion date. The Tracker, the reports and the AI QA engine all read
 * this one list, so every figure on screen traces back to the same evidence.
 *
 * `effects` = Xero minus QBO, debit-positive, balanced. ledger.ts applies them
 * to the Xero side for issues that are not resolved. Dates are relative to the
 * conversion date / today, so the demo never goes stale.
 */
import { addDays, conversionDate, todayISO } from "../clock"
import { lastRunAt } from "./schedule"

export type Severity = "high" | "medium" | "low"
export type IssueStatus = "open" | "in-review" | "resolved"
export type IssueKind = "duplicate" | "missing" | "mismatch" | "unreconciled" | "feed" | "dependency" | "rounding" | "data-quality"
export type IssueArea = "Bank" | "Payables" | "Receivables" | "GST" | "Payroll" | "Jobs & WIP" | "Contacts" | "Tracking" | "Conversion"

export interface EvidenceRow {
  field: string
  qbo?: string
  xero?: string
  /** Bank statement or Gojee value, when the issue involves a third source */
  source?: string
  /** True when this row is where the sources disagree */
  differs?: boolean
}

export interface Issue {
  id: string
  title: string
  kind: IssueKind
  area: IssueArea
  severity: Severity
  status: IssueStatus
  /** Transaction / event date */
  date: string
  /** When the AI QA engine first flagged it (ISO date-time) */
  detectedAt: string
  resolvedAt?: string
  /** Absolute dollar impact */
  amount: number
  /** QBO account codes affected */
  accounts: string[]
  qboRef: string | null
  xeroRef: string | null
  /** Third source: "Bank statement · Westpac" or "Gojee · Job J-1042" */
  sourceLabel?: string
  sourceRef?: string
  evidence: EvidenceRow[]
  /** The engine's reasoning, in plain words */
  finding: string
  recommendation: string
  /** 0–1 */
  confidence: number
  /** Needs a person to decide (vs auto-fixable) */
  needsReview: boolean
  effects: { code: string; amount: number }[]
}

function at(iso: string, hour: number): string {
  return `${iso}T${String(hour).padStart(2, "0")}:00:00`
}

/** Clamp an offset date so it is never after today */
function day(offset: number): string {
  const d = addDays(conversionDate(), offset)
  return d > todayISO() ? todayISO() : d
}

let cache: { key: string; list: Issue[] } | null = null

export function issues(): Issue[] {
  const key = todayISO() + lastRunAt().toISOString()
  if (cache?.key === key) return cache.list
  const today = todayISO()
  const latestRun = lastRunAt()
  const latest = `${today}T${String(latestRun.getHours()).padStart(2, "0")}:00:00`
  const gap = [addDays(today, -5), addDays(today, -4), addDays(today, -4), addDays(today, -3)]

  const list: Issue[] = [
    {
      id: "EX-1041",
      title: "Duplicate Bunnings Trade transaction in Xero",
      kind: "duplicate",
      area: "Bank",
      severity: "high",
      status: "open",
      date: day(9),
      detectedAt: at(day(10), 8),
      amount: 1284.5,
      accounts: ["1010", "5010", "2200"],
      qboRef: "Expense #8812",
      xeroRef: "Spend Money SM-3307 and SM-3309",
      sourceLabel: "Bank statement · Westpac Business One",
      sourceRef: "Statement line 98123344",
      evidence: [
        { field: "Date", qbo: day(9), xero: `${day(9)} (×2)`, source: day(9) },
        { field: "Payee", qbo: "Bunnings Trade Alexandria", xero: "Bunnings Trade Alexandria", source: "BUNNINGS TRADE 4421 ALEXANDRIA" },
        { field: "Amount", qbo: "$1,284.50", xero: "$1,284.50 + $1,284.50", source: "$1,284.50", differs: true },
        { field: "Transactions", qbo: "1", xero: "2", source: "1 statement line", differs: true },
        { field: "Account", qbo: "5010 Materials & Supplies", xero: "310 Materials & Supplies" },
      ],
      finding:
        "The bank statement has one Bunnings Trade line for $1,284.50, and QuickBooks has one matching expense. Xero has two Spend Money transactions with the same date, payee and amount. The second was created when the bank feed line was coded manually and then auto-matched again.",
      recommendation: "Delete SM-3309 in Xero and re-run bank reconciliation for that day. Materials and GST will then agree with QuickBooks.",
      confidence: 0.98,
      needsReview: false,
      effects: [
        { code: "5010", amount: 1167.73 },
        { code: "2200", amount: 116.77 },
        { code: "1010", amount: -1284.5 },
      ],
    },
    {
      id: "EX-1043",
      title: "Rexel bill entered in QuickBooks but missing from Xero",
      kind: "missing",
      area: "Payables",
      severity: "high",
      status: "open",
      date: day(12),
      detectedAt: at(day(13), 10),
      amount: 8912.4,
      accounts: ["2000", "5010", "2200"],
      qboRef: "Bill RX-559310",
      xeroRef: null,
      evidence: [
        { field: "Supplier", qbo: "Rexel Electrical Supplies", xero: "— not found —", differs: true },
        { field: "Bill number", qbo: "RX-559310", xero: "— not found —", differs: true },
        { field: "Amount (incl. GST)", qbo: "$8,912.40", xero: "$0.00", differs: true },
        { field: "Due date", qbo: day(42), xero: "—" },
        { field: "Entered by", qbo: "Accounts team, after the conversion date", xero: "—" },
      ],
      finding:
        "This supplier bill was entered in QuickBooks after the conversion date and was never keyed into Xero. Accounts Payable, Materials & Supplies and GST are therefore understated in Xero by the bill amount.",
      recommendation: "Enter bill RX-559310 in Xero (or forward the PDF to the Xero bills inbox). From now on, enter new bills in Xero only.",
      confidence: 0.96,
      needsReview: true,
      effects: [
        { code: "5010", amount: -8102.18 },
        { code: "2200", amount: -810.22 },
        { code: "2000", amount: 8912.4 },
      ],
    },
    {
      id: "EX-1044",
      title: "GST coded differently on invoice INV-4821",
      kind: "mismatch",
      area: "GST",
      severity: "medium",
      status: "in-review",
      date: day(14),
      detectedAt: at(day(15), 6),
      amount: 480,
      accounts: ["4010", "2200"],
      qboRef: "Invoice INV-4821",
      xeroRef: "Invoice INV-4821",
      evidence: [
        { field: "Customer", qbo: "Northshore Builders Pty Ltd", xero: "Northshore Builders Pty Ltd" },
        { field: "Total", qbo: "$5,280.00", xero: "$5,280.00" },
        { field: "Tax code", qbo: "GST on Income (10%)", xero: "GST Free Income", differs: true },
        { field: "GST amount", qbo: "$480.00", xero: "$0.00", differs: true },
        { field: "Revenue (ex GST)", qbo: "$4,800.00", xero: "$5,280.00", differs: true },
      ],
      finding:
        "Same invoice, same total, but Xero has it as GST-free. Revenue is overstated in Xero by $480 and the GST on sales for this quarter's BAS is understated by $480.",
      recommendation: "Change the tax rate on INV-4821 in Xero to GST on Income. The customer total does not change.",
      confidence: 0.93,
      needsReview: true,
      effects: [
        { code: "4010", amount: -480 },
        { code: "2200", amount: 480 },
      ],
    },
    {
      id: "EX-1047",
      title: "Amex feed gap in Xero: 4 transactions missing",
      kind: "feed",
      area: "Bank",
      severity: "high",
      status: "open",
      date: gap[0],
      detectedAt: latest,
      amount: 2140.95,
      accounts: ["2110", "6031", "6150", "6080", "2200"],
      qboRef: "4 Credit Card Expenses (#9120–#9123)",
      xeroRef: null,
      sourceLabel: "Bank statement · Amex Business Card",
      sourceRef: `Statement lines ${gap[0]} to ${gap[3]}`,
      evidence: [
        { field: `${gap[0]} · Ampol Rosebery`, qbo: "$612.40", xero: "— missing —", source: "$612.40", differs: true },
        { field: `${gap[1]} · Officeworks Alexandria`, qbo: "$318.55", xero: "— missing —", source: "$318.55", differs: true },
        { field: `${gap[2]} · Microsoft 365 Business`, qbo: "$1,060.00", xero: "— missing —", source: "$1,060.00", differs: true },
        { field: `${gap[3]} · Ampol Mascot`, qbo: "$150.00", xero: "— missing —", source: "$150.00", differs: true },
        { field: "Feed status", xero: "Amex feed reconnected after 3 days", source: "4 lines in the statement" },
      ],
      finding:
        "The Amex feed into Xero stopped for three days and reconnected without back-filling. QuickBooks still received the card feed, and the four lines are on the Amex statement, so the gap is on the Xero side only.",
      recommendation: "Import the Amex statement for these dates into Xero (Manage account → Import a statement), then code the four lines.",
      confidence: 0.97,
      needsReview: false,
      effects: [
        { code: "6031", amount: -693.09 },
        { code: "6150", amount: -289.59 },
        { code: "6080", amount: -963.64 },
        { code: "2200", amount: -194.63 },
        { code: "2110", amount: 2140.95 },
      ],
    },
    {
      id: "EX-1045",
      title: "Transfer to Saver recorded in QuickBooks only",
      kind: "unreconciled",
      area: "Bank",
      severity: "medium",
      status: "open",
      date: day(15),
      detectedAt: at(day(16), 12),
      amount: 15000,
      accounts: ["1010", "1020"],
      qboRef: "Transfer #T-1182",
      xeroRef: "2 unreconciled statement lines",
      sourceLabel: "Bank statements · Westpac",
      sourceRef: "Business One −$15,000 / Business Saver +$15,000",
      evidence: [
        { field: "Westpac Business One", qbo: "−$15,000.00", xero: "Statement line not reconciled", source: "−$15,000.00", differs: true },
        { field: "Westpac Business Saver", qbo: "+$15,000.00", xero: "Statement line not reconciled", source: "+$15,000.00", differs: true },
        { field: "Bank balances (combined)", qbo: "Unchanged", xero: "Unchanged", source: "Unchanged" },
      ],
      finding:
        "Both statement lines arrived in Xero but have not been reconciled as a transfer, so Business One is overstated and Business Saver understated by $15,000 in Xero. The combined bank balance is still correct.",
      recommendation: "In Xero bank reconciliation, match both lines using 'Transfer' between the two Westpac accounts.",
      confidence: 0.99,
      needsReview: false,
      effects: [
        { code: "1020", amount: -15000 },
        { code: "1010", amount: 15000 },
      ],
    },
    {
      id: "EX-1048",
      title: "Gojee job WIP not relieved after progress claim",
      kind: "dependency",
      area: "Jobs & WIP",
      severity: "medium",
      status: "in-review",
      date: day(18),
      detectedAt: at(day(19), 14),
      amount: 12650,
      accounts: ["1300", "4010"],
      qboRef: "Project: Macquarie Park fit-out",
      xeroRef: "Invoice INV-4836 (synced from Gojee)",
      sourceLabel: "Gojee · Job J-1042",
      sourceRef: "Progress claim #3",
      evidence: [
        { field: "Progress claim #3", qbo: "$12,650.00 invoiced", xero: "$12,650.00 invoiced", source: "Claim raised, $12,650.00" },
        { field: "WIP balance after claim", qbo: "1300 Work in Progress: no change (no WIP journal in QBO)", xero: "635 Work in Progress: no change", source: "Job ledger: WIP should fall by $12,650.00", differs: true },
        { field: "Dependency", source: "Gojee → Xero invoice sync OK, WIP journal not sent", differs: true },
      ],
      finding:
        "Gojee raised the progress claim and the invoice synced to Xero correctly, but Gojee's WIP release journal did not post. Xero's Work in Progress balance depends on that journal, so it is $12,650 higher than the job ledger in Gojee.",
      recommendation: "In Gojee, re-send the WIP journal for J-1042 claim #3 (Job → Accounting → Resend), or post a manual journal in Xero.",
      confidence: 0.88,
      needsReview: true,
      effects: [],
    },
    {
      id: "EX-1046",
      title: "7 Xero bank lines unreconciled for more than 7 days",
      kind: "unreconciled",
      area: "Bank",
      severity: "medium",
      status: "open",
      date: day(17),
      detectedAt: at(day(25), 8),
      amount: 3418.2,
      accounts: ["1010"],
      qboRef: "7 reconciled transactions",
      xeroRef: "7 statement lines awaiting reconciliation",
      sourceLabel: "Bank statement · Westpac Business One",
      evidence: [
        { field: "Lines older than 7 days", qbo: "0", xero: "7", source: "7 on the statement", differs: true },
        { field: "Total value", qbo: "$3,418.20 reconciled", xero: "$3,418.20 unreconciled", source: "$3,418.20", differs: true },
        { field: "Oldest line", xero: day(17) },
      ],
      finding:
        "These lines are reconciled in QuickBooks but still waiting in Xero. They don't change the Xero bank balance yet, but they will distort reports until coded.",
      recommendation: "Reconcile the 7 lines in Xero. All 7 have a suggested match from Xero's bank rules.",
      confidence: 0.95,
      needsReview: false,
      effects: [],
    },
    {
      id: "EX-1049",
      title: "Customer exists twice in Xero",
      kind: "data-quality",
      area: "Contacts",
      severity: "low",
      status: "open",
      date: day(6),
      detectedAt: at(day(7), 16),
      amount: 0,
      accounts: ["1100"],
      qboRef: "Customer: Northshore Builders Pty Ltd",
      xeroRef: "Contacts: 'Northshore Builders Pty Ltd' and 'Northshore Builders'",
      evidence: [
        { field: "Contacts", qbo: "1", xero: "2", differs: true },
        { field: "ABN", qbo: "71 602 118 345", xero: "71 602 118 345 (both)" },
        { field: "Open invoices", qbo: "6", xero: "4 + 2 split across contacts", differs: true },
      ],
      finding: "A second contact was created in Xero when an invoice was raised by hand. Aged Receivables per customer won't match QuickBooks until they are merged.",
      recommendation: "Merge 'Northshore Builders' into 'Northshore Builders Pty Ltd' in Xero (Contacts → Merge).",
      confidence: 0.91,
      needsReview: false,
      effects: [],
    },
    {
      id: "EX-1050",
      title: "12 Xero lines missing the Location tracking category",
      kind: "data-quality",
      area: "Tracking",
      severity: "low",
      status: "open",
      date: day(20),
      detectedAt: at(day(21), 10),
      amount: 18240,
      accounts: ["4020", "4030"],
      qboRef: "Location set on all lines",
      xeroRef: "12 invoice lines with no Location",
      evidence: [
        { field: "Lines with Location", qbo: "100%", xero: "12 lines blank", differs: true },
        { field: "Value untracked", qbo: "$0.00", xero: "$18,240.00", differs: true },
        { field: "Totals", qbo: "Agree", xero: "Agree" },
      ],
      finding: "Totals agree, but 'Profit & Loss by Location' in Xero puts $18,240 under 'Unassigned'. The QBO Location → Xero tracking category mapping is fine; these were new invoices raised in Xero without it.",
      recommendation: "Set Location on the 12 lines, and make Location mandatory on the Xero invoice template.",
      confidence: 0.9,
      needsReview: false,
      effects: [],
    },
    {
      id: "EX-1042",
      title: "Payroll journal rounding difference",
      kind: "rounding",
      area: "Payroll",
      severity: "low",
      status: "open",
      date: day(13),
      detectedAt: at(day(14), 6),
      amount: 0.02,
      accounts: ["6060", "2230"],
      qboRef: "Journal PR-2611",
      xeroRef: "Pay run 14 (posted)",
      evidence: [
        { field: "Gross wages", qbo: "$31,406.18", xero: "$31,406.20", differs: true },
        { field: "Difference", qbo: "", xero: "$0.02" },
      ],
      finding: "Xero Payroll rounds per employee; the QuickBooks journal rounds the total. Immaterial, but logged so the trial balances tie to the cent.",
      recommendation: "No action needed. Accept the variance, or post a $0.02 adjustment in QuickBooks during the parallel run.",
      confidence: 0.99,
      needsReview: false,
      effects: [
        { code: "6060", amount: 0.02 },
        { code: "2230", amount: -0.02 },
      ],
    },
    {
      id: "EX-1039",
      title: "Payment applied to the wrong invoice in Xero",
      kind: "mismatch",
      area: "Receivables",
      severity: "medium",
      status: "resolved",
      date: day(4),
      detectedAt: at(day(5), 12),
      resolvedAt: at(day(6), 9),
      amount: 2200,
      accounts: ["1100"],
      qboRef: "Payment applied to INV-4795",
      xeroRef: "Payment applied to INV-4790",
      evidence: [
        { field: "Customer", qbo: "Harbour City Strata", xero: "Harbour City Strata" },
        { field: "Applied to", qbo: "INV-4795", xero: "INV-4790 → corrected to INV-4795", differs: true },
      ],
      finding: "Totals agreed but per-invoice ageing did not. Fixed by re-allocating the payment in Xero.",
      recommendation: "Resolved.",
      confidence: 0.97,
      needsReview: false,
      effects: [],
    },
    {
      id: "EX-1038",
      title: "Opening balance equity reclass confirmed",
      kind: "mismatch",
      area: "Conversion",
      severity: "low",
      status: "resolved",
      date: day(0),
      detectedAt: at(day(1), 8),
      resolvedAt: at(day(1), 15),
      amount: 0,
      accounts: ["3000", "3200"],
      qboRef: "Opening Balance Equity $0.00",
      xeroRef: "Retained Earnings",
      evidence: [{ field: "Opening Balance Equity", qbo: "$0.00", xero: "Reclassed to 960 Retained Earnings" }],
      finding: "Conversion check: QuickBooks Opening Balance Equity is nil and was mapped to Retained Earnings. Trial balances agree at the conversion date.",
      recommendation: "Resolved.",
      confidence: 1,
      needsReview: false,
      effects: [],
    },
  ]
  list.sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : -1))
  cache = { key, list }
  return list
}

export function openIssues(): Issue[] {
  return issues().filter((i) => i.status !== "resolved")
}

export const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 }

export const KIND_LABEL: Record<IssueKind, string> = {
  duplicate: "Duplicate",
  missing: "Missing entry",
  mismatch: "Mismatch",
  unreconciled: "Unreconciled",
  feed: "Bank feed",
  dependency: "Source dependency",
  rounding: "Rounding",
  "data-quality": "Data quality",
}

/** Xero-minus-QBO effects of all unresolved issues, with each issue's date */
export function activeEffects(): { date: string; code: string; amount: number; issueId: string }[] {
  return issues()
    .filter((i) => i.status !== "resolved")
    .flatMap((i) => i.effects.map((e) => ({ ...e, date: i.date, issueId: i.id })))
}
