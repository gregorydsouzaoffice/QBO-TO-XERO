/*
 * Layout for the simulated Intuit (QuickBooks) sign-in used by this demo.
 * Real build: redirect to https://appcenter.intuit.com/connect/oauth2 with
 * scope com.intuit.quickbooks.accounting, then exchange the code for tokens.
 *
 * Logos: only the official QuickBooks lockup from components/brand.tsx.
 */
import type { ReactNode } from "react"
import { QuickBooksLogo } from "@/components/brand"

export const INTUIT = {
  blue: "#0077c5",
  blueHover: "#00589c",
  ink: "#393a3d",
  muted: "#6b6c72",
  line: "#d4d7dc",
  field: "#8d9096",
  page: "#f4f5f8",
}

export const INTUIT_FONT = '"Avenir Next", Avenir, "Segoe UI", Helvetica, Arial, sans-serif'

export function IntuitFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10 sm:py-14" style={{ background: INTUIT.page, fontFamily: INTUIT_FONT, color: INTUIT.ink }}>
      <div className={`w-full ${wide ? "max-w-[520px]" : "max-w-[420px]"}`}>
        <div className="rounded-[4px] border bg-white px-6 pb-8 pt-8 shadow-[0_2px_6px_rgba(0,0,0,0.06)] sm:px-10" style={{ borderColor: INTUIT.line }}>
          <div className="mb-6 flex justify-center">
            <QuickBooksLogo height={34} />
          </div>
          {children}
        </div>
        <footer className="mt-6 space-y-2 text-center text-[12px]" style={{ color: INTUIT.muted }}>
          <p className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 font-medium" style={{ borderColor: INTUIT.line }}>
            Simulated sign-in for this demo. Nothing you type is sent anywhere.
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            {["Legal", "Privacy", "Security"].map((l) => (
              <a key={l} href="#" className="hover:underline">
                {l}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  )
}

export const intuitInputClass =
  "block h-11 w-full rounded-[4px] border bg-white px-3 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_2px_rgba(0,119,197,0.35)]"

export function IntuitField({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px]" style={{ color: INTUIT.muted }}>{hint}</span>}
    </label>
  )
}

export function IntuitButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const { className, variant = "primary", style, ...rest } = props
  const primary = variant === "primary"
  return (
    <button
      {...rest}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[4px] px-5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${primary ? "text-white" : "border bg-white"} ${className ?? ""}`}
      style={primary ? { background: INTUIT.blue, ...style } : { borderColor: INTUIT.field, color: INTUIT.ink, ...style }}
      onMouseEnter={(e) => {
        if (primary && !e.currentTarget.disabled) e.currentTarget.style.background = INTUIT.blueHover
      }}
      onMouseLeave={(e) => {
        if (primary) e.currentTarget.style.background = INTUIT.blue
      }}
    />
  )
}

export function IntuitLink({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="font-medium hover:underline" style={{ color: INTUIT.blue }}>
      {children}
    </button>
  )
}

/** Keep ?return= (and any extra params) when moving between the sign-in screens */
export function connectHref(path: string, ret: string | null, extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ ...(ret ? { return: ret } : {}), ...extra }).toString()
  return q ? `${path}?${q}` : path
}
