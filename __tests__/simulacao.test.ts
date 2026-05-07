import { describe, it, expect } from "vitest"
import { calcularPrice, calcularSAC, calcularSimulacao } from "@/lib/simulacao"

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
