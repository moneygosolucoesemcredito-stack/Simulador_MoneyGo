"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import { CONFIG, ltvParaTipoImovel } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"
import type { TipoImovel } from "@/types"

type TipoPessoa = "PF" | "PJ"

export function Step5ValorDesejado({ onNext }: { onNext: () => void }) {
  const { homeEquity, setHomeEquity } = useFunnelStore()
  // O seletor PF/PJ só fica oculto quando o tomador veio travado pelo link do
  // operador (?pessoa=). Escolha anterior do próprio usuário não o esconde:
  // ele permanece visível (pré-selecionado) em toda transição de estado.
  const precisaEscolherPessoa = !homeEquity.pessoa_travada_link
  const ltv = ltvParaTipoImovel(homeEquity.tipo_imovel as TipoImovel | "")
  const valorMaximo = Math.floor(homeEquity.valor_imovel * ltv)
  const valorMinimo = CONFIG.homeEquity.valorCreditoMinimo

  const [valor, setValor] = useState(
    Math.min(homeEquity.valor_solicitado, valorMaximo) || valorMinimo
  )
  const [prazo, setPrazo] = useState(homeEquity.prazo_meses || CONFIG.homeEquity.prazoDefault)
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa | "">(
    (homeEquity.tipo_pessoa as TipoPessoa) || ""
  )

  const podeAvancar = precisaEscolherPessoa ? !!tipoPessoa : true

  function handleNext() {
    // Trava de LTV: nunca avança acima do teto da tipologia (≤ 55%).
    if (!podeAvancar || valor > valorMaximo) return
    setHomeEquity({
      valor_solicitado: valor,
      prazo_meses: prazo,
      ...(precisaEscolherPessoa ? { tipo_pessoa: tipoPessoa as TipoPessoa } : {}),
    })
    pushDataLayer("step_completed", {
      funil: "home_equity",
      step: 5,
      valor_solicitado: valor,
      prazo_meses: prazo,
      tipo_pessoa: precisaEscolherPessoa ? tipoPessoa : homeEquity.tipo_pessoa,
    })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Quanto você precisa?</h2>
        <p className="text-muted-foreground text-sm">
          Você pode solicitar até {formatarMoeda(valorMaximo)} ({Math.round(ltv * 100)}% do valor do imóvel).
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
          <span className="text-4xl font-bold tracking-tight text-[var(--gold)]">
            {formatarMoeda(valor)}
          </span>
        </div>

        <Slider
          min={valorMinimo}
          max={valorMaximo}
          step={5_000}
          value={[valor]}
          onValueChange={(vals) => setValor(Array.isArray(vals) ? vals[0] : vals)}
          
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatarMoeda(valorMinimo)}</span>
          <span>{formatarMoeda(valorMaximo)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Prazo de pagamento</p>
        <div className="grid grid-cols-4 gap-2">
          {CONFIG.homeEquity.prazosDisponiveis.map((p) => (
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
              {p >= 12 ? `${p / 12}a` : `${p}m`}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {prazo >= 12 ? `${prazo / 12} anos` : `${prazo} meses`} ({prazo} parcelas)
        </p>
      </div>

      {precisaEscolherPessoa && (
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
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Usado para calcular o IOF aplicável à operação.
          </p>
        </div>
      )}

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
