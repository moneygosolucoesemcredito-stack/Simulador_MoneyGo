import { describe, it, expect } from "vitest"
import { parseTaxaPercent, taxaDentroFaixa, taxaParaPercentStr } from "@/lib/taxa"

describe("parseTaxaPercent", () => {
  it("aceita vírgula como separador decimal", () => {
    expect(parseTaxaPercent("1,35")).toBeCloseTo(0.0135, 6)
  })

  it("aceita ponto como separador decimal", () => {
    expect(parseTaxaPercent("1.35")).toBeCloseTo(0.0135, 6)
  })

  it("ignora espaços e símbolos extras", () => {
    expect(parseTaxaPercent(" 1,99% ")).toBeCloseTo(0.0199, 6)
  })

  it("retorna null para entrada vazia ou inválida", () => {
    expect(parseTaxaPercent("")).toBeNull()
    expect(parseTaxaPercent("abc")).toBeNull()
    expect(parseTaxaPercent(",")).toBeNull()
    expect(parseTaxaPercent("0")).toBeNull()
  })
})

describe("taxaDentroFaixa (home_equity)", () => {
  it("aceita os limites da faixa 0,99%–1,99%", () => {
    expect(taxaDentroFaixa(0.0099, "home_equity")).toBe(true)
    expect(taxaDentroFaixa(0.0199, "home_equity")).toBe(true)
    expect(taxaDentroFaixa(0.0135, "home_equity")).toBe(true)
  })

  it("rejeita taxas fora da faixa", () => {
    expect(taxaDentroFaixa(0.0098, "home_equity")).toBe(false)
    expect(taxaDentroFaixa(0.02, "home_equity")).toBe(false)
  })

  it("auto_equity só aceita a taxa fixa de 1,99%", () => {
    expect(taxaDentroFaixa(0.0199, "auto_equity")).toBe(true)
    expect(taxaDentroFaixa(0.0159, "auto_equity")).toBe(false)
    expect(taxaDentroFaixa(0.0119, "auto_equity")).toBe(false)
  })
})

describe("taxaParaPercentStr", () => {
  it("formata fração como percentual com vírgula", () => {
    expect(taxaParaPercentStr(0.0135)).toBe("1,35")
    expect(taxaParaPercentStr(0.0099)).toBe("0,99")
  })
})
