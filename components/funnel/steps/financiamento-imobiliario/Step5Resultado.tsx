"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularSimulacao, formatarMoeda, formatarPercentual } from "@/lib/simulacao"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { Info, Zap, Flag, Layers, Percent, CalendarDays, Download } from "lucide-react"

type ColunaTabela = { primeira: number; ultima: number; total: number }

const LINHAS: { key: keyof ColunaTabela; label: string; icon: typeof Zap }[] = [
  { key: "primeira", label: "Primeira parcela aprox.", icon: Zap },
  { key: "ultima", label: "Última parcela aprox.", icon: Flag },
  { key: "total", label: "Total pago", icon: Layers },
]

export function Step5Resultado({ onNext }: { onNext: () => void }) {
  const { financiamentoImobiliario } = useFunnelStore()
  const { taxaMensal } = CONFIG.financiamentoImobiliario

  const resultado = useMemo(
    () => calcularSimulacao(financiamentoImobiliario.valor_solicitado, taxaMensal, financiamentoImobiliario.prazo_meses),
    [financiamentoImobiliario.valor_solicitado, financiamentoImobiliario.prazo_meses, taxaMensal]
  )

  // Timestamp da simulação — exibido ao usuário e enviado no PDF/proposta.
  const dataSimulacao = useMemo(() => new Date(), [])
  const [baixando, setBaixando] = useState(false)

  // Colunas do comparativo. No PRICE a parcela é fixa (primeira = última).
  const sac: ColunaTabela = {
    primeira: resultado.primeira_parcela_sac,
    ultima: resultado.ultima_parcela_sac,
    total: resultado.valor_total_sac,
  }
  const price: ColunaTabela = {
    primeira: resultado.parcela_price,
    ultima: resultado.parcela_price,
    total: resultado.valor_total_price,
  }

  function handleNext() {
    pushDataLayer("step_completed", { funil: "financiamento_imobiliario", step: 5 })
    onNext()
  }

  async function handleBaixarPdf() {
    setBaixando(true)
    try {
      const { gerarPdfFinanciamentoImobiliario } = await import("@/lib/pdf-financiamento-imobiliario")
      await gerarPdfFinanciamentoImobiliario(resultado, {
        valorImovel: financiamentoImobiliario.valor_imovel,
        valorCredito: financiamentoImobiliario.valor_solicitado,
        prazoMeses: financiamentoImobiliario.prazo_meses,
        tomador: (financiamentoImobiliario.tipo_pessoa || "PF") as "PF" | "PJ",
        dataSimulacao,
      })
      pushDataLayer("pdf_download", { funil: "financiamento_imobiliario" })
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Sua simulação está pronta!</h2>
        <p className="text-muted-foreground text-sm">
          Confira as condições nas tabelas SAC e PRICE.
        </p>
      </div>

      {/* Resumo da operação */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "Valor financiado", v: formatarMoeda(financiamentoImobiliario.valor_solicitado) },
          { l: "Prazo", v: `${financiamentoImobiliario.prazo_meses} meses` },
          { l: "Tomador", v: financiamentoImobiliario.tipo_pessoa || "—" },
        ].map((c) => (
          <div key={c.l} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">{c.l}</p>
            <p className="text-sm font-semibold leading-tight mt-0.5">{c.v}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Data da simulação:{" "}
        {dataSimulacao.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
      </p>

      {/* Comparativo SAC × PRICE */}
      <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/[0.04] overflow-hidden">
        <div className="grid grid-cols-[1.25fr_1fr_1fr]">
          <div className="p-3" />
          <div className="p-3 text-center border-l border-border">
            <p className="text-sm font-bold">SAC</p>
          </div>
          <div className="p-3 text-center border-l border-border">
            <p className="text-sm font-bold">PRICE</p>
          </div>
        </div>

        {LINHAS.map((linha) => {
          const Icon = linha.icon
          return (
            <div
              key={linha.key}
              className="grid grid-cols-[1.25fr_1fr_1fr] border-t border-border/70"
            >
              <div className="flex items-center gap-2 p-3">
                <Icon className="h-4 w-4 shrink-0 text-[var(--gold-dark)]" />
                <span className="text-xs leading-tight text-muted-foreground">{linha.label}</span>
              </div>
              <div className="p-3 text-center border-l border-border/70 text-sm font-semibold tabular-nums">
                {formatarMoeda(sac[linha.key])}
              </div>
              <div className="p-3 text-center border-l border-border/70 text-sm font-semibold tabular-nums">
                {formatarMoeda(price[linha.key])}
              </div>
            </div>
          )
        })}

        {/* Taxa e nº de parcelas (iguais nas duas tabelas) */}
        <div className="grid grid-cols-[1.25fr_1fr_1fr] border-t border-border/70 bg-muted/30">
          <div className="flex items-center gap-2 p-3">
            <Percent className="h-4 w-4 shrink-0 text-[var(--gold-dark)]" />
            <span className="text-xs leading-tight text-muted-foreground">Taxa de juros</span>
          </div>
          <div className="col-span-2 p-3 text-center border-l border-border/70 text-sm font-semibold">
            {formatarPercentual(resultado.taxa_mensal)} + IPCA
          </div>
        </div>
        <div className="grid grid-cols-[1.25fr_1fr_1fr] border-t border-border/70 bg-muted/30">
          <div className="flex items-center gap-2 p-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-[var(--gold-dark)]" />
            <span className="text-xs leading-tight text-muted-foreground">Quantidade de parcelas</span>
          </div>
          <div className="col-span-2 p-3 text-center border-l border-border/70 text-sm font-semibold">
            {financiamentoImobiliario.prazo_meses} meses
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleBaixarPdf}
        disabled={baixando}
        className="w-full h-11 font-medium"
      >
        <Download className="h-4 w-4 mr-2" />
        {baixando ? "Gerando PDF…" : "Baixar PDF (SAC e PRICE)"}
      </Button>

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
