"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"

const MIN = CONFIG.homeEquity.valorImovelMinimo
const MAX = CONFIG.homeEquity.valorImovelMaximo
const STEP = 10_000

export function Step1ValorImovel({ onNext }: { onNext: () => void }) {
  const { homeEquity, setHomeEquity } = useFunnelStore()
  const [valor, setValor] = useState(homeEquity.valor_imovel || MIN)

  function handleNext() {
    setHomeEquity({ valor_imovel: valor })
    pushDataLayer("step_completed", { funil: "home_equity", step: 1, valor_imovel: valor })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Qual o valor do seu imóvel?</h2>
        <p className="text-muted-foreground text-sm">
          Informe o valor de mercado estimado. Valor mínimo: {formatarMoeda(MIN)}.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
          <span className="text-4xl font-bold tracking-tight text-[var(--gold)]">
            {formatarMoeda(valor)}
          </span>
        </div>

        <Slider
          min={MIN}
          max={MAX}
          step={STEP}
          value={[valor]}
          onValueChange={(vals) => setValor(Array.isArray(vals) ? vals[0] : vals)}
        />

        <div className="flex text-xs text-muted-foreground">
          <span>Mínimo {formatarMoeda(MIN)}</span>
        </div>
      </div>

      <Button
        onClick={handleNext}
        disabled={valor < MIN}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        Continuar
      </Button>
    </div>
  )
}
