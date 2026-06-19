import { RATE_CONFIG, type ProdutoTaxa } from "./config"

/**
 * Converte o que o operador digita ("1,35" ou "1.35", % a.m.) na taxa em fração
 * (0,0135). Retorna `null` quando a entrada não é um número positivo válido.
 */
export function parseTaxaPercent(raw: string): number | null {
  if (!raw) return null
  const normalizado = raw.trim().replace(",", ".").replace(/[^0-9.]/g, "")
  if (!normalizado || normalizado === ".") return null
  const pct = Number(normalizado)
  if (!Number.isFinite(pct) || pct <= 0) return null
  return Number((pct / 100).toFixed(6))
}

/** A taxa (fração a.m.) está dentro da faixa permitida do produto? */
export function taxaDentroFaixa(taxa: number, produto: ProdutoTaxa): boolean {
  const { min, max } = RATE_CONFIG[produto]
  return taxa >= min - 1e-9 && taxa <= max + 1e-9
}

/** Formata a taxa em fração para string em % a.m. ("0,0135" -> "1,35"). */
export function taxaParaPercentStr(taxa: number): string {
  return (taxa * 100).toFixed(2).replace(".", ",")
}

/** Texto de ajuda da faixa, ex.: "Entre 0,99% e 1,99% a.m." */
export function descricaoFaixa(produto: ProdutoTaxa): string {
  const { min, max } = RATE_CONFIG[produto]
  return `Entre ${taxaParaPercentStr(min)}% e ${taxaParaPercentStr(max)}% a.m.`
}
