"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Money } from "@/components/figures"
import ExportButtons from "@/components/reports/export-buttons"
import { formatDate, formatDateTime } from "@/lib/clock"
import { KIND_LABEL, SEVERITY_ORDER, type IssueArea, type IssueKind, type IssueStatus, type Severity } from "@/lib/data/issues"
import { useIssues } from "@/lib/demo-store"
import { exceptionsReport, trackerCtx, trackerFile } from "@/lib/tracker/exports"
import { FilterBar, FilterSelect, SearchInput } from "./filters"
import { IssueStatusPill, SeverityPill } from "./pills"

const AREAS: IssueArea[] = ["Bank", "Payables", "Receivables", "GST", "Payroll", "Jobs & WIP", "Contacts", "Tracking", "Conversion"]

export default function ExceptionsTab() {
  const { list } = useIssues()
  const [severity, setSeverity] = useState<"all" | Severity>("all")
  const [area, setArea] = useState<"all" | IssueArea>("all")
  const [kind, setKind] = useState<"all" | IssueKind>("all")
  const [status, setStatus] = useState<"all" | "unresolved" | IssueStatus>("unresolved")
  const [q, setQ] = useState("")

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return list
      .filter((i) => {
        if (severity !== "all" && i.severity !== severity) return false
        if (area !== "all" && i.area !== area) return false
        if (kind !== "all" && i.kind !== kind) return false
        if (status === "unresolved" && i.status === "resolved") return false
        if (status !== "all" && status !== "unresolved" && i.status !== status) return false
        if (term && !`${i.id} ${i.title} ${i.qboRef ?? ""} ${i.xeroRef ?? ""} ${i.accounts.join(" ")}`.toLowerCase().includes(term)) return false
        return true
      })
      .sort((a, b) => (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0) || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (a.detectedAt < b.detectedAt ? 1 : -1))
  }, [list, severity, area, kind, status, q])

  const active = severity !== "all" || area !== "all" || kind !== "all" || status !== "unresolved" || q !== ""
  const open = list.filter((i) => i.status !== "resolved")
  const value = open.reduce((t, i) => t + i.amount, 0)

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Count label="Open" value={open.filter((i) => i.status === "open").length} />
        <Count label="In review" value={open.filter((i) => i.status === "in-review").length} />
        <Count label="High severity" value={open.filter((i) => i.severity === "high").length} />
        <Count label="Resolved" value={list.filter((i) => i.status === "resolved").length} />
        <div className="panel col-span-2 p-4 lg:col-span-1">
          <div className="text-xs text-muted-foreground">Value of unresolved items</div>
          <div className="mt-1 text-2xl font-bold"><Money value={value} whole /></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header flex-wrap">
          <div>
            <div className="panel-title">Discrepancies</div>
            <div className="text-xs text-muted-foreground">Found by the AI QA engine. Open one to see the evidence from each source.</div>
          </div>
          <ExportButtons compact build={() => ({ reports: [exceptionsReport(rows)], ctx: trackerCtx("QuickBooks Online vs Xero"), name: trackerFile("discrepancies") })} />
        </div>
        <FilterBar count={rows.length} total={list.length} active={active} onClear={() => { setSeverity("all"); setArea("all"); setKind("all"); setStatus("unresolved"); setQ("") }}>
          <FilterSelect label="Severity" value={severity} onChange={setSeverity} options={[{ value: "all", label: "All" }, { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]} />
          <FilterSelect label="Area" value={area} onChange={setArea} options={[{ value: "all", label: "All areas" }, ...AREAS.map((a) => ({ value: a, label: a }))]} />
          <FilterSelect label="Kind" value={kind} onChange={setKind} options={[{ value: "all", label: "All kinds" }, ...(Object.keys(KIND_LABEL) as IssueKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))]} />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={[{ value: "unresolved", label: "Not resolved" }, { value: "all", label: "All" }, { value: "open", label: "Open" }, { value: "in-review", label: "In review" }, { value: "resolved", label: "Resolved" }]}
          />
          <SearchInput value={q} onChange={setQ} placeholder="ID, title, reference, account" className="col-span-2" />
        </FilterBar>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[960px]">
            <thead>
              <tr>
                <th>Discrepancy</th>
                <th>Area</th>
                <th>Kind</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Date</th>
                <th className="num">Amount</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/qa/exceptions/${i.id}`} className="group block">
                      <span className="font-mono text-xs text-muted-foreground">{i.id}</span>
                      <span className="block font-medium text-foreground group-hover:text-primary group-hover:underline">{i.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        QBO: {i.qboRef ?? "—"} · Xero: {i.xeroRef ?? "—"}
                      </span>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{i.area}</td>
                  <td className="whitespace-nowrap">{KIND_LABEL[i.kind]}</td>
                  <td><SeverityPill severity={i.severity} /></td>
                  <td><IssueStatusPill status={i.status} /></td>
                  <td className="whitespace-nowrap text-xs">
                    <div>{formatDate(i.date)}</div>
                    <div className="text-muted-foreground">Found {formatDateTime(new Date(i.detectedAt))}</div>
                  </td>
                  <td className="num">{i.amount ? <Money value={i.amount} /> : "—"}</td>
                  <td>
                    <Link href={`/qa/exceptions/${i.id}`} className="inline-flex items-center gap-0.5 whitespace-nowrap text-sm font-medium text-primary hover:underline">
                      Open <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No discrepancies match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}
