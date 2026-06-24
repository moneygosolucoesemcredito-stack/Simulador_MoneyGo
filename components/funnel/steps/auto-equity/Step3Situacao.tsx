"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"

type Situacao = "quitado" | "financiado"

export function Step3Situacao({ onNext }: { onNext: () => void }) {
  const { autoEquity, setAutoEquity } = useFunnelStore()
  const [situacao, setSituacao] = useState<Situacao | "">(
    autoEquity.situacao as Situacao | ""
  )

  function handleNext() {
    if (!situacao) return
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

      <Button
        onClick={handleNext}
        disabled={!situacao}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        Continuar
      </Button>
    </div>
  )
}
