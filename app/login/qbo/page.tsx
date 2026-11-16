"use client"

import React, { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Loader2, ChevronDown, ChevronUp, CheckCircle2, Check, ArrowRight } from "lucide-react"

type QboStep = "signIn" | "company" | "consent" | "connecting" | "done"

function QuickBooksAuthFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const source = searchParams.get("source") || "quickbooks"
  const destination = searchParams.get("destination") || "xero"
  const xeroConnected = searchParams.get("xero_connected") === "true"

  const [step, setStep] = useState<QboStep>("signIn")
  const [email, setEmail] = useState("luke.sorbara@mmcconvert.com.au")
  const [password, setPassword] = useState("••••••••••••")
  const [rememberMe, setRememberMe] = useState(true)
  const [selectedCompanyId, setSelectedCompanyId] = useState("sandbox-1")
  const [showConnectedApps, setShowConnectedApps] = useState(false)
  const [showDataScopes, setShowDataScopes] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const companies = [
    {
      id: "demo-qbo",
      name: "MMC Demo Company Ltd",
      realmId: "9130352781940214",
      meta: "QuickBooks Online Advanced · GBP",
      region: "United Kingdom",
    },
    {
      id: "sandbox-1",
      name: "Sandbox Company_US_1",
      realmId: "4620816365219481",
      meta: "QuickBooks Online Plus · USD",
      region: "Global Sandbox",
    },
    {
      id: "aus-qbo",
      name: "Acme Enterprises Australia Pty Ltd",
      realmId: "9341452819028472",
      meta: "QuickBooks Online Essentials · AUD",
      region: "Australia",
    },
  ]

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0]

  const returnToConnect = (connected: boolean) => {
    const p = new URLSearchParams()
    p.set("source", source)
    p.set("destination", destination)
    if (connected) p.set("qbo_connected", "true")
    if (xeroConnected) p.set("xero_connected", "true")
    router.push(`/dashboard/new-migration/connect?${p.toString()}`)
  }

  // Handle Sign In submission -> move to company selection
  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setStep("company")
    }, 600)
  }

  // Handle Company Selection -> move to consent
  const handleCompanyNext = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setStep("consent")
    }, 500)
  }

  // Handle Final Connect
  const handleConnect = () => {
    setIsLoading(true)
    setStep("connecting")
    setTimeout(() => {
      setStep("done")
    }, 1200)
    setTimeout(() => {
      returnToConnect(true)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-[#eceef1] text-[#393a3d] font-sans antialiased flex flex-col justify-between">
      {/* ================================================================ */}
      {/* SCREEN 1: INTUIT SIGN IN (matches user reference image)           */}
      {/* ================================================================ */}
      {step === "signIn" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
          {/* Top Intuit Logo with product dots */}
          <div className="mb-6 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/qbo/intuit-logo.png"
              alt="Intuit"
              className="h-10 w-auto object-contain"
            />

            {/* Product icons row: turbotax, quickbooks, mint */}
            <div className="mt-2.5 flex items-center gap-4 text-xs font-medium text-[#6b6c72]">
              <span className="flex items-center gap-1">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#d52b1e] text-[9px] font-bold text-white">
                  ✓
                </span>
                turbotax
              </span>
              <span className="flex items-center gap-1 font-semibold text-[#2ca01c]">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#2ca01c] text-[9px] font-bold text-white">
                  qb
                </span>
                quickbooks
              </span>
              <span className="flex items-center gap-1 text-[#00a6a6]">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#00a6a6] text-[9px] text-white">
                  🌱
                </span>
                mint
              </span>
            </div>
          </div>

          {/* Centered Sign In Card */}
          <div className="w-full max-w-[420px] rounded-lg border border-[#d4d7dc] bg-white p-6 sm:p-8 shadow-sm">
            <h1 className="text-center text-2xl font-bold text-[#393a3d]">Sign In</h1>
            <p className="mt-1 text-center text-xs text-[#6b6c72]">
              One account for everything Intuit, including QuickBooks.{" "}
              <a href="#" className="text-[#0077c5] hover:underline">
                Learn more
              </a>
            </p>

            {/* Sign in with Google */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setStep("company")}
                className="flex h-11 w-full items-center justify-center gap-3 rounded border border-[#d4d7dc] bg-white text-sm font-medium text-[#393a3d] hover:bg-gray-50 transition-colors shadow-xs"
              >
                {/* Google G logo */}
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Sign in with Google
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="w-full border-t border-[#d4d7dc]" />
              <span className="absolute bg-white px-3 text-xs text-[#6b6c72]">or</span>
            </div>

            {/* Credentials form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#393a3d]"
                >
                  Email or user ID
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded border border-[#8d9096] bg-white px-3 text-sm text-[#393a3d] focus:border-[#0077c5] focus:shadow-[0_0_0_2px_rgba(0,119,197,0.3)] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#393a3d]"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded border border-[#8d9096] bg-white px-3 text-sm text-[#393a3d] focus:border-[#0077c5] focus:shadow-[0_0_0_2px_rgba(0,119,197,0.3)] focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#0077c5] focus:ring-[#0077c5]"
                />
                <label htmlFor="rememberMe" className="text-xs text-[#6b6c72]">
                  Remember me
                </label>
              </div>

              {/* Blue Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded bg-[#0077c5] text-sm font-semibold text-white shadow-xs hover:bg-[#00589c] focus:outline-none focus:ring-2 focus:ring-[#0077c5] focus:ring-offset-1 transition-colors disabled:opacity-75"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Terms disclaimer */}
            <p className="mt-4 text-center text-[11px] leading-relaxed text-[#6b6c72]">
              By selecting Sign In or Sign in with Google, you agree to our{" "}
              <a href="#" className="text-[#0077c5] hover:underline">
                Terms
              </a>{" "}
              and have read and acknowledge our{" "}
              <a href="#" className="text-[#0077c5] hover:underline">
                Global Privacy Statement
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 2: PLEASE SELECT YOUR COMPANY (matches user image 3)      */}
      {/* ================================================================ */}
      {step === "company" && (
        <div className="flex-1 flex flex-col items-center">
          {/* Top Charcoal Header Bar */}
          <header className="w-full bg-[#333333] px-6 py-3 flex items-center justify-between text-white shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/qbo/quickbooks-logo-white.webp"
              alt="Intuit QuickBooks"
              className="h-7 w-auto object-contain"
            />
            <div className="text-xs text-gray-300">
              Welcome Luke,{" "}
              <button
                type="button"
                onClick={() => setStep("signIn")}
                className="text-white underline hover:text-gray-200"
              >
                (Not You?)
              </button>
            </div>
          </header>

          {/* Main Card */}
          <div className="w-full max-w-[620px] my-auto px-4 py-8">
            <div className="rounded-lg border border-[#d4d7dc] bg-white p-6 sm:p-10 shadow-sm">
              <h1 className="text-2xl font-semibold text-[#393a3d]">
                Please select your company
              </h1>

              <div className="mt-6">
                <label
                  htmlFor="company-select"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#6b6c72]"
                >
                  Search for a company
                </label>
                <div className="relative">
                  <select
                    id="company-select"
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="h-11 w-full appearance-none rounded border border-[#8d9096] bg-white px-3 pr-10 text-sm font-medium text-[#393a3d] focus:border-[#2ca01c] focus:shadow-[0_0_0_2px_rgba(44,160,28,0.25)] focus:outline-none transition-all"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.meta})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
              </div>

              {/* Accordion: Apps already connected to [company] */}
              <div className="mt-6 border-t border-[#e5e7eb] pt-4">
                <button
                  type="button"
                  onClick={() => setShowConnectedApps(!showConnectedApps)}
                  className="flex w-full items-center justify-between text-xs font-medium text-[#6b6c72] hover:text-[#393a3d]"
                >
                  <span>Apps already connected to {selectedCompany.name}</span>
                  {showConnectedApps ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showConnectedApps && (
                  <div className="mt-3 rounded border border-gray-200 bg-[#f9fafb] p-3 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">MMC Convert</span>
                      <span className="rounded bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
                        Active App
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Accounting & Migration Suite · Full Ledger Sync Scope
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons: No, thanks + Next */}
              <div className="mt-10 flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => returnToConnect(false)}
                  className="rounded-full border border-[#393a3d] px-6 py-2 text-sm font-semibold text-[#393a3d] hover:bg-gray-100 transition-colors"
                >
                  No, thanks
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleCompanyNext}
                  className="inline-flex min-w-[100px] items-center justify-center rounded-full bg-[#2ca01c] px-7 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#248a17] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2ca01c] focus:ring-offset-1"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    "Next"
                  )}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6b6c72] gap-3">
              <span>©2026 Intuit Inc. All rights reserved.</span>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/qbo/intuit-logo.png"
                  alt="Intuit"
                  className="h-3.5 w-auto object-contain opacity-75"
                />
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#d52b1e]" /> turbotax
                </span>
                <span className="flex items-center gap-1 text-[#2ca01c] font-medium">
                  <span className="h-2 w-2 rounded-full bg-[#2ca01c]" /> quickbooks
                </span>
                <span className="flex items-center gap-1 text-[#00a6a6]">
                  <span className="h-2 w-2 rounded-full bg-[#00a6a6]" /> mint
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 3: LET'S CONNECT / CONSENT (matches user images 1 & 4)    */}
      {/* ================================================================ */}
      {step === "consent" && (
        <div className="flex-1 flex flex-col items-center">
          {/* Top Charcoal Header Bar */}
          <header className="w-full bg-[#333333] px-6 py-3 flex items-center justify-between text-white shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/qbo/quickbooks-logo-white.webp"
              alt="Intuit QuickBooks"
              className="h-7 w-auto object-contain"
            />
            <div className="text-xs text-gray-300">
              Welcome Luke,{" "}
              <button
                type="button"
                onClick={() => setStep("signIn")}
                className="text-white underline hover:text-gray-200"
              >
                (Not You?)
              </button>
            </div>
          </header>

          {/* Main Consent Card */}
          <div className="w-full max-w-[620px] my-auto px-4 py-8">
            <div className="rounded-lg border border-[#d4d7dc] bg-white p-6 sm:p-10 shadow-sm">
              {/* Green circular QB icon header banner */}
              <div className="flex items-center gap-4 mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/qbo/quickbooks-logo-black.webp"
                  alt="Intuit QuickBooks"
                  className="h-10 w-auto object-contain"
                />
                <div className="text-base sm:text-lg font-semibold text-[#393a3d]">
                  Connecting <span className="font-bold">MMC Convert</span> to{" "}
                  <span className="font-bold">{selectedCompany.name}</span>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-[#393a3d]">
                Let&apos;s connect MMC Convert
              </h1>
              <p className="mt-1 text-sm text-[#6b6c72]">
                Select <strong className="text-[#393a3d]">Connect</strong> below to get started using MMC Convert.
              </p>

              {/* Accordion / Scopes detail */}
              <div className="mt-6 rounded-md border border-[#d4d7dc] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDataScopes(!showDataScopes)}
                  className="flex w-full items-center justify-between bg-[#f9fafb] p-4 text-left text-sm font-semibold text-[#393a3d] hover:bg-gray-100 transition-colors"
                >
                  <span>Allow MMC Convert to view and update your QuickBooks Online data.</span>
                  {showDataScopes ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                  )}
                </button>

                {showDataScopes && (
                  <div className="border-t border-[#d4d7dc] bg-white p-4 space-y-2 text-xs text-[#6b6c72] leading-relaxed">
                    <p className="font-medium text-[#393a3d]">When you select Connect we will grant MMC Convert access to your QuickBooks Online data. This includes:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>data about your company, chart of accounts, and tax codes.</li>
                      <li>data about your customers, suppliers, and/or employees.</li>
                      <li>invoices, bills, payments, and accounting transactions.</li>
                      <li>any updates you may make to your QuickBooks Online data after you connect.</li>
                    </ul>
                    <div className="pt-2">
                      <code className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-mono text-gray-700">
                        com.intuit.quickbooks.accounting
                      </code>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: No, thanks + Connect */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("company")}
                  className="rounded-full border border-[#393a3d] px-6 py-2 text-sm font-semibold text-[#393a3d] hover:bg-gray-100 transition-colors"
                >
                  No, thanks
                </button>

                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="inline-flex min-w-[120px] items-center justify-center rounded-full bg-[#2ca01c] px-8 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-[#248a17] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2ca01c] focus:ring-offset-1"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    "Connect"
                  )}
                </button>
              </div>

              {/* Disclaimer */}
              <div className="mt-8 border-t border-gray-100 pt-4 text-[11px] leading-relaxed text-[#6b6c72]">
                <p>
                  Intuit and MMC Convert may share the information in your Intuit and MMC Convert accounts.
                  Your relationship to MMC Convert and its use of your information are subject to MMC Convert&apos;s{" "}
                  <a href="#" className="text-[#0077c5] hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-[#0077c5] hover:underline">
                    Privacy Policy
                  </a>
                  . To learn more about how Intuit uses your data, see our{" "}
                  <a href="#" className="text-[#0077c5] hover:underline">
                    Privacy Statement
                  </a>
                  .
                </p>
                <p className="mt-2">
                  Disconnect MMC Convert anytime from your MyApps page.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6b6c72] gap-3">
              <span>©2026 Intuit Inc. All rights reserved.</span>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/qbo/intuit-logo.png"
                  alt="Intuit"
                  className="h-3.5 w-auto object-contain opacity-75"
                />
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#d52b1e]" /> turbotax
                </span>
                <span className="flex items-center gap-1 text-[#2ca01c] font-medium">
                  <span className="h-2 w-2 rounded-full bg-[#2ca01c]" /> quickbooks
                </span>
                <span className="flex items-center gap-1 text-[#00a6a6]">
                  <span className="h-2 w-2 rounded-full bg-[#00a6a6]" /> mint
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SCREEN 4: CONNECTING / DONE STATE                                */}
      {/* ================================================================ */}
      {(step === "connecting" || step === "done") && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-[440px] rounded-lg border border-[#d4d7dc] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f7e8]">
              {step === "connecting" ? (
                <Loader2 className="h-8 w-8 animate-spin text-[#2ca01c]" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-[#2ca01c]" />
              )}
            </div>

            <h2 className="text-xl font-bold text-[#393a3d]">
              {step === "connecting" ? "Connecting to QuickBooks Online..." : "Company Connected!"}
            </h2>
            <p className="mt-2 text-sm text-[#6b6c72]">
              {step === "connecting"
                ? `Authorizing ${selectedCompany.name} with MMC Convert...`
                : `Successfully authorized ${selectedCompany.name}. Returning to migration...`}
            </p>
          </div>
        </div>
      )}

      {/* Legal Bottom Bar */}
      <footer className="w-full py-4 px-6 text-center text-xs text-[#6b6c72] border-t border-[#d4d7dc]/60 bg-white">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
          <a href="#" className="hover:underline">Legal</a>
          <a href="#" className="hover:underline">Privacy</a>
          <a href="#" className="hover:underline">Security</a>
          <a href="#" className="hover:underline">Intuit App Center</a>
        </div>
      </footer>
    </div>
  )
}

export default function QboConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#eceef1]">
          <Loader2 className="h-8 w-8 animate-spin text-[#2ca01c]" />
        </div>
      }
    >
      <QuickBooksAuthFlow />
    </Suspense>
  )
}
