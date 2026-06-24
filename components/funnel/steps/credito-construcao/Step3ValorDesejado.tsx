"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"
import { Info } from "lucide-react"

export function Step3ValorDesejado({ onNext }: { onNext: () => void }) {
  const { creditoConstrucao, setCreditoConstrucao } = useFunnelStore()
  const garantia = creditoConstrucao.valor_terreno + creditoConstrucao.valor_obra
  const valorMaximo = Math.floor(garantia * CONFIG.creditoConstrucao.ltv)
  const valorMinimo = CONFIG.creditoConstrucao.valorCreditoMinimo

  const [valor, setValor] = useState(
    Math.min(creditoConstrucao.valor_solicitado, valorMaximo) || valorMinimo
  )
  const [prazo, setPrazo] = useState(
    creditoConstrucao.prazo_meses || CONFIG.creditoConstrucao.prazoDefault
  )

  const valorTranche = Math.floor(valor / CONFIG.creditoConstrucao.numeroDeTranches)

  function handleNext() {
    setCreditoConstrucao({ valor_solicitado: valor, prazo_meses: prazo })
    pushDataLayer("step_completed", {
      funil: "credito_construcao",
      step: 3,
      valor_solicitado: valor,
      prazo_meses: prazo,
    })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Quanto você precisa de crédito?</h2>
        <p className="text-muted-foreground text-sm">
          Você pode solicitar até {formatarMoeda(valorMaximo)} (55% do valor total: terreno + obra).
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
          <span className="text-4xl font-bold tracking-tight text-[var(--gold)]">
            {formatarMoeda(valor)}
          </span>
        </div>

        <Slider
          min={valorMinimo}
          max={valorMaximo}
          step={5_000}
          value={[valor]}
          onValueChange={(vals) => setValor(Array.isArray(vals) ? vals[0] : vals)}
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatarMoeda(valorMinimo)}</span>
          <span>{formatarMoeda(valorMaximo)}</span>
        </div>
      </div>

      <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
        <p className="font-medium">Liberação em tranches</p>
        <p className="text-muted-foreground">
          O crédito será liberado em {CONFIG.creditoConstrucao.numeroDeTranches} tranches conforme
          o avanço físico da obra, mais o Habite-se.
          Cada tranche: ~{formatarMoeda(valorTranche)}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Prazo de pagamento</p>
        <div className="grid grid-cols-3 gap-2">
          {CONFIG.creditoConstrucao.prazosDisponiveis.map((p) => (
            <button
              key={p}
              onClick={() => setPrazo(p)}
              className={cn(
                "rounded-lg border-2 py-2.5 text-sm font-medium transition-all",
                prazo === p
                  ? "border-[var(--gold)] bg-[var(--gold)]/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-[var(--gold)]/50"
              )}
            >
              {p / 12}a
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {prazo / 12} anos ({prazo} parcelas)
        </p>
      </div>

      <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Período de carência durante as obras. A amortização começa após a conclusão da construção.</p>
      </div>

      <Button
        onClick={handleNext}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        Ver simulação
      </Button>
    </div>
  )
}
