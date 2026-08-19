// ──────────────────────────────────────────────────────────────────────────
// Encargos da operação — o que entra na parcela além de juros e amortização.
//
// Até 2026-08 só o Home Equity modelava seguros e tarifas; Financiamento
// Imobiliário e Crédito de Construção rodavam PMT puro e devolviam parcela
// idêntica do primeiro ao último mês. Como o MIP incide sobre o saldo devedor,
// a parcela real é decrescente — o motor abaixo é o mesmo para os três
// produtos, e cada um informa os encargos que efetivamente cobra.
//
// Omitir o objeto (ou zerar os campos) devolve exatamente o PRICE/SAC puro.
// ──────────────────────────────────────────────────────────────────────────

export interface EncargosOperacao {
  /** Valor do bem dado em garantia — base de cálculo do DFI. */
  valorGarantia?: number
  /** MIP (seguro de vida): alíquota sobre o saldo devedor, ao mês. */
  mip?: number
  /** DFI (seguro do imóvel): alíquota sobre a garantia, ao mês. */
  dfi?: number
  /** Alíquota de DFI para garantias acima de `dfiLimiteGarantia`. */
  dfiAcima?: number
  /** Valor de garantia a partir do qual vale `dfiAcima`. */
  dfiLimiteGarantia?: number
  /** Tarifa de administração fixa, em R$ por mês. */
  txAdminMensal?: number
  /** Taxa de registro/cartório embutida no principal (R$). */
  taxaRegistro?: number
  /** Taxa de estruturação fixa embutida no principal (R$). */
  estruturacaoFixa?: number
  /** Taxa de estruturação como percentual do crédito, embutida no principal. */
  estruturacaoPercentual?: number
  /** Alíquota de IOF embutida no principal (gross-up). */
  iof?: number
  /** Política de comprometimento de renda usada na renda sugerida. */
  comprometimentoRenda?: number
}

const ENCARGOS_PADRAO = {
  valorGarantia: 0,
  mip: 0,
  dfi: 0,
  dfiAcima: 0,
  dfiLimiteGarantia: Number.POSITIVE_INFINITY,
  txAdminMensal: 0,
  taxaRegistro: 0,
  estruturacaoFixa: 0,
  estruturacaoPercentual: 0,
  iof: 0,
  comprometimentoRenda: 0.3,
}

type EncargosResolvidos = typeof ENCARGOS_PADRAO

function resolverEncargos(encargos: EncargosOperacao = {}): EncargosResolvidos {
  const c = { ...ENCARGOS_PADRAO, ...stripUndefined(encargos) }
  // Produto sem faixa superior de DFI declarada cobra a mesma alíquota sempre.
  if (encargos.dfiAcima === undefined) c.dfiAcima = c.dfi
  return c
}

/** Encargos que compõem a parcela mês a mês, já resolvidos para a garantia. */
export interface EncargosMensais {
  /** Alíquota do MIP sobre o saldo devedor de abertura do período. */
  mipRate: number
  /** DFI em reais por mês (garantia × alíquota da faixa). */
  dfiMensal: number
  /** Tarifa de administração fixa, em R$ por mês. */
  adm: number
}

export const SEM_ENCARGOS_MENSAIS: EncargosMensais = { mipRate: 0, dfiMensal: 0, adm: 0 }

/** Converte a política do produto nos encargos mensais da operação. */
export function encargosMensaisDe(encargos: EncargosOperacao = {}): EncargosMensais {
  const c = resolverEncargos(encargos)
  const aliquotaDfi = c.valorGarantia > c.dfiLimiteGarantia ? c.dfiAcima : c.dfi
  return {
    mipRate: c.mip,
    dfiMensal: c.valorGarantia * aliquotaDfi,
    adm: c.txAdminMensal,
  }
}

/** Custos de contratação embutidos no principal, e o IOF que incide sobre eles. */
export interface CustosContratacao {
  /** Registro + estruturação (fixa e percentual). */
  cacTotal: number
  /** IOF financiado junto — incide sobre si mesmo (gross-up). */
  iofValor: number
  /** Crédito + CAC + IOF: o valor sobre o qual as parcelas são calculadas. */
  principalFinanciado: number
}

export function custosContratacao(
  valorCredito: number,
  encargos: EncargosOperacao = {}
): CustosContratacao {
  const c = resolverEncargos(encargos)
  if (valorCredito <= 0) return { cacTotal: 0, iofValor: 0, principalFinanciado: 0 }
  const cacTotal = c.taxaRegistro + c.estruturacaoFixa + valorCredito * c.estruturacaoPercentual
  const principalFinanciado = (valorCredito + cacTotal) / (1 - c.iof)
  return {
    cacTotal,
    iofValor: principalFinanciado - (valorCredito + cacTotal),
    principalFinanciado,
  }
}

export interface ResultadoSimulacao {
  /** PMT puro do PRICE sobre o principal financiado — sem seguros e tarifas. */
  parcela_price: number
  /** Primeira parcela do PRICE já com seguros e tarifas mensais. */
  primeira_parcela_price: number
  /** Última parcela do PRICE já com seguros e tarifas mensais. */
  ultima_parcela_price: number
  primeira_parcela_sac: number
  ultima_parcela_sac: number
  taxa_mensal: number
  valor_total_price: number
  valor_total_sac: number
  /** Crédito + custos de contratação, com gross-up do IOF. */
  principal_financiado: number
  iof_valor: number
  cac_total: number
  /** CET anual de cada sistema — juros + seguros + tarifas. */
  cet_anual_price: number
  cet_anual_sac: number
  /** Tabelas parcela a parcela: base dos totais, do CET, da tela e do PDF. */
  tabelas: TabelasAmortizacao
}

/**
 * Price: fixed installment (PMT formula)
 * PMT = PV × (i × (1+i)^n) / ((1+i)^n − 1)
 */
export function calcularPrice(pv: number, taxaMensal: number, prazoMeses: number): number {
  if (prazoMeses <= 0 || taxaMensal <= 0 || pv <= 0) return 0
  const i = taxaMensal
  const n = prazoMeses
  const fator = Math.pow(1 + i, n)
  return (pv * (i * fator)) / (fator - 1)
}

/**
 * SAC: constant amortization; returns first and last installments.
 * Amortization = PV / n (constant)
 * Interest = remaining balance × i
 * First installment = PV/n + PV × i
 * Last installment  = PV/n + (PV/n) × i
 */
export function calcularSAC(
  pv: number,
  taxaMensal: number,
  prazoMeses: number
): { primeira: number; ultima: number } {
  if (prazoMeses <= 0 || taxaMensal <= 0 || pv <= 0) return { primeira: 0, ultima: 0 }
  const amortizacao = pv / prazoMeses
  const primeira = amortizacao + pv * taxaMensal
  const ultima = amortizacao + amortizacao * taxaMensal
  return { primeira, ultima }
}

const RESULTADO_VAZIO: ResultadoSimulacao = {
  parcela_price: 0,
  primeira_parcela_price: 0,
  ultima_parcela_price: 0,
  primeira_parcela_sac: 0,
  ultima_parcela_sac: 0,
  taxa_mensal: 0,
  valor_total_price: 0,
  valor_total_sac: 0,
  principal_financiado: 0,
  iof_valor: 0,
  cac_total: 0,
  cet_anual_price: 0,
  cet_anual_sac: 0,
  tabelas: { sac: [], price: [] },
}

/**
 * Simulação completa de uma operação: monta as tabelas SAC e PRICE parcela a
 * parcela sobre o principal financiado e extrai delas os números da tela.
 *
 * Sem `encargos` o comportamento é o PRICE/SAC puro de sempre — principal =
 * crédito, sem seguros, parcela do PRICE fixa do primeiro ao último mês.
 * Com `encargos` (MIP, DFI, tarifa mensal, estruturação, registro, IOF) a
 * parcela passa a ser decrescente, como já ocorre no Home Equity.
 */
export function calcularSimulacao(
  valorCredito: number,
  taxaMensal: number,
  prazoMeses: number,
  encargos: EncargosOperacao = {}
): ResultadoSimulacao {
  const { cacTotal, iofValor, principalFinanciado } = custosContratacao(valorCredito, encargos)
  const mensais = encargosMensaisDe(encargos)
  const tabelas = gerarTabelasAmortizacao(principalFinanciado, taxaMensal, prazoMeses, mensais)

  if (tabelas.price.length === 0) return { ...RESULTADO_VAZIO, taxa_mensal: taxaMensal }

  const price = resumirTabela(tabelas.price, taxaMensal)
  const sac = resumirTabela(tabelas.sac, taxaMensal)

  return {
    parcela_price: calcularPrice(principalFinanciado, taxaMensal, prazoMeses),
    primeira_parcela_price: price.primeiraParcela,
    ultima_parcela_price: price.ultimaParcela,
    primeira_parcela_sac: sac.primeiraParcela,
    ultima_parcela_sac: sac.ultimaParcela,
    taxa_mensal: taxaMensal,
    valor_total_price: price.totalPago,
    valor_total_sac: sac.totalPago,
    principal_financiado: principalFinanciado,
    iof_valor: iofValor,
    cac_total: cacTotal,
    cet_anual_price: price.cetAnual,
    cet_anual_sac: sac.cetAnual,
    tabelas,
  }
}

/**
 * Taxa mensal equivalente a uma taxa anual, em juros compostos:
 *   i_mensal = (1 + i_anual)^(1/12) − 1
 * Usada quando o produto publica a taxa ao ano (ex.: 13,99% a.a. + TR no
 * Crédito de Construção dentro de condomínio) e o cálculo roda ao mês.
 */
export function taxaMensalEquivalente(taxaAnual: number): number {
  if (!Number.isFinite(taxaAnual) || taxaAnual <= 0) return 0
  return Math.pow(1 + taxaAnual, 1 / 12) - 1
}

/** Taxa anual equivalente a uma taxa mensal: i_anual = (1 + i_mensal)^12 − 1. */
export function taxaAnualEquivalente(taxaMensal: number): number {
  if (!Number.isFinite(taxaMensal) || taxaMensal <= 0) return 0
  return Math.pow(1 + taxaMensal, 12) - 1
}

/**
 * Renda necessária para suportar a parcela dentro da política de
 * comprometimento de renda (default 30%): renda = parcela / comprometimento.
 */
export function rendaNecessaria(parcela: number, comprometimento = 0.3): number {
  if (parcela <= 0 || comprometimento <= 0) return 0
  return parcela / comprometimento
}

// ──────────────────────────────────────────────────────────────────────────
// Tabelas de amortização completas (SAC e PRICE), parcela a parcela.
// Usadas na tela de resultado e no PDF do Financiamento Imobiliário.
// ──────────────────────────────────────────────────────────────────────────

export interface ParcelaAmortizacao {
  /** Número da parcela, de 1 a prazoMeses. */
  numero: number
  /** Juros do período (saldo devedor anterior × taxa). */
  juros: number
  /** Parcela do principal amortizada no período. */
  amortizacao: number
  /** Seguros e tarifas do período (MIP + DFI + administração). */
  seguros: number
  /** Valor da parcela (juros + amortização + seguros). */
  parcela: number
  /** Saldo devedor DEPOIS do pagamento (zero na última parcela). */
  saldoDevedor: number
}

export interface TabelasAmortizacao {
  sac: ParcelaAmortizacao[]
  price: ParcelaAmortizacao[]
}

/** Entradas válidas para gerar uma tabela (evita laços com valores absurdos). */
function entradaValida(pv: number, taxaMensal: number, prazoMeses: number): boolean {
  return (
    pv > 0 &&
    taxaMensal > 0 &&
    Number.isFinite(prazoMeses) &&
    prazoMeses > 0 &&
    prazoMeses <= 600
  )
}

/**
 * Tabela SAC completa: amortização constante (PV / n) e juros decrescentes.
 * A última parcela liquida qualquer resíduo de arredondamento do saldo.
 */
export function gerarTabelaSAC(
  pv: number,
  taxaMensal: number,
  prazoMeses: number,
  encargos: EncargosMensais = SEM_ENCARGOS_MENSAIS
): ParcelaAmortizacao[] {
  if (!entradaValida(pv, taxaMensal, prazoMeses)) return []

  const amortizacaoConstante = pv / prazoMeses
  const parcelas: ParcelaAmortizacao[] = new Array(prazoMeses)
  let saldo = pv

  for (let numero = 1; numero <= prazoMeses; numero++) {
    const juros = saldo * taxaMensal
    // Seguros do período incidem sobre o saldo de ABERTURA, como os juros.
    const seguros = saldo * encargos.mipRate + encargos.dfiMensal + encargos.adm
    const amortizacao = numero === prazoMeses ? saldo : amortizacaoConstante
    saldo = numero === prazoMeses ? 0 : saldo - amortizacao
    parcelas[numero - 1] = {
      numero,
      juros,
      amortizacao,
      seguros,
      parcela: amortizacao + juros + seguros,
      saldoDevedor: saldo,
    }
  }

  return parcelas
}

/**
 * Tabela PRICE completa: PMT fixo, amortização crescente. A última parcela
 * absorve o resíduo de arredondamento para zerar o saldo devedor.
 *
 * Com encargos a parcela deixa de ser constante: o MIP cai junto com o saldo
 * devedor, então a parcela é decrescente mesmo com o PMT fixo.
 */
export function gerarTabelaPrice(
  pv: number,
  taxaMensal: number,
  prazoMeses: number,
  encargos: EncargosMensais = SEM_ENCARGOS_MENSAIS
): ParcelaAmortizacao[] {
  if (!entradaValida(pv, taxaMensal, prazoMeses)) return []

  const pmt = calcularPrice(pv, taxaMensal, prazoMeses)
  const parcelas: ParcelaAmortizacao[] = new Array(prazoMeses)
  let saldo = pv

  for (let numero = 1; numero <= prazoMeses; numero++) {
    const juros = saldo * taxaMensal
    const seguros = saldo * encargos.mipRate + encargos.dfiMensal + encargos.adm
    const ultima = numero === prazoMeses
    const amortizacao = ultima ? saldo : pmt - juros
    saldo = ultima ? 0 : saldo - amortizacao
    parcelas[numero - 1] = {
      numero,
      juros,
      amortizacao,
      seguros,
      parcela: amortizacao + juros + seguros,
      saldoDevedor: saldo,
    }
  }

  return parcelas
}

/** Gera as duas tabelas de uma vez (mesmo principal, taxa, prazo e encargos). */
export function gerarTabelasAmortizacao(
  pv: number,
  taxaMensal: number,
  prazoMeses: number,
  encargos: EncargosMensais = SEM_ENCARGOS_MENSAIS
): TabelasAmortizacao {
  return {
    sac: gerarTabelaSAC(pv, taxaMensal, prazoMeses, encargos),
    price: gerarTabelaPrice(pv, taxaMensal, prazoMeses, encargos),
  }
}

/** Resumo de uma tabela de amortização — o que a tela e o PDF exibem. */
export interface ResultadoTabela {
  primeiraParcela: number
  ultimaParcela: number
  parcelaMedia: number
  rendaSugerida: number
  cetMensal: number
  cetAnual: number
  totalPago: number
}

/** Nome histórico do resumo, quando só o Home Equity o produzia. */
export type ResultadoTabelaHE = ResultadoTabela

/** Resumo de uma tabela: extremos, média, renda sugerida, CET e total pago. */
export function resumirTabela(
  parcelas: ParcelaAmortizacao[],
  taxaMensal: number,
  comprometimentoRenda = 0.3
): ResultadoTabela {
  const n = parcelas.length
  if (n === 0) {
    return {
      primeiraParcela: 0,
      ultimaParcela: 0,
      parcelaMedia: 0,
      rendaSugerida: 0,
      cetMensal: 0,
      cetAnual: 0,
      totalPago: 0,
    }
  }

  let somaSaldo = 0
  let totalSeguros = 0
  let totalPago = 0
  for (const p of parcelas) {
    // Saldo de abertura do período = saldo após o pagamento + o que amortizou.
    somaSaldo += p.saldoDevedor + p.amortizacao
    totalSeguros += p.seguros
    totalPago += p.parcela
  }

  // CET conforme planilha do HE: (Σ seguros / Σ saldo devedor) + taxa, capitalizado.
  const cetMensal = somaSaldo > 0 ? totalSeguros / somaSaldo + taxaMensal : taxaMensal
  const primeira = parcelas[0].parcela

  return {
    primeiraParcela: primeira,
    ultimaParcela: parcelas[n - 1].parcela,
    parcelaMedia: totalPago / n,
    rendaSugerida: comprometimentoRenda > 0 ? primeira / comprometimentoRenda : 0,
    cetMensal,
    cetAnual: Math.pow(1 + cetMensal, 12) - 1,
    totalPago,
  }
}
/** Soma das parcelas de uma tabela — total efetivamente pago. */
export function totalPagoTabela(parcelas: ParcelaAmortizacao[]): number {
  return parcelas.reduce((soma, p) => soma + p.parcela, 0)
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatarPercentual(valor: number, sufixo = "% a.m."): string {
  return (valor * 100).toFixed(2).replace(".", ",") + sufixo
}

export function formatarPercentualAnual(valor: number): string {
  return formatarPercentual(valor, "% a.a.")
}

// ──────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────
// Home Equity — modelo financeiro fiel à planilha "Simulacao HE.xlsx".
// Validado contra a planilha: principal, IOF, parcela com seguro e CET batem
// centavo a centavo no cenário-base (crédito 2.750.000 / imóvel 5.000.000 /
// 1,09% a.m. / 240m / PJ → principal 2.949.959,23 · CET 14,5984% a.a.).
//
// Desde 2026-08 este produto usa o MESMO motor de `calcularSimulacao`: o que
// era exclusivo do HE (gross-up de IOF, MIP sobre o saldo, DFI, tarifa mensal
// e CET) virou `EncargosOperacao`, hoje compartilhado com o Financiamento
// Imobiliário e o Crédito de Construção.
// ──────────────────────────────────────────────────────────────────────────

export type TipoPessoa = "PF" | "PJ"
export type TabelaAmortizacao = "PRICE" | "SAC"

export interface ParametrosHomeEquity {
  valorCredito: number
  valorImovel: number
  prazoMeses: number
  taxaMensal: number
  tipoPessoa: TipoPessoa
  /** alíquotas/constantes (default = planilha) */
  estruturacaoPercentual?: number
  taxaRegistro?: number
  iofPF?: number
  iofPJ?: number
  mip?: number
  dfi?: number
  dfiAcima10M?: number
  dfiLimiteImovel?: number
  txAdminMensal?: number
  comprometimentoRenda?: number
}

export interface ResultadoHomeEquity {
  principalFinanciado: number
  iofValor: number
  cacTotal: number
  taxaMensal: number
  taxaAnual: number
  price: ResultadoTabela
  sac: ResultadoTabela
  /** Tabelas parcela a parcela, já com seguros e tarifas. */
  tabelas: TabelasAmortizacao
}

const HE_DEFAULTS = {
  // Estruturação zerada a pedido da MoneyGo (2026-07-10): a planilha traz 5%,
  // mas a taxa não deve compor o CAC em nenhuma simulação.
  estruturacaoPercentual: 0,
  taxaRegistro: 7_000,
  iofPF: 0.0338,
  iofPJ: 0.0188,
  mip: 0.00035,
  dfi: 0.000065,
  dfiAcima10M: 0.000085,
  dfiLimiteImovel: 10_000_000.01,
  txAdminMensal: 25,
  comprometimentoRenda: 0.3,
}

export function calcularHomeEquity(p: ParametrosHomeEquity): ResultadoHomeEquity {
  const c = { ...HE_DEFAULTS, ...stripUndefined(p) }
  const { valorCredito, valorImovel, prazoMeses, taxaMensal, tipoPessoa } = p

  const encargos: EncargosOperacao = {
    valorGarantia: valorImovel,
    mip: c.mip,
    dfi: c.dfi,
    dfiAcima: c.dfiAcima10M,
    dfiLimiteGarantia: c.dfiLimiteImovel,
    txAdminMensal: c.txAdminMensal,
    taxaRegistro: c.taxaRegistro,
    estruturacaoPercentual: c.estruturacaoPercentual,
    iof: tipoPessoa === "PF" ? c.iofPF : c.iofPJ,
    comprometimentoRenda: c.comprometimentoRenda,
  }

  const { cacTotal, iofValor, principalFinanciado } = custosContratacao(valorCredito, encargos)
  const tabelas = gerarTabelasAmortizacao(
    principalFinanciado,
    taxaMensal,
    prazoMeses,
    encargosMensaisDe(encargos)
  )

  return {
    principalFinanciado: tabelas.price.length > 0 ? principalFinanciado : 0,
    iofValor: tabelas.price.length > 0 ? iofValor : 0,
    cacTotal: tabelas.price.length > 0 ? cacTotal : 0,
    taxaMensal,
    taxaAnual: Math.pow(1 + taxaMensal, 12) - 1,
    price: resumirTabela(tabelas.price, taxaMensal, c.comprometimentoRenda),
    sac: resumirTabela(tabelas.sac, taxaMensal, c.comprometimentoRenda),
    tabelas,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Auto Equity — IOF financiado com juros e diluído nos 12 primeiros meses.
// O cliente recebe `valorCredito` líquido. O IOF (que incide sobre si mesmo,
// pois é financiado) vira um sub-financiamento Price à mesma taxa, com prazo
// de até 12 meses. Parcelas 1..mesesComIOF = crédito + IOF; depois só crédito.
// ──────────────────────────────────────────────────────────────────────────

export interface ParametrosAutoEquity {
  valorCredito: number
  prazoMeses: number
  taxaMensal: number
  tipoPessoa: TipoPessoa
  iofPF?: number
  iofPJ?: number
  mesesDiluicaoIOF?: number
}

export interface ResultadoAutoEquity {
  principalFinanciado: number
  iofValor: number
  /** parcela do crédito puro, meses 1..prazoMeses */
  parcelaCredito: number
  /** parcela do IOF, meses 1..mesesComIOF */
  parcelaIOF: number
  /** parcela cheia (crédito + IOF) — valor exibido ao cliente */
  parcelaInicial: number
  /** parcela após quitação do IOF, meses mesesComIOF+1..prazoMeses */
  parcelaRestante: number
  mesesComIOF: number
  totalPago: number
  taxaMensal: number
}

const AE_DEFAULTS = { iofPF: 0.0338, iofPJ: 0.0188, mesesDiluicaoIOF: 12 }

export function calcularAutoEquity(p: ParametrosAutoEquity): ResultadoAutoEquity {
  const c = { ...AE_DEFAULTS, ...stripUndefined(p) }
  const { valorCredito, prazoMeses, taxaMensal, tipoPessoa } = p

  if (valorCredito <= 0 || prazoMeses <= 0 || taxaMensal <= 0) {
    return {
      principalFinanciado: 0,
      iofValor: 0,
      parcelaCredito: 0,
      parcelaIOF: 0,
      parcelaInicial: 0,
      parcelaRestante: 0,
      mesesComIOF: 0,
      totalPago: 0,
      taxaMensal,
    }
  }

  const iofRate = tipoPessoa === "PF" ? c.iofPF : c.iofPJ
  // IOF = (crédito + IOF) × alíquota → gross-up sobre o valor líquido.
  const principalFinanciado = valorCredito / (1 - iofRate)
  const iofValor = principalFinanciado - valorCredito
  const mesesComIOF = Math.min(c.mesesDiluicaoIOF, prazoMeses)

  const parcelaCredito = calcularPrice(valorCredito, taxaMensal, prazoMeses)
  const parcelaIOF = calcularPrice(iofValor, taxaMensal, mesesComIOF)

  return {
    principalFinanciado,
    iofValor,
    parcelaCredito,
    parcelaIOF,
    parcelaInicial: parcelaCredito + parcelaIOF,
    parcelaRestante: parcelaCredito,
    mesesComIOF,
    totalPago: parcelaCredito * prazoMeses + parcelaIOF * mesesComIOF,
    taxaMensal,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Financiamento de Veículo — Price pré-fixada, prazo limitado a 60 meses.
// ──────────────────────────────────────────────────────────────────────────

export const FV_PRAZO_MAXIMO = 60

export interface ParametrosFinanciamentoVeiculo {
  valorCredito: number
  taxaMensal: number
  prazoMeses: number
}

export interface ResultadoFinanciamentoVeiculo {
  parcela: number
  totalPago: number
  taxaMensal: number
  taxaAnual: number
}

export function calcularFinanciamentoVeiculo(
  p: ParametrosFinanciamentoVeiculo
): ResultadoFinanciamentoVeiculo {
  const { valorCredito, taxaMensal, prazoMeses } = p
  const prazoValido = prazoMeses > 0 && prazoMeses <= FV_PRAZO_MAXIMO
  const parcela = prazoValido ? calcularPrice(valorCredito, taxaMensal, prazoMeses) : 0
  return {
    parcela,
    totalPago: parcela * prazoMeses,
    taxaMensal,
    taxaAnual: Math.pow(1 + taxaMensal, 12) - 1,
  }
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>
}
