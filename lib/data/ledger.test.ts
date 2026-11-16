import { describe, expect, it } from "vitest"
import { addDays, conversionDate, currentFy, fyEnd, fyList, fyStart, todayISO } from "../clock"
import { balanceSheet, bankBalances, compareTrialBalances, plTotals, trialBalance } from "./ledger"
import { activeEffects, issues } from "./issues"
import { bankTransactions } from "./bank"

const dates = () => [addDays(conversionDate(), -1), todayISO(), fyEnd(currentFy() - 1), fyEnd(currentFy() - 4), "2019-07-31"]

describe("ledger", () => {
  it("balance sheet balances for QBO and Xero at several dates", () => {
    for (const d of dates()) {
      for (const sys of ["qbo", "xero"] as const) {
        const bs = balanceSheet(d, sys)
        expect(Math.abs(bs.check), `${sys} ${d}`).toBeLessThan(0.02)
      }
    }
  })

  it("trial balance debits equal credits", () => {
    for (const d of dates()) {
      for (const sys of ["qbo", "xero"] as const) {
        const tb = trialBalance(d, sys)
        const dr = tb.reduce((t, r) => t + r.debit, 0)
        const cr = tb.reduce((t, r) => t + r.credit, 0)
        expect(Math.abs(dr - cr), `${sys} ${d}`).toBeLessThan(0.05)
      }
    }
  })

  it("Xero equals QBO up to the day before the conversion date", () => {
    const rows = compareTrialBalances(addDays(conversionDate(), -1))
    expect(rows.every((r) => Math.abs(r.diff) < 0.01)).toBe(true)
  })

  it("Xero differs from QBO today by exactly the open issue effects", () => {
    const rows = compareTrialBalances(todayISO())
    const netDiff = rows.reduce((t, r) => t + r.diff, 0)
    expect(Math.abs(netDiff)).toBeLessThan(0.05)
    const effects = activeEffects()
    expect(effects.length).toBeGreaterThan(0)
    const mat = rows.find((r) => r.code === "5010")!
    const expected = effects.filter((e) => e.code === "5010").reduce((t, e) => t + e.amount, 0)
    expect(Math.abs(mat.diff - expected)).toBeLessThan(0.01)
  })

  it("figures are plausible", () => {
    for (const fy of fyList().slice(0, -1)) {
      const t = plTotals(fyStart(fy), fyEnd(fy))
      expect(t.income).toBeGreaterThan(1_000_000)
      expect(t.netMargin).toBeGreaterThan(-5)
      expect(t.netMargin).toBeLessThan(25)
    }
    for (const b of bankBalances(todayISO())) if (b.code !== "2110") expect(b.qbo).toBeGreaterThan(0)
  })

  it("issues and bank rows are consistent", () => {
    const list = issues()
    expect(new Set(list.map((i) => i.id)).size).toBe(list.length)
    for (const i of list) {
      const sum = i.effects.reduce((t, e) => t + e.amount, 0)
      expect(Math.abs(sum), i.id).toBeLessThan(0.01)
      expect(i.date <= todayISO()).toBe(true)
    }
    const rows = bankTransactions()
    expect(rows.some((r) => r.match === "duplicate-in-xero")).toBe(true)
    expect(rows.filter((r) => r.issueId === "EX-1047")).toHaveLength(4)
  })
})
