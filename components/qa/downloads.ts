import type { Issue, IssueStatus } from "@/lib/data/issues"
import { reportsPdf, reportsPdfBlob } from "@/lib/export/pdf"
import { reportsXlsx } from "@/lib/export/xlsx"
import { qaFileName, qaReportCtx, qaReports } from "@/lib/qa/report"
import type { RunResult } from "@/lib/qa/types"

type StatusOf = (i: Issue) => IssueStatus

export async function downloadQaPdf(run: RunResult, statusOf?: StatusOf) {
  await reportsPdf(qaReports(run, statusOf), qaReportCtx(run), qaFileName(run, "pdf"))
}

export async function downloadQaXlsx(run: RunResult, statusOf?: StatusOf) {
  await reportsXlsx(qaReports(run, statusOf), qaReportCtx(run), qaFileName(run, "xlsx"))
}

/** The same PDF as a Blob, for the email attachment preview */
export async function qaPdfBlob(run: RunResult, statusOf?: StatusOf): Promise<Blob> {
  return reportsPdfBlob(qaReports(run, statusOf), qaReportCtx(run))
}
