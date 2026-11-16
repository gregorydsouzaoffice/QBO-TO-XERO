"use client"

import type { ReactNode } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

/** Native select: accessible, works well on phones, matches the input style */
export function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground", className)}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function SearchInput({ value, onChange, placeholder, label = "Search", className }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string; className?: string }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground", className)}>
      {label}
      <span className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </span>
    </label>
  )
}

export function DateInput({ label, value, onChange, min, max, className }: { label: string; value: string; onChange: (v: string) => void; min?: string; max?: string; className?: string }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground", className)}>
      {label}
      <input type="date" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
    </label>
  )
}

/** Row of filters plus a result count and a clear button */
export function FilterBar({ children, count, total, onClear, active }: { children: ReactNode; count: number; total: number; onClear: () => void; active: boolean }) {
  return (
    <div className="space-y-2 border-b border-border px-5 py-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{children}</div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Showing {count.toLocaleString("en-AU")} of {total.toLocaleString("en-AU")}
        </span>
        {active && (
          <button onClick={onClear} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
