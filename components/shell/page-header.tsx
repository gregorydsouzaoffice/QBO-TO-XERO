import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** White page header under the navy nav: title, description and actions (e.g. the period selector). */
export default function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("border-b border-border bg-card", className)}>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-5 md:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</div>}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  )
}

/** Standard page body container */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-[1400px] space-y-6 px-4 py-6 md:px-6", className)}>{children}</div>
}
