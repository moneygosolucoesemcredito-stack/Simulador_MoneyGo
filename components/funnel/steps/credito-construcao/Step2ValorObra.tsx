"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { Info } from "lucide-react"

const MIN = CONFIG.creditoConstrucao.valorObraMinimo
const MAX = 20_000_000
const STEP = 10_000

const MIN_VGV = 300_000
const MAX_VGV = 40_000_000
const STEP_VGV = 50_000

export function Step2ValorObra({ onNext }: { onNext: () => void }) {
  const { creditoConstrucao, setCreditoConstrucao } = useFunnelStore()
  const [valor, setValor] = useState(creditoConstrucao.valor_obra || MIN)
  const [vgv, setVgv] = useState(creditoConstrucao.vgv || MIN_VGV)

  function handleNext() {
    setCreditoConstrucao({ valor_obra: valor, vgv })
    pushDataLayer("step_completed", { funil: "credito_construcao", step: 2, valor_obra: valor, vgv })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Qual o valor total da obra?</h2>
        <p className="text-muted-foreground text-sm">
          Informe o custo total previsto da construção conforme orçamento. Mínimo: {formatarMoeda(MIN)}.
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

      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Valor de venda do imóvel pronto (VGV)</p>
          <p className="text-muted-foreground text-xs">
            Estimativa de quanto o imóvel valerá depois de construído. O crédito é
            limitado a 50% desse valor.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
          <span className="text-2xl font-bold tracking-tight text-[var(--gold)]">
            {formatarMoeda(vgv)}
          </span>
        </div>

        <Slider
          min={MIN_VGV}
          max={MAX_VGV}
          step={STEP_VGV}
          value={[vgv]}
          onValueChange={(vals) => setVgv(Array.isArray(vals) ? vals[0] : vals)}
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatarMoeda(MIN_VGV)}</span>
          <span>{formatarMoeda(MAX_VGV)}</span>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>O valor financiado respeita o menor entre 80% do custo da obra e 50% do VGV.</p>
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
