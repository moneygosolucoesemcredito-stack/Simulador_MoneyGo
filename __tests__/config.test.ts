import { describe, it, expect } from "vitest"
import { LTV_POR_TIPO_IMOVEL, ltvParaTipoImovel } from "@/lib/config"

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
      "terreno_condominio",
    ]
    for (const c of categorias) {
      expect(LTV_POR_TIPO_IMOVEL[c]).toBeGreaterThan(0)
      expect(LTV_POR_TIPO_IMOVEL[c]).toBeLessThanOrEqual(1)
    }
  })
})
