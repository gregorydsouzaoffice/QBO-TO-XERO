"use client"

import React, { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ExternalLink, Loader2, CheckCircle2, ShieldCheck, Check, ChevronDown, ArrowRight } from "lucide-react"

type AuthStep = "login" | "mfa" | "consent" | "connecting" | "done"

function XeroAuthFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Retrieve existing connection state params
  const source = searchParams.get("source") || "quickbooks"
  const destination = searchParams.get("destination") || "xero"
  const qboConnected = searchParams.get("qbo_connected") === "true"

  const [step, setStep] = useState<AuthStep>("login")
  const [email, setEmail] = useState("luke.sorbara@mmcconvert.com.au")
  const [password, setPassword] = useState("••••••••••••")
  const [mfaCode, setMfaCode] = useState("849201")
  const [trustDevice, setTrustDevice] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState("demo-xero")
  const [isLoading, setIsLoading] = useState(false)

  const orgs = [
    { id: "demo-xero", name: "MMC Demo Company Ltd (New)", meta: "Xero Standard · GBP" },
    { id: "test-xero", name: "Demo Company (Global)", meta: "Xero demo organisation" },
    { id: "uk-xero", name: "Acme Enterprises UK Ltd", meta: "Xero Premium · GBP" },
  ]

  const scopes = [
    "View your name, email address and user profile",
    "View and manage your organisation settings (chart of accounts, tax rates, tracking)",
    "View and manage your contacts, customers and suppliers",
    "View and manage your invoices, bills, payments, journals and bank transactions",
    "Configure and sync payroll employees, pay runs and leave requests",
    "View financial reports (trial balance, aged receivables, aged payables, balance sheet)",
  ]

  const footerLinks = [
    { label: "Status page", href: "#" },
    { label: "Security noticeboard", href: "#" },
    { label: "Terms of use", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Support", href: "#" },
  ]

  const finishAndRedirect = () => {
    const p = new URLSearchParams()
    p.set("source", source)
    p.set("destination", destination)
    if (qboConnected) p.set("qbo_connected", "true")
    p.set("xero_connected", "true")
    router.push(`/dashboard/new-migration/connect?${p.toString()}`)
  }

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setStep("mfa")
    }, 600)
  }

  // Handle MFA submission
  const handleMfaSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setStep("consent")
    }, 600)
  }

  // Handle Consent approval
  const handleAllowAccess = () => {
    setIsLoading(true)
    setStep("connecting")
    setTimeout(() => {
      setStep("done")
    }, 1400)
    setTimeout(() => {
      finishAndRedirect()
    }, 2200)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1e3145] antialiased">
      {/* Top Banner Header */}
      <header className="flex h-16 shrink-0 items-center justify-between bg-[#1f68dd] px-6 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/xero/xero-wordmark-white.png"
            alt="Xero"
            className="h-[22px] w-auto"
          />
        </div>

        {/* Step breadcrumb pill in header */}
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs text-white">
          <span className={step === "login" ? "font-bold text-white" : "text-white/70"}>1. Log In</span>
          <span className="text-white/40">›</span>
          <span className={step === "mfa" ? "font-bold text-white" : "text-white/70"}>2. Verify</span>
          <span className="text-white/40">›</span>
          <span className={step === "consent" || step === "connecting" || step === "done" ? "font-bold text-white" : "text-white/70"}>
            3. Authorise
          </span>
        </div>
      </header>

      {/* Main Content: Split View */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left Column: Form / Steps & Footer */}
        <div className="flex w-full flex-col justify-between px-6 py-8 sm:px-12 md:px-16 lg:w-1/2 xl:px-20 2xl:px-28">
          <div className="mx-auto w-full max-w-[500px] pt-2 sm:pt-4 md:pt-6 lg:mx-0">
            {/* STEP 1: LOG IN */}
            {step === "login" && (
              <div>
                <h1 className="mb-2 text-2xl font-bold tracking-tight text-[#1e3145] sm:text-3xl">
                  Log in to your account
                </h1>
                <p className="mb-8 text-sm text-[#59687a]">
                  Sign in with your Xero credentials to connect your organisation.
                </p>

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-[15px] font-normal text-[#1e3145]"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder=""
                      className="h-11 w-full rounded-[3px] border border-[#8c96a0] bg-white px-3 text-[15px] text-[#1e3145] transition-all outline-none focus:border-[#0078c8] focus:shadow-[0_0_0_2px_rgba(0,120,200,0.25)]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-[15px] font-normal text-[#1e3145]"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=""
                      className="h-11 w-full rounded-[3px] border border-[#8c96a0] bg-white px-3 text-[15px] text-[#1e3145] transition-all outline-none focus:border-[#0078c8] focus:shadow-[0_0_0_2px_rgba(0,120,200,0.25)]"
                    />
                  </div>

                  {/* Action row: Forgot password + Log in button */}
                  <div className="flex items-center justify-between pt-2">
                    <a
                      href="#"
                      className="text-[14px] text-[#0078c8] hover:underline sm:text-[15px]"
                    >
                      Forgot your password?
                    </a>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex h-10 min-w-[92px] items-center justify-center rounded-[3px] bg-[#0078c8] px-6 text-[15px] font-medium text-white shadow-none transition-colors hover:bg-[#00609f] focus:outline-none focus:ring-2 focus:ring-[#0078c8] focus:ring-offset-1 disabled:opacity-75"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        "Log in"
                      )}
                    </button>
                  </div>
                </form>

                {/* Help / Sign up links */}
                <div className="mt-10 space-y-3 text-[14px] sm:text-[15px]">
                  <div>
                    <a
                      href="#"
                      className="inline-flex items-center text-[#0078c8] hover:underline"
                    >
                      Can&apos;t log in?
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </div>
                  <div className="text-[#1e3145]">
                    Don&apos;t have an account?{" "}
                    <a
                      href="#"
                      className="inline-flex items-center text-[#0078c8] hover:underline"
                    >
                      Sign up
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: 2-STEP AUTHENTICATION / MFA */}
            {step === "mfa" && (
              <div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f4fd] text-[#0078c8]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h1 className="mb-2 text-2xl font-bold tracking-tight text-[#1e3145] sm:text-3xl">
                  Check your authentication app
                </h1>
                <p className="mb-6 text-sm text-[#59687a]">
                  Enter the 6-digit verification code from your authenticator app for{" "}
                  <strong className="text-[#1e3145]">{email}</strong>
                </p>

                <form onSubmit={handleMfaSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="code"
                      className="mb-2 block text-[15px] font-normal text-[#1e3145]"
                    >
                      Verification code
                    </label>
                    <input
                      id="code"
                      type="text"
                      maxLength={6}
                      required
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="123456"
                      className="h-12 w-full rounded-[3px] border border-[#8c96a0] bg-white px-3 text-center text-2xl font-mono tracking-[0.4em] text-[#1e3145] transition-all outline-none focus:border-[#0078c8] focus:shadow-[0_0_0_2px_rgba(0,120,200,0.25)]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="trust"
                      type="checkbox"
                      checked={trustDevice}
                      onChange={(e) => setTrustDevice(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#0078c8] focus:ring-[#0078c8]"
                    />
                    <label htmlFor="trust" className="text-sm text-[#59687a]">
                      Trust this device for 30 days
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep("login")}
                      className="text-sm text-[#0078c8] hover:underline"
                    >
                      Use a different account
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex h-10 min-w-[100px] items-center justify-center rounded-[3px] bg-[#0078c8] px-6 text-[15px] font-medium text-white shadow-none transition-colors hover:bg-[#00609f] focus:outline-none focus:ring-2 focus:ring-[#0078c8] focus:ring-offset-1 disabled:opacity-75"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        "Continue"
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-8 border-t border-gray-200 pt-4 text-xs text-[#59687a]">
                  Having trouble?{" "}
                  <a href="#" className="text-[#0078c8] hover:underline">
                    Try another authentication method
                  </a>
                </div>
              </div>
            )}

            {/* STEP 3: ORGANISATION SELECTION & ALLOW ACCESS */}
            {step === "consent" && (
              <div>
                {/* Integration header */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 items-center rounded-lg bg-[#0066b2] px-3 font-semibold text-white text-xs shadow-sm">
                    QBO to Xero Migration
                  </div>
                  <div className="flex items-center text-gray-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                    <span className="mx-1 h-0.5 w-4 bg-gray-300" />
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#13B5EA]/10 border border-[#13B5EA]/20">
                    <img src="/images/Xero-logo.png" alt="Xero" className="h-7 w-7 object-contain" />
                  </div>
                </div>

                <h1 className="mb-2 text-2xl font-bold tracking-tight text-[#1e3145] sm:text-[28px] leading-tight">
                  Allow access to your organisation
                </h1>
                <p className="mb-5 text-sm text-[#59687a]">
                  <strong>MMC Convert (QBO to Xero)</strong> wants to connect to your Xero account. Logged in as{" "}
                  <strong className="text-[#1e3145]">{email}</strong>
                </p>

                {/* Organisation Selector */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-[14px] font-bold text-[#1e3145]">
                    Organisation
                  </label>
                  <div className="relative">
                    <select
                      value={selectedOrg}
                      onChange={(e) => setSelectedOrg(e.target.value)}
                      className="h-11 w-full appearance-none rounded-[3px] border border-[#8c96a0] bg-white px-3 pr-10 text-[15px] text-[#1e3145] outline-none transition-all focus:border-[#0078c8] focus:shadow-[0_0_0_2px_rgba(0,120,200,0.25)]"
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} — {o.meta}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  </div>
                  <p className="mt-1.5 text-xs text-[#59687a]">
                    Choose the destination organisation to migrate QuickBooks data into.
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
                  By allowing access, you agree to the transfer of data between QuickBooks Online to Xero Migration Tool
                  and Xero in accordance with Xero&apos;s terms of use. You can disconnect at any time from Connected apps in Xero settings.
                </p>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setStep("login")}
                    className="text-[15px] text-[#0078c8] hover:underline"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleAllowAccess}
                    className="inline-flex h-11 items-center justify-center rounded-[3px] bg-[#0078c8] px-6 text-[15px] font-semibold text-white shadow-none transition-colors hover:bg-[#00609f] focus:outline-none focus:ring-2 focus:ring-[#0078c8] focus:ring-offset-1"
                  >
                    Allow access
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 & 5: CONNECTING / DONE */}
            {(step === "connecting" || step === "done") && (
              <div className="py-12 text-center">
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
                    : "Organisation successfully connected. Returning to your migration..."}
                </p>
              </div>
            )}
          </div>

          {/* Left Footer */}
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

        {/* Right Column: Illustration Panel */}
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

export default function XeroAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#0078c8]" />
        </div>
      }
    >
      <XeroAuthFlow />
    </Suspense>
  )
}
