/** Report objects for tracker exports (PDF / Excel through lib/export). */
import { conversionDate, formatShort, todayISO } from "../clock"
import { COMPANY } from "../data/company"
import { ACCOUNT_BY_CODE } from "../data/chart"
import { KIND_LABEL, type Issue } from "../data/issues"
import type { BankTxn } from "../data/bank"
import type { Report, ReportCtx } from "../reports/types"
import { accountName, MATCH_LABEL, QBO_STATUS_LABEL, XERO_STATUS_LABEL } from "./bank"

export function trackerCtx(scope: string, from = conversionDate(), to = todayISO()): ReportCtx {
  return {
    company: COMPANY.name,
    period: `${formatShort(from)} – ${formatShort(to)}`,
    scope,
    reference: `TR-${todayISO().replace(/-/g, "")}`,
    generatedAt: new Date().toISOString(),
  }
}

export function trackerFile(what: string): string {
  return `${COMPANY.short.replace(/\s+/g, "-")}-tracker-${what}-${todayISO()}`
}

export function bankReport(rows: BankTxn[]): Report {
  return {
    id: "TR-BANK",
    title: "Bank transactions: statement, QuickBooks and Xero",
    tables: [
      {
        title: `${rows.length} transactions`,
        columns: [
          { key: "date", label: "Date" },
          { key: "account", label: "Account" },
          { key: "desc", label: "Description" },
          { key: "coding", label: "Coded to (QBO ↔ Xero)" },
          { key: "amount", label: "Amount", kind: "money" },
          { key: "stmt", label: "Statement ref" },
          { key: "qbo", label: "QuickBooks" },
          { key: "xero", label: "Xero" },
          { key: "match", label: "Match", kind: "status" },
          { key: "issue", label: "Issue" },
        ],
        rows: rows.map((t) => ({
          date: t.date,
          account: accountName(t.account),
          desc: t.description,
          coding: `${t.coding} ↔ ${ACCOUNT_BY_CODE[t.coding]?.xeroCode ?? ""}`,
          amount: t.amount,
          stmt: t.statementRef,
          qbo: `${t.qbo.id ?? "—"} · ${QBO_STATUS_LABEL[t.qbo.status]}`,
          xero: `${t.xero.id ?? "—"} · ${XERO_STATUS_LABEL[t.xero.status]}`,
          match: MATCH_LABEL[t.match],
          issue: t.issueId ?? "",
        })),
      },
    ],
  }
}

export function exceptionsReport(rows: Issue[]): Report {
  return {
    id: "TR-EXC",
    title: "Discrepancies: QuickBooks vs Xero",
    tables: [
      {
        title: `${rows.length} discrepancies`,
        columns: [
          { key: "id", label: "ID" },
          { key: "title", label: "Discrepancy" },
          { key: "area", label: "Area" },
          { key: "kind", label: "Kind" },
          { key: "severity", label: "Severity", kind: "status" },
          { key: "status", label: "Status", kind: "status" },
          { key: "date", label: "Date" },
          { key: "amount", label: "Amount", kind: "money" },
          { key: "accounts", label: "QBO accounts" },
        ],
        rows: rows.map((i) => ({
          id: i.id,
          title: i.title,
          area: i.area,
          kind: KIND_LABEL[i.kind],
          severity: i.severity,
          status: i.status === "in-review" ? "In review" : i.status,
          date: i.date,
          amount: i.amount,
          accounts: i.accounts.join(", "),
        })),
      },
    ],
  }
}

export interface TbCompareRow {
  code: string
  name: string
  xeroCode: string
  xeroName: string
  qbo: number
  xero: number
  diff: number
  issueIds: string[]
  explained: number
}

export function tbCompareReport(rows: TbCompareRow[], asAt: string): Report {
  const differing = rows.filter((r) => Math.abs(r.diff) > 0.005).length
  return {
    id: "TR-TB",
    title: "Trial balance: QuickBooks vs Xero",
    subtitle: `At ${formatShort(asAt)}`,
    status: differing ? "fail" : "pass",
    headline: differing ? `${differing} accounts differ. Each difference lists the discrepancies that explain it.` : "Every account agrees.",
    tables: [
      {
        title: "By account (debit positive, credit negative)",
        columns: [
          { key: "code", label: "QBO code" },
          { key: "name", label: "QuickBooks account" },
          { key: "xeroCode", label: "Xero code" },
          { key: "xeroName", label: "Xero account" },
          { key: "qbo", label: "QuickBooks", kind: "money" },
          { key: "xero", label: "Xero", kind: "money" },
          { key: "diff", label: "Difference", kind: "money" },
          { key: "status", label: "Result", kind: "status" },
          { key: "issues", label: "Explained by" },
        ],
        rows: rows.map((r) => ({
          code: r.code,
          name: r.name,
          xeroCode: r.xeroCode,
          xeroName: r.xeroName,
          qbo: r.qbo,
          xero: r.xero,
          diff: r.diff,
          status: Math.abs(r.diff) > 0.005 ? "Differs" : "Agrees",
          issues: r.issueIds.join(", "),
        })),
      },
    ],
  }
}
