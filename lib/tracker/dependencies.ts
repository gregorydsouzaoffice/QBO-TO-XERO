/**
 * Source dependency map: what feeds QuickBooks and Xero during the parallel
 * run, and whether each link is healthy. A link's status is derived from the
 * open issues that match it, so resolving an issue turns the link healthy.
 */
import { conversionDate, formatShort, migratedThrough } from "../clock"
import type { Issue, IssueKind } from "../data/issues"

export type SourceKey = "westpac" | "amex" | "payroll" | "conversion" | "manual"
export type TargetKey = "qbo" | "xero"
export type LinkHealth = "healthy" | "minor" | "issue"

export interface DependencySource {
  key: SourceKey
  name: string
  detail: string
  /** Which logo to show (only official files via components/brand.tsx) */
  system: "bank" | "xero" | "qbo" | "people"
}

export interface DependencyLinkDef {
  id: string
  source: SourceKey
  target: TargetKey
  /** What flows along the link */
  flow: string
  /** How an issue is matched to this link */
  match: { ids?: string[]; kinds?: IssueKind[]; accounts?: string[]; areas?: Issue["area"][] }
  healthyNote: string
}

export interface DependencyLink extends DependencyLinkDef {
  health: LinkHealth
  issues: Issue[]
  note: string
}

export function dependencySources(): DependencySource[] {
  return [
    { key: "westpac", name: "Westpac bank feeds", detail: "Business One · Business Saver", system: "bank" },
    { key: "amex", name: "Amex card feed", detail: "Amex Business Card (Yodlee)", system: "bank" },
    { key: "payroll", name: "Xero Payroll", detail: "Fortnightly pay runs", system: "xero" },
    { key: "conversion", name: "Conversion balances", detail: `QuickBooks history to ${formatShort(migratedThrough())}`, system: "qbo" },
    { key: "manual", name: "Manual entry", detail: "Bills, invoices and contacts keyed by the accounts team", system: "people" },
  ]
}

const LINKS: DependencyLinkDef[] = [
  { id: "L-01", source: "westpac", target: "qbo", flow: "Statement lines", match: { ids: [] }, healthyNote: "Feeding daily, all lines received" },
  { id: "L-02", source: "westpac", target: "xero", flow: "Statement lines", match: { kinds: ["feed", "duplicate"], accounts: ["1010", "1020"] }, healthyNote: "Feeding daily, all lines received" },
  { id: "L-03", source: "amex", target: "qbo", flow: "Card transactions", match: { ids: [] }, healthyNote: "Feeding daily, all lines received" },
  { id: "L-04", source: "amex", target: "xero", flow: "Card transactions", match: { kinds: ["feed"], accounts: ["2110"] }, healthyNote: "Feeding daily, all lines received" },
  { id: "L-06", source: "conversion", target: "xero", flow: "Project WIP balances", match: { kinds: ["dependency"], areas: ["Jobs & WIP"] }, healthyNote: "WIP balances tied to project ledgers" },
  { id: "L-09", source: "payroll", target: "xero", flow: "Pay runs → general ledger", match: { ids: [] }, healthyNote: "Pay runs posted to wages, PAYG and super" },
  { id: "L-10", source: "payroll", target: "qbo", flow: "Summary payroll journal", match: { areas: ["Payroll"] }, healthyNote: "Journal posted after each pay run" },
  { id: "L-11", source: "conversion", target: "xero", flow: "Opening balances and history", match: { ids: ["EX-1038"] }, healthyNote: `Trial balances agreed at ${formatShort(conversionDate())}` },
  { id: "L-12", source: "manual", target: "xero", flow: "Bills, invoices, contacts", match: { kinds: ["missing", "mismatch", "data-quality"], areas: ["Payables", "GST", "Contacts", "Tracking", "Receivables"] }, healthyNote: "Entries match QuickBooks" },
]

function matches(def: DependencyLinkDef, i: Issue): boolean {
  const m = def.match
  if (m.ids) return m.ids.includes(i.id)
  if (m.kinds && !m.kinds.includes(i.kind)) return false
  if (m.areas && !m.areas.includes(i.area)) return false
  if (m.accounts && !i.accounts.some((c) => m.accounts!.includes(c))) return false
  return true
}

export function dependencyLinks(list: Issue[]): DependencyLink[] {
  return LINKS.map((def) => {
    const all = list.filter((i) => matches(def, i))
    const open = all.filter((i) => i.status !== "resolved")
    const health: LinkHealth = open.length === 0 ? "healthy" : open.every((i) => i.severity === "low") ? "minor" : "issue"
    const note = open.length === 0 ? def.healthyNote : open.map((i) => i.title).join("; ")
    return { ...def, health, issues: open, note }
  })
}

export const HEALTH_LABEL: Record<LinkHealth, string> = { healthy: "Healthy", minor: "Minor", issue: "Issue" }
