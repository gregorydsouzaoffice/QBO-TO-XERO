"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Platform authorization step for the demo.
 * This mirrors the real OAuth 2.0 "Allow access" screen each platform shows
 * (Intuit for QuickBooks Online, Xero for Xero). The user approves access —
 * no password is entered into MMC Convert. In production this screen is served
 * by the platform itself after an OAuth redirect; here it is a visual stand-in
 * so the demo can flow end to end without live API keys.
 */
export type SimulatedOAuthProps = {
  platform: "qbo" | "xero"
  platformName: string
  logoSrc: string
  entityLabel: string // "company" | "organisation"
  entities: { id: string; name: string; meta: string }[]
  scopes: string[]
  account: string
}

const THEME = {
  xero: {
    bg: "bg-[#1e1e2d]",
    bar: "bg-[#13B5EA]",
    btn: "bg-[#13B5EA] hover:bg-[#0f9ccb]",
    link: "text-[#13B5EA]",
    ring: "focus:border-[#13B5EA] focus:ring-[#13B5EA]",
    foot: "text-white/60",
  },
  qbo: {
    bg: "bg-[#f4f5f8]",
    bar: "bg-[#2CA01C]",
    btn: "bg-[#2CA01C] hover:bg-[#248a17]",
    link: "text-[#2CA01C]",
    ring: "focus:border-[#2CA01C] focus:ring-[#2CA01C]",
    foot: "text-gray-500",
  },
}

export function SimulatedOAuth({
  platform,
  platformName,
  logoSrc,
  entityLabel,
  entities,
  scopes,
  account,
}: SimulatedOAuthProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selected, setSelected] = useState(entities[0]?.id)
  const [step, setStep] = useState<"consent" | "connecting" | "done">("consent")
  const t = THEME[platform]

  const backToConnect = (connected: boolean) => {
    const p = new URLSearchParams(searchParams.toString())
    if (!p.get("source")) p.set("source", "quickbooks")
    if (!p.get("destination")) p.set("destination", "xero")
    if (connected) p.set(`${platform}_connected`, "true")
    router.push(`/dashboard/new-migration/connect?${p.toString()}`)
  }

  const handleAllow = () => {
    setStep("connecting")
    setTimeout(() => setStep("done"), 1300)
    setTimeout(() => backToConnect(true), 2100)
  }

  const entity = entities.find((e) => e.id === selected)

  return (
    <div className={`min-h-screen ${t.bg} flex flex-col items-center justify-center p-4`}>
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl overflow-hidden">
        <div className={`h-1.5 w-full ${t.bar}`} />

        <div className="px-8 py-8">
          {/* Platform logo header */}
          <div className="flex justify-center mb-6">
            <img src={logoSrc} alt={platformName} className="h-10 w-auto object-contain" />
          </div>

          {step === "consent" ? (
            <>
              <div className="text-center mb-6">
                <h1 className="text-lg font-semibold text-gray-900">MMC Convert wants access to:</h1>
              </div>

              {/* Org / company selector – authentic "Allow access" layout */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  {entityLabel}
                </label>
                <div className="relative">
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className={`w-full h-12 appearance-none rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-900 ${t.ring} focus:outline-none focus:ring-1`}
                  >
                    {entities.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} — {e.meta}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-900 mb-2">This will allow MMC Convert to:</p>
                <ul className="space-y-2">
                  {scopes.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className={`mt-1 h-1.5 w-1.5 rounded-full ${t.bar} shrink-0`} />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md bg-gray-50 border border-gray-200 p-3 mb-6">
                <p className="text-xs text-gray-500">
                  Signed in as <span className="font-medium text-gray-700">{account}</span>. By allowing access you
                  agree to the transfer of data between {platformName} and MMC Convert. You can disconnect at any time in
                  your {platformName} settings.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  className={`w-full h-12 rounded-md text-white text-base font-medium ${t.btn}`}
                  onClick={handleAllow}
                >
                  Allow access
                </Button>
                <button
                  type="button"
                  onClick={() => backToConnect(false)}
                  className={`text-sm font-medium ${t.link} hover:underline`}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="py-10 flex flex-col items-center text-center gap-3">
              {step === "connecting" ? (
                <Loader2 className={`h-10 w-10 animate-spin ${t.link}`} />
              ) : (
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              )}
              <div className="font-semibold text-gray-900">
                {step === "connecting" ? `Connecting to ${platformName}…` : `Connected to ${entity?.name}`}
              </div>
              <div className="text-sm text-gray-500">
                {step === "connecting" ? "Authorising access" : "Returning to your migration"}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className={`mt-4 text-xs ${t.foot}`}>
        Demo environment — simulated {platformName} authorization for MMC Convert
      </p>
    </div>
  )
}
