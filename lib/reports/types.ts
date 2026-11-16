/**
 * Shared shape for every exportable report (financial reports, migration
 * comparison reports, AI QA reports). The on-screen view, the PDF and the
 * Excel file all render the same object, so they always agree.
 */
export type Cell = string | number

export interface Column {
  key: string
  label: string
  kind?: "text" | "money" | "int" | "pct" | "status"
}

export interface Table {
  title: string
  columns: Column[]
  rows: Record<string, Cell>[]
  footer?: Record<string, Cell>
}

export type ReportStatus = "pass" | "fail" | "warning" | "info"

export interface Report {
  /** Short reference, e.g. "R-03" or a QA run ID */
  id: string
  title: string
  subtitle?: string
  status?: ReportStatus
  headline?: string
  /** Key figures shown as tiles at the top */
  summary?: { label: string; value: string }[]
  tables: Table[]
  notes?: string[]
}

export interface ReportCtx {
  company: string
  /** "1 Jul 2026 – 16 Nov 2026" */
  period: string
  /** Free text under the title, e.g. "QuickBooks Online vs Xero" */
  scope?: string
  reference: string
  /** ISO date-time */
  generatedAt: string
}
