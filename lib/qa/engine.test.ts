import { describe, expect, it } from "vitest"
import { issues } from "../data/issues"
import { lastRunAt } from "../data/schedule"
import { CHECKS, issueOpenAt, latestRun, runAt, scheduledRuns } from "./engine"
import { qaReportCtx, qaReports } from "./report"

describe("QA engine", () => {
  it("has a 30–45 check catalogue with unique IDs across six areas", () => {
    expect(CHECKS.length).toBeGreaterThanOrEqual(30)
    expect(CHECKS.length).toBeLessThanOrEqual(45)
    expect(new Set(CHECKS.map((c) => c.id)).size).toBe(CHECKS.length)
    expect(new Set(CHECKS.map((c) => c.area)).size).toBe(6)
  })

  it("every exception is watched by at least one check", () => {
    for (const i of issues()) expect(CHECKS.some((c) => c.watches.includes(i.id)), i.id).toBe(true)
  })

  it("real measurements agree with the exceptions open at the latest run", () => {
    const run = latestRun()
    for (const r of run.checks) {
      expect(r.measure, r.check.id).toBeDefined()
      const failing = !r.measure!.ok
      if (r.issues.length === 0) expect(failing, `${r.check.id}: ${r.measure!.detail}`).toBe(false)
      else expect(failing, `${r.check.id} should measure a difference: ${r.measure!.detail}`).toBe(true)
    }
  })

  it("open exceptions follow detectedAt ≤ run < resolvedAt", () => {
    const run = latestRun()
    const at = lastRunAt()
    for (const i of issues()) expect(run.exceptions.some((e) => e.id === i.id)).toBe(issueOpenAt(i, at))
    expect(run.exceptions.some((e) => e.status === "resolved")).toBe(false)
  })

  it("marking every open issue resolved makes the next run pass everything", () => {
    const at = lastRunAt()
    const before = new Date(at.getTime() - 60_000).toISOString()
    const fixes = Object.fromEntries(issues().filter((i) => i.status !== "resolved").map((i) => [i.id, before]))
    const run = runAt(at, { detailed: true, fixes, manual: true })
    expect(run.exceptions).toHaveLength(0)
    for (const r of run.checks) expect(r.status, `${r.check.id}: ${r.measure?.detail}`).toBe("pass")
  })

  it("history has 12 runs, 2 hours apart", () => {
    const runs = scheduledRuns(12)
    expect(runs).toHaveLength(12)
    expect(runs[0].at.getTime() - runs[1].at.getTime()).toBe(7_200_000)
    expect(runs[0].counts.passed + runs[0].counts.warnings + runs[0].counts.failed).toBe(runs[0].counts.run)
  })

  it("builds an exportable QA report", () => {
    const run = latestRun()
    const reports = qaReports(run)
    expect(reports.length).toBe(4)
    expect(qaReportCtx(run).reference).toBe(run.id)
    for (const r of reports) for (const t of r.tables) for (const row of t.rows) for (const c of t.columns) expect(row[c.key], `${r.title} / ${t.title} / ${c.key}`).not.toBeUndefined()
  })
})
