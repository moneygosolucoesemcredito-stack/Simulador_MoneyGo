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

export function Step2ValorFinanciar({ onNext }: { onNext: () => void }) {
  const { financiamentoVeiculo, setFinanciamentoVeiculo } = useFunnelStore()
  const { taxaMensal, prazosDisponiveis, prazoDefault, ltv } = CONFIG.financiamentoVeiculo

  const valorVeiculo = financiamentoVeiculo.valor_veiculo
  // Trava de LTV: o valor a financiar não passa de 80% do valor do veículo.
  const financiadoMaximo = Math.floor(valorVeiculo * ltv)

  const [valor, setValor] = useState(
    financiamentoVeiculo.valor_financiado > 0
      ? Math.min(financiamentoVeiculo.valor_financiado, financiadoMaximo)
      : financiadoMaximo
  )
  const [prazo, setPrazo] = useState(financiamentoVeiculo.prazo_meses || prazoDefault)

  // Sem piso de valor financiado (2026-08): o antigo mínimo de R$ 5.000 foi
  // removido. O que limita a operação é o LTV de 80% sobre o valor do bem.
  const acimaDoTeto = valor > financiadoMaximo
  const valorValido = !acimaDoTeto && valor > 0
  // O que sobra é aportado pelo cliente na contratação.
  const recursosProprios = Math.max(0, valorVeiculo - Math.min(valor, financiadoMaximo))

  const resultado = useMemo(
    () =>
      calcularFinanciamentoVeiculo({
        valorCredito: valorValido ? valor : 0,
        taxaMensal,
        prazoMeses: prazo,
      }),
    [valor, valorValido, taxaMensal, prazo]
  )

  function handleNext() {
    if (!valorValido) return
    setFinanciamentoVeiculo({ valor_financiado: valor, prazo_meses: prazo })
    pushDataLayer("step_completed", {
      funil: "financiamento_veiculo",
      step: 2,
      valor_financiado: valor,
      prazo_meses: prazo,
    })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Valor a financiar e prazo</h2>
        <p className="text-muted-foreground text-sm">
          Informe quanto você quer financiar. O limite é {Math.round(ltv * 100)}% do valor do veículo
          ({formatarMoeda(valorVeiculo)}), ou seja, até {formatarMoeda(financiadoMaximo)}.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="valor-financiar">Valor a financiar</Label>
          <span
            className={cn(
              "text-xs",
              acimaDoTeto ? "text-destructive font-medium" : "text-muted-foreground"
            )}
          >
            {valorVeiculo > 0 ? Math.round((valor / valorVeiculo) * 100) : 0}% do veículo
          </span>
        </div>
        <CurrencyInput id="valor-financiar" value={valor} onChange={setValor} />

        {acimaDoTeto ? (
          <p className="text-destructive text-xs">
            O valor a financiar não pode ultrapassar {Math.round(ltv * 100)}% do valor do veículo (
            {formatarMoeda(financiadoMaximo)}).
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Recursos próprios na contratação: {formatarMoeda(recursosProprios)}.
          </p>
        )}

        <Slider
          min={0}
          max={Math.max(financiadoMaximo, 0)}
          step={1_000}
          value={[Math.min(Math.max(valor, 0), financiadoMaximo)]}
          onValueChange={(vals) => setValor(Array.isArray(vals) ? vals[0] : vals)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatarMoeda(0)}</span>
          <span>{formatarMoeda(financiadoMaximo)}</span>
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
          <span className="text-muted-foreground">Valor a financiar</span>
          <span className={cn("font-semibold", acimaDoTeto && "text-destructive")}>
            {formatarMoeda(valor)}
          </span>
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
        disabled={!valorValido}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
      >
        Ver simulação completa
      </Button>
    </div>
  )
}
