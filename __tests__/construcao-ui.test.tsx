// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { Step1ValorTerreno } from "@/components/funnel/steps/credito-construcao/Step1ValorTerreno"
import { Step2ValorObra } from "@/components/funnel/steps/credito-construcao/Step2ValorObra"
import { Step3ValorDesejado } from "@/components/funnel/steps/credito-construcao/Step3ValorDesejado"
import { Step5Resultado } from "@/components/funnel/steps/credito-construcao/Step5Resultado"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularSimulacao, formatarMoeda } from "@/lib/simulacao"
import { taxaMensalConstrucao } from "@/lib/config"

const gerarPdfSpy = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/pdf-credito-construcao", () => ({
  gerarPdfCreditoConstrucao: (...args: unknown[]) => gerarPdfSpy(...args),
}))

const brl = (v: number) => formatarMoeda(v).replace(/ /g, " ")

function setCC(patch: Record<string, unknown>) {
  act(() => {
    useFunnelStore.setState((s) => ({
      creditoConstrucao: { ...s.creditoConstrucao, ...patch },
    }))
  })
}

beforeEach(() => {
  gerarPdfSpy.mockClear()
  act(() => useFunnelStore.getState().resetCreditoConstrucao())
})

afterEach(cleanup)

describe("Construção Step 1 — seletor de categoria do terreno", () => {
  it("oferece as duas categorias com suas condições", () => {
    const { container } = render(<Step1ValorTerreno onNext={() => {}} />)
    expect(screen.getByText("Dentro de condomínio")).toBeTruthy()
    expect(screen.getByText("Fora de condomínio")).toBeTruthy()

    const texto = container.textContent ?? ""
    expect(texto).toContain("Até 80% do custo da obra")
    expect(texto).toContain("Até 50% do VGV")
    expect(texto).toContain("Taxas a partir de 13,99% a.a. + TR")
    expect(texto).toContain("Taxa a partir de 15,00% a.a. + IPCA")
    expect(texto).toContain("Prazo de até 30 anos")
    expect(texto).toContain("Prazo de até 20 anos")
    expect(texto).toContain("Contratação PF")
    expect(texto).toContain("Contratação PF E PJ")
    // A taxa mensal fechada saiu dos cartões.
    expect(texto).not.toContain("1,25% a.m.")
  })

  it("o valor do terreno não tem piso nem teto e o aviso não fala em quitação", () => {
    const { container } = render(<Step1ValorTerreno onNext={() => {}} />)
    const texto = container.textContent ?? ""

    expect(texto).not.toContain("(quitado)")
    expect(texto).toContain("Valor de mercado do terreno que você já possui — garantia inicial")
    expect(texto).toContain(
      "O terreno pode possuir saldo devedor máximo de 15% do valor da compra e venda"
    )
    expect(texto).not.toContain("precisa estar quitado")
    expect(texto).toContain("não há valor mínimo nem máximo")

    // Qualquer valor digitado avança, inclusive acima dos R$ 10 milhões antigos.
    fireEvent.click(screen.getByText("Dentro de condomínio"))
    fireEvent.input(screen.getByLabelText("Valor do terreno"), { target: { value: "45000000" } })
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
    expect(useFunnelStore.getState().creditoConstrucao.valor_terreno).toBe(45_000_000)
  })

  it("condomínio trava o tomador em PF (PJ desabilitada)", () => {
    render(<Step1ValorTerreno onNext={() => {}} />)
    fireEvent.click(screen.getByText("Dentro de condomínio"))

    const pj = screen.getByText("Pessoa Jurídica").closest("button") as HTMLButtonElement
    expect(pj.disabled).toBe(true)
    expect(screen.getByText(/atende apenas PF/i)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
    const cc = useFunnelStore.getState().creditoConstrucao
    expect(cc.categoria_terreno).toBe("condominio")
    expect(cc.tipo_pessoa).toBe("PF") // já selecionada automaticamente
  })

  it("fora de condomínio libera PF e PJ", () => {
    render(<Step1ValorTerreno onNext={() => {}} />)
    fireEvent.click(screen.getByText("Fora de condomínio"))

    const pj = screen.getByText("Pessoa Jurídica").closest("button") as HTMLButtonElement
    expect(pj.disabled).toBe(false)
    // Sem tomador escolhido o passo não avança.
    expect((screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(pj)
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
    const cc = useFunnelStore.getState().creditoConstrucao
    expect(cc.categoria_terreno).toBe("fora_condominio")
    expect(cc.tipo_pessoa).toBe("PJ")
  })

  it("trocar de fora (PJ) para condomínio corrige o tomador para PF", () => {
    render(<Step1ValorTerreno onNext={() => {}} />)
    fireEvent.click(screen.getByText("Fora de condomínio"))
    fireEvent.click(screen.getByText("Pessoa Jurídica"))
    fireEvent.click(screen.getByText("Dentro de condomínio"))
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
    expect(useFunnelStore.getState().creditoConstrucao.tipo_pessoa).toBe("PF")
  })
})

describe("Construção Step 2 — campo adaptado à categoria", () => {
  it("em condomínio pede o CUSTO DA OBRA", () => {
    setCC({ categoria_terreno: "condominio", tipo_pessoa: "PF" })
    const { container } = render(<Step2ValorObra onNext={() => {}} />)

    expect(screen.getByText("Qual o custo total da obra?")).toBeTruthy()
    expect(screen.getByLabelText("Custo da obra")).toBeTruthy()
    expect(screen.queryByLabelText("VGV estimado")).toBeNull()
    expect(container.textContent).toContain("Qual o custo total da obra?")
  })

  it("fora de condomínio pede o VGV ESTIMADO", () => {
    setCC({ categoria_terreno: "fora_condominio", tipo_pessoa: "PJ" })
    const { container } = render(<Step2ValorObra onNext={() => {}} />)

    expect(screen.getByText("Qual o VGV estimado?")).toBeTruthy()
    expect(screen.getByLabelText("VGV estimado")).toBeTruthy()
    expect(screen.queryByLabelText("Custo da obra")).toBeNull()
    expect(container.textContent).toContain("Qual o VGV estimado?")
  })

  it("não anuncia mais o teto de crédito estimado do passo", () => {
    setCC({ categoria_terreno: "condominio", tipo_pessoa: "PF", valor_obra: 1_000_000 })
    const { container } = render(<Step2ValorObra onNext={() => {}} />)
    const texto = container.textContent ?? ""
    expect(texto).not.toContain("hoje, até")
    expect(texto).not.toContain("crédito de até")
    expect(texto).not.toContain(formatarMoeda(800_000))
  })

  it("grava no campo certo do funil conforme a categoria", () => {
    setCC({ categoria_terreno: "fora_condominio", tipo_pessoa: "PJ", vgv: 3_000_000 })
    render(<Step2ValorObra onNext={() => {}} />)
    fireEvent.input(screen.getByLabelText("VGV estimado"), { target: { value: "8000000" } })
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))

    const cc = useFunnelStore.getState().creditoConstrucao
    expect(cc.vgv).toBe(8_000_000)
    expect(cc.valor_obra).toBe(1_000_000) // inalterado
  })
})

describe("Construção Step 3 — teto e prazos por categoria", () => {
  it("condomínio: teto de 80% da obra e prazos até 30 anos", () => {
    setCC({ categoria_terreno: "condominio", tipo_pessoa: "PF", valor_obra: 1_000_000, vgv: 3_000_000 })
    const { container } = render(<Step3ValorDesejado onNext={() => {}} />)

    expect(container.textContent).toContain(`até ${formatarMoeda(800_000)}`)
    expect(container.textContent).toContain("80% do custo da obra")
    expect(screen.getByText("30a")).toBeTruthy()
    expect(container.textContent).toContain("máximo de 30 anos")
  })

  it("fora de condomínio: teto de 50% do VGV e nenhum prazo acima de 20 anos", () => {
    setCC({ categoria_terreno: "fora_condominio", tipo_pessoa: "PJ", valor_obra: 1_000_000, vgv: 3_000_000 })
    const { container } = render(<Step3ValorDesejado onNext={() => {}} />)

    expect(container.textContent).toContain(`até ${formatarMoeda(1_500_000)}`)
    expect(container.textContent).toContain("50% do VGV")
    expect(screen.queryByText("30a")).toBeNull()
    expect(screen.queryByText("25a")).toBeNull()
    expect(container.textContent).toContain("máximo de 20 anos")
  })

  it("descreve as tranches sem citar Habite-se nem valor por tranche", () => {
    setCC({ categoria_terreno: "condominio", tipo_pessoa: "PF", valor_obra: 1_000_000 })
    const { container } = render(<Step3ValorDesejado onNext={() => {}} />)
    const texto = container.textContent ?? ""
    expect(texto).toContain(
      "O crédito será liberado em 5 tranches conforme o avanço físico da obra."
    )
    expect(texto).not.toContain("Habite-se")
    expect(texto).not.toContain("Cada tranche")
  })

  it("o piso de crédito é R$ 100.000 nas duas categorias e nos dois tomadores", () => {
    for (const cenario of [
      { categoria_terreno: "condominio", tipo_pessoa: "PF", valor_obra: 1_000_000 },
      { categoria_terreno: "fora_condominio", tipo_pessoa: "PJ", vgv: 3_000_000 },
      { categoria_terreno: "fora_condominio", tipo_pessoa: "PF", vgv: 3_000_000 },
    ]) {
      setCC(cenario)
      const { container } = render(<Step3ValorDesejado onNext={() => {}} />)
      const regua = container.querySelector('input[type="range"]') as HTMLInputElement
      expect(Number(regua.min)).toBe(100_000)
      expect(container.textContent).toContain(formatarMoeda(100_000))
      cleanup()
    }
  })

  it("o valor gravado nunca ultrapassa o teto da categoria", () => {
    setCC({
      categoria_terreno: "condominio",
      tipo_pessoa: "PF",
      valor_obra: 1_000_000,
      valor_solicitado: 2_000_000, // acima do teto de 800.000
    })
    render(<Step3ValorDesejado onNext={() => {}} />)
    fireEvent.click(screen.getByRole("button", { name: "Ver simulação" }))
    expect(useFunnelStore.getState().creditoConstrucao.valor_solicitado).toBe(800_000)
  })
})

describe("Construção Step 5 — taxa da categoria, tabelas e PDF", () => {
  const cenarioCondominio = {
    categoria_terreno: "condominio",
    tipo_pessoa: "PF",
    valor_terreno: 500_000,
    valor_obra: 1_000_000,
    vgv: 3_000_000,
    valor_solicitado: 800_000,
    prazo_meses: 360,
  }

  it("condomínio: mostra 13,99% a.a. + TR com o equivalente mensal", () => {
    setCC(cenarioCondominio)
    const { container } = render(<Step5Resultado onNext={() => {}} />)
    expect(container.textContent).toContain("13,99% a.a. + TR")
    expect(container.textContent).toContain("1,10% ao mês")
  })

  it("fora de condomínio: mostra 15% a.a. + IPCA com o equivalente mensal", () => {
    setCC({ ...cenarioCondominio, categoria_terreno: "fora_condominio", tipo_pessoa: "PJ", prazo_meses: 240 })
    const { container } = render(<Step5Resultado onNext={() => {}} />)
    expect(container.textContent).toContain("15,00% a.a. + IPCA")
    expect(container.textContent).toContain("1,17% ao mês")
  })

  it("a parcela usa a taxa mensal equivalente da categoria", () => {
    setCC(cenarioCondominio)
    render(<Step5Resultado onNext={() => {}} />)
    const esperado = calcularSimulacao(800_000, taxaMensalConstrucao("condominio"), 360)
    expect(screen.getAllByText(brl(esperado.parcela_price)).length).toBeGreaterThan(0)
  })

  it("renderiza a tabela de amortização com todas as 360 parcelas", () => {
    setCC(cenarioCondominio)
    render(<Step5Resultado onNext={() => {}} />)
    expect(screen.getByText("360 parcelas")).toBeTruthy()
    const tabela = screen.getByRole("table")
    expect(within(tabela).getAllByRole("row")).toHaveLength(361)
  })

  it("baixa o PDF com a categoria, o tomador e as tabelas", async () => {
    setCC(cenarioCondominio)
    render(<Step5Resultado onNext={() => {}} />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Baixar PDF/i }))
    })

    expect(gerarPdfSpy).toHaveBeenCalledTimes(1)
    const [, dados] = gerarPdfSpy.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(dados).toMatchObject({
      categoria: "condominio",
      tomador: "PF",
      valorCredito: 800_000,
      prazoMeses: 360,
    })
    const tabelas = dados.tabelas as { sac: unknown[]; price: unknown[] }
    expect(tabelas.sac).toHaveLength(360)
    expect(tabelas.price).toHaveLength(360)
  })

  it("não há mais seletor manual de TR/IPCA na tela", () => {
    setCC(cenarioCondominio)
    render(<Step5Resultado onNext={() => {}} />)
    expect(screen.queryByText("Correção da taxa")).toBeNull()
  })
})
