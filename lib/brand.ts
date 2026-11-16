/**
 * Branding for the QuickBooks Online → Xero platform.
 *
 * Every screen, email preview and generated PDF/Excel file reads from here.
 *
 * Logos: only official files supplied by the client are used (public/images/*).
 * The product itself has no logo yet, so its name is rendered as plain text.
 */
export const brand = {
  productName: "QBO to Xero",
  tagline: "QuickBooks Online to Xero migration and financial QA",
  productLogoSrc: "/images/mmc-convert-logo.png" as string | null,
  domain: "app.qbotoxero.example",
  supportEmail: "support@qbotoxero.example",
  qaSenderName: "AI Financial QA",

  logos: {
    quickbooks: "/images/qbo/quickbooks-logo.png",
    quickbooksWhite: "/images/qbo/quickbooks-logo-white.png",
    /** Official QuickBooks symbol, cropped from the supplied lockup */
    quickbooksMark: "/images/qbo/quickbooks-mark.png",
    xeroRound: "/images/Xero-logo.png",
    xeroWordmark: "/images/xero/xero-wordmark-cyan.png",
    xeroWordmarkWhite: "/images/xero/xero-wordmark-white.png",
  },

  poweredBy: {
    name: "MMC Convert",
    logoSrc: "/images/mmc-convert-logo.png",
    url: "https://mmcconvert.com",
  },

  /** RGB used inside generated PDF/Excel files, which can't read CSS variables. Keep in step with globals.css. */
  pdf: {
    /** Xero navy header band */
    primary: [6, 42, 77] as [number, number, number],
    /** Xero action blue */
    accent: [0, 120, 200] as [number, number, number],
    ink: [0, 10, 30] as [number, number, number],
    muted: [89, 104, 122] as [number, number, number],
    success: [16, 128, 67] as [number, number, number],
    warning: [196, 112, 0] as [number, number, number],
    danger: [203, 31, 43] as [number, number, number],
  },
} as const

/**
 * Chart colours. Validated with the dataviz palette checker (light surface):
 * #0078C8 + #108043 pass CVD separation, normal-vision floor and 3:1 contrast.
 * Xero cyan #13B5EA fails 3:1 as a mark colour, so it stays an accent only.
 * Max two categorical series per chart; a prior/comparison period is the
 * neutral `reference` grey (dashed), never a third hue.
 */
export const CHART_COLOURS = {
  /** Xero / current period */
  xero: "#0078C8",
  /** QuickBooks series. The logo green #2CA01C is reserved for the logo itself. */
  qbo: "#108043",
  /** Prior period / comparison */
  reference: "#A3ADB8",
  grid: "#E3E7EC",
  axis: "#59687A",
} as const

/** @deprecated use CHART_COLOURS */
export const SYSTEM_COLOURS = { qbo: CHART_COLOURS.qbo, xero: CHART_COLOURS.xero, bank: "#59687a" } as const
