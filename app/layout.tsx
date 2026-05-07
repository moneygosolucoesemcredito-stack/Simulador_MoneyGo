import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { GTMScript } from "@/components/tracking/GTM"
import { MetaPixelScript } from "@/components/tracking/MetaPixel"
import { UTMCapture } from "@/components/tracking/UTMCapture"
import { CookieBanner } from "@/components/CookieBanner"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.moneygosolucoesemcredito.com.br"),
  title: "MoneyGo — Simule seu Crédito com Garantia",
  description:
    "Simule crédito com garantia de imóvel (Home Equity) ou veículo (Auto Equity) de forma rápida e gratuita. As melhores taxas para você.",
  keywords: ["crédito com garantia", "home equity", "auto equity", "simulação de crédito"],
  openGraph: {
    title: "MoneyGo Soluções em Crédito — Simule Grátis",
    description:
      "Crédito com garantia de imóvel ou veículo. Simule agora e fale com um especialista.",
    url: "https://www.moneygosolucoesemcredito.com.br",
    siteName: "MoneyGo Soluções em Crédito",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "pt_BR",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} h-full`}>
      <head>
        <GTMScript />
        <MetaPixelScript />
      </head>
      <body className="min-h-full flex flex-col">
        <UTMCapture />
        {children}
        <Toaster richColors position="top-center" />
        <CookieBanner />
      </body>
    </html>
  )
}
