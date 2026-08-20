import { describe, it, expect } from "vitest"
import { CONFIG } from "@/lib/config"
import { qualificarHomeEquity, qualificarFinanciamentoImobiliario } from "@/lib/qualificacao"
import { calcularHomeEquity } from "@/lib/simulacao"

/**
 * Teto de valor do imóvel no Home Equity removido (2026-08): o produto aceita
 * imóveis de qualquer valor acima do mínimo. A trava que continua valendo é o
 * LTV da tipologia (≤ 55%), não o valor do bem.
 */

const dataNascimento30Anos = `${new Date().getFullYear() - 30}-01-01`

function qualificar(valorImovel: number, valorSolicitado: number) {
  return qualificarHomeEquity({
    valor_imovel: valorImovel,
    tipo_imovel: "casa",
    situacao: "quitado",
    valor_solicitado: valorSolicitado,
    cidade: "São Paulo",
    uf: "SP",
    data_nascimento: dataNascimento30Anos,
    prazo_meses: 180,
  })
}

describe("Home Equity — valor do imóvel sem teto", () => {
  it("CONFIG não expõe mais um valor máximo de imóvel", () => {
    expect("valorImovelMaximo" in CONFIG.homeEquity).toBe(false)
  })

  it("mantém o piso de R$ 250.000", () => {
    expect(CONFIG.homeEquity.valorImovelMinimo).toBe(250_000)
    const r = qualificar(200_000, 100_000)
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => m.includes("abaixo do mínimo"))).toBe(true)
  })

  it("qualifica imóvel de R$ 10.000.000 com crédito dentro do LTV", () => {
    const r = qualificar(10_000_000, 5_500_000) // 55% de 10mi
    expect(r.qualificado).toBe(true)
    expect(r.motivos).toEqual([])
  })

  it("qualifica imóvel de R$ 50.000.000 — nenhum motivo cita valor máximo", () => {
    const r = qualificar(50_000_000, 20_000_000)
    expect(r.qualificado).toBe(true)
    expect(r.motivos.join(" ")).not.toMatch(/máximo|acima do limite de valor/i)
  })

  it("aceita imóvel acima de R$ 5.000.000 também com saldo devedor (financiado)", () => {
    const r = qualificarHomeEquity({
      valor_imovel: 12_000_000,
      tipo_imovel: "apartamento",
      situacao: "financiado",
      saldo_devedor: 3_000_000, // 25% do imóvel, dentro do teto de 40%
      valor_solicitado: 3_600_000, // + saldo = 6,6M = exatamente o LTV de 55%
      cidade: "Curitiba",
      uf: "PR",
      data_nascimento: dataNascimento30Anos,
      prazo_meses: 180,
    })
    expect(r.qualificado).toBe(true)
  })

  it("o LTV continua sendo a trava — crédito acima de 55% reprova mesmo em imóvel caro", () => {
    const r = qualificar(10_000_000, 6_000_000) // 60% > 55%
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => m.includes("55%"))).toBe(true)
  })

  it("simula normalmente um imóvel de R$ 10.000.000", () => {
    const r = calcularHomeEquity({
      valorCredito: 5_500_000,
      valorImovel: 10_000_000,
      prazoMeses: 180,
      taxaMensal: 0.0119,
      tipoPessoa: "PF",
    })
    expect(r.price.primeiraParcela).toBeGreaterThan(0)
    expect(Number.isFinite(r.price.cetAnual)).toBe(true)
  })

  it("imóvel acima de R$ 10mi usa o DFI majorado (parcela maior que no DFI padrão)", () => {
    const base = {
      valorCredito: 2_000_000,
      prazoMeses: 180,
      taxaMensal: 0.0119,
      tipoPessoa: "PF" as const,
    }
    const ate10mi = calcularHomeEquity({ ...base, valorImovel: 10_000_000 })
    const acima10mi = calcularHomeEquity({ ...base, valorImovel: 10_000_001 })
    expect(acima10mi.price.primeiraParcela).toBeGreaterThan(ate10mi.price.primeiraParcela)
  })
})

describe("Sem impacto nos demais produtos", () => {
  it("Financiamento Imobiliário mantém suas próprias regras (piso e LTV de 80%)", () => {
    expect(CONFIG.financiamentoImobiliario.valorImovelMinimo).toBe(200_000)
    const r = qualificarFinanciamentoImobiliario({
      valor_imovel: 10_000_000,
      tipo_imovel: "casa",
      valor_solicitado: 8_000_000,
      cidade: "São Paulo",
      uf: "SP",
      data_nascimento: dataNascimento30Anos,
    })
    expect(r.qualificado).toBe(true)
  })

  it("Auto Equity também perdeu o teto de valor do veículo (2026-08)", () => {
    expect("valorVeiculoMaximo" in CONFIG.autoEquity).toBe(false)
    expect("valorVeiculoMinimo" in CONFIG.autoEquity).toBe(false)
  })
})
