"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"

export function Step5ValorDesejado({ onNext }: { onNext: () => void }) {
  const { homeEquity, setHomeEquity } = useFunnelStore()
  const valorMaximo = Math.floor(homeEquity.valor_imovel * CONFIG.homeEquity.ltv)
  const valorMinimo = CONFIG.homeEquity.valorCreditoMinimo

  const [valor, setValor] = useState(
    Math.min(homeEquity.valor_solicitado, valorMaximo) || valorMinimo
  )
  const [prazo, setPrazo] = useState(homeEquity.prazo_meses || CONFIG.homeEquity.prazoDefault)

  function handleNext() {
    setHomeEquity({ valor_solicitado: valor, prazo_meses: prazo })
    pushDataLayer("step_completed", {
      funil: "home_equity",
      step: 5,
      valor_solicitado: valor,
      prazo_meses: prazo,
    })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Quanto você precisa?</h2>
        <p className="text-muted-foreground text-sm">
          Você pode solicitar até {formatarMoeda(valorMaximo)} (60% do valor do imóvel).
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
          onValueChange={([v]) => setValor(v)}
          
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatarMoeda(valorMinimo)}</span>
          <span>{formatarMoeda(valorMaximo)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Prazo de pagamento</p>
        <div className="grid grid-cols-4 gap-2">
          {CONFIG.homeEquity.prazosDisponiveis.map((p) => (
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
              {p >= 12 ? `${p / 12}a` : `${p}m`}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {prazo >= 12 ? `${prazo / 12} anos` : `${prazo} meses`} ({prazo} parcelas)
        </p>
      </div>

      <Button
        onClick={handleNext}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[oklch(0.14_0_0)] hover:bg-[var(--gold-dark)]"
      >
        Ver simulação
      </Button>
    </div>
  )
}
