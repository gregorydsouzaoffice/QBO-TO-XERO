/**
 * Migration demo data: the pre-migration scan of QuickBooks Online, history
 * scope windows, mapping tables (accounts come from chart.ts) and what is not
 * migrated. Every name is invented. Money that appears in the ledger
 * (inventory value, WIP, AR, AP) is tied back to ledger.ts so it agrees with
 * the trial balance.
 */
import {
  addDays,
  fyLabel,
  fyOf,
  fyStart,
  INCEPTION_DATE,
  INCEPTION_PERIOD,
  lastDayOfPeriod,
  migratedThrough,
  periodLabel,
  periodRange,
} from "../clock"
import { round2 } from "../format"
import type { HistoryScope } from "../demo-store"
import { CHART } from "./chart"
import { balancesAt, natural, plBetween } from "./ledger"

// ---------------------------------------------------------------------------
// Wizard steps

export const WIZARD_STEPS = [
  { n: 1, slug: "connect", title: "Connect", text: "QuickBooks Online, Xero and Gojee" },
  { n: 2, slug: "scope", title: "Scope", text: "History and conversion date" },
  { n: 3, slug: "map", title: "Map", text: "Accounts, GST, tracking, items, jobs" },
  { n: 4, slug: "validate", title: "Validate", text: "Trial balance, P&L, balance sheet" },
  { n: 5, slug: "import", title: "Import", text: "Into Xero, then Gojee" },
  { n: 6, slug: "go-live", title: "Go live", text: "Checklist and reports" },
] as const

export function stepHref(n: number): string {
  const s = WIZARD_STEPS[Math.min(Math.max(n, 1), 6) - 1]
  return `/migration/${s.slug}`
}

// ---------------------------------------------------------------------------
// History scope

export const HISTORY_OPTIONS: { key: HistoryScope; label: string; text: string }[] = [
  { key: "all", label: `All history (since ${periodLabel(INCEPTION_PERIOD)})`, text: "Every transaction since the QuickBooks file was opened. Slowest, most complete." },
  { key: "3fy", label: "Last 3 financial years", text: "Full detail for the last three financial years. Earlier years come across as monthly balances." },
  { key: "2fy", label: "Last 2 financial years", text: "Full detail for the last two financial years. Earlier years come across as monthly balances." },
  { key: "balances", label: "Opening balances only", text: "Balances at the conversion date plus open invoices and bills. Monthly balances for comparatives." },
]

export interface ScopeWindow {
  scope: HistoryScope
  /** First day of full transaction detail, null for balances only */
  detailFrom: string | null
  /** Monthly comparative balances (summary journals), null when not needed */
  summaryFrom: string | null
  summaryTo: string | null
  summaryMonths: number
  /** Earliest date Xero reports will show figures for */
  comparativeFrom: string
  /** Last day of migrated history */
  through: string
  /** Financial years Xero will hold figures for, oldest first */
  fys: number[]
  /** Financial years before comparativeFrom that stay in the QuickBooks archive */
  archivedFys: number[]
  /** One-line description */
  describe: string
}

function maxIso(a: string, b: string) {
  return a > b ? a : b
}

export function scopeWindow(scope: HistoryScope): ScopeWindow {
  const through = migratedThrough()
  const cf = fyOf(through)
  let detailFrom: string | null = INCEPTION_DATE
  let summaryFrom: string | null = null
  let summaryTo: string | null = null
  if (scope === "3fy" || scope === "2fy") {
    detailFrom = maxIso(fyStart(cf - (scope === "3fy" ? 2 : 1)), INCEPTION_DATE)
    if (detailFrom > INCEPTION_DATE) {
      summaryFrom = INCEPTION_DATE
      summaryTo = addDays(detailFrom, -1)
    }
  } else if (scope === "balances") {
    detailFrom = null
    summaryFrom = maxIso(fyStart(cf - 1), INCEPTION_DATE)
    summaryTo = through
  }
  const comparativeFrom = summaryFrom ?? detailFrom ?? through
  const summaryMonths = summaryFrom && summaryTo ? periodRange(summaryFrom.slice(0, 7), summaryTo.slice(0, 7)).length : 0
  const fys: number[] = []
  for (let fy = fyOf(comparativeFrom); fy <= cf; fy++) fys.push(fy)
  const archivedFys: number[] = []
  for (let fy = fyOf(INCEPTION_DATE); fy < fyOf(comparativeFrom); fy++) archivedFys.push(fy)

  const range = (a: number, b: number) => (a === b ? fyLabel(a) : `${fyLabel(a)}–${fyLabel(b)}`)
  let describe = ""
  if (scope === "all") describe = `Full detail ${range(fyOf(INCEPTION_DATE), cf)}`
  else if (scope === "balances") describe = `Balances at ${fmt(through)} with monthly comparatives ${range(fys[0], cf)}`
  else describe = `Full detail ${range(fyOf(detailFrom!), cf)}${summaryMonths ? `, monthly balances ${range(fyOf(INCEPTION_DATE), fyOf(summaryTo!))}` : ""}`

  return { scope, detailFrom, summaryFrom, summaryTo, summaryMonths, comparativeFrom, through, fys, archivedFys, describe }
}

/** Share of all activity since inception that falls between two dates (activity grows ~14% a year) */
function activityShare(from: string, to: string): number {
  const months = periodRange(INCEPTION_PERIOD, migratedThrough().slice(0, 7))
  const w = (i: number) => Math.pow(1.14, i / 12)
  let all = 0
  let part = 0
  months.forEach((p, i) => {
    all += w(i)
    if (p >= from.slice(0, 7) && p <= to.slice(0, 7)) part += w(i)
  })
  return all ? part / all : 0
}

// ---------------------------------------------------------------------------
// Pre-migration scan of QuickBooks Online

export type Destination = "xero" | "gojee"

export interface QboEntity {
  key: string
  /** Plain name shown on screen */
  name: string
  /** QuickBooks Online API entity */
  qboEntity: string
  kind: "list" | "txn"
  /** Records since inception */
  total: number
  /** Open at the conversion date (used for balances only, and for "open only" entities) */
  open?: number
  /** Only open records migrate whatever the history choice (closed ones are archived) */
  openOnly?: boolean
  destination: Destination
  /** What it becomes in the destination */
  becomes: string
  note?: string
}

export const QBO_ENTITIES: QboEntity[] = [
  { key: "accounts", name: "Accounts", qboEntity: "Account", kind: "list", total: CHART.length, destination: "xero", becomes: "Chart of accounts", note: "Sub-accounts flattened, header accounts not needed" },
  { key: "customers", name: "Customers", qboEntity: "Customer", kind: "list", total: 412, destination: "xero", becomes: "Contacts (customers)", note: "9 duplicates merged; shared with Gojee through Xero" },
  { key: "vendors", name: "Vendors", qboEntity: "Vendor", kind: "list", total: 167, destination: "xero", becomes: "Contacts (suppliers)", note: "4 duplicates merged" },
  { key: "employees", name: "Employees", qboEntity: "Employee", kind: "list", total: 23, destination: "xero", becomes: "Employees (details only)", note: "Pay history archived, not migrated" },
  { key: "items-service", name: "Items: service and non-inventory", qboEntity: "Item", kind: "list", total: 138, destination: "xero", becomes: "Items (untracked)" },
  { key: "items-inventory", name: "Items: inventory", qboEntity: "Item", kind: "list", total: 214, destination: "gojee", becomes: "Stock items with quantities", note: "Inventory value stays in Xero account 630" },
  { key: "invoices", name: "Invoices", qboEntity: "Invoice", kind: "txn", total: 8642, open: 84, destination: "xero", becomes: "Sales invoices" },
  { key: "credit-memos", name: "Credit memos", qboEntity: "CreditMemo", kind: "txn", total: 212, open: 6, destination: "xero", becomes: "Credit notes" },
  { key: "sales-receipts", name: "Sales receipts", qboEntity: "SalesReceipt", kind: "txn", total: 1318, open: 0, destination: "xero", becomes: "Receive money transactions" },
  { key: "refund-receipts", name: "Refund receipts", qboEntity: "RefundReceipt", kind: "txn", total: 74, open: 0, destination: "xero", becomes: "Spend money (refunds)" },
  { key: "payments", name: "Payments received", qboEntity: "Payment", kind: "txn", total: 7904, open: 0, destination: "xero", becomes: "Invoice payments" },
  { key: "bills", name: "Bills", qboEntity: "Bill", kind: "txn", total: 5480, open: 61, destination: "xero", becomes: "Bills" },
  { key: "vendor-credits", name: "Vendor credits", qboEntity: "VendorCredit", kind: "txn", total: 158, open: 4, destination: "xero", becomes: "Supplier credit notes" },
  { key: "bill-payments", name: "Bill payments", qboEntity: "BillPayment", kind: "txn", total: 4960, open: 0, destination: "xero", becomes: "Bill payments" },
  { key: "expenses", name: "Expenses and cheques", qboEntity: "Purchase", kind: "txn", total: 9850, open: 0, destination: "xero", becomes: "Spend money transactions" },
  { key: "deposits", name: "Deposits", qboEntity: "Deposit", kind: "txn", total: 1140, open: 0, destination: "xero", becomes: "Receive money transactions" },
  { key: "transfers", name: "Transfers", qboEntity: "Transfer", kind: "txn", total: 486, open: 0, destination: "xero", becomes: "Bank transfers" },
  { key: "journals", name: "Journal entries", qboEntity: "JournalEntry", kind: "txn", total: 1236, open: 1, destination: "xero", becomes: "Manual journals", note: "Balances only: one conversion balance journal" },
  { key: "estimates", name: "Estimates", qboEntity: "Estimate", kind: "txn", total: 2940, open: 37, openOnly: true, destination: "gojee", becomes: "Quotes (open only)", note: "Closed estimates archived as PDF" },
  { key: "purchase-orders", name: "Purchase orders", qboEntity: "PurchaseOrder", kind: "txn", total: 1710, open: 22, openOnly: true, destination: "gojee", becomes: "Purchase orders (open only)", note: "Closed POs archived as PDF" },
  { key: "projects", name: "Projects", qboEntity: "Project", kind: "list", total: 146, open: 18, destination: "gojee", becomes: "Jobs", note: "18 open, 128 completed" },
  { key: "time", name: "Time activities", qboEntity: "TimeActivity", kind: "txn", total: 18600, open: 1240, destination: "gojee", becomes: "Timesheets" },
  { key: "attachments", name: "Attachments", qboEntity: "Attachable", kind: "txn", total: 21480, open: 310, destination: "xero", becomes: "Files on the matching transaction", note: "38 files over 10 MB compressed" },
  { key: "classes", name: "Classes", qboEntity: "Class", kind: "list", total: 9, destination: "xero", becomes: "Tracking category 1: Division" },
  { key: "locations", name: "Locations", qboEntity: "Department", kind: "list", total: 3, destination: "xero", becomes: "Tracking category 2: Location" },
]

/** Records that migrate for a history choice */
export function entityCount(e: QboEntity, scope: HistoryScope): number {
  if (e.kind === "list") return e.total
  if (e.openOnly) return e.open ?? 0
  const w = scopeWindow(scope)
  if (!w.detailFrom) return e.open ?? 0
  return Math.round(e.total * activityShare(w.detailFrom, w.through))
}

export interface ScanRow extends QboEntity {
  migrating: number
  /** Gojee switched off: these records are archived instead */
  archived: boolean
}

export function scanRows(scope: HistoryScope, gojeeEnabled: boolean): ScanRow[] {
  return QBO_ENTITIES.map((e) => ({ ...e, migrating: gojeeEnabled || e.destination !== "gojee" ? entityCount(e, scope) : 0, archived: !gojeeEnabled && e.destination === "gojee" }))
}

export function scanTotals(scope: HistoryScope, gojeeEnabled: boolean) {
  const rows = scanRows(scope, gojeeEnabled)
  const xero = rows.filter((r) => r.destination === "xero").reduce((t, r) => t + r.migrating, 0)
  const gojee = rows.filter((r) => r.destination === "gojee").reduce((t, r) => t + r.migrating, 0)
  const inQbo = rows.reduce((t, r) => t + r.total, 0)
  const summaryJournals = scopeWindow(scope).summaryMonths
  return { xero: xero + summaryJournals, gojee, inQbo, summaryJournals, total: xero + gojee + summaryJournals }
}

// ---------------------------------------------------------------------------
// Pre-conversion checklist (results of the scan at the conversion date)

export interface PreCheck {
  key: string
  title: string
  detail: string
  status: "pass" | "warning"
}

export function preConversionChecks(): PreCheck[] {
  const through = migratedThrough()
  const b = balancesAt(through, "qbo")
  const ar = natural("1100", b["1100"])
  const ap = natural("2000", b["2000"])
  const gst = natural("2200", b["2200"])
  const fy = fyOf(through)
  const uncategorised = plBetween(fyStart(fy), through)["6990"] ?? 0
  // Last day of the most recent BAS quarter (Sep, Dec, Mar, Jun) on or before the conversion
  const qMonth = Math.floor((Number(through.slice(5, 7)) - 1 + (lastDayOfPeriod(through.slice(0, 7)) === through ? 1 : 0)) / 3) * 3
  const lastQEnd = qMonth === 0 ? `${Number(through.slice(0, 4)) - 1}-12-31` : lastDayOfPeriod(`${through.slice(0, 4)}-${String(qMonth).padStart(2, "0")}`)
  return [
    { key: "freeze", title: "QuickBooks closing date set", detail: `Closing date of ${fmt(through)} found, so migrated history can't change.`, status: "pass" },
    { key: "bank", title: "Westpac accounts reconciled to the conversion date", detail: `Business One and Business Saver are reconciled to ${fmt(through)}.`, status: "pass" },
    { key: "card", title: "Amex card reconciled", detail: `Reconciled to ${fmt(addDays(through, -6))}. 7 card transactions from the last week still need reconciling before import.`, status: "warning" },
    { key: "undeposited", title: "Undeposited Funds cleared", detail: `Balance is ${money(natural("1099", b["1099"]))} at ${fmt(through)}.`, status: Math.abs(b["1099"]) < 0.005 ? "pass" : "warning" },
    { key: "ar", title: "Accounts receivable reviewed", detail: `${OPEN_COUNTS.invoices} open invoices and ${OPEN_COUNTS.creditMemos} open credit memos totalling ${money(ar)}. They come across as open items in Xero.`, status: "pass" },
    { key: "ap", title: "Accounts payable reviewed", detail: `${OPEN_COUNTS.bills} open bills and ${OPEN_COUNTS.vendorCredits} vendor credits totalling ${money(ap)}.`, status: "pass" },
    { key: "gst", title: "GST balance agrees to the last BAS", detail: `BAS lodged for the quarter ending ${fmt(lastQEnd)}. GST payable of ${money(gst)} moves to the Xero GST account.`, status: "pass" },
    { key: "inventory", title: "Inventory quantities", detail: `3 items show negative quantity on hand. Count them and post a stock adjustment, or we set them to zero in Gojee. Inventory value ${money(inventoryValue())}.`, status: "warning" },
    { key: "uncategorised", title: "Uncategorised Expense", detail: `${money(uncategorised)} posted to Uncategorised Expense in ${fyLabel(fy)}. It maps to Xero 429 General Expenses unless reclassified first.`, status: uncategorised > 0 ? "warning" : "pass" },
  ]
}

const OPEN_COUNTS = { invoices: 84, creditMemos: 6, bills: 61, vendorCredits: 4 }

function fmt(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${y}`
}
function money(n: number) {
  const s = new Intl.NumberFormat("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))
  return n < 0 ? `($${s})` : `$${s}`
}

// ---------------------------------------------------------------------------
// Tax codes: QuickBooks Online (AU) → Xero tax rates

export interface TaxMap {
  qboCode: string
  qboName: string
  rate: string
  appliesTo: "Sales" | "Purchases" | "Both"
  xeroName: string
  xeroType: string
  basLabel: string
  transactions: number
  note?: string
}

export const TAX_CODES: TaxMap[] = [
  { qboCode: "GST", qboName: "GST (sales)", rate: "10%", appliesTo: "Sales", xeroName: "GST on Income", xeroType: "OUTPUT", basLabel: "G1, 1A", transactions: 9821 },
  { qboCode: "GST", qboName: "GST (purchases)", rate: "10%", appliesTo: "Purchases", xeroName: "GST on Expenses", xeroType: "INPUT", basLabel: "G11, 1B", transactions: 17432 },
  { qboCode: "CAP", qboName: "GST on capital purchases", rate: "10%", appliesTo: "Purchases", xeroName: "GST on Capital", xeroType: "CAPEXINPUT", basLabel: "G10, 1B", transactions: 64 },
  { qboCode: "FRE", qboName: "GST free (sales)", rate: "0%", appliesTo: "Sales", xeroName: "GST Free Income", xeroType: "EXEMPTOUTPUT", basLabel: "G3", transactions: 311 },
  { qboCode: "FRE", qboName: "GST free (purchases)", rate: "0%", appliesTo: "Purchases", xeroName: "GST Free Expenses", xeroType: "EXEMPTEXPENSES", basLabel: "G14", transactions: 2207 },
  { qboCode: "EXP", qboName: "Export", rate: "0%", appliesTo: "Sales", xeroName: "GST Free Exports", xeroType: "EXEMPTEXPORT", basLabel: "G2", transactions: 3 },
  { qboCode: "INP", qboName: "Input taxed", rate: "0%", appliesTo: "Both", xeroName: "Input Taxed", xeroType: "INPUTTAXED", basLabel: "G4, G13", transactions: 182 },
  { qboCode: "N-T", qboName: "Out of scope / not reportable", rate: "0%", appliesTo: "Both", xeroName: "BAS Excluded", xeroType: "BASEXCLUDED", basLabel: "Not on BAS", transactions: 6240 },
  { qboCode: "GSTI", qboName: "GST on imports", rate: "10%", appliesTo: "Purchases", xeroName: "GST on Imports", xeroType: "GSTONIMPORTS", basLabel: "1B", transactions: 12 },
  { qboCode: "ADJ", qboName: "GST adjustments", rate: "n/a", appliesTo: "Both", xeroName: "BAS Excluded (manual journal)", xeroType: "BASEXCLUDED", basLabel: "Adjustment", transactions: 9, note: "QBO tax adjustments become manual journals to the Xero GST account" },
]

// ---------------------------------------------------------------------------
// Tracking: Classes → Division, Locations → Location (Xero allows 2 categories)

export interface TrackingMap {
  qbo: string
  xeroOption: string
  transactions: number
  note?: string
}

export const CLASS_MAP: TrackingMap[] = [
  { qbo: "Commercial", xeroOption: "Commercial", transactions: 11840 },
  { qbo: "Commercial:Fit-outs", xeroOption: "Commercial - Fit-outs", transactions: 3214, note: "Sub-class flattened" },
  { qbo: "Commercial:Strata", xeroOption: "Commercial - Strata", transactions: 1987, note: "Sub-class flattened" },
  { qbo: "Residential", xeroOption: "Residential", transactions: 9612 },
  { qbo: "Residential:Solar & Batteries", xeroOption: "Residential - Solar & Batteries", transactions: 1450, note: "Sub-class flattened" },
  { qbo: "Data & Comms", xeroOption: "Data & Comms", transactions: 4105 },
  { qbo: "Maintenance", xeroOption: "Maintenance", transactions: 2870 },
  { qbo: "Admin / Overhead", xeroOption: "Overhead", transactions: 6322 },
  { qbo: "Old - Do not use", xeroOption: "(archived option)", transactions: 41, note: "Inactive in QBO; option created then archived in Xero" },
]

export const LOCATION_MAP: TrackingMap[] = [
  { qbo: "Alexandria (head office)", xeroOption: "Alexandria", transactions: 24180 },
  { qbo: "Parramatta", xeroOption: "Parramatta", transactions: 12460 },
  { qbo: "Central Coast", xeroOption: "Central Coast", transactions: 4801 },
]

// ---------------------------------------------------------------------------
// Contacts

export interface ContactMap {
  qboName: string
  type: "Customer" | "Vendor"
  abn: string
  xeroName: string
  action: "Migrate" | "Merge" | "Migrate as archived"
  note?: string
}

export const CONTACT_COUNTS = {
  customers: { qbo: 412, active: 286, inactive: 126, merged: 9 },
  vendors: { qbo: 167, active: 118, inactive: 49, merged: 4 },
  employees: { qbo: 23, active: 17 },
}

export const CONTACT_SAMPLE: ContactMap[] = [
  { qboName: "Ironbark Developments Pty Ltd", type: "Customer", abn: "41 603 118 772", xeroName: "Ironbark Developments Pty Ltd", action: "Migrate" },
  { qboName: "Coastline Builders", type: "Customer", abn: "77 129 664 018", xeroName: "Coastline Builders Pty Ltd", action: "Merge", note: "Merged with “Coastline Builders Pty Ltd” (same ABN)" },
  { qboName: "Strata Plan 61234 – Bondi", type: "Customer", abn: "", xeroName: "Strata Plan 61234 – Bondi", action: "Migrate" },
  { qboName: "Redfern Medical Centre", type: "Customer", abn: "18 552 907 341", xeroName: "Redfern Medical Centre", action: "Migrate" },
  { qboName: "Pinnacle Fitouts", type: "Customer", abn: "63 610 245 199", xeroName: "Pinnacle Fitouts Pty Ltd", action: "Merge", note: "Merged with “Pinnacle Fit-outs P/L” (same ABN)" },
  { qboName: "Northside Childcare Group", type: "Customer", abn: "29 144 870 553", xeroName: "Northside Childcare Group", action: "Migrate" },
  { qboName: "J. Whitfield (residential)", type: "Customer", abn: "", xeroName: "J. Whitfield (residential)", action: "Migrate as archived", note: "Inactive in QBO" },
  { qboName: "Southern Cross Electrical Wholesale", type: "Vendor", abn: "52 008 410 336", xeroName: "Southern Cross Electrical Wholesale", action: "Migrate" },
  { qboName: "Metro Cable Supplies", type: "Vendor", abn: "34 611 980 225", xeroName: "Metro Cable Supplies Pty Ltd", action: "Merge", note: "Merged with “Metro Cable Supplies Pty Ltd” (same ABN)" },
  { qboName: "Lumen Lighting Distributors", type: "Vendor", abn: "90 147 223 604", xeroName: "Lumen Lighting Distributors", action: "Migrate" },
  { qboName: "Harbour Data Systems", type: "Vendor", abn: "15 620 774 093", xeroName: "Harbour Data Systems", action: "Migrate" },
  { qboName: "Hire-It Equipment Rentals", type: "Vendor", abn: "47 098 321 650", xeroName: "Hire-It Equipment Rentals", action: "Migrate" },
]

/** Customers with open invoices at the conversion date, as shares of AR */
export const AR_CUSTOMERS: { name: string; share: number }[] = [
  { name: "Ironbark Developments Pty Ltd", share: 0.14 },
  { name: "Coastline Builders Pty Ltd", share: 0.11 },
  { name: "Pinnacle Fitouts Pty Ltd", share: 0.07 },
  { name: "Strata Plan 61234 – Bondi", share: 0.06 },
  { name: "Redfern Medical Centre", share: 0.05 },
  { name: "Northside Childcare Group", share: 0.04 },
  { name: "Marrickville Brewing Co", share: 0.03 },
]
export const AR_OTHER_CUSTOMERS = 41

export const AP_SUPPLIERS: { name: string; share: number }[] = [
  { name: "Southern Cross Electrical Wholesale", share: 0.31 },
  { name: "Metro Cable Supplies Pty Ltd", share: 0.16 },
  { name: "Lumen Lighting Distributors", share: 0.09 },
  { name: "Sparkright Subcontracting", share: 0.08 },
  { name: "Harbour Data Systems", share: 0.06 },
  { name: "Hire-It Equipment Rentals", share: 0.03 },
]
export const AP_OTHER_SUPPLIERS = 27

/** Ageing buckets as shares of the balance at the conversion date */
export const AGEING_BUCKETS = ["Current", "1–30 days", "31–60 days", "61–90 days", "Over 90 days"] as const
export const AR_AGEING = [0.56, 0.25, 0.11, 0.05, 0.03]
export const AP_AGEING = [0.64, 0.24, 0.08, 0.03, 0.01]

/** Split an amount by shares so the parts add back exactly */
export function splitByShares(total: number, shares: number[]): number[] {
  const parts = shares.map((s) => round2(total * s))
  const sum = parts.reduce((t, p) => t + p, 0)
  parts[parts.length - 1] = round2(parts[parts.length - 1] + total - sum)
  return parts
}

// ---------------------------------------------------------------------------
// Items

export interface ServiceItem {
  code: string
  name: string
  qboType: "Service" | "Non-inventory"
  price: number
  cost?: number
  xeroAccount: string
  tax: string
}

export const SERVICE_ITEMS: ServiceItem[] = [
  { code: "LAB-ELEC", name: "Electrician – standard hour", qboType: "Service", price: 118, xeroAccount: "201", tax: "GST on Income" },
  { code: "LAB-APP", name: "Apprentice – standard hour", qboType: "Service", price: 68, xeroAccount: "201", tax: "GST on Income" },
  { code: "CALLOUT", name: "Call-out fee", qboType: "Service", price: 95, xeroAccount: "201", tax: "GST on Income" },
  { code: "CALLOUT-AH", name: "After-hours call-out", qboType: "Service", price: 185, xeroAccount: "201", tax: "GST on Income" },
  { code: "SWB-UPG", name: "Switchboard upgrade (fixed price)", qboType: "Service", price: 1850, xeroAccount: "200", tax: "GST on Income" },
  { code: "DATA-CAT6", name: "Data point – Cat6 supply and install", qboType: "Service", price: 165, xeroAccount: "202", tax: "GST on Income" },
  { code: "TT-ITEM", name: "Test and tag – per item", qboType: "Service", price: 4.5, xeroAccount: "203", tax: "GST on Income" },
  { code: "EML-TEST", name: "Emergency lighting test – per fitting", qboType: "Service", price: 12, xeroAccount: "203", tax: "GST on Income" },
  { code: "SUNDRY", name: "Sundry materials", qboType: "Non-inventory", price: 0, cost: 0, xeroAccount: "310", tax: "GST on Expenses" },
  { code: "PERMIT", name: "Council / network permit fee", qboType: "Non-inventory", price: 0, cost: 0, xeroAccount: "310", tax: "GST Free Expenses" },
]

export interface InventoryItem {
  sku: string
  name: string
  qty: number
  avgCost: number
  location: string
}

const INVENTORY_TOP: InventoryItem[] = [
  { sku: "CAB-TPS25-100", name: "2.5mm² TPS cable, 100 m roll", qty: 46, avgCost: 189.5, location: "Alexandria" },
  { sku: "CAB-TPS15-100", name: "1.5mm² TPS cable, 100 m roll", qty: 38, avgCost: 132.8, location: "Alexandria" },
  { sku: "CAB-CAT6-305", name: "Cat6 cable, 305 m box", qty: 21, avgCost: 214.0, location: "Parramatta" },
  { sku: "RCBO-1P-20", name: "RCBO 1-pole 20A 30mA", qty: 140, avgCost: 38.9, location: "Alexandria" },
  { sku: "DL-LED-10W", name: "LED downlight 10W tri-colour", qty: 360, avgCost: 14.6, location: "Alexandria" },
  { sku: "GPO-DBL-WHT", name: "Double power point, white", qty: 420, avgCost: 7.85, location: "Parramatta" },
  { sku: "SWB-24P-ENC", name: "Switchboard enclosure 24-pole", qty: 12, avgCost: 268.0, location: "Alexandria" },
  { sku: "SMK-240-RF", name: "Smoke alarm 240V, RF interconnect", qty: 85, avgCost: 52.4, location: "Central Coast" },
]

export const INVENTORY_ITEM_COUNT = 214

/** Inventory value at the conversion date from the QBO ledger (account 1200 → Xero 630) */
export function inventoryValue(): number {
  return round2(balancesAt(migratedThrough(), "qbo")["1200"] ?? 0)
}

/** Top inventory items plus a balancing "other items" line that ties to the ledger */
export function inventoryItems(): { rows: (InventoryItem & { value: number })[]; other: { count: number; value: number }; total: number } {
  const total = inventoryValue()
  let rows = INVENTORY_TOP.map((i) => ({ ...i, value: round2(i.qty * i.avgCost) }))
  const top = rows.reduce((t, r) => t + r.value, 0)
  if (top > total * 0.8) {
    // keep the sample comfortably inside the ledger value
    const f = (total * 0.6) / top
    rows = rows.map((r) => {
      const qty = Math.max(1, Math.round(r.qty * f))
      return { ...r, qty, value: round2(qty * r.avgCost) }
    })
  }
  const sum = round2(rows.reduce((t, r) => t + r.value, 0))
  return { rows, other: { count: INVENTORY_ITEM_COUNT - rows.length, value: round2(total - sum) }, total }
}

// ---------------------------------------------------------------------------
// Projects → Gojee jobs, estimates → quotes, purchase orders

export interface ProjectMap {
  qboName: string
  customer: string
  status: "Open" | "Completed"
  /** Days before the conversion date the project started */
  startDaysAgo: number
  gojeeJob: string
  /** Share of WIP at the conversion date (open projects only) */
  wipShare: number
  income: number
  costs: number
}

export const PROJECTS: ProjectMap[] = [
  { qboName: "Alexandria warehouse fit-out – Stage 2", customer: "Ironbark Developments Pty Ltd", status: "Open", startDaysAgo: 150, gojeeJob: "J-2418", wipShare: 0.24, income: 186400, costs: 142950 },
  { qboName: "Bondi strata switchboard upgrades", customer: "Strata Plan 61234 – Bondi", status: "Open", startDaysAgo: 95, gojeeJob: "J-2431", wipShare: 0.09, income: 48200, costs: 31480 },
  { qboName: "Redfern Medical Centre – new consulting suites", customer: "Redfern Medical Centre", status: "Open", startDaysAgo: 70, gojeeJob: "J-2437", wipShare: 0.14, income: 72650, costs: 58210 },
  { qboName: "Pinnacle – Level 4 office fit-out", customer: "Pinnacle Fitouts Pty Ltd", status: "Open", startDaysAgo: 60, gojeeJob: "J-2440", wipShare: 0.12, income: 64300, costs: 49870 },
  { qboName: "Northside Childcare – Lane Cove centre", customer: "Northside Childcare Group", status: "Open", startDaysAgo: 40, gojeeJob: "J-2446", wipShare: 0.07, income: 21900, costs: 17640 },
  { qboName: "Marrickville Brewing – brewhouse power", customer: "Marrickville Brewing Co", status: "Open", startDaysAgo: 28, gojeeJob: "J-2449", wipShare: 0.05, income: 15800, costs: 12260 },
  { qboName: "Coastline – Gosford townhouses (12 units)", customer: "Coastline Builders Pty Ltd", status: "Completed", startDaysAgo: 260, gojeeJob: "J-2311", wipShare: 0, income: 214800, costs: 158330 },
  { qboName: "Ironbark – St Peters industrial park", customer: "Ironbark Developments Pty Ltd", status: "Completed", startDaysAgo: 330, gojeeJob: "J-2276", wipShare: 0, income: 302150, costs: 236900 },
]
export const PROJECT_COUNTS = { total: 146, open: 18, completed: 128 }

/** WIP at the conversion date (QBO 1300 → Xero 635) */
export function wipValue(): number {
  return round2(balancesAt(migratedThrough(), "qbo")["1300"] ?? 0)
}

export interface QuoteMap {
  qboRef: string
  customer: string
  title: string
  amount: number
  expires: number
  gojeeRef: string
}

export const OPEN_ESTIMATES: QuoteMap[] = [
  { qboRef: "EST-3311", customer: "Ironbark Developments Pty Ltd", title: "Stage 3 lighting and power", amount: 128400, expires: 21, gojeeRef: "Q-3311" },
  { qboRef: "EST-3318", customer: "Strata Plan 48810 – Manly", title: "EV charger backbone, 18 bays", amount: 46250, expires: 14, gojeeRef: "Q-3318" },
  { qboRef: "EST-3322", customer: "Redfern Medical Centre", title: "Emergency lighting replacement", amount: 9860, expires: 30, gojeeRef: "Q-3322" },
  { qboRef: "EST-3325", customer: "Harbourside Dental", title: "Fit-out electrical and data", amount: 38700, expires: 28, gojeeRef: "Q-3325" },
  { qboRef: "EST-3327", customer: "M. & K. Papadopoulos", title: "Solar 10 kW + battery", amount: 21480, expires: 10, gojeeRef: "Q-3327" },
  { qboRef: "EST-3330", customer: "Northside Childcare Group", title: "Chatswood centre switchboard", amount: 7340, expires: 25, gojeeRef: "Q-3330" },
]

export interface PoMap {
  qboRef: string
  supplier: string
  job: string
  amount: number
  received: string
  gojeeRef: string
}

export const OPEN_POS: PoMap[] = [
  { qboRef: "PO-1702", supplier: "Southern Cross Electrical Wholesale", job: "J-2418", amount: 18640, received: "Partly received", gojeeRef: "PO-1702" },
  { qboRef: "PO-1705", supplier: "Lumen Lighting Distributors", job: "J-2437", amount: 9420, received: "Not received", gojeeRef: "PO-1705" },
  { qboRef: "PO-1707", supplier: "Metro Cable Supplies Pty Ltd", job: "J-2440", amount: 6215, received: "Not received", gojeeRef: "PO-1707" },
  { qboRef: "PO-1708", supplier: "Harbour Data Systems", job: "J-2440", amount: 4380, received: "Partly received", gojeeRef: "PO-1708" },
  { qboRef: "PO-1710", supplier: "Southern Cross Electrical Wholesale", job: "J-2446", amount: 3960, received: "Not received", gojeeRef: "PO-1710" },
]

// ---------------------------------------------------------------------------
// Not migrated, and what happens instead

export const NOT_MIGRATED: { what: string; why: string; instead: string }[] = [
  { what: "Payroll history (pay runs, payslips, STP lodgements)", why: "Xero Payroll can't import QuickBooks pay runs", instead: "PDF and CSV archive of every pay run. Year-to-date totals entered in Xero Payroll so STP carries on." },
  { what: "Recurring transaction templates", why: "No import route into Xero", instead: "Listed on the go-live checklist; recreate as repeating invoices and bills in Xero." },
  { what: "Bank rules", why: "Rules are system-specific", instead: "Exported list of all 64 rules to recreate as Xero bank rules." },
  { what: "Budgets", why: "Not part of the transaction migration", instead: "CSV export ready to import into Xero's budget manager." },
  { what: "Audit log", why: "Belongs to the QuickBooks file", instead: "PDF and CSV archive. QuickBooks stays available read-only during the parallel run." },
  { what: "Reconciliation reports", why: "Xero starts reconciled at the conversion date", instead: "PDF archive of every reconciliation report by account and month." },
  { what: "Custom fields", why: "Xero has no matching field", instead: "Values copied into the transaction reference or notes, plus a CSV archive." },
  { what: "Closed estimates and purchase orders", why: "Only open ones are useful in Gojee", instead: "PDF archive, searchable by number and customer." },
  { what: "Users and permissions", why: "Sign-ins are per system", instead: "Invite users in Xero and Gojee (go-live checklist)." },
]

// ---------------------------------------------------------------------------
// Chart mapping notes

export function chartMapNote(code: string): { tone: "info" | "warning" | "muted"; text: string } | null {
  const a = CHART.find((x) => x.code === code)
  if (!a) return null
  if (a.header) return { tone: "muted", text: "Header account, no postings: not migrated" }
  if (a.system) return { tone: "warning", text: a.system }
  if (a.parent) return { tone: "info", text: `Sub-account of ${a.parent}, flattened` }
  return null
}

export const SUB_ACCOUNT_COUNT = CHART.filter((a) => a.parent).length
export const HEADER_ACCOUNT_COUNT = CHART.filter((a) => a.header).length
export const SYSTEM_ACCOUNT_COUNT = CHART.filter((a) => a.system).length

/** Large attachments compressed during import */
export const ATTACHMENTS = { over10mb: 38, largestMb: 46.2, savedMb: 1180 }
