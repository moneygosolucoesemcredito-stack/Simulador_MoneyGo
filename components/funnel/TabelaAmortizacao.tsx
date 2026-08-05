"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { ParcelaAmortizacao } from "@/lib/simulacao"

type Sistema = "SAC" | "PRICE"

/**
 * Um único formatador para todas as células. `formatarMoeda` instancia um
 * Intl.NumberFormat a cada chamada — com 420 parcelas × 4 colunas isso vira
 * milhares de instâncias por render. Aqui o formatador é criado uma vez.
 */
const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

/** Linha já formatada — o custo de formatação fica no useMemo, não no render. */
interface LinhaFormatada {
  numero: number
  juros: string
  amortizacao: string
  parcela: string
  saldoDevedor: string
}

function formatarLinhas(parcelas: ParcelaAmortizacao[]): LinhaFormatada[] {
  return parcelas.map((p) => ({
    numero: p.numero,
    juros: BRL.format(p.juros),
    amortizacao: BRL.format(p.amortizacao),
    parcela: BRL.format(p.parcela),
    saldoDevedor: BRL.format(p.saldoDevedor),
  }))
}

interface TabelaAmortizacaoProps {
  sac: ParcelaAmortizacao[]
  price: ParcelaAmortizacao[]
  /** Sistema exibido ao abrir a tela. */
  sistemaInicial?: Sistema
}

/**
 * Tabela de amortização completa (todas as parcelas, do início ao fim), com
 * alternância entre SAC e PRICE.
 *
 * Performance: as linhas de cada sistema são formatadas uma única vez por
 * conjunto de parcelas (useMemo) e apenas o sistema selecionado é montado no
 * DOM. A rolagem fica confinada ao contêiner da tabela.
 */
export function TabelaAmortizacao({ sac, price, sistemaInicial = "SAC" }: TabelaAmortizacaoProps) {
  const [sistema, setSistema] = useState<Sistema>(sistemaInicial)

  const linhasSac = useMemo(() => formatarLinhas(sac), [sac])
  const linhasPrice = useMemo(() => formatarLinhas(price), [price])
  const linhas = sistema === "SAC" ? linhasSac : linhasPrice

  if (linhas.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">Tabela de amortização</p>
        <p className="text-xs text-muted-foreground">{linhas.length} parcelas</p>
      </div>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Sistema de amortização">
        {(["SAC", "PRICE"] as Sistema[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={sistema === s}
            onClick={() => setSistema(s)}
            className={cn(
              "rounded-lg border-2 py-2 text-sm font-semibold transition-all",
              sistema === s
                ? "border-[var(--gold)] bg-[var(--gold)]/10 text-foreground"
                : "border-border text-muted-foreground hover:border-[var(--gold)]/50"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="max-h-[420px] overflow-auto rounded-2xl border border-border">
        <table className="w-full border-collapse text-xs tabular-nums">
          <caption className="sr-only">
            Evolução das parcelas no sistema {sistema}, da primeira à última.
          </caption>
          <thead className="sticky top-0 z-10 bg-muted">
            <tr className="text-muted-foreground">
              <th scope="col" className="p-2 text-left font-medium">
                Nº
              </th>
              <th scope="col" className="p-2 text-right font-medium">
                Juros
              </th>
              <th scope="col" className="p-2 text-right font-medium">
                Amortização
              </th>
              <th scope="col" className="p-2 text-right font-medium">
                Parcela
              </th>
              <th scope="col" className="p-2 text-right font-medium">
                Saldo devedor
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.numero} className="border-t border-border/60 even:bg-muted/20">
                <th scope="row" className="p-2 text-left font-medium">
                  {linha.numero}
                </th>
                <td className="p-2 text-right">{linha.juros}</td>
                <td className="p-2 text-right">{linha.amortizacao}</td>
                <td className="p-2 text-right font-semibold">{linha.parcela}</td>
                <td className="p-2 text-right text-muted-foreground">{linha.saldoDevedor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {sistema === "SAC"
          ? "SAC: amortização constante — a parcela começa maior e cai a cada mês."
          : "PRICE: parcela fixa — os juros caem e a amortização cresce ao longo do prazo."}
      </p>
    </div>
  )
}
