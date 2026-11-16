"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Toaster } from "sonner"
import TopNav from "@/components/shell/top-nav"
import { PoweredBy } from "@/components/brand"
import { brand } from "@/lib/brand"
import { useDemo } from "@/lib/demo-store"

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { state, hydrated } = useDemo()
  const router = useRouter()

  useEffect(() => {
    if (hydrated && !state.signedIn) router.replace("/login")
  }, [hydrated, state.signedIn, router])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground md:px-6">
          <span>
            {brand.productName} · Demo data, simulated connections · QuickBooks is a trademark of Intuit Inc. Xero is a trademark of Xero Limited.
          </span>
          <PoweredBy />
        </div>
      </footer>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  )
}
