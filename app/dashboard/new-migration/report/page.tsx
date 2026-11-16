"use client"

import { useState, useEffect } from "react"
import {
  getMigrationStartDate,
  getMigrationEndDate,
  formatDateDot,
  formatPeriod,
  formatPeriodLong,
  formatLong,
  formatShort,
  DEFAULT_START_DATE,
  DEFAULT_END_DATE,
} from "@/lib/migration-date"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  FileText,
  ExternalLink,
  Sparkles,
  Bot,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Landmark,
  DollarSign,
  Layers,
  Send,
  RefreshCw,
  Zap,
} from "lucide-react"
import { ModuleComparisonModal } from "./module-comparison-modal"
import { PayrollCompletionSummary } from "@/components/payroll-completion-summary"

const tabData = {
  accounts: {
    title: "Chart of Accounts",
    headers: ["Account Code", "Account Name", "Type", "Status"],
    rows: [
      ["1000", "Sales Revenue", "Revenue", "Imported"],
      ["2000", "Cost of Goods Sold", "Expense", "Imported"],
      ["3000", "Accounts Receivable", "Asset", "Imported"],
      ["4000", "Accounts Payable", "Liability", "Imported"],
      ["6200", "Travel Expenses", "Expense", "Imported"],
    ]
  },
  customers: {
    title: "Customers",
    headers: ["Name", "Email", "Phone", "Status"],
    rows: [
      ["Amazon", "amazon@gmail.com", "078 6565 1529", "Imported"],
      ["Azure Training", "info@azure.com", "+44 20 1234 5678", "Imported"],
      ["DIRECTOR", "director@abc.com", "+44 20 9876 5432", "Imported"],
      ["EE LIMITED", "accounts@ee.com", "+44 20 1111 2222", "Imported"],
    ]
  },
  vendors: {
    title: "Vendors",
    headers: ["Name", "Email", "Phone", "Status"],
    rows: [
      ["Office Supplies Ltd", "accounts@officesupplies.com", "+44 20 3333 4444", "Imported"],
      ["Tech Solutions Inc", "billing@techsolutions.com", "+44 20 5555 6666", "Imported"],
      ["Marketing Agency", "invoices@marketing.com", "+44 20 7777 8888", "Imported"],
      ["Legal Services", "admin@legalservices.com", "+44 20 9999 0000", "Imported"],
    ]
  },
  items: {
    title: "Items",
    headers: ["Item Code", "Item Name", "Type", "Status"],
    rows: [
      ["CONS-001", "Consulting Services", "Service", "Imported"],
      ["SOFT-001", "Software License", "Service", "Imported"],
      ["TRAIN-001", "Training Workshop", "Service", "Imported"],
      ["MAINT-001", "Maintenance Contract", "Service", "Imported"],
    ]
  },
  invoices: {
    title: "Invoices",
    headers: ["Invoice #", "Customer", "Date", "Amount", "Status"],
    rows: [
      ["INV-2024-001", "Amazon", "15/03/2024", "£2,500.00", "Imported"],
      ["INV-2024-002", "Azure Training", "18/03/2024", "£1,850.00", "Imported"],
      ["INV-2024-003", "DIRECTOR", "22/03/2024", "£3,200.00", "Imported"],
      ["INV-2024-004", "EE LIMITED", "25/03/2024", "£1,750.00", "Imported"],
    ]
  },
  bills: {
    title: "Bills",
    headers: ["Bill #", "Vendor", "Date", "Amount", "Status"],
    rows: [
      ["BILL-2024-001", "Office Supplies Ltd", "10/03/2024", "£450.00", "Imported"],
      ["BILL-2024-002", "Tech Solutions Inc", "12/03/2024", "£1,200.00", "Imported"],
      ["BILL-2024-003", "Marketing Agency", "14/03/2024", "£850.00", "Imported"],
      ["BILL-2024-004", "Legal Services", "16/03/2024", "£2,100.00", "Imported"],
    ]
  },
  invoicePayments: {
    title: "Invoice Payments",
    headers: ["Payment #", "Invoice", "Date", "Amount", "Status"],
    rows: [
      ["PAY-2024-001", "INV-2024-001", "20/03/2024", "£2,500.00", "Imported"],
      ["PAY-2024-002", "INV-2024-002", "23/03/2024", "£1,850.00", "Imported"],
      ["PAY-2024-003", "INV-2024-003", "27/03/2024", "£3,200.00", "Imported"],
      ["PAY-2024-004", "INV-2024-004", "30/03/2024", "£1,750.00", "Imported"],
    ]
  },
  billPayments: {
    title: "Bill Payments",
    headers: ["Payment #", "Bill", "Date", "Amount", "Status"],
    rows: [
      ["BPAY-2024-001", "BILL-2024-001", "15/03/2024", "£450.00", "Imported"],
      ["BPAY-2024-002", "BILL-2024-002", "17/03/2024", "£1,200.00", "Imported"],
      ["BPAY-2024-003", "BILL-2024-003", "19/03/2024", "£850.00", "Imported"],
      ["BPAY-2024-004", "BILL-2024-004", "21/03/2024", "£2,100.00", "Imported"],
    ]
  },
  creditNotes: {
    title: "Credit Notes",
    headers: ["Credit Note #", "Customer", "Date", "Amount", "Status"],
    rows: [
      ["CN-2024-001", "Amazon", "28/03/2024", "£150.00", "Imported"],
      ["CN-2024-002", "Azure Training", "30/03/2024", "£75.00", "Imported"],
      ["CN-2024-003", "EE LIMITED", "02/04/2024", "£200.00", "Imported"],
    ]
  },
  billCredits: {
    title: "Bill Credits",
    headers: ["Credit #", "Bill", "Date", "Amount", "Status"],
    rows: [
      ["BC-2024-001", "BILL-2024-001", "25/03/2024", "£50.00", "Imported"],
      ["BC-2024-002", "BILL-2024-003", "28/03/2024", "£100.00", "Imported"],
    ]
  },
  journals: {
    title: "Journals",
    headers: ["Journal #", "Date", "Description", "Status"],
    rows: [
      ["JE-2024-001", "31/03/2024", "Month-end accruals", "Imported"],
      ["JE-2024-002", "31/03/2024", "Depreciation adjustment", "Imported"],
      ["JE-2024-003", "31/03/2024", "Bank reconciliation", "Imported"],
      ["JE-2024-004", "31/03/2024", "Tax provision", "Imported"],
    ]
  }
}

export default function MigrationReport() {
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE)
  const [endDate, setEndDate] = useState(DEFAULT_END_DATE)
  const [aiAuditEmail, setAiAuditEmail] = useState("luke.sorbara@mmcconvert.com.au")
  const [aiAuditRequested, setAiAuditRequested] = useState(false)
  const [isSubmittingAi, setIsSubmittingAi] = useState(false)
  const [deliveryTime, setDeliveryTime] = useState("")

  useEffect(() => {
    setStartDate(getMigrationStartDate())
    setEndDate(getMigrationEndDate())
  }, [])
  const [activeTab, setActiveTab] = useState("summary")
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({
    trialBalance: false,
    agedReceivable: false,
    agedPayable: false,
  })

  const handleStartAiAudit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingAi(true)
    setTimeout(() => {
      setIsSubmittingAi(false)
      setAiAuditRequested(true)
      const d = new Date()
      d.setHours(d.getHours() + 2)
      setDeliveryTime(d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }))
    }, 700)
  }

  const migrationData = {
    completed: {
      "Chart of Accounts": 156,
      Customers: 85,
      Vendors: 42,
      Items: 65,
      Invoices: 215,
      Bills: 178,
      "Invoice Payments": 142,
      "Bill Payments": 89,
      "Credit Notes": 23,
      "Bill Credits": 15,
      Journals: 62, // Changed from 64 to 62 to match import page
    },
    total: {
      "Chart of Accounts": 156,
      Customers: 87,
      Vendors: 42,
      Items: 65,
      Invoices: 215,
      Bills: 178,
      "Invoice Payments": 142,
      "Bill Payments": 89,
      "Credit Notes": 23,
      "Bill Credits": 15,
      Journals: 62, // Changed from 64 to 62 to match import page
    },
    warnings: [
      {
        id: 1,
        category: "Customers",
        message: "Missing phone number for customer 'ABC Corporation'. A placeholder has been used.",
      },
      {
        id: 2,
        category: "Customers",
        message: "Incomplete address for customer 'XYZ Ltd'. Only partial address was imported.",
      },
      {
        id: 3,
        category: "Invoice Payments",
        message: "Payment method mapping was ambiguous. Default payment method was applied.",
      },
    ],
    errors: [],
  }

  const totalRecords = Object.values(migrationData.total).reduce((a, b) => a + b, 0)
  const completedRecords = Object.values(migrationData.completed).reduce((a, b) => a + b, 0)

  const handleViewReport = (reportType: string) => {
    try {
      setIsDownloading({ ...isDownloading, [reportType]: true })

      // Map report types to filenames
      const fileMap: Record<string, string> = {
        trialBalance: "Comparative-Trial-Balance",
        agedReceivable: "Comparative-Aged-Receivable",
        agedPayable: "Comparative-Aged-Payable",
      }

      const fileName = fileMap[reportType]

      if (!fileName) {
        throw new Error(`Unknown report type: ${reportType}`)
      }

      // Open the report in a new tab with conversion period params
      window.open(`/reports/${fileName}.html?date=${endDate}&startDate=${startDate}`, "_blank")
    } catch (error) {
      console.error(`Error opening report:`, error)
      alert(`Error opening report. Please try again.`)
    } finally {
      setIsDownloading({ ...isDownloading, [reportType]: false })
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-6 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Migration Report</h1>
              <p className="text-muted-foreground">
                QuickBooks Online to Xero migration · Conversion Period:{" "}
                <span className="font-semibold text-foreground">{formatDateDot(startDate)} to {formatDateDot(endDate)}</span>
                {" "}({formatPeriodLong(startDate, endDate)})
              </p>
              <div className="flex items-center mt-2.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-semibold text-green-500 w-fit">
                <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Successfully completed
              </div>
            </div>
            <ModuleComparisonModal className="shadow-sm hover:shadow transition-all" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Card className="border-border/50 bg-card/70 backdrop-blur-md hover:scale-[1.02] hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="text-3xl font-extrabold tracking-tight text-foreground">{totalRecords}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">Total Records</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/70 backdrop-blur-md hover:scale-[1.02] hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="text-3xl font-extrabold tracking-tight text-green-500">{completedRecords}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">Successfully Imported</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/70 backdrop-blur-md hover:scale-[1.02] hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="text-3xl font-extrabold tracking-tight text-amber-500">{migrationData.warnings.length}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">Warnings</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/70 backdrop-blur-md hover:scale-[1.02] hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="text-3xl font-extrabold tracking-tight text-red-500">{migrationData.errors.length}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">Errors</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 bg-card/70 backdrop-blur-md shadow-sm">
            <CardHeader className="border-b border-border/30 pb-4">
              <CardTitle className="text-xl font-bold">Comparative Reports</CardTitle>
              <CardDescription className="text-muted-foreground">View comparative reports to analyze your migrated data consistency</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex flex-col p-5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-primary/5 hover:scale-[1.01] hover:shadow-sm transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="font-semibold text-foreground">Comparative Trial Balance</div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                    Compare your trial balance between QuickBooks Online and Xero to ensure financial data consistency.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto border-border/50 bg-background/50 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => handleViewReport("trialBalance")}
                    disabled={isDownloading.trialBalance}
                  >
                    {isDownloading.trialBalance ? (
                      <>Opening...</>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" /> View Report
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex flex-col p-5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-primary/5 hover:scale-[1.01] hover:shadow-sm transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="font-semibold text-foreground">Comparative Aged Receivable</div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                    Compare customer outstanding balances between QuickBooks Online and Xero systems.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto border-border/50 bg-background/50 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => handleViewReport("agedReceivable")}
                    disabled={isDownloading.agedReceivable}
                  >
                    {isDownloading.agedReceivable ? (
                      <>Opening...</>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" /> View Report
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex flex-col p-5 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-primary/5 hover:scale-[1.01] hover:shadow-sm transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="font-semibold text-foreground">Comparative Aged Payable</div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                    Compare supplier outstanding balances between QuickBooks Online and Xero systems.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto border-border/50 bg-background/50 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => handleViewReport("agedPayable")}
                    disabled={isDownloading.agedPayable}
                  >
                    {isDownloading.agedPayable ? (
                      <>Opening...</>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" /> View Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70 backdrop-blur-md shadow-sm">
            <CardHeader className="border-b border-border/30 pb-4">
              <CardTitle className="text-xl font-bold">Detailed Report</CardTitle>
              <CardDescription className="text-muted-foreground">Review the details of your migration</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6 flex flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
                  {["summary", "accounts", "customers", "vendors", "items", "invoices", "bills", "invoicePayments", "billPayments", "creditNotes", "billCredits", "journals", "payroll", "warnings"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium capitalize data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                    >
                      {tab === "invoicePayments" ? "Invoice Payments" : tab === "billPayments" ? "Bill Payments" : tab === "creditNotes" ? "Credit Notes" : tab === "billCredits" ? "Bill Credits" : tab === "accounts" ? "Chart of Accounts" : tab}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="summary" className="space-y-6 mt-4">
                  <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm shadow-sm">
                    <h3 className="mb-4 text-base font-semibold text-foreground">Migration Overview</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 border-b border-border/30 pb-2.5 text-sm">
                        <div className="font-medium text-muted-foreground">Migration ID</div>
                        <div className="text-foreground font-mono">MIG-{endDate.replace(/-/g, "")}-001</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-border/30 pb-2.5 text-sm">
                        <div className="font-medium text-muted-foreground">Conversion Period</div>
                        <div className="text-foreground font-mono font-medium text-primary">
                          {formatDateDot(startDate)} to {formatDateDot(endDate)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-border/30 pb-2.5 text-sm">
                        <div className="font-medium text-muted-foreground">Start Time</div>
                        <div className="text-foreground">{formatShort(endDate)} - 10:15:22</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-border/30 pb-2.5 text-sm">
                        <div className="font-medium text-muted-foreground">End Time</div>
                        <div className="text-foreground">{formatShort(endDate)} - 10:18:47</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-border/30 pb-2.5 text-sm">
                        <div className="font-medium text-muted-foreground">Duration</div>
                        <div className="text-foreground">3 minutes, 25 seconds</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-b border-border/30 pb-2.5 text-sm">
                        <div className="font-medium text-muted-foreground">Source</div>
                        <div className="text-foreground">QuickBooks Online (API v3.0)</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="font-medium text-muted-foreground">Destination</div>
                        <div className="text-foreground">Xero (API v2.0)</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm shadow-sm">
                    <h3 className="mb-4 text-base font-semibold text-foreground">Data Categories</h3>
                    <div className="space-y-3">
                      {Object.keys(migrationData.total).map((category) => (
                        <div key={category} className="flex items-center justify-between border-b border-border/30 pb-2.5 text-sm hover:bg-muted/5 transition-colors">
                          <div className="text-foreground font-medium">{category}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                              {migrationData.completed[category]}/{migrationData.total[category]} Imported
                            </span>
                            {migrationData.completed[category] === migrationData.total[category] ? (
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <PayrollCompletionSummary />

                  {migrationData.warnings.length > 0 && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">Warnings</div>
                          <p className="text-xs text-muted-foreground">
                            {migrationData.warnings.length} records were imported with warnings. See the Warnings tab for details.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="warnings" className="space-y-4 mt-4">
                  <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
                    <h3 className="mb-4 text-base font-semibold text-foreground">Warning Details</h3>
                    <div className="space-y-3">
                      {migrationData.warnings.map((warning) => (
                        <div key={warning.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 hover:bg-amber-500/10 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">{warning.category}</div>
                              <p className="text-xs text-muted-foreground mt-1">{warning.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payroll" className="space-y-6 mt-4">
                  <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
                    <h3 className="mb-4 text-base font-semibold text-foreground">Migrated Employees</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border/50 text-muted-foreground">
                            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Role</th>
                            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Super Fund</th>
                            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { name: "Bryce Guignon",  role: "Director",   type: "Full-time", super: "AustralianSuper" },
                            { name: "Sarah Mitchell", role: "Accountant",  type: "Full-time", super: "AustralianSuper" },
                            { name: "James Tan",      role: "Developer",   type: "Part-time", super: "REST Super"      },
                            { name: "Emily Chen",     role: "Manager",     type: "Full-time", super: "AustralianSuper" },
                            { name: "Tom Nguyen",     role: "Analyst",     type: "Full-time", super: "Cbus"            },
                            { name: "Lisa Park",      role: "Designer",    type: "Casual",    super: "Sunsuper"        },
                            { name: "Mark O'Brien",   role: "Sales",       type: "Full-time", super: "REST Super"      },
                          ].map((emp) => (
                            <tr key={emp.name} className="border-b border-border/30 hover:bg-muted/5 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{emp.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{emp.role}</td>
                              <td className="px-4 py-3 text-muted-foreground">{emp.super}</td>
                              <td className="px-4 py-3 text-muted-foreground">{emp.type}</td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-500">
                                  Imported
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
                    <h3 className="mb-4 text-base font-semibold text-foreground">Payroll Modules Status</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border/50 text-muted-foreground">
                            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Module Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Records</th>
                            <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { name: "Employee Basic Details", count: "7/7 records" },
                            { name: "Employment Details", count: "7/7 records" },
                            { name: "Superannuation Details", count: "7/7 records" },
                            { name: "Tax Details", count: "7/7 records" },
                            { name: "Leave Balances", count: "3 types" },
                            { name: "Bank Allocations", count: "7 accounts" },
                            { name: "YTD Balances", count: "164 slips" },
                            { name: "Pay Templates", count: "4 templates" },
                            { name: "Pay Items", count: "19 items" },
                          ].map((mod) => (
                            <tr key={mod.name} className="border-b border-border/30 hover:bg-muted/5 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{mod.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{mod.count}</td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-500">
                                  Imported
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                {Object.entries(tabData).map(([key, data]) => (
                  <TabsContent key={key} value={key} className="space-y-6 mt-4">
                    <div className="rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
                      <h3 className="mb-4 text-base font-semibold text-foreground">{data.title}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-border/50 text-muted-foreground">
                              {data.headers.map((h, i) => (
                                <th key={i} className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${i === data.headers.length - 1 ? 'text-right' : 'text-left'}`}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.rows.map((row, rIndex) => (
                              <tr key={rIndex} className="border-b border-border/30 hover:bg-muted/5 transition-colors">
                                {row.map((cell, cIndex) => (
                                  <td key={cIndex} className={`px-4 py-3 ${cIndex === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'} ${cIndex === row.length - 1 ? 'text-right' : 'text-left'}`}>
                                    {cIndex === row.length - 1 && cell === "Imported" ? (
                                      <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-500">
                                        {cell}
                                      </span>
                                    ) : cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-border/30 pt-4">
              <Button variant="outline" asChild className="border-border/50 hover:bg-muted/30">
                <Link href="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* ================================================================ */}
          {/* NEW FEATURE: AI-POWERED QA & AGENT-BASED AUDIT (2-HOUR SLA)     */}
          {/* ================================================================ */}
          <Card className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-card via-indigo-950/20 to-card shadow-lg backdrop-blur-md transition-all duration-300 hover:border-indigo-500/50">
            {/* Subtle background glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

            <CardContent className="p-6 sm:p-8 relative z-10">
              {!aiAuditRequested ? (
                <div className="space-y-6">
                  {/* Top Badge & Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-foreground sm:text-lg">
                            AI-Powered QA & Deep Audit
                          </span>
                          <span className="inline-flex items-center rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-400">
                            <Zap className="mr-1 h-3 w-3" /> New Feature
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Autonomous AI Agent auditing in background · Executive report in 2 hours
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-full bg-muted/40 border border-border/50 px-3 py-1 text-xs text-muted-foreground w-fit">
                      <Clock className="h-3.5 w-3.5 text-indigo-400" />
                      <span>SLA: Report sent in <strong>2 hours</strong></span>
                    </div>
                  </div>

                  {/* Core Question & Proposition */}
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      Do you want an AI-based QA Agent Audit?
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                      Run an autonomous AI QA Agent behind the scenes to verify every figure, perform a complete bank reconciliation audit, and inspect all source dependencies across both QuickBooks Online and Xero.
                    </p>
                  </div>

                  {/* 3 Inspection Pillars Grid */}
                  <div className="grid gap-4 sm:grid-cols-3 pt-2">
                    {/* Pillar 1: Figure Check */}
                    <div className="rounded-xl border border-border/40 bg-card/60 p-4 transition-colors hover:border-indigo-500/30">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <h4 className="font-semibold text-sm text-foreground">Figure & Balance Check</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Line-by-line parity check across all accounts, tax lines, invoices, and credit notes to guarantee exact numerical balance.
                      </p>
                    </div>

                    {/* Pillar 2: Bank Everything Check */}
                    <div className="rounded-xl border border-border/40 bg-card/60 p-4 transition-colors hover:border-indigo-500/30">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                          <Landmark className="h-4 w-4" />
                        </div>
                        <h4 className="font-semibold text-sm text-foreground">Bank Everything Check</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Complete audit of all bank account feeds, opening balances, uncleared checks, and transaction payment allocations.
                      </p>
                    </div>

                    {/* Pillar 3: Source Dependency */}
                    <div className="rounded-xl border border-border/40 bg-card/60 p-4 transition-colors hover:border-indigo-500/30">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                          <Layers className="h-4 w-4" />
                        </div>
                        <h4 className="font-semibold text-sm text-foreground">Source Dependency Check</h4>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Cross-validates chart of account hierarchies, customer/supplier relationships, and detects orphaned transactions.
                      </p>
                    </div>
                  </div>

                  {/* Form / CTA */}
                  <form onSubmit={handleStartAiAudit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-border/40">
                    <div className="relative flex-1">
                      <Input
                        type="email"
                        required
                        value={aiAuditEmail}
                        onChange={(e) => setAiAuditEmail(e.target.value)}
                        placeholder="Enter email to receive audit report"
                        className="h-11 rounded-xl bg-background/80 border-border text-sm pl-4 pr-4"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmittingAi}
                      className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmittingAi ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Dispatching AI Agent...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-yellow-300" />
                          <span>Dispatch AI QA Agent (Report in 2 Hours)</span>
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              ) : (
                /* Active Dispatched Audit State */
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/15 border border-green-500/30 text-green-400">
                        <Bot className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-foreground">
                            AI QA Agent Dispatched & Auditing
                          </h3>
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Autonomous background session: <span className="font-mono text-indigo-400">#AI-QA-{endDate.replace(/-/g, "")}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 text-xs text-indigo-300">
                      <Clock className="h-4 w-4" />
                      <span>Estimated Report Delivery: <strong>Within 2 Hours{deliveryTime ? ` (~${deliveryTime})` : ""}</strong></span>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="rounded-xl border border-border/40 bg-card/60 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                      <div className="text-muted-foreground">
                        Report Recipient: <span className="font-semibold text-foreground">{aiAuditEmail}</span>
                      </div>
                      <div className="text-xs text-green-400 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Background Agent Active
                      </div>
                    </div>

                    {/* Live Inspection Tracker */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={3} />
                          Figure & Balance Check
                        </span>
                        <span className="text-green-500 font-medium">92% verified (0 variance)</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                          Bank Everything Check
                        </span>
                        <span className="text-indigo-400 font-medium">Auditing 4 bank accounts & feeds</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          Source Dependency Validation
                        </span>
                        <span className="text-muted-foreground font-medium">Queued for final pass</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>You can safely navigate away. The complete audit report will arrive by email.</span>
                    <button
                      type="button"
                      onClick={() => setAiAuditRequested(false)}
                      className="text-indigo-400 hover:underline"
                    >
                      Change email or re-dispatch
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-primary/20 bg-primary/5 hover:border-primary/30 transition-all duration-300 shadow-sm rounded-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                <div className="text-xl font-bold text-foreground">Your financial migration is 99% complete!</div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Want MMC to do a manual QA to ensure 100% accuracy? Our experts can review your migrated data for
                  complete peace of mind.
                </p>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-8 rounded-lg shadow-sm hover:shadow-md transition-all"
                  onClick={() => {
                    alert("The MMC team has been notified and will reach out within 24 hours.")
                  }}
                >
                  Request Manual QA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
