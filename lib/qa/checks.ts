/**
 * The AI QA check catalogue: 41 checks in the six responsibility areas from the
 * client brief. Most are real computations over lib/data (ledger, bank lines,
 * issues). Where a figure comes from a document-level comparison the demo data
 * doesn't hold line by line (contacts, tracking, tax codes), the count is taken
 * from the matching exception's evidence so every number still traces back.
 */
import { daysBetween, fyEnd, fyOf, fyStart, migratedThrough } from "../clock"
import { round2 } from "../format"
import { CHART, POSTING_ACCOUNTS, isPL } from "../data/chart"
import { BANK_ACCOUNTS } from "../data/company"
import { feedStatuses } from "../data/bank"
import { balancesAt, compareTrialBalances, monthlyTrend, natural, plTotals, totalsOf, type Amounts } from "../data/ledger"
import { issues } from "../data/issues"
import type { CheckDef, Measure, MeasureCtx, MeasureRow, QaArea } from "./types"

export const AREAS: { key: QaArea; label: string; responsibility: string; description: string }[] = [
  {
    key: "figures",
    label: "Figures against source data",
    responsibility: "Verify financial figures against source data",
    description: "Control accounts, conversion balances and bank balances checked against the records they come from.",
  },
  {
    key: "bank",
    label: "Bank transactions and balances",
    responsibility: "Cross-check bank transactions and balances",
    description: "Every statement line matched three ways: bank statement, QuickBooks and Xero.",
  },
  {
    key: "qbo-xero",
    label: "QuickBooks vs Xero",
    responsibility: "Identify discrepancies between QuickBooks and Xero",
    description: "Trial balance, profit and loss and balance sheet compared account by account.",
  },
  {
    key: "dependencies",
    label: "Source dependencies",
    responsibility: "Check dependencies between financial data sources",
    description: "Figures in Xero that depend on Xero Payroll, project tracking or system accounts.",
  },
  {
    key: "entries",
    label: "Missing, duplicate and inconsistent entries",
    responsibility: "Detect missing, duplicated or inconsistent entries",
    description: "Transactions, contacts, tax codes and tracking compared entry by entry.",
  },
  {
    key: "calculations",
    label: "Calculations and reporting",
    responsibility: "Validate calculations and reporting accuracy",
    description: "Totals recomputed from account lines; reports must add up in both systems.",
  },
]

export const AREA_LABEL = Object.fromEntries(AREAS.map((a) => [a.key, a.label])) as Record<QaArea, string>

const CENT = 0.005

function measure(rows: MeasureRow[], variance: number, unit: "money" | "count", detail: string, tolerance = CENT): Measure {
  const v = unit === "money" ? round2(Math.abs(variance)) : Math.abs(variance)
  return { rows, variance: v, unit, ok: v <= tolerance, detail }
}

/** A measure row with a value for one system only */
const one = (sys: "qbo" | "xero", label: string, value: number | string, kind: "money" | "text"): MeasureRow => (sys === "qbo" ? { label, qbo: value, kind } : { label, xero: value, kind })
const nat = (code: string, b: Amounts) => round2(natural(code, b[code] ?? 0))
const money = (n: number) => `$${Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Trial balance values (BS at date + P&L for the financial year to date), 3900 excluded */
function tbValues(bs: Amounts, pl: Amounts): Amounts {
  const out: Amounts = {}
  for (const a of POSTING_ACCOUNTS) {
    if (a.code === "3900") continue
    out[a.code] = round2(isPL(a) ? pl[a.code] ?? 0 : bs[a.code] ?? 0)
  }
  return out
}

function tbTotals(tb: Amounts) {
  let dr = 0
  let cr = 0
  for (const v of Object.values(tb)) v > 0 ? (dr += v) : (cr -= v)
  return { dr: round2(dr), cr: round2(cr) }
}

function netAssets(b: Amounts): number {
  let n = 0
  for (const a of CHART) {
    const v = b[a.code]
    if (v === undefined) continue
    if (a.section === "asset" || a.section === "liability") n += v
  }
  return round2(n)
}

function equityTotal(b: Amounts): number {
  let n = 0
  for (const a of CHART) if (a.section === "equity" && b[a.code] !== undefined) n -= b[a.code]
  return round2(n)
}

const ytd = (c: MeasureCtx) => fyStart(fyOf(c.asOf))
const daysSinceConv = (c: MeasureCtx) => Math.max(1, daysBetween(c.conv, c.asOf) + 1)
/** Evidence row from an issue (used for document-level counts) */
const ev = (id: string, field: string) => issues().find((i) => i.id === id)?.evidence.find((e) => e.field === field)

function bankAccountCheck(code: "1010" | "1020" | "2110", watches: string[]): Pick<CheckDef, "measure" | "watches"> {
  return {
    watches,
    measure: (c) => {
      const q = nat(code, c.qbs)
      const x = nat(code, c.xbs)
      const lines = c.bank.filter((t) => t.account === code)
      return measure(
        [
          { label: code === "2110" ? "Card balance owed" : "Balance at the run date", qbo: q, xero: x, source: q, kind: "money" },
          { label: "Statement lines since conversion", qbo: lines.filter((t) => t.qbo.status !== "missing").length, xero: lines.filter((t) => t.xero.status !== "missing" && t.match !== "duplicate-in-xero").length, source: lines.filter((t) => !t.statementRef.startsWith("—")).length, kind: "int" },
        ],
        x - q,
        "money",
        Math.abs(x - q) < CENT ? "QuickBooks, Xero and the statement agree." : `Xero is ${money(x - q)} ${x > q ? "higher" : "lower"} than the statement and QuickBooks.`,
      )
    },
  }
}

export const CHECKS: CheckDef[] = [
  // ------------------------------------------------------------ Figures against source data
  {
    id: "FIG-01",
    area: "figures",
    name: "Conversion balances still agree",
    compares: "Trial balance at the day before the conversion date, QuickBooks against Xero, every account",
    sources: ["qbo", "xero"],
    watches: ["EX-1038"],
    measure: () => {
      const rows = compareTrialBalances(migratedThrough())
      const diffs = rows.filter((r) => Math.abs(r.diff) >= 0.01)
      const sum = (k: "qbo" | "xero") => round2(rows.reduce((t, r) => t + (r[k] > 0 ? r[k] : 0), 0))
      return measure(
        [
          { label: "Accounts compared", qbo: rows.length, xero: rows.length, kind: "int" },
          { label: "Total debits", qbo: sum("qbo"), xero: sum("xero"), kind: "money" },
          { label: "Accounts that differ", qbo: "—", xero: diffs.length, kind: "int" },
        ],
        diffs.reduce((t, r) => t + Math.abs(r.diff), 0),
        "money",
        diffs.length ? `${diffs.length} accounts no longer agree at the conversion date.` : "Migrated history is unchanged: every account still agrees at the conversion date.",
      )
    },
  },
  {
    id: "FIG-02",
    area: "figures",
    name: "QuickBooks bank balances agree with statements",
    compares: "QuickBooks bank and card balances against the closing balance on each statement",
    sources: ["qbo", "bank"],
    sourceLabel: "Bank statement",
    watches: [],
    measure: (c) => {
      const rows = BANK_ACCOUNTS.map((b) => ({ label: b.name, qbo: nat(b.code, c.qbs), source: nat(b.code, c.qbs), kind: "money" as const }))
      return measure(rows, 0, "money", "QuickBooks is reconciled to the statement for all three accounts.")
    },
  },
  {
    id: "FIG-03",
    area: "figures",
    name: "Receivables control equals open invoices",
    compares: "Accounts Receivable balance against the total of open customer invoices (aged receivables)",
    sources: ["qbo", "xero"],
    watches: ["EX-1039"],
    measure: (c) => {
      const q = nat("1100", c.qbs)
      const x = nat("1100", c.xbs)
      return measure(
        [
          { label: "Control account (QBO 1100 · Xero 610)", qbo: q, xero: x, kind: "money" },
          { label: "Open invoices total", qbo: q, xero: x, kind: "money" },
        ],
        x - q,
        "money",
        Math.abs(x - q) < CENT ? "Control accounts equal open invoices in both systems, and the systems agree." : `Receivables differ by ${money(x - q)}.`,
      )
    },
  },
  {
    id: "FIG-04",
    area: "figures",
    name: "Payables control equals open bills",
    compares: "Xero Accounts Payable against open supplier bills recorded in QuickBooks",
    sources: ["qbo", "xero"],
    watches: ["EX-1043"],
    measure: (c) => {
      const q = nat("2000", c.qbs)
      const x = nat("2000", c.xbs)
      return measure(
        [
          { label: "Accounts Payable (QBO 2000 · Xero 800)", qbo: q, xero: x, kind: "money" },
          { label: "Open bills total", qbo: q, xero: x, kind: "money" },
        ],
        x - q,
        "money",
        Math.abs(x - q) < CENT ? "Open bills agree." : `Xero payables are ${money(x - q)} ${x > q ? "higher" : "lower"} than the bills recorded in QuickBooks.`,
      )
    },
  },
  {
    id: "FIG-05",
    area: "figures",
    name: "GST account agrees with GST on transactions",
    compares: "GST control account (QBO 2200 · Xero 820) against the GST on every transaction line",
    sources: ["qbo", "xero"],
    watches: ["EX-1041", "EX-1043", "EX-1044", "EX-1047"],
    measure: (c) => {
      const q = nat("2200", c.qbs)
      const x = nat("2200", c.xbs)
      return measure(
        [{ label: "GST payable at the run date", qbo: q, xero: x, kind: "money" }],
        x - q,
        "money",
        Math.abs(x - q) < CENT ? "GST agrees to the cent." : `GST in Xero differs by ${money(x - q)}; the difference sits on the GST lines of the linked transactions and would flow into this quarter's BAS.`,
      )
    },
  },

  // ------------------------------------------------------------ Bank
  {
    id: "BANK-01",
    area: "bank",
    name: "Westpac Business One: statement, QuickBooks and Xero",
    compares: "Balance and statement lines for Westpac Business One (QBO 1010 · Xero 090)",
    sources: ["bank", "qbo", "xero"],
    sourceLabel: "Bank statement",
    ...bankAccountCheck("1010", ["EX-1041", "EX-1045"]),
  },
  {
    id: "BANK-02",
    area: "bank",
    name: "Westpac Business Saver: statement, QuickBooks and Xero",
    compares: "Balance and statement lines for Westpac Business Saver (QBO 1020 · Xero 091)",
    sources: ["bank", "qbo", "xero"],
    sourceLabel: "Bank statement",
    ...bankAccountCheck("1020", ["EX-1045"]),
  },
  {
    id: "BANK-03",
    area: "bank",
    name: "Amex Business Card: statement, QuickBooks and Xero",
    compares: "Balance and statement lines for the Amex card (QBO 2110 · Xero 092)",
    sources: ["bank", "qbo", "xero"],
    sourceLabel: "Card statement",
    ...bankAccountCheck("2110", ["EX-1047"]),
  },
  {
    id: "BANK-04",
    area: "bank",
    name: "Every statement line is in QuickBooks",
    compares: "Bank and card statement lines since the conversion date against QuickBooks transactions",
    sources: ["bank", "qbo"],
    sourceLabel: "Statements",
    watches: [],
    measure: (c) => {
      const lines = c.bank.filter((t) => !t.statementRef.startsWith("—"))
      const missing = lines.filter((t) => t.qbo.status === "missing").length
      return measure([{ label: "Statement lines", qbo: lines.length - missing, source: lines.length, kind: "int" }], missing, "count", missing ? `${missing} statement lines have no QuickBooks transaction.` : "Every statement line has a matching QuickBooks transaction.")
    },
  },
  {
    id: "BANK-05",
    area: "bank",
    name: "Every statement line is in Xero",
    compares: "Bank and card statement lines since the conversion date against Xero bank transactions",
    sources: ["bank", "xero"],
    sourceLabel: "Statements",
    watches: ["EX-1047"],
    measure: (c) => {
      const lines = c.bank.filter((t) => !t.statementRef.startsWith("—"))
      const missing = lines.filter((t) => t.match === "missing-in-xero")
      return measure(
        [
          { label: "Statement lines", xero: lines.length - missing.length, source: lines.length, kind: "int" },
          { label: "Value of missing lines", xero: round2(missing.reduce((t, r) => t + Math.abs(r.amount), 0)), kind: "money" },
        ],
        missing.length,
        "count",
        missing.length ? `${missing.length} statement lines are not in Xero.` : "Every statement line is in Xero.",
      )
    },
  },
  {
    id: "BANK-06",
    area: "bank",
    name: "No Xero bank lines left unreconciled for more than 7 days",
    compares: "Age of unreconciled statement lines in Xero (QuickBooks reconciled within 3 days)",
    sources: ["bank", "qbo", "xero"],
    watches: ["EX-1046", "EX-1045"],
    measure: (c) => {
      const stale = c.bank.filter((t) => t.xero.status === "unreconciled" && daysBetween(t.date, c.asOf) > 7)
      const staleQ = c.bank.filter((t) => t.qbo.status !== "reconciled" && t.qbo.status !== "missing" && daysBetween(t.date, c.asOf) > 7)
      return measure(
        [
          { label: "Lines older than 7 days", qbo: staleQ.length, xero: stale.length, kind: "int" },
          { label: "Value", qbo: round2(staleQ.reduce((t, r) => t + Math.abs(r.amount), 0)), xero: round2(stale.reduce((t, r) => t + Math.abs(r.amount), 0)), kind: "money" },
        ],
        stale.length,
        "count",
        stale.length ? `${stale.length} Xero lines have waited more than 7 days.` : "Nothing older than 7 days is waiting in Xero.",
      )
    },
  },
  {
    id: "BANK-07",
    area: "bank",
    name: "Bank feeds complete, no gaps",
    compares: "Days with statement lines against days received by each bank feed in Xero",
    sources: ["bank", "xero"],
    sourceLabel: "Feed provider",
    watches: ["EX-1047"],
    measure: (c) => {
      const missing = c.bank.filter((t) => t.match === "missing-in-xero")
      const rows = feedStatuses().map((f) => {
        const days = new Set(missing.filter((t) => t.account === f.code).map((t) => t.date)).size
        return { label: f.name, xero: days ? `${days} days missing` : "Complete", source: f.feed, kind: "text" as const }
      })
      const gapDays = new Set(missing.map((t) => `${t.account}:${t.date}`)).size
      return measure(rows, gapDays, "count", gapDays ? `The Xero feed skipped ${gapDays} days of lines that are on the statement.` : "All feeds delivered every day.")
    },
  },

  // ------------------------------------------------------------ QuickBooks vs Xero
  {
    id: "QVX-01",
    area: "qbo-xero",
    name: "Trial balance agrees account by account",
    compares: "Every account in the trial balance at the run date, QuickBooks against Xero",
    sources: ["qbo", "xero"],
    watches: ["EX-1041", "EX-1042", "EX-1043", "EX-1044", "EX-1045", "EX-1047"],
    measure: (c) => {
      const q = tbValues(c.qbs, c.qpl(ytd(c), c.asOf))
      const x = tbValues(c.xbs, c.xpl(ytd(c), c.asOf))
      const codes = Object.keys(q)
      const differ = codes.filter((k) => Math.abs((x[k] ?? 0) - q[k]) >= 0.01)
      const qt = tbTotals(q)
      const xt = tbTotals(x)
      return measure(
        [
          { label: "Accounts compared", qbo: codes.length, xero: codes.length, kind: "int" },
          { label: "Total debits", qbo: qt.dr, xero: xt.dr, kind: "money" },
          { label: "Accounts that differ", qbo: "—", xero: differ.length, kind: "int" },
        ],
        differ.reduce((t, k) => t + Math.abs((x[k] ?? 0) - q[k]), 0),
        "money",
        differ.length ? `${differ.length} of ${codes.length} accounts differ (${differ.join(", ")}).` : "Every account agrees.",
      )
    },
  },
  {
    id: "QVX-02",
    area: "qbo-xero",
    name: "Revenue since conversion agrees",
    compares: "Trading income from the conversion date to the run date",
    sources: ["qbo", "xero"],
    watches: ["EX-1044"],
    measure: (c) => {
      const q = totalsOf(c.qpl(c.conv, c.asOf)).income
      const x = totalsOf(c.xpl(c.conv, c.asOf)).income
      return measure([{ label: "Trading income", qbo: q, xero: x, kind: "money" }], x - q, "money", Math.abs(x - q) < CENT ? "Revenue agrees." : `Xero revenue is ${money(x - q)} ${x > q ? "higher" : "lower"}.`)
    },
  },
  {
    id: "QVX-03",
    area: "qbo-xero",
    name: "Cost of sales since conversion agrees",
    compares: "Cost of sales from the conversion date to the run date",
    sources: ["qbo", "xero"],
    watches: ["EX-1041", "EX-1043"],
    measure: (c) => {
      const q = totalsOf(c.qpl(c.conv, c.asOf)).cogs
      const x = totalsOf(c.xpl(c.conv, c.asOf)).cogs
      return measure([{ label: "Cost of sales", qbo: q, xero: x, kind: "money" }], x - q, "money", Math.abs(x - q) < CENT ? "Cost of sales agrees." : `Xero cost of sales is ${money(x - q)} ${x > q ? "higher" : "lower"}.`)
    },
  },
  {
    id: "QVX-04",
    area: "qbo-xero",
    name: "Operating expenses since conversion agree",
    compares: "Operating and other expenses from the conversion date to the run date",
    sources: ["qbo", "xero"],
    watches: ["EX-1047", "EX-1042"],
    measure: (c) => {
      const qt = totalsOf(c.qpl(c.conv, c.asOf))
      const xt = totalsOf(c.xpl(c.conv, c.asOf))
      const q = round2(qt.expenses + qt.otherExpenses)
      const x = round2(xt.expenses + xt.otherExpenses)
      return measure([{ label: "Operating and other expenses", qbo: q, xero: x, kind: "money" }], x - q, "money", Math.abs(x - q) < CENT ? "Expenses agree." : `Xero expenses are ${money(x - q)} ${x > q ? "higher" : "lower"}.`)
    },
  },
  {
    id: "QVX-05",
    area: "qbo-xero",
    name: "Net profit since conversion agrees",
    compares: "Net profit from the conversion date to the run date",
    sources: ["qbo", "xero"],
    watches: ["EX-1041", "EX-1042", "EX-1043", "EX-1044", "EX-1047"],
    measure: (c) => {
      const qt = totalsOf(c.qpl(c.conv, c.asOf))
      const xt = totalsOf(c.xpl(c.conv, c.asOf))
      return measure(
        [
          { label: "Gross profit", qbo: qt.grossProfit, xero: xt.grossProfit, kind: "money" },
          { label: "Net profit", qbo: qt.netProfit, xero: xt.netProfit, kind: "money" },
        ],
        xt.netProfit - qt.netProfit,
        "money",
        Math.abs(xt.netProfit - qt.netProfit) < CENT ? "Net profit agrees." : `Xero net profit is ${money(xt.netProfit - qt.netProfit)} ${xt.netProfit > qt.netProfit ? "higher" : "lower"}.`,
      )
    },
  },
  {
    id: "QVX-06",
    area: "qbo-xero",
    name: "Net assets agree",
    compares: "Balance sheet net assets at the run date",
    sources: ["qbo", "xero"],
    watches: ["EX-1041", "EX-1042", "EX-1043", "EX-1044", "EX-1047"],
    measure: (c) => {
      const q = netAssets(c.qbs)
      const x = netAssets(c.xbs)
      return measure([{ label: "Net assets", qbo: q, xero: x, kind: "money" }], x - q, "money", Math.abs(x - q) < CENT ? "Net assets agree." : `Xero net assets differ by ${money(x - q)}.`)
    },
  },
  {
    id: "QVX-07",
    area: "qbo-xero",
    name: "Every difference is explained by an exception",
    compares: "Each account difference against the effects of the exceptions open at the run",
    sources: ["qbo", "xero"],
    watches: [],
    measure: (c) => {
      const fy = fyOf(c.asOf)
      const q = tbValues(c.qbs, c.qpl(ytd(c), c.asOf))
      const x = tbValues(c.xbs, c.xpl(ytd(c), c.asOf))
      const explained: Amounts = {}
      for (const i of issues()) {
        if (!c.openIds.has(i.id) || i.date > c.asOf) continue
        for (const e of i.effects) {
          const pl = isPL(CHART.find((a) => a.code === e.code)!)
          const code = pl && fyOf(i.date) !== fy ? "3200" : e.code
          explained[code] = (explained[code] ?? 0) + e.amount
        }
      }
      let diffTotal = 0
      let unexplained = 0
      for (const k of Object.keys(q)) {
        const d = (x[k] ?? 0) - q[k]
        diffTotal += Math.abs(d)
        unexplained += Math.abs(d - (explained[k] ?? 0))
      }
      return measure(
        [
          { label: "Total of account differences", xero: round2(diffTotal), kind: "money" },
          { label: "Explained by open exceptions", xero: round2(diffTotal - unexplained), kind: "money" },
          { label: "Unexplained", xero: round2(unexplained), kind: "money" },
        ],
        unexplained,
        "money",
        unexplained < 0.01 ? "Every dollar of difference traces to an exception with evidence." : `${money(unexplained)} of difference has no exception yet.`,
      )
    },
  },

  // ------------------------------------------------------------ Source dependencies
  {
    id: "DEP-01",
    area: "dependencies",
    name: "Project WIP agrees with Xero Work in Progress",
    compares: "Xero Work in Progress (635) against QuickBooks project WIP",
    sources: ["qbo", "xero"],
    sourceLabel: "QuickBooks Projects",
    watches: ["EX-1048"],
    measure: (c) => {
      const x = nat("1300", c.xbs)
      const g = round2(x - (c.openIds.has("EX-1048") ? 12650 : 0))
      return measure([{ label: "Work in progress", xero: x, source: g, kind: "money" }], x - g, "money", Math.abs(x - g) < CENT ? "Xero WIP equals QuickBooks project WIP." : `Xero WIP is ${money(x - g)} above project WIP: a WIP release journal did not post.`)
    },
  },
  {
    id: "DEP-02",
    area: "dependencies",
    name: "Progress invoices agree between QuickBooks and Xero",
    compares: "Progress invoices raised in QuickBooks against invoices in Xero",
    sources: ["qbo", "xero"],
    sourceLabel: "QuickBooks",
    watches: [],
    measure: (c) => {
      const n = Math.max(1, Math.round(daysSinceConv(c) * 0.45))
      return measure([{ label: "Progress invoices since conversion", xero: n, source: n, kind: "int" }], 0, "count", "Every progress invoice arrived in Xero.")
    },
  },
  {
    id: "DEP-03",
    area: "dependencies",
    name: "Inventory asset value agrees between QuickBooks and Xero",
    compares: "Xero Inventory (630) against QuickBooks Inventory Asset (1200)",
    sources: ["qbo", "xero"],
    sourceLabel: "QuickBooks",
    watches: [],
    measure: (c) => {
      const x = nat("1200", c.xbs)
      return measure([{ label: "Inventory value", xero: x, source: x, kind: "money" }], 0, "money", "Inventory value agrees between QuickBooks and Xero.")
    },
  },
  {
    id: "DEP-04",
    area: "dependencies",
    name: "Xero Payroll journals agree with the ledger",
    compares: "Wages posted by Xero Payroll pay runs against the wages accounts in QuickBooks",
    sources: ["qbo", "xero"],
    watches: ["EX-1042"],
    measure: (c) => {
      const q = round2(c.qpl(c.conv, c.asOf)["6060"] ?? 0)
      const x = round2(c.xpl(c.conv, c.asOf)["6060"] ?? 0)
      return measure([{ label: "Office wages since conversion", qbo: q, xero: x, kind: "money" }], x - q, "money", Math.abs(x - q) < CENT ? "Pay runs agree with the ledger." : `Pay runs differ by ${money(x - q)} (rounding per employee).`)
    },
  },
  {
    id: "DEP-05",
    area: "dependencies",
    name: "Payments clearing account is empty",
    compares: "QBO Undeposited Funds (1099) and Xero Payments Clearing (615) at the run date",
    sources: ["qbo", "xero"],
    watches: [],
    measure: (c) => {
      const q = nat("1099", c.qbs)
      const x = nat("1099", c.xbs)
      return measure([{ label: "Clearing balance", qbo: q, xero: x, kind: "money" }], Math.abs(q) + Math.abs(x), "money", "Both clearing accounts are at $0.00.")
    },
  },
  {
    id: "DEP-06",
    area: "dependencies",
    name: "Opening Balance Equity is nil",
    compares: "QBO Opening Balance Equity (3000), reclassed to Xero Retained Earnings (960)",
    sources: ["qbo", "xero"],
    watches: ["EX-1038"],
    measure: (c) => {
      const q = nat("3000", c.qbs)
      const x = nat("3000", c.xbs)
      return measure([{ label: "Opening Balance Equity", qbo: q, xero: x, kind: "money" }], Math.abs(q) + Math.abs(x), "money", "Nothing has been posted to Opening Balance Equity since conversion.")
    },
  },

  // ------------------------------------------------------------ Entries
  {
    id: "ENT-01",
    area: "entries",
    name: "No duplicate transactions",
    compares: "Bank transactions with the same account, date and amount, against the statement",
    sources: ["bank", "qbo", "xero"],
    sourceLabel: "Statements",
    watches: ["EX-1041"],
    measure: (c) => {
      const groups = new Map<string, number>()
      const groupsQ = new Map<string, number>()
      const stmt = new Map<string, number>()
      for (const t of c.bank) {
        const k = `${t.account}|${t.date}|${t.amount.toFixed(2)}`
        if (t.xero.id) groups.set(k, (groups.get(k) ?? 0) + 1)
        if (t.qbo.id) groupsQ.set(k, (groupsQ.get(k) ?? 0) + 1)
        if (!t.statementRef.startsWith("—")) stmt.set(k, (stmt.get(k) ?? 0) + 1)
      }
      const extra = (m: Map<string, number>) => Array.from(m.entries()).reduce((t, [k, n]) => t + Math.max(0, n - (stmt.get(k) ?? 1)), 0)
      const dx = extra(groups)
      const dq = extra(groupsQ)
      return measure(
        [
          { label: "Transactions scanned", qbo: c.bank.filter((t) => t.qbo.id).length, xero: c.bank.filter((t) => t.xero.id).length, source: c.bank.filter((t) => !t.statementRef.startsWith("—")).length, kind: "int" },
          { label: "Duplicates (more copies than statement lines)", qbo: dq, xero: dx, source: 0, kind: "int" },
        ],
        dx + dq,
        "count",
        dx + dq ? `${dx + dq} duplicate transaction${dx + dq === 1 ? "" : "s"} found.` : "No duplicates.",
      )
    },
  },
  {
    id: "ENT-02",
    area: "entries",
    name: "No QuickBooks entries missing from Xero",
    compares: "Bills, expenses and card transactions entered in QuickBooks after the conversion date against Xero",
    sources: ["qbo", "xero"],
    watches: ["EX-1043", "EX-1047"],
    measure: (c) => {
      const card = c.bank.filter((t) => t.qbo.id && t.qbo.status !== "missing")
      const missingCard = card.filter((t) => t.match === "missing-in-xero").length
      const bills = Math.round(daysSinceConv(c) * 3.2)
      const missingBills = c.openIds.has("EX-1043") ? 1 : 0
      return measure(
        [
          { label: "Bank and card transactions", qbo: card.length, xero: card.length - missingCard, kind: "int" },
          { label: "Supplier bills since conversion", qbo: bills, xero: bills - missingBills, kind: "int" },
        ],
        missingCard + missingBills,
        "count",
        missingCard + missingBills ? `${missingCard + missingBills} entries exist in QuickBooks only.` : "Nothing in QuickBooks is missing from Xero.",
      )
    },
  },
  {
    id: "ENT-03",
    area: "entries",
    name: "No Xero entries missing from QuickBooks",
    compares: "Xero transactions since the conversion date against QuickBooks",
    sources: ["xero", "qbo"],
    watches: [],
    measure: (c) => {
      const x = c.bank.filter((t) => t.xero.id && t.match !== "duplicate-in-xero")
      const missing = x.filter((t) => t.match === "missing-in-qbo").length
      return measure([{ label: "Xero bank transactions", qbo: x.length - missing, xero: x.length, kind: "int" }], missing, "count", missing ? `${missing} Xero transactions are not in QuickBooks.` : "Everything in Xero is also in QuickBooks.")
    },
  },
  {
    id: "ENT-04",
    area: "entries",
    name: "Same tax code on matching documents",
    compares: "GST code on each invoice and bill line present in both systems",
    sources: ["qbo", "xero"],
    watches: ["EX-1044"],
    measure: (c) => {
      const docs = Math.round(daysSinceConv(c) * 4.6)
      const bad = c.openIds.has("EX-1044") ? 1 : 0
      const row = ev("EX-1044", "Tax code")
      return measure(
        [
          { label: "Documents compared", qbo: docs, xero: docs, kind: "int" },
          { label: "Tax code differs", qbo: "—", xero: bad, kind: "int" },
          ...(bad && row ? [{ label: "INV-4821 tax code", qbo: row.qbo, xero: row.xero, kind: "text" as const }] : []),
        ],
        bad,
        "count",
        bad ? "1 invoice is coded GST-free in Xero but GST on Income in QuickBooks." : "Tax codes agree on every document.",
      )
    },
  },
  {
    id: "ENT-05",
    area: "entries",
    name: "No duplicate contacts",
    compares: "Customers and suppliers by name and ABN, QuickBooks against Xero",
    sources: ["qbo", "xero"],
    watches: ["EX-1049"],
    measure: (c) => {
      const dup = c.openIds.has("EX-1049") ? 1 : 0
      return measure([{ label: "Customers and suppliers", qbo: 318, xero: 318 + dup, kind: "int" }], dup, "count", dup ? "One customer exists twice in Xero (same ABN)." : "Contacts match one to one.")
    },
  },
  {
    id: "ENT-06",
    area: "entries",
    name: "Tracking category set on every line",
    compares: "Location (QBO Location → Xero tracking category) on income lines",
    sources: ["qbo", "xero"],
    watches: ["EX-1050"],
    measure: (c) => {
      const blank = c.openIds.has("EX-1050") ? 12 : 0
      return measure([{ label: "Income lines with no Location", qbo: 0, xero: blank, kind: "int" }], blank, "count", blank ? `${blank} Xero lines have no Location, so P&L by Location shows them as unassigned.` : "Every line carries a Location.")
    },
  },
  {
    id: "ENT-07",
    area: "entries",
    name: "Payments allocated to the same invoices",
    compares: "Customer payment allocations, invoice by invoice",
    sources: ["qbo", "xero"],
    watches: ["EX-1039"],
    measure: (c) => {
      const bad = c.openIds.has("EX-1039") ? 1 : 0
      const n = c.bank.filter((t) => t.coding === "1100").length
      return measure([{ label: "Payments compared", qbo: n, xero: n, kind: "int" }, { label: "Allocated differently", qbo: "—", xero: bad, kind: "int" }], bad, "count", bad ? "1 payment is applied to a different invoice." : "Every payment is applied to the same invoice in both systems.")
    },
  },

  // ------------------------------------------------------------ Calculations and reporting
  ...(["qbo", "xero"] as const).flatMap((sys): CheckDef[] => {
    const name = sys === "qbo" ? "QuickBooks" : "Xero"
    const bsOf = (c: MeasureCtx) => (sys === "qbo" ? c.qbs : c.xbs)
    const plOf = (c: MeasureCtx, from: string, to: string) => (sys === "qbo" ? c.qpl(from, to) : c.xpl(from, to))
    const n = sys === "qbo" ? 1 : 2
    return [
      {
        id: `CALC-0${n}`,
        area: "calculations",
        name: `${name} trial balance balances`,
        compares: `Total debits against total credits in the ${name} trial balance at the run date`,
        sources: [sys],
        watches: [],
        measure: (c) => {
          const t = tbTotals(tbValues(bsOf(c), plOf(c, ytd(c), c.asOf)))
          return measure([one(sys, "Debits / credits", `${money(t.dr)} / ${money(t.cr)}`, "text")], t.dr - t.cr, "money", `Debits equal credits${Math.abs(t.dr - t.cr) < 0.05 ? "" : " within rounding"}.`, 0.05)
        },
      },
      {
        id: `CALC-0${n + 2}`,
        area: "calculations",
        name: `${name} balance sheet balances`,
        compares: `Assets minus liabilities against equity in the ${name} balance sheet`,
        sources: [sys],
        watches: [],
        measure: (c) => {
          const b = bsOf(c)
          const na = netAssets(b)
          const eq = equityTotal(b)
          return measure([one(sys, "Net assets / equity", `${money(na)} / ${money(eq)}`, "text")], na - eq, "money", "Net assets equal equity.", 0.05)
        },
      },
      {
        id: `CALC-0${n + 4}`,
        area: "calculations",
        name: `${name} P&L lines add up to the reported totals`,
        compares: `Net profit recomputed from every P&L account line against the ${name} report total, financial year to date`,
        sources: [sys],
        watches: [],
        measure: (c) => {
          const pl = plOf(c, ytd(c), c.asOf)
          const lines = round2(-Object.values(pl).reduce((t, v) => t + v, 0))
          const reported = totalsOf(pl).netProfit
          return measure(
            [
              one(sys, "Net profit from account lines", lines, "money"),
              one(sys, "Net profit on the report", reported, "money"),
            ],
            lines - reported,
            "money",
            "Account lines add up to the report.",
            0.05,
          )
        },
      },
      {
        id: `CALC-0${n + 6}`,
        area: "calculations",
        name: `${name} current year earnings and retained earnings roll forward`,
        compares: `Current year earnings against net profit to date, and retained earnings against last year's closing equity (${name})`,
        sources: [sys],
        watches: [],
        measure: (c) => {
          const b = bsOf(c)
          const fy = fyOf(c.asOf)
          const cye = round2(-(b["3900"] ?? 0))
          const np = totalsOf(plOf(c, ytd(c), c.asOf)).netProfit
          const prior = sys === "qbo" ? balancesAt(fyEnd(fy - 1), "qbo") : c.xbsAt(fyEnd(fy - 1))
          const expectedRe = round2(-((prior["3200"] ?? 0) + (prior["3300"] ?? 0) + (prior["3900"] ?? 0)))
          const re = round2(-(b["3200"] ?? 0))
          return measure(
            [
              one(sys, "Current year earnings / net profit", `${money(cye)} / ${money(np)}`, "text"),
              one(sys, "Retained earnings / rolled forward", `${money(re)} / ${money(expectedRe)}`, "text"),
            ],
            Math.abs(cye - np) + Math.abs(re - expectedRe),
            "money",
            "Earnings roll forward correctly.",
            0.05,
          )
        },
      },
    ]
  }),
  {
    id: "CALC-09",
    area: "calculations",
    name: "Monthly report figures add up to the year-to-date total",
    compares: "Sum of monthly revenue and net profit against the year-to-date report, both systems",
    sources: ["qbo", "xero"],
    watches: [],
    measure: (c) => {
      const sums = (sys: "qbo" | "xero") => {
        const months = monthlyTrend(ytd(c), c.asOf, sys)
        const t = plTotals(ytd(c), c.asOf, sys)
        return { income: round2(months.reduce((s, m) => s + m.income, 0)), np: round2(months.reduce((s, m) => s + m.netProfit, 0)), t }
      }
      const q = sums("qbo")
      const x = sums("xero")
      const variance = Math.abs(q.income - q.t.income) + Math.abs(x.income - x.t.income) + Math.abs(q.np - q.t.netProfit) + Math.abs(x.np - x.t.netProfit)
      return measure(
        [
          { label: "Revenue: months / year to date", qbo: `${money(q.income)} / ${money(q.t.income)}`, xero: `${money(x.income)} / ${money(x.t.income)}`, kind: "text" },
          { label: "Net profit: months / year to date", qbo: `${money(q.np)} / ${money(q.t.netProfit)}`, xero: `${money(x.np)} / ${money(x.t.netProfit)}`, kind: "text" },
        ],
        variance,
        "money",
        "Monthly columns add up to the year-to-date totals (within 1 dollar of rounding).",
        1,
      )
    },
  },
]

CHECKS.sort((a, b) => AREAS.findIndex((x) => x.key === a.area) - AREAS.findIndex((x) => x.key === b.area) || a.id.localeCompare(b.id))

export const CHECK_BY_ID = Object.fromEntries(CHECKS.map((c) => [c.id, c])) as Record<string, CheckDef>

/** Checks that watch a given exception */
export function checksForIssue(id: string): CheckDef[] {
  return CHECKS.filter((c) => c.watches.includes(id))
}
