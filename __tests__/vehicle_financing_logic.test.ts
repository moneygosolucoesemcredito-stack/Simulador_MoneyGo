import { describe, it, expect } from "vitest"
import {
  CONFIG,
  anoMinimoVeiculoFinanciamento,
  idadeMaximaVeiculo,
  idadeMaximaVeiculoFinanciamento,
} from "@/lib/config"
import {
  BEM_NAO_ELEGIVEL_FINANCIAMENTO,
  qualificarFinanciamentoVeiculo,
  qualificarVeiculoFinanciamento,
} from "@/lib/qualificacao"
import { calcularFinanciamentoVeiculo } from "@/lib/simulacao"

/**
 * Financiamento de Veículo (2026-08):
 *  - o cliente informa o VALOR A FINANCIAR (antes informava a entrada);
 *  - esse valor não pode ultrapassar 80% do valor do veículo;
 *  - não há piso nem teto de valor do bem ou do crédito;
 *  - a idade do veículo é a única trava de elegibilidade do bem e usa os
 *    MESMOS limites do Auto Equity: leve 20 anos, pesado 15 anos.
 */

const cfg = CONFIG.financiamentoVeiculo
const anoAtual = new Date().getFullYear()

const base = {
  valor_veiculo: 100_000,
  valor_solicitado: 80_000, // exatamente 80%
  prazo_meses: 48,
}

// ──────────────────────────────────────────────────────────────────────────
// FASE 2.1 — trava de LTV (80%)
// ──────────────────────────────────────────────────────────────────────────

describe("LTV — valor a financiar limitado a 80% do veículo", () => {
  it("a configuração do produto passa a ser 80%", () => {
    expect(cfg.ltv).toBeCloseTo(0.8, 6)
  })

  it("aceita exatamente 80% do valor do bem", () => {
    const { qualificado, motivos } = qualificarFinanciamentoVeiculo(base)
    expect(qualificado).toBe(true)
    expect(motivos).toHaveLength(0)
  })

  it("reprova financiamento acima de 80% do valor do bem", () => {
    const { qualificado, motivos } = qualificarFinanciamentoVeiculo({
      ...base,
      valor_solicitado: 80_000.01,
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("80%"))).toBe(true)
  })

  it("reprova o financiamento de 100% do bem (permitido na regra antiga)", () => {
    const { qualificado, motivos } = qualificarFinanciamentoVeiculo({
      ...base,
      valor_solicitado: 100_000,
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("80%"))).toBe(true)
  })

  it("reprova 90% do bem e aprova 79%", () => {
    expect(
      qualificarFinanciamentoVeiculo({ ...base, valor_solicitado: 90_000 }).qualificado
    ).toBe(false)
    expect(
      qualificarFinanciamentoVeiculo({ ...base, valor_solicitado: 79_000 }).qualificado
    ).toBe(true)
  })

  it("veículo ou valor zerados continuam reprovando", () => {
    expect(
      qualificarFinanciamentoVeiculo({ ...base, valor_veiculo: 0, valor_solicitado: 0 }).qualificado
    ).toBe(false)
  })

  it("o prazo máximo de 60 meses segue valendo", () => {
    expect(qualificarFinanciamentoVeiculo({ ...base, prazo_meses: 60 }).qualificado).toBe(true)
    const acima = qualificarFinanciamentoVeiculo({ ...base, prazo_meses: 72 })
    expect(acima.qualificado).toBe(false)
    expect(acima.motivos.some((m) => m.includes("60"))).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// FASE 2.2 — elegibilidade por idade, igual à do Auto Equity
// (leve 20 anos, pesado 15 anos), aplicada às DUAS categorias
// ──────────────────────────────────────────────────────────────────────────

describe("Elegibilidade — idade máxima do bem, leve 20 e pesado 15", () => {
  it("os limites são os mesmos do Auto Equity e valem para as duas categorias", () => {
    expect(cfg.idadeVeiculoMaximaLeve).toBe(20)
    expect(cfg.idadeVeiculoMaximaPesado).toBe(15)
    expect(idadeMaximaVeiculoFinanciamento("leve")).toBe(idadeMaximaVeiculo("leve"))
    expect(idadeMaximaVeiculoFinanciamento("pesado")).toBe(idadeMaximaVeiculo("pesado"))
    expect(anoMinimoVeiculoFinanciamento("leve", 2026)).toBe(2006)
    expect(anoMinimoVeiculoFinanciamento("pesado", 2026)).toBe(2011)
  })

  it("a regra antiga (pesado 5 anos, leve sem trava) não vale mais", () => {
    expect(idadeMaximaVeiculoFinanciamento("pesado")).not.toBe(5)
    expect(Number.isFinite(idadeMaximaVeiculoFinanciamento("leve"))).toBe(true)
    // Pesado de 6 anos era barrado; agora passa.
    expect(
      qualificarVeiculoFinanciamento({ ano_veiculo: anoAtual - 6, categoria_veiculo: "pesado" })
        .qualificado
    ).toBe(true)
  })

  it("pesado com 14 anos passa e com 16 falha", () => {
    const dentro = qualificarVeiculoFinanciamento({
      ano_veiculo: anoAtual - 14,
      categoria_veiculo: "pesado",
    })
    expect(dentro.qualificado).toBe(true)
    expect(dentro.motivos).toHaveLength(0)

    const fora = qualificarVeiculoFinanciamento({
      ano_veiculo: anoAtual - 16,
      categoria_veiculo: "pesado",
    })
    expect(fora.qualificado).toBe(false)
    expect(fora.motivos.some((m) => m.includes(BEM_NAO_ELEGIVEL_FINANCIAMENTO))).toBe(true)
    expect(fora.motivos.some((m) => m.includes("15 anos"))).toBe(true)
  })

  it("pesado com exatamente 15 anos passa (limite inclusivo)", () => {
    expect(
      qualificarVeiculoFinanciamento({ ano_veiculo: anoAtual - 15, categoria_veiculo: "pesado" })
        .qualificado
    ).toBe(true)
  })

  it("leve com 20 anos passa e com 21 falha", () => {
    expect(
      qualificarVeiculoFinanciamento({ ano_veiculo: anoAtual - 20, categoria_veiculo: "leve" })
        .qualificado
    ).toBe(true)
    const fora = qualificarVeiculoFinanciamento({
      ano_veiculo: anoAtual - 21,
      categoria_veiculo: "leve",
    })
    expect(fora.qualificado).toBe(false)
    expect(fora.motivos.some((m) => m.includes("20 anos"))).toBe(true)
    // Sem categoria informada assume leve.
    expect(qualificarVeiculoFinanciamento({ ano_veiculo: anoAtual - 21 }).qualificado).toBe(false)
  })

  it("veículo sem ano identificado falha em qualquer categoria", () => {
    for (const categoria of ["leve", "pesado"] as const) {
      const r = qualificarVeiculoFinanciamento({ ano_veiculo: 0, categoria_veiculo: categoria })
      expect(r.qualificado).toBe(false)
      expect(r.motivos.some((m) => m.includes(BEM_NAO_ELEGIVEL_FINANCIAMENTO))).toBe(true)
    }
  })

  it("a qualificação final também barra o bem fora da idade", () => {
    const r = qualificarFinanciamentoVeiculo({
      ...base,
      categoria_veiculo: "pesado",
      ano_veiculo: anoAtual - 16,
    })
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => m.includes(BEM_NAO_ELEGIVEL_FINANCIAMENTO))).toBe(true)
  })

  it("pesado de 14 anos dentro do LTV qualifica na ponta a ponta", () => {
    const r = qualificarFinanciamentoVeiculo({
      valor_veiculo: 400_000,
      valor_solicitado: 320_000, // 80%
      prazo_meses: 48,
      categoria_veiculo: "pesado",
      ano_veiculo: anoAtual - 14,
    })
    expect(r.qualificado).toBe(true)
  })

  it("pesado de 16 anos acima do LTV acumula os dois motivos", () => {
    const r = qualificarFinanciamentoVeiculo({
      valor_veiculo: 400_000,
      valor_solicitado: 380_000, // 95%
      prazo_meses: 48,
      categoria_veiculo: "pesado",
      ano_veiculo: anoAtual - 16,
    })
    expect(r.qualificado).toBe(false)
    expect(r.motivos).toHaveLength(2)
  })

  it("sem ano informado a qualificação não aplica a trava de idade", () => {
    const r = qualificarFinanciamentoVeiculo({ ...base, categoria_veiculo: "pesado" })
    expect(r.qualificado).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// Sem piso nem teto de valor
// ──────────────────────────────────────────────────────────────────────────

describe("Valor do bem e do crédito — sem piso nem teto", () => {
  it("o mínimo financiável de R$ 5.000 deixou de existir na configuração", () => {
    expect("valorFinanciadoMinimo" in cfg).toBe(false)
  })

  it("valores baixos e altos qualificam, desde que dentro do LTV", () => {
    for (const valor_veiculo of [4_000, 12_000, 5_000_000]) {
      const r = qualificarFinanciamentoVeiculo({
        valor_veiculo,
        valor_solicitado: Math.floor(valor_veiculo * 0.8),
        prazo_meses: 48,
      })
      expect(r.qualificado, `reprovou veículo de ${valor_veiculo}`).toBe(true)
    }
  })
})

// ──────────────────────────────────────────────────────────────────────────
// Cálculo sobre o valor informado pelo cliente
// ──────────────────────────────────────────────────────────────────────────

describe("Parcela sobre o valor a financiar", () => {
  it("a parcela é calculada sobre o montante informado, não sobre o bem", () => {
    const r = calcularFinanciamentoVeiculo({
      valorCredito: 80_000,
      taxaMensal: cfg.taxaMensal,
      prazoMeses: 48,
    })
    expect(r.parcela).toBeCloseTo(2_295.18, 2)
  })

  it("80% de um bem de 100 mil gera parcela menor que 100% do mesmo bem", () => {
    const oitenta = calcularFinanciamentoVeiculo({
      valorCredito: 80_000,
      taxaMensal: cfg.taxaMensal,
      prazoMeses: 48,
    })
    const cem = calcularFinanciamentoVeiculo({
      valorCredito: 100_000,
      taxaMensal: cfg.taxaMensal,
      prazoMeses: 48,
    })
    expect(oitenta.parcela).toBeLessThan(cem.parcela)
  })
})
