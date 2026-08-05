"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CurrencyInput } from "@/components/funnel/CurrencyInput"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"

const MIN = CONFIG.homeEquity.valorImovelMinimo
// Escala inicial da régua — NÃO é teto. O campo de digitação aceita qualquer
// valor acima e o slider se estende para acompanhar o que foi informado.
const SLIDER_REFERENCIA = CONFIG.homeEquity.valorImovelSliderReferencia
const STEP = 10_000

/** Limite superior da régua: a referência ou o valor digitado, o que for maior. */
function escalaSlider(valor: number): number {
  if (!Number.isFinite(valor) || valor <= SLIDER_REFERENCIA) return SLIDER_REFERENCIA
  return Math.ceil(valor / STEP) * STEP
}

export function Step1ValorImovel({ onNext }: { onNext: () => void }) {
  const { homeEquity, setHomeEquity } = useFunnelStore()
  const [valor, setValor] = useState(homeEquity.valor_imovel || MIN)

  const abaixoDoMinimo = valor > 0 && valor < MIN
  const sliderMax = escalaSlider(valor)

  function handleNext() {
    if (valor < MIN) return
    setHomeEquity({ valor_imovel: valor })
    pushDataLayer("step_completed", { funil: "home_equity", step: 1, valor_imovel: valor })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Qual o valor do seu imóvel?</h2>
        <p className="text-muted-foreground text-sm">
          Informe o valor de mercado estimado. Valor mínimo: {formatarMoeda(MIN)} — não há valor máximo.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
          <span className="text-4xl font-bold tracking-tight text-[var(--gold)]">
            {formatarMoeda(valor)}
          </span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="he-valor-imovel">Valor do imóvel</Label>
          <CurrencyInput
            id="he-valor-imovel"
            value={valor}
            onChange={setValor}
            placeholder="R$ 0,00"
            min={0}
          />
          {abaixoDoMinimo ? (
            <p className="text-destructive text-xs">
              Valor abaixo do mínimo de {formatarMoeda(MIN)}.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Digite o valor de avaliação do imóvel — imóveis de alto padrão são aceitos, sem teto.
            </p>
          )}
        </div>

        <Slider
          min={MIN}
          max={sliderMax}
          step={STEP}
          value={[Math.min(Math.max(valor, MIN), sliderMax)]}
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
