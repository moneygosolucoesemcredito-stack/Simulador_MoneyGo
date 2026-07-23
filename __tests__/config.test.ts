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
  // os limites por tipologia valem cheios (casa/apto 80%, comercial 70%, terreno 50%).
  it("casa e apartamento têm LTV de 80%", () => {
    expect(ltvParaTipoImovelFI("casa")).toBeCloseTo(0.8, 4)
    expect(ltvParaTipoImovelFI("apartamento")).toBeCloseTo(0.8, 4)
  })

  it("comercial tem LTV de 70%", () => {
    expect(ltvParaTipoImovelFI("comercial")).toBeCloseTo(0.7, 4)
  })

  it("terreno tem LTV de 50%", () => {
    expect(ltvParaTipoImovelFI("terreno")).toBeCloseTo(0.5, 4)
    expect(ltvParaTipoImovelFI("terreno_condominio")).toBeCloseTo(0.5, 4)
  })

  it("string vazia (tipo ainda não selecionado) usa o fallback de casa (80%)", () => {
    expect(ltvParaTipoImovelFI("")).toBeCloseTo(0.8, 4)
  })

  it("cobre todas as categorias de TipoImovel sem lacunas", () => {
    const categorias: (keyof typeof LTV_POR_TIPO_IMOVEL_FI)[] = [
      "casa",
      "apartamento",
      "comercial",
      "terreno",
      "terreno_condominio",
    ]
    for (const c of categorias) {
      expect(LTV_POR_TIPO_IMOVEL_FI[c]).toBeGreaterThan(0)
      expect(LTV_POR_TIPO_IMOVEL_FI[c]).toBeLessThanOrEqual(1)
    }
  })
})
