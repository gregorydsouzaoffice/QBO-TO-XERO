"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { rangeFor, type DateRange, type ViewKey } from "./clock"
import { QBO_COMPANY, XERO_ORG } from "./data/company"
import { issues, type Issue, type IssueStatus } from "./data/issues"

/**
 * What the demo remembers between screens. Kept in sessionStorage so a reload
 * mid-recording doesn't lose it.
 */
export type HistoryScope = "all" | "3fy" | "2fy" | "balances"
export type MigrationStatus = "not-started" | "in-progress" | "completed"

export interface DemoState {
  signedIn: boolean
  qbo: { connected: boolean; realmId: string }
  xero: { connected: boolean; tenantId: string }
  gojee: { connected: boolean }
  migration: {
    status: MigrationStatus
    /** Furthest wizard step reached, 1–6 */
    step: number
    history: HistoryScope
    /** Gojee on/off (Projects, Estimates, POs, inventory) */
    gojeeEnabled: boolean
    completedAt: string | null
  }
  /** Global reporting view shown in the top date selector */
  view: ViewKey
  custom: { from: string; to: string } | null
  /** Status changes made in the demo (e.g. marking an issue resolved) */
  issueStatus: Record<string, IssueStatus>
}

const KEY = "ledgershift:demo:v1"

export function initialDemoState(): DemoState {
  return {
    signedIn: false,
    qbo: { connected: false, realmId: QBO_COMPANY.realmId },
    xero: { connected: false, tenantId: XERO_ORG.tenantId },
    gojee: { connected: false },
    migration: { status: "not-started", step: 1, history: "all", gojeeEnabled: true, completedAt: null },
    view: "ytd",
    custom: null,
    issueStatus: {},
  }
}

/** Jump straight to the parallel run (everything connected, migration done) */
export function completedDemoState(base: DemoState = initialDemoState()): DemoState {
  return {
    ...base,
    signedIn: true,
    qbo: { ...base.qbo, connected: true },
    xero: { ...base.xero, connected: true },
    gojee: { connected: true },
    migration: { ...base.migration, status: "completed", step: 6, completedAt: base.migration.completedAt ?? new Date().toISOString() },
  }
}

interface Store {
  state: DemoState
  hydrated: boolean
  update: (fn: (s: DemoState) => DemoState) => void
  reset: () => void
  /** Current reporting range from the global date selector */
  range: DateRange
}

const Ctx = createContext<Store | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialDemoState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        const init = initialDemoState()
        setState({ ...init, ...saved, migration: { ...init.migration, ...saved.migration } })
      }
    } catch {
      // Storage blocked: the demo still works for this page view
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state, hydrated])

  const update = useCallback((fn: (s: DemoState) => DemoState) => setState(fn), [])
  const reset = useCallback(() => {
    try {
      // The QA module keeps resolution timestamps under its own key
      sessionStorage.removeItem("ledgershift:qa:v1")
    } catch {
      // ignore
    }
    setState(initialDemoState())
  }, [])
  const range = useMemo(() => rangeFor(state.view, state.custom ?? undefined), [state.view, state.custom])

  return <Ctx.Provider value={{ state, hydrated, update, reset, range }}>{children}</Ctx.Provider>
}

export function useDemo(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>")
  return ctx
}

/**
 * Issues with any status changes made in the demo applied (e.g. "Mark resolved").
 * Note: ledger figures keep the base statuses; a resolution shows as "fix
 * confirmed at the next QA run".
 */
export function useIssues(): { list: Issue[]; setStatus: (id: string, status: IssueStatus) => void } {
  const { state, update } = useDemo()
  const list = useMemo(() => issues().map((i) => (state.issueStatus[i.id] ? { ...i, status: state.issueStatus[i.id] } : i)), [state.issueStatus])
  const setStatus = useCallback((id: string, status: IssueStatus) => update((s) => ({ ...s, issueStatus: { ...s.issueStatus, [id]: status } })), [update])
  return { list, setStatus }
}
