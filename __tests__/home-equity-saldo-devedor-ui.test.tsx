// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Step3Situacao } from "@/components/funnel/steps/home-equity/Step3Situacao"
import { Step5ValorDesejado } from "@/components/funnel/steps/home-equity/Step5ValorDesejado"
import { Step6Resultado } from "@/components/funnel/steps/home-equity/Step6Resultado"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularHomeEquity, formatarMoeda } from "@/lib/simulacao"

const gerarPdfSpy = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/pdf-home-equity", () => ({
  gerarPdfHomeEquity: (...args: unknown[]) => gerarPdfSpy(...args),
}))

/** Nascimento que dá 40 anos — prazo livre na trava idade × prazo. */
const NASCIMENTO_40 = `${new Date().getFullYear() - 40}-01-01`

function setHE(patch: Record<string, unknown>) {
  act(() => {
    useFunnelStore.setState((s) => ({ homeEquity: { ...s.homeEquity, ...patch } }))
  })
}

beforeEach(() => {
  gerarPdfSpy.mockClear()
  act(() => useFunnelStore.getState().resetHomeEquity())
})

afterEach(cleanup)

describe("HE Step 3 — teto de saldo devedor em 40%", () => {
  beforeEach(() => setHE({ valor_imovel: 1_000_000 }))

  it("anuncia 40% do imóvel como máximo, não 50%", () => {
    const { container } = render(<Step3Situacao onNext={() => {}} />)
    fireEvent.click(screen.getByText("Financiado"))

    const texto = container.textContent ?? ""
    expect(texto).toContain(`Máximo permitido: ${formatarMoeda(400_000)} (40% do valor do imóvel)`)
    expect(texto).not.toContain("50% do valor do imóvel")
  })

  it("explica que o saldo é quitado e soma ao crédito pedido", () => {
    const { container } = render(<Step3Situacao onNext={() => {}} />)
    fireEvent.click(screen.getByText("Financiado"))
    expect(container.textContent).toContain("quitado dentro da operação e soma ao crédito")
  })

  it("o campo não deixa digitar acima de 40% do imóvel", () => {
    // A máscara do CurrencyInput recebe `max` e recusa os dígitos que fariam o
    // valor passar do teto: a trava dos 40% é aplicada já na digitação.
    render(<Step3Situacao onNext={() => {}} />)
    fireEvent.click(screen.getByText("Financiado"))

    fireEvent.input(screen.getByLabelText("Saldo devedor atual"), { target: { value: "450000" } })
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
    expect(useFunnelStore.getState().homeEquity.saldo_devedor).toBeLessThanOrEqual(400_000)
  })

  it("aceita saldo dentro do teto sem alterar o valor, inclusive no limite", () => {
    render(<Step3Situacao onNext={() => {}} />)
    fireEvent.click(screen.getByText("Financiado"))
    const campo = screen.getByLabelText("Saldo devedor atual")

    fireEvent.input(campo, { target: { value: "250000" } })
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
    expect(useFunnelStore.getState().homeEquity.saldo_devedor).toBe(250_000)

    fireEvent.input(campo, { target: { value: "400000" } })
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
    expect(useFunnelStore.getState().homeEquity.saldo_devedor).toBe(400_000)
  })

  it("o teto do campo acompanha o valor do imóvel", () => {
    setHE({ valor_imovel: 2_000_000 })
    const { container } = render(<Step3Situacao onNext={() => {}} />)
    fireEvent.click(screen.getByText("Financiado"))
    expect(container.textContent).toContain(`Máximo permitido: ${formatarMoeda(800_000)}`)
  })

  it("imóvel quitado zera o saldo devedor gravado", () => {
    setHE({ saldo_devedor: 300_000 })
    render(<Step3Situacao onNext={() => {}} />)
    fireEvent.click(screen.getByText("Quitado"))
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
    expect(useFunnelStore.getState().homeEquity.saldo_devedor).toBe(0)
  })
})

describe("HE Step 5 — o LTV passa a valer sobre o crédito total", () => {
  const imovelFinanciado = {
    valor_imovel: 1_000_000,
    tipo_imovel: "casa",
    situacao: "financiado",
    saldo_devedor: 200_000,
  }

  it("o teto do que dá para pedir cai para (55% − saldo devedor)", () => {
    setHE(imovelFinanciado)
    const { container } = render(<Step5ValorDesejado onNext={() => {}} />)

    const regua = container.querySelector('input[type="range"]') as HTMLInputElement
    // 55% de 1.000.000 = 550.000; menos os 200.000 de saldo → 350.000
    expect(Number(regua.max)).toBe(350_000)
    expect(container.textContent).toContain(formatarMoeda(350_000))
  })

  it("imóvel quitado mantém o teto cheio de 55%", () => {
    setHE({ ...imovelFinanciado, situacao: "quitado", saldo_devedor: 0 })
    const { container } = render(<Step5ValorDesejado onNext={() => {}} />)

    const regua = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(Number(regua.max)).toBe(550_000)
    expect(container.textContent).toContain("55% do valor do imóvel")
  })

  it("mostra a composição: recebe + quitação = crédito total", () => {
    setHE({ ...imovelFinanciado, valor_solicitado: 300_000 })
    const { container } = render(<Step5ValorDesejado onNext={() => {}} />)
    const texto = container.textContent ?? ""

    expect(texto).toContain("Composição do crédito")
    expect(texto).toContain("Você recebe")
    expect(texto).toContain("Quitação do financiamento")
    expect(texto).toContain("Crédito total")
    expect(texto).toContain(formatarMoeda(500_000)) // 300k + 200k
  })

  it("imóvel quitado não mostra a composição", () => {
    setHE({ ...imovelFinanciado, situacao: "quitado", saldo_devedor: 0, valor_solicitado: 300_000 })
    const { container } = render(<Step5ValorDesejado onNext={() => {}} />)
    expect(container.textContent).not.toContain("Composição do crédito")
  })

  it("nunca grava um pedido acima do teto já descontado do saldo", () => {
    setHE({ ...imovelFinanciado, valor_solicitado: 500_000, data_nascimento: NASCIMENTO_40 })
    render(<Step5ValorDesejado onNext={() => {}} />)
    fireEvent.click(screen.getByText("Pessoa Física"))
    fireEvent.click(screen.getByRole("button", { name: "Ver simulação" }))

    expect(useFunnelStore.getState().homeEquity.valor_solicitado).toBe(350_000)
  })

  it("bloqueia quando o saldo devedor esgota o limite da tipologia", () => {
    // Comercial tem LTV de 45% → teto de 450.000; saldo de 400.000 deixa só
    // 50.000, abaixo do crédito mínimo de 75.000.
    setHE({
      valor_imovel: 1_000_000,
      tipo_imovel: "comercial",
      situacao: "financiado",
      saldo_devedor: 400_000,
      data_nascimento: NASCIMENTO_40,
    })
    render(<Step5ValorDesejado onNext={() => {}} />)
    fireEvent.click(screen.getByText("Pessoa Física"))

    expect(screen.getByText(/consome o limite de 45%/i)).toBeTruthy()
    expect(
      (screen.getByRole("button", { name: "Ver simulação" }) as HTMLButtonElement).disabled
    ).toBe(true)
  })
})

describe("HE Step 6 — a parcela sai do crédito total", () => {
  const cenario = {
    valor_imovel: 1_000_000,
    tipo_imovel: "casa",
    situacao: "financiado",
    saldo_devedor: 200_000,
    valor_solicitado: 300_000,
    prazo_meses: 180,
    tipo_pessoa: "PF",
    taxa_mensal: 0.0119,
    modo: "cliente",
  }

  it("calcula sobre 500.000 (300k pedidos + 200k de quitação)", () => {
    setHE(cenario)
    const { container } = render(<Step6Resultado onNext={() => {}} />)

    const esperado = calcularHomeEquity({
      valorCredito: 500_000,
      valorImovel: 1_000_000,
      prazoMeses: 180,
      taxaMensal: 0.0119,
      tipoPessoa: "PF",
    })
    const texto = (container.textContent ?? "").replace(/ /g, " ")
    expect(texto).toContain(formatarMoeda(esperado.price.primeiraParcela).replace(/ /g, " "))
  })

  it("o resumo mostra o crédito total, não só o valor pedido", () => {
    setHE(cenario)
    const { container } = render(<Step6Resultado onNext={() => {}} />)
    const texto = container.textContent ?? ""

    expect(texto).toContain("Crédito total")
    expect(texto).toContain(formatarMoeda(500_000))
    expect(texto).toContain("Composição do crédito")
    expect(texto).toContain("Crédito total (base das parcelas)")
  })

  it("imóvel quitado segue mostrando só o crédito pedido", () => {
    setHE({ ...cenario, situacao: "quitado", saldo_devedor: 0 })
    const { container } = render(<Step6Resultado onNext={() => {}} />)
    const texto = container.textContent ?? ""

    expect(texto).toContain(formatarMoeda(300_000))
    expect(texto).not.toContain("Composição do crédito")
  })

  it("o PDF recebe o crédito total junto da composição", async () => {
    setHE(cenario)
    render(<Step6Resultado onNext={() => {}} />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Baixar PDF/i }))
    })

    expect(gerarPdfSpy).toHaveBeenCalledTimes(1)
    const [, dados] = gerarPdfSpy.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(dados).toMatchObject({
      valorCredito: 500_000,
      valorSolicitado: 300_000,
      saldoDevedor: 200_000,
    })
  })
})
