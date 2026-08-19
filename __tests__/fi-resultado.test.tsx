// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { act, cleanup, render, screen, fireEvent } from "@testing-library/react"
import { Step5Resultado } from "@/components/funnel/steps/financiamento-imobiliario/Step5Resultado"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularSimulacao, formatarMoeda } from "@/lib/simulacao"
import { CONFIG, encargosFinanciamentoImobiliario } from "@/lib/config"

// formatarMoeda usa NBSP ( ) entre "R$" e o número; a Testing Library
// normaliza o NBSP do DOM para espaço comum, então a string buscada precisa
// fazer o mesmo para casar.
const brl = (v: number) => formatarMoeda(v).replace(/\u00a0/g, " ")

// Mock do gerador de PDF: valida que o clique aciona a geração sem tocar no jsPDF.
const gerarPdfSpy = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/pdf-financiamento-imobiliario", () => ({
  gerarPdfFinanciamentoImobiliario: (...args: unknown[]) => gerarPdfSpy(...args),
}))

function setFI(patch: Record<string, unknown>) {
  act(() => {
    useFunnelStore.setState((s) => ({
      financiamentoImobiliario: { ...s.financiamentoImobiliario, ...patch },
    }))
  })
}

beforeEach(() => {
  gerarPdfSpy.mockClear()
  act(() => {
    useFunnelStore.getState().resetFinanciamentoImobiliario()
  })
})

afterEach(cleanup)

describe("Financiamento Imobiliário — Step5 resultado (SAC × PRICE + PDF)", () => {
  const cenario = {
    valor_imovel: 500_000,
    tipo_imovel: "casa",
    tipo_pessoa: "PF",
    valor_solicitado: 400_000, // 80% de 500k — dentro do novo LTV
    prazo_meses: 420, // 35 anos — novo teto
  }

  it("exibe as colunas SAC e PRICE com os valores calculados", () => {
    setFI(cenario)
    render(<Step5Resultado onNext={() => {}} />)

    // "SAC"/"PRICE" aparecem no comparativo e nas abas da tabela de amortização.
    expect(screen.getAllByText("SAC").length).toBeGreaterThan(0)
    expect(screen.getAllByText("PRICE").length).toBeGreaterThan(0)

    const r = calcularSimulacao(
      cenario.valor_solicitado,
      CONFIG.financiamentoImobiliario.taxaMensal,
      cenario.prazo_meses,
      encargosFinanciamentoImobiliario(cenario.valor_imovel)
    )
    // A parcela do PRICE é decrescente (MIP sobre o saldo devedor): a tela traz
    // a primeira e a última, e elas são diferentes.
    expect(r.primeira_parcela_price).toBeGreaterThan(r.ultima_parcela_price)
    expect(screen.getAllByText(brl(r.primeira_parcela_price)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(brl(r.ultima_parcela_price)).length).toBeGreaterThan(0)
    // A primeira parcela do SAC também (comparativo + linha 1 da tabela).
    expect(screen.getAllByText(brl(r.primeira_parcela_sac)).length).toBeGreaterThan(0)
    // Taxa e prazo (o prazo aparece no card-resumo e na tabela).
    expect(screen.getByText("0,83% a.m. + IPCA")).toBeTruthy()
    expect(screen.getAllByText("420 meses").length).toBeGreaterThan(0)
  })

  it("aciona a geração de PDF com os dados da operação ao clicar no botão", async () => {
    setFI(cenario)
    render(<Step5Resultado onNext={() => {}} />)

    const botao = screen.getByRole("button", { name: /Baixar PDF/i })
    await act(async () => {
      fireEvent.click(botao)
    })

    expect(gerarPdfSpy).toHaveBeenCalledTimes(1)
    const [, dados] = gerarPdfSpy.mock.calls[0]
    expect(dados).toMatchObject({
      valorImovel: 500_000,
      valorCredito: 400_000,
      prazoMeses: 420,
      tomador: "PF",
    })
  })
})
