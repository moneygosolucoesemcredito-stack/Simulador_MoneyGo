"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useFunnelStore } from "@/stores/funnel-store"
import { pushDataLayer } from "@/components/tracking/GTM"
import { formatarMoeda } from "@/lib/simulacao"
import { CurrencyInput } from "@/components/funnel/CurrencyInput"
import { cn } from "@/lib/utils"

type Situacao = "quitado" | "financiado"

export function Step3Situacao({ onNext }: { onNext: () => void }) {
  const { homeEquity, setHomeEquity } = useFunnelStore()
  const [situacao, setSituacao] = useState<Situacao | "">(
    homeEquity.situacao as Situacao | ""
  )
  const [saldoDevedor, setSaldoDevedor] = useState(homeEquity.saldo_devedor || 0)

  const saldoMaximo = homeEquity.valor_imovel * 0.5

  function handleNext() {
    if (!situacao) return
    setHomeEquity({ situacao, saldo_devedor: situacao === "financiado" ? saldoDevedor : 0 })
    pushDataLayer("step_completed", { funil: "home_equity", step: 3, situacao })
    onNext()
  }

  const saldoInvalido = situacao === "financiado" && saldoDevedor > saldoMaximo

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Situação do imóvel</h2>
        <p className="text-muted-foreground text-sm">
          O imóvel está quitado ou ainda tem financiamento em aberto?
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

      {situacao === "financiado" && (
        <div className="space-y-2">
          <Label htmlFor="saldo-devedor">Saldo devedor atual</Label>
          <CurrencyInput
            id="saldo-devedor"
            value={saldoDevedor}
            onChange={setSaldoDevedor}
            placeholder="R$ 0,00"
            min={0}
            max={saldoMaximo}
          />
          {saldoInvalido && (
            <p className="text-destructive text-xs">
              Saldo devedor não pode ultrapassar 50% do valor do imóvel ({formatarMoeda(saldoMaximo)}).
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Máximo permitido: {formatarMoeda(saldoMaximo)} (50% do valor do imóvel)
          </p>
        </div>
      )}

      <Button
        onClick={handleNext}
        disabled={!situacao || saldoInvalido}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        Continuar
      </Button>
    </div>
  )
}
