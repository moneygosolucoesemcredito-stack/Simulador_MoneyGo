import { describe, it, expect } from "vitest"
import {
  calcularHomeEquity,
  calcularPrice,
  calcularSimulacao,
  custosContratacao,
  encargosMensaisDe,
  gerarTabelaPrice,
  taxaAnualEquivalente,
} from "@/lib/simulacao"
import {
  CONFIG,
  baseSeguroConstrucao,
  encargosCreditoConstrucao,
  encargosFinanciamentoImobiliario,
  taxaMensalConstrucao,
} from "@/lib/config"

/**
 * Até 2026-08 o Financiamento Imobiliário e o Crédito de Construção rodavam
 * PMT puro: a parcela do PRICE saía idêntica do primeiro ao último mês, ainda
 * que o CONFIG de ambos já declarasse MIP, DFI e estruturação. Os produtos
 * passaram a usar o mesmo motor do Home Equity — o que estes testes fixam é
 * que a parcela agora é decrescente e que o PRICE puro continua disponível
 * para quem não informa encargos.
 */

describe("PRICE puro — comportamento preservado sem encargos", () => {
  const PV = 400_000
  const TAXA = 0.0083
  const N = 240

  it("sem encargos a parcela é fixa do primeiro ao último mês", () => {
    const r = calcularSimulacao(PV, TAXA, N)
    const pmt = calcularPrice(PV, TAXA, N)
    expect(r.primeira_parcela_price).toBeCloseTo(pmt, 6)
    expect(r.ultima_parcela_price).toBeCloseTo(pmt, 4)
    expect(r.primeira_parcela_price).toBeCloseTo(r.ultima_parcela_price, 4)
  })

  it("sem encargos não há custo de contratação nem IOF embutido", () => {
    const r = calcularSimulacao(PV, TAXA, N)
    expect(r.cac_total).toBe(0)
    expect(r.iof_valor).toBe(0)
    expect(r.principal_financiado).toBe(PV)
  })

  it("sem encargos o CET anual é a própria taxa capitalizada", () => {
    const r = calcularSimulacao(PV, TAXA, N)
    expect(r.cet_anual_price).toBeCloseTo(taxaAnualEquivalente(TAXA), 8)
    expect(r.cet_anual_sac).toBeCloseTo(taxaAnualEquivalente(TAXA), 8)
  })

  it("nenhuma linha da tabela carrega seguros", () => {
    const tabela = gerarTabelaPrice(PV, TAXA, N)
    expect(tabela.every((p) => p.seguros === 0)).toBe(true)
  })
})

describe("Financiamento Imobiliário — parcela real (MIP, DFI e estruturação)", () => {
  const CREDITO = 500_000
  const IMOVEL = 800_000
  const N = 240
  const { taxaMensal } = CONFIG.financiamentoImobiliario
  const r = calcularSimulacao(CREDITO, taxaMensal, N, encargosFinanciamentoImobiliario(IMOVEL))

  it("a estruturação de R$ 5.000 entra no principal financiado", () => {
    expect(r.cac_total).toBeCloseTo(CONFIG.financiamentoImobiliario.estruturacaoFixa, 2)
    expect(r.principal_financiado).toBeCloseTo(CREDITO + 5_000, 2)
  })

  it("o IOF é isento no produto, então o gross-up é neutro", () => {
    expect(r.iof_valor).toBeCloseTo(0, 6)
  })

  it("a parcela do PRICE é decrescente — o MIP acompanha o saldo devedor", () => {
    expect(r.primeira_parcela_price).toBeGreaterThan(r.ultima_parcela_price)
    const tabela = r.tabelas.price
    for (let k = 1; k < tabela.length; k++) {
      expect(tabela[k].parcela).toBeLessThan(tabela[k - 1].parcela)
    }
  })

  it("a parcela é o PMT mais MIP sobre o saldo e DFI sobre o imóvel", () => {
    const { mip, dfi } = CONFIG.financiamentoImobiliario
    const pmt = calcularPrice(r.principal_financiado, taxaMensal, N)
    const primeira = r.tabelas.price[0]
    expect(primeira.seguros).toBeCloseTo(r.principal_financiado * mip + IMOVEL * dfi, 6)
    expect(primeira.parcela).toBeCloseTo(pmt + primeira.seguros, 6)
  })

  it("a parcela real supera o PMT puro que a tela exibia antes", () => {
    const antes = calcularPrice(CREDITO, taxaMensal, N)
    expect(r.primeira_parcela_price).toBeGreaterThan(antes)
    expect(r.ultima_parcela_price).toBeGreaterThan(antes)
  })

  it("o CET anual fica acima da taxa nominal capitalizada", () => {
    expect(r.cet_anual_price).toBeGreaterThan(taxaAnualEquivalente(taxaMensal))
  })

  it("o SAC também carrega os encargos e segue decrescente", () => {
    expect(r.primeira_parcela_sac).toBeGreaterThan(r.ultima_parcela_sac)
    expect(r.tabelas.sac[0].seguros).toBeGreaterThan(0)
  })

  it("o total pago é a soma das parcelas da tabela", () => {
    const soma = r.tabelas.price.reduce((s, p) => s + p.parcela, 0)
    expect(r.valor_total_price).toBeCloseTo(soma, 6)
  })
})

describe("Crédito de Construção — estruturação de 5% e seguros", () => {
  const CREDITO = 600_000
  const N = 240
  const taxa = taxaMensalConstrucao("condominio")
  const garantia = baseSeguroConstrucao({ valorTerreno: 500_000, valorObra: 1_000_000, vgv: 2_000_000 })
  const r = calcularSimulacao(CREDITO, taxa, N, encargosCreditoConstrucao(garantia))

  it("a base do DFI é o VGV quando informado", () => {
    expect(garantia).toBe(2_000_000)
  })

  it("sem VGV a base cai para terreno + obra", () => {
    expect(baseSeguroConstrucao({ valorTerreno: 500_000, valorObra: 1_000_000, vgv: 0 })).toBe(
      1_500_000
    )
  })

  it("a estruturação de 5% do crédito entra no principal", () => {
    expect(r.cac_total).toBeCloseTo(CREDITO * 0.05, 2)
    expect(r.principal_financiado).toBeCloseTo(CREDITO * 1.05, 2)
  })

  it("a parcela do PRICE é decrescente", () => {
    expect(r.primeira_parcela_price).toBeGreaterThan(r.ultima_parcela_price)
  })

  it("a taxa da categoria continua sendo a mensal equivalente da TR", () => {
    expect(r.taxa_mensal).toBeCloseTo(taxa, 10)
    expect(r.cet_anual_price).toBeGreaterThan(taxaAnualEquivalente(taxa))
  })
})

describe("Motor compartilhado — Home Equity e calcularSimulacao", () => {
  const p = {
    valorCredito: 2_750_000,
    valorImovel: 5_000_000,
    prazoMeses: 240,
    taxaMensal: 0.0109,
    tipoPessoa: "PJ" as const,
  }

  it("o Home Equity produz os mesmos números pelo motor genérico", () => {
    const he = calcularHomeEquity(p)
    const generico = calcularSimulacao(p.valorCredito, p.taxaMensal, p.prazoMeses, {
      valorGarantia: p.valorImovel,
      mip: CONFIG.homeEquity.mip,
      dfi: CONFIG.homeEquity.dfi,
      dfiAcima: CONFIG.homeEquity.dfiAcima10M,
      dfiLimiteGarantia: CONFIG.homeEquity.dfiLimiteImovel,
      txAdminMensal: CONFIG.homeEquity.txAdminMensal,
      taxaRegistro: CONFIG.homeEquity.taxaRegistro,
      estruturacaoPercentual: CONFIG.homeEquity.estruturacaoPercentual,
      iof: CONFIG.homeEquity.iofPJ,
    })

    expect(generico.principal_financiado).toBeCloseTo(he.principalFinanciado, 6)
    expect(generico.iof_valor).toBeCloseTo(he.iofValor, 6)
    expect(generico.primeira_parcela_price).toBeCloseTo(he.price.primeiraParcela, 6)
    expect(generico.ultima_parcela_price).toBeCloseTo(he.price.ultimaParcela, 6)
    expect(generico.cet_anual_price).toBeCloseTo(he.price.cetAnual, 8)
  })

  it("o gross-up do IOF incide sobre crédito + custos de contratação", () => {
    const { cacTotal, iofValor, principalFinanciado } = custosContratacao(100_000, {
      taxaRegistro: 7_000,
      iof: 0.0338,
    })
    expect(cacTotal).toBe(7_000)
    expect(principalFinanciado).toBeCloseTo(107_000 / (1 - 0.0338), 6)
    expect(iofValor).toBeCloseTo(principalFinanciado - 107_000, 6)
  })

  it("sem faixa superior declarada o DFI usa a mesma alíquota em qualquer valor", () => {
    const base = { dfi: 0.000065 }
    expect(encargosMensaisDe({ ...base, valorGarantia: 1_000_000 }).dfiMensal).toBeCloseTo(65, 6)
    expect(encargosMensaisDe({ ...base, valorGarantia: 50_000_000 }).dfiMensal).toBeCloseTo(3_250, 6)
  })

  it("com faixa superior o DFI muda de alíquota acima do limite", () => {
    const c = { dfi: 0.000065, dfiAcima: 0.000085, dfiLimiteGarantia: 10_000_000.01 }
    expect(encargosMensaisDe({ ...c, valorGarantia: 10_000_000 }).dfiMensal).toBeCloseTo(650, 6)
    expect(encargosMensaisDe({ ...c, valorGarantia: 20_000_000 }).dfiMensal).toBeCloseTo(1_700, 6)
  })
})
