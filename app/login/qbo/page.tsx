"use client"

import { SimulatedOAuth } from "@/components/simulated-oauth"

export default function QboConnect() {
  return (
    <SimulatedOAuth
      platform="qbo"
      platformName="QuickBooks Online"
      logoSrc="/images/Qbo-logo.png"
      accent="bg-[#2CA01C] hover:bg-[#248a17]"
      entityLabel="company"
      account="ankit@mmcconvert.com"
      entities={[
        { id: "demo-qbo", name: "MMC Demo Company Ltd", meta: "QuickBooks Online Advanced · GBP" },
        { id: "sandbox-qbo", name: "Sandbox Company UK", meta: "QuickBooks Online Plus · GBP" },
      ]}
      scopes={[
        "Read chart of accounts and tax codes",
        "Read customers, suppliers and items",
        "Read invoices, bills, payments and journals",
        "Read payroll employees and settings",
      ]}
    />
  )
}
