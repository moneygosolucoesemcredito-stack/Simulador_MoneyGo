import { describe, it, expect } from "vitest"
import { calcularPrice, calcularSAC, calcularSimulacao, calcularHomeEquity } from "@/lib/simulacao"

describe("calcularPrice", () => {
  it("calculates correct PMT for known values", () => {
    // PV=200000, i=1.19%/month, n=180 months → PMT ≈ 2701
    const result = calcularPrice(200_000, 0.0119, 180)
    expect(result).toBeCloseTo(2701, 0)
  })

  it("returns 0 for invalid inputs", () => {
    expect(calcularPrice(0, 0.01, 12)).toBe(0)
    expect(calcularPrice(100_000, 0, 12)).toBe(0)
    expect(calcularPrice(100_000, 0.01, 0)).toBe(0)
  })
})

describe("calcularSAC", () => {
  it("calculates correct first and last installments", () => {
    const { primeira, ultima } = calcularSAC(200_000, 0.0119, 180)
    // First: 200000/180 + 200000*0.0119 = 1111.11 + 2380 = 3491.11
    expect(primeira).toBeCloseTo(3491.11, 0)
    // Last: 200000/180 + (200000/180)*0.0119
    const amort = 200_000 / 180
    expect(ultima).toBeCloseTo(amort + amort * 0.0119, 0)
  })

  it("first installment is always greater than last", () => {
    const { primeira, ultima } = calcularSAC(100_000, 0.015, 60)
    expect(primeira).toBeGreaterThan(ultima)
  })

  it("returns 0 for invalid inputs", () => {
    const { primeira, ultima } = calcularSAC(0, 0.01, 12)
    expect(primeira).toBe(0)
    expect(ultima).toBe(0)
  })
})

describe("calcularSimulacao", () => {
  it("returns coherent result object", () => {
    const result = calcularSimulacao(200_000, 0.0119, 180)
    expect(result.parcela_price).toBeGreaterThan(0)
    expect(result.primeira_parcela_sac).toBeGreaterThan(result.ultima_parcela_sac)
    expect(result.taxa_mensal).toBe(0.0119)
    expect(result.valor_total_price).toBeCloseTo(result.parcela_price * 180, 1)
  })
})

describe("calcularHomeEquity (fiel à planilha Simulacao HE.xlsx)", () => {
  // Cenário-base da planilha: crédito 2.750.000, imóvel 5.000.000, 1,09% a.m.,
  // 240 meses, PJ (IOF 1,88%). Valores de referência extraídos da própria planilha.
  const r = calcularHomeEquity({
    valorCredito: 2_750_000,
    valorImovel: 5_000_000,
    prazoMeses: 240,
    taxaMensal: 0.0109,
    tipoPessoa: "PJ",
  })

  it("grossed-up principal matches the spreadsheet (C19)", () => {
    expect(r.principalFinanciado).toBeCloseTo(2_949_959.23, 0)
  })

  it("IOF value matches the spreadsheet (L15)", () => {
    expect(r.iofValor).toBeCloseTo(55_459.23, 0)
  })

  it("PRICE first installment with insurance matches the spreadsheet (Z13)", () => {
    expect(r.price.primeiraParcela).toBeCloseTo(36_111.75, 0)
  })

  it("annual CET matches the spreadsheet (C21 = 14,5984%)", () => {
    expect(r.price.cetAnual).toBeCloseTo(0.145984, 4)
  })

  it("annual effective rate compounds the monthly rate", () => {
    expect(r.taxaAnual).toBeCloseTo(Math.pow(1.0109, 12) - 1, 6)
  })

  it("suggested income = first installment / 0.30", () => {
    expect(r.price.rendaSugerida).toBeCloseTo(r.price.primeiraParcela / 0.3, 2)
    expect(r.sac.rendaSugerida).toBeCloseTo(r.sac.primeiraParcela / 0.3, 2)
  })

  it("SAC first installment is greater than its last (decrescente)", () => {
    expect(r.sac.primeiraParcela).toBeGreaterThan(r.sac.ultimaParcela)
  })

  it("PF carries a higher IOF than PJ", () => {
    const pf = calcularHomeEquity({
      valorCredito: 2_750_000,
      valorImovel: 5_000_000,
      prazoMeses: 240,
      taxaMensal: 0.0109,
      tipoPessoa: "PF",
    })
    expect(pf.iofValor).toBeGreaterThan(r.iofValor)
  })

  it("returns zeroed tables for invalid inputs", () => {
    const z = calcularHomeEquity({
      valorCredito: 0,
      valorImovel: 0,
      prazoMeses: 0,
      taxaMensal: 0,
      tipoPessoa: "PF",
    })
    expect(z.price.primeiraParcela).toBe(0)
    expect(z.sac.primeiraParcela).toBe(0)
  })
})
