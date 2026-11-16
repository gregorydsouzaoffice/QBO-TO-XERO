import { describe, expect, it } from "vitest"
import { conversionDate, currentYtd, priorFy, sinceInception, todayISO } from "../clock"
import { compareTrialBalances } from "../data/ledger"
import { issues } from "../data/issues"
import { allReports, bsStatement, plStatement } from "../reports/financial"
import { reconciliation } from "./bank"
import { dependencyLinks } from "./dependencies"
import { differs, explain } from "./explain"
import { healthAreas } from "./health"
import { monthEndClose, standardReports } from "./reporting"

const list = issues()

describe("tracker", () => {
  it("every trial-balance difference today is fully explained by an issue", () => {
    const today = todayISO()
    const diffs = compareTrialBalances(today).filter((r) => differs(r.diff))
    expect(diffs.length).toBeGreaterThan(0)
    for (const r of diffs) {
      const e = explain(r.code, list, conversionDate(), today)
      expect(Math.abs(r.diff - e.explained), r.code).toBeLessThan(0.02)
    }
  })

  it("reconciliation: Westpac and Amex differ in Xero, statement = QBO", () => {
    const rows = reconciliation(list)
    expect(rows).toHaveLength(3)
    for (const r of rows) expect(r.statement).toBe(r.qbo)
    expect(rows.find((r) => r.code === "2110")!.missing).toBe(4)
    expect(rows.find((r) => r.code === "1010")!.stale).toBeGreaterThanOrEqual(7)
  })

  it("dependency links pick up EX-1047 and EX-1048", () => {
    const links = dependencyLinks(list)
    expect(links.find((l) => l.id === "L-04")!.issues.map((i) => i.id)).toContain("EX-1047")
    expect(links.find((l) => l.id === "L-06")!.issues.map((i) => i.id)).toContain("EX-1048")
    expect(links.find((l) => l.id === "L-11")!.health).toBe("healthy")
    expect(links.find((l) => l.id === "L-10")!.health).toBe("minor")
  })

  it("month-end close: history months agree, parallel months differ", () => {
    const rows = monthEndClose(list)
    expect(rows.length).toBeGreaterThanOrEqual(13)
    for (const r of rows.filter((m) => m.phase === "history")) expect(r.tb.diffs).toBe(0)
    expect(rows[0].current).toBe(true)
  })

  it("standard reports and health areas compute", () => {
    const reps = standardReports(list)
    expect(reps.map((r) => r.key)).toEqual(["pl", "bs", "tb", "ar", "ap", "gst"])
    expect(reps.find((r) => r.key === "ap")!.agreement).toBe("differs")
    expect(reps.find((r) => r.key === "ar")!.agreement).toBe("partly")
    expect(healthAreas(list)).toHaveLength(7)
  })

  it("statements: net profit row matches totals and P&L agrees for the previous FY", () => {
    for (const range of [currentYtd(), priorFy(), sinceInception()]) {
      for (const src of ["xero", "qbo", "compare"] as const) {
        const pl = plStatement(range, src)
        expect(pl.rows[pl.rows.length - 1].label).toBe("Net profit")
        const bs = bsStatement(range, src)
        expect(bs.rows.some((r) => r.label === "Net assets")).toBe(true)
        const reports = allReports(range, src)
        for (const rep of reports) for (const t of rep.tables) for (const row of t.rows) for (const k of Object.keys(row)) expect(t.columns.some((c) => c.key === k), `${rep.id} ${k}`).toBe(true)
      }
    }
    const prior = plStatement(priorFy(), "compare")
    expect(prior.rows.every((r) => r.diff === null || !differs(r.diff))).toBe(true)
  })
})
