// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Step1VeiculoInfo } from "@/components/funnel/steps/auto-equity/Step1VeiculoInfo"
import { useFunnelStore } from "@/stores/funnel-store"

/**
 * Veículo fora dos critérios não avança do Step 1: a operação não trabalha
 * esses leads, então a jornada termina antes do formulário de contato.
 */
const anoAtual = new Date().getFullYear()

// Veículo devolvido pela consulta de placa — cada teste ajusta ano/valor.
const veiculoConsultado = { ano: anoAtual - 5, valor_fipe: 80_000 }

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
        combustivel: "Flex",
        potencia: "",
        valor_fipe: veiculoConsultado.valor_fipe,
        codigo_fipe: "001234-5",
      },
    })),
  }
})

async function consultarVeiculo({
  idadeAnos,
  categoria = "leve",
  valorFipe = 80_000,
}: {
  idadeAnos: number
  categoria?: "leve" | "pesado"
  valorFipe?: number
}) {
  veiculoConsultado.ano = anoAtual - idadeAnos
  veiculoConsultado.valor_fipe = valorFipe

  render(<Step1VeiculoInfo onNext={() => {}} />)
  if (categoria === "pesado") fireEvent.click(screen.getByText("Pesado"))
  fireEvent.click(screen.getByText("Sim, tenho a placa"))
  fireEvent.change(screen.getByPlaceholderText("ABC1D23"), {
    target: { value: "ABC1D23" },
  })
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Buscar veículo/ }))
  })
}

beforeEach(() => {
  act(() => useFunnelStore.getState().resetAutoEquity())
})

afterEach(cleanup)

describe("Auto Equity Step 1 — veículo inelegível não avança", () => {
  it("permite continuar com veículo leve de 19 anos", async () => {
    await consultarVeiculo({ idadeAnos: 19 })
    expect(screen.getByRole("button", { name: "Continuar" })).toBeTruthy()
    expect(screen.queryByText(/não é aceito como garantia/)).toBeNull()
  })

  it("bloqueia veículo leve de 21 anos", async () => {
    await consultarVeiculo({ idadeAnos: 21 })
    expect(screen.getByText(/não é aceito como garantia/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Continuar" })).toBeNull()
  })

  it("permite continuar com veículo pesado de 14 anos", async () => {
    await consultarVeiculo({ idadeAnos: 14, categoria: "pesado" })
    expect(screen.getByRole("button", { name: "Continuar" })).toBeTruthy()
  })

  it("bloqueia veículo pesado de 16 anos", async () => {
    await consultarVeiculo({ idadeAnos: 16, categoria: "pesado" })
    expect(screen.getByText(/não é aceito como garantia/)).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Continuar" })).toBeNull()
  })

  it("bloqueia o mesmo ano quando a categoria é pesado", async () => {
    await consultarVeiculo({ idadeAnos: 19, categoria: "pesado" })
    expect(screen.queryByRole("button", { name: "Continuar" })).toBeNull()
  })

  it("aceita veículo de FIPE baixa — não existe mais piso de valor", async () => {
    await consultarVeiculo({ idadeAnos: 3, valorFipe: 20_000 })
    expect(screen.getByRole("button", { name: "Continuar" })).toBeTruthy()
    expect(screen.queryByText(/não é aceito como garantia/)).toBeNull()
  })

  it("aceita veículo de FIPE alta — não existe mais teto de valor", async () => {
    await consultarVeiculo({ idadeAnos: 3, valorFipe: 3_000_000 })
    expect(screen.getByRole("button", { name: "Continuar" })).toBeTruthy()
    expect(screen.queryByText(/não é aceito como garantia/)).toBeNull()
  })
})
