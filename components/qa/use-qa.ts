"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { now } from "@/lib/clock"
import { issues, type Issue, type IssueStatus } from "@/lib/data/issues"
import { lastRunAt, recentRuns } from "@/lib/data/schedule"
import { useDemo, useIssues } from "@/lib/demo-store"
import { runAt, type Fixes, type RunResult } from "@/lib/qa/engine"

/**
 * QA state for the screens: scheduled runs, manual "Run now" runs and the time
 * each exception was marked resolved (so the next run can confirm the fix).
 * Kept in sessionStorage under its own key, alongside the shared demo store.
 */
const KEY = "ledgershift:qa:v1"

interface Local {
  manualRuns: string[]
  fixes: Fixes
}

export interface QaState {
  ready: boolean
  latest: RunResult | null
  /** Newest first: 12 scheduled runs plus any manual runs in that window */
  history: RunResult[]
  /** Issues with demo status changes applied */
  list: Issue[]
  fixes: Fixes
  statusOf: (i: Issue) => IssueStatus
  /** Marked resolved in the demo, not yet confirmed by a run */
  isPending: (i: Issue) => boolean
  setStatus: (id: string, status: IssueStatus) => void
  /** Runs the engine now and records it as a manual run */
  runNow: () => RunResult
}

export function useQa(): QaState {
  const { state, hydrated } = useDemo()
  const { list, setStatus } = useIssues()
  const [local, setLocal] = useState<Local>({ manualRuns: [], fixes: {} })
  const [loaded, setLoaded] = useState(false)
  const [runKey, setRunKey] = useState(0)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Local>
        setLocal({ manualRuns: saved.manualRuns ?? [], fixes: saved.fixes ?? {} })
      }
    } catch {
      // storage blocked: works for this page view
    }
    setLoaded(true)
    setRunKey(lastRunAt().getTime())
    const id = setInterval(() => setRunKey(lastRunAt().getTime()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      sessionStorage.setItem(KEY, JSON.stringify(local))
    } catch {
      // ignore
    }
  }, [local, loaded])

  // Keep fix times in step with the shared status overrides (they may be changed on other screens)
  useEffect(() => {
    if (!loaded || !hydrated) return
    setLocal((prev) => {
      const fixes = { ...prev.fixes }
      let changed = false
      for (const i of issues()) {
        const resolvedNow = state.issueStatus[i.id] === "resolved" && i.status !== "resolved"
        if (resolvedNow && !fixes[i.id]) {
          fixes[i.id] = now().toISOString()
          changed = true
        }
        if (!resolvedNow && fixes[i.id]) {
          delete fixes[i.id]
          changed = true
        }
      }
      return changed ? { ...prev, fixes } : prev
    })
  }, [state.issueStatus, loaded, hydrated])

  const runs = useMemo(() => {
    if (!loaded || !runKey) return null
    const ref = now()
    const scheduled = recentRuns(12, ref).map((at) => runAt(at, { fixes: local.fixes }))
    const oldest = scheduled[scheduled.length - 1].at.getTime()
    const manual = local.manualRuns
      .map((s) => new Date(s))
      .filter((d) => d.getTime() > oldest && d.getTime() <= ref.getTime())
      .map((at) => runAt(at, { manual: true, fixes: local.fixes }))
    const history = [...scheduled, ...manual].sort((a, b) => b.at.getTime() - a.at.getTime())
    const head = history[0]
    history[0] = runAt(head.at, { manual: head.manual, detailed: true, fixes: local.fixes })
    return { history, latest: history[0] }
  }, [loaded, runKey, local])

  const statusOf = useCallback((i: Issue) => state.issueStatus[i.id] ?? i.status, [state.issueStatus])
  const latest = runs?.latest ?? null
  const isPending = useCallback(
    (i: Issue) => statusOf(i) === "resolved" && i.status !== "resolved" && !!latest?.exceptions.some((e) => e.id === i.id),
    [statusOf, latest],
  )

  const runNow = useCallback(() => {
    const at = now()
    const fixes = { ...local.fixes }
    // Fixes marked this very moment still count for this run
    for (const i of issues()) if (state.issueStatus[i.id] === "resolved" && i.status !== "resolved" && !fixes[i.id]) fixes[i.id] = at.toISOString()
    setLocal((p) => ({ fixes: { ...fixes, ...p.fixes }, manualRuns: [...p.manualRuns, at.toISOString()].slice(-8) }))
    return runAt(at, { manual: true, detailed: true, fixes })
  }, [local.fixes, state.issueStatus])

  return {
    ready: loaded && hydrated && !!runs,
    latest,
    history: runs?.history ?? [],
    list,
    fixes: local.fixes,
    statusOf,
    isPending,
    setStatus,
    runNow,
  }
}
