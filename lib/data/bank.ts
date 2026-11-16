/**
 * Bank and card transactions since the conversion date, three-way:
 * bank statement ↔ QuickBooks ↔ Xero. Rows linked to an issue carry its ID.
 */
import { addDays, conversionDate, daysBetween, now, todayISO } from "../clock"
import { round2, seeded } from "../format"
import { BANK_ACCOUNTS, type BankCode } from "./company"
import { issues } from "./issues"

export type QboStatus = "reconciled" | "matched" | "missing"
export type XeroStatus = "reconciled" | "unreconciled" | "missing" | "duplicate"
export type MatchStatus = "matched" | "pending" | "missing-in-xero" | "missing-in-qbo" | "duplicate-in-xero" | "unreconciled"

export interface BankTxn {
  id: string
  date: string
  account: BankCode
  description: string
  /** + money in, − money out (card: − = charge) */
  amount: number
  /** QBO account code it was coded to */
  coding: string
  statementRef: string
  qbo: { id: string | null; status: QboStatus }
  xero: { id: string | null; status: XeroStatus }
  match: MatchStatus
  issueId?: string
}

const CUSTOMERS = [
  "Northshore Builders Pty Ltd",
  "Harbour City Strata",
  "Macquarie Park Developments",
  "Inner West Council",
  "Coastal Medical Centres",
  "Redfern Fitout Co",
  "Parramatta Data Centre",
  "Bondi Residential (various)",
  "St Leonards Property Group",
  "Eastgardens Retail Mgmt",
]
const SUPPLIERS: [string, string, number][] = [
  ["Rexel Electrical Supplies", "5010", 3800],
  ["MM Electrical Merchandising", "5010", 2600],
  ["Middy's Electrical", "5010", 1900],
  ["Clipsal by Schneider", "5010", 2200],
  ["Sparkys Subcontracting", "5020", 5200],
  ["CommsLink Cabling", "5020", 3400],
  ["Kennards Hire", "5040", 640],
  ["Bunnings Trade Alexandria", "5010", 780],
  ["Telstra Business", "6050", 960],
]
const CARD: [string, string, number][] = [
  ["Ampol", "6031", 140],
  ["BP Mascot", "6031", 120],
  ["Officeworks", "6150", 180],
  ["Total Tools", "6110", 260],
  ["Adobe", "6080", 79],
  ["Workwear Hub", "6120", 210],
]

let cache: { key: string; rows: BankTxn[] } | null = null

export function bankTransactions(): BankTxn[] {
  const key = todayISO()
  if (cache?.key === key) return cache.rows
  const start = conversionDate()
  const today = todayISO()
  const rows: BankTxn[] = []
  let seq = 0
  const push = (r: Omit<BankTxn, "id" | "statementRef" | "qbo" | "xero" | "match"> & Partial<BankTxn>) => {
    seq++
    const age = daysBetween(r.date, today)
    const qboStatus: QboStatus = r.qbo?.status ?? (age > 3 ? "reconciled" : "matched")
    const xeroStatus: XeroStatus = r.xero?.status ?? (age > 2 ? "reconciled" : "unreconciled")
    rows.push({
      id: `BT-${String(seq).padStart(5, "0")}`,
      statementRef: r.statementRef ?? `${r.account === "2110" ? "AX" : "WBC"}${98120000 + seq * 7}`,
      qbo: r.qbo ?? { id: `QB-${7000 + seq}`, status: qboStatus },
      xero: r.xero ?? { id: `XR-${3000 + seq}`, status: xeroStatus },
      match: r.match ?? (xeroStatus === "reconciled" && qboStatus !== "missing" ? "matched" : "pending"),
      ...r,
    } as BankTxn)
  }

  for (let d = start; d <= today; d = addDays(d, 1)) {
    const dow = new Date(`${d}T12:00:00`).getDay()
    const rng = seeded(`bank:${d}`)
    const weekday = dow !== 0 && dow !== 6
    if (weekday) {
      const receipts = 2 + Math.floor(rng() * 4)
      for (let i = 0; i < receipts; i++) {
        const c = CUSTOMERS[Math.floor(rng() * CUSTOMERS.length)]
        push({ date: d, account: "1010", description: `Payment received · ${c}`, amount: round2(1500 + rng() * 22000), coding: "1100" })
      }
      const payments = 2 + Math.floor(rng() * 4)
      for (let i = 0; i < payments; i++) {
        const [s, code, base] = SUPPLIERS[Math.floor(rng() * SUPPLIERS.length)]
        push({ date: d, account: "1010", description: `Bill payment · ${s}`, amount: -round2(base * (0.5 + rng())), coding: code === "6050" ? "6050" : "2000" })
      }
      const charges = Math.floor(rng() * 3)
      for (let i = 0; i < charges; i++) {
        const [s, code, base] = CARD[Math.floor(rng() * CARD.length)]
        push({ date: d, account: "2110", description: s, amount: -round2(base * (0.6 + rng() * 0.9)), coding: code })
      }
    }
    if (d.endsWith("-01")) push({ date: d, account: "1010", description: "Rent · Alexandria Industrial Estates", amount: -8742.0, coding: "6040" })
    if (weekday && dow === 4 && daysBetween(start, d) % 14 < 7) {
      push({ date: d, account: "1010", description: "Payroll · fortnightly pay run", amount: -round2(52000 + rng() * 3000), coding: "2230" })
    }
    if (d.endsWith("-28")) push({ date: d, account: "1020", description: "Interest credit", amount: round2(180 + rng() * 60), coding: "4900" })
  }

  // ---- Rows tied to issues
  const byId = Object.fromEntries(issues().map((i) => [i.id, i]))

  const dup = byId["EX-1041"]
  push({ date: dup.date, account: "1010", description: "Bunnings Trade Alexandria", amount: -1284.5, coding: "5010", statementRef: "WBC98123344", qbo: { id: "Expense #8812", status: "reconciled" }, xero: { id: "SM-3307", status: "reconciled" }, match: "matched", issueId: dup.id })
  push({ date: dup.date, account: "1010", description: "Bunnings Trade Alexandria (second copy)", amount: -1284.5, coding: "5010", statementRef: "— no statement line —", qbo: { id: null, status: "missing" }, xero: { id: "SM-3309", status: "duplicate" }, match: "duplicate-in-xero", issueId: dup.id })

  const gap = byId["EX-1047"]
  const gapRows: [string, string, number, string][] = [
    [gap.evidence[0].field.split(" · ")[0], "Ampol Rosebery", -612.4, "6031"],
    [gap.evidence[1].field.split(" · ")[0], "Officeworks Alexandria", -318.55, "6150"],
    [gap.evidence[2].field.split(" · ")[0], "Microsoft 365 Business", -1060.0, "6080"],
    [gap.evidence[3].field.split(" · ")[0], "Ampol Mascot", -150.0, "6031"],
  ]
  gapRows.forEach(([date, desc, amount, coding], i) =>
    push({ date, account: "2110", description: desc, amount, coding, qbo: { id: `CC Expense #${9120 + i}`, status: "reconciled" }, xero: { id: null, status: "missing" }, match: "missing-in-xero", issueId: gap.id }),
  )

  const tr = byId["EX-1045"]
  push({ date: tr.date, account: "1010", description: "Transfer to Business Saver", amount: -15000, coding: "1020", qbo: { id: "Transfer #T-1182", status: "reconciled" }, xero: { id: null, status: "unreconciled" }, match: "unreconciled", issueId: tr.id })
  push({ date: tr.date, account: "1020", description: "Transfer from Business One", amount: 15000, coding: "1010", qbo: { id: "Transfer #T-1182", status: "reconciled" }, xero: { id: null, status: "unreconciled" }, match: "unreconciled", issueId: tr.id })

  const stale = byId["EX-1046"]
  const staleAmounts = [612.0, 389.5, 1045.2, 228.0, 466.3, 341.7, 335.5]
  staleAmounts.forEach((amt, i) =>
    push({ date: addDays(stale.date, i % 3), account: "1010", description: ["Kennards Hire", "Telstra Business", "Middy's Electrical", "Bank fee", "Total Tools", "Officeworks", "Workwear Hub"][i], amount: -amt, coding: ["5040", "6050", "5010", "6010", "6110", "6150", "6120"][i], qbo: { id: `QB-${8800 + i}`, status: "reconciled" }, xero: { id: null, status: "unreconciled" }, match: "unreconciled", issueId: stale.id }),
  )

  rows.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? 1 : -1))
  cache = { key, rows }
  return rows
}

export interface FeedStatus {
  code: BankCode
  name: string
  feed: string
  status: "connected" | "restored" | "error"
  lastRefresh: Date
  note: string
}

export function feedStatuses(): FeedStatus[] {
  const n = now()
  const morning = new Date(n)
  morning.setHours(Math.min(n.getHours(), 6), 12, 0, 0)
  if (morning > n) morning.setTime(n.getTime() - 5 * 60_000)
  return BANK_ACCOUNTS.map((b) => ({
    code: b.code,
    name: b.name,
    feed: b.feed,
    status: b.code === "2110" ? "restored" : "connected",
    lastRefresh: morning,
    note: b.code === "2110" ? "Xero feed was down for 3 days and reconnected without back-fill" : "Feeding both QuickBooks and Xero",
  }))
}

/** Counts per account for the tracker */
export function bankSummary() {
  const rows = bankTransactions()
  return BANK_ACCOUNTS.map((b) => {
    const r = rows.filter((t) => t.account === b.code)
    return {
      code: b.code,
      name: b.name,
      total: r.length,
      matched: r.filter((t) => t.match === "matched").length,
      pending: r.filter((t) => t.match === "pending").length,
      exceptions: r.filter((t) => !["matched", "pending"].includes(t.match)).length,
      unreconciledXero: r.filter((t) => t.xero.status === "unreconciled").length,
    }
  })
}
