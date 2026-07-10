"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

type Situacao = "quitado" | "financiado"

export function Step3Situacao({ onNext }: { onNext: () => void }) {
  const { autoEquity, setAutoEquity } = useFunnelStore()
  const [situacao, setSituacao] = useState<Situacao | "">(
    autoEquity.situacao as Situacao | ""
  )
  const financiado = situacao === "financiado"

  function handleNext() {
    if (!situacao || financiado) return
    setAutoEquity({ situacao })
    pushDataLayer("step_completed", { funil: "auto_equity", step: 3, situacao })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Situação do veículo</h2>
        <p className="text-muted-foreground text-sm">
          O veículo está quitado ou ainda tem financiamento em aberto?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["quitado", "financiado"] as Situacao[]).map((op) => (
          <button
            key={op}
            onClick={() => setSituacao(op)}
            className={cn(
              "rounded-xl border-2 p-5 text-sm font-medium capitalize transition-all",
              situacao === op
                ? "border-[var(--gold)] bg-[var(--gold)]/10"
                : "border-border hover:border-[var(--gold)]/50 text-muted-foreground"
            )}
          >
            {op === "quitado" ? "Quitado" : "Financiado"}
          </button>
        ))}
      </div>

      {financiado && (
        <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            No momento, aceitamos apenas <strong>veículos quitados</strong> nesta
            modalidade. Veículos com financiamento em aberto não podem seguir com a
            operação.
          </p>
        </div>
      )}

      <Button
        onClick={handleNext}
        disabled={!situacao || financiado}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
      >
        Continuar
      </Button>
    </div>
  )
}
