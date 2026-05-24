"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"

const MIN = CONFIG.financiamentoImobiliario.valorImovelMinimo
const MAX = 5_000_000
const STEP = 10_000

export function Step1ValorImovel({ onNext }: { onNext: () => void }) {
  const { financiamentoImobiliario, setFinanciamentoImobiliario } = useFunnelStore()
  const [valor, setValor] = useState(financiamentoImobiliario.valor_imovel || MIN)

  function handleNext() {
    setFinanciamentoImobiliario({ valor_imovel: valor })
    pushDataLayer("step_completed", { funil: "financiamento_imobiliario", step: 1, valor_imovel: valor })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Qual o valor do imóvel?</h2>
        <p className="text-muted-foreground text-sm">
          Informe o valor de avaliação do imóvel a ser financiado. Mínimo: {formatarMoeda(MIN)}.
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
