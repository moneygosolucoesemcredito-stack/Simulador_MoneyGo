import { describe, it, expect } from "vitest"
import {
  CONFIG,
  anoMinimoVeiculoFinanciamento,
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
 *  - veículo PESADO só é aceito com até 5 anos de fabricação.
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
// FASE 2.2 — elegibilidade de veículos pesados (até 5 anos)
// ──────────────────────────────────────────────────────────────────────────

describe("Elegibilidade — veículo pesado com até 5 anos", () => {
  it("a idade máxima do pesado é 5 anos; leve não tem trava", () => {
    expect(cfg.idadeVeiculoMaximaPesado).toBe(5)
    expect(idadeMaximaVeiculoFinanciamento("pesado")).toBe(5)
    expect(idadeMaximaVeiculoFinanciamento("leve")).toBe(Number.POSITIVE_INFINITY)
    expect(anoMinimoVeiculoFinanciamento("pesado", 2026)).toBe(2021)
  })

  it("pesado com 4 anos passa", () => {
    const r = qualificarVeiculoFinanciamento({
      ano_veiculo: anoAtual - 4,
      categoria_veiculo: "pesado",
    })
    expect(r.qualificado).toBe(true)
    expect(r.motivos).toHaveLength(0)
  })

  it("pesado com exatamente 5 anos passa (limite inclusivo)", () => {
    expect(
      qualificarVeiculoFinanciamento({ ano_veiculo: anoAtual - 5, categoria_veiculo: "pesado" })
        .qualificado
    ).toBe(true)
  })

  it("pesado com 6 anos falha com a mensagem de bem não elegível", () => {
    const r = qualificarVeiculoFinanciamento({
      ano_veiculo: anoAtual - 6,
      categoria_veiculo: "pesado",
    })
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => m.includes(BEM_NAO_ELEGIVEL_FINANCIAMENTO))).toBe(true)
    expect(r.motivos.some((m) => m.includes("5 anos"))).toBe(true)
  })

  it("pesado sem ano identificado falha", () => {
    const r = qualificarVeiculoFinanciamento({ ano_veiculo: 0, categoria_veiculo: "pesado" })
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => m.includes(BEM_NAO_ELEGIVEL_FINANCIAMENTO))).toBe(true)
  })

  it("leve com 12 anos continua elegível (a trava é só do pesado)", () => {
    expect(
      qualificarVeiculoFinanciamento({ ano_veiculo: anoAtual - 12, categoria_veiculo: "leve" })
        .qualificado
    ).toBe(true)
    // Sem categoria informada assume leve.
    expect(qualificarVeiculoFinanciamento({ ano_veiculo: anoAtual - 12 }).qualificado).toBe(true)
  })

  it("a qualificação final também barra o pesado antigo", () => {
    const r = qualificarFinanciamentoVeiculo({
      ...base,
      categoria_veiculo: "pesado",
      ano_veiculo: anoAtual - 6,
    })
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => m.includes(BEM_NAO_ELEGIVEL_FINANCIAMENTO))).toBe(true)
  })

  it("pesado de 4 anos dentro do LTV qualifica na ponta a ponta", () => {
    const r = qualificarFinanciamentoVeiculo({
      valor_veiculo: 400_000,
      valor_solicitado: 320_000, // 80%
      prazo_meses: 48,
      categoria_veiculo: "pesado",
      ano_veiculo: anoAtual - 4,
    })
    expect(r.qualificado).toBe(true)
  })

  it("pesado de 6 anos acima do LTV acumula os dois motivos", () => {
    const r = qualificarFinanciamentoVeiculo({
      valor_veiculo: 400_000,
      valor_solicitado: 380_000, // 95%
      prazo_meses: 48,
      categoria_veiculo: "pesado",
      ano_veiculo: anoAtual - 6,
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
