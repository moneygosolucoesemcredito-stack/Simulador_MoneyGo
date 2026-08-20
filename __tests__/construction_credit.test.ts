import { describe, it, expect } from "vitest"
import {
  CONFIG,
  CONSTRUCAO_POR_CATEGORIA,
  limiteCreditoConstrucao,
  prazosDisponiveisConstrucao,
  regraConstrucao,
  taxaAnualConstrucao,
  taxaMensalConstrucao,
  tomadorPermitidoConstrucao,
} from "@/lib/config"
import { qualificarCreditoConstrucao } from "@/lib/qualificacao"
import {
  calcularPrice,
  calcularSimulacao,
  gerarTabelasAmortizacao,
  taxaAnualEquivalente,
  taxaMensalEquivalente,
} from "@/lib/simulacao"

/**
 * Crédito de Construção (2026-08) — a categoria do terreno define tudo:
 *
 *   DENTRO DE CONDOMÍNIO   PF apenas · 80% do custo da obra · 13,99% a.a. + TR · 360 meses
 *   FORA DE CONDOMÍNIO     PF e PJ   · 50% do VGV           · 15% a.a. + IPCA · 240 meses
 */

const CENARIO = {
  valor_terreno: 500_000,
  valor_obra: 1_000_000, // 80% → 800.000
  vgv: 3_000_000, // 50% → 1.500.000
  cidade: "Joinville",
  uf: "SC",
  data_nascimento: "1985-05-15",
}

function qualificar(patch: {
  categoria_terreno: "condominio" | "fora_condominio"
  tipo_pessoa: "PF" | "PJ"
  valor_solicitado: number
  prazo_meses?: number
  valor_obra?: number
  vgv?: number
}) {
  return qualificarCreditoConstrucao({ ...CENARIO, ...patch })
}

// ──────────────────────────────────────────────────────────────────────────
// FASE 1 — público, teto, taxa e prazo por categoria
// ──────────────────────────────────────────────────────────────────────────

describe("PF dentro de condomínio", () => {
  const regra = CONSTRUCAO_POR_CATEGORIA.condominio

  it("atende apenas Pessoa Física", () => {
    expect(regra.tomadores).toEqual(["PF"])
    expect(tomadorPermitidoConstrucao("condominio", "PF")).toBe(true)
    expect(tomadorPermitidoConstrucao("condominio", "PJ")).toBe(false)
  })

  it("qualifica PF com crédito de até 80% do custo da obra", () => {
    expect(qualificar({ categoria_terreno: "condominio", tipo_pessoa: "PF", valor_solicitado: 800_000 }).qualificado).toBe(true)
    const acima = qualificar({ categoria_terreno: "condominio", tipo_pessoa: "PF", valor_solicitado: 810_000 })
    expect(acima.qualificado).toBe(false)
    expect(acima.motivos.some((m) => m.includes("80%") && m.includes("obra"))).toBe(true)
  })

  it("reprova PJ mesmo com todos os demais critérios atendidos", () => {
    const r = qualificar({ categoria_terreno: "condominio", tipo_pessoa: "PJ", valor_solicitado: 700_000 })
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => /apenas para PF/i.test(m))).toBe(true)
  })

  it("o VGV não amplia nem restringe o teto nesta categoria", () => {
    // VGV baixíssimo: 50% dele seriam 100.000, mas quem manda é a obra.
    const r = qualificar({ categoria_terreno: "condominio", tipo_pessoa: "PF", valor_solicitado: 800_000, vgv: 200_000 })
    expect(r.qualificado).toBe(true)
  })

  it("taxa de 13,99% ao ano, convertida para ~1,0971% ao mês", () => {
    expect(taxaAnualConstrucao("condominio")).toBeCloseTo(0.1399, 6)
    expect(taxaMensalConstrucao("condominio")).toBeCloseTo(0.0109715, 6)
    // A conversão é composta: (1 + i_m)^12 devolve a taxa anual publicada.
    expect(taxaAnualEquivalente(taxaMensalConstrucao("condominio"))).toBeCloseTo(0.1399, 8)
  })

  it("prazo de até 360 meses (30 anos)", () => {
    expect(regra.prazoMaximo).toBe(360)
    expect(prazosDisponiveisConstrucao("condominio")).toContain(360)
    expect(qualificar({ categoria_terreno: "condominio", tipo_pessoa: "PF", valor_solicitado: 700_000, prazo_meses: 360 }).qualificado).toBe(true)
    const longo = qualificar({ categoria_terreno: "condominio", tipo_pessoa: "PF", valor_solicitado: 700_000, prazo_meses: 420 })
    expect(longo.qualificado).toBe(false)
    expect(longo.motivos.some((m) => m.includes("360"))).toBe(true)
  })
})

describe("PJ fora de condomínio", () => {
  const regra = CONSTRUCAO_POR_CATEGORIA.fora_condominio

  it("atende Pessoa Física e Pessoa Jurídica", () => {
    expect(regra.tomadores).toEqual(["PF", "PJ"])
    expect(tomadorPermitidoConstrucao("fora_condominio", "PJ")).toBe(true)
    expect(tomadorPermitidoConstrucao("fora_condominio", "PF")).toBe(true)
  })

  it("qualifica PJ com crédito de até 50% do VGV", () => {
    expect(qualificar({ categoria_terreno: "fora_condominio", tipo_pessoa: "PJ", valor_solicitado: 1_500_000 }).qualificado).toBe(true)
    const acima = qualificar({ categoria_terreno: "fora_condominio", tipo_pessoa: "PJ", valor_solicitado: 1_600_000 })
    expect(acima.qualificado).toBe(false)
    expect(acima.motivos.some((m) => m.includes("50%") && m.includes("VGV"))).toBe(true)
  })

  it("o custo da obra não limita o crédito nesta categoria", () => {
    // 80% da obra seriam 800.000 — a regra antiga barraria 1,2M; agora passa.
    const r = qualificar({ categoria_terreno: "fora_condominio", tipo_pessoa: "PJ", valor_solicitado: 1_200_000 })
    expect(r.qualificado).toBe(true)
  })

  it("exige VGV acima do mínimo do produto", () => {
    const r = qualificar({ categoria_terreno: "fora_condominio", tipo_pessoa: "PJ", valor_solicitado: 100_000, vgv: 200_000 })
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => m.includes("VGV abaixo do mínimo"))).toBe(true)
  })

  it("taxa de 15% ao ano, equivalente a ~1,1715% ao mês", () => {
    expect(taxaAnualConstrucao("fora_condominio")).toBeCloseTo(0.15, 6)
    expect(taxaMensalConstrucao("fora_condominio")).toBeCloseTo(0.011715, 6)
    expect(taxaMensalEquivalente(taxaAnualConstrucao("fora_condominio"))).toBeCloseTo(
      taxaMensalConstrucao("fora_condominio"),
      8
    )
  })

  it("prazo de até 240 meses (20 anos)", () => {
    expect(regra.prazoMaximo).toBe(240)
    expect(prazosDisponiveisConstrucao("fora_condominio")).not.toContain(360)
    const longo = qualificar({ categoria_terreno: "fora_condominio", tipo_pessoa: "PJ", valor_solicitado: 1_000_000, prazo_meses: 360 })
    expect(longo.qualificado).toBe(false)
    expect(longo.motivos.some((m) => m.includes("240"))).toBe(true)
  })
})

describe("PF em condomínio × PJ fora de condomínio — comparação direta", () => {
  it("o mesmo crédito de R$ 1.200.000 reprova em condomínio e aprova fora", () => {
    expect(qualificar({ categoria_terreno: "condominio", tipo_pessoa: "PF", valor_solicitado: 1_200_000 }).qualificado).toBe(false)
    expect(qualificar({ categoria_terreno: "fora_condominio", tipo_pessoa: "PJ", valor_solicitado: 1_200_000 }).qualificado).toBe(true)
  })

  it("a categoria em condomínio é mais barata ao mês que a de fora", () => {
    expect(taxaMensalConstrucao("condominio")).toBeLessThan(taxaMensalConstrucao("fora_condominio"))
  })

  it("a mesma parcela sai menor em condomínio (taxa e prazo mais favoráveis)", () => {
    const credito = 800_000
    const emCondominio = calcularPrice(credito, taxaMensalConstrucao("condominio"), 360)
    const foraCondominio = calcularPrice(credito, taxaMensalConstrucao("fora_condominio"), 240)
    expect(emCondominio).toBeLessThan(foraCondominio)
  })
})

describe("Resolução de categoria e defaults", () => {
  it("categoria vazia cai no default do produto (condomínio)", () => {
    expect(CONFIG.creditoConstrucao.categoriaDefault).toBe("condominio")
    expect(regraConstrucao("").rotulo).toBe(CONSTRUCAO_POR_CATEGORIA.condominio.rotulo)
    expect(limiteCreditoConstrucao("", { valorObra: 1_000_000, vgv: 3_000_000 })).toBeCloseTo(800_000, 2)
  })

  it("sem tomador informado a qualificação assume PF", () => {
    const r = qualificarCreditoConstrucao({
      ...CENARIO,
      categoria_terreno: "condominio",
      valor_solicitado: 700_000,
    })
    expect(r.qualificado).toBe(true)
  })

  it("bases negativas ou zeradas não geram teto negativo", () => {
    expect(limiteCreditoConstrucao("condominio", { valorObra: 0, vgv: 0 })).toBe(0)
    expect(limiteCreditoConstrucao("fora_condominio", { valorObra: -1, vgv: -1 })).toBe(0)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// FASE 2 — motor de cálculo com taxa anual × mensal
// ──────────────────────────────────────────────────────────────────────────

describe("Conversão de taxas anuais e mensais", () => {
  it("taxaMensalEquivalente é a raiz 12 composta da taxa anual", () => {
    expect(taxaMensalEquivalente(0.1399)).toBeCloseTo(Math.pow(1.1399, 1 / 12) - 1, 10)
    // Sanidade: 12,68% a.a. ≈ 1% a.m.
    expect(taxaMensalEquivalente(0.126825)).toBeCloseTo(0.01, 6)
  })

  it("taxaAnualEquivalente é a potência 12 da taxa mensal", () => {
    expect(taxaAnualEquivalente(0.01)).toBeCloseTo(0.126825, 6)
  })

  it("as conversões são inversas uma da outra", () => {
    expect(taxaMensalEquivalente(taxaAnualEquivalente(0.0125))).toBeCloseTo(0.0125, 10)
  })

  it("entradas inválidas devolvem 0 (não NaN)", () => {
    expect(taxaMensalEquivalente(0)).toBe(0)
    expect(taxaMensalEquivalente(-0.1)).toBe(0)
    expect(taxaAnualEquivalente(Number.NaN)).toBe(0)
  })

  it("a simulação usa a taxa mensal equivalente, não a anual crua", () => {
    const credito = 800_000
    const prazo = 360
    const comEquivalente = calcularSimulacao(credito, taxaMensalConstrucao("condominio"), prazo)
    const comAnualCrua = calcularSimulacao(credito, 0.1399, prazo)
    expect(comEquivalente.parcela_price).toBeLessThan(comAnualCrua.parcela_price)
    expect(comEquivalente.parcela_price).toBeCloseTo(
      calcularPrice(credito, Math.pow(1.1399, 1 / 12) - 1, prazo),
      6
    )
  })
})

// ──────────────────────────────────────────────────────────────────────────
// FASE 2 — tabelas de amortização do produto
// ──────────────────────────────────────────────────────────────────────────

describe("Tabelas SAC e PRICE do Crédito de Construção", () => {
  it("condomínio: 360 parcelas em ambos os sistemas, saldo zerando no fim", () => {
    const { sac, price } = gerarTabelasAmortizacao(800_000, taxaMensalConstrucao("condominio"), 360)
    expect(sac).toHaveLength(360)
    expect(price).toHaveLength(360)
    expect(sac[359].saldoDevedor).toBe(0)
    expect(price[359].saldoDevedor).toBe(0)
  })

  it("fora de condomínio: 240 parcelas e amortização somando o principal", () => {
    const credito = 1_500_000
    const { sac, price } = gerarTabelasAmortizacao(
      credito,
      taxaMensalConstrucao("fora_condominio"),
      240
    )
    expect(sac).toHaveLength(240)
    expect(sac.reduce((s, p) => s + p.amortizacao, 0)).toBeCloseTo(credito, 4)
    expect(price.reduce((s, p) => s + p.amortizacao, 0)).toBeCloseTo(credito, 4)
  })

  it("a primeira parcela da tabela bate com o resumo da simulação", () => {
    const taxa = taxaMensalConstrucao("condominio")
    const r = calcularSimulacao(800_000, taxa, 360)
    const { sac, price } = gerarTabelasAmortizacao(800_000, taxa, 360)
    expect(sac[0].parcela).toBeCloseTo(r.primeira_parcela_sac, 6)
    expect(price[0].parcela).toBeCloseTo(r.parcela_price, 4)
  })
})
