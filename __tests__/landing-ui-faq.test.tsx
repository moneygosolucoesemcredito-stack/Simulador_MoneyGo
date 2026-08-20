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

  // O 30% é orientação sobre o saldo devedor que o cliente deve ter na
  // garantia — não é a trava do simulador, e o texto precisa dizer isso.
  it("imóvel financiado: cita 30% de saldo devedor e deixa claro que não é regra", () => {
    const texto = respostas()
    expect(texto).toContain("saldo devedor")
    expect(texto).toContain("30% do valor de mercado do imóvel")
    expect(texto).toContain("não é uma regra fixa")
    expect(texto).toContain("definido na análise")
    expect(texto).not.toContain("50% do valor de mercado")
  })

  it("os limites de idade do veículo são os mesmos nos dois produtos", () => {
    const texto = respostas()
    expect(texto).toContain("veículos pesados")
    expect(texto).toContain("até 20 anos de fabricação")
    expect(texto).toContain("até 15 anos")
    expect(texto).toContain("Auto Equity e no Financiamento de Veículo")
    // O limite antigo do Financiamento de Veículo saiu do texto.
    expect(texto).not.toContain("no máximo 5 anos")
  })

  it("o FAQ não anuncia mais piso de valor FIPE no Auto Equity", () => {
    const texto = respostas()
    expect(texto).not.toContain("R$ 30.000")
    expect(texto).toContain("sem valor mínimo nem máximo de tabela FIPE")
  })

  it("existe a pergunta sobre instituição financeira, com a resposta pedida", () => {
    expect(perguntas()).toContain("A MoneyGo é uma instituição financeira?")
    const item = PERGUNTAS.find((p) => p.q === "A MoneyGo é uma instituição financeira?")
    expect(item?.a).toBe(
      "Não, a MoneyGo é uma correspondente bancária atuando com mais de 50 Instituições Financeiras no mercado Brasileiro."
    )
  })

  it('a pergunta "Quanto tempo leva para receber o crédito?" foi removida', () => {
    // Retirada a pedido do negócio (05/08) — o prazo de liberação depende da
    // instituição e virava expectativa fixa na cabeça do cliente.
    expect(perguntas()).not.toContain("Quanto tempo leva para receber o crédito?")
    expect(respostas()).not.toContain("dias úteis")
  })

  it("as demais perguntas seguem no ar", () => {
    const lista = perguntas()
    expect(lista).toContain("A simulação é gratuita?")
    expect(lista).toContain("Posso usar um imóvel financiado como garantia?")
    expect(lista).toHaveLength(7)
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
