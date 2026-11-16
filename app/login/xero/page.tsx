"use client"

import { SimulatedOAuth } from "@/components/simulated-oauth"

export default function XeroConnect() {
  return (
    <SimulatedOAuth
      platform="xero"
      platformName="Xero"
      logoSrc="/images/Xero-logo.png"
      accent="bg-[#13B5EA] hover:bg-[#0f9ccb]"
      entityLabel="organisation"
      account="ankit@mmcconvert.com"
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
