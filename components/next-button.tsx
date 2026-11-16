"use client"

import { ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The one button that moves the demo forward. Same label and place on every
 * screen; the small caption says where it goes next. Xero theme: action blue.
 */
export default function NextButton({
  onClick,
  to,
  disabled,
  busy,
  className,
}: {
  onClick: () => void
  /** Where Next goes, e.g. "Scope" */
  to?: string
  disabled?: boolean
  busy?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {to && (
        <span className="hidden items-center gap-1 text-xs font-medium text-muted-foreground sm:inline-flex">
          Next: <span className="font-semibold text-foreground">{to}</span>
        </span>
      )}
      <Button onClick={onClick} disabled={disabled || busy} size="lg" className="group min-w-[132px] font-semibold" data-next-button>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
        Next
        {!busy && <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />}
      </Button>
    </div>
  )
}
