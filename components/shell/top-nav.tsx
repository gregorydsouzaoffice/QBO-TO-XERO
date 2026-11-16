"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Bell, ChevronDown, FastForward, HelpCircle, LogOut, Menu, RotateCcw, Settings, Sparkles, X } from "lucide-react"
import { ProductWordmark } from "@/components/brand"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { COMPANY, QBO_COMPANY, USER, XERO_ORG } from "@/lib/data/company"
import { openIssues } from "@/lib/data/issues"
import { untilNextRun } from "@/lib/data/schedule"
import { completedDemoState, useDemo } from "@/lib/demo-store"
import { cn } from "@/lib/utils"

export const NAV = [
  { href: "/home", label: "Home" },
  { href: "/migration", label: "Migration" },
  { href: "/tracker", label: "Tracker" },
  { href: "/reports", label: "Reports" },
  { href: "/qa", label: "AI QA", icon: Sparkles },
]

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { reset, update } = useDemo()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [countdown, setCountdown] = useState<string | null>(null)
  const open = openIssues().filter((i) => i.severity === "high").length

  useEffect(() => {
    const tick = () => setCountdown(untilNextRun())
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => setMobileOpen(false), [pathname])

  return (
    <header className="sticky top-0 z-40 bg-nav text-nav-foreground shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 md:px-6">
        <button className="-ml-1 grid h-9 w-9 place-items-center rounded-md hover:bg-white/10 lg:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link href="/home" className="mr-2 flex items-center">
          <ProductWordmark onDark />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold hover:bg-white/10 md:flex">
            <span className="max-w-[220px] truncate">{COMPANY.short}</span>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel className="font-normal">
              <div className="font-semibold">{COMPANY.name}</div>
              <div className="text-xs text-muted-foreground">ABN {COMPANY.abn}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-1 px-2 py-1.5 text-xs text-muted-foreground">
              <div>QuickBooks realm {QBO_COMPANY.realmId}</div>
              <div>Xero org {XERO_ORG.shortCode}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" /> Connections & settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <nav className="ml-2 hidden h-14 items-stretch lg:flex">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/")
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "relative flex items-center gap-1.5 px-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white",
                  active && "text-white after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-xero",
                )}
              >
                {n.icon && <n.icon className="h-4 w-4 text-xero" />}
                {n.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link href="/qa" className="mr-2 hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 hover:bg-white/15 xl:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-xero opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-xero" />
            </span>
            {countdown ? `Next AI QA run in ${countdown}` : "AI QA every 2 hours"}
          </Link>
          <Link href="/tracker?tab=exceptions" className="relative grid h-9 w-9 place-items-center rounded-md hover:bg-white/10" aria-label="Exceptions">
            <Bell className="h-[18px] w-[18px]" />
            {open > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#e5484d] px-1 text-[10px] font-bold">{open}</span>}
          </Link>
          <Link href="/settings" className="hidden h-9 w-9 place-items-center rounded-md hover:bg-white/10 sm:grid" aria-label="Settings">
            <Settings className="h-[18px] w-[18px]" />
          </Link>
          <a href="#" className="hidden h-9 w-9 place-items-center rounded-md hover:bg-white/10 sm:grid" aria-label="Help">
            <HelpCircle className="h-[18px] w-[18px]" />
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-1 rounded-full outline-none ring-white/40 focus-visible:ring-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-xero text-xs font-bold text-nav">{USER.initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <div className="font-semibold">{USER.name}</div>
                <div className="text-xs text-muted-foreground">{USER.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  update((s) => completedDemoState(s))
                  router.push("/home")
                }}
              >
                <FastForward className="mr-2 h-4 w-4" /> Skip to parallel run
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  reset()
                  update((s) => ({ ...s, signedIn: true }))
                  router.push("/home")
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Restart demo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  update((s) => ({ ...s, signedIn: false }))
                  router.push("/login")
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-white/10 px-4 pb-3 lg:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("block rounded-md px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10", pathname.startsWith(n.href) && "bg-white/10 text-white")}>
              {n.label}
            </Link>
          ))}
          <Link href="/settings" className="block rounded-md px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10">
            Settings
          </Link>
        </nav>
      )}
    </header>
  )
}
