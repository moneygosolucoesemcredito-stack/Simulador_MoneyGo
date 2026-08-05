// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest"
import { calcularSimulacao, gerarTabelasAmortizacao } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"

/**
 * O PDF do Financiamento Imobiliário passa a levar as tabelas SAC e PRICE
 * completas (uma página por sistema) e a linha "Renda necessária" no lugar de
 * "Total pago". Aqui o jsPDF/autoTable são mockados: o que se valida é o que o
 * gerador manda desenhar.
 */

const linhasDesenhadas: { head: unknown; body: unknown[] }[] = []
const paginas = { adicionadas: 0 }
const salvo = { nome: "" }

vi.mock("jspdf", () => ({
  jsPDF: class {
    internal = { pageSize: { getWidth: () => 595 } }
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    text() {}
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
    linhasDesenhadas.push({ head: opcoes.head, body: opcoes.body ?? [] })
  },
}))

// A logo é buscada via fetch; sem rede o gerador segue sem imagem.
vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sem rede")))

const PRAZO = 420
const CREDITO = 400_000
const { taxaMensal, comprometimentoRenda } = CONFIG.financiamentoImobiliario
const resultado = calcularSimulacao(CREDITO, taxaMensal, PRAZO)

beforeEach(() => {
  linhasDesenhadas.length = 0
  paginas.adicionadas = 0
})

async function gerar(comTabelas: boolean) {
  const { gerarPdfFinanciamentoImobiliario } = await import("@/lib/pdf-financiamento-imobiliario")
  await gerarPdfFinanciamentoImobiliario(resultado, {
    valorImovel: 500_000,
    valorCredito: CREDITO,
    prazoMeses: PRAZO,
    tomador: "PF",
    comprometimentoRenda,
    ...(comTabelas
      ? { tabelas: gerarTabelasAmortizacao(CREDITO, taxaMensal, PRAZO) }
      : {}),
  })
}

describe("PDF do Financiamento Imobiliário", () => {
  it("desenha resumo, comparativo e as duas tabelas completas", async () => {
    await gerar(true)

    // resumo + comparativo + SAC + PRICE
    expect(linhasDesenhadas).toHaveLength(4)
    // uma página nova para cada tabela de amortização
    expect(paginas.adicionadas).toBe(2)

    const [, comparativo, sac, price] = linhasDesenhadas
    expect(comparativo.head).toEqual([["Condição", "SAC", "PRICE"]])
    expect(sac.head).toEqual([["Nº", "Juros", "Amortização", "Parcela", "Saldo devedor"]])
    expect(price.head).toEqual([["Nº", "Juros", "Amortização", "Parcela", "Saldo devedor"]])
    expect(sac.body).toHaveLength(PRAZO)
    expect(price.body).toHaveLength(PRAZO)
    expect((sac.body[0] as string[])[0]).toBe("1")
    expect((sac.body[PRAZO - 1] as string[])[0]).toBe(String(PRAZO))
  })

  it('o comparativo traz "Renda necessária" e não "Total pago"', async () => {
    await gerar(true)
    const rotulos = (linhasDesenhadas[1].body as string[][]).map((linha) => linha[0])
    expect(rotulos).toContain("Renda necessária")
    expect(rotulos).not.toContain("Total pago")

    const renda = (linhasDesenhadas[1].body as string[][]).find((l) => l[0] === "Renda necessária")!
    // SAC parte da primeira parcela; PRICE, da parcela fixa — ambos / 30%.
    expect(renda[1]).toContain(
      (resultado.primeira_parcela_sac / comprometimentoRenda).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )
    expect(renda[2]).toContain(
      (resultado.parcela_price / comprometimentoRenda).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )
  })

  it("gera as tabelas sozinho quando a tela não as repassa", async () => {
    await gerar(false)
    const [, , sac, price] = linhasDesenhadas
    expect(sac.body).toHaveLength(PRAZO)
    expect(price.body).toHaveLength(PRAZO)
  })

  it("salva o arquivo com o nome do produto", async () => {
    await gerar(true)
    expect(salvo.nome).toMatch(/financiamento-imobiliario-\d{4}-\d{2}-\d{2}\.pdf$/)
  })
})
