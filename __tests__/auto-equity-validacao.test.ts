import { describe, it, expect } from "vitest"
import { qualificarAutoEquity, qualificarVeiculoAutoEquity } from "@/lib/qualificacao"
import { CONFIG, anoMinimoVeiculo, idadeMaximaVeiculo } from "@/lib/config"
import type { CategoriaVeiculo } from "@/types"

/**
 * Regra de idade do Auto Equity (2026-08) — ÚNICA trava de elegibilidade do bem:
 *   veículo leve   → até 20 anos de fabricação
 *   veículo pesado → até 15 anos de fabricação
 * Acima do limite a simulação é descartada (qualificado = false → /nao-qualificado).
 * Não há mais piso (R$ 30.000) nem teto (R$ 500.000) de valor do veículo.
 */
const anoAtual = new Date().getFullYear()

/** Veículo que passa em todos os demais critérios (LTV e situação). */
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

  it("barra o veículo já no Step 1 (qualificarVeiculoAutoEquity)", () => {
    expect(
      qualificarVeiculoAutoEquity({
        ano_veiculo: anoAtual - 19,
        categoria_veiculo: "leve",
      }).qualificado
    ).toBe(true)
    expect(
      qualificarVeiculoAutoEquity({
        ano_veiculo: anoAtual - 21,
        categoria_veiculo: "leve",
      }).qualificado
    ).toBe(false)
    expect(
      qualificarVeiculoAutoEquity({
        ano_veiculo: anoAtual - 14,
        categoria_veiculo: "pesado",
      }).qualificado
    ).toBe(true)
    expect(
      qualificarVeiculoAutoEquity({
        ano_veiculo: anoAtual - 16,
        categoria_veiculo: "pesado",
      }).qualificado
    ).toBe(false)
  })

  it("não há mais piso nem teto de valor do veículo", () => {
    expect("valorVeiculoMinimo" in CONFIG.autoEquity).toBe(false)
    expect("valorVeiculoMaximo" in CONFIG.autoEquity).toBe(false)

    // FIPE muito baixa e muito alta passam, desde que a idade esteja em dia.
    for (const valor_veiculo of [5_000, 20_000, 3_000_000]) {
      const r = qualificarAutoEquity({
        valor_veiculo,
        valor_solicitado: Math.floor(valor_veiculo * 0.8),
        situacao: "quitado",
        ano_veiculo: anoAtual - 3,
        categoria_veiculo: "leve",
      })
      expect(r.qualificado, `reprovou FIPE de ${valor_veiculo}`).toBe(true)
    }
  })

  it("barra veículo sem ano de fabricação identificado", () => {
    const { qualificado, motivos } = qualificarVeiculoAutoEquity({ ano_veiculo: 0 })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("Ano de fabricação"))).toBe(true)
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
