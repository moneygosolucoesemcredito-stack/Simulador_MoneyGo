"use client"

import { useMemo, useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CurrencyInput } from "@/components/funnel/CurrencyInput"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularFinanciamentoVeiculo, formatarMoeda, formatarPercentual } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"

/** Menor valor que faz sentido financiar (evita entrada = 100% do bem). */
const FINANCIADO_MINIMO = 5_000

export function Step2EntradaPrazo({ onNext }: { onNext: () => void }) {
  const { financiamentoVeiculo, setFinanciamentoVeiculo } = useFunnelStore()
  const { taxaMensal, prazosDisponiveis, prazoDefault } = CONFIG.financiamentoVeiculo

  const valorVeiculo = financiamentoVeiculo.valor_veiculo
  const entradaMaxima = Math.max(0, valorVeiculo - FINANCIADO_MINIMO)

  const [entrada, setEntrada] = useState(
    Math.min(financiamentoVeiculo.valor_entrada, entradaMaxima)
  )
  const [prazo, setPrazo] = useState(financiamentoVeiculo.prazo_meses || prazoDefault)

  const valorFinanciado = Math.max(0, valorVeiculo - entrada)
  const entradaValida = entrada >= 0 && entrada <= entradaMaxima

  const resultado = useMemo(
    () =>
      calcularFinanciamentoVeiculo({
        valorCredito: valorFinanciado,
        taxaMensal,
        prazoMeses: prazo,
      }),
    [valorFinanciado, taxaMensal, prazo]
  )

  function handleNext() {
    if (!entradaValida) return
    setFinanciamentoVeiculo({ valor_entrada: entrada, prazo_meses: prazo })
    pushDataLayer("step_completed", {
      funil: "financiamento_veiculo",
      step: 2,
      valor_entrada: entrada,
      prazo_meses: prazo,
    })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Entrada e prazo</h2>
        <p className="text-muted-foreground text-sm">
          Financie até 100% do valor do veículo ({formatarMoeda(valorVeiculo)}). A entrada é
          opcional.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="entrada">Valor da entrada</Label>
          <span className="text-xs text-muted-foreground">
            {valorVeiculo > 0 ? Math.round((entrada / valorVeiculo) * 100) : 0}% do veículo
          </span>
        </div>
        <CurrencyInput
          id="entrada"
          value={entrada}
          onChange={(v) => setEntrada(Math.min(v, entradaMaxima))}
        />
        <Slider
          min={0}
          max={entradaMaxima}
          step={1_000}
          value={[Math.min(entrada, entradaMaxima)]}
          onValueChange={(vals) => setEntrada(Array.isArray(vals) ? vals[0] : vals)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Sem entrada</span>
          <span>{formatarMoeda(entradaMaxima)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Prazo de pagamento (até 60 meses)</p>
        <div className="grid grid-cols-5 gap-2">
          {prazosDisponiveis.map((p) => (
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

      <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Valor financiado</span>
          <span className="font-semibold">{formatarMoeda(valorFinanciado)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Parcela estimada</span>
          <span className="text-2xl font-bold tracking-tight text-[var(--gold)]">
            {formatarMoeda(resultado.parcela)}
            <span className="text-sm font-normal text-muted-foreground">/mês</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Taxa a partir de {formatarPercentual(taxaMensal)}, pré-fixada.
        </p>
      </div>

      <Button
        onClick={handleNext}
        disabled={!entradaValida || valorFinanciado < FINANCIADO_MINIMO}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
      >
        Ver simulação completa
      </Button>
    </div>
  )
}
