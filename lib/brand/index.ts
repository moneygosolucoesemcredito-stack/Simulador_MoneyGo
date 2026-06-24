import type { Brand } from "./types"
import { moneygo } from "./moneygo"
import { capitamax } from "./capitamax"

export type { Brand } from "./types"

/** Todas as marcas suportadas, indexadas por `id`. */
export const BRANDS: Record<string, Brand> = {
  moneygo,
  capitamax,
}

// Marca ativa definida em build/runtime. `NEXT_PUBLIC_` para ficar acessível
// no client. Default: MoneyGo. Trocar para "capitamax" muda toda a identidade.
const ACTIVE = (process.env.NEXT_PUBLIC_BRAND ?? "moneygo").toLowerCase()

/** Marca ativa. Importe `BRAND` em qualquer lugar para ler dados da marca. */
export const BRAND: Brand = BRANDS[ACTIVE] ?? moneygo
