"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import { pushDataLayer } from "@/components/tracking/GTM"
import { Info } from "lucide-react"

const MIN = 100_000
const MAX = 10_000_000
const STEP = 10_000

export function Step1ValorTerreno({ onNext }: { onNext: () => void }) {
  const { creditoConstrucao, setCreditoConstrucao } = useFunnelStore()
  const [valor, setValor] = useState(creditoConstrucao.valor_terreno || MIN)

  function handleNext() {
    setCreditoConstrucao({ valor_terreno: valor })
    pushDataLayer("step_completed", { funil: "credito_construcao", step: 1, valor_terreno: valor })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Qual o valor do terreno?</h2>
        <p className="text-muted-foreground text-sm">
          Informe o valor de mercado do terreno que você já possui (quitado).
          Ele será a garantia inicial do crédito.
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

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatarMoeda(MIN)}</span>
          <span>{formatarMoeda(MAX)}</span>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>O terreno precisa estar quitado e registrado em seu nome para ser utilizado como garantia.</p>
      </div>

      <Button
        onClick={handleNext}
        disabled={valor < MIN}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[oklch(0.14_0_0)] hover:bg-[var(--gold-dark)]"
      >
        Continuar
      </Button>
    </div>
  )
}
