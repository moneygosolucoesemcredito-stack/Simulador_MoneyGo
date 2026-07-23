import { describe, it, expect } from "vitest"
import {
  LTV_MAXIMO_REGULATORIO,
  ltvParaTipoImovel,
  ltvParaTipoImovelFI,
} from "@/lib/config"
import {
  qualificarHomeEquity,
  qualificarFinanciamentoImobiliario,
} from "@/lib/qualificacao"
import type { TipoImovel } from "@/types"

const TIPOLOGIAS: TipoImovel[] = [
  "casa",
  "apartamento",
  "comercial",
  "terreno",
  "terreno_condominio",
]

describe("teto regulatório de LTV (55%)", () => {
  it("nenhuma tipologia do Home Equity ultrapassa 55%", () => {
    for (const t of TIPOLOGIAS) {
      expect(ltvParaTipoImovel(t)).toBeLessThanOrEqual(LTV_MAXIMO_REGULATORIO)
    }
    expect(ltvParaTipoImovel("")).toBeLessThanOrEqual(LTV_MAXIMO_REGULATORIO)
  })

  it("o Financiamento Imobiliário NÃO está preso ao teto de 55%", () => {
    // Ao contrário do Home Equity, o FI usa os LTVs cheios por tipologia.
    expect(ltvParaTipoImovelFI("casa")).toBeGreaterThan(LTV_MAXIMO_REGULATORIO)
    expect(ltvParaTipoImovelFI("apartamento")).toBeGreaterThan(LTV_MAXIMO_REGULATORIO)
    expect(ltvParaTipoImovelFI("comercial")).toBeGreaterThan(LTV_MAXIMO_REGULATORIO)
  })

  it("LTV do FI por tipologia: casa/apto 80%, comercial 70%, terreno 50%", () => {
    expect(ltvParaTipoImovelFI("casa")).toBeCloseTo(0.8, 4)
    expect(ltvParaTipoImovelFI("apartamento")).toBeCloseTo(0.8, 4)
    expect(ltvParaTipoImovelFI("comercial")).toBeCloseTo(0.7, 4)
    expect(ltvParaTipoImovelFI("terreno")).toBeCloseTo(0.5, 4)
    expect(ltvParaTipoImovelFI("terreno_condominio")).toBeCloseTo(0.5, 4)
  })

  it("tipologias mais restritivas do HE continuam abaixo do teto", () => {
    expect(ltvParaTipoImovel("comercial")).toBeCloseTo(0.45, 4)
    expect(ltvParaTipoImovel("terreno_condominio")).toBeCloseTo(0.35, 4)
    expect(ltvParaTipoImovel("terreno")).toBeCloseTo(0.35, 4)
  })
})

describe("qualificarHomeEquity — trava de 55%", () => {
  const base = {
    valor_imovel: 500_000,
    tipo_imovel: "casa" as TipoImovel,
    situacao: "quitado" as const,
    cidade: "Joinville",
    uf: "SC",
    data_nascimento: "1990-05-15",
  }

  it("rejeita crédito de 56% do valor do imóvel", () => {
    const { qualificado, motivos } = qualificarHomeEquity({
      ...base,
      valor_solicitado: 280_000, // 56%
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("55%"))).toBe(true)
  })

  it("aceita crédito de exatamente 55%", () => {
    const { qualificado } = qualificarHomeEquity({
      ...base,
      valor_solicitado: 275_000, // 55%
    })
    expect(qualificado).toBe(true)
  })
})

describe("qualificarFinanciamentoImobiliario — LTV por tipologia (80/70/50)", () => {
  const base = {
    valor_imovel: 500_000,
    cidade: "Joinville",
    uf: "SC",
    data_nascimento: "1990-05-15",
  }

  it("casa/apto aceita até 80% e rejeita acima disso", () => {
    for (const t of ["casa", "apartamento"] as TipoImovel[]) {
      expect(
        qualificarFinanciamentoImobiliario({ ...base, tipo_imovel: t, valor_solicitado: 400_000 }).qualificado
      ).toBe(true) // 80%
      expect(
        qualificarFinanciamentoImobiliario({ ...base, tipo_imovel: t, valor_solicitado: 405_000 }).qualificado
      ).toBe(false) // 81%
    }
  })

  it("comercial aceita até 70% e rejeita acima disso", () => {
    expect(
      qualificarFinanciamentoImobiliario({ ...base, tipo_imovel: "comercial", valor_solicitado: 350_000 }).qualificado
    ).toBe(true) // 70%
    expect(
      qualificarFinanciamentoImobiliario({ ...base, tipo_imovel: "comercial", valor_solicitado: 355_000 }).qualificado
    ).toBe(false) // 71%
  })

  it("terreno aceita até 50% e rejeita acima disso", () => {
    expect(
      qualificarFinanciamentoImobiliario({ ...base, tipo_imovel: "terreno", valor_solicitado: 250_000 }).qualificado
    ).toBe(true) // 50%
    expect(
      qualificarFinanciamentoImobiliario({ ...base, tipo_imovel: "terreno", valor_solicitado: 255_000 }).qualificado
    ).toBe(false) // 51%
  })
})
