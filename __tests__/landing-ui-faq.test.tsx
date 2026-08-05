// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import { Hero } from "@/components/landing/Hero"
import { Footer } from "@/components/landing/Footer"
import { Faq, PERGUNTAS } from "@/components/landing/Faq"
import { WhatsAppFloat } from "@/components/WhatsAppFloat"
import { BRAND } from "@/lib/brand"

// O FAQ anima com `whileInView` (framer-motion), que exige IntersectionObserver
// — ausente no jsdom.
class IntersectionObserverStub {
  root = null
  rootMargin = ""
  thresholds: number[] = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub)

afterEach(cleanup)

describe("Home — atalhos em destaque removidos", () => {
  it("o topo não tem mais botões diretos de Home Equity e Auto Equity", () => {
    render(<Hero />)
    expect(screen.queryByRole("link", { name: /Simular com Imóvel/i })).toBeNull()
    expect(screen.queryByRole("link", { name: /Simular com Veículo/i })).toBeNull()

    const links = screen.getAllByRole("link")
    for (const link of links) {
      const href = link.getAttribute("href") ?? ""
      expect(href).not.toContain("home-equity")
      expect(href).not.toContain("auto-equity")
    }
  })

  it("o topo leva à seção de produtos, onde cada funil continua acessível", () => {
    render(<Hero />)
    const cta = screen.getByRole("link", { name: /Conheça nossos produtos/i })
    expect(cta.getAttribute("href")).toBe("#produtos")
  })
})

describe("Rodapé — redes sociais e contatos separados", () => {
  it("tem as duas seções", () => {
    render(<Footer />)
    expect(screen.getByText("Redes sociais")).toBeTruthy()
    expect(screen.getByText("Contatos")).toBeTruthy()
  })

  it("lista as quatro redes com os links da marca", () => {
    render(<Footer />)
    const esperado: [string, string | undefined][] = [
      ["Instagram", BRAND.social.instagram],
      ["Facebook", BRAND.social.facebook],
      ["LinkedIn", BRAND.social.linkedin],
      ["YouTube", BRAND.social.youtube],
    ]
    for (const [nome, href] of esperado) {
      const link = screen.getByRole("link", { name: nome })
      expect(link.getAttribute("href")).toBe(href)
      expect(link.getAttribute("target")).toBe("_blank")
      expect(link.getAttribute("rel")).toContain("noopener")
    }
  })

  it("traz WhatsApp e e-mail na seção de contatos", () => {
    const { container } = render(<Footer />)
    const whats = screen.getByRole("link", { name: /WhatsApp/i })
    expect(whats.getAttribute("href")).toBe(BRAND.social.whatsapp)
    expect(whats.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/55\d{10,11}$/)

    const email = BRAND.contact.emailComercial ?? ""
    expect(email).toBe("daiana.hamud@moneygoassessoria.com.br")
    expect(screen.getByRole("link", { name: /E-mail/i }).getAttribute("href")).toBe(
      `mailto:${email}`
    )
    expect(container.textContent).toContain(BRAND.contact.whatsappDisplay)
  })

  it("mantém os links de produtos e a política de privacidade", () => {
    render(<Footer />)
    expect(screen.getByRole("link", { name: "Home Equity" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Auto Equity" })).toBeTruthy()
    expect(screen.getByRole("link", { name: /Política de Privacidade/i })).toBeTruthy()
  })
})

describe("Botão flutuante de WhatsApp", () => {
  it("aponta para o WhatsApp da marca com mensagem pronta", () => {
    render(<WhatsAppFloat />)
    const botao = screen.getByRole("link", { name: /WhatsApp/i })
    const href = botao.getAttribute("href") ?? ""
    expect(href.startsWith(BRAND.social.whatsapp ?? "")).toBe(true)
    expect(href).toContain("?text=")
    expect(botao.className).toContain("fixed")
  })
})

describe("FAQ — regras textuais atualizadas", () => {
  function perguntas() {
    render(<Faq />)
    return screen.getAllByRole("button").map((b) => b.textContent ?? "")
  }

  // As respostas só entram no DOM quando o item do acordeão é aberto; por isso
  // as asserções de conteúdo olham a fonte (PERGUNTAS) e as de exibição, a tela.
  const respostas = () => PERGUNTAS.map((p) => p.a).join(" ")

  it("imóvel financiado passa a citar 30% de saldo devedor", () => {
    expect(respostas()).toContain("no máximo 30% do valor de mercado do imóvel")
    expect(respostas()).not.toContain("no máximo 50% do valor de mercado")
  })

  it("veículos pesados aparecem com o limite de cada produto", () => {
    const texto = respostas()
    expect(texto).toContain("Veículos pesados")
    expect(texto).toContain("até 15 anos de fabricação no Auto Equity")
    expect(texto).toContain("no máximo 5 anos no Financiamento de Veículo")
  })

  it("existe a pergunta sobre instituição financeira, com a resposta pedida", () => {
    expect(perguntas()).toContain("A MoneyGo é uma instituição financeira?")
    const item = PERGUNTAS.find((p) => p.q === "A MoneyGo é uma instituição financeira?")
    expect(item?.a).toBe(
      "Não, a MoneyGo é uma correspondente bancária atuando com mais de 50 Instituições Financeiras no mercado Brasileiro."
    )
  })

  it("nenhuma pergunta útil foi perdida", () => {
    const lista = perguntas()
    expect(lista).toContain("Quanto tempo leva para receber o crédito?")
    expect(lista).toContain("A simulação é gratuita?")
    expect(lista).toHaveLength(8)
  })

  it("cada pergunta tem resposta preenchida e é renderizada na tela", () => {
    for (const item of PERGUNTAS) {
      expect(item.q.length).toBeGreaterThan(5)
      expect(item.a.length).toBeGreaterThan(20)
    }
    const { container } = render(<Faq />)
    expect(within(container as HTMLElement).getAllByRole("button")).toHaveLength(PERGUNTAS.length)
  })
})
