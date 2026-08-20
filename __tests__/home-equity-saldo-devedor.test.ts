import { describe, it, expect } from "vitest"
import {
  CONFIG,
  creditoMaximoSolicitadoHomeEquity,
  creditoTotalHomeEquity,
  saldoDevedorMaximoHomeEquity,
} from "@/lib/config"
import { qualificarHomeEquity } from "@/lib/qualificacao"
import { calcularHomeEquity } from "@/lib/simulacao"

/**
 * Home Equity com imóvel financiado (2026-08):
 *  - o valor solicitado é o que o cliente RECEBE líquido;
 *  - o saldo devedor é quitado pela instituição dentro da operação e soma por
 *    cima → crédito total = solicitado + saldo devedor;
 *  - o crédito total é o que é financiado (parcela, IOF, CET) e o que responde
 *    ao teto de LTV da tipologia;
 *  - o saldo devedor não pode passar de 40% do valor do imóvel (antes 50%).
 */

const base = {
  valor_imovel: 1_000_000,
  tipo_imovel: "casa" as const, // LTV 55% → teto de R$ 550.000
  cidade: "Joinville",
  uf: "SC",
  data_nascimento: "1985-05-15",
}

describe("Teto do saldo devedor — 40% do valor do imóvel", () => {
  it("a configuração passa a ser 40%", () => {
    expect(CONFIG.homeEquity.saldoDevedorMaximoPercentual).toBeCloseTo(0.4, 6)
    expect(saldoDevedorMaximoHomeEquity(1_000_000)).toBeCloseTo(400_000, 2)
  })

  it("aceita saldo de exatamente 40% e recusa acima disso", () => {
    const noLimite = qualificarHomeEquity({
      ...base,
      situacao: "financiado",
      saldo_devedor: 400_000,
      valor_solicitado: 150_000, // total 550.000 = 55%
    })
    expect(noLimite.qualificado).toBe(true)

    const acima = qualificarHomeEquity({
      ...base,
      situacao: "financiado",
      saldo_devedor: 400_001,
      valor_solicitado: 100_000,
    })
    expect(acima.qualificado).toBe(false)
    expect(acima.motivos.some((m) => m.includes("40%"))).toBe(true)
  })

  it("saldo de 45% deixou de ser aceito (passava na regra antiga de 50%)", () => {
    const r = qualificarHomeEquity({
      ...base,
      situacao: "financiado",
      saldo_devedor: 450_000,
      valor_solicitado: 100_000,
    })
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => m.includes("Saldo devedor"))).toBe(true)
  })
})

describe("creditoTotalHomeEquity — o saldo devedor soma ao valor pedido", () => {
  it("soma o saldo devedor ao valor solicitado", () => {
    expect(creditoTotalHomeEquity(300_000, 200_000)).toBe(500_000)
  })

  it("imóvel quitado (sem saldo) mantém o total igual ao pedido", () => {
    expect(creditoTotalHomeEquity(300_000, 0)).toBe(300_000)
    expect(creditoTotalHomeEquity(300_000)).toBe(300_000)
  })

  it("entradas inválidas ou negativas não reduzem o total", () => {
    expect(creditoTotalHomeEquity(300_000, Number.NaN)).toBe(300_000)
    expect(creditoTotalHomeEquity(300_000, -50_000)).toBe(300_000)
    expect(creditoTotalHomeEquity(Number.NaN, 200_000)).toBe(200_000)
  })
})

describe("LTV incide sobre o crédito total (opção A)", () => {
  it("o teto de 55% vale sobre solicitado + saldo devedor", () => {
    // 350.000 + 200.000 = 550.000 = exatamente 55% de 1.000.000
    const noLimite = qualificarHomeEquity({
      ...base,
      situacao: "financiado",
      saldo_devedor: 200_000,
      valor_solicitado: 350_000,
    })
    expect(noLimite.qualificado).toBe(true)
    expect(noLimite.motivos).toEqual([])

    // 350.001 + 200.000 estoura o teto por R$ 1
    const acima = qualificarHomeEquity({
      ...base,
      situacao: "financiado",
      saldo_devedor: 200_000,
      valor_solicitado: 350_001,
    })
    expect(acima.qualificado).toBe(false)
    expect(acima.motivos.some((m) => m.includes("Crédito total"))).toBe(true)
    expect(acima.motivos.some((m) => m.includes("55%"))).toBe(true)
  })

  it("um pedido que passava sem saldo devedor reprova quando há saldo", () => {
    const semSaldo = qualificarHomeEquity({
      ...base,
      situacao: "quitado",
      valor_solicitado: 500_000, // 50% — dentro do teto
    })
    expect(semSaldo.qualificado).toBe(true)

    const comSaldo = qualificarHomeEquity({
      ...base,
      situacao: "financiado",
      saldo_devedor: 200_000, // total 700.000 = 70% > 55%
      valor_solicitado: 500_000,
    })
    expect(comSaldo.qualificado).toBe(false)
  })

  it("imóvel quitado mantém a mensagem antiga, sem falar em crédito total", () => {
    const r = qualificarHomeEquity({
      ...base,
      situacao: "quitado",
      valor_solicitado: 600_000, // 60% > 55%
    })
    expect(r.qualificado).toBe(false)
    expect(r.motivos.some((m) => m.includes("Valor solicitado superior a 55%"))).toBe(true)
    expect(r.motivos.some((m) => m.includes("Crédito total"))).toBe(false)
  })

  it("saldo devedor informado em imóvel quitado é ignorado no total", () => {
    const r = qualificarHomeEquity({
      ...base,
      situacao: "quitado",
      saldo_devedor: 400_000, // resíduo de uma escolha anterior no funil
      valor_solicitado: 550_000, // 55% cheios
    })
    expect(r.qualificado).toBe(true)
  })
})

describe("creditoMaximoSolicitadoHomeEquity — quanto ainda dá para pedir", () => {
  it("desconta o saldo devedor do teto de LTV", () => {
    expect(creditoMaximoSolicitadoHomeEquity(1_000_000, "casa", 200_000)).toBeCloseTo(350_000, 2)
    expect(creditoMaximoSolicitadoHomeEquity(1_000_000, "casa", 0)).toBeCloseTo(550_000, 2)
  })

  it("respeita o LTV mais restritivo do imóvel comercial (45%)", () => {
    expect(creditoMaximoSolicitadoHomeEquity(1_000_000, "comercial", 200_000)).toBeCloseTo(
      250_000,
      2
    )
  })

  it("nunca devolve valor negativo quando o saldo esgota o teto", () => {
    expect(creditoMaximoSolicitadoHomeEquity(1_000_000, "terreno_condominio", 400_000)).toBe(0)
  })
})

describe("A parcela sai do crédito total, não do valor pedido", () => {
  const comum = {
    valorImovel: 1_000_000,
    prazoMeses: 180,
    taxaMensal: 0.0119,
    tipoPessoa: "PF" as const,
  }

  it("financiado (300k + 200k) gera a mesma parcela de um pedido de 500k quitado", () => {
    const financiado = calcularHomeEquity({
      ...comum,
      valorCredito: creditoTotalHomeEquity(300_000, 200_000),
    })
    const quitado = calcularHomeEquity({ ...comum, valorCredito: 500_000 })
    expect(financiado.price.primeiraParcela).toBeCloseTo(quitado.price.primeiraParcela, 6)
    expect(financiado.principalFinanciado).toBeCloseTo(quitado.principalFinanciado, 6)
  })

  it("a parcela do crédito total é maior que a do valor pedido isolado", () => {
    const total = calcularHomeEquity({ ...comum, valorCredito: 500_000 })
    const soPedido = calcularHomeEquity({ ...comum, valorCredito: 300_000 })
    expect(total.price.primeiraParcela).toBeGreaterThan(soPedido.price.primeiraParcela)
    expect(total.sac.primeiraParcela).toBeGreaterThan(soPedido.sac.primeiraParcela)
  })
})
