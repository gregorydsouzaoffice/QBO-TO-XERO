"use client"

import { Branding, DemoControls } from "@/components/settings/branding-demo"
import { Connections } from "@/components/settings/connections"
import { QaSettings } from "@/components/settings/qa-settings"
import PageHeader, { PageBody } from "@/components/shell/page-header"
import { COMPANY } from "@/lib/data/company"
import { useDemo } from "@/lib/demo-store"

export default function SettingsPage() {
  const { hydrated } = useDemo()
  if (!hydrated) return null
  return (
    <>
      <PageHeader eyebrow={COMPANY.name} title="Settings" description="Connections, the AI QA schedule and recipients, and branding." />
      <PageBody>
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Sections">
          {[
            ["#connections", "Connections"],
            ["#qa", "AI QA"],
            ["#branding", "Branding"],
            ["#demo", "Demo controls"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border border-border bg-card px-3 py-1 font-medium text-muted-foreground hover:border-primary/40 hover:text-primary">
              {label}
            </a>
          ))}
        </nav>
        <Connections />
        <QaSettings />
        <div className="grid gap-6 lg:grid-cols-2">
          <Branding />
          <DemoControls />
        </div>
      </PageBody>
    </>
  )
}
