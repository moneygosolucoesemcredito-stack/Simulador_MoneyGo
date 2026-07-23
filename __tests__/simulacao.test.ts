import { describe, it, expect } from "vitest"
import { calcularPrice, calcularSAC, calcularSimulacao, calcularHomeEquity, calcularAutoEquity } from "@/lib/simulacao"

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

  it("total pago no SAC = principal + soma dos juros (i·PV·(n+1)/2)", () => {
    const pv = 200_000
    const i = 0.0119
    const n = 180
    const result = calcularSimulacao(pv, i, n)
    const esperado = pv + i * pv * ((n + 1) / 2)
    expect(result.valor_total_sac).toBeCloseTo(esperado, 2)
    // No SAC paga-se menos juros que no PRICE, logo o total é menor.
    expect(result.valor_total_sac).toBeLessThan(result.valor_total_price)
  })

  it("zera os totais quando os parâmetros são inválidos", () => {
    const result = calcularSimulacao(0, 0.0119, 180)
    expect(result.valor_total_sac).toBe(0)
    expect(result.valor_total_price).toBe(0)
  })
})

describe("calcularHomeEquity (planilha Simulacao HE.xlsx, com estruturação zerada)", () => {
  // Cenário-base da planilha: crédito 2.750.000, imóvel 5.000.000, 1,09% a.m.,
  // 240 meses, PJ (IOF 1,88%). A pedido da MoneyGo (2026-07-10) a estruturação
  // de 5% da planilha NÃO compõe o CAC — valores de referência recalculados
  // com CAC = apenas registro (R$ 7.000).
  const r = calcularHomeEquity({
    valorCredito: 2_750_000,
    valorImovel: 5_000_000,
    prazoMeses: 240,
    taxaMensal: 0.0109,
    tipoPessoa: "PJ",
  })

  it("grossed-up principal (crédito + registro, sem estruturação)", () => {
    expect(r.principalFinanciado).toBeCloseTo(2_809_824.7, 0)
  })

  it("IOF value over the reduced principal", () => {
    expect(r.iofValor).toBeCloseTo(52_824.7, 0)
  })

  it("PRICE first installment with insurance", () => {
    expect(r.price.primeiraParcela).toBeCloseTo(34_412.93, 0)
  })

  it("annual CET", () => {
    expect(r.price.cetAnual).toBeCloseTo(0.146099, 4)
  })

  it("estruturação não entra no CAC (CAC = só registro)", () => {
    expect(r.cacTotal).toBeCloseTo(7_000, 2)
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

describe("calcularAutoEquity", () => {
  it("grossa o IOF PF (3,38%) sobre o valor líquido", () => {
    const r = calcularAutoEquity({
      valorCredito: 30_000,
      prazoMeses: 36,
      taxaMensal: 0.0199,
      tipoPessoa: "PF",
    })
    expect(r.principalFinanciado).toBeCloseTo(30_000 / (1 - 0.0338), 2)
    expect(r.iofValor).toBeCloseTo(r.principalFinanciado - 30_000, 2)
  })

  it("grossa o IOF PJ (1,88%) sobre o valor líquido", () => {
    const r = calcularAutoEquity({
      valorCredito: 30_000,
      prazoMeses: 36,
      taxaMensal: 0.0199,
      tipoPessoa: "PJ",
    })
    expect(r.principalFinanciado).toBeCloseTo(30_000 / (1 - 0.0188), 2)
  })

  it("dilui o IOF com juros nos 12 primeiros meses", () => {
    const r = calcularAutoEquity({
      valorCredito: 30_000,
      prazoMeses: 36,
      taxaMensal: 0.0199,
      tipoPessoa: "PF",
    })
    expect(r.mesesComIOF).toBe(12)
    expect(r.parcelaCredito).toBeCloseTo(calcularPrice(30_000, 0.0199, 36), 6)
    expect(r.parcelaIOF).toBeCloseTo(calcularPrice(r.iofValor, 0.0199, 12), 6)
    expect(r.parcelaInicial).toBeCloseTo(r.parcelaCredito + r.parcelaIOF, 6)
    expect(r.parcelaRestante).toBeCloseTo(r.parcelaCredito, 6)
    expect(r.parcelaInicial).toBeGreaterThan(r.parcelaRestante)
  })

  it("total pago = crédito em n meses + IOF em 12 meses", () => {
    const r = calcularAutoEquity({
      valorCredito: 30_000,
      prazoMeses: 36,
      taxaMensal: 0.0199,
      tipoPessoa: "PF",
    })
    expect(r.totalPago).toBeCloseTo(r.parcelaCredito * 36 + r.parcelaIOF * 12, 6)
  })

  it("prazo de 12 meses: IOF diluído no prazo inteiro, parcela única", () => {
    const r = calcularAutoEquity({
      valorCredito: 30_000,
      prazoMeses: 12,
      taxaMensal: 0.0199,
      tipoPessoa: "PF",
    })
    expect(r.mesesComIOF).toBe(12)
    expect(r.parcelaInicial).toBeCloseTo(
      calcularPrice(30_000, 0.0199, 12) + calcularPrice(r.iofValor, 0.0199, 12),
      6
    )
  })

  it("prazo menor que 12 meses: IOF diluído no prazo disponível", () => {
    const r = calcularAutoEquity({
      valorCredito: 30_000,
      prazoMeses: 6,
      taxaMensal: 0.0199,
      tipoPessoa: "PF",
    })
    expect(r.mesesComIOF).toBe(6)
    expect(r.parcelaIOF).toBeCloseTo(calcularPrice(r.iofValor, 0.0199, 6), 6)
  })

  it("parcela PF > parcela PJ (IOF maior)", () => {
    const pf = calcularAutoEquity({ valorCredito: 30_000, prazoMeses: 36, taxaMensal: 0.0199, tipoPessoa: "PF" })
    const pj = calcularAutoEquity({ valorCredito: 30_000, prazoMeses: 36, taxaMensal: 0.0199, tipoPessoa: "PJ" })
    expect(pf.parcelaInicial).toBeGreaterThan(pj.parcelaInicial)
    // A parcela do crédito puro é igual — só o IOF muda entre PF e PJ.
    expect(pf.parcelaRestante).toBeCloseTo(pj.parcelaRestante, 6)
  })

  it("retorna zeros para entrada inválida", () => {
    const r = calcularAutoEquity({ valorCredito: 0, prazoMeses: 36, taxaMensal: 0.0199, tipoPessoa: "PF" })
    expect(r.parcelaInicial).toBe(0)
    expect(r.parcelaRestante).toBe(0)
    expect(r.iofValor).toBe(0)
    expect(r.totalPago).toBe(0)
  })
})
