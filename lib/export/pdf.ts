/**
 * Branded PDF exports for any Report (financial reports, migration
 * comparisons, AI QA reports). jsPDF is loaded on demand.
 */
import { brand } from "../brand"
import { downloadBlob } from "../csv"
import { formatDateTime } from "../clock"
import { fmtInt, fmtMoney } from "../format"
import type { Cell, Report, ReportCtx, ReportStatus, Table } from "../reports/types"

type RGB = [number, number, number]
type Doc = import("jspdf").jsPDF
type AutoTable = (d: Doc, o: object) => void

async function loadImage(src: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(src)
    const blob = await res.blob()
    const data = await new Promise<string | null>((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => resolve(null)
      r.readAsDataURL(blob)
    })
    if (!data) return null
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => resolve({ w: 1, h: 1 })
      img.src = data
    })
    return { data, ...dims }
  } catch {
    return null
  }
}

type Assets = { mmc: Awaited<ReturnType<typeof loadImage>>; qb: Awaited<ReturnType<typeof loadImage>>; xero: Awaited<ReturnType<typeof loadImage>> }

async function setup(orientation: "portrait" | "landscape" = "landscape") {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")])
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" })
  const [mmc, qb, xero] = await Promise.all([loadImage(brand.poweredBy.logoSrc), loadImage(brand.logos.quickbooksWhite), loadImage(brand.logos.xeroWordmarkWhite)])
  return { doc, autoTable: autoTableMod.default as unknown as AutoTable, assets: { mmc, qb, xero } as Assets }
}

/** jsPDF's built-in fonts only cover WinAnsi; swap characters they can't draw */
export function pdfSafe(s: string): string {
  return s
    .replace(/→/g, "->")
    .replace(/↔/g, "<->")
    .replace(/[−–]/g, "-")
    .replace(/[✓✔]/g, "OK")
    .replace(/×/g, "x")
    .replace(/[^\x00-\xFF–—‘’“”•…€]/g, "")
}

function cellText(v: Cell | undefined, kind?: string): string {
  if (v === undefined || v === "") return ""
  if (kind === "money" && typeof v === "number") return fmtMoney(v)
  if (kind === "int" && typeof v === "number") return fmtInt(v)
  if (kind === "pct" && typeof v === "number") return `${v.toFixed(1)}%`
  return pdfSafe(String(v))
}

/** Navy band: product name + QuickBooks → Xero logos left, "Powered by MMC Convert" right */
function header(doc: Doc, a: Assets) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(...brand.pdf.primary)
  doc.rect(0, 0, w, 54, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(pdfSafe(brand.productName), 32, 33)
  let x = 32 + doc.getTextWidth(brand.productName) + 16
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.4)
  doc.line(x - 8, 18, x - 8, 38)
  if (a.qb) {
    const h = 14
    const iw = (a.qb.w / a.qb.h) * h
    doc.addImage(a.qb.data, "PNG", x, 20, iw, h)
    x += iw + 6
  }
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("->", x, 31)
  x += 16
  if (a.xero) {
    const h = 13
    const iw = (a.xero.w / a.xero.h) * h
    doc.addImage(a.xero.data, "PNG", x, 21, iw, h)
  }
  doc.setFontSize(8)
  doc.text(`Powered by ${brand.poweredBy.name}`, w - 32 - (a.mmc ? 30 : 0), 31, { align: "right" })
  if (a.mmc) {
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(w - 56, 13, 26, 26, 3, 3, "F")
    doc.addImage(a.mmc.data, "PNG", w - 55, 14, 24, 24)
  }
}

function footer(doc: Doc, ctx: ReportCtx) {
  const pages = doc.getNumberOfPages()
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(...brand.pdf.muted)
    doc.text(pdfSafe(`${brand.productName} · ${ctx.company} · ${ctx.reference} · generated ${formatDateTime(new Date(ctx.generatedAt))}`), 32, h - 18)
    doc.text(`Page ${i} of ${pages}`, w - 32, h - 18, { align: "right" })
  }
}

const STATUS_LABEL: Record<ReportStatus, string> = { pass: "PASS", fail: "EXCEPTIONS", warning: "REVIEW", info: "REFERENCE" }
function statusColour(s: ReportStatus): RGB {
  return s === "pass" ? brand.pdf.success : s === "fail" ? brand.pdf.danger : s === "warning" ? brand.pdf.warning : brand.pdf.muted
}

function drawTables(doc: Doc, autoTable: AutoTable, tables: Table[], startY: number) {
  let y = startY
  const h = doc.internal.pageSize.getHeight()
  for (const t of tables) {
    if (y > h - 90) {
      doc.addPage()
      y = 80
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...brand.pdf.ink)
    doc.text(pdfSafe(t.title), 32, y)
    autoTable(doc, {
      startY: y + 6,
      margin: { left: 32, right: 32, top: 70 },
      head: [t.columns.map((c) => pdfSafe(c.label))],
      body: t.rows.map((r) => t.columns.map((c) => cellText(r[c.key], c.kind))),
      foot: t.footer ? [t.columns.map((c) => cellText(t.footer![c.key], c.kind))] : undefined,
      styles: { fontSize: 7.8, cellPadding: 3.5, textColor: brand.pdf.ink, lineColor: [226, 230, 235], lineWidth: 0.4, overflow: "linebreak" },
      headStyles: { fillColor: brand.pdf.accent, textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [240, 243, 246], textColor: brand.pdf.ink, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: Object.fromEntries(t.columns.map((c, i) => [i, ["money", "int", "pct"].includes(c.kind ?? "") ? { halign: "right" } : {}])),
      didParseCell: (data: { section: string; column: { index: number }; cell: { raw: unknown; styles: { textColor: unknown; fontStyle: string } } }) => {
        const col = t.columns[data.column.index]
        if (data.section === "body" && col?.kind === "status") {
          const v = String(data.cell.raw).toLowerCase()
          data.cell.styles.fontStyle = "bold"
          data.cell.styles.textColor = /pass|match|ok|resolved|agree/.test(v) ? brand.pdf.success : /fail|high|differ|missing|open/.test(v) ? brand.pdf.danger : /review|medium|warn/.test(v) ? brand.pdf.warning : brand.pdf.muted
        }
      },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26
  }
  return y
}

function drawReport(doc: Doc, autoTable: AutoTable, report: Report, ctx: ReportCtx) {
  const w = doc.internal.pageSize.getWidth()
  doc.setTextColor(...brand.pdf.ink)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(17)
  doc.text(pdfSafe(report.title), 32, 86)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...brand.pdf.muted)
  doc.text(pdfSafe([ctx.company, ctx.scope, ctx.period, report.subtitle].filter(Boolean).join(" · ")), 32, 102, { maxWidth: w - 170 })

  if (report.status) {
    doc.setFillColor(...statusColour(report.status))
    doc.roundedRect(w - 132, 74, 100, 22, 11, 11, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text(STATUS_LABEL[report.status], w - 82, 89, { align: "center" })
  }

  let y = 122
  if (report.headline) {
    doc.setTextColor(...brand.pdf.ink)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9.5)
    const lines = doc.splitTextToSize(pdfSafe(report.headline), w - 64)
    doc.text(lines, 32, y)
    y += lines.length * 12 + 6
  }

  if (report.summary?.length) {
    const n = report.summary.length
    const gap = 8
    const bw = (w - 64 - gap * (n - 1)) / n
    report.summary.forEach((s, i) => {
      const x = 32 + i * (bw + gap)
      doc.setFillColor(242, 246, 250)
      doc.roundedRect(x, y, bw, 40, 4, 4, "F")
      doc.setFontSize(7.5)
      doc.setTextColor(...brand.pdf.muted)
      doc.text(pdfSafe(s.label), x + 8, y + 14, { maxWidth: bw - 16 })
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(...brand.pdf.ink)
      doc.text(pdfSafe(s.value), x + 8, y + 31, { maxWidth: bw - 16 })
      doc.setFont("helvetica", "normal")
    })
    y += 60
  } else y += 10

  y = drawTables(doc, autoTable, report.tables, y + 6)
  if (report.notes?.length) {
    doc.setFontSize(8)
    doc.setTextColor(...brand.pdf.muted)
    for (const n of report.notes) {
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage()
        y = 80
      }
      const lines = doc.splitTextToSize(pdfSafe(`• ${n}`), w - 64)
      doc.text(lines, 32, y)
      y += lines.length * 11 + 3
    }
  }
}

function fileSafe(s: string) {
  return s.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

/** One report → one PDF download */
export async function reportPdf(report: Report, ctx: ReportCtx, filename?: string) {
  return reportsPdf([report], ctx, filename ?? `${fileSafe(ctx.reference)}-${fileSafe(report.title)}.pdf`)
}

/** Several reports in one PDF, each starting on a new page */
export async function reportsPdf(reports: Report[], ctx: ReportCtx, filename: string, orientation: "portrait" | "landscape" = "landscape") {
  const blob = await reportsPdfBlob(reports, ctx, orientation)
  downloadBlob(filename, blob)
}

/** Same as reportsPdf but returns the Blob (e.g. to show as an email attachment) */
export async function reportsPdfBlob(reports: Report[], ctx: ReportCtx, orientation: "portrait" | "landscape" = "landscape"): Promise<Blob> {
  const { doc, autoTable, assets } = await setup(orientation)
  reports.forEach((r, i) => {
    if (i > 0) doc.addPage()
    drawReport(doc, autoTable, r, ctx)
  })
  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i)
    header(doc, assets)
  }
  footer(doc, ctx)
  return doc.output("blob")
}
