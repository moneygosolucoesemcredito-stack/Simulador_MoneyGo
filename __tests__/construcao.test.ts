import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { CONFIG, RATE_CONFIG, limiteCreditoConstrucao } from "@/lib/config"
import { qualificarCreditoConstrucao } from "@/lib/qualificacao"

const cfg = CONFIG.creditoConstrucao

describe("Crédito de Construção — taxas", () => {
  it("oferece taxa a partir de 1,17% a.m. pós-fixada + TR", () => {
    expect(cfg.taxas.tr.taxaMensal).toBeCloseTo(0.0117, 6)
    expect(cfg.taxas.tr.indexador).toBe("TR")
    expect(cfg.taxas.tr.aPartirDe).toBe(true)
  })

  it("oferece taxa de 1,25% a.m. pós-fixada + IPCA", () => {
    expect(cfg.taxas.ipca.taxaMensal).toBeCloseTo(0.0125, 6)
    expect(cfg.taxas.ipca.indexador).toBe("IPCA")
  })

  it("modalidade é pós-fixada e o indexador default é TR", () => {
    expect(cfg.modalidadeTaxa).toBe("pos_fixada")
    expect(cfg.indexadorDefault).toBe("tr")
  })

  it("não existe mais a taxa única antiga (taxaMensal)", () => {
    expect("taxaMensal" in cfg).toBe(false)
  })

  it("faixa do operador começa em 1,17% a.m.", () => {
    expect(RATE_CONFIG.credito_construcao.min).toBeCloseTo(0.0117, 6)
  })
})

describe("Crédito de Construção — limite de crédito (menor entre 80% da obra e 50% do VGV)", () => {
  it("usa 80% da obra quando é o menor limite", () => {
    // 80% de 1M = 800k < 50% de 3M = 1,5M
    expect(limiteCreditoConstrucao(1_000_000, 3_000_000)).toBeCloseTo(800_000, 2)
  })

  it("usa 50% do VGV quando é o menor limite", () => {
    // 50% de 1,2M = 600k < 80% de 1M = 800k
    expect(limiteCreditoConstrucao(1_000_000, 1_200_000)).toBeCloseTo(600_000, 2)
  })

  it("não usa mais o LTV antigo de 55% sobre terreno + obra", () => {
    expect("ltv" in cfg).toBe(false)
    expect(cfg.ltvObra).toBeCloseTo(0.8, 4)
    expect(cfg.ltvVgv).toBeCloseTo(0.5, 4)
  })
})

describe("qualificarCreditoConstrucao", () => {
  const base = {
    valor_terreno: 500_000,
    valor_obra: 1_000_000,
    vgv: 3_000_000,
    valor_solicitado: 700_000,
    cidade: "Joinville",
    uf: "SC",
    data_nascimento: "1985-05-15",
  }

  it("qualifica lead dentro dos dois limites", () => {
    const { qualificado, motivos } = qualificarCreditoConstrucao(base)
    expect(qualificado).toBe(true)
    expect(motivos).toHaveLength(0)
  })

  it("aceita exatamente 80% da obra quando o VGV comporta", () => {
    const { qualificado } = qualificarCreditoConstrucao({ ...base, valor_solicitado: 800_000 })
    expect(qualificado).toBe(true)
  })

  it("rejeita acima de 80% do custo da obra", () => {
    const { qualificado, motivos } = qualificarCreditoConstrucao({
      ...base,
      valor_solicitado: 850_000, // > 800k (80% da obra), embora < 1,5M (50% do VGV)
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("80%"))).toBe(true)
  })

  it("rejeita acima de 50% do VGV mesmo abaixo de 80% da obra", () => {
    const { qualificado, motivos } = qualificarCreditoConstrucao({
      ...base,
      vgv: 1_200_000,
      valor_solicitado: 700_000, // < 800k (80% da obra), mas > 600k (50% do VGV)
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("VGV"))).toBe(true)
  })

  it("o valor de terreno não amplia mais o limite (regra antiga de 55% da garantia)", () => {
    // Regra antiga: 55% × (10M terreno + 1M obra) = 6,05M permitiria 850k.
    // Regra nova: min(800k, 1,5M) = 800k → rejeita.
    const { qualificado } = qualificarCreditoConstrucao({
      ...base,
      valor_terreno: 10_000_000,
      valor_solicitado: 850_000,
    })
    expect(qualificado).toBe(false)
  })

  it("rejeita obra abaixo do mínimo", () => {
    const { qualificado } = qualificarCreditoConstrucao({
      ...base,
      valor_obra: 200_000,
      valor_solicitado: 150_000,
    })
    expect(qualificado).toBe(false)
  })
})

describe("Crédito de Construção — remoção da carência", () => {
  const raiz = join(__dirname, "..")
  const stepsDir = join(raiz, "components", "funnel", "steps", "credito-construcao")
  const arquivos = [
    ...readdirSync(stepsDir).map((f) => join(stepsDir, f)),
    join(raiz, "components", "landing", "ProductCards.tsx"),
    join(raiz, "lib", "config.ts"),
    join(raiz, "lib", "simulacao.ts"),
  ]

  it("nenhum arquivo do produto menciona carência", () => {
    for (const arquivo of arquivos) {
      const conteudo = readFileSync(arquivo, "utf-8")
      expect(
        /car[eê]ncia/i.test(conteudo),
        `menção a carência encontrada em ${arquivo}`
      ).toBe(false)
    }
  })
})
