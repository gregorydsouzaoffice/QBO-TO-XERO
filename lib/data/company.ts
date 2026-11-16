/**
 * Invented demo company. Every name and number is made up.
 * All screens and reports read from lib/data so figures agree everywhere.
 */

export const COMPANY = {
  name: "Bluegum Electrical & Data Pty Ltd",
  short: "Bluegum Electrical",
  abn: "53 614 208 917",
  industry: "Commercial & residential electrical contractor",
  city: "Sydney NSW",
  baseCurrency: "AUD",
  gstBasis: "Accrual" as const,
  basFrequency: "Quarterly" as const,
  financialYearEnd: "30 June",
}

/** The person using the platform (signs in with Xero) */
export const USER = {
  name: "Alex Morgan",
  role: "Finance Manager",
  email: "alex.morgan@bluegumelectrical.com.au",
  initials: "AM",
}

/** Other people who receive the AI QA email */
export const QA_RECIPIENTS = [
  { name: "Alex Morgan", email: "alex.morgan@bluegumelectrical.com.au", role: "Finance Manager" },
  { name: "Jordan Lee", email: "jordan.lee@bluegumelectrical.com.au", role: "Director" },
  { name: "Priya Nair", email: "priya@harbourviewadvisory.com.au", role: "External accountant" },
]

/** QuickBooks Online company (source). realmId = Intuit company ID. */
export const QBO_COMPANY = {
  realmId: "9341452811320745",
  name: COMPANY.name,
  edition: "QuickBooks Online Plus",
  region: "Australia",
  country: "AU",
  createdOn: "2019-07-01",
  /** Other companies the same Intuit login can see (company picker) */
  otherCompanies: [
    { realmId: "9341452811987104", name: "Bluegum Property Trust", edition: "QuickBooks Online Essentials" },
    { realmId: "9130357722408813", name: "Sample Company (AU) – sandbox", edition: "QuickBooks Online Advanced" },
  ],
}

/** Xero organisation (destination). Created empty, as Xero recommends. */
export const XERO_ORG = {
  tenantId: "6f1c2a9e-3b7d-4e0a-9c55-1d2e8f4b7a10",
  name: COMPANY.name,
  shortCode: "!bG4eD",
  plan: "Xero Grow",
  baseCurrency: "AUD",
  financialYearEnd: "30 June",
  gstBasis: "Accrual",
  /** Other orgs on the same Xero login (organisation picker) */
  otherOrgs: [
    { tenantId: "a2d8c1f0-77e4-4b5b-8f0e-0c3e9b1d2a44", name: "Bluegum Property Trust" },
    { tenantId: "c0ffee00-1d2c-4e3f-9a8b-7c6d5e4f3a21", name: "Demo Company (AU)" },
  ],
}

/** Gojee account (jobs, quotes, purchase orders, inventory). Signs in with Xero. */
export const GOJEE_ACCOUNT = {
  id: "gj-20418",
  name: "Bluegum Electrical",
  linkedTenantId: XERO_ORG.tenantId,
}

export const BANK_ACCOUNTS = [
  { code: "1010", name: "Westpac Business One", kind: "bank" as const, number: "032-118 44 1907", xeroCode: "090", feed: "Westpac direct feed" },
  { code: "1020", name: "Westpac Business Saver", kind: "bank" as const, number: "032-118 44 2215", xeroCode: "091", feed: "Westpac direct feed" },
  { code: "2110", name: "Amex Business Card", kind: "card" as const, number: "xxxx-xxxxxx-x1009", xeroCode: "092", feed: "Amex feed (Yodlee)" },
]
export type BankCode = (typeof BANK_ACCOUNTS)[number]["code"]
