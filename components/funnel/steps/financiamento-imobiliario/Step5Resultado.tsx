"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import {
  calcularSimulacao,
  formatarMoeda,
  formatarPercentual,
  formatarPercentualAnual,
  rendaNecessaria,
} from "@/lib/simulacao"
import { TabelaAmortizacao } from "@/components/funnel/TabelaAmortizacao"
import { CONFIG, encargosFinanciamentoImobiliario } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { Info, Zap, Flag, Wallet, Percent, CalendarDays, Download, Layers } from "lucide-react"

type ColunaTabela = { primeira: number; ultima: number; renda: number }

const LINHAS: { key: keyof ColunaTabela; label: string; icon: typeof Zap }[] = [
  { key: "primeira", label: "Primeira parcela aprox.", icon: Zap },
  { key: "ultima", label: "Última parcela aprox.", icon: Flag },
  { key: "renda", label: "Renda necessária", icon: Wallet },
]

export function Step5Resultado({ onNext }: { onNext: () => void }) {
  const { financiamentoImobiliario } = useFunnelStore()
  const { taxaMensal, comprometimentoRenda } = CONFIG.financiamentoImobiliario

  // A simulação já monta as tabelas SAC e PRICE parcela a parcela, com os
  // encargos do produto (MIP sobre o saldo devedor, DFI sobre o imóvel e
  // estruturação embutida no principal). Por isso a parcela do PRICE é
  // decrescente: o PMT é fixo, mas o MIP cai junto com o saldo.
  const resultado = useMemo(
    () =>
      calcularSimulacao(
        financiamentoImobiliario.valor_solicitado,
        taxaMensal,
        financiamentoImobiliario.prazo_meses,
        encargosFinanciamentoImobiliario(financiamentoImobiliario.valor_imovel)
      ),
    [
      financiamentoImobiliario.valor_solicitado,
      financiamentoImobiliario.valor_imovel,
      financiamentoImobiliario.prazo_meses,
      taxaMensal,
    ]
  )

  const tabelas = resultado.tabelas

  // Timestamp da simulação — exibido ao usuário e enviado no PDF/proposta.
  const dataSimulacao = useMemo(() => new Date(), [])
  const [baixando, setBaixando] = useState(false)

  // Colunas do comparativo. Em ambos os sistemas a parcela é decrescente: no
  // SAC pela amortização constante, no PRICE pelo MIP sobre o saldo devedor.
  // A renda necessária parte da MAIOR parcela do sistema (a primeira),
  // aplicando a política de comprometimento de renda (30%).
  const sac: ColunaTabela = {
    primeira: resultado.primeira_parcela_sac,
    ultima: resultado.ultima_parcela_sac,
    renda: rendaNecessaria(resultado.primeira_parcela_sac, comprometimentoRenda),
  }
  const price: ColunaTabela = {
    primeira: resultado.primeira_parcela_price,
    ultima: resultado.ultima_parcela_price,
    renda: rendaNecessaria(resultado.primeira_parcela_price, comprometimentoRenda),
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
        tabelas,
        comprometimentoRenda,
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

        {/* CET — juros + seguros + tarifas, por sistema. */}
        <div className="grid grid-cols-[1.25fr_1fr_1fr] border-t border-border/70">
          <div className="flex items-center gap-2 p-3">
            <Layers className="h-4 w-4 shrink-0 text-[var(--gold-dark)]" />
            <span className="text-xs leading-tight text-muted-foreground">Custo efetivo total</span>
          </div>
          <div className="p-3 text-center border-l border-border/70 text-sm font-semibold tabular-nums">
            {formatarPercentualAnual(resultado.cet_anual_sac)}
          </div>
          <div className="p-3 text-center border-l border-border/70 text-sm font-semibold tabular-nums">
            {formatarPercentualAnual(resultado.cet_anual_price)}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Renda necessária estimada com comprometimento de{" "}
        {Math.round(comprometimentoRenda * 100)}% da renda mensal sobre a maior parcela do sistema.
      </p>

      <div className="rounded-xl border border-border p-4 space-y-2 text-xs">
        <p className="text-sm font-semibold">Composição da parcela</p>
        <div className="flex justify-between text-muted-foreground">
          <span>Crédito solicitado</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatarMoeda(financiamentoImobiliario.valor_solicitado)}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Custos de contratação (estruturação)</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatarMoeda(resultado.cac_total)}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground border-t pt-2">
          <span>Valor financiado</span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatarMoeda(resultado.principal_financiado)}
          </span>
        </div>
        <p className="pt-1 text-muted-foreground">
          Sobre esse valor incidem os juros. Cada parcela soma ainda o MIP (seguro de vida, sobre o
          saldo devedor) e o DFI (seguro do imóvel) — como o MIP cai junto com o saldo, a parcela é
          decrescente nos dois sistemas.
        </p>
      </div>

      {/* Tabela de amortização completa — todas as parcelas, SAC e PRICE */}
      <TabelaAmortizacao sac={tabelas.sac} price={tabelas.price} />

      <Button
        type="button"
        variant="outline"
        onClick={handleBaixarPdf}
        disabled={baixando}
        className="w-full h-11 font-medium"
      >
        <Download className="h-4 w-4 mr-2" />
        {baixando ? "Gerando PDF…" : "Baixar PDF (tabelas SAC e PRICE completas)"}
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
