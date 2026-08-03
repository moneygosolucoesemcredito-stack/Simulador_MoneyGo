import { describe, it, expect } from "vitest"
import { qualificarAutoEquity } from "@/lib/qualificacao"
import { anoMinimoVeiculo, idadeMaximaVeiculo } from "@/lib/config"
import type { CategoriaVeiculo } from "@/types"

/**
 * Regra de idade do Auto Equity (2026-08):
 *   veículo leve   → até 20 anos de fabricação
 *   veículo pesado → até 15 anos de fabricação
 * Acima do limite a simulação é descartada (qualificado = false → /nao-qualificado).
 */
const anoAtual = new Date().getFullYear()

/** Veículo que passa em todos os demais critérios (valor, LTV e situação). */
const veiculoBase = {
  valor_veiculo: 80_000,
  valor_solicitado: 30_000,
  situacao: "quitado" as const,
}

function qualificarPorIdade(idadeAnos: number, categoria: CategoriaVeiculo) {
  return qualificarAutoEquity({
    ...veiculoBase,
    ano_veiculo: anoAtual - idadeAnos,
    categoria_veiculo: categoria,
  })
}

describe("Auto Equity — idade máxima do veículo leve (20 anos)", () => {
  it("aceita veículo leve com 19 anos", () => {
    const { qualificado, motivos } = qualificarPorIdade(19, "leve")
    expect(qualificado).toBe(true)
    expect(motivos).toEqual([])
  })

  it("aceita veículo leve exatamente no limite de 20 anos", () => {
    const { qualificado } = qualificarPorIdade(20, "leve")
    expect(qualificado).toBe(true)
  })

  it("descarta veículo leve com 21 anos", () => {
    const { qualificado, motivos } = qualificarPorIdade(21, "leve")
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("20 anos"))).toBe(true)
  })
})

describe("Auto Equity — idade máxima do veículo pesado (15 anos)", () => {
  it("aceita veículo pesado com 14 anos", () => {
    const { qualificado, motivos } = qualificarPorIdade(14, "pesado")
    expect(qualificado).toBe(true)
    expect(motivos).toEqual([])
  })

  it("aceita veículo pesado exatamente no limite de 15 anos", () => {
    const { qualificado } = qualificarPorIdade(15, "pesado")
    expect(qualificado).toBe(true)
  })

  it("descarta veículo pesado com 16 anos", () => {
    const { qualificado, motivos } = qualificarPorIdade(16, "pesado")
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("15 anos"))).toBe(true)
  })

  it("descarta veículo pesado com 19 anos (idade aceita apenas para leves)", () => {
    const { qualificado } = qualificarPorIdade(19, "pesado")
    expect(qualificado).toBe(false)
  })
})

describe("Auto Equity — categoria padrão e limites configurados", () => {
  it("trata veículo sem categoria informada como leve", () => {
    const semCategoria = qualificarAutoEquity({
      ...veiculoBase,
      ano_veiculo: anoAtual - 19,
    })
    expect(semCategoria.qualificado).toBe(true)

    const acimaDoLimiteLeve = qualificarAutoEquity({
      ...veiculoBase,
      ano_veiculo: anoAtual - 21,
    })
    expect(acimaDoLimiteLeve.qualificado).toBe(false)
  })

  it("expõe os limites 20 (leve) e 15 (pesado)", () => {
    expect(idadeMaximaVeiculo("leve")).toBe(20)
    expect(idadeMaximaVeiculo("pesado")).toBe(15)
    expect(idadeMaximaVeiculo()).toBe(20)
  })

  it("calcula o ano mínimo de fabricação por categoria", () => {
    expect(anoMinimoVeiculo("leve", 2026)).toBe(2006)
    expect(anoMinimoVeiculo("pesado", 2026)).toBe(2011)
  })

  it("mantém as demais travas independentes da categoria", () => {
    const financiado = qualificarAutoEquity({
      ...veiculoBase,
      situacao: "financiado",
      ano_veiculo: anoAtual - 5,
      categoria_veiculo: "pesado",
    })
    expect(financiado.qualificado).toBe(false)
    expect(financiado.motivos.some((m) => m.includes("financiado"))).toBe(true)

    const acimaDoLtv = qualificarAutoEquity({
      ...veiculoBase,
      valor_solicitado: 70_000, // > 80% de R$ 80.000
      ano_veiculo: anoAtual - 5,
      categoria_veiculo: "pesado",
    })
    expect(acimaDoLtv.qualificado).toBe(false)
  })
})
