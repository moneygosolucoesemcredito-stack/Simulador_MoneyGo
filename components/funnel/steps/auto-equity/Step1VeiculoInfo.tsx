"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { pushDataLayer } from "@/components/tracking/GTM"
import { AlertCircle } from "lucide-react"
import { IMaskInput } from "react-imask"
import { cn } from "@/lib/utils"

const anoAtual = new Date().getFullYear()
const ANO_MINIMO = anoAtual - 15

export function Step1VeiculoInfo({ onNext }: { onNext: () => void }) {
  const { autoEquity, setAutoEquity } = useFunnelStore()
  const [marcaModelo, setMarcaModelo] = useState(autoEquity.marca_modelo_ano || "")
  const [ano, setAno] = useState(autoEquity.ano_veiculo || anoAtual - 2)

  const anoInvalido = ano < ANO_MINIMO || ano > anoAtual

  function handleNext() {
    if (!marcaModelo || anoInvalido) return
    setAutoEquity({ marca_modelo_ano: `${marcaModelo} ${ano}`, ano_veiculo: ano })
    pushDataLayer("step_completed", { funil: "auto_equity", step: 1 })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2 text-amber-800 text-xs">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Atendemos apenas <strong>carros de passeio</strong> nesta modalidade. Motos, caminhonetes e utilitários não são aceitos.</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Dados do veículo</h2>
        <p className="text-muted-foreground text-sm">Informe a marca, modelo e ano do veículo.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="marca-modelo">Marca e Modelo</Label>
          <Input
            id="marca-modelo"
            placeholder="Ex: Honda Civic, Toyota Corolla"
            value={marcaModelo}
            onChange={(e) => setMarcaModelo(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ano">Ano</Label>
          <IMaskInput
            id="ano"
            mask={Number}
            min={ANO_MINIMO}
            max={anoAtual}
            value={ano.toString()}
            onAccept={(val) => setAno(Number(val))}
            className={cn(
              "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              anoInvalido && ano > 0 && "border-destructive"
            )}
            placeholder={`${ANO_MINIMO} a ${anoAtual}`}
          />
          {anoInvalido && ano > 0 && (
            <p className="text-destructive text-xs">
              Aceitamos veículos de {ANO_MINIMO} a {anoAtual}.
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={handleNext}
        disabled={!marcaModelo.trim() || anoInvalido}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[oklch(0.14_0_0)] hover:bg-[var(--gold-dark)]"
      >
        Continuar
      </Button>
    </div>
  )
}
