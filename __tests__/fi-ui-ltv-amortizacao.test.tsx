// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { Step1ValorImovel } from "@/components/funnel/steps/financiamento-imobiliario/Step1ValorImovel"
import { Step4ValorDesejado } from "@/components/funnel/steps/financiamento-imobiliario/Step4ValorDesejado"
import { Step5Resultado } from "@/components/funnel/steps/financiamento-imobiliario/Step5Resultado"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularSimulacao, formatarMoeda, rendaNecessaria } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"

vi.mock("@/lib/pdf-financiamento-imobiliario", () => ({
  gerarPdfFinanciamentoImobiliario: vi.fn().mockResolvedValue(undefined),
}))

// formatarMoeda usa NBSP entre "R$" e o número; o DOM normaliza para espaço.
const brl = (v: number) => formatarMoeda(v).replace(/ /g, " ")

function setFI(patch: Record<string, unknown>) {
  act(() => {
    useFunnelStore.setState((s) => ({
      financiamentoImobiliario: { ...s.financiamentoImobiliario, ...patch },
    }))
  })
}

beforeEach(() => {
  act(() => useFunnelStore.getState().resetFinanciamentoImobiliario())
})

afterEach(cleanup)

describe("FI Step 1 — valor do imóvel sem teto", () => {
  /** Digita no campo mascarado — só dígitos, como o usuário faz no teclado. */
  function digitar(digitos: string) {
    const input = screen.getByLabelText("Valor do imóvel") as HTMLInputElement
    fireEvent.input(input, { target: { value: digitos } })
    return input
  }

  it("aceita R$ 12.000.000 e grava no funil", () => {
    render(<Step1ValorImovel onNext={() => {}} />)
    digitar("12000000")
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
    expect(useFunnelStore.getState().financiamentoImobiliario.valor_imovel).toBe(12_000_000)
  })

  it("a régua acompanha o valor digitado (não trava em R$ 5.000.000)", () => {
    const { container } = render(<Step1ValorImovel onNext={() => {}} />)
    const regua = () => container.querySelector('input[type="range"]') as HTMLInputElement
    expect(Number(regua().max)).toBe(5_000_000)
    digitar("12000000")
    expect(Number(regua().max)).toBeGreaterThanOrEqual(12_000_000)
  })

  it("anuncia que não há valor máximo e mantém o piso de R$ 200.000", () => {
    render(<Step1ValorImovel onNext={() => {}} />)
    expect(screen.getByText(/não há valor máximo/i)).toBeTruthy()
    digitar("150000")
    expect(screen.getByText(/abaixo do mínimo/i)).toBeTruthy()
    expect((screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe("FI Step 4 — LTV muda conforme PF/PJ", () => {
  it("casa: PF financia até 80% e PJ até 70% do mesmo imóvel", () => {
    setFI({ valor_imovel: 1_000_000, tipo_imovel: "casa" })
    const { container } = render(<Step4ValorDesejado onNext={() => {}} />)
    // O texto do teto é quebrado em vários nós — a asserção olha a tela inteira.
    const tela = () => container.textContent ?? ""

    fireEvent.click(screen.getByText("Pessoa Física"))
    expect(tela()).toContain(`até ${formatarMoeda(800_000)}`)
    expect(tela()).toContain("80% do valor do imóvel para PF")

    fireEvent.click(screen.getByText("Pessoa Jurídica"))
    expect(tela()).toContain(`até ${formatarMoeda(700_000)}`)
    expect(tela()).toContain("70% do valor do imóvel para PJ")
  })

  it("terreno financia 60% para os dois tomadores", () => {
    setFI({ valor_imovel: 1_000_000, tipo_imovel: "terreno" })
    const { container } = render(<Step4ValorDesejado onNext={() => {}} />)

    for (const tomador of ["Pessoa Física", "Pessoa Jurídica"]) {
      fireEvent.click(screen.getByText(tomador))
      expect(container.textContent).toContain(`até ${formatarMoeda(600_000)}`)
      expect(container.textContent).toContain("60% do valor do imóvel")
    }
  })

  it("trocar PF por PJ rebaixa o valor já escolhido para o novo teto", () => {
    setFI({ valor_imovel: 1_000_000, tipo_imovel: "casa", valor_solicitado: 800_000 })
    render(<Step4ValorDesejado onNext={() => {}} />)

    fireEvent.click(screen.getByText("Pessoa Jurídica"))
    fireEvent.click(screen.getByRole("button", { name: "Ver simulação" }))

    const fi = useFunnelStore.getState().financiamentoImobiliario
    expect(fi.tipo_pessoa).toBe("PJ")
    expect(fi.valor_solicitado).toBe(700_000) // 70%, não os 800.000 de PF
  })

  it("não avança sem escolher o tomador", () => {
    setFI({ valor_imovel: 1_000_000, tipo_imovel: "casa" })
    render(<Step4ValorDesejado onNext={() => {}} />)
    expect((screen.getByRole("button", { name: "Ver simulação" }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe("FI Step 5 — renda necessária e tabelas completas", () => {
  const cenario = {
    valor_imovel: 500_000,
    tipo_imovel: "casa",
    tipo_pessoa: "PF",
    valor_solicitado: 400_000,
    prazo_meses: 420,
  }

  const resultado = calcularSimulacao(
    cenario.valor_solicitado,
    CONFIG.financiamentoImobiliario.taxaMensal,
    cenario.prazo_meses
  )

  it('substitui "Total pago" por "Renda necessária"', () => {
    setFI(cenario)
    render(<Step5Resultado onNext={() => {}} />)
    expect(screen.getByText("Renda necessária")).toBeTruthy()
    expect(screen.queryByText("Total pago")).toBeNull()
  })

  it("a renda exibida reflete o comprometimento de 30% da maior parcela", () => {
    setFI(cenario)
    render(<Step5Resultado onNext={() => {}} />)

    const rendaSac = rendaNecessaria(resultado.primeira_parcela_sac, 0.3)
    const rendaPrice = rendaNecessaria(resultado.parcela_price, 0.3)
    expect(screen.getByText(brl(rendaSac))).toBeTruthy()
    expect(screen.getByText(brl(rendaPrice))).toBeTruthy()
    expect(screen.getByText(/comprometimento de 30%/i)).toBeTruthy()
  })

  it("renderiza a tabela SAC com todas as 420 parcelas", () => {
    setFI(cenario)
    render(<Step5Resultado onNext={() => {}} />)

    expect(screen.getByText("420 parcelas")).toBeTruthy()
    const tabela = screen.getByRole("table")
    const linhas = within(tabela).getAllByRole("row")
    expect(linhas).toHaveLength(421) // cabeçalho + 420 parcelas
    expect(within(tabela).getByRole("rowheader", { name: "1" })).toBeTruthy()
    expect(within(tabela).getByRole("rowheader", { name: "420" })).toBeTruthy()
  })

  it("alterna para a tabela PRICE mantendo todas as parcelas", () => {
    setFI(cenario)
    render(<Step5Resultado onNext={() => {}} />)

    fireEvent.click(screen.getByRole("tab", { name: "PRICE" }))
    const tabela = screen.getByRole("table")
    expect(within(tabela).getAllByRole("row")).toHaveLength(421)
    // No PRICE a parcela é fixa: a primeira linha traz o PMT.
    expect(within(tabela).getAllByText(brl(resultado.parcela_price)).length).toBeGreaterThan(0)
    expect(screen.getByText(/parcela fixa/i)).toBeTruthy()
  })

  it("monta apenas o sistema selecionado (uma tabela por vez)", () => {
    setFI(cenario)
    render(<Step5Resultado onNext={() => {}} />)
    expect(screen.getAllByRole("table")).toHaveLength(1)
  })
})
