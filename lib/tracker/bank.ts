/**
 * Bank helpers for the tracker: match-status wording and the per-account
 * reconciliation view (statement ↔ QuickBooks ↔ Xero).
 */
import { addDays, daysBetween, migratedThrough, todayISO } from "../clock"
import { round2 } from "../format"
import { bankBalances } from "../data/ledger"
import { bankTransactions, feedStatuses, type BankTxn, type MatchStatus, type QboStatus, type XeroStatus } from "../data/bank"
import { BANK_ACCOUNTS } from "../data/company"
import type { Issue } from "../data/issues"
import { differs, touching } from "./explain"

export type Tone = "success" | "warning" | "danger" | "info" | "muted"

export const MATCH_LABEL: Record<MatchStatus, string> = {
  matched: "Matched all three",
  pending: "Waiting in Xero",
  "missing-in-xero": "Missing in Xero",
  "missing-in-qbo": "Missing in QuickBooks",
  "duplicate-in-xero": "Duplicate in Xero",
  unreconciled: "Unreconciled in Xero",
}

export const MATCH_TONE: Record<MatchStatus, Tone> = {
  matched: "success",
  pending: "info",
  "missing-in-xero": "danger",
  "missing-in-qbo": "danger",
  "duplicate-in-xero": "danger",
  unreconciled: "warning",
}

export const QBO_STATUS_LABEL: Record<QboStatus, string> = { reconciled: "Reconciled", matched: "Matched", missing: "Not in QuickBooks" }
export const XERO_STATUS_LABEL: Record<XeroStatus, string> = { reconciled: "Reconciled", unreconciled: "Unreconciled", missing: "Not in Xero", duplicate: "Duplicate" }

export function accountName(code: string): string {
  return BANK_ACCOUNTS.find((b) => b.code === code)?.name ?? code
}

/** Last day up to which every statement line is reconciled on one side (never before the migrated history) */
function reconciledThrough(rows: BankTxn[], side: "qbo" | "xero"): string {
  const blockers = rows.filter((t) => {
    if (t.statementRef.startsWith("—")) return false // a line with no statement line (e.g. a duplicate) doesn't block
    return side === "qbo" ? t.qbo.status === "matched" : t.xero.status === "unreconciled" || t.xero.status === "missing"
  })
  let through: string
  if (blockers.length) {
    const first = blockers.reduce((m, t) => (t.date < m ? t.date : m), blockers[0].date)
    through = addDays(first, -1)
  } else {
    through = rows.reduce((m, t) => (t.date > m ? t.date : m), migratedThrough())
  }
  return through < migratedThrough() ? migratedThrough() : through
}

export interface ReconRow {
  code: string
  name: string
  xeroCode: string
  kind: "bank" | "card"
  number: string
  feed: string
  statement: number
  qbo: number
  xero: number
  diff: number
  unreconciled: number
  /** Unreconciled lines older than 7 days */
  stale: number
  missing: number
  duplicates: number
  qboThrough: string
  xeroThrough: string
  status: { tone: Tone; label: string }
  issues: Issue[]
}

export function reconciliation(list: Issue[]): ReconRow[] {
  const today = todayISO()
  const balances = bankBalances(today)
  const txns = bankTransactions()
  return BANK_ACCOUNTS.map((b) => {
    const bal = balances.find((x) => x.code === b.code)!
    const rows = txns.filter((t) => t.account === b.code)
    const unrec = rows.filter((t) => t.xero.status === "unreconciled")
    const stale = unrec.filter((t) => daysBetween(t.date, today) > 7).length
    const missing = rows.filter((t) => t.xero.status === "missing").length
    const duplicates = rows.filter((t) => t.xero.status === "duplicate").length
    // For this demo the bank statement balance equals the QuickBooks book balance
    const statement = bal.qbo
    const diff = round2(bal.xero - statement)
    let status: ReconRow["status"]
    if (differs(diff)) status = { tone: "danger", label: "Xero differs from statement" }
    else if (missing || duplicates) status = { tone: "danger", label: "Exceptions to fix" }
    else if (stale) status = { tone: "warning", label: "Old lines waiting" }
    else if (unrec.length) status = { tone: "info", label: "Recent lines to reconcile" }
    else status = { tone: "success", label: "Reconciled" }
    return {
      code: b.code,
      name: b.name,
      xeroCode: b.xeroCode,
      kind: b.kind,
      number: b.number,
      feed: b.feed,
      statement,
      qbo: bal.qbo,
      xero: bal.xero,
      diff,
      unreconciled: unrec.length,
      stale,
      missing,
      duplicates,
      qboThrough: reconciledThrough(rows, "qbo"),
      xeroThrough: reconciledThrough(rows, "xero"),
      status,
      issues: touching([b.code], list).filter((i) => i.area === "Bank"),
    }
  })
}

export { bankTransactions, feedStatuses }
