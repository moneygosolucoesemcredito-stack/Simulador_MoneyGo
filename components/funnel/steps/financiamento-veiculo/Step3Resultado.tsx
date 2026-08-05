"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import {
  calcularFinanciamentoVeiculo,
  formatarMoeda,
  formatarPercentual,
  formatarPercentualAnual,
} from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { Info } from "lucide-react"

export function Step3Resultado({ onNext }: { onNext: () => void }) {
  const { financiamentoVeiculo } = useFunnelStore()
  const { taxaMensal } = CONFIG.financiamentoVeiculo

  // O cliente informa direto o quanto quer financiar (trava de 80% no Step 2).
  const valorFinanciado = financiamentoVeiculo.valor_financiado
  const recursosProprios = Math.max(0, financiamentoVeiculo.valor_veiculo - valorFinanciado)

  const resultado = useMemo(
    () =>
      calcularFinanciamentoVeiculo({
        valorCredito: valorFinanciado,
        taxaMensal,
        prazoMeses: financiamentoVeiculo.prazo_meses,
      }),
    [valorFinanciado, taxaMensal, financiamentoVeiculo.prazo_meses]
  )

  function handleNext() {
    pushDataLayer("step_completed", {
      funil: "financiamento_veiculo",
      step: 3,
      valor_solicitado: valorFinanciado,
    })
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Sua simulação está pronta!</h2>
        <p className="text-muted-foreground text-sm">{financiamentoVeiculo.marca_modelo_ano}</p>
      </div>

      <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-6 space-y-5">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Parcela mensal</p>
          <p className="text-4xl font-bold tracking-tight text-[var(--gold)]">
            {formatarMoeda(resultado.parcela)}
            <span className="text-base font-normal text-muted-foreground">/mês</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            em {financiamentoVeiculo.prazo_meses} parcelas fixas
          </p>
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor do veículo</span>
            <span className="font-medium">{formatarMoeda(financiamentoVeiculo.valor_veiculo)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor a financiar</span>
            <span className="font-semibold text-[var(--gold)]">
              {formatarMoeda(valorFinanciado)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recursos próprios</span>
            <span className="font-medium">{formatarMoeda(recursosProprios)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxa aplicada</span>
            <span className="font-medium">
              a partir de {formatarPercentual(resultado.taxaMensal)} pré-fixada
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CET estimado</span>
            <span className="font-medium">{formatarPercentualAnual(resultado.taxaAnual)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total a pagar</span>
            <span className="font-medium">{formatarMoeda(resultado.totalPago)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          CET estimado sem tarifas adicionais. Condições sujeitas a análise de crédito. Valores
          estimados, sem compromisso.
        </p>
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
