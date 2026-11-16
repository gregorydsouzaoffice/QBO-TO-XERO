/* eslint-disable @next/next/no-img-element */
import { brand } from "@/lib/brand"
import { cn } from "@/lib/utils"

/*
 * Logos come only from the official files supplied by the client
 * (public/images/qbo, xero). Nothing here draws a logo.
 */

export type SystemKey = "qbo" | "xero" | "bank"

/** Full QuickBooks lockup ("intuit quickbooks"). `onDark` uses the white version. */
export function QuickBooksLogo({ className, onDark = false, height = 28 }: { className?: string; onDark?: boolean; height?: number }) {
  return <img src={onDark ? brand.logos.quickbooksWhite : brand.logos.quickbooks} alt="Intuit QuickBooks" style={{ height }} className={cn("w-auto", className)} />
}

/** QuickBooks symbol on its own (min 16px per Intuit's guidelines) */
export function QuickBooksMark({ size = 24, className }: { size?: number; className?: string }) {
  return <img src={brand.logos.quickbooksMark} alt="QuickBooks" width={Math.max(16, size)} height={Math.max(16, size)} className={cn("shrink-0", className)} />
}

/** Round Xero logo (the supplied file has padding, so it is scaled inside a clip) */
export function XeroMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-block shrink-0 overflow-hidden rounded-full", className)} style={{ width: size, height: size }}>
      <img src={brand.logos.xeroRound} alt="Xero" style={{ width: size, height: size }} className="scale-[1.9]" />
    </span>
  )
}

export function XeroWordmark({ onDark = false, height = 20, className }: { onDark?: boolean; height?: number; className?: string }) {
  return <img src={onDark ? brand.logos.xeroWordmarkWhite : brand.logos.xeroWordmark} alt="Xero" style={{ height }} className={cn("w-auto", className)} />
}

/** Product name as plain text until an official product logo is supplied */
export function ProductWordmark({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  if (brand.productLogoSrc) return <img src={brand.productLogoSrc} alt={brand.productName} className={cn("h-7 w-auto", className)} />
  return (
    <span className={cn("text-[17px] font-bold tracking-tight", onDark ? "text-white" : "text-foreground", className)}>{brand.productName}</span>
  )
}

export function PoweredBy({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <a href={brand.poweredBy.url} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-2 text-xs", onDark ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground", className)}>
      Powered by
      <img src={brand.poweredBy.logoSrc} alt={brand.poweredBy.name} className="h-6 w-6 rounded bg-white p-0.5" />
    </a>
  )
}

export const SYSTEM_NAME: Record<SystemKey, string> = { qbo: "QuickBooks", xero: "Xero", bank: "Bank" }

export function SystemIcon({ system, size = 16 }: { system: SystemKey; size?: number }) {
  if (system === "qbo") return <QuickBooksMark size={size} />
  if (system === "xero") return <XeroMark size={size} />
  return (
    <span className="inline-grid shrink-0 place-items-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground" style={{ width: size, height: size }}>
      $
    </span>
  )
}

/** Small "QuickBooks" / "Xero" chip used in tables and cards */
export function SystemChip({ system, label, className }: { system: SystemKey; label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground", className)}>
      <SystemIcon system={system} size={14} />
      {label ?? SYSTEM_NAME[system]}
    </span>
  )
}
