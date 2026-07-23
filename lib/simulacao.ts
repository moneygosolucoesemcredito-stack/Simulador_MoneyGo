export interface ResultadoSimulacao {
  parcela_price: number
  primeira_parcela_sac: number
  ultima_parcela_sac: number
  taxa_mensal: number
  valor_total_price: number
  valor_total_sac: number
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

export function calcularSimulacao(
  valorCredito: number,
  taxaMensal: number,
  prazoMeses: number
): ResultadoSimulacao {
  const parcela_price = calcularPrice(valorCredito, taxaMensal, prazoMeses)
  const { primeira, ultima } = calcularSAC(valorCredito, taxaMensal, prazoMeses)
  // Total pago no SAC: principal + juros. Como o saldo cai linearmente, a soma
  // dos juros é i × PV × (n+1)/2 (média aritmética dos saldos × taxa × prazo).
  const valor_total_sac =
    prazoMeses > 0 && taxaMensal > 0 && valorCredito > 0
      ? valorCredito + taxaMensal * valorCredito * ((prazoMeses + 1) / 2)
      : 0
  return {
    parcela_price,
    primeira_parcela_sac: primeira,
    ultima_parcela_sac: ultima,
    taxa_mensal: taxaMensal,
    valor_total_price: parcela_price * prazoMeses,
    valor_total_sac,
  }
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
// Home Equity — modelo financeiro fiel à planilha "Simulacao HE.xlsx".
// Validado contra a planilha: principal, IOF, parcela com seguro e CET batem
// centavo a centavo no cenário-base (crédito 2.750.000 / imóvel 5.000.000 /
// 1,09% a.m. / 240m / PJ → principal 2.949.959,23 · CET 14,5984% a.a.).
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

export interface ResultadoTabelaHE {
  primeiraParcela: number
  ultimaParcela: number
  parcelaMedia: number
  rendaSugerida: number
  cetMensal: number
  cetAnual: number
  totalPago: number
}

export interface ResultadoHomeEquity {
  principalFinanciado: number
  iofValor: number
  cacTotal: number
  taxaMensal: number
  taxaAnual: number
  price: ResultadoTabelaHE
  sac: ResultadoTabelaHE
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

function simularTabelaHE(
  principal: number,
  valorImovel: number,
  taxaMensal: number,
  prazoMeses: number,
  tabela: TabelaAmortizacao,
  c: typeof HE_DEFAULTS
): ResultadoTabelaHE {
  const i = taxaMensal
  const n = prazoMeses
  const mipRate = c.mip
  const dfiRate = valorImovel > c.dfiLimiteImovel ? c.dfiAcima10M : c.dfi
  const dfiMensal = valorImovel * dfiRate
  const adm = c.txAdminMensal

  const amortSAC = principal / n
  const pmtPrice = calcularPrice(principal, i, n)

  let saldo = principal
  let somaSaldo = 0
  let totalSeguros = 0
  let totalPago = 0
  let primeira = 0
  let ultima = 0

  for (let k = 1; k <= n; k++) {
    const juros = saldo * i
    const amort = tabela === "PRICE" ? pmtPrice - juros : amortSAC
    const parcelaBase = tabela === "PRICE" ? pmtPrice : amort + juros
    const mip = saldo * mipRate
    const seguros = mip + dfiMensal + adm
    const parcela = parcelaBase + seguros

    somaSaldo += saldo
    totalSeguros += seguros
    totalPago += parcela
    if (k === 1) primeira = parcela
    if (k === n) ultima = parcela

    saldo -= amort
  }

  // CET conforme planilha: (Σ seguros / Σ saldo devedor) + taxa, capitalizado.
  const cetMensal = somaSaldo > 0 ? totalSeguros / somaSaldo + i : i
  const cetAnual = Math.pow(1 + cetMensal, 12) - 1

  return {
    primeiraParcela: primeira,
    ultimaParcela: ultima,
    parcelaMedia: totalPago / n,
    rendaSugerida: primeira / c.comprometimentoRenda,
    cetMensal,
    cetAnual,
    totalPago,
  }
}

export function calcularHomeEquity(p: ParametrosHomeEquity): ResultadoHomeEquity {
  const c = { ...HE_DEFAULTS, ...stripUndefined(p) }
  const { valorCredito, valorImovel, prazoMeses, taxaMensal, tipoPessoa } = p

  if (valorCredito <= 0 || prazoMeses <= 0 || taxaMensal <= 0) {
    const vazio: ResultadoTabelaHE = {
      primeiraParcela: 0,
      ultimaParcela: 0,
      parcelaMedia: 0,
      rendaSugerida: 0,
      cetMensal: 0,
      cetAnual: 0,
      totalPago: 0,
    }
    return {
      principalFinanciado: 0,
      iofValor: 0,
      cacTotal: 0,
      taxaMensal,
      taxaAnual: Math.pow(1 + taxaMensal, 12) - 1,
      price: vazio,
      sac: vazio,
    }
  }

  // CAC (custos embutidos) e gross-up do IOF no principal.
  const cacTotal = c.taxaRegistro + valorCredito * c.estruturacaoPercentual
  const iofRate = tipoPessoa === "PF" ? c.iofPF : c.iofPJ
  const principalFinanciado = (valorCredito + cacTotal) / (1 - iofRate)
  const iofValor = principalFinanciado - (valorCredito + cacTotal)

  return {
    principalFinanciado,
    iofValor,
    cacTotal,
    taxaMensal,
    taxaAnual: Math.pow(1 + taxaMensal, 12) - 1,
    price: simularTabelaHE(principalFinanciado, valorImovel, taxaMensal, prazoMeses, "PRICE", c),
    sac: simularTabelaHE(principalFinanciado, valorImovel, taxaMensal, prazoMeses, "SAC", c),
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
