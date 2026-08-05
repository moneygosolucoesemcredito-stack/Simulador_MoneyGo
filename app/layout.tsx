import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { GTMScript } from "@/components/tracking/GTM"
import { MetaPixelScript } from "@/components/tracking/MetaPixel"
import { UTMCapture } from "@/components/tracking/UTMCapture"
import { CookieBanner } from "@/components/CookieBanner"
import { WhatsAppFloat } from "@/components/WhatsAppFloat"
import { BRAND } from "@/lib/brand"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? BRAND.url),
  title: BRAND.seo.title,
  description: BRAND.seo.description,
  keywords: BRAND.seo.keywords,
  icons: { icon: BRAND.logos.favicon },
  openGraph: {
    title: BRAND.seo.ogTitle,
    description: BRAND.seo.ogDescription,
    url: BRAND.url,
    siteName: BRAND.seo.siteName,
    images: [{ url: BRAND.seo.ogImage, width: 1200, height: 630 }],
    locale: "pt_BR",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-brand={BRAND.id} className={`${montserrat.variable} h-full`}>
      <head>
        <GTMScript />
        <MetaPixelScript />
      </head>
      <body className="min-h-full flex flex-col">
        <UTMCapture />
        {children}
        <Toaster richColors position="top-center" />
        <WhatsAppFloat />
        <CookieBanner />
      </body>
    </html>
  )
}
