"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { pushDataLayer } from "@/components/tracking/GTM"
import { Building2, Home, Store, TreePine } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TipoImovel } from "@/types"

const TIPOS = [
  { value: "casa" as TipoImovel, label: "Casa", icon: Home },
  { value: "apartamento" as TipoImovel, label: "Apartamento", icon: Building2 },
  { value: "comercial" as TipoImovel, label: "Comercial", icon: Store },
  { value: "terreno_condominio" as TipoImovel, label: "Terreno em Condomínio", icon: TreePine },
]

export function Step2TipoImovel({ onNext }: { onNext: () => void }) {
  const { homeEquity, setHomeEquity } = useFunnelStore()
  const [selected, setSelected] = useState<TipoImovel | "">(
    homeEquity.tipo_imovel as TipoImovel | ""
  )

  function handleNext() {
    if (!selected) return
    setHomeEquity({ tipo_imovel: selected })
    pushDataLayer("step_completed", { funil: "home_equity", step: 2, tipo_imovel: selected })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Qual o tipo do imóvel?</h2>
        <p className="text-muted-foreground text-sm">
          Selecione a categoria que melhor descreve seu imóvel.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TIPOS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setSelected(value)}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all text-sm font-medium",
              selected === value
                ? "border-[var(--gold)] bg-[var(--gold)]/10 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-[var(--gold)]/50"
            )}
          >
            <Icon className={cn("w-7 h-7", selected === value ? "text-[var(--gold)]" : "")} />
            {label}
          </button>
        ))}
      </div>

      <Button
        onClick={handleNext}
        disabled={!selected}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        Continuar
      </Button>
    </div>
  )
}
