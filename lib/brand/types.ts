/**
 * Contrato de uma marca (white-label). Tudo o que é específico de marca —
 * identidade visual, dados legais, redes, SEO — vive aqui, nunca hardcoded
 * em componente. As cores ficam em `app/globals.css`, alternadas via o
 * atributo `data-brand` no `<html>` (ver `BRAND.id`).
 */
export interface BrandLogos {
  /** Logo colorido, para fundos claros. */
  full: string
  /** Logo em branco, para fundos escuros. */
  fullWhite: string
  /** Marca/ícone compacto colorido. */
  mark: string
  /** Marca/ícone compacto em branco. */
  markWhite: string
  /** Dimensão intrínseca (px) do lockup (`full`/`fullWhite`), p/ o aspect-ratio
   *  correto do next/image. */
  width: number
  height: number
  /** Dimensão intrínseca (px) do ícone (`mark`/`markWhite`). Separada do lockup
   *  porque as proporções não têm relação: o lockup é deitado, o ícone é quase
   *  quadrado. Como os `<Image>` usam `w-auto`, a largura é derivada daqui — usar
   *  as medidas do lockup no ícone o esticaria. */
  markWidth: number
  markHeight: number
  /** Ícone da aba do navegador (favicon). Caminho em /public. */
  favicon: string
}

export interface BrandSocial {
  /** URL completa do perfil no Instagram. */
  instagram?: string
  /** URL completa da página no Facebook. */
  facebook?: string
  /** Link completo wa.me, se houver. */
  whatsapp?: string
}

export interface BrandContact {
  /** Apenas dígitos com DDI/DDD, ex.: "5547997890220". Vazio = sem CTA de WhatsApp. */
  whatsapp?: string
  /** E-mail de privacidade/DPO. */
  email?: string
}

export interface BrandSupabase {
  url: string
  anonKey: string
}

export interface BrandSeo {
  title: string
  description: string
  keywords: string[]
  siteName: string
  ogTitle: string
  ogDescription: string
  ogImage: string
}

export interface Brand {
  /** Identificador da marca; também usado como `data-brand` no `<html>`. */
  id: string
  /** Nome curto, ex.: "MoneyGo". */
  name: string
  /** Nome de exibição completo, ex.: "MoneyGo Soluções em Crédito". */
  fullName: string
  /** Razão social, ex.: "MONEYGO SOLUCOES EM CREDITO LTDA". */
  legalName: string
  cnpj: string
  /** Frase curta de posicionamento (rodapé/hero). */
  tagline: string
  /** URL base do site (sem barra final). */
  url: string
  logos: BrandLogos
  contact: BrandContact
  social: BrandSocial
  seo: BrandSeo
  /** Cor de destaque para o PDF da simulação (RGB 0-255). */
  pdfAccentRgb: [number, number, number]
  /** Projeto Supabase próprio da marca (banco/auth isolados por marca). */
  supabase: BrandSupabase
}
