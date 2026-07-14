"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"

type TipoPessoa = "PF" | "PJ"

export function Step4ValorDesejado({ onNext }: { onNext: () => void }) {
  const { autoEquity, setAutoEquity } = useFunnelStore()
  const valorMaximo = Math.floor(autoEquity.valor_veiculo * CONFIG.autoEquity.ltv)
  const valorMinimo = 5_000

  const [valor, setValor] = useState(
    Math.min(autoEquity.valor_solicitado || valorMinimo, valorMaximo)
  )
  const [prazo, setPrazo] = useState(autoEquity.prazo_meses || CONFIG.autoEquity.prazoDefault)
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa | "">(
    (autoEquity.tipo_pessoa as TipoPessoa) || ""
  )

  function handleNext() {
    if (!tipoPessoa) return
    setAutoEquity({ valor_solicitado: valor, prazo_meses: prazo, tipo_pessoa: tipoPessoa })
    pushDataLayer("step_completed", {
      funil: "auto_equity",
      step: 4,
      valor_solicitado: valor,
      prazo_meses: prazo,
      tipo_pessoa: tipoPessoa,
    })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Quanto você precisa?</h2>
        <p className="text-muted-foreground text-sm">
          Você pode solicitar até {formatarMoeda(valorMaximo)}.
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
          step={1_000}
          value={[valor]}
          onValueChange={(vals) => setValor(Array.isArray(vals) ? vals[0] : vals)}
          
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatarMoeda(valorMinimo)}</span>
          <span>{formatarMoeda(valorMaximo)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Prazo de pagamento</p>
        <div className="grid grid-cols-4 gap-2">
          {CONFIG.autoEquity.prazosDisponiveis.map((p) => (
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
              {p}x
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Tipo de tomador</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { v: "PF", label: "Pessoa Física", desc: "CPF" },
            { v: "PJ", label: "Pessoa Jurídica", desc: "CNPJ" },
          ] as { v: TipoPessoa; label: string; desc: string }[]).map((op) => (
            <button
              key={op.v}
              type="button"
              onClick={() => setTipoPessoa(op.v)}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition-all",
                tipoPessoa === op.v
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : "border-border hover:border-[var(--gold)]/50"
              )}
            >
              <span className="block text-sm font-medium">{op.label}</span>
              <span className="block text-xs text-muted-foreground">{op.desc}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Usado para calcular as condições da operação.
        </p>
      </div>

      <Button
        onClick={handleNext}
        disabled={!tipoPessoa}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
      >
        Ver simulação
      </Button>
    </div>
  )
}
