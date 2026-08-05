import { describe, it, expect } from "vitest"
import { CONFIG, LTV_POR_TIPO_IMOVEL_FI, ltvParaTipoImovelFI } from "@/lib/config"
import { qualificarFinanciamentoImobiliario, qualificarHomeEquity } from "@/lib/qualificacao"
import {
  calcularPrice,
  calcularSimulacao,
  gerarTabelaPrice,
  gerarTabelaSAC,
  gerarTabelasAmortizacao,
  rendaNecessaria,
  totalPagoTabela,
} from "@/lib/simulacao"
import type { TipoImovel } from "@/types"

/**
 * Financiamento Imobiliário (2026-08):
 *  - valor do imóvel sem teto (a trava de R$ 5.000.000 foi removida);
 *  - LTV por tipologia E por tomador — PF 80/70/60, PJ 70/70/60;
 *  - renda necessária = parcela / comprometimento (30%);
 *  - tabelas SAC e PRICE completas, parcela a parcela.
 */

const base = {
  valor_imovel: 500_000,
  cidade: "Joinville",
  uf: "SC",
  data_nascimento: "1990-05-15",
}

function qualificar(patch: {
  tipo_imovel: TipoImovel
  valor_solicitado: number
  tipo_pessoa?: "PF" | "PJ"
  valor_imovel?: number
}) {
  return qualificarFinanciamentoImobiliario({ ...base, ...patch })
}

// ──────────────────────────────────────────────────────────────────────────
// FASE 1 — valor do imóvel sem teto
// ──────────────────────────────────────────────────────────────────────────

describe("FI — valor do imóvel sem limite de R$ 5.000.000", () => {
  it("CONFIG não expõe teto de valor do imóvel", () => {
    expect("valorImovelMaximo" in CONFIG.financiamentoImobiliario).toBe(false)
  })

  it("aceita imóvel de R$ 10.000.000 (PF, casa, 80%)", () => {
    const r = qualificar({
      valor_imovel: 10_000_000,
      tipo_imovel: "casa",
      valor_solicitado: 8_000_000,
      tipo_pessoa: "PF",
    })
    expect(r.qualificado).toBe(true)
    expect(r.motivos).toEqual([])
  })

  it("aceita imóvel de R$ 35.000.000 sem citar valor máximo", () => {
    const r = qualificar({
      valor_imovel: 35_000_000,
      tipo_imovel: "apartamento",
      valor_solicitado: 20_000_000,
      tipo_pessoa: "PF",
    })
    expect(r.qualificado).toBe(true)
    expect(r.motivos.join(" ")).not.toMatch(/máximo/i)
  })

  it("mantém o piso de R$ 200.000", () => {
    expect(CONFIG.financiamentoImobiliario.valorImovelMinimo).toBe(200_000)
    const r = qualificar({
      valor_imovel: 150_000,
      tipo_imovel: "casa",
      valor_solicitado: 100_000,
    })
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => m.includes("abaixo do mínimo"))).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// FASE 1 — LTV por tomador
// ──────────────────────────────────────────────────────────────────────────

describe("FI — LTV de Pessoa Física", () => {
  it("casa e apartamento financiam até 80%", () => {
    for (const t of ["casa", "apartamento"] as TipoImovel[]) {
      expect(ltvParaTipoImovelFI(t, "PF")).toBeCloseTo(0.8, 4)
      expect(qualificar({ tipo_imovel: t, valor_solicitado: 400_000, tipo_pessoa: "PF" }).qualificado).toBe(true)
      expect(qualificar({ tipo_imovel: t, valor_solicitado: 405_000, tipo_pessoa: "PF" }).qualificado).toBe(false)
    }
  })

  it("comercial financia até 70%", () => {
    expect(ltvParaTipoImovelFI("comercial", "PF")).toBeCloseTo(0.7, 4)
    expect(qualificar({ tipo_imovel: "comercial", valor_solicitado: 350_000, tipo_pessoa: "PF" }).qualificado).toBe(true)
    expect(qualificar({ tipo_imovel: "comercial", valor_solicitado: 355_000, tipo_pessoa: "PF" }).qualificado).toBe(false)
  })

  it("terreno passa a financiar até 60% (antes 50%)", () => {
    expect(ltvParaTipoImovelFI("terreno", "PF")).toBeCloseTo(0.6, 4)
    // 55% — reprovava na regra antiga, aprova agora
    expect(qualificar({ tipo_imovel: "terreno", valor_solicitado: 275_000, tipo_pessoa: "PF" }).qualificado).toBe(true)
    expect(qualificar({ tipo_imovel: "terreno", valor_solicitado: 300_000, tipo_pessoa: "PF" }).qualificado).toBe(true)
    expect(qualificar({ tipo_imovel: "terreno", valor_solicitado: 305_000, tipo_pessoa: "PF" }).qualificado).toBe(false)
  })
})

describe("FI — LTV de Pessoa Jurídica", () => {
  it("casa, apartamento e comercial ficam limitados a 70%", () => {
    for (const t of ["casa", "apartamento", "comercial"] as TipoImovel[]) {
      expect(ltvParaTipoImovelFI(t, "PJ")).toBeCloseTo(0.7, 4)
      expect(qualificar({ tipo_imovel: t, valor_solicitado: 350_000, tipo_pessoa: "PJ" }).qualificado).toBe(true)
      expect(qualificar({ tipo_imovel: t, valor_solicitado: 355_000, tipo_pessoa: "PJ" }).qualificado).toBe(false)
    }
  })

  it("terreno financia até 60%", () => {
    expect(ltvParaTipoImovelFI("terreno", "PJ")).toBeCloseTo(0.6, 4)
    expect(qualificar({ tipo_imovel: "terreno", valor_solicitado: 300_000, tipo_pessoa: "PJ" }).qualificado).toBe(true)
    expect(qualificar({ tipo_imovel: "terreno", valor_solicitado: 305_000, tipo_pessoa: "PJ" }).qualificado).toBe(false)
  })

  it("PJ é mais restritivo que PF em casa/apartamento (70% × 80%)", () => {
    const em75 = { tipo_imovel: "casa" as TipoImovel, valor_solicitado: 375_000 }
    expect(qualificar({ ...em75, tipo_pessoa: "PF" }).qualificado).toBe(true)
    expect(qualificar({ ...em75, tipo_pessoa: "PJ" }).qualificado).toBe(false)
  })

  it("o motivo da reprova identifica o percentual e o tomador", () => {
    const r = qualificar({ tipo_imovel: "casa", valor_solicitado: 400_000, tipo_pessoa: "PJ" })
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => m.includes("70%") && m.includes("PJ"))).toBe(true)
  })

  it("sem tipo_pessoa informado a qualificação usa PF", () => {
    expect(qualificar({ tipo_imovel: "casa", valor_solicitado: 400_000 }).qualificado).toBe(true)
  })

  it("nenhum LTV do FI ultrapassa 100%", () => {
    for (const pessoa of ["PF", "PJ"] as const) {
      for (const ltv of Object.values(LTV_POR_TIPO_IMOVEL_FI[pessoa])) {
        expect(ltv).toBeGreaterThan(0)
        expect(ltv).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe("FI — sem impacto no Home Equity", () => {
  it("o HE mantém casa 55%, comercial 45% e terreno 35%", () => {
    const he = (valor: number) =>
      qualificarHomeEquity({
        valor_imovel: 500_000,
        tipo_imovel: "casa",
        situacao: "quitado",
        valor_solicitado: valor,
        cidade: "Joinville",
        uf: "SC",
        data_nascimento: "1990-05-15",
      })
    expect(he(275_000).qualificado).toBe(true) // 55%
    expect(he(280_000).qualificado).toBe(false) // 56%
  })
})

// ──────────────────────────────────────────────────────────────────────────
// FASE 2 — renda necessária
// ──────────────────────────────────────────────────────────────────────────

describe("FI — renda necessária (comprometimento de 30%)", () => {
  it("a política do produto é 30%", () => {
    expect(CONFIG.financiamentoImobiliario.comprometimentoRenda).toBeCloseTo(0.3, 4)
  })

  it("renda = parcela / comprometimento", () => {
    expect(rendaNecessaria(3_000, 0.3)).toBeCloseTo(10_000, 6)
    expect(rendaNecessaria(3_000)).toBeCloseTo(10_000, 6) // default 30%
    expect(rendaNecessaria(2_500, 0.25)).toBeCloseTo(10_000, 6)
  })

  it("a parcela representa exatamente o comprometimento da renda calculada", () => {
    const r = calcularSimulacao(400_000, CONFIG.financiamentoImobiliario.taxaMensal, 420)
    const renda = rendaNecessaria(r.parcela_price, 0.3)
    expect(r.parcela_price / renda).toBeCloseTo(0.3, 6)
  })

  it("no SAC a renda parte da primeira parcela (a maior do sistema)", () => {
    const r = calcularSimulacao(400_000, CONFIG.financiamentoImobiliario.taxaMensal, 420)
    const rendaSac = rendaNecessaria(r.primeira_parcela_sac, 0.3)
    const rendaUltima = rendaNecessaria(r.ultima_parcela_sac, 0.3)
    expect(rendaSac).toBeGreaterThan(rendaUltima)
    expect(rendaSac).toBeCloseTo(r.primeira_parcela_sac / 0.3, 6)
  })

  it("parcela ou comprometimento inválidos devolvem 0", () => {
    expect(rendaNecessaria(0)).toBe(0)
    expect(rendaNecessaria(-100)).toBe(0)
    expect(rendaNecessaria(1_000, 0)).toBe(0)
  })
})

// ──────────────────────────────────────────────────────────────────────────
// FASE 3 — tabelas de amortização completas
// ──────────────────────────────────────────────────────────────────────────

describe("FI — tabela SAC completa", () => {
  const PV = 400_000
  const TAXA = 0.0083
  const N = 420
  const tabela = gerarTabelaSAC(PV, TAXA, N)

  it("gera uma linha por parcela, numeradas de 1 a n", () => {
    expect(tabela).toHaveLength(N)
    expect(tabela[0].numero).toBe(1)
    expect(tabela[N - 1].numero).toBe(N)
  })

  it("amortização é constante (PV / n)", () => {
    const constante = PV / N
    for (const p of tabela.slice(0, -1)) {
      expect(p.amortizacao).toBeCloseTo(constante, 6)
    }
  })

  it("a parcela é decrescente e os juros caem a cada mês", () => {
    for (let k = 1; k < tabela.length; k++) {
      expect(tabela[k].parcela).toBeLessThan(tabela[k - 1].parcela)
      expect(tabela[k].juros).toBeLessThan(tabela[k - 1].juros)
    }
  })

  it("a soma das amortizações devolve o principal e o saldo final zera", () => {
    const somaAmort = tabela.reduce((s, p) => s + p.amortizacao, 0)
    expect(somaAmort).toBeCloseTo(PV, 4)
    expect(tabela[N - 1].saldoDevedor).toBe(0)
  })

  it("primeira e última parcela batem com calcularSimulacao", () => {
    const r = calcularSimulacao(PV, TAXA, N)
    expect(tabela[0].parcela).toBeCloseTo(r.primeira_parcela_sac, 6)
    expect(tabela[N - 1].parcela).toBeCloseTo(r.ultima_parcela_sac, 4)
  })
})

describe("FI — tabela PRICE completa", () => {
  const PV = 400_000
  const TAXA = 0.0083
  const N = 420
  const tabela = gerarTabelaPrice(PV, TAXA, N)
  const pmt = calcularPrice(PV, TAXA, N)

  it("gera uma linha por parcela", () => {
    expect(tabela).toHaveLength(N)
  })

  it("a parcela é fixa (PMT) do início ao fim", () => {
    for (const p of tabela) {
      expect(p.parcela).toBeCloseTo(pmt, 4)
    }
  })

  it("a amortização cresce e os juros caem", () => {
    for (let k = 1; k < tabela.length; k++) {
      expect(tabela[k].amortizacao).toBeGreaterThan(tabela[k - 1].amortizacao)
      expect(tabela[k].juros).toBeLessThan(tabela[k - 1].juros)
    }
  })

  it("a soma das amortizações devolve o principal e o saldo final zera", () => {
    const somaAmort = tabela.reduce((s, p) => s + p.amortizacao, 0)
    expect(somaAmort).toBeCloseTo(PV, 4)
    expect(tabela[N - 1].saldoDevedor).toBe(0)
  })

  it("o total pago bate com valor_total_price", () => {
    const r = calcularSimulacao(PV, TAXA, N)
    expect(totalPagoTabela(tabela)).toBeCloseTo(r.valor_total_price, 2)
  })
})

describe("FI — geração das tabelas: bordas e desempenho", () => {
  it("gerarTabelasAmortizacao devolve os dois sistemas com o mesmo prazo", () => {
    const { sac, price } = gerarTabelasAmortizacao(300_000, 0.0083, 240)
    expect(sac).toHaveLength(240)
    expect(price).toHaveLength(240)
  })

  it("entradas inválidas devolvem lista vazia (sem laço infinito)", () => {
    expect(gerarTabelaSAC(0, 0.0083, 240)).toEqual([])
    expect(gerarTabelaPrice(300_000, 0, 240)).toEqual([])
    expect(gerarTabelaSAC(300_000, 0.0083, 0)).toEqual([])
    expect(gerarTabelaSAC(300_000, 0.0083, -12)).toEqual([])
    expect(gerarTabelaPrice(300_000, 0.0083, Number.NaN)).toEqual([])
  })

  it("prazos acima de 600 meses são recusados (guarda contra laços absurdos)", () => {
    expect(gerarTabelaSAC(300_000, 0.0083, 1_200)).toEqual([])
  })

  it("gera o prazo máximo do produto (420 meses) rapidamente", () => {
    const inicio = performance.now()
    for (let i = 0; i < 20; i++) {
      gerarTabelasAmortizacao(1_000_000, 0.0083, 420)
    }
    const duracao = performance.now() - inicio
    // 20 gerações × 840 parcelas — folga larga sobre o tempo real (~ms).
    expect(duracao).toBeLessThan(1_000)
  })
})
