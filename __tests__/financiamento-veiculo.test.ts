import { describe, it, expect } from "vitest"
import { CONFIG, RATE_CONFIG } from "@/lib/config"
import { calcularFinanciamentoVeiculo } from "@/lib/simulacao"
import { qualificarFinanciamentoVeiculo } from "@/lib/qualificacao"

const cfg = CONFIG.financiamentoVeiculo

describe("Financiamento de Veículo — configuração", () => {
  it("taxa a partir de 1,39% a.m. pré-fixada", () => {
    expect(cfg.taxaMensal).toBeCloseTo(0.0139, 6)
    expect(cfg.modalidadeTaxa).toBe("pre_fixada")
  })

  it("prazo máximo de 60 meses e todos os prazos ofertados dentro do teto", () => {
    expect(cfg.prazoMaximo).toBe(60)
    for (const prazo of cfg.prazosDisponiveis) {
      expect(prazo).toBeLessThanOrEqual(60)
    }
  })

  it("financia até 80% do valor do veículo (2026-08)", () => {
    expect(cfg.ltv).toBeCloseTo(0.8, 6)
  })

  it("faixa do operador começa em 1,39% a.m.", () => {
    expect(RATE_CONFIG.financiamento_veiculo.min).toBeCloseTo(0.0139, 6)
  })
})

describe("calcularFinanciamentoVeiculo — parcela Price pré-fixada", () => {
  it("80 mil em 48 meses a 1,39% a.m. → parcela R$ 2.295,18", () => {
    const r = calcularFinanciamentoVeiculo({
      valorCredito: 80_000,
      taxaMensal: 0.0139,
      prazoMeses: 48,
    })
    expect(r.parcela).toBeCloseTo(2_295.18, 2)
    expect(r.totalPago).toBeCloseTo(110_168.65, 2)
  })

  it("50 mil em 60 meses (prazo máximo) a 1,39% a.m. → parcela R$ 1.234,04", () => {
    const r = calcularFinanciamentoVeiculo({
      valorCredito: 50_000,
      taxaMensal: 0.0139,
      prazoMeses: 60,
    })
    expect(r.parcela).toBeCloseTo(1_234.04, 2)
    expect(r.totalPago).toBeCloseTo(74_042.51, 2)
  })

  it("informa a taxa anual equivalente", () => {
    const r = calcularFinanciamentoVeiculo({
      valorCredito: 50_000,
      taxaMensal: 0.0139,
      prazoMeses: 60,
    })
    expect(r.taxaAnual).toBeCloseTo(0.180162, 5)
  })

  it("bloqueia prazo acima de 60 meses (retorno zerado)", () => {
    const r = calcularFinanciamentoVeiculo({
      valorCredito: 50_000,
      taxaMensal: 0.0139,
      prazoMeses: 72,
    })
    expect(r.parcela).toBe(0)
    expect(r.totalPago).toBe(0)
  })

  it("retorno zerado para entradas inválidas", () => {
    expect(
      calcularFinanciamentoVeiculo({ valorCredito: 0, taxaMensal: 0.0139, prazoMeses: 48 }).parcela
    ).toBe(0)
    expect(
      calcularFinanciamentoVeiculo({ valorCredito: 50_000, taxaMensal: 0, prazoMeses: 48 }).parcela
    ).toBe(0)
  })
})

describe("qualificarFinanciamentoVeiculo", () => {
  const base = {
    valor_veiculo: 100_000,
    valor_solicitado: 80_000,
    prazo_meses: 48,
  }

  it("qualifica lead dentro das regras", () => {
    const { qualificado, motivos } = qualificarFinanciamentoVeiculo(base)
    expect(qualificado).toBe(true)
    expect(motivos).toHaveLength(0)
  })

  // A matriz completa de LTV e elegibilidade do bem fica em
  // __tests__/vehicle_financing_logic.test.ts.
  it("aceita financiar exatamente 80% do valor do veículo", () => {
    const { qualificado } = qualificarFinanciamentoVeiculo({
      ...base,
      valor_solicitado: 80_000,
    })
    expect(qualificado).toBe(true)
  })

  it("rejeita valor acima de 80% do veículo", () => {
    const { qualificado, motivos } = qualificarFinanciamentoVeiculo({
      ...base,
      valor_solicitado: 80_000.01,
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("80%"))).toBe(true)
  })

  it("aceita o prazo máximo de 60 meses", () => {
    const { qualificado } = qualificarFinanciamentoVeiculo({ ...base, prazo_meses: 60 })
    expect(qualificado).toBe(true)
  })

  it("rejeita prazo acima de 60 meses", () => {
    const { qualificado, motivos } = qualificarFinanciamentoVeiculo({ ...base, prazo_meses: 72 })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("60"))).toBe(true)
  })
})
