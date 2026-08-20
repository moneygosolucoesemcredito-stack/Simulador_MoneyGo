// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Step4ValorDesejado } from "@/components/funnel/steps/auto-equity/Step4ValorDesejado"
import { Step5Resultado } from "@/components/funnel/steps/auto-equity/Step5Resultado"
import { useFunnelStore } from "@/stores/funnel-store"
import { CONFIG } from "@/lib/config"

/**
 * Auto Equity (2026-08): NENHUMA trava de valor. Caíram, nesta ordem, o piso de
 * R$ 30.000 e o teto de R$ 500.000 do veículo, o piso de R$ 5.000 do crédito e
 * o LTV de 80% da FIPE. A única trava do produto é a idade do veículo, coberta
 * em auto-equity-validacao.test.ts e auto-equity-step1-bloqueio.test.tsx.
 */

function setAE(patch: Record<string, unknown>) {
  act(() => {
    useFunnelStore.setState((s) => ({ autoEquity: { ...s.autoEquity, ...patch } }))
  })
}

beforeEach(() => {
  act(() => useFunnelStore.getState().resetAutoEquity())
})

afterEach(cleanup)

describe("AE Step 4 — pedir crédito sem teto", () => {
  beforeEach(() => setAE({ valor_veiculo: 80_000, ano_veiculo: new Date().getFullYear() - 5 }))

  it("não anuncia mais um valor máximo", () => {
    const { container } = render(<Step4ValorDesejado onNext={() => {}} />)
    const texto = container.textContent ?? ""
    expect(texto).toContain("não há valor mínimo nem máximo")
    expect(texto).not.toContain("Você pode solicitar até")
  })

  it("aceita crédito acima de 80% da FIPE (o antigo teto)", () => {
    render(<Step4ValorDesejado onNext={() => {}} />)
    fireEvent.input(screen.getByLabelText("Valor do crédito"), { target: { value: "70000" } })
    fireEvent.click(screen.getByText("Pessoa Física"))
    fireEvent.click(screen.getByRole("button", { name: "Ver simulação" }))

    expect(useFunnelStore.getState().autoEquity.valor_solicitado).toBe(70_000)
  })

  it("aceita crédito acima do próprio valor do veículo", () => {
    render(<Step4ValorDesejado onNext={() => {}} />)
    fireEvent.input(screen.getByLabelText("Valor do crédito"), { target: { value: "250000" } })
    fireEvent.click(screen.getByText("Pessoa Física"))
    fireEvent.click(screen.getByRole("button", { name: "Ver simulação" }))

    expect(useFunnelStore.getState().autoEquity.valor_solicitado).toBe(250_000)
  })

  it("aceita crédito bem abaixo do antigo piso de R$ 5.000", () => {
    render(<Step4ValorDesejado onNext={() => {}} />)
    fireEvent.input(screen.getByLabelText("Valor do crédito"), { target: { value: "800" } })
    fireEvent.click(screen.getByText("Pessoa Física"))
    fireEvent.click(screen.getByRole("button", { name: "Ver simulação" }))

    expect(useFunnelStore.getState().autoEquity.valor_solicitado).toBe(800)
  })

  it("a régua começa em zero e acompanha o valor digitado", () => {
    const { container } = render(<Step4ValorDesejado onNext={() => {}} />)
    const regua = () => container.querySelector('input[type="range"]') as HTMLInputElement

    expect(Number(regua().min)).toBe(0)
    // Sem nada digitado a escala é o valor do veículo, não 80% dele.
    expect(Number(regua().max)).toBe(80_000)

    fireEvent.input(screen.getByLabelText("Valor do crédito"), { target: { value: "250000" } })
    expect(Number(regua().max)).toBeGreaterThanOrEqual(250_000)
  })

  it("só bloqueia o avanço com crédito zerado ou sem tomador", () => {
    render(<Step4ValorDesejado onNext={() => {}} />)
    const botao = () => screen.getByRole("button", { name: "Ver simulação" }) as HTMLButtonElement

    expect(botao().disabled).toBe(true) // sem tomador
    fireEvent.click(screen.getByText("Pessoa Física"))
    expect(botao().disabled).toBe(false)

    fireEvent.input(screen.getByLabelText("Valor do crédito"), { target: { value: "0" } })
    expect(botao().disabled).toBe(true)
  })
})

describe("AE Step 5 — a régua do resultado não trava mais", () => {
  it("não impõe piso de R$ 5.000 nem teto de 80% da FIPE", () => {
    setAE({
      valor_veiculo: 80_000,
      valor_solicitado: 70_000, // acima do antigo teto de R$ 64.000
      prazo_meses: 36,
      tipo_pessoa: "PF",
    })
    const { container } = render(<Step5Resultado onNext={() => {}} />)
    const regua = container.querySelector('input[type="range"]') as HTMLInputElement

    expect(Number(regua.min)).toBe(0)
    expect(Number(regua.max)).toBeGreaterThanOrEqual(70_000)
    // O valor escolhido chega intacto, sem ser limado para 64.000.
    expect(Number(regua.value)).toBe(70_000)
  })

  it("mantém o valor mesmo acima do próprio bem", () => {
    setAE({
      valor_veiculo: 80_000,
      valor_solicitado: 300_000,
      prazo_meses: 36,
      tipo_pessoa: "PF",
    })
    const { container } = render(<Step5Resultado onNext={() => {}} />)
    const regua = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(Number(regua.value)).toBe(300_000)
  })
})

describe("A configuração não guarda mais nenhuma trava de valor", () => {
  it("autoEquity não tem ltv, piso nem teto de valor", () => {
    for (const chave of ["ltv", "valorVeiculoMinimo", "valorVeiculoMaximo"]) {
      expect(chave in CONFIG.autoEquity, `${chave} ainda existe`).toBe(false)
    }
  })

  it("a idade máxima segue configurada — é a trava que resta", () => {
    expect(CONFIG.autoEquity.idadeVeiculoMaximaLeve).toBe(20)
    expect(CONFIG.autoEquity.idadeVeiculoMaximaPesado).toBe(15)
  })
})
