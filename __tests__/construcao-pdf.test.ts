// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest"
import { calcularSimulacao, gerarTabelasAmortizacao } from "@/lib/simulacao"
import { taxaMensalConstrucao } from "@/lib/config"

/**
 * O PDF do Crédito de Construção precisa levar o resumo das condições da
 * categoria e as tabelas SAC e PRICE completas. jsPDF/autoTable são mockados:
 * o que se valida é o que o gerador manda desenhar.
 */

const desenhadas: { head: unknown; body: unknown[] }[] = []
const textos: string[] = []
const paginas = { adicionadas: 0 }
const salvo = { nome: "" }

vi.mock("jspdf", () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 595 } }
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    text(conteudo: string | string[]) {
      textos.push(Array.isArray(conteudo) ? conteudo.join(" ") : String(conteudo))
    }
    addImage() {}
    splitTextToSize(t: string) {
      return [t]
    }
    addPage() {
      paginas.adicionadas++
    }
    save(nome: string) {
      salvo.nome = nome
    }
  },
}))

vi.mock("jspdf-autotable", () => ({
  autoTable: (_doc: unknown, opcoes: { head?: unknown; body?: unknown[] }) => {
    desenhadas.push({ head: opcoes.head, body: opcoes.body ?? [] })
  },
}))

vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sem rede")))

beforeEach(() => {
  desenhadas.length = 0
  textos.length = 0
  paginas.adicionadas = 0
})

async function gerar(
  categoria: "condominio" | "fora_condominio",
  opcoes: { comTabelas?: boolean } = {}
) {
  const taxa = taxaMensalConstrucao(categoria)
  const credito = categoria === "condominio" ? 800_000 : 1_500_000
  const prazo = categoria === "condominio" ? 360 : 240
  const resultado = calcularSimulacao(credito, taxa, prazo)

  const { gerarPdfCreditoConstrucao } = await import("@/lib/pdf-credito-construcao")
  await gerarPdfCreditoConstrucao(resultado, {
    categoria,
    tomador: categoria === "condominio" ? "PF" : "PJ",
    valorTerreno: 500_000,
    valorObra: 1_000_000,
    vgv: 3_000_000,
    valorCredito: credito,
    prazoMeses: prazo,
    ...(opcoes.comTabelas === false
      ? {}
      : { tabelas: gerarTabelasAmortizacao(credito, taxa, prazo) }),
  })
  return { credito, prazo, resultado }
}

/** Linhas do resumo, no formato [rótulo, valor]. */
function resumo() {
  return desenhadas[0].body as string[][]
}
function valorDoResumo(rotulo: string) {
  return resumo().find((l) => l[0] === rotulo)?.[1]
}

describe("PDF do Crédito de Construção — dentro de condomínio", () => {
  it("desenha resumo, comparativo e as duas tabelas completas", async () => {
    const { prazo } = await gerar("condominio")

    expect(desenhadas).toHaveLength(4) // resumo + comparativo + SAC + PRICE
    expect(paginas.adicionadas).toBe(2) // uma página por tabela

    const [, comparativo, sac, price] = desenhadas
    expect(comparativo.head).toEqual([["Condição", "SAC", "PRICE"]])
    expect(sac.head).toEqual([["Nº", "Juros", "Amortização", "Parcela", "Saldo devedor"]])
    expect(sac.body).toHaveLength(prazo)
    expect(price.body).toHaveLength(prazo)
    expect((price.body[prazo - 1] as string[])[0]).toBe(String(prazo))
  })

  it("o resumo traz a categoria, o tomador PF e o teto sobre a obra", async () => {
    await gerar("condominio")
    expect(valorDoResumo("Categoria do terreno")).toBe("Dentro de condomínio")
    expect(valorDoResumo("Tomador")).toBe("Pessoa Física")
    expect(valorDoResumo("Teto de crédito")).toBe("80% do custo da obra")
    expect(valorDoResumo("Custo da obra")).toBeTruthy()
    expect(valorDoResumo("VGV estimado")).toBeUndefined()
  })

  it("publica a taxa ao ano (TR) e informa o equivalente mensal", async () => {
    await gerar("condominio")
    expect(valorDoResumo("Taxa de juros")).toBe("13,99% a.a. + TR")
    expect(valorDoResumo("Taxa equivalente")).toContain("equivalente ao mês")
  })

  it("registra a liberação em tranches", async () => {
    await gerar("condominio")
    expect(valorDoResumo("Liberação")).toMatch(/5 tranches .* Habite-se/)
  })
})

describe("PDF do Crédito de Construção — fora de condomínio", () => {
  it("o resumo traz o VGV como base do teto e o tomador PJ", async () => {
    await gerar("fora_condominio")
    expect(valorDoResumo("Categoria do terreno")).toBe("Fora de condomínio")
    expect(valorDoResumo("Tomador")).toBe("Pessoa Jurídica")
    expect(valorDoResumo("Teto de crédito")).toBe("50% do VGV")
    expect(valorDoResumo("VGV estimado")).toBeTruthy()
    expect(valorDoResumo("Custo da obra")).toBeUndefined()
  })

  it("publica a taxa ao ano (IPCA) e informa o equivalente mensal", async () => {
    await gerar("fora_condominio")
    expect(valorDoResumo("Taxa de juros")).toBe("15,00% a.a. + IPCA")
    expect(valorDoResumo("Taxa equivalente")).toContain("equivalente ao mês")
  })

  it("as tabelas trazem as 240 parcelas do prazo máximo da categoria", async () => {
    await gerar("fora_condominio")
    const [, , sac, price] = desenhadas
    expect(sac.body).toHaveLength(240)
    expect(price.body).toHaveLength(240)
  })
})

describe("PDF do Crédito de Construção — fallbacks", () => {
  it("gera as tabelas sozinho quando a tela não as repassa", async () => {
    await gerar("condominio", { comTabelas: false })
    const [, , sac, price] = desenhadas
    expect(sac.body).toHaveLength(360)
    expect(price.body).toHaveLength(360)
  })

  it("salva o arquivo com o nome do produto", async () => {
    await gerar("condominio")
    expect(salvo.nome).toMatch(/credito-construcao-\d{4}-\d{2}-\d{2}\.pdf$/)
  })

  it("segue sem logo quando o fetch da imagem falha", async () => {
    await gerar("condominio")
    expect(textos.some((t) => t.includes("Simulação Crédito de Construção"))).toBe(true)
  })
})
