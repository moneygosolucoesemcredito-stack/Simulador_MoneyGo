// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Step1ValorImovel } from "@/components/funnel/steps/home-equity/Step1ValorImovel"
import { useFunnelStore } from "@/stores/funnel-store"

/**
 * O campo "Valor do Imóvel" do Home Equity não tem teto: qualquer valor acima
 * do mínimo (R$ 250.000) avança e chega ao store exatamente como digitado.
 */

/** Digita no campo mascarado — só dígitos, como o usuário faz no teclado. */
function digitar(digitos: string) {
  const input = screen.getByLabelText("Valor do imóvel") as HTMLInputElement
  fireEvent.input(input, { target: { value: digitos } })
  return input
}

function avancar() {
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
}

/** O slider do base-ui expõe um input[type=range] — a régua visível do passo. */
function regua(container: HTMLElement) {
  return container.querySelector('input[type="range"]') as HTMLInputElement
}

beforeEach(() => {
  act(() => useFunnelStore.getState().resetHomeEquity())
})

afterEach(cleanup)

describe("Home Equity Step 1 — valor do imóvel sem limite máximo", () => {
  it("aceita R$ 10.000.000 e grava o valor no funil", () => {
    render(<Step1ValorImovel onNext={() => {}} />)

    const input = digitar("10000000") // R$ 10.000.000
    expect(input.value).toBe("10.000.000")
    expect(screen.getByText("R$ 10.000.000,00")).toBeTruthy()

    const botao = screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement
    expect(botao.disabled).toBe(false)

    avancar()
    expect(useFunnelStore.getState().homeEquity.valor_imovel).toBe(10_000_000)
  })

  it("aceita valores muito acima da antiga trava (R$ 42.500.000)", () => {
    render(<Step1ValorImovel onNext={() => {}} />)
    digitar("42500000")
    avancar()
    expect(useFunnelStore.getState().homeEquity.valor_imovel).toBe(42_500_000)
  })

  it("a régua acompanha o valor digitado (não trava em R$ 5.000.000)", () => {
    const { container } = render(<Step1ValorImovel onNext={() => {}} />)
    expect(Number(regua(container).max)).toBe(5_000_000) // escala inicial
    digitar("10000000")
    expect(Number(regua(container).max)).toBeGreaterThanOrEqual(10_000_000)
  })

  it("nenhum texto do passo anuncia um valor máximo", () => {
    render(<Step1ValorImovel onNext={() => {}} />)
    expect(screen.queryByText(/máximo de R\$/i)).toBeNull()
    expect(screen.getByText(/não há valor máximo/i)).toBeTruthy()
  })

  it("continua bloqueando abaixo do mínimo de R$ 250.000", () => {
    render(<Step1ValorImovel onNext={() => {}} />)
    digitar("100000") // R$ 100.000
    expect(screen.getByText(/abaixo do mínimo/i)).toBeTruthy()
    expect((screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement).disabled).toBe(
      true
    )
    avancar()
    // valor_imovel permanece o default do store — o passo não avançou
    expect(useFunnelStore.getState().homeEquity.valor_imovel).toBe(500_000)
  })
})
