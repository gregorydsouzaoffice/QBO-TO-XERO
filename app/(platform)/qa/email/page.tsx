"use client"

import Link from "next/link"
import { EmailPreview } from "@/components/qa/email-preview"
import { QaGate } from "@/components/qa/qa-gate"
import { ReportActions } from "@/components/qa/report-actions"
import { useQa } from "@/components/qa/use-qa"
import PageHeader, { PageBody } from "@/components/shell/page-header"
import { formatDateTime } from "@/lib/clock"

export default function QaEmailPage() {
  return (
    <QaGate>
      <EmailPage />
    </QaGate>
  )
}

function EmailPage() {
  const qa = useQa()
  if (!qa.ready || !qa.latest) return null
  const run = qa.latest
  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/qa" className="hover:text-foreground">
            ← AI QA
          </Link>
        }
        title="Automated QA email"
        description={`What the recipients received after run ${run.id} (${formatDateTime(run.at)}). The same email goes out after every run.`}
        actions={<ReportActions run={run} statusOf={qa.statusOf} showEmail={false} />}
      />
      <PageBody className="max-w-[960px]">
        <EmailPreview run={run} statusOf={qa.statusOf} />
      </PageBody>
    </>
  )
}
