import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { DemoProvider } from "@/lib/demo-store"
import { brand } from "@/lib/brand"
import "./globals.css"

// Clean, neutral sans close to Xero's product UI
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans", display: "swap" })

export const metadata: Metadata = {
  title: `${brand.productName} | QuickBooks Online to Xero Migration`,
  description: `${brand.tagline}. Migration, financial tracker, reporting and AI financial QA.`,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-AU" className={`${inter.variable} ${GeistMono.variable}`}>
      <head>
        <style>{`
html {
  font-family: ${inter.style.fontFamily}, ui-sans-serif, system-ui, sans-serif;
  --font-mono: ${GeistMono.style.fontFamily};
}
        `}</style>
      </head>
      <body>
        <DemoProvider>{children}</DemoProvider>
        <Analytics />
      </body>
    </html>
  )
}
