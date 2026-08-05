import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import {
  CONFIG,
  CONSTRUCAO_POR_CATEGORIA,
  RATE_CONFIG,
  limiteCreditoConstrucao,
  taxaMensalConstrucao,
} from "@/lib/config"
import { qualificarCreditoConstrucao } from "@/lib/qualificacao"

const cfg = CONFIG.creditoConstrucao

describe("Crédito de Construção — taxas por categoria", () => {
  it("dentro de condomínio: 13,99% a.a. + TR", () => {
    const regra = CONSTRUCAO_POR_CATEGORIA.condominio
    expect(regra.taxa).toBeCloseTo(0.1399, 6)
    expect(regra.periodicidadeTaxa).toBe("anual")
    expect(regra.indexador).toBe("TR")
  })

  it("fora de condomínio: 1,25% a.m. + IPCA", () => {
    const regra = CONSTRUCAO_POR_CATEGORIA.fora_condominio
    expect(regra.taxa).toBeCloseTo(0.0125, 6)
    expect(regra.periodicidadeTaxa).toBe("mensal")
    expect(regra.indexador).toBe("IPCA")
  })

  it("modalidade é pós-fixada e a categoria default é condomínio", () => {
    expect(cfg.modalidadeTaxa).toBe("pos_fixada")
    expect(cfg.categoriaDefault).toBe("condominio")
  })

  it("não existem mais o seletor TR/IPCA nem a taxa única antiga", () => {
    expect("taxas" in cfg).toBe(false)
    expect("indexadorDefault" in cfg).toBe(false)
    expect("taxaMensal" in cfg).toBe(false)
  })

  it("a faixa do operador comporta a menor taxa mensal ofertada", () => {
    expect(RATE_CONFIG.credito_construcao.min).toBeLessThanOrEqual(
      taxaMensalConstrucao("condominio")
    )
    expect(RATE_CONFIG.credito_construcao.max).toBeGreaterThanOrEqual(
      taxaMensalConstrucao("fora_condominio")
    )
  })
})

describe("Crédito de Construção — teto de crédito por categoria", () => {
  const valores = { valorObra: 1_000_000, vgv: 3_000_000 }

  it("dentro de condomínio usa 80% do custo da obra (ignora o VGV)", () => {
    expect(limiteCreditoConstrucao("condominio", valores)).toBeCloseTo(800_000, 2)
    expect(limiteCreditoConstrucao("condominio", { ...valores, vgv: 10_000_000 })).toBeCloseTo(
      800_000,
      2
    )
  })

  it("fora de condomínio usa 50% do VGV (ignora o custo da obra)", () => {
    expect(limiteCreditoConstrucao("fora_condominio", valores)).toBeCloseTo(1_500_000, 2)
    expect(
      limiteCreditoConstrucao("fora_condominio", { ...valores, valorObra: 200_000 })
    ).toBeCloseTo(1_500_000, 2)
  })

  it("a regra antiga (menor entre 80% da obra e 50% do VGV) não vale mais", () => {
    expect("ltvObra" in cfg).toBe(false)
    expect("ltvVgv" in cfg).toBe(false)
    // A regra antiga daria 800k fora de condomínio; agora são 1,5M.
    expect(limiteCreditoConstrucao("fora_condominio", valores)).toBeGreaterThan(800_000)
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
    categoria_terreno: "condominio" as const,
    tipo_pessoa: "PF" as const,
  }

  it("qualifica PF em condomínio dentro do teto", () => {
    const { qualificado, motivos } = qualificarCreditoConstrucao(base)
    expect(qualificado).toBe(true)
    expect(motivos).toHaveLength(0)
  })

  it("aceita exatamente 80% da obra em condomínio", () => {
    const { qualificado } = qualificarCreditoConstrucao({ ...base, valor_solicitado: 800_000 })
    expect(qualificado).toBe(true)
  })

  it("rejeita acima de 80% do custo da obra em condomínio", () => {
    const { qualificado, motivos } = qualificarCreditoConstrucao({
      ...base,
      valor_solicitado: 850_000,
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("80%"))).toBe(true)
  })

  it("o valor de terreno não amplia o limite", () => {
    const { qualificado } = qualificarCreditoConstrucao({
      ...base,
      valor_terreno: 10_000_000,
      valor_solicitado: 850_000,
    })
    expect(qualificado).toBe(false)
  })

  it("rejeita obra abaixo do mínimo em condomínio", () => {
    const { qualificado } = qualificarCreditoConstrucao({
      ...base,
      valor_obra: 200_000,
      valor_solicitado: 150_000,
    })
    expect(qualificado).toBe(false)
  })

  it("rejeita cidade não atendida", () => {
    const { qualificado } = qualificarCreditoConstrucao({ ...base, cidade: "Cidade Pequena" })
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
    join(raiz, "lib", "pdf-credito-construcao.ts"),
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
