import { describe, it, expect } from "vitest"
import {
  LTV_POR_TIPO_IMOVEL,
  LTV_POR_TIPO_IMOVEL_FI,
  ltvParaTipoImovel,
  ltvParaTipoImovelFI,
} from "@/lib/config"

describe("ltvParaTipoImovel", () => {
  it("casa e apartamento têm LTV de 55%", () => {
    expect(ltvParaTipoImovel("casa")).toBeCloseTo(0.55, 4)
    expect(ltvParaTipoImovel("apartamento")).toBeCloseTo(0.55, 4)
  })

  it("comercial tem LTV de 45%", () => {
    expect(ltvParaTipoImovel("comercial")).toBeCloseTo(0.45, 4)
  })

  it("terreno em condomínio tem LTV de 35%", () => {
    expect(ltvParaTipoImovel("terreno_condominio")).toBeCloseTo(0.35, 4)
  })

  it("string vazia (tipo ainda não selecionado) usa o fallback de casa (55%)", () => {
    expect(ltvParaTipoImovel("")).toBeCloseTo(0.55, 4)
  })

  it("cobre todas as categorias de TipoImovel sem lacunas", () => {
    const categorias: (keyof typeof LTV_POR_TIPO_IMOVEL)[] = [
      "casa",
      "apartamento",
      "comercial",
      "terreno",
      "terreno_condominio",
    ]
    for (const c of categorias) {
      expect(LTV_POR_TIPO_IMOVEL[c]).toBeGreaterThan(0)
      expect(LTV_POR_TIPO_IMOVEL[c]).toBeLessThanOrEqual(1)
    }
  })
})

describe("ltvParaTipoImovelFI (Financiamento Imobiliário)", () => {
  // O Financiamento Imobiliário NÃO está sujeito ao teto de 55% do Home Equity:
  // os limites por tipologia valem cheios e variam por tomador —
  // PF: casa/apto 80%, comercial 70%, terreno 60%
  // PJ: casa/apto/comercial 70%, terreno 60%
  it("PF: casa e apartamento têm LTV de 80%", () => {
    expect(ltvParaTipoImovelFI("casa", "PF")).toBeCloseTo(0.8, 4)
    expect(ltvParaTipoImovelFI("apartamento", "PF")).toBeCloseTo(0.8, 4)
  })

  it("PJ: casa e apartamento caem para 70%", () => {
    expect(ltvParaTipoImovelFI("casa", "PJ")).toBeCloseTo(0.7, 4)
    expect(ltvParaTipoImovelFI("apartamento", "PJ")).toBeCloseTo(0.7, 4)
  })

  it("comercial tem LTV de 70% nos dois tomadores", () => {
    expect(ltvParaTipoImovelFI("comercial", "PF")).toBeCloseTo(0.7, 4)
    expect(ltvParaTipoImovelFI("comercial", "PJ")).toBeCloseTo(0.7, 4)
  })

  it("terreno tem LTV de 60% nos dois tomadores", () => {
    expect(ltvParaTipoImovelFI("terreno", "PF")).toBeCloseTo(0.6, 4)
    expect(ltvParaTipoImovelFI("terreno", "PJ")).toBeCloseTo(0.6, 4)
    expect(ltvParaTipoImovelFI("terreno_condominio", "PF")).toBeCloseTo(0.6, 4)
  })

  it("string vazia (tipo ainda não selecionado) usa o fallback de casa (80% PF)", () => {
    expect(ltvParaTipoImovelFI("")).toBeCloseTo(0.8, 4)
  })

  it("cobre todas as categorias de TipoImovel sem lacunas, em PF e PJ", () => {
    const categorias: (keyof (typeof LTV_POR_TIPO_IMOVEL_FI)["PF"])[] = [
      "casa",
      "apartamento",
      "comercial",
      "terreno",
      "terreno_condominio",
    ]
    for (const pessoa of ["PF", "PJ"] as const) {
      for (const c of categorias) {
        expect(LTV_POR_TIPO_IMOVEL_FI[pessoa][c]).toBeGreaterThan(0)
        expect(LTV_POR_TIPO_IMOVEL_FI[pessoa][c]).toBeLessThanOrEqual(1)
      }
    }
  })
})
