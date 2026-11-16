"use client"

import { useEffect, useState } from "react"
import { completedDemoState, useDemo } from "@/lib/demo-store"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, BarChart3, Eye, EyeOff, Loader2, Lock, ShieldCheck, Sparkles, Workflow } from "lucide-react"
import { GojeeLogo, PoweredBy, ProductWordmark, QuickBooksLogo, XeroMark, XeroWordmark } from "@/components/brand"
import { Checkbox } from "@/components/ui/checkbox"
import { brand } from "@/lib/brand"
import { USER } from "@/lib/data/company"

const VALUE = [
  { icon: Workflow, title: "Migrate", text: "QuickBooks Online history into Xero, with jobs, quotes, POs and stock into Gojee." },
  { icon: BarChart3, title: "Track & report", text: "One tracker for bank, figures and reconciliations. YTD, previous year and since inception." },
  { icon: Sparkles, title: "AI Financial QA", text: "Every figure checked against its source every 2 hours, with an evidence-backed report." },
]

export default function LoginPage() {
  const router = useRouter()
  const { update } = useDemo()

  // Recording shortcut: /login?demo=parallel&to=/tracker jumps straight into the parallel run
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get("demo") === "parallel") {
      update((s) => completedDemoState(s))
      const to = p.get("to")
      router.replace(to && to.startsWith("/") ? to : "/home")
    }
  }, [router, update])
  const [email, setEmail] = useState(USER.email)
  const [password, setPassword] = useState("demo-password")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<"xero" | "email" | null>(null)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel */}
      <aside className="relative hidden w-[46%] max-w-[680px] flex-col justify-between overflow-hidden bg-nav p-10 text-white lg:flex xl:p-14">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-xero/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />

        <div className="relative">
          <ProductWordmark onDark className="text-2xl" />
          <h1 className="mt-14 max-w-md text-[34px] font-bold leading-tight tracking-tight">Move from QuickBooks to Xero, and know every number still adds up.</h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/75">{brand.tagline}. Migration, a live financial tracker, reporting and AI-powered QA in one place.</p>

          <div className="mt-10 flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
            <QuickBooksLogo onDark height={26} />
            <ArrowRight className="h-5 w-5 shrink-0 text-xero" />
            <XeroWordmark onDark height={22} />
            <span className="text-white/50">+</span>
            <GojeeLogo onDark height={24} />
          </div>

          <ul className="mt-10 space-y-6">
            {VALUE.map((v) => (
              <li key={v.title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10">
                  <v.icon className="h-5 w-5 text-xero" />
                </span>
                <div>
                  <div className="font-semibold">{v.title}</div>
                  <div className="mt-0.5 text-sm leading-relaxed text-white/70">{v.text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-xs text-white/60">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Read-only access to QuickBooks. Bank-grade encryption.
          </span>
          <PoweredBy onDark />
        </div>
      </aside>

      {/* Sign-in form */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <ProductWordmark />
          <PoweredBy />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-[420px]">
            <h2 className="text-[28px] font-bold tracking-tight text-foreground">Log in</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Welcome back. Use your Xero account or your {brand.productName} email.</p>

            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setBusy("xero")
                setTimeout(() => router.push("/login/xero?mode=signin&return=/home"), 500)
              }}
              className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[hsl(203_100%_31%)] disabled:opacity-80"
            >
              {busy === "xero" ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="rounded-full bg-white p-[2px]"><XeroMark size={24} /></span>}
              Sign in with Xero
            </button>

            <div className="relative my-7 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
              <span className="relative bg-background px-3">or with email</span>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                setBusy("email")
                setTimeout(() => router.push("/login/verify"), 600)
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">Email</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-[15px] outline-none transition-shadow focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]" />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-foreground">
                  Password
                  <a href="#" className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </a>
                </span>
                <span className="relative block">
                  <input type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-lg border border-input bg-card px-3.5 pr-11 text-[15px] outline-none transition-shadow focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]" />
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox defaultChecked /> Keep me logged in on this device
              </label>
              <button type="submit" disabled={busy !== null} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-input bg-card text-[15px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-80">
                {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Log in with email
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              New to {brand.productName}?{" "}
              <Link href="/login/xero?mode=signin&return=/migration" className="font-semibold text-primary hover:underline">
                Start with your Xero account
              </Link>
            </p>
            <p className="mt-10 text-center text-xs text-muted-foreground">Demo environment: sign-in screens are simulated and nothing is sent anywhere.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
