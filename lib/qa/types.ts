/**
 * Types for the AI Financial QA engine. The engine runs every 2 hours
 * (lib/data/schedule.ts) over QuickBooks Online, Xero, the bank statements and
 * Gojee, and every result traces back to lib/data.
 */
import type { Amounts } from "../data/ledger"
import type { BankTxn } from "../data/bank"
import type { Issue, Severity } from "../data/issues"

/** The six responsibility areas from the client brief */
export type QaArea = "figures" | "bank" | "qbo-xero" | "dependencies" | "entries" | "calculations"

/** Systems a check reads. Matches SystemKey in components/brand.tsx. */
export type QaSource = "qbo" | "xero" | "bank" | "gojee"

export type CheckStatus = "pass" | "warn" | "fail"

export interface MeasureRow {
  label: string
  qbo?: number | string
  xero?: number | string
  /** Bank statement or Gojee value */
  source?: number | string
  kind?: "money" | "int" | "text"
}

/** What a check actually measured at the run date */
export interface Measure {
  rows: MeasureRow[]
  /** Size of the disagreement: dollars or a count. 0 = agrees. */
  variance: number
  unit: "money" | "count"
  ok: boolean
  /** One plain-English sentence */
  detail: string
}

/**
 * Everything a check needs at one run. Xero figures have the fixes confirmed by
 * this run taken out, so a "Mark resolved" in the demo shows up at the next run.
 */
export interface MeasureCtx {
  at: Date
  /** Run date, ISO */
  asOf: string
  conv: string
  /** Issues open at this run (detected, not resolved, fix not yet confirmed) */
  openIds: Set<string>
  /** Issues whose fix this run confirms (marked resolved in the demo before this run) */
  fixed: Issue[]
  fixedIds: Set<string>
  /** Debit-positive balance-sheet balances at the run date */
  qbs: Amounts
  xbs: Amounts
  qpl: (from: string, to: string) => Amounts
  xpl: (from: string, to: string) => Amounts
  /** Bank and card lines up to the run date, with confirmed fixes applied */
  bank: BankTxn[]
  /** Xero balances at another date, with the same fixes applied */
  xbsAt: (iso: string) => Amounts
}

export interface CheckDef {
  id: string
  area: QaArea
  name: string
  /** What it compares, in plain words */
  compares: string
  sources: QaSource[]
  /** Label for the third column when a bank statement or Gojee is involved */
  sourceLabel?: string
  /** Exceptions this check raises or watches */
  watches: string[]
  measure: (c: MeasureCtx) => Measure
}

export interface CheckResult {
  check: CheckDef
  status: CheckStatus
  /** Linked exceptions open at this run */
  issues: Issue[]
  /** Only on detailed runs (the latest run and manual runs) */
  measure?: Measure
  confidence: number
}

export interface RunRecords {
  qbo: number
  xero: number
  bank: number
  gojee: number
  total: number
}

export interface RunResult {
  id: string
  at: Date
  manual: boolean
  detailed: boolean
  checks: CheckResult[]
  counts: { run: number; passed: number; warnings: number; failed: number }
  /** Exceptions open at this run, most severe first */
  exceptions: Issue[]
  bySeverity: Record<Severity, number>
  /** Exceptions that need a person to decide */
  needsReview: Issue[]
  /** First flagged at this run */
  newIssues: Issue[]
  /** Open at the previous run, closed at this one */
  closedIssues: Issue[]
  records: RunRecords
  durationSec: number
  /** 0–1 */
  confidence: number
  /** Total dollar value of open exceptions */
  exceptionValue: number
}

/** Issue ID → ISO date-time when it was marked resolved in the demo */
export type Fixes = Record<string, string>
