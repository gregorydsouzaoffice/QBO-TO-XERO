"use client"

import { Columns2 } from "lucide-react"
import { QuickBooksMark, XeroMark } from "@/components/brand"
import type { Source } from "@/lib/reports/financial"
import { cn } from "@/lib/utils"

const OPTIONS: { key: Source; label: string }[] = [
  { key: "xero", label: "Xero" },
  { key: "qbo", label: "QuickBooks" },
  { key: "compare", label: "Compare" },
]

/** Which ledger the reports read from */
export default function SourceSwitch({ value, onChange }: { value: Source; onChange: (s: Source) => void }) {
  return (
    <div role="radiogroup" aria-label="Report source" className="inline-flex max-w-full flex-wrap rounded-lg border border-border bg-card p-0.5 shadow-sm">
      {OPTIONS.map((o) => {
        const on = value === o.key
        return (
          <button
            key={o.key}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.key)}
            className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground", on && "bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground")}
          >
            {o.key === "xero" ? <XeroMark size={16} /> : o.key === "qbo" ? <QuickBooksMark size={16} /> : <Columns2 className="h-4 w-4" aria-hidden />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
