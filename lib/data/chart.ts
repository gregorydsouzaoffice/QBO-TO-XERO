/**
 * QuickBooks Online chart of accounts for the demo company, with its Xero
 * mapping. QBO sub-accounts become flat Xero accounts (Xero has no hierarchy).
 *
 * `model` drives the invented monthly figures in ledger.ts:
 *   share  – share of total revenue (income lines: share of sales)
 *   fixed  – fixed monthly amount at inception, grows with the business
 */

export type Section = "income" | "cogs" | "expense" | "other-income" | "other-expense" | "asset" | "liability" | "equity"

export type QboAccountType =
  | "Bank"
  | "Accounts receivable (A/R)"
  | "Other Current Assets"
  | "Fixed Assets"
  | "Accounts payable (A/P)"
  | "Credit Card"
  | "Other Current Liabilities"
  | "Long Term Liabilities"
  | "Equity"
  | "Income"
  | "Cost of Goods Sold"
  | "Expenses"
  | "Other Income"
  | "Other Expense"

export type XeroAccountType =
  | "Bank"
  | "Current Asset"
  | "Inventory"
  | "Fixed Asset"
  | "Current Liability"
  | "Non-current Liability"
  | "Equity"
  | "Revenue"
  | "Direct Costs"
  | "Expense"
  | "Overhead"
  | "Depreciation"
  | "Other Income"

export type Model = { kind: "share"; share: number; noise?: number } | { kind: "fixed"; monthly: number; noise?: number; growth?: number } | { kind: "balance" }

export interface Account {
  code: string
  name: string
  qboType: QboAccountType
  qboDetail: string
  /** QBO parent account code (sub-account) */
  parent?: string
  /** Header accounts in QBO carry no postings of their own */
  header?: boolean
  section: Section
  xeroCode: string
  xeroName: string
  xeroType: XeroAccountType
  /** Default Xero tax rate for the account */
  xeroTax: string
  /** System account needing special handling at conversion */
  system?: string
  model: Model
}

const A = (a: Account) => a

export const CHART: Account[] = [
  // ---------------- Income
  A({ code: "4000", name: "Sales", qboType: "Income", qboDetail: "Sales of Product Income", header: true, section: "income", xeroCode: "", xeroName: "(header, not migrated)", xeroType: "Revenue", xeroTax: "", model: { kind: "share", share: 0 } }),
  A({ code: "4010", name: "Commercial Electrical Contracts", parent: "4000", qboType: "Income", qboDetail: "Service/Fee Income", section: "income", xeroCode: "200", xeroName: "Commercial Electrical Contracts", xeroType: "Revenue", xeroTax: "GST on Income", model: { kind: "share", share: 0.55, noise: 0.12 } }),
  A({ code: "4020", name: "Residential Service Calls", parent: "4000", qboType: "Income", qboDetail: "Service/Fee Income", section: "income", xeroCode: "201", xeroName: "Residential Service Calls", xeroType: "Revenue", xeroTax: "GST on Income", model: { kind: "share", share: 0.25, noise: 0.08 } }),
  A({ code: "4030", name: "Data & Communications", parent: "4000", qboType: "Income", qboDetail: "Service/Fee Income", section: "income", xeroCode: "202", xeroName: "Data & Communications", xeroType: "Revenue", xeroTax: "GST on Income", model: { kind: "share", share: 0.14, noise: 0.15 } }),
  A({ code: "4040", name: "Maintenance Contracts", parent: "4000", qboType: "Income", qboDetail: "Service/Fee Income", section: "income", xeroCode: "203", xeroName: "Maintenance Contracts", xeroType: "Revenue", xeroTax: "GST on Income", model: { kind: "share", share: 0.06, noise: 0.03 } }),
  A({ code: "4900", name: "Interest Income", qboType: "Other Income", qboDetail: "Interest Earned", section: "other-income", xeroCode: "270", xeroName: "Interest Income", xeroType: "Other Income", xeroTax: "GST Free Income", model: { kind: "fixed", monthly: 140, noise: 0.3, growth: 0.25 } }),

  // ---------------- Cost of sales
  A({ code: "5000", name: "Cost of Sales", qboType: "Cost of Goods Sold", qboDetail: "Supplies & Materials - COGS", header: true, section: "cogs", xeroCode: "", xeroName: "(header, not migrated)", xeroType: "Direct Costs", xeroTax: "", model: { kind: "share", share: 0 } }),
  A({ code: "5010", name: "Materials & Supplies", parent: "5000", qboType: "Cost of Goods Sold", qboDetail: "Supplies & Materials - COGS", section: "cogs", xeroCode: "310", xeroName: "Materials & Supplies", xeroType: "Direct Costs", xeroTax: "GST on Expenses", model: { kind: "share", share: 0.27, noise: 0.08 } }),
  A({ code: "5020", name: "Subcontractors", parent: "5000", qboType: "Cost of Goods Sold", qboDetail: "Cost of Labour - COS", section: "cogs", xeroCode: "311", xeroName: "Subcontractors", xeroType: "Direct Costs", xeroTax: "GST on Expenses", model: { kind: "share", share: 0.12, noise: 0.18 } }),
  A({ code: "5030", name: "Direct Labour", parent: "5000", qboType: "Cost of Goods Sold", qboDetail: "Cost of Labour - COS", section: "cogs", xeroCode: "312", xeroName: "Direct Labour", xeroType: "Direct Costs", xeroTax: "BAS Excluded", model: { kind: "share", share: 0.16, noise: 0.04 } }),
  A({ code: "5040", name: "Equipment Hire", parent: "5000", qboType: "Cost of Goods Sold", qboDetail: "Equipment Rental - COS", section: "cogs", xeroCode: "313", xeroName: "Equipment Hire", xeroType: "Direct Costs", xeroTax: "GST on Expenses", model: { kind: "share", share: 0.02, noise: 0.3 } }),
  A({ code: "5050", name: "Stock Adjustments", parent: "5000", qboType: "Cost of Goods Sold", qboDetail: "Other Costs of Services - COS", section: "cogs", xeroCode: "314", xeroName: "Stock Adjustments", xeroType: "Direct Costs", xeroTax: "BAS Excluded", model: { kind: "share", share: 0.003, noise: 0.6 } }),

  // ---------------- Expenses
  A({ code: "6000", name: "Advertising & Marketing", qboType: "Expenses", qboDetail: "Advertising/Promotional", section: "expense", xeroCode: "400", xeroName: "Advertising & Marketing", xeroType: "Expense", xeroTax: "GST on Expenses", model: { kind: "share", share: 0.012, noise: 0.35 } }),
  A({ code: "6010", name: "Bank Fees", qboType: "Expenses", qboDetail: "Bank Charges", section: "expense", xeroCode: "404", xeroName: "Bank Fees", xeroType: "Expense", xeroTax: "GST Free Expenses", model: { kind: "fixed", monthly: 85, noise: 0.2, growth: 0.05 } }),
  A({ code: "6020", name: "Insurance", qboType: "Expenses", qboDetail: "Insurance", section: "expense", xeroCode: "433", xeroName: "Insurance", xeroType: "Expense", xeroTax: "GST on Expenses", model: { kind: "fixed", monthly: 2450, noise: 0.02, growth: 0.07 } }),
  A({ code: "6030", name: "Motor Vehicle Expenses", qboType: "Expenses", qboDetail: "Auto", header: true, section: "expense", xeroCode: "", xeroName: "(header, not migrated)", xeroType: "Expense", xeroTax: "", model: { kind: "share", share: 0 } }),
  A({ code: "6031", name: "Fuel", parent: "6030", qboType: "Expenses", qboDetail: "Auto", section: "expense", xeroCode: "449", xeroName: "Motor Vehicle - Fuel", xeroType: "Expense", xeroTax: "GST on Expenses", model: { kind: "share", share: 0.025, noise: 0.1 } }),
  A({ code: "6032", name: "Vehicle Repairs & Maintenance", parent: "6030", qboType: "Expenses", qboDetail: "Auto", section: "expense", xeroCode: "450", xeroName: "Motor Vehicle - Repairs", xeroType: "Expense", xeroTax: "GST on Expenses", model: { kind: "share", share: 0.008, noise: 0.5 } }),
  A({ code: "6033", name: "Registration & CTP", parent: "6030", qboType: "Expenses", qboDetail: "Auto", section: "expense", xeroCode: "451", xeroName: "Motor Vehicle - Registration", xeroType: "Expense", xeroTax: "GST Free Expenses", model: { kind: "fixed", monthly: 640, noise: 0.1, growth: 0.1 } }),
  A({ code: "6040", name: "Rent", qboType: "Expenses", qboDetail: "Rent or Lease of Buildings", section: "expense", xeroCode: "469", xeroName: "Rent", xeroType: "Overhead", xeroTax: "GST on Expenses", model: { kind: "fixed", monthly: 6800, noise: 0, growth: 0.045 } }),
  A({ code: "6050", name: "Telephone & Internet", qboType: "Expenses", qboDetail: "Utilities", section: "expense", xeroCode: "489", xeroName: "Telephone & Internet", xeroType: "Overhead", xeroTax: "GST on Expenses", model: { kind: "fixed", monthly: 920, noise: 0.06, growth: 0.06 } }),
  A({ code: "6060", name: "Wages & Salaries - Office", qboType: "Expenses", qboDetail: "Payroll Expenses", section: "expense", xeroCode: "477", xeroName: "Wages & Salaries", xeroType: "Expense", xeroTax: "BAS Excluded", model: { kind: "fixed", monthly: 26000, noise: 0.02, growth: 0.11 } }),
  A({ code: "6070", name: "Superannuation", qboType: "Expenses", qboDetail: "Payroll Expenses", section: "expense", xeroCode: "478", xeroName: "Superannuation", xeroType: "Expense", xeroTax: "BAS Excluded", model: { kind: "share", share: 0.031, noise: 0.03 } }),
  A({ code: "6080", name: "Software Subscriptions", qboType: "Expenses", qboDetail: "Office/General Administrative Expenses", section: "expense", xeroCode: "485", xeroName: "Subscriptions", xeroType: "Overhead", xeroTax: "GST on Expenses", model: { kind: "fixed", monthly: 1350, noise: 0.05, growth: 0.12 } }),
  A({ code: "6090", name: "Accounting & Legal", qboType: "Expenses", qboDetail: "Legal & Professional Fees", section: "expense", xeroCode: "412", xeroName: "Consulting & Accounting", xeroType: "Expense", xeroTax: "GST on Expenses", model: { kind: "fixed", monthly: 1800, noise: 0.4, growth: 0.06 } }),
  A({ code: "6100", name: "Workers Compensation", qboType: "Expenses", qboDetail: "Insurance", section: "expense", xeroCode: "479", xeroName: "Workers Compensation", xeroType: "Expense", xeroTax: "GST Free Expenses", model: { kind: "fixed", monthly: 1100, noise: 0.03, growth: 0.1 } }),
  A({ code: "6110", name: "Tools & Small Equipment", qboType: "Expenses", qboDetail: "Supplies & Materials", section: "expense", xeroCode: "461", xeroName: "Tools & Small Equipment", xeroType: "Expense", xeroTax: "GST on Expenses", model: { kind: "share", share: 0.01, noise: 0.4 } }),
  A({ code: "6120", name: "Uniforms & PPE", qboType: "Expenses", qboDetail: "Supplies & Materials", section: "expense", xeroCode: "464", xeroName: "Uniforms & PPE", xeroType: "Expense", xeroTax: "GST on Expenses", model: { kind: "share", share: 0.004, noise: 0.4 } }),
  A({ code: "6130", name: "Training & Licences", qboType: "Expenses", qboDetail: "Dues & Subscriptions", section: "expense", xeroCode: "467", xeroName: "Training & Licences", xeroType: "Expense", xeroTax: "GST on Expenses", model: { kind: "fixed", monthly: 600, noise: 0.5, growth: 0.08 } }),
  A({ code: "6140", name: "Depreciation", qboType: "Expenses", qboDetail: "Depreciation", section: "expense", xeroCode: "416", xeroName: "Depreciation", xeroType: "Depreciation", xeroTax: "BAS Excluded", model: { kind: "fixed", monthly: 3200, noise: 0, growth: 0.06 } }),
  A({ code: "6150", name: "Office Expenses", qboType: "Expenses", qboDetail: "Office/General Administrative Expenses", section: "expense", xeroCode: "453", xeroName: "Office Expenses", xeroType: "Overhead", xeroTax: "GST on Expenses", model: { kind: "fixed", monthly: 700, noise: 0.3, growth: 0.05 } }),
  A({ code: "6160", name: "Interest Expense", qboType: "Other Expense", qboDetail: "Other Miscellaneous Expense", section: "other-expense", xeroCode: "437", xeroName: "Interest Expense", xeroType: "Expense", xeroTax: "GST Free Expenses", model: { kind: "fixed", monthly: 1250, noise: 0.03, growth: -0.08 } }),
  A({ code: "6990", name: "Uncategorised Expense", qboType: "Expenses", qboDetail: "Other Miscellaneous Service Cost", section: "expense", xeroCode: "429", xeroName: "General Expenses", xeroType: "Expense", xeroTax: "GST on Expenses", system: "QBO system account: review before migration", model: { kind: "fixed", monthly: 60, noise: 0.9, growth: 0 } }),

  // ---------------- Assets
  A({ code: "1010", name: "Westpac Business One", qboType: "Bank", qboDetail: "Cash on hand", section: "asset", xeroCode: "090", xeroName: "Westpac Business One", xeroType: "Bank", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "1020", name: "Westpac Business Saver", qboType: "Bank", qboDetail: "Savings", section: "asset", xeroCode: "091", xeroName: "Westpac Business Saver", xeroType: "Bank", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "1099", name: "Undeposited Funds", qboType: "Other Current Assets", qboDetail: "Undeposited Funds", section: "asset", xeroCode: "615", xeroName: "Payments Clearing", xeroType: "Current Asset", xeroTax: "", system: "Cleared to $0 before the conversion date", model: { kind: "balance" } }),
  A({ code: "1100", name: "Accounts Receivable (A/R)", qboType: "Accounts receivable (A/R)", qboDetail: "Accounts Receivable (A/R)", section: "asset", xeroCode: "610", xeroName: "Accounts Receivable", xeroType: "Current Asset", xeroTax: "", system: "Rebuilt from open invoices", model: { kind: "balance" } }),
  A({ code: "1200", name: "Inventory Asset", qboType: "Other Current Assets", qboDetail: "Inventory", section: "asset", xeroCode: "630", xeroName: "Inventory", xeroType: "Inventory", xeroTax: "", system: "Value in Xero, item quantities in Gojee", model: { kind: "balance" } }),
  A({ code: "1210", name: "Prepayments", qboType: "Other Current Assets", qboDetail: "Prepaid Expenses", section: "asset", xeroCode: "620", xeroName: "Prepayments", xeroType: "Current Asset", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "1300", name: "Work in Progress", qboType: "Other Current Assets", qboDetail: "Other Current Assets", section: "asset", xeroCode: "635", xeroName: "Work in Progress", xeroType: "Current Asset", xeroTax: "", system: "Ties to Gojee job WIP", model: { kind: "balance" } }),
  A({ code: "1500", name: "Plant & Equipment", qboType: "Fixed Assets", qboDetail: "Machinery & Equipment", section: "asset", xeroCode: "710", xeroName: "Plant & Equipment", xeroType: "Fixed Asset", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "1501", name: "Accumulated Depreciation - P&E", parent: "1500", qboType: "Fixed Assets", qboDetail: "Accumulated Depreciation", section: "asset", xeroCode: "711", xeroName: "Less Accumulated Depreciation on Plant & Equipment", xeroType: "Fixed Asset", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "1510", name: "Motor Vehicles", qboType: "Fixed Assets", qboDetail: "Vehicles", section: "asset", xeroCode: "720", xeroName: "Motor Vehicles", xeroType: "Fixed Asset", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "1511", name: "Accumulated Depreciation - MV", parent: "1510", qboType: "Fixed Assets", qboDetail: "Accumulated Depreciation", section: "asset", xeroCode: "721", xeroName: "Less Accumulated Depreciation on Motor Vehicles", xeroType: "Fixed Asset", xeroTax: "", model: { kind: "balance" } }),

  // ---------------- Liabilities
  A({ code: "2000", name: "Accounts Payable (A/P)", qboType: "Accounts payable (A/P)", qboDetail: "Accounts Payable (A/P)", section: "liability", xeroCode: "800", xeroName: "Accounts Payable", xeroType: "Current Liability", xeroTax: "", system: "Rebuilt from open bills", model: { kind: "balance" } }),
  A({ code: "2110", name: "Amex Business Card", qboType: "Credit Card", qboDetail: "Credit Card", section: "liability", xeroCode: "092", xeroName: "Amex Business Card", xeroType: "Bank", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "2200", name: "GST Payable", qboType: "Other Current Liabilities", qboDetail: "GST Payable", section: "liability", xeroCode: "820", xeroName: "GST", xeroType: "Current Liability", xeroTax: "", system: "Xero GST system account", model: { kind: "balance" } }),
  A({ code: "2210", name: "PAYG Withholding Payable", qboType: "Other Current Liabilities", qboDetail: "Payroll Tax Payable", section: "liability", xeroCode: "825", xeroName: "PAYG Withholdings Payable", xeroType: "Current Liability", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "2220", name: "Superannuation Payable", qboType: "Other Current Liabilities", qboDetail: "Payroll Clearing", section: "liability", xeroCode: "826", xeroName: "Superannuation Payable", xeroType: "Current Liability", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "2230", name: "Wages Payable", qboType: "Other Current Liabilities", qboDetail: "Payroll Clearing", section: "liability", xeroCode: "803", xeroName: "Wages Payable - Payroll", xeroType: "Current Liability", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "2300", name: "Customer Deposits", qboType: "Other Current Liabilities", qboDetail: "Other Current Liabilities", section: "liability", xeroCode: "835", xeroName: "Revenue Received in Advance", xeroType: "Current Liability", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "2500", name: "Equipment Finance Loan", qboType: "Long Term Liabilities", qboDetail: "Notes Payable", section: "liability", xeroCode: "900", xeroName: "Equipment Finance Loan", xeroType: "Non-current Liability", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "2510", name: "Director Loan", qboType: "Long Term Liabilities", qboDetail: "Shareholder Notes Payable", section: "liability", xeroCode: "905", xeroName: "Director Loan", xeroType: "Non-current Liability", xeroTax: "", model: { kind: "balance" } }),

  // ---------------- Equity
  A({ code: "3000", name: "Opening Balance Equity", qboType: "Equity", qboDetail: "Opening Balance Equity", section: "equity", xeroCode: "960", xeroName: "Retained Earnings", xeroType: "Equity", xeroTax: "", system: "QBO system account: reclassed to Retained Earnings", model: { kind: "balance" } }),
  A({ code: "3100", name: "Share Capital", qboType: "Equity", qboDetail: "Owner's Equity", section: "equity", xeroCode: "970", xeroName: "Share Capital", xeroType: "Equity", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "3200", name: "Retained Earnings", qboType: "Equity", qboDetail: "Retained Earnings", section: "equity", xeroCode: "960", xeroName: "Retained Earnings", xeroType: "Equity", xeroTax: "", system: "QBO and Xero system account", model: { kind: "balance" } }),
  A({ code: "3300", name: "Dividends Paid", qboType: "Equity", qboDetail: "Partner Distributions", section: "equity", xeroCode: "975", xeroName: "Dividends Paid", xeroType: "Equity", xeroTax: "", model: { kind: "balance" } }),
  A({ code: "3900", name: "Current Year Earnings", qboType: "Equity", qboDetail: "Net Income (calculated)", section: "equity", xeroCode: "—", xeroName: "Current Year Earnings (calculated)", xeroType: "Equity", xeroTax: "", system: "Calculated by both systems", model: { kind: "balance" } }),
]

export const ACCOUNT_BY_CODE = Object.fromEntries(CHART.map((a) => [a.code, a])) as Record<string, Account>

/** Accounts that carry postings */
export const POSTING_ACCOUNTS = CHART.filter((a) => !a.header)

export const PL_SECTIONS: Section[] = ["income", "cogs", "expense", "other-income", "other-expense"]
export const isPL = (a: Account) => PL_SECTIONS.includes(a.section)

export const SECTION_LABEL: Record<Section, string> = {
  income: "Trading Income",
  cogs: "Cost of Sales",
  expense: "Operating Expenses",
  "other-income": "Other Income",
  "other-expense": "Other Expenses",
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
}

/** Credit-natural sections show as positive when their (debit-positive) balance is negative */
export const CREDIT_NATURAL: Section[] = ["income", "other-income", "liability", "equity"]
