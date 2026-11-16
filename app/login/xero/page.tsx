"use client"

import React, { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ExternalLink, Loader2 } from "lucide-react"
import { SimulatedOAuth } from "@/components/simulated-oauth"

function XeroLoginOrOAuth() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showConsent, setShowConsent] = useState(false)
  const [email, setEmail] = useState("ankit@mmcconvert.com")
  const [password, setPassword] = useState("••••••••••••")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      setShowConsent(true)
    }, 700)
  }

  const footerLinks = [
    { label: "Status page", href: "#" },
    { label: "Security noticeboard", href: "#" },
    { label: "Terms of use", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Support", href: "#" },
  ]

  if (showConsent) {
    return (
      <SimulatedOAuth
        platform="xero"
        platformName="Xero"
        logoSrc="/images/Xero-logo.png"
        accent="bg-[#13B5EA] hover:bg-[#0f9ccb]"
        entityLabel="organisation"
        account={email || "ankit@mmcconvert.com"}
        entities={[
          { id: "demo-xero", name: "MMC Demo Company Ltd (New)", meta: "Xero Standard · GBP" },
          { id: "test-xero", name: "Demo Company (Global)", meta: "Xero demo organisation" },
        ]}
        scopes={[
          "Create and update chart of accounts",
          "Create contacts and items",
          "Create invoices, bills, payments and journals",
          "Set up payroll employees and settings",
        ]}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1e3145] antialiased">
      {/* Top Banner Header */}
      <header className="flex h-16 shrink-0 items-center bg-[#1f68dd] px-6 sm:px-8 lg:px-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/xero/xero-wordmark-white.png"
          alt="Xero"
          className="h-[22px] w-auto"
        />
      </header>

      {/* Main Content: Split View */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left Column: Form & Footer */}
        <div className="flex w-full flex-col justify-between px-6 py-10 sm:px-12 md:px-16 lg:w-1/2 xl:px-24 2xl:px-32">
          <div className="mx-auto w-full max-w-[460px] pt-4 sm:pt-8 md:pt-10 lg:mx-0">
            <h1 className="mb-8 text-2xl font-bold tracking-tight text-[#1e3145] sm:text-3xl">
              Log in to your account
            </h1>

            <form onSubmit={handleSubmit} className="space-y-5">
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

          {/* Left Footer */}
          <footer className="mx-auto mt-16 flex w-full max-w-[460px] flex-wrap gap-x-6 gap-y-2 pb-2 text-[13px] text-[#59687a] sm:text-[14px] lg:mx-0">
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

export default function XeroConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#0078c8]" />
        </div>
      }
    >
      <XeroLoginOrOAuth />
    </Suspense>
  )
}
