"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { FileSpreadsheet, FileText, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Issue, IssueStatus } from "@/lib/data/issues"
import type { RunResult } from "@/lib/qa/types"
import { downloadQaPdf, downloadQaXlsx } from "./downloads"

export function ReportActions({ run, statusOf, showEmail = true }: { run: RunResult; statusOf: (i: Issue) => IssueStatus; showEmail?: boolean }) {
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null)
  const go = async (kind: "pdf" | "xlsx") => {
    setBusy(kind)
    try {
      if (kind === "pdf") await downloadQaPdf(run, statusOf)
      else await downloadQaXlsx(run, statusOf)
    } catch {
      toast.error("The report could not be generated. Please try again.")
    } finally {
      setBusy(null)
    }
  }
  return (
    <>
      <Button variant="outline" onClick={() => go("pdf")} disabled={!!busy}>
        {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} QA report (PDF)
      </Button>
      <Button variant="outline" onClick={() => go("xlsx")} disabled={!!busy}>
        {busy === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel
      </Button>
      {showEmail && (
        <Button asChild>
          <Link href="/qa/email">
            <Mail className="h-4 w-4" /> Preview email
          </Link>
        </Button>
      )}
    </>
  )
}
