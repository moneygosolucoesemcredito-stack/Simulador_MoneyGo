"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularSimulacao, formatarMoeda, formatarPercentual } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { Info } from "lucide-react"

export function Step5Resultado({ onNext }: { onNext: () => void }) {
  const { financiamentoImobiliario } = useFunnelStore()
  const { taxaMensal } = CONFIG.financiamentoImobiliario

  const resultado = useMemo(
    () => calcularSimulacao(financiamentoImobiliario.valor_solicitado, taxaMensal, financiamentoImobiliario.prazo_meses),
    [financiamentoImobiliario.valor_solicitado, financiamentoImobiliario.prazo_meses, taxaMensal]
  )

  // Timestamp da simulação — exibido ao usuário e enviado na proposta.
  const [dataSimulacao] = useState(() => new Date())

  function handleNext() {
    pushDataLayer("step_completed", { funil: "financiamento_imobiliario", step: 5 })
    onNext()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Sua simulação está pronta!</h2>
        <p className="text-muted-foreground text-sm">
          Condições estimadas para o seu financiamento imobiliário.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-6 space-y-5">
        <div className="flex justify-between items-start">
          <span className="text-sm text-muted-foreground">Valor financiado</span>
          <span className="font-semibold">{formatarMoeda(financiamentoImobiliario.valor_solicitado)}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm text-muted-foreground">Prazo</span>
          <span className="font-semibold">{financiamentoImobiliario.prazo_meses} meses ({financiamentoImobiliario.prazo_meses / 12} anos)</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm text-muted-foreground">Tomador</span>
          <span className="font-semibold">{financiamentoImobiliario.tipo_pessoa || "—"}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm text-muted-foreground">Data da simulação</span>
          <span className="font-semibold">
            {dataSimulacao.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </span>
        </div>
        <div className="h-px bg-border" />

        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tabela Price</p>
            <p className="text-3xl font-bold text-[var(--gold)]">
              {formatarMoeda(resultado.parcela_price)}
              <span className="text-base font-normal text-muted-foreground">/mês</span>
            </p>
          </div>

          <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
            <p className="font-medium">Tabela SAC (amortização constante)</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">1ª parcela</span>
              <span className="font-medium">{formatarMoeda(resultado.primeira_parcela_sac)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Última parcela</span>
              <span className="font-medium">{formatarMoeda(resultado.ultima_parcela_sac)}</span>
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa indicativa</span>
            <span className="font-medium">{formatarPercentual(taxaMensal)} + IPCA</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Taxa sujeita a análise de crédito. Modalidade pós-fixada com correção pelo IPCA.
          IOF isento para pessoa física. Valores estimados, sem compromisso.
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
