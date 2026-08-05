// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Step1Veiculo } from "@/components/funnel/steps/financiamento-veiculo/Step1Veiculo"
import { Step2ValorFinanciar } from "@/components/funnel/steps/financiamento-veiculo/Step2ValorFinanciar"
import { Step3Resultado } from "@/components/funnel/steps/financiamento-veiculo/Step3Resultado"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularFinanciamentoVeiculo, formatarMoeda } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"

const anoAtual = new Date().getFullYear()

// Veículo devolvido pela consulta de placa — cada teste ajusta ano/valor.
const veiculoConsultado = { ano: anoAtual - 2, valor_fipe: 100_000 }

vi.mock("@/lib/placa", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/placa")>()
  return {
    ...original,
    consultarPlaca: vi.fn(async () => ({
      ok: true as const,
      veiculo: {
        marca: "Marca",
        modelo: "Modelo",
        marca_modelo_ano: `Marca Modelo ${veiculoConsultado.ano}`,
        ano: veiculoConsultado.ano,
        combustivel: "Diesel",
        potencia: "",
        valor_fipe: veiculoConsultado.valor_fipe,
        codigo_fipe: "001234-5",
      },
    })),
  }
})


function setFV(patch: Record<string, unknown>) {
  act(() => {
    useFunnelStore.setState((s) => ({
      financiamentoVeiculo: { ...s.financiamentoVeiculo, ...patch },
    }))
  })
}

async function consultarVeiculo({
  idadeAnos,
  categoria = "leve",
  valorFipe = 100_000,
}: {
  idadeAnos: number
  categoria?: "leve" | "pesado"
  valorFipe?: number
}) {
  veiculoConsultado.ano = anoAtual - idadeAnos
  veiculoConsultado.valor_fipe = valorFipe

  render(<Step1Veiculo onNext={() => {}} />)
  if (categoria === "pesado") fireEvent.click(screen.getByText("Pesado"))
  fireEvent.click(screen.getByText("Sim, tenho a placa"))
  fireEvent.change(screen.getByPlaceholderText("ABC1D23"), { target: { value: "ABC1D23" } })
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Buscar veículo/ }))
  })
}

beforeEach(() => {
  act(() => useFunnelStore.getState().resetFinanciamentoVeiculo())
})

afterEach(cleanup)

describe("FV Step 1 — elegibilidade do bem", () => {
  it("veículo pesado com 4 anos é aceito", async () => {
    await consultarVeiculo({ idadeAnos: 4, categoria: "pesado" })
    expect(screen.getByRole("button", { name: "Continuar" })).toBeTruthy()
    expect(screen.queryByText(/não elegível/i)).toBeNull()
  })

  it("veículo pesado com 6 anos mostra 'Bem não elegível para esta modalidade'", async () => {
    await consultarVeiculo({ idadeAnos: 6, categoria: "pesado" })
    expect(screen.getByText("Bem não elegível para esta modalidade.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Continuar" })).toBeNull()
  })

  it("veículo leve com 12 anos continua aceito", async () => {
    await consultarVeiculo({ idadeAnos: 12, categoria: "leve" })
    expect(screen.getByRole("button", { name: "Continuar" })).toBeTruthy()
  })

  it("grava a categoria escolhida no funil", async () => {
    await consultarVeiculo({ idadeAnos: 2, categoria: "pesado" })
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }))
    expect(useFunnelStore.getState().financiamentoVeiculo.categoria_veiculo).toBe("pesado")
  })
})

describe("FV Step 2 — valor a financiar", () => {
  beforeEach(() => setFV({ valor_veiculo: 100_000, marca_modelo_ano: "Marca Modelo" }))

  it('o campo se chama "Valor a financiar" e não existe mais "Valor da entrada"', () => {
    render(<Step2ValorFinanciar onNext={() => {}} />)
    expect(screen.getByLabelText("Valor a financiar")).toBeTruthy()
    expect(screen.queryByLabelText("Valor da entrada")).toBeNull()
  })

  it('nenhum texto do passo diz que "a entrada é opcional"', () => {
    const { container } = render(<Step2ValorFinanciar onNext={() => {}} />)
    const texto = (container.textContent ?? "").toLowerCase()
    expect(texto).not.toContain("entrada é opcional")
    expect(texto).not.toContain("sem entrada")
    expect(texto).not.toContain("100% do valor do veículo")
    expect(texto).toContain("80% do valor do veículo")
  })

  it("o usuário informa o montante a captar e ele vai para o funil", () => {
    render(<Step2ValorFinanciar onNext={() => {}} />)
    fireEvent.input(screen.getByLabelText("Valor a financiar"), { target: { value: "60000" } })
    fireEvent.click(screen.getByRole("button", { name: /Ver simulação/ }))

    const fv = useFunnelStore.getState().financiamentoVeiculo
    expect(fv.valor_financiado).toBe(60_000)
  })

  it("bloqueia valor acima de 80% do veículo", () => {
    render(<Step2ValorFinanciar onNext={() => {}} />)
    fireEvent.input(screen.getByLabelText("Valor a financiar"), { target: { value: "90000" } })

    expect(screen.getByText(/não pode ultrapassar 80%/i)).toBeTruthy()
    expect(
      (screen.getByRole("button", { name: /Ver simulação/ }) as HTMLButtonElement).disabled
    ).toBe(true)

    fireEvent.click(screen.getByRole("button", { name: /Ver simulação/ }))
    expect(useFunnelStore.getState().financiamentoVeiculo.valor_financiado).toBe(0)
  })

  it("aceita exatamente 80% e a régua não passa disso", () => {
    const { container } = render(<Step2ValorFinanciar onNext={() => {}} />)
    const regua = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(Number(regua.max)).toBe(80_000)

    fireEvent.input(screen.getByLabelText("Valor a financiar"), { target: { value: "80000" } })
    fireEvent.click(screen.getByRole("button", { name: /Ver simulação/ }))
    expect(useFunnelStore.getState().financiamentoVeiculo.valor_financiado).toBe(80_000)
  })

  it("mostra os recursos próprios necessários (bem − financiado)", () => {
    const { container } = render(<Step2ValorFinanciar onNext={() => {}} />)
    fireEvent.input(screen.getByLabelText("Valor a financiar"), { target: { value: "60000" } })
    // O texto é quebrado em vários nós — a asserção olha o passo inteiro.
    expect(container.textContent).toContain("Recursos próprios na contratação")
    expect(container.textContent).toContain(formatarMoeda(40_000))
  })

  it("a parcela reflete o valor informado", () => {
    const { container } = render(<Step2ValorFinanciar onNext={() => {}} />)
    fireEvent.input(screen.getByLabelText("Valor a financiar"), { target: { value: "60000" } })
    const esperado = calcularFinanciamentoVeiculo({
      valorCredito: 60_000,
      taxaMensal: CONFIG.financiamentoVeiculo.taxaMensal,
      prazoMeses: 48,
    })
    expect(container.textContent).toContain(formatarMoeda(esperado.parcela))
  })
})

describe("FV Step 3 — resultado", () => {
  it('mostra "Valor a financiar" e "Recursos próprios" no lugar da entrada', () => {
    setFV({
      valor_veiculo: 100_000,
      valor_financiado: 70_000,
      prazo_meses: 48,
      marca_modelo_ano: "Marca Modelo",
    })
    const { container } = render(<Step3Resultado onNext={() => {}} />)

    expect(screen.getByText("Valor a financiar")).toBeTruthy()
    expect(screen.getByText("Recursos próprios")).toBeTruthy()
    expect(screen.queryByText("Entrada")).toBeNull()
    expect(container.textContent).toContain(formatarMoeda(70_000))
    expect(container.textContent).toContain(formatarMoeda(30_000))
  })
})
