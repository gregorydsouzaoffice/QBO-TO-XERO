/** Branded Excel exports for any Report. ExcelJS is loaded on demand. */
import { brand } from "../brand"
import { downloadBlob } from "../csv"
import type { Report, ReportCtx } from "../reports/types"

const hex = (rgb: readonly number[]) => "FF" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase()

export async function reportsXlsx(reports: Report[], ctx: ReportCtx, filename: string) {
  const ExcelJS = (await import("exceljs")).default
  const wb = new ExcelJS.Workbook()
  wb.creator = `${brand.productName} (powered by ${brand.poweredBy.name})`
  wb.created = new Date()
  const accent = hex(brand.pdf.accent)
  const navy = hex(brand.pdf.primary)

  for (const report of reports) {
    const ws = wb.addWorksheet(`${report.id} ${report.title}`.slice(0, 31).replace(/[\\/?*[\]:]/g, "-"), { views: [{ showGridLines: false }] })
    ws.addRow([`${brand.productName} · QuickBooks Online → Xero · Powered by ${brand.poweredBy.name}`]).font = { bold: true, color: { argb: navy }, size: 9 }
    ws.addRow([report.title]).font = { bold: true, size: 14 }
    ws.addRow([[ctx.company, ctx.scope, ctx.period, report.subtitle, ctx.reference].filter(Boolean).join(" · ")]).font = { color: { argb: "FF59687A" }, size: 9 }
    if (report.headline) ws.addRow([report.headline]).font = { size: 10 }
    if (report.summary?.length) {
      ws.addRow([])
      const labels = ws.addRow(report.summary.map((s) => s.label))
      labels.font = { color: { argb: "FF59687A" }, size: 9 }
      ws.addRow(report.summary.map((s) => s.value)).font = { bold: true, size: 11 }
    }

    for (const t of report.tables) {
      ws.addRow([])
      ws.addRow([t.title]).font = { bold: true, size: 11 }
      const head = ws.addRow(t.columns.map((c) => c.label))
      head.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accent } }
        cell.alignment = { vertical: "middle" }
      })
      for (const row of t.rows) {
        const r = ws.addRow(t.columns.map((c) => row[c.key] ?? ""))
        t.columns.forEach((c, i) => {
          const cell = r.getCell(i + 1)
          if (c.kind === "money") cell.numFmt = "#,##0.00;(#,##0.00)"
          if (c.kind === "int") cell.numFmt = "#,##0"
          if (c.kind === "pct") cell.numFmt = '0.0"%"'
          if (c.kind === "status") {
            const v = String(row[c.key]).toLowerCase()
            const colour = /pass|match|ok|resolved|agree/.test(v) ? hex(brand.pdf.success) : /fail|high|differ|missing|open/.test(v) ? hex(brand.pdf.danger) : /review|medium|warn/.test(v) ? hex(brand.pdf.warning) : hex(brand.pdf.muted)
            cell.font = { bold: true, color: { argb: colour } }
          }
        })
      }
      if (t.footer) {
        const f = ws.addRow(t.columns.map((c) => t.footer![c.key] ?? ""))
        f.font = { bold: true }
        t.columns.forEach((c, i) => {
          if (c.kind === "money") f.getCell(i + 1).numFmt = "#,##0.00;(#,##0.00)"
          f.getCell(i + 1).border = { top: { style: "thin" } }
        })
      }
    }
    for (const n of report.notes ?? []) ws.addRow([n]).font = { italic: true, color: { argb: "FF59687A" }, size: 9 }

    const widths: number[] = []
    ws.eachRow((row, idx) => {
      if (idx <= 4) return
      row.eachCell((cell, col) => {
        const len = String(cell.value ?? "").length
        widths[col - 1] = Math.min(60, Math.max(widths[col - 1] ?? 10, len + 2))
      })
    })
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w))
  }

  const buf = await wb.xlsx.writeBuffer()
  downloadBlob(filename, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
}
