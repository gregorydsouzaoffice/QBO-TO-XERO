/**
 * AI Financial QA engine over the demo data.
 *
 * Workflow per run (every 2 hours, lib/data/schedule.ts):
 *   1 collect   QuickBooks, Xero, bank statements and Gojee
 *   2 validate  the check catalogue (lib/qa/checks.ts)
 *   3 detect    exceptions open at the run: detectedAt ≤ run < resolvedAt
 *   4 report    the QA report (lib/qa/report.ts)
 *   5 deliver   email to QA_RECIPIENTS with the PDF attached
 *
 * Check status at a run follows the exceptions it watches. The latest run (and
 * any manual run) also measures the real figures, so the screen can show what
 * was compared. Fixes marked in the demo count from the first run after the
 * moment they were marked ("fix confirmed at the next QA run").
 */
import { conversionDate, daysBetween, fyOf, INCEPTION_DATE, isoOf } from "../clock"
import { round2, seeded } from "../format"
import { ACCOUNT_BY_CODE, isPL } from "../data/chart"
import { bankTransactions, type BankTxn } from "../data/bank"
import { issues, SEVERITY_ORDER, type Issue, type Severity } from "../data/issues"
import { balancesAt, plBetween, type Amounts } from "../data/ledger"
import { lastRunAt, QA_INTERVAL_HOURS, recentRuns, runId } from "../data/schedule"
import { CHECKS } from "./checks"
import type { CheckResult, CheckStatus, Fixes, MeasureCtx, RunRecords, RunResult } from "./types"

export * from "./types"
export { AREAS, AREA_LABEL, CHECKS, CHECK_BY_ID, checksForIssue } from "./checks"

const HOUR = 3_600_000

const t = (iso: string) => new Date(iso).getTime()

/** Is the exception open at this run? Base window, then any fix marked in the demo. */
export function issueOpenAt(issue: Issue, at: Date, fixes: Fixes = {}): boolean {
  const ms = at.getTime()
  if (t(issue.detectedAt) > ms) return false
  if (issue.resolvedAt && t(issue.resolvedAt) <= ms) return false
  const f = fixes[issue.id]
  if (f && issue.status !== "resolved" && t(f) <= ms) return false
  return true
}

/** Fixes this run confirms (base-unresolved issues marked resolved before the run) */
function fixedAt(at: Date, fixes: Fixes): Issue[] {
  return issues().filter((i) => i.status !== "resolved" && fixes[i.id] && t(fixes[i.id]) <= at.getTime())
}

function stripEffects(b: Amounts, fixed: Issue[], asOf: string): Amounts {
  if (!fixed.length) return b
  const out = { ...b }
  for (const i of fixed) {
    if (i.date > asOf) continue
    for (const e of i.effects) {
      const a = ACCOUNT_BY_CODE[e.code]
      if (!a) continue
      if (isPL(a)) {
        const k = fyOf(i.date) === fyOf(asOf) ? "3900" : "3200"
        out[k] = round2((out[k] ?? 0) - e.amount)
      } else out[e.code] = round2((out[e.code] ?? 0) - e.amount)
    }
  }
  return out
}

function stripPl(p: Amounts, fixed: Issue[], from: string, to: string): Amounts {
  if (!fixed.length) return p
  const out = { ...p }
  for (const i of fixed) {
    if (i.date < from || i.date > to) continue
    for (const e of i.effects) {
      const a = ACCOUNT_BY_CODE[e.code]
      if (a && isPL(a)) out[e.code] = round2((out[e.code] ?? 0) - e.amount)
    }
  }
  return out
}

function bankWithFixes(asOf: string, fixedIds: Set<string>): BankTxn[] {
  return bankTransactions()
    .filter((r) => r.date <= asOf)
    .flatMap((r) => {
      if (!r.issueId || !fixedIds.has(r.issueId)) return [r]
      if (r.match === "duplicate-in-xero") return []
      return [{ ...r, xero: { id: r.xero.id ?? `XR-fixed-${r.id}`, status: "reconciled" as const }, match: "matched" as const }]
    })
}

export function measureCtx(at: Date, fixes: Fixes = {}): MeasureCtx {
  const asOf = isoOf(at)
  const fixed = fixedAt(at, fixes)
  const fixedIds = new Set(fixed.map((i) => i.id))
  const openIds = new Set(issues().filter((i) => issueOpenAt(i, at, fixes)).map((i) => i.id))
  return {
    at,
    asOf,
    conv: conversionDate(),
    openIds,
    fixed,
    fixedIds,
    qbs: balancesAt(asOf, "qbo"),
    xbs: stripEffects(balancesAt(asOf, "xero"), fixed, asOf),
    qpl: (from, to) => plBetween(from, to, "qbo"),
    xpl: (from, to) => stripPl(plBetween(from, to, "xero"), fixed, from, to),
    bank: bankWithFixes(asOf, fixedIds),
    xbsAt: (iso) => stripEffects(balancesAt(iso, "xero"), fixed, iso),
  }
}

function statusFor(linked: Issue[], measureOk: boolean | undefined): CheckStatus {
  if (linked.length) return linked.some((i) => i.severity !== "low") ? "fail" : "warn"
  if (measureOk === false) return "fail"
  return "pass"
}

function records(at: Date): RunRecords {
  const asOf = isoOf(at)
  const bank = bankTransactions().filter((r) => r.date <= asOf).length
  const months = Math.max(1, Math.round(daysBetween(INCEPTION_DATE, asOf) / 30.44))
  const sinceConv = Math.max(1, daysBetween(conversionDate(), asOf) + 1)
  const qbo = Math.round(months * 486 + bank * 1.35)
  const xero = Math.round(months * 486 * 0.97 + bank * 1.4)
  const gojee = Math.round(3_860 + sinceConv * 14.5)
  return { qbo, xero, bank, gojee, total: qbo + xero + bank + gojee }
}

export interface RunOptions {
  manual?: boolean
  /** Measure the real figures for every check (latest and manual runs) */
  detailed?: boolean
  fixes?: Fixes
}

export function runAt(at: Date, opts: RunOptions = {}): RunResult {
  const fixes = opts.fixes ?? {}
  const all = issues()
  const open = all.filter((i) => issueOpenAt(i, at, fixes)).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.amount - a.amount)
  const openIds = new Set(open.map((i) => i.id))
  const ctx = opts.detailed ? measureCtx(at, fixes) : null

  const checks: CheckResult[] = CHECKS.map((check) => {
    const linked = open.filter((i) => check.watches.includes(i.id))
    const m = ctx ? check.measure(ctx) : undefined
    const status = statusFor(linked, m?.ok)
    const confidence = linked.length ? Math.min(...linked.map((i) => i.confidence)) : status === "pass" ? 0.99 : 0.8
    return { check, status, issues: linked, measure: m, confidence }
  })

  const prevAt = opts.manual && lastRunAt(at).getTime() !== at.getTime() ? lastRunAt(at) : new Date(at.getTime() - QA_INTERVAL_HOURS * HOUR)
  const prevOpen = new Set(all.filter((i) => issueOpenAt(i, prevAt, fixes)).map((i) => i.id))
  const bySeverity = { high: 0, medium: 0, low: 0 } as Record<Severity, number>
  for (const i of open) bySeverity[i.severity]++
  const rec = records(at)
  const rng = seeded(`run:${at.toISOString()}`)

  return {
    id: opts.manual ? `${runId(at).slice(0, -2)}${String(at.getMinutes()).padStart(2, "0")}-M` : runId(at),
    at,
    manual: !!opts.manual,
    detailed: !!opts.detailed,
    checks,
    counts: {
      run: checks.length,
      passed: checks.filter((c) => c.status === "pass").length,
      warnings: checks.filter((c) => c.status === "warn").length,
      failed: checks.filter((c) => c.status === "fail").length,
    },
    exceptions: open,
    bySeverity,
    needsReview: open.filter((i) => i.needsReview),
    newIssues: open.filter((i) => !prevOpen.has(i.id)),
    closedIssues: all.filter((i) => prevOpen.has(i.id) && !openIds.has(i.id)),
    records: rec,
    durationSec: Math.round(58 + rec.total / 4_000 + rng() * 40),
    confidence: checks.reduce((s, c) => s + c.confidence, 0) / checks.length,
    exceptionValue: round2(open.reduce((s, i) => s + i.amount, 0)),
  }
}

/** The last `count` scheduled runs, newest first. Only the newest is measured in detail. */
export function scheduledRuns(count = 12, fixes: Fixes = {}, ref?: Date): RunResult[] {
  return recentRuns(count, ref).map((at, i) => runAt(at, { detailed: i === 0, fixes }))
}

/** Latest scheduled run, measured in detail */
export function latestRun(fixes: Fixes = {}, ref?: Date): RunResult {
  return runAt(lastRunAt(ref), { detailed: true, fixes })
}

/** Run IDs (scheduled, 2 h apart) from first detection to now/resolution, for an exception timeline */
export function issueTimeline(issue: Issue, fixes: Fixes = {}, ref?: Date) {
  const detected = new Date(issue.detectedAt)
  const last = lastRunAt(ref)
  const fixMs = issue.status !== "resolved" && fixes[issue.id] ? t(fixes[issue.id]) : null
  const endMs = issue.resolvedAt ? t(issue.resolvedAt) : null
  let present = 0
  for (let ms = detected.getTime(); ms <= last.getTime(); ms += QA_INTERVAL_HOURS * HOUR) {
    if (endMs !== null && ms >= endMs) break
    if (fixMs !== null && ms >= fixMs) break
    present++
  }
  const confirmedRun = fixMs !== null ? (() => {
    const r = lastRunAt(new Date(fixMs))
    const next = new Date(r.getTime() + QA_INTERVAL_HOURS * HOUR)
    return next.getTime() <= last.getTime() ? next : null
  })() : null
  return {
    detected,
    detectedRun: runId(detected),
    /** Scheduled runs it appeared in (including the first) */
    presentInRuns: present,
    resolvedAt: issue.resolvedAt ? new Date(issue.resolvedAt) : null,
    markedResolvedAt: fixMs !== null ? new Date(fixMs) : null,
    /** First scheduled run after the fix was marked, if it has happened */
    confirmedRun,
  }
}

/** Date helper for UIs: the run times of a day (00:00, 02:00 … 22:00) */
export function dailyRunTimes(ref?: Date): Date[] {
  const base = lastRunAt(ref)
  return Array.from({ length: 24 / QA_INTERVAL_HOURS }, (_, i) => {
    const d = new Date(base)
    d.setHours(i * QA_INTERVAL_HOURS, 0, 0, 0)
    return d
  })
}

