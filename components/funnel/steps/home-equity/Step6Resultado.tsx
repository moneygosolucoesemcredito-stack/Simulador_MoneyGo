"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import {
  calcularHomeEquity,
  formatarMoeda,
  formatarPercentual,
  formatarPercentualAnual,
  type ResultadoTabelaHE,
} from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"
import { Info, Zap, Flag, Wallet, Clock, Layers, Percent, CalendarDays } from "lucide-react"

const { taxaMinima, taxaMaxima, taxaPasso } = CONFIG.homeEquity

// Opções de taxa em incrementos de 0,10 p.p. (0,99% … 1,99%)
const PASSO_CHIP = 0.001
const TAXAS = Array.from(
  { length: Math.round((taxaMaxima - taxaMinima) / PASSO_CHIP) + 1 },
  (_, idx) => Number((taxaMinima + idx * PASSO_CHIP).toFixed(4))
)

const LINHAS: { key: keyof ResultadoTabelaHE; label: string; icon: typeof Zap; tipo: "moeda" | "anual" }[] = [
  { key: "primeiraParcela", label: "Primeira parcela aprox.", icon: Zap, tipo: "moeda" },
  { key: "ultimaParcela", label: "Última parcela aprox.", icon: Flag, tipo: "moeda" },
  { key: "rendaSugerida", label: "Renda sugerida", icon: Wallet, tipo: "moeda" },
  { key: "parcelaMedia", label: "Parcela média", icon: Clock, tipo: "moeda" },
  { key: "cetAnual", label: "Custo efetivo total", icon: Layers, tipo: "anual" },
]

export function Step6Resultado({ onNext }: { onNext: () => void }) {
  const { homeEquity, setHomeEquity } = useFunnelStore()
  const [taxa, setTaxa] = useState<number | null>(homeEquity.taxa_mensal || null)

  const resultado = useMemo(() => {
    if (!taxa) return null
    return calcularHomeEquity({
      valorCredito: homeEquity.valor_solicitado,
      valorImovel: homeEquity.valor_imovel,
      prazoMeses: homeEquity.prazo_meses,
      taxaMensal: taxa,
      tipoPessoa: (homeEquity.tipo_pessoa || "PF") as "PF" | "PJ",
    })
  }, [taxa, homeEquity.valor_solicitado, homeEquity.valor_imovel, homeEquity.prazo_meses, homeEquity.tipo_pessoa])

  function selecionarTaxa(t: number) {
    setTaxa(t)
    setHomeEquity({ taxa_mensal: t })
    pushDataLayer("step_interaction", { funil: "home_equity", step: 6, taxa_mensal: t })
  }

  function handleNext() {
    if (!taxa) return
    pushDataLayer("step_completed", { funil: "home_equity", step: 6, taxa_mensal: taxa })
    onNext()
  }

  function valorCelula(col: ResultadoTabelaHE, linha: (typeof LINHAS)[number]) {
    const v = col[linha.key]
    return linha.tipo === "moeda" ? formatarMoeda(v) : formatarPercentualAnual(v)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Sua simulação está pronta!</h2>
        <p className="text-muted-foreground text-sm">
          Escolha a taxa de juros para ver as condições nas tabelas SAC e PRICE.
        </p>
      </div>

      {/* Resumo da operação */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "Crédito", v: formatarMoeda(homeEquity.valor_solicitado) },
          { l: "Prazo", v: `${homeEquity.prazo_meses} meses` },
          { l: "Tomador", v: homeEquity.tipo_pessoa || "—" },
        ].map((c) => (
          <div key={c.l} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">{c.l}</p>
            <p className="text-sm font-semibold leading-tight mt-0.5">{c.v}</p>
          </div>
        ))}
      </div>

      {/* Seletor de taxa */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">Taxa de juros (a.m.)</p>
          {taxa ? (
            <p className="text-sm font-semibold text-[var(--gold-dark)]">
              {formatarPercentual(taxa)} + IPCA
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Selecione abaixo</p>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {TAXAS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => selecionarTaxa(t)}
              className={cn(
                "rounded-lg border-2 py-2 text-xs font-semibold tabular-nums transition-all",
                taxa === t
                  ? "border-[var(--gold)] bg-[var(--gold)]/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-[var(--gold)]/50"
              )}
            >
              {(t * 100).toFixed(2).replace(".", ",")}
            </button>
          ))}
        </div>
        {resultado && (
          <p className="text-xs text-muted-foreground">
            Equivale a{" "}
            <span className="font-medium text-foreground">
              {formatarPercentualAnual(resultado.taxaAnual)} + IPCA
            </span>{" "}
            (taxa efetiva anual).
          </p>
        )}
      </div>

      {/* Comparativo SAC x PRICE */}
      {resultado ? (
        <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/[0.04] overflow-hidden">
          <div className="grid grid-cols-[1.25fr_1fr_1fr]">
            <div className="p-3" />
            <div className="p-3 text-center border-l border-border">
              <p className="text-sm font-bold">SAC</p>
              <p className="text-[10px] text-muted-foreground">parcela decrescente</p>
            </div>
            <div className="p-3 text-center border-l border-border">
              <p className="text-sm font-bold">PRICE</p>
              <p className="text-[10px] text-muted-foreground">parcela fixa</p>
            </div>
          </div>

          {LINHAS.map((linha) => {
            const Icon = linha.icon
            return (
              <div
                key={linha.key}
                className="grid grid-cols-[1.25fr_1fr_1fr] border-t border-border/70"
              >
                <div className="flex items-center gap-2 p-3">
                  <Icon className="h-4 w-4 shrink-0 text-[var(--gold-dark)]" />
                  <span className="text-xs leading-tight text-muted-foreground">{linha.label}</span>
                </div>
                <div className="p-3 text-center border-l border-border/70 text-sm font-semibold tabular-nums">
                  {valorCelula(resultado.sac, linha)}
                </div>
                <div className="p-3 text-center border-l border-border/70 text-sm font-semibold tabular-nums">
                  {valorCelula(resultado.price, linha)}
                </div>
              </div>
            )
          })}

          {/* Taxa e nº de parcelas (iguais nas duas tabelas) */}
          <div className="grid grid-cols-[1.25fr_1fr_1fr] border-t border-border/70 bg-muted/30">
            <div className="flex items-center gap-2 p-3">
              <Percent className="h-4 w-4 shrink-0 text-[var(--gold-dark)]" />
              <span className="text-xs leading-tight text-muted-foreground">Taxa de juros</span>
            </div>
            <div className="col-span-2 p-3 text-center border-l border-border/70 text-sm font-semibold">
              {formatarPercentual(resultado.taxaMensal)} + IPCA
            </div>
          </div>
          <div className="grid grid-cols-[1.25fr_1fr_1fr] border-t border-border/70 bg-muted/30">
            <div className="flex items-center gap-2 p-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-[var(--gold-dark)]" />
              <span className="text-xs leading-tight text-muted-foreground">Quantidade de parcelas</span>
            </div>
            <div className="col-span-2 p-3 text-center border-l border-border/70 text-sm font-semibold">
              {homeEquity.prazo_meses} meses
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Selecione uma taxa acima para visualizar as parcelas nas tabelas SAC e PRICE.
        </div>
      )}

      <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Para fins de simulação apenas. Modalidade pós-fixada com correção por IPCA. Valores e taxas
          sujeitos à aprovação de crédito e às condições do produto vigentes no momento da contratação.
        </p>
      </div>

      <Button
        onClick={handleNext}
        disabled={!taxa}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[oklch(0.14_0_0)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
      >
        Quero falar com um especialista
      </Button>
    </div>
  )
}
