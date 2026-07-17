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

  it("nenhuma tipologia do Financiamento Imobiliário ultrapassa 55%", () => {
    for (const t of TIPOLOGIAS) {
      expect(ltvParaTipoImovelFI(t)).toBeLessThanOrEqual(LTV_MAXIMO_REGULATORIO)
    }
    expect(ltvParaTipoImovelFI("")).toBeLessThanOrEqual(LTV_MAXIMO_REGULATORIO)
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

describe("qualificarFinanciamentoImobiliario — trava de 55%", () => {
  const base = {
    valor_imovel: 500_000,
    tipo_imovel: "casa" as TipoImovel,
    cidade: "Joinville",
    uf: "SC",
    data_nascimento: "1990-05-15",
  }

  it("rejeita crédito de 56% do valor do imóvel", () => {
    const { qualificado, motivos } = qualificarFinanciamentoImobiliario({
      ...base,
      valor_solicitado: 280_000, // 56% — antes passava (LTV era 80%)
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("55%"))).toBe(true)
  })

  it("aceita crédito de exatamente 55%", () => {
    const { qualificado } = qualificarFinanciamentoImobiliario({
      ...base,
      valor_solicitado: 275_000, // 55%
    })
    expect(qualificado).toBe(true)
  })

  it("rejeita 56% também nas demais tipologias", () => {
    for (const t of TIPOLOGIAS) {
      const { qualificado } = qualificarFinanciamentoImobiliario({
        ...base,
        tipo_imovel: t,
        valor_solicitado: 280_000,
      })
      // rural não existe em TipoImovel; todas as tipologias devem travar ≥ 56%
      expect(qualificado).toBe(false)
    }
  })
})
