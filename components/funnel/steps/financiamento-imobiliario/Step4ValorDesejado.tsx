"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import { CONFIG, ltvParaTipoImovelFI } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"
import type { TipoImovel, TipoPessoa } from "@/types"

export function Step4ValorDesejado({ onNext }: { onNext: () => void }) {
  const { financiamentoImobiliario, setFinanciamentoImobiliario } = useFunnelStore()

  const [valor, setValor] = useState(
    financiamentoImobiliario.valor_solicitado || CONFIG.financiamentoImobiliario.valorCreditoMinimo
  )
  const [prazo, setPrazo] = useState(
    financiamentoImobiliario.prazo_meses || CONFIG.financiamentoImobiliario.prazoDefault
  )
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa | "">(
    (financiamentoImobiliario.tipo_pessoa as TipoPessoa) || ""
  )

  // O LTV depende da tipologia E do tomador (PJ é mais restritivo). Enquanto o
  // tomador não é escolhido, exibe-se a faixa de PF (perfil padrão do funil).
  const tipoImovel = financiamentoImobiliario.tipo_imovel as TipoImovel | ""
  const ltv = ltvParaTipoImovelFI(tipoImovel, tipoPessoa)
  const ltvPF = ltvParaTipoImovelFI(tipoImovel, "PF")
  const ltvPJ = ltvParaTipoImovelFI(tipoImovel, "PJ")
  const ltvMudaComTomador = ltvPF !== ltvPJ

  const valorMinimo = CONFIG.financiamentoImobiliario.valorCreditoMinimo
  const valorMaximo = Math.floor(financiamentoImobiliario.valor_imovel * ltv)
  // Trocar PF → PJ pode derrubar o teto abaixo do valor já escolhido: o valor
  // efetivo acompanha o limite vigente sem mutar estado durante o render.
  const valorEfetivo = Math.min(Math.max(valor, valorMinimo), valorMaximo)

  const podeAvancar = !!tipoPessoa && valorMaximo >= valorMinimo

  function handleNext() {
    // Trava de LTV: nunca avança acima do teto da tipologia para o tomador.
    if (!podeAvancar || valorEfetivo > valorMaximo) return
    setFinanciamentoImobiliario({
      valor_solicitado: valorEfetivo,
      prazo_meses: prazo,
      tipo_pessoa: tipoPessoa as TipoPessoa,
    })
    pushDataLayer("step_completed", {
      funil: "financiamento_imobiliario",
      step: 4,
      valor_solicitado: valorEfetivo,
      prazo_meses: prazo,
      tipo_pessoa: tipoPessoa,
      ltv,
    })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Quanto você precisa financiar?</h2>
        <p className="text-muted-foreground text-sm">
          Você pode financiar até {formatarMoeda(valorMaximo)} ({Math.round(ltv * 100)}% do valor do
          imóvel{tipoPessoa ? ` para ${tipoPessoa}` : ""}).
        </p>
      </div>

      {/* Tomador antes do valor: é ele que define o LTV máximo da operação. */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Tipo de tomador</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { v: "PF", label: "Pessoa Física", desc: "CPF" },
            { v: "PJ", label: "Pessoa Jurídica", desc: "CNPJ" },
          ] as { v: TipoPessoa; label: string; desc: string }[]).map((op) => (
            <button
              key={op.v}
              type="button"
              onClick={() => setTipoPessoa(op.v)}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition-all",
                tipoPessoa === op.v
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : "border-border hover:border-[var(--gold)]/50"
              )}
            >
              <span className="block text-sm font-medium">{op.label}</span>
              <span className="block text-xs text-muted-foreground">{op.desc}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Até {Math.round(ltvParaTipoImovelFI(tipoImovel, op.v) * 100)}% do valor do imóvel
              </span>
            </button>
          ))}
        </div>
        {ltvMudaComTomador && (
          <p className="text-xs text-muted-foreground">
            O percentual financiável muda conforme o tomador: {Math.round(ltvPF * 100)}% para pessoa
            física e {Math.round(ltvPJ * 100)}% para pessoa jurídica nesta tipologia.
          </p>
        )}
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
          <span className="text-4xl font-bold tracking-tight text-[var(--gold)]">
            {formatarMoeda(valorEfetivo)}
          </span>
        </div>

        <Slider
          min={valorMinimo}
          max={Math.max(valorMaximo, valorMinimo)}
          step={5_000}
          value={[valorEfetivo]}
          onValueChange={(vals) => setValor(Array.isArray(vals) ? vals[0] : vals)}
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatarMoeda(valorMinimo)}</span>
          <span>{formatarMoeda(valorMaximo)}</span>
        </div>

        {valorMaximo < valorMinimo && (
          <p className="text-xs text-destructive">
            Com o LTV desta tipologia o crédito máximo ({formatarMoeda(valorMaximo)}) fica abaixo do
            mínimo de {formatarMoeda(valorMinimo)}. Revise o valor do imóvel.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Prazo de pagamento</p>
        <div className="grid grid-cols-3 gap-2">
          {CONFIG.financiamentoImobiliario.prazosDisponiveis.map((p) => (
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
              {p / 12}a
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {prazo / 12} anos ({prazo} parcelas)
        </p>
      </div>

      <Button
        onClick={handleNext}
        disabled={!podeAvancar}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        Ver simulação
      </Button>
    </div>
  )
}
