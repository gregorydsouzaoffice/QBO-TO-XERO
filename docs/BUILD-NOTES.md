# QBO → Xero + Gojee platform: build notes

Clickable demo (mock data, no backend) of an accounting-intelligence platform:
migrate QuickBooks Online (AU) into Xero (+ Gojee for jobs, quotes, POs and inventory),
then run both in parallel with a financial tracker, reporting and an AI Financial QA engine.

## Decisions (16 Nov 2026)

| # | Decision |
|---|---|
| D-01 | **Migrate + parallel run.** Login → Home. Migration is one module. After go-live the Tracker, Reports and AI QA compare QBO with Xero until QBO is switched off. |
| D-02 | **Clickable demo**, mock data. Sign-in screens for Intuit, Xero and Gojee are simulated replicas. |
| D-03 | **Australia**: GST, AUD, financial year July–June. |
| D-04 | **Platform login**: "Sign in with Xero" (primary) + email/password with 2FA. Gojee signs in automatically through Xero. |
| D-05 | **Product name is a placeholder** (`lib/brand.ts`, "LedgerShift"), shown as plain text. No product logo until one is supplied. "Powered by MMC Convert" kept. |
| D-06 | **AI QA runs every 2 hours**; delivery shown as an email preview + PDF attachment. |
| D-07 | **Split**: Xero gets the ledger (chart of accounts, contacts, invoices, bills, payments, credit notes, journals, bank, GST, tracking from Classes/Locations, attachments). Gojee gets Projects → Jobs, Estimates → Quotes, Purchase Orders, inventory items/quantities, TimeActivity → timesheets. |
| D-08 | **Theme: Xero-based UI** (navy nav `#062A4D`, action blue `#0078C8`, Xero cyan `#13B5EA` accents, Inter). QuickBooks appears only via official logo files. |
| D-09 | **Dynamic dates.** Everything derives from today (`lib/clock.ts`). Conversion (go-live) date = 1st of last month; parallel run since then. `NEXT_PUBLIC_DEMO_TODAY=YYYY-MM-DD` pins a date for recordings. |
| D-10 | **Logos: never drawn or invented.** Only files in `public/images/{qbo,xero,gojee}` (QuickBooks files supplied by the client 16 Nov 2026). |

## Market-standard flow this follows

Xero's own Q2X service, MMC Convert, Jet Convert and Movemybooks all follow the same steps:
connect QBO (Intuit sign-in → company picker → consent) → connect an empty Xero org → choose
history scope (all / N financial years / balances only) → conversion date + freeze QBO → map
(flatten sub-accounts, system accounts, GST codes, Classes/Locations → max 2 tracking categories)
→ migrate → validate (trial balance per period, P&L, balance sheet, aged AR/AP, bank, GST) →
go-live checklist (bank feeds, bank rules, recurring templates and budgets don't migrate).
Typical exclusions: payroll history, recurring templates, bank rules, budgets, audit trail,
reconciliation reports. QBO Projects and tracked inventory are poorly supported by Xero, which
is why they go to Gojee.

## Architecture

```
app/login/…                 platform login, 2FA, Xero + Gojee sign-in replicas
app/(platform)/layout.tsx   navy top nav + footer, redirects to /login if signed out
app/(platform)/home         dashboard (or onboarding until migration is done)
app/(platform)/migration    wizard: connect → scope → map → validate → import → go-live
app/(platform)/tracker      centralised tracker (bank, figures, reconciliation, dependencies, exceptions, reporting status, QBO vs Xero)
app/(platform)/reports      Current YTD / Previous FY / Since Inception financial reports
app/(platform)/qa           AI Financial QA engine (runs, exceptions, evidence, email + PDF)
app/(platform)/settings     connections, QA schedule and recipients
app/connect/quickbooks/…    Intuit sign-in replica (sign in → verify → company → consent)
```

### Shared foundation (edit with care; other modules depend on it)

| File | What it gives you |
|---|---|
| `lib/clock.ts` | `todayISO()`, `currentYtd()`, `priorFy()`, `sinceInception()`, `rangeFor()`, `conversionDate()`, `migratedThrough()`, `parallelRunDay()`, formatting (`formatShort`, `formatDate`, `formatDateTime`, `periodLabel`) |
| `lib/data/company.ts` | `COMPANY`, `USER`, `QBO_COMPANY`, `XERO_ORG`, `GOJEE_ACCOUNT`, `BANK_ACCOUNTS`, `QA_RECIPIENTS` |
| `lib/data/chart.ts` | `CHART` (QBO accounts with Xero mapping, system-account notes), `ACCOUNT_BY_CODE`, sections |
| `lib/data/ledger.ts` | `plBetween/plTotals/monthlyTrend` (P&L), `balancesAt/balanceSheet` (BS), `trialBalance`, `compareTrialBalances(iso)`, `bankBalances(iso)`. System = `"qbo"` or `"xero"`. Debit-positive internally; `natural()` for display. |
| `lib/data/issues.ts` | `issues()` / `openIssues()`: QBO-vs-Xero discrepancies with evidence rows, finding, recommendation, confidence. Their `effects` drive the Xero-side ledger differences. |
| `lib/data/bank.ts` | `bankTransactions()` (statement ↔ QBO ↔ Xero, since conversion), `feedStatuses()`, `bankSummary()` |
| `lib/data/schedule.ts` | QA every 2 h: `lastRunAt()`, `nextRunAt()`, `recentRuns()`, `untilNextRun()`, `runId()` |
| `lib/demo-store.tsx` | `useDemo()` → `state` (signedIn, connections, migration status/history/gojeeEnabled, view, issueStatus), `update`, `reset`, `range` (current reporting `DateRange`) |
| `lib/reports/types.ts` + `lib/export/{pdf,xlsx}.ts` | One `Report` object → screen, PDF (`reportPdf`, `reportsPdf`, `reportsPdfBlob`) and Excel (`reportsXlsx`) |
| `components/brand.tsx` | `QuickBooksLogo`, `QuickBooksMark`, `XeroMark`, `XeroWordmark`, `GojeeLogo`, `GojeeMark`, `ProductWordmark`, `PoweredBy`, `SystemChip` |
| `components/figures.tsx` | `Money`, `Delta` (variance chip), `StatTile`, `fmtCompact`, `fmtWhole`, `pctChange` |
| `components/charts.tsx` | `TrendChart`, `GroupedBars` (validated palette, one axis, tooltip, legend) |
| `components/shell/*` | `PageHeader`, `PageBody`, `ViewSelector` (global Current YTD / Previous FY / Since Inception / Custom), `TopNav` |

### UI conventions

- Panels: `className="panel"`, header `panel-header` + `panel-title`. Tables: `className="data-table"` (`num` class on numeric cells).
- Status pills: `pill-success | pill-warning | pill-danger | pill-info | pill-muted`; always text + icon, never colour alone.
- Charts: max two series (`CHART_COLOURS.xero` `#0078C8`, `CHART_COLOURS.qbo` `#108043`); comparison period = dashed grey. One y-axis.
- Money: `Money` / `fmtMoney`, en-AU, negatives in brackets. Dates: `formatShort` ("16 Nov 2026") or `formatDate` ("16/11/2026").
- Any number shown must come from `lib/data/*` so it traces back to a source.
- Copy: plain words, sentence case, no jargon where a plain word works.

### Module files

| Module | Files |
|---|---|
| Migration | `app/(platform)/migration/**`, `app/connect/quickbooks/**` (Intuit replica), `components/migration/*`, `lib/data/migration.ts`, `lib/reports/migration.ts` |
| Tracker | `app/(platform)/tracker/page.tsx` (`?tab=overview|bank|figures|reconciliation|dependencies|exceptions|reporting|compare`), `components/tracker/*`, `lib/tracker/*` |
| Reports | `app/(platform)/reports/page.tsx`, `components/reports/*`, `lib/reports/financial.ts` |
| AI QA | `app/(platform)/qa/**` (`/qa`, `/qa/exceptions/[id]`, `/qa/email`), `components/qa/*`, `lib/qa/*` (41 checks in six areas, run history, QA report) |
| Settings | `app/(platform)/settings/page.tsx`, `components/settings/*` |

### Demo shortcuts

- `/login?demo=parallel&to=/tracker` signs in and jumps straight to the parallel run (any `to` path).
- Avatar menu → "Skip to parallel run" / "Restart demo".
- `NEXT_PUBLIC_DEMO_TODAY=YYYY-MM-DD` pins "today" for a recording.

### Open items

- Official "Connect to QuickBooks" button asset and a standalone Intuit logo (not supplied; plain button with the official QuickBooks symbol used meanwhile, `TODO(official-asset)`).
- Product name and logo (placeholder "LedgerShift").
- Marking an issue resolved updates statuses straight away; the QA engine removes its effect from the Xero figures at the next run.
