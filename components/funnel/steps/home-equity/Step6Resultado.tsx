"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFunnelStore } from "@/stores/funnel-store"
import {
  calcularHomeEquity,
  formatarMoeda,
  formatarPercentual,
  formatarPercentualAnual,
  type ResultadoTabelaHE,
} from "@/lib/simulacao"
import { parseTaxaPercent, taxaDentroFaixa, taxaParaPercentStr, descricaoFaixa } from "@/lib/taxa"
import { creditoTotalHomeEquity } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import {
  Info,
  Zap,
  Flag,
  Wallet,
  Clock,
  Layers,
  Percent,
  CalendarDays,
  Lock,
  Download,
} from "lucide-react"

const LINHAS: { key: keyof ResultadoTabelaHE; label: string; icon: typeof Zap; tipo: "moeda" | "anual" }[] = [
  { key: "primeiraParcela", label: "Primeira parcela aprox.", icon: Zap, tipo: "moeda" },
  { key: "ultimaParcela", label: "Última parcela aprox.", icon: Flag, tipo: "moeda" },
  { key: "rendaSugerida", label: "Renda sugerida", icon: Wallet, tipo: "moeda" },
  { key: "parcelaMedia", label: "Parcela média", icon: Clock, tipo: "moeda" },
  { key: "cetAnual", label: "Custo efetivo total", icon: Layers, tipo: "anual" },
]

interface Step6ResultadoProps {
  onNext: () => void
  /**
   * true no fluxo de lead, em que o cadastro já foi enviado antes do resultado.
   * A tela vira o encerramento do funil (sem novo envio de proposta).
   */
  terminal?: boolean
}

export function Step6Resultado({ onNext, terminal = false }: Step6ResultadoProps) {
  const { homeEquity, setHomeEquity } = useFunnelStore()
  const modoCliente = homeEquity.modo === "cliente"
  const nomeLead = homeEquity.nome_lead?.trim()
  const primeiroNome = nomeLead ? nomeLead.split(/\s+/)[0] : ""

  // No modo operador a taxa é digitada aqui; no modo cliente vem travada da URL.
  const [taxaRaw, setTaxaRaw] = useState(
    homeEquity.taxa_mensal ? taxaParaPercentStr(homeEquity.taxa_mensal) : ""
  )
  const [baixando, setBaixando] = useState(false)

  // Timestamp da simulação — exibido ao usuário e enviado no PDF/proposta.
  const dataSimulacao = useMemo(() => new Date(), [])

  const taxaDigitada = parseTaxaPercent(taxaRaw)
  const digitadaValida = taxaDigitada != null && taxaDentroFaixa(taxaDigitada, "home_equity")
  const taxa = modoCliente
    ? homeEquity.taxa_mensal || null
    : digitadaValida
      ? taxaDigitada
      : null
  const foraDaFaixa = !modoCliente && taxaRaw.trim() !== "" && !digitadaValida

  // Imóvel financiado: o saldo devedor é quitado dentro da operação e soma ao
  // valor que o cliente recebe. É o CRÉDITO TOTAL que é financiado — dele saem
  // parcela, IOF, CET e renda sugerida.
  const saldoDevedor = homeEquity.situacao === "financiado" ? homeEquity.saldo_devedor || 0 : 0
  const creditoTotal = creditoTotalHomeEquity(homeEquity.valor_solicitado, saldoDevedor)

  const resultado = useMemo(() => {
    if (!taxa) return null
    return calcularHomeEquity({
      valorCredito: creditoTotal,
      valorImovel: homeEquity.valor_imovel,
      prazoMeses: homeEquity.prazo_meses,
      taxaMensal: taxa,
      tipoPessoa: (homeEquity.tipo_pessoa || "PF") as "PF" | "PJ",
    })
  }, [taxa, creditoTotal, homeEquity.valor_imovel, homeEquity.prazo_meses, homeEquity.tipo_pessoa])

  function handleTaxaInput(valor: string) {
    setTaxaRaw(valor)
    const fracao = parseTaxaPercent(valor)
    if (fracao != null && taxaDentroFaixa(fracao, "home_equity")) {
      setHomeEquity({ taxa_mensal: fracao })
      pushDataLayer("step_interaction", { funil: "home_equity", step: 6, taxa_mensal: fracao })
    } else {
      setHomeEquity({ taxa_mensal: 0 })
    }
  }

  function handleNext() {
    if (!taxa) return
    pushDataLayer("step_completed", { funil: "home_equity", step: 6, taxa_mensal: taxa })
    onNext()
  }

  async function handleBaixarPdf() {
    if (!resultado) return
    setBaixando(true)
    try {
      const { gerarPdfHomeEquity } = await import("@/lib/pdf-home-equity")
      await gerarPdfHomeEquity(resultado, {
        valorCredito: creditoTotal,
        valorSolicitado: homeEquity.valor_solicitado,
        saldoDevedor,
        valorImovel: homeEquity.valor_imovel,
        prazoMeses: homeEquity.prazo_meses,
        tomador: (homeEquity.tipo_pessoa || "PF") as "PF" | "PJ",
        dataSimulacao,
        nome: nomeLead || undefined,
      })
      pushDataLayer("pdf_download", { funil: "home_equity", taxa_mensal: taxa })
    } finally {
      setBaixando(false)
    }
  }

  function valorCelula(col: ResultadoTabelaHE, linha: (typeof LINHAS)[number]) {
    const v = col[linha.key]
    return linha.tipo === "moeda" ? formatarMoeda(v) : formatarPercentualAnual(v)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {primeiroNome ? `${primeiroNome}, sua simulação está pronta!` : "Sua simulação está pronta!"}
        </h2>
        {nomeLead && (
          <p className="text-sm font-medium text-[var(--gold-dark)]">
            Simulação preparada para {nomeLead}.
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          {modoCliente
            ? "Confira as condições nas tabelas SAC e PRICE."
            : "Informe a taxa de juros para ver as condições nas tabelas SAC e PRICE."}
        </p>
      </div>

      {/* Resumo da operação */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: saldoDevedor > 0 ? "Crédito total" : "Crédito", v: formatarMoeda(creditoTotal) },
          { l: "Prazo", v: `${homeEquity.prazo_meses} meses` },
          { l: "Tomador", v: homeEquity.tipo_pessoa || "—" },
        ].map((c) => (
          <div key={c.l} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">{c.l}</p>
            <p className="text-sm font-semibold leading-tight mt-0.5">{c.v}</p>
          </div>
        ))}
      </div>

      {/* Imóvel financiado: de onde vem o crédito total que gera as parcelas. */}
      {saldoDevedor > 0 && (
        <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
          <p className="font-medium">Composição do crédito</p>
          <div className="flex justify-between text-muted-foreground">
            <span>Você recebe</span>
            <span className="font-medium text-foreground">
              {formatarMoeda(homeEquity.valor_solicitado)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Quitação do financiamento</span>
            <span className="font-medium text-foreground">{formatarMoeda(saldoDevedor)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-muted-foreground">
            <span>Crédito total (base das parcelas)</span>
            <span className="font-semibold text-[var(--gold)]">{formatarMoeda(creditoTotal)}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Data da simulação:{" "}
        {dataSimulacao.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
      </p>

      {/* Taxa de juros */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">Taxa de juros (a.m.)</p>
          {resultado && (
            <p className="text-xs text-muted-foreground">
              Equivale a{" "}
              <span className="font-medium text-foreground">
                {formatarPercentualAnual(resultado.taxaAnual)} + IPCA
              </span>
            </p>
          )}
        </div>

        {modoCliente ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-semibold tabular-nums">
              {taxa ? `${formatarPercentual(taxa)} + IPCA` : "Taxa não informada"}
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {homeEquity.taxa_indicativa ? "taxa indicativa" : "definida pelo parceiro"}
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="relative">
              <Input
                inputMode="decimal"
                placeholder="Ex.: 1,35"
                value={taxaRaw}
                onChange={(e) => handleTaxaInput(e.target.value)}
                aria-invalid={foraDaFaixa}
                className="h-11 pr-16 text-base"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                % a.m.
              </span>
            </div>
            <p className={foraDaFaixa ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {foraDaFaixa
                ? `Taxa fora da faixa permitida. ${descricaoFaixa("home_equity")}`
                : descricaoFaixa("home_equity")}
            </p>
          </div>
        )}
      </div>

      {/* Comparativo SAC x PRICE */}
      {resultado ? (
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
                  {valorCelula(resultado.sac, linha)}
                </div>
                <div className="p-3 text-center border-l border-border/70 text-sm font-semibold tabular-nums">
                  {valorCelula(resultado.price, linha)}
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
              {formatarPercentual(resultado.taxaMensal)} + IPCA
            </div>
          </div>
          <div className="grid grid-cols-[1.25fr_1fr_1fr] border-t border-border/70 bg-muted/30">
            <div className="flex items-center gap-2 p-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-[var(--gold-dark)]" />
              <span className="text-xs leading-tight text-muted-foreground">Quantidade de parcelas</span>
            </div>
            <div className="col-span-2 p-3 text-center border-l border-border/70 text-sm font-semibold">
              {homeEquity.prazo_meses} meses
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          {modoCliente
            ? "Aguardando a taxa definida pelo parceiro."
            : "Informe uma taxa válida acima para visualizar as parcelas nas tabelas SAC e PRICE."}
        </div>
      )}

      {resultado && (
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
      )}

      <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Para fins de simulação apenas. Modalidade pós-fixada com correção por IPCA. Valores e taxas
          sujeitos à aprovação de crédito e às condições do produto vigentes no momento da contratação.
        </p>
      </div>

      <Button
        onClick={handleNext}
        disabled={!taxa}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
      >
        {terminal
          ? "Concluir"
          : modoCliente
            ? "Subir proposta"
            : "Quero falar com um especialista"}
      </Button>
    </div>
  )
}
