export interface ResultadoSimulacao {
  parcela_price: number
  primeira_parcela_sac: number
  ultima_parcela_sac: number
  taxa_mensal: number
  valor_total_price: number
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
  return {
    parcela_price,
    primeira_parcela_sac: primeira,
    ultima_parcela_sac: ultima,
    taxa_mensal: taxaMensal,
    valor_total_price: parcela_price * prazoMeses,
  }
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatarPercentual(valor: number): string {
  return (valor * 100).toFixed(2).replace(".", ",") + "% a.m."
}
