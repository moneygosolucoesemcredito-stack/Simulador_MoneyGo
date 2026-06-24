import type { Brand } from "./types"

// TODO(capitamax): preencher WhatsApp, e-mail (DPO), URL definitiva e razão social
// completa. Adicionar também os arquivos de logo em `public/capitamax/` (ver `logos`).
export const capitamax: Brand = {
  id: "capitamax",
  name: "Capita Max",
  fullName: "Capita Max",
  legalName: "CAPITA MAX", // TODO: razão social completa
  cnpj: "55.491.405/0001-61",
  tagline: "Transformando Garantias em Oportunidades.",
  url: "https://www.capitamax.com.br", // TODO: confirmar domínio
  // logo-full.png = logo oficial (Logo Capita.png) aparada; logo-full-white.png =
  // silhueta branca gerada a partir dela (para o rodapé/header escuros).
  logos: {
    full: "/capitamax/logo-full.png",
    fullWhite: "/capitamax/logo-full-white.png",
    mark: "/capitamax/logo-full.png",
    markWhite: "/capitamax/logo-full-white.png",
    width: 845,
    height: 533,
    favicon: "/capitamax/favicon.png",
  },
  contact: {
    whatsapp: "", // TODO
    email: "", // TODO
  },
  social: {
    instagram: "https://www.instagram.com/capita.max",
    facebook: "https://www.facebook.com/capitamaxforbuilders",
  },
  seo: {
    title: "Capita Max — Simule seu Crédito com Garantia",
    description:
      "Simule crédito com garantia de imóvel ou veículo de forma rápida e gratuita. Transformando garantias em oportunidades.",
    keywords: ["crédito com garantia", "home equity", "auto equity", "simulação de crédito"],
    siteName: "Capita Max",
    ogTitle: "Capita Max — Simule Grátis",
    ogDescription: "Crédito com garantia de imóvel ou veículo. Simule agora e fale com um especialista.",
    ogImage: "/capitamax/og-image.png",
  },
  pdfAccentRgb: [239, 144, 14], // #ef900e
}
