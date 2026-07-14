"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularAutoEquity, formatarMoeda } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { Info } from "lucide-react"

export function Step5Resultado({ onNext }: { onNext: () => void }) {
  const { autoEquity, setAutoEquity } = useFunnelStore()
  const { taxaMensal, iofPF, iofPJ, ltv } = CONFIG.autoEquity
  const tipoPessoa = (autoEquity.tipo_pessoa || "PF") as "PF" | "PJ"

  const valorMaximo = Math.floor(autoEquity.valor_veiculo * ltv)
  const valorMinimo = 5_000
  const [valor, setValor] = useState(
    Math.min(Math.max(autoEquity.valor_solicitado || valorMinimo, valorMinimo), valorMaximo)
  )

  const resultado = useMemo(
    () =>
      calcularAutoEquity({
        valorCredito: valor,
        prazoMeses: autoEquity.prazo_meses,
        taxaMensal,
        tipoPessoa,
        iofPF,
        iofPJ,
      }),
    [valor, autoEquity.prazo_meses, taxaMensal, tipoPessoa, iofPF, iofPJ]
  )

  function handleValorChange(vals: number | readonly number[]) {
    const v = Array.isArray(vals) ? vals[0] : vals
    setValor(v)
    setAutoEquity({ valor_solicitado: v })
  }

  function handleNext() {
    pushDataLayer("step_completed", { funil: "auto_equity", step: 5, valor_solicitado: valor })
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Sua simulação está pronta!</h2>
        <p className="text-muted-foreground text-sm">
          Ajuste o valor e veja a parcela atualizar na hora.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-6 space-y-5">
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Valor do crédito</p>
            <span className="text-3xl font-bold tracking-tight text-[var(--gold)]">
              {formatarMoeda(valor)}
            </span>
          </div>

          <Slider
            min={valorMinimo}
            max={valorMaximo}
            step={1_000}
            value={[valor]}
            onValueChange={handleValorChange}
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatarMoeda(valorMinimo)}</span>
            <span>{formatarMoeda(valorMaximo)}</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="flex justify-between items-start">
          <span className="text-sm text-muted-foreground">Prazo</span>
          <span className="font-semibold">{autoEquity.prazo_meses} meses</span>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Parcela mensal</p>
          <p className="text-3xl font-bold text-[var(--gold)]">
            {formatarMoeda(resultado.parcelaInicial)}
            <span className="text-base font-normal text-muted-foreground">/mês</span>
          </p>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Condições sujeitas a análise de crédito. Valores estimados, sem compromisso.</p>
      </div>

      <Button
        onClick={handleNext}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        Quero falar com um especialista
      </Button>
    </div>
  )
}
