"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

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
    bg: "bg-white",
    bar: "bg-[#1f68dd]",
    btn: "bg-[#0078c8] hover:bg-[#00609f]",
    link: "text-[#0078c8]",
    ring: "focus:border-[#0078c8] focus:ring-[#0078c8]",
    foot: "text-[#59687a]",
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

  // Dedicated full New UI for Xero
  if (platform === "xero") {
    const footerLinks = [
      { label: "Status page", href: "#" },
      { label: "Security noticeboard", href: "#" },
      { label: "Terms of use", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Support", href: "#" },
    ]

    return (
      <div className="flex min-h-screen flex-col bg-white text-[#1e3145] antialiased">
        {/* Top Banner Header */}
        <header className="flex h-16 shrink-0 items-center justify-between bg-[#1f68dd] px-6 sm:px-8 lg:px-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/xero/xero-wordmark-white.png"
            alt="Xero"
            className="h-[22px] w-auto"
          />
          <div className="text-xs text-white/80 font-medium">
            Authorisation
          </div>
        </header>

        {/* Main Content: Split View */}
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Left Column */}
          <div className="flex w-full flex-col justify-between px-6 py-8 sm:px-12 md:px-16 lg:w-1/2 xl:px-20 2xl:px-28">
            <div className="mx-auto w-full max-w-[500px] pt-4 lg:mx-0">
              {step === "consent" ? (
                <div>
                  {/* Integration badges */}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 items-center rounded-lg bg-[#0066b2] px-3 font-semibold text-white text-xs shadow-sm">
                      MMC Convert
                    </div>
                    <div className="flex items-center text-gray-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                      <span className="mx-1 h-0.5 w-3 bg-gray-300" />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#13B5EA]/10 border border-[#13B5EA]/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/images/Xero-logo.png" alt="Xero" className="h-6 w-6 object-contain" />
                    </div>
                  </div>

                  <h1 className="mb-2 text-2xl font-bold tracking-tight text-[#1e3145] sm:text-[28px] leading-tight">
                    Allow access to your organisation
                  </h1>
                  <p className="mb-5 text-sm text-[#59687a]">
                    <strong>MMC Convert</strong> wants to connect to Xero. Logged in as{" "}
                    <strong className="text-[#1e3145]">{account}</strong>
                  </p>

                  {/* Organisation Selector */}
                  <div className="mb-5">
                    <label className="mb-1.5 block text-[14px] font-bold text-[#1e3145]">
                      Organisation
                    </label>
                    <div className="relative">
                      <select
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                        className="h-11 w-full appearance-none rounded-[3px] border border-[#8c96a0] bg-white px-3 pr-10 text-[15px] text-[#1e3145] outline-none transition-all focus:border-[#0078c8] focus:shadow-[0_0_0_2px_rgba(0,120,200,0.25)]"
                      >
                        {entities.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} — {e.meta}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    </div>
                    <p className="mt-1.5 text-xs text-[#59687a]">
                      Choose the organisation set up for this migration.
                    </p>
                  </div>

                  {/* Scopes Box */}
                  <div className="mb-5 rounded-[6px] border border-[#d5dae0] bg-[#f9fbfd] p-4">
                    <p className="mb-2 text-[14px] font-bold text-[#1e3145]">
                      This app will be able to:
                    </p>
                    <ul className="space-y-2 text-xs sm:text-[13px] text-[#33475b]">
                      {scopes.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0078c8]" strokeWidth={3} />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Legal disclaimer */}
                  <p className="mb-6 text-xs leading-relaxed text-[#59687a]">
                    By allowing access, you agree to the transfer of data between MMC Convert and Xero in accordance with Xero&apos;s terms of use. You can disconnect at any time from Connected apps in Xero settings.
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => backToConnect(false)}
                      className="text-[15px] text-[#0078c8] hover:underline"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleAllow}
                      className="inline-flex h-11 items-center justify-center rounded-[3px] bg-[#0078c8] px-6 text-[15px] font-semibold text-white shadow-none transition-colors hover:bg-[#00609f] focus:outline-none focus:ring-2 focus:ring-[#0078c8] focus:ring-offset-1"
                    >
                      Allow access
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f4fd]">
                    {step === "connecting" ? (
                      <Loader2 className="h-8 w-8 animate-spin text-[#0078c8]" />
                    ) : (
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    )}
                  </div>

                  <h2 className="mb-2 text-2xl font-bold text-[#1e3145]">
                    {step === "connecting" ? "Connecting to Xero..." : "Access granted!"}
                  </h2>
                  <p className="text-sm text-[#59687a]">
                    {step === "connecting"
                      ? "Authorising MMC Convert with your Xero organisation..."
                      : `Successfully connected to ${entity?.name}. Returning to your migration...`}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="mx-auto mt-12 flex w-full max-w-[500px] flex-wrap gap-x-6 gap-y-2 pb-2 text-[13px] text-[#59687a] sm:text-[14px] lg:mx-0">
              {footerLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="transition-colors hover:text-[#1e3145] hover:underline"
                >
                  {item.label}
                </a>
              ))}
            </footer>
          </div>

          {/* Right Column: Illustration */}
          <div className="relative hidden w-1/2 overflow-hidden bg-[#0a1f6d] lg:flex lg:items-center lg:justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/xero-login-illustration.png"
              alt="Xero illustration"
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>
      </div>
    )
  }

  // QuickBooks Online / fallback platform UI
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

              {/* Org / company selector */}
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
