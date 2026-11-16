"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, MessageSquarePlus, RotateCcw, UserCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime, formatTime, now } from "@/lib/clock"
import { QA_RECIPIENTS, USER } from "@/lib/data/company"
import type { Issue, IssueStatus } from "@/lib/data/issues"
import { nextRunAt } from "@/lib/data/schedule"

interface Note {
  at: Date
  by: string
  text: string
}

export function ExceptionActions({ issue, status, pending, setStatus }: { issue: Issue; status: IssueStatus; pending: boolean; setStatus: (id: string, s: IssueStatus) => void }) {
  const [assignee, setAssignee] = useState(issue.needsReview ? QA_RECIPIENTS[0].email : "")
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState("")

  const change = (s: IssueStatus) => {
    setStatus(issue.id, s)
    if (s === "resolved") toast.success(`${issue.id} marked resolved`, { description: `The next QA run at ${formatTime(nextRunAt())} confirms the fix. Use Run now on the AI QA page to check straight away.` })
    else if (s === "in-review") toast(`${issue.id} marked in review`, { description: "The engine keeps checking it every 2 hours." })
    else toast(`${issue.id} reopened`, { description: "It will stay on the exception report until a run confirms it is fixed." })
  }

  const addNote = () => {
    const text = draft.trim()
    if (!text) return
    setNotes((n) => [{ at: now(), by: USER.name, text }, ...n])
    setDraft("")
  }

  return (
    <div className="space-y-5 p-5">
      <div>
        <div className="mb-2 text-xs font-semibold text-muted-foreground">Status</div>
        <div className="flex flex-wrap gap-2">
          {status !== "resolved" && (
            <Button onClick={() => change("resolved")}>
              <CheckCircle2 className="h-4 w-4" /> Mark resolved
            </Button>
          )}
          {status === "open" && (
            <Button variant="outline" onClick={() => change("in-review")}>
              <UserCheck className="h-4 w-4" /> Mark in review
            </Button>
          )}
          {status === "in-review" && (
            <Button variant="outline" onClick={() => change("open")}>
              <RotateCcw className="h-4 w-4" /> Back to open
            </Button>
          )}
          {status === "resolved" && (
            <Button variant="outline" onClick={() => change("open")}>
              <RotateCcw className="h-4 w-4" /> Reopen
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {pending
            ? `Marked resolved. The fix is confirmed when the next QA run (${formatTime(nextRunAt())}) finds the figures agree.`
            : status === "resolved"
              ? "Closed. If the difference comes back, the engine raises it again."
              : "Fix the item in Xero first, then mark it resolved. The fix is confirmed at the next QA run, not by this button."}
        </p>
      </div>

      <div>
        <label htmlFor="assignee" className="mb-2 block text-xs font-semibold text-muted-foreground">
          Assign to
        </label>
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <select
            id="assignee"
            value={assignee}
            onChange={(e) => {
              setAssignee(e.target.value)
              const r = QA_RECIPIENTS.find((x) => x.email === e.target.value)
              if (r) toast(`Assigned to ${r.name}`, { description: "They will see it at the top of their next QA email (simulated)." })
            }}
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Unassigned</option>
            {QA_RECIPIENTS.map((r) => (
              <option key={r.email} value={r.email}>
                {r.name} · {r.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="note" className="mb-2 block text-xs font-semibold text-muted-foreground">
          Notes
        </label>
        <Textarea id="note" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What was checked or changed, e.g. 'Deleted SM-3309 in Xero'" rows={3} />
        <div className="mt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={addNote} disabled={!draft.trim()}>
            <MessageSquarePlus className="h-4 w-4" /> Add note
          </Button>
        </div>
        {notes.length > 0 && (
          <ul className="mt-3 space-y-2">
            {notes.map((n, i) => (
              <li key={i} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="text-xs text-muted-foreground">
                  {n.by} · {formatDateTime(n.at)}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap">{n.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
