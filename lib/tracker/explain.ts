/**
 * Links a QBO-vs-Xero difference on an account back to the issues that cause it.
 *
 * The ledger applies the `effects` of every issue whose *base* status is not
 * resolved (lib/data/issues.ts), so explanations use the issue effects; the
 * status shown on screen comes from the demo store list passed in.
 */
import { round2 } from "../format"
import { issues as baseIssues, type Issue } from "../data/issues"

export const TOLERANCE = 0.005

export function differs(diff: number): boolean {
  return Math.abs(diff) > TOLERANCE
}

/** IDs of issues whose effects are still applied to the Xero ledger */
function activeIds(): Set<string> {
  return new Set(baseIssues().filter((i) => i.status !== "resolved").map((i) => i.id))
}

export interface Explanation {
  issues: Issue[]
  /** Sum of the effects on this account inside the window (Xero minus QBO, debit-positive) */
  explained: number
}

/**
 * Issues whose effects hit `code` with an issue date inside [from, to].
 * `list` is the store list (with demo status changes) so the status shown is current.
 */
export function explain(code: string, list: Issue[], from: string, to: string): Explanation {
  const active = activeIds()
  const hits = list.filter((i) => active.has(i.id) && i.date >= from && i.date <= to && i.effects.some((e) => e.code === code))
  const explained = hits.reduce((t, i) => t + i.effects.filter((e) => e.code === code).reduce((s, e) => s + e.amount, 0), 0)
  return { issues: hits, explained: round2(explained) }
}

/** Same as `explain` for several accounts at once (e.g. all P&L accounts) */
export function explainMany(codes: string[], list: Issue[], from: string, to: string): Issue[] {
  const set = new Set(codes)
  const active = activeIds()
  return list.filter((i) => active.has(i.id) && i.date >= from && i.date <= to && i.effects.some((e) => set.has(e.code)))
}

/** Unresolved issues that touch an account even without a ledger effect (e.g. unreconciled lines, duplicate contacts) */
export function touching(codes: string[], list: Issue[]): Issue[] {
  const set = new Set(codes)
  return list.filter((i) => i.status !== "resolved" && i.accounts.some((c) => set.has(c)))
}

export function uniqueIssues(...groups: Issue[][]): Issue[] {
  const seen = new Map<string, Issue>()
  for (const g of groups) for (const i of g) if (!seen.has(i.id)) seen.set(i.id, i)
  return Array.from(seen.values())
}
