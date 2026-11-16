"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Archive, Info, Layers, Search } from "lucide-react"
import { SystemChip } from "@/components/brand"
import { Money } from "@/components/figures"
import StepShell, { Banner } from "@/components/migration/step-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { addDays, conversionDate, formatShort } from "@/lib/clock"
import { CHART } from "@/lib/data/chart"
import {
  CLASS_MAP,
  CONTACT_COUNTS,
  CONTACT_SAMPLE,
  HEADER_ACCOUNT_COUNT,
  LOCATION_MAP,
  NOT_MIGRATED,
  OPEN_ESTIMATES,
  OPEN_POS,
  PROJECTS,
  PROJECT_COUNTS,
  QBO_ENTITIES,
  SERVICE_ITEMS,
  SUB_ACCOUNT_COUNT,
  SYSTEM_ACCOUNT_COUNT,
  TAX_CODES,
  chartMapNote,
  inventoryItems,
  splitByShares,
  wipValue,
} from "@/lib/data/migration"
import { fmtInt } from "@/lib/format"
import { useDemo } from "@/lib/demo-store"
import { cn } from "@/lib/utils"

const TABS = [
  { key: "accounts", label: "Chart of accounts" },
  { key: "tax", label: "Tax codes" },
  { key: "tracking", label: "Tracking" },
  { key: "contacts", label: "Contacts" },
  { key: "items", label: "Items" },
  { key: "projects", label: "Projects" },
  { key: "estimates", label: "Estimates" },
  { key: "pos", label: "Purchase orders" },
  { key: "excluded", label: "Not migrated" },
]

export default function MapPage() {
  const router = useRouter()
  const [tab, setTab] = useState("accounts")

  return (
    <StepShell
      step={3}
      title="Check how everything maps"
      description="We matched every QuickBooks record to its place in Xero. Nothing needs changing, but have a look at anything flagged."
      next={{ to: "Validate", onClick: () => router.push("/migration/validate") }}
      footerNote="All mappings complete"
    >
      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList className="h-auto w-max justify-start gap-1 bg-card p-1 shadow-sm ring-1 ring-border">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="accounts" className="mt-5">
          <AccountsTab />
        </TabsContent>
        <TabsContent value="tax" className="mt-5">
          <TaxTab />
        </TabsContent>
        <TabsContent value="tracking" className="mt-5">
          <TrackingTab />
        </TabsContent>
        <TabsContent value="contacts" className="mt-5">
          <ContactsTab />
        </TabsContent>
        <TabsContent value="items" className="mt-5">
          <ItemsTab />
        </TabsContent>
        <TabsContent value="projects" className="mt-5">
          <ProjectsTab />
        </TabsContent>
        <TabsContent value="estimates" className="mt-5">
          <EstimatesTab />
        </TabsContent>
        <TabsContent value="pos" className="mt-5">
          <PosTab />
        </TabsContent>
        <TabsContent value="excluded" className="mt-5">
          <ExcludedTab />
        </TabsContent>
      </Tabs>
    </StepShell>
  )
}

function Panel({ title, sub, right, children }: { title: string; sub?: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-header flex-wrap">
        <div>
          <div className="panel-title">{title}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
        {right}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}

function Arrow() {
  return <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-label="maps to" />
}

// ---------------------------------------------------------------------------

function AccountsTab() {
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState<"all" | "flagged">("all")
  const rows = useMemo(
    () =>
      CHART.filter((a) => (filter === "all" ? true : !!chartMapNote(a.code))).filter((a) => {
        if (!q) return true
        const s = q.toLowerCase()
        return [a.code, a.name, a.xeroCode, a.xeroName].some((v) => v.toLowerCase().includes(s))
      }),
    [q, filter],
  )
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini label="QuickBooks accounts" value={fmtInt(CHART.length)} />
        <Mini label="Sub-accounts flattened" value={fmtInt(SUB_ACCOUNT_COUNT)} />
        <Mini label="Header accounts not migrated" value={fmtInt(HEADER_ACCOUNT_COUNT)} />
        <Mini label="System accounts handled" value={fmtInt(SYSTEM_ACCOUNT_COUNT)} />
      </div>
      <Panel
        title="Chart of accounts"
        sub="QuickBooks account → Xero account, type and default tax rate"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an account" className="h-8 w-44 rounded-md border border-input bg-card pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring" aria-label="Find an account" />
            </label>
            <div className="flex rounded-md border border-input p-0.5 text-xs">
              {(["all", "flagged"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={cn("rounded px-2 py-1 font-medium", filter === f ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}>
                  {f === "all" ? "All" : "Flagged"}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>QBO code</th>
              <th>QuickBooks account</th>
              <th>QuickBooks type</th>
              <th>Parent</th>
              <th aria-hidden />
              <th>Xero code</th>
              <th>Xero account</th>
              <th>Xero type</th>
              <th>Tax rate</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const note = chartMapNote(a.code)
              return (
                <tr key={a.code} className={cn(a.header && "text-muted-foreground")}>
                  <td className="tabular-nums">{a.code}</td>
                  <td className={cn("font-medium", a.parent && "pl-7")}>{a.name}</td>
                  <td className="whitespace-nowrap text-muted-foreground">{a.qboType}</td>
                  <td className="tabular-nums text-muted-foreground">{a.parent ?? "—"}</td>
                  <td>
                    <Arrow />
                  </td>
                  <td className="tabular-nums">{a.xeroCode || "—"}</td>
                  <td>{a.header ? <span className="italic">Not migrated</span> : a.xeroName}</td>
                  <td className="whitespace-nowrap text-muted-foreground">{a.header ? "—" : a.xeroType}</td>
                  <td className="whitespace-nowrap text-muted-foreground">{a.xeroTax || "—"}</td>
                  <td className="min-w-[180px]">
                    {note ? <span className={note.tone === "warning" ? "pill-warning whitespace-normal" : note.tone === "info" ? "pill-info whitespace-normal" : "pill-muted whitespace-normal"}>{note.text}</span> : <span className="text-xs text-muted-foreground">Direct match</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

function TaxTab() {
  return (
    <Panel title="Tax codes" sub="QuickBooks Online (Australia) tax codes → Xero tax rates. BAS labels stay the same.">
      <table className="data-table">
        <thead>
          <tr>
            <th>QBO code</th>
            <th>QuickBooks tax code</th>
            <th>Rate</th>
            <th>Used on</th>
            <th aria-hidden />
            <th>Xero tax rate</th>
            <th>Xero tax type</th>
            <th>BAS</th>
            <th className="num">Transactions</th>
          </tr>
        </thead>
        <tbody>
          {TAX_CODES.map((t) => (
            <tr key={t.qboName}>
              <td className="font-mono text-xs">{t.qboCode}</td>
              <td className="font-medium">
                {t.qboName}
                {t.note && <div className="text-xs font-normal text-muted-foreground">{t.note}</div>}
              </td>
              <td className="tabular-nums">{t.rate}</td>
              <td className="text-muted-foreground">{t.appliesTo}</td>
              <td>
                <Arrow />
              </td>
              <td className="font-medium">{t.xeroName}</td>
              <td className="font-mono text-xs text-muted-foreground">{t.xeroType}</td>
              <td className="whitespace-nowrap text-muted-foreground">{t.basLabel}</td>
              <td className="num">{fmtInt(t.transactions)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

function TrackingTab() {
  const block = (title: string, cat: string, rows: typeof CLASS_MAP, qboLabel: string) => (
    <Panel title={title} sub={`Xero tracking category: “${cat}” · ${rows.length} options`}>
      <table className="data-table">
        <thead>
          <tr>
            <th>{qboLabel}</th>
            <th aria-hidden />
            <th>Xero option</th>
            <th className="num">Transactions</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.qbo}>
              <td className="font-medium">{r.qbo}</td>
              <td>
                <Arrow />
              </td>
              <td>{r.xeroOption}</td>
              <td className="num">{fmtInt(r.transactions)}</td>
              <td className="text-xs text-muted-foreground">{r.note ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
  return (
    <div className="space-y-5">
      <Banner tone="info">
        Xero allows two tracking categories with up to 100 options each. QuickBooks Classes become category 1 “Division” and Locations become category 2 “Location”. Sub-classes are
        flattened into “Parent - Child” options.
      </Banner>
      <div className="grid gap-5 xl:grid-cols-2">
        {block("Classes", "Division", CLASS_MAP, "QuickBooks class")}
        {block("Locations", "Location", LOCATION_MAP, "QuickBooks location")}
      </div>
    </div>
  )
}

function ContactsTab() {
  const c = CONTACT_COUNTS
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini label="Customers" value={fmtInt(c.customers.qbo)} sub={`${c.customers.active} active, ${c.customers.inactive} archived in Xero`} />
        <Mini label="Vendors" value={fmtInt(c.vendors.qbo)} sub={`${c.vendors.active} active, ${c.vendors.inactive} archived in Xero`} />
        <Mini label="Duplicates merged" value={fmtInt(c.customers.merged + c.vendors.merged)} sub="Same ABN or same name and email" />
        <Mini label="Employees" value={fmtInt(c.employees.qbo)} sub="Details only; pay history archived" />
      </div>
      <Panel title="Contacts (sample)" sub={`${c.customers.qbo + c.vendors.qbo - c.customers.merged - c.vendors.merged} Xero contacts after merging.`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>QuickBooks name</th>
              <th>Type</th>
              <th>ABN</th>
              <th aria-hidden />
              <th>Xero contact</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {CONTACT_SAMPLE.map((r) => (
              <tr key={r.qboName}>
                <td className="font-medium">{r.qboName}</td>
                <td className="text-muted-foreground">{r.type}</td>
                <td className="whitespace-nowrap tabular-nums text-muted-foreground">{r.abn || "—"}</td>
                <td>
                  <Arrow />
                </td>
                <td>
                  {r.xeroName}
                  {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
                </td>
                <td>{r.action === "Merge" ? <span className="pill-info">Merge</span> : r.action === "Migrate" ? <span className="pill-success">Migrate</span> : <span className="pill-muted">Archived</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

function ItemsTab() {
  const inv = useMemo(() => inventoryItems(), [])
  const svcCount = QBO_ENTITIES.find((e) => e.key === "items-service")!.total
  return (
    <div className="space-y-5">
      <Panel title="Service and non-inventory items" sub={`${svcCount} items → Xero items (untracked). Sample below.`} right={<SystemChip system="xero" />}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Item</th>
              <th>QuickBooks type</th>
              <th className="num">Sale price</th>
              <th aria-hidden />
              <th>Xero sales account</th>
              <th>Tax rate</th>
            </tr>
          </thead>
          <tbody>
            {SERVICE_ITEMS.map((i) => (
              <tr key={i.code}>
                <td className="font-mono text-xs">{i.code}</td>
                <td className="font-medium">{i.name}</td>
                <td className="text-muted-foreground">{i.qboType}</td>
                <td className="num">{i.price ? <Money value={i.price} currency /> : <span className="text-muted-foreground">Priced per job</span>}</td>
                <td>
                  <Arrow />
                </td>
                <td className="tabular-nums">{i.xeroAccount}</td>
                <td className="text-muted-foreground">{i.tax}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel
        title="Inventory items"
        sub={
          <>
            {inv.rows.length + inv.other.count} items with quantities → Xero inventory items. The inventory value of <Money value={inv.total} currency /> stays in Xero account 630 Inventory.
          </>
        }
        right={<SystemChip system="xero" />}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item</th>
              <th>Location</th>
              <th className="num">Qty on hand</th>
              <th className="num">Average cost</th>
              <th className="num">Value</th>
            </tr>
          </thead>
          <tbody>
            {inv.rows.map((i) => (
              <tr key={i.sku}>
                <td className="font-mono text-xs">{i.sku}</td>
                <td className="font-medium">{i.name}</td>
                <td className="text-muted-foreground">{i.location}</td>
                <td className="num">{fmtInt(i.qty)}</td>
                <td className="num">
                  <Money value={i.avgCost} currency />
                </td>
                <td className="num">
                  <Money value={i.value} currency />
                </td>
              </tr>
            ))}
            <tr>
              <td />
              <td className="text-muted-foreground">Other items ({inv.other.count})</td>
              <td />
              <td />
              <td />
              <td className="num">
                <Money value={inv.other.value} currency />
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="px-4 py-2.5" colSpan={5}>
                Total, agrees to QuickBooks 1200 Inventory Asset → Xero 630
              </td>
              <td className="num px-4 py-2.5">
                <Money value={inv.total} currency />
              </td>
            </tr>
          </tfoot>
        </table>
      </Panel>
    </div>
  )
}

function ProjectsTab() {
  const wip = useMemo(() => wipValue(), [])
  const open = PROJECTS.filter((p) => p.status === "Open")
  const parts = splitByShares(wip, [...open.map((p) => p.wipShare), 1 - open.reduce((t, p) => t + p.wipShare, 0)])
  const conv = conversionDate()
  return (
    <div className="space-y-4">
      <Banner tone="info">
        QuickBooks Projects map to Xero project tracking with their income, costs and time. Work in progress of <Money value={wip} currency /> stays in Xero
        635 and ties to the open projects in Xero.
      </Banner>
      <Panel
        title="Projects"
        sub={`${PROJECT_COUNTS.total} projects: ${PROJECT_COUNTS.open} open, ${PROJECT_COUNTS.completed} completed (completed projects come across closed, for history)`}
        right={<SystemChip system="xero" />}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>QuickBooks project</th>
              <th>Customer</th>
              <th>Started</th>
              <th>Status</th>
              <th className="num">Income to date</th>
              <th className="num">Costs to date</th>
              <th className="num">WIP</th>
              <th aria-hidden />
              <th>Xero project</th>
            </tr>
          </thead>
          <tbody>
            {PROJECTS.map((p) => {
              const i = open.indexOf(p)
              return (
                <tr key={p.xeroJob}>
                  <td className="font-medium">{p.qboName}</td>
                  <td className="text-muted-foreground">{p.customer}</td>
                  <td className="whitespace-nowrap text-muted-foreground">{formatShort(addDays(conv, -p.startDaysAgo))}</td>
                  <td>{p.status === "Open" ? <span className="pill-info">Open</span> : <span className="pill-muted">Completed</span>}</td>
                  <td className="num">
                    <Money value={p.income} whole />
                  </td>
                  <td className="num">
                    <Money value={p.costs} whole />
                  </td>
                  <td className="num">{i >= 0 ? <Money value={parts[i]} whole /> : <span className="text-muted-foreground">—</span>}</td>
                  <td>
                    <Arrow />
                  </td>
                  <td className="font-mono text-xs">{p.xeroJob}</td>
                </tr>
              )
            })}
            <tr>
              <td className="text-muted-foreground" colSpan={6}>
                Other open projects ({PROJECT_COUNTS.open - open.length})
              </td>
              <td className="num">
                <Money value={parts[parts.length - 1]} whole />
              </td>
              <td colSpan={2} />
            </tr>
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="px-4 py-2.5" colSpan={6}>
                Work in progress, agrees to QuickBooks 1300 → Xero 635
              </td>
              <td className="num px-4 py-2.5">
                <Money value={wip} whole />
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </Panel>
    </div>
  )
}

function EstimatesTab() {
  const e = QBO_ENTITIES.find((x) => x.key === "estimates")!
  const conv = conversionDate()
  return (
    <div className="space-y-4">
      <Panel
        title="Open estimates → Xero quotes"
        sub={`${e.open} open of ${fmtInt(e.total)} estimates. Accepted, closed and expired estimates are archived as PDF.`}
        right={<SystemChip system="xero" />}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Estimate</th>
              <th>Customer</th>
              <th>Description</th>
              <th className="num">Amount (inc GST)</th>
              <th>Expires</th>
              <th aria-hidden />
              <th>Xero quote</th>
            </tr>
          </thead>
          <tbody>
            {OPEN_ESTIMATES.map((q) => (
              <tr key={q.qboRef}>
                <td className="font-mono text-xs">{q.qboRef}</td>
                <td className="font-medium">{q.customer}</td>
                <td className="text-muted-foreground">{q.title}</td>
                <td className="num">
                  <Money value={q.amount} currency />
                </td>
                <td className="whitespace-nowrap text-muted-foreground">{formatShort(addDays(conv, 62 + q.expires))}</td>
                <td>
                  <Arrow />
                </td>
                <td className="font-mono text-xs">{q.xeroRef}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={7} className="text-muted-foreground">
                and {(e.open ?? 0) - OPEN_ESTIMATES.length} more open estimates
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

function PosTab() {
  const e = QBO_ENTITIES.find((x) => x.key === "purchase-orders")!
  return (
    <div className="space-y-4">
      <Panel
        title="Open purchase orders → Xero purchase orders"
        sub={`${e.open} open of ${fmtInt(e.total)} purchase orders, linked to their project. Closed POs are archived as PDF.`}
        right={<SystemChip system="xero" />}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>PO</th>
              <th>Supplier</th>
              <th>Job</th>
              <th className="num">Amount (inc GST)</th>
              <th>Received</th>
              <th aria-hidden />
              <th>Xero PO</th>
            </tr>
          </thead>
          <tbody>
            {OPEN_POS.map((p) => (
              <tr key={p.qboRef}>
                <td className="font-mono text-xs">{p.qboRef}</td>
                <td className="font-medium">{p.supplier}</td>
                <td className="font-mono text-xs">{p.job}</td>
                <td className="num">
                  <Money value={p.amount} currency />
                </td>
                <td>{p.received === "Partly received" ? <span className="pill-warning">Partly received</span> : <span className="pill-muted">Not received</span>}</td>
                <td>
                  <Arrow />
                </td>
                <td className="font-mono text-xs">{p.xeroRef}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={7} className="text-muted-foreground">
                and {(e.open ?? 0) - OPEN_POS.length} more open purchase orders
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

function ExcludedTab() {
  return (
    <Panel title="Not migrated, and what we do instead" sub="Standard for every QuickBooks to Xero conversion. Each one is covered by an archive file or a go-live task.">
      <ul className="divide-y divide-border">
        {NOT_MIGRATED.map((n) => (
          <li key={n.what} className="grid gap-2 px-5 py-3.5 md:grid-cols-[1fr_1.4fr]">
            <div className="flex items-start gap-2.5">
              <Archive className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">{n.what}</div>
                <div className="text-xs text-muted-foreground">{n.why}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm text-foreground/90">
              <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {n.instead}
            </div>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-1.5 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" /> The archive (PDF and CSV) is included in the migration pack you download at go-live.
      </p>
    </Panel>
  )
}

function Mini({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="panel px-4 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}
