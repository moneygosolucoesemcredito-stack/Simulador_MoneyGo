"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CurrencyInput } from "@/components/funnel/CurrencyInput"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import { CONFIG, regraConstrucao } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"

const STEP = 10_000

/** Escala da régua: referência da categoria ou o valor digitado, o que for maior. */
function escalaSlider(valor: number, referencia: number): number {
  if (!Number.isFinite(valor) || valor <= referencia) return referencia
  return Math.ceil(valor / STEP) * STEP
}

export function Step2ValorObra({ onNext }: { onNext: () => void }) {
  const { creditoConstrucao, setCreditoConstrucao } = useFunnelStore()
  const regra = regraConstrucao(creditoConstrucao.categoria_terreno)
  const { valorObraMinimo, vgvMinimo } = CONFIG.creditoConstrucao

  // A categoria decide QUAL valor é pedido: em condomínio o crédito sai do
  // custo da obra (80%); fora de condomínio, do VGV do imóvel pronto (50%).
  const porObra = regra.base === "obra"
  const minimo = porObra ? valorObraMinimo : vgvMinimo
  const referencia = porObra ? 20_000_000 : 40_000_000

  const [valor, setValor] = useState(
    (porObra ? creditoConstrucao.valor_obra : creditoConstrucao.vgv) || minimo
  )

  const abaixoDoMinimo = valor > 0 && valor < minimo
  const sliderMax = escalaSlider(valor, referencia)

  const rotulo = porObra ? "Custo da obra" : "VGV estimado"
  const campoId = porObra ? "construcao-custo-obra" : "construcao-vgv"

  function handleNext() {
    if (valor < minimo) return
    // Só o campo da categoria é gravado; o outro segue com o valor anterior.
    setCreditoConstrucao(porObra ? { valor_obra: valor } : { vgv: valor })
    pushDataLayer("step_completed", {
      funil: "credito_construcao",
      step: 2,
      categoria_terreno: creditoConstrucao.categoria_terreno,
      ...(porObra ? { valor_obra: valor } : { vgv: valor }),
    })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {porObra ? "Qual o custo total da obra?" : "Qual o VGV estimado?"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {porObra
            ? `Informe o custo total previsto da construção conforme orçamento. Mínimo: ${formatarMoeda(minimo)}.`
            : `Informe quanto o imóvel valerá depois de construído (Valor Geral de Venda). Mínimo: ${formatarMoeda(minimo)}.`}
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
          <span className="text-4xl font-bold tracking-tight text-[var(--gold)]">
            {formatarMoeda(valor)}
          </span>
        </div>

        <div className="space-y-2">
          <Label htmlFor={campoId}>{rotulo}</Label>
          <CurrencyInput
            id={campoId}
            value={valor}
            onChange={setValor}
            placeholder="R$ 0,00"
            min={0}
          />
          {abaixoDoMinimo ? (
            <p className="text-destructive text-xs">
              Valor abaixo do mínimo de {formatarMoeda(minimo)}.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              {porObra
                ? "Materiais, mão de obra e projeto — o crédito sai deste valor."
                : "Estimativa de venda do imóvel pronto — o crédito sai deste valor."}
            </p>
          )}
        </div>

        <Slider
          min={minimo}
          max={sliderMax}
          step={STEP}
          value={[Math.min(Math.max(valor, minimo), sliderMax)]}
          onValueChange={(vals) => setValor(Array.isArray(vals) ? vals[0] : vals)}
        />

        <div className="flex text-xs text-muted-foreground">
          <span>Mínimo {formatarMoeda(minimo)}</span>
        </div>
      </div>

      <Button
        onClick={handleNext}
        disabled={valor < minimo}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        Continuar
      </Button>
    </div>
  )
}
