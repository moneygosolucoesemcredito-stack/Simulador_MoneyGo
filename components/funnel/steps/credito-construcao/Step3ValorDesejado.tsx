"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import {
  CONFIG,
  limiteCreditoConstrucao,
  prazosDisponiveisConstrucao,
  regraConstrucao,
} from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"

export function Step3ValorDesejado({ onNext }: { onNext: () => void }) {
  const { creditoConstrucao, setCreditoConstrucao } = useFunnelStore()
  const categoria = creditoConstrucao.categoria_terreno
  const regra = regraConstrucao(categoria)

  // Teto por categoria: 80% do custo da obra (condomínio) ou 50% do VGV (fora).
  const valorMaximo = Math.floor(
    limiteCreditoConstrucao(categoria, {
      valorObra: creditoConstrucao.valor_obra,
      vgv: creditoConstrucao.vgv,
    })
  )
  const valorMinimo = CONFIG.creditoConstrucao.valorCreditoMinimo
  const prazos = prazosDisponiveisConstrucao(categoria)

  const [valor, setValor] = useState(
    Math.min(creditoConstrucao.valor_solicitado, valorMaximo) || valorMinimo
  )
  const [prazo, setPrazo] = useState(
    prazos.includes(creditoConstrucao.prazo_meses) ? creditoConstrucao.prazo_meses : regra.prazoDefault
  )

  // O teto pode ter caído (troca de categoria): o valor efetivo acompanha sem
  // mutar estado durante o render.
  const valorEfetivo = Math.min(Math.max(valor, valorMinimo), valorMaximo)
  const creditoViavel = valorMaximo >= valorMinimo

  function handleNext() {
    if (!creditoViavel) return
    setCreditoConstrucao({ valor_solicitado: valorEfetivo, prazo_meses: prazo })
    pushDataLayer("step_completed", {
      funil: "credito_construcao",
      step: 3,
      valor_solicitado: valorEfetivo,
      prazo_meses: prazo,
      categoria_terreno: categoria,
    })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Quanto você precisa de crédito?</h2>
        <p className="text-muted-foreground text-sm">
          Você pode solicitar até {formatarMoeda(valorMaximo)} — {Math.round(regra.ltv * 100)}%{" "}
          {regra.base === "obra" ? "do custo da obra" : "do VGV"} ({regra.rotulo.toLowerCase()}).
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
          <span className="text-4xl font-bold tracking-tight text-[var(--gold)]">
            {formatarMoeda(valorEfetivo)}
          </span>
        </div>

        <Slider
          min={valorMinimo}
          max={Math.max(valorMaximo, valorMinimo)}
          step={5_000}
          value={[valorEfetivo]}
          onValueChange={(vals) => setValor(Array.isArray(vals) ? vals[0] : vals)}
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatarMoeda(valorMinimo)}</span>
          <span>{formatarMoeda(valorMaximo)}</span>
        </div>

        {!creditoViavel && (
          <p className="text-xs text-destructive">
            O teto desta categoria ({formatarMoeda(valorMaximo)}) fica abaixo do crédito mínimo de{" "}
            {formatarMoeda(valorMinimo)}. Revise o{" "}
            {regra.base === "obra" ? "custo da obra" : "VGV"} no passo anterior.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
        <p className="font-medium">Liberação em tranches</p>
        <p className="text-muted-foreground">
          O crédito será liberado em {CONFIG.creditoConstrucao.numeroDeTranches} tranches conforme
          o avanço físico da obra.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Prazo de pagamento</p>
        <div className="grid grid-cols-3 gap-2">
          {prazos.map((p) => (
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
          {prazo / 12} anos ({prazo} parcelas) · máximo de {regra.prazoMaximo / 12} anos nesta
          modalidade
        </p>
      </div>

      <Button
        onClick={handleNext}
        disabled={!creditoViavel}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        Ver simulação
      </Button>
    </div>
  )
}
