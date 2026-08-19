"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import {
  calcularSimulacao,
  formatarMoeda,
  formatarPercentual,
  formatarPercentualAnual,
  taxaAnualEquivalente,
} from "@/lib/simulacao"
import { TabelaAmortizacao } from "@/components/funnel/TabelaAmortizacao"
import {
  CONFIG,
  baseSeguroConstrucao,
  encargosCreditoConstrucao,
  regraConstrucao,
  taxaMensalConstrucao,
} from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { Info, Download } from "lucide-react"

export function Step5Resultado({ onNext }: { onNext: () => void }) {
  const { creditoConstrucao } = useFunnelStore()
  const { numeroDeTranches } = CONFIG.creditoConstrucao
  const categoria = creditoConstrucao.categoria_terreno
  const regra = regraConstrucao(categoria)

  // A taxa vem da categoria: 13,99% a.a. + TR (condomínio) ou 1,25% a.m. +
  // IPCA (fora). O cálculo roda sempre no mensal equivalente.
  const taxaMensal = useMemo(() => taxaMensalConstrucao(categoria), [categoria])
  const taxaAnual = useMemo(
    () => (regra.periodicidadeTaxa === "anual" ? regra.taxa : taxaAnualEquivalente(regra.taxa)),
    [regra]
  )

  // Valor segurado (base do DFI): o imóvel pronto, aproximado por terreno +
  // obra enquanto o VGV não é informado.
  const valorGarantia = baseSeguroConstrucao({
    valorTerreno: creditoConstrucao.valor_terreno,
    valorObra: creditoConstrucao.valor_obra,
    vgv: creditoConstrucao.vgv,
  })

  // A simulação monta as tabelas com os encargos do produto: MIP sobre o saldo
  // devedor, DFI sobre o imóvel e estruturação de 5% embutida no principal.
  // Por isso a parcela do PRICE é decrescente, e não fixa.
  const resultado = useMemo(
    () =>
      calcularSimulacao(
        creditoConstrucao.valor_solicitado,
        taxaMensal,
        creditoConstrucao.prazo_meses,
        encargosCreditoConstrucao(valorGarantia)
      ),
    [creditoConstrucao.valor_solicitado, creditoConstrucao.prazo_meses, taxaMensal, valorGarantia]
  )

  const tabelas = resultado.tabelas

  const dataSimulacao = useMemo(() => new Date(), [])
  const [baixando, setBaixando] = useState(false)

  const valorPorTranche = Math.floor(creditoConstrucao.valor_solicitado / numeroDeTranches)
  const baseDoTeto = regra.base === "obra" ? creditoConstrucao.valor_obra : creditoConstrucao.vgv

  function handleNext() {
    pushDataLayer("step_completed", {
      funil: "credito_construcao",
      step: 5,
      categoria_terreno: categoria,
      indexador: regra.indexador,
    })
    onNext()
  }

  async function handleBaixarPdf() {
    setBaixando(true)
    try {
      const { gerarPdfCreditoConstrucao } = await import("@/lib/pdf-credito-construcao")
      await gerarPdfCreditoConstrucao(resultado, {
        categoria,
        tomador: (creditoConstrucao.tipo_pessoa || "PF") as "PF" | "PJ",
        valorTerreno: creditoConstrucao.valor_terreno,
        valorObra: creditoConstrucao.valor_obra,
        vgv: creditoConstrucao.vgv,
        valorCredito: creditoConstrucao.valor_solicitado,
        prazoMeses: creditoConstrucao.prazo_meses,
        dataSimulacao,
        tabelas,
      })
      pushDataLayer("pdf_download", { funil: "credito_construcao", categoria_terreno: categoria })
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Sua simulação está pronta!</h2>
        <p className="text-muted-foreground text-sm">
          Condições estimadas para o seu crédito de construção — {regra.rotulo.toLowerCase()}.
        </p>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Data da simulação:{" "}
        {dataSimulacao.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
      </p>

      <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-6 space-y-5">
        <div className="flex justify-between items-start">
          <span className="text-sm text-muted-foreground">Categoria</span>
          <span className="font-semibold">{regra.rotulo}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm text-muted-foreground">Tomador</span>
          <span className="font-semibold">{creditoConstrucao.tipo_pessoa || "PF"}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm text-muted-foreground">Crédito total</span>
          <span className="font-semibold">{formatarMoeda(creditoConstrucao.valor_solicitado)}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm text-muted-foreground">
            {regra.base === "obra" ? "Custo da obra" : "VGV (imóvel pronto)"}
          </span>
          <span className="font-semibold">{formatarMoeda(baseDoTeto)}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm text-muted-foreground">Teto da modalidade</span>
          <span className="font-semibold">
            {Math.round(regra.ltv * 100)}% {regra.base === "obra" ? "da obra" : "do VGV"}
          </span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-sm text-muted-foreground">Prazo</span>
          <span className="font-semibold">{creditoConstrucao.prazo_meses / 12} anos</span>
        </div>
        <div className="h-px bg-border" />

        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Tabela Price (PMT fixo + seguros sobre o saldo)
            </p>
            <p className="text-3xl font-bold text-[var(--gold)]">
              {formatarMoeda(resultado.primeira_parcela_price)}
              <span className="text-base font-normal text-muted-foreground">/mês</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              1ª parcela · última {formatarMoeda(resultado.ultima_parcela_price)}
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

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa indicativa</span>
              <span className="font-medium">
                {regra.periodicidadeTaxa === "anual"
                  ? `${formatarPercentualAnual(regra.taxa)} + ${regra.indexador}`
                  : `${formatarPercentual(regra.taxa)} + ${regra.indexador}`}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Equivalente</span>
              <span>
                {regra.periodicidadeTaxa === "anual"
                  ? formatarPercentual(taxaMensal, "% ao mês")
                  : formatarPercentual(taxaAnual, "% ao ano")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo efetivo total (Price)</span>
              <span className="font-medium">{formatarPercentualAnual(resultado.cet_anual_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Estruturação ({Math.round(CONFIG.creditoConstrucao.estruturacaoPercentual * 100)}%)
              </span>
              <span className="font-medium">{formatarMoeda(resultado.cac_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor financiado</span>
              <span className="font-medium">{formatarMoeda(resultado.principal_financiado)}</span>
            </div>
          </div>
        </div>
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

      <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
        <p className="font-semibold">Liberação em {numeroDeTranches} tranches</p>
        {Array.from({ length: numeroDeTranches }, (_, i) => (
          <div key={i} className="flex justify-between text-muted-foreground">
            <span>{i + 1}ª tranche ({Math.round(((i + 1) / numeroDeTranches) * 100)}% físico)</span>
            <span className="font-medium text-foreground">~{formatarMoeda(valorPorTranche)}</span>
          </div>
        ))}
        <div className="flex justify-between text-muted-foreground border-t pt-2 mt-1">
          <span>Habite-se (100% concluído)</span>
          <span className="font-medium text-foreground">Liberação final</span>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          As parcelas começam junto com a liberação do crédito, sem período de espera.
          Taxa pós-fixada corrigida por {regra.indexador}.
          Valores estimados, sujeitos a análise de crédito e avaliação do imóvel.
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
