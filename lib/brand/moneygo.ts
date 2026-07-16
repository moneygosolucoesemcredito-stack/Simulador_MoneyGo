import type { Brand } from "./types"

export const moneygo: Brand = {
  id: "moneygo",
  name: "MoneyGo",
  fullName: "MoneyGo Soluções em Crédito",
  legalName: "MONEYGO SOLUCOES EM CREDITO LTDA",
  cnpj: "62.682.074/0001-02",
  tagline: "Assessoria financeira em concessão de crédito no varejo e no atacado.",
  url: "https://www.moneygosolucoesemcredito.com.br",
  // Arquivos derivados do kit oficial da marca (pasta "Logo Alterada").
  logos: {
    full: "/logo-full.png",
    fullWhite: "/logo-full-white.png",
    mark: "/logo-mark.png",
    markWhite: "/logo-mark-white.png",
    width: 1400,
    height: 209,
    markWidth: 480,
    markHeight: 473,
    favicon: "/favicon.png",
  },
  contact: {
    whatsapp: "5547997890220",
    email: "privacidade@moneygosolucoesemcredito.com.br",
  },
  social: {
    instagram: "https://www.instagram.com/moneygo_assessoria",
    facebook: "https://www.facebook.com/profile.php?id=61565547202356",
    whatsapp: "https://wa.me/5547997890220",
  },
  seo: {
    title: "MoneyGo — Simule seu Crédito com Garantia",
    description:
      "Simule crédito com garantia de imóvel (Home Equity) ou veículo (Auto Equity) de forma rápida e gratuita. As melhores taxas para você.",
    keywords: ["crédito com garantia", "home equity", "auto equity", "simulação de crédito"],
    siteName: "MoneyGo Soluções em Crédito",
    ogTitle: "MoneyGo Soluções em Crédito — Simule Grátis",
    ogDescription: "Crédito com garantia de imóvel ou veículo. Simule agora e fale com um especialista.",
    ogImage: "/og-image.png",
  },
  // #C89C5C — o dourado medido no arquivo do logo, o mesmo de `--gold`.
  pdfAccentRgb: [200, 156, 92],
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
}
