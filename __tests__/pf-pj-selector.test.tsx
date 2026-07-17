// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import { Step5ValorDesejado } from "@/components/funnel/steps/home-equity/Step5ValorDesejado"
import { Step4ValorDesejado } from "@/components/funnel/steps/financiamento-imobiliario/Step4ValorDesejado"
import { useFunnelStore } from "@/stores/funnel-store"

// Stubs de APIs de layout que o slider (@base-ui/react) espera no browser.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

function setHomeEquity(patch: Record<string, unknown>) {
  act(() => {
    useFunnelStore.setState((s) => ({
      homeEquity: { ...s.homeEquity, ...patch },
    }))
  })
}

beforeEach(() => {
  act(() => {
    useFunnelStore.getState().resetHomeEquity()
    useFunnelStore.getState().resetFinanciamentoImobiliario()
  })
})

afterEach(cleanup)

describe("Home Equity — seletor PF/PJ persistente", () => {
  it("aparece quando nenhum tipo de pessoa foi escolhido", () => {
    render(<Step5ValorDesejado onNext={() => {}} />)
    expect(screen.getByText("Pessoa Física")).toBeTruthy()
    expect(screen.getByText("Pessoa Jurídica")).toBeTruthy()
  })

  it("continua visível depois da primeira escolha persistida no store", () => {
    setHomeEquity({ tipo_pessoa: "PF" })
    render(<Step5ValorDesejado onNext={() => {}} />)
    expect(screen.getByText("Pessoa Física")).toBeTruthy()
    expect(screen.getByText("Pessoa Jurídica")).toBeTruthy()
  })

  it("continua visível ao trocar a tipologia do imóvel", () => {
    setHomeEquity({ tipo_pessoa: "PJ", tipo_imovel: "casa" })
    const { unmount } = render(<Step5ValorDesejado onNext={() => {}} />)
    expect(screen.getByText("Pessoa Jurídica")).toBeTruthy()

    // Usuário volta, troca a tipologia e retorna ao step de valor.
    unmount()
    setHomeEquity({ tipo_imovel: "comercial" })
    render(<Step5ValorDesejado onNext={() => {}} />)
    expect(screen.getByText("Pessoa Física")).toBeTruthy()
    expect(screen.getByText("Pessoa Jurídica")).toBeTruthy()
  })

  it("fica oculto apenas quando a pessoa veio travada pelo link do operador", () => {
    setHomeEquity({ tipo_pessoa: "PF", pessoa_travada_link: true })
    render(<Step5ValorDesejado onNext={() => {}} />)
    expect(screen.queryByText("Pessoa Física")).toBeNull()
    expect(screen.queryByText("Pessoa Jurídica")).toBeNull()
  })
})

describe("Financiamento Imobiliário — seletor PF/PJ", () => {
  it("exibe o seletor PF/PJ no step de valor", () => {
    render(<Step4ValorDesejado onNext={() => {}} />)
    expect(screen.getByText("Pessoa Física")).toBeTruthy()
    expect(screen.getByText("Pessoa Jurídica")).toBeTruthy()
  })

  it("mantém o seletor visível após escolha persistida e troca de tipologia", () => {
    act(() => {
      useFunnelStore.setState((s) => ({
        financiamentoImobiliario: {
          ...s.financiamentoImobiliario,
          tipo_pessoa: "PJ",
          tipo_imovel: "apartamento",
        },
      }))
    })
    render(<Step4ValorDesejado onNext={() => {}} />)
    expect(screen.getByText("Pessoa Física")).toBeTruthy()
    expect(screen.getByText("Pessoa Jurídica")).toBeTruthy()
  })
})
