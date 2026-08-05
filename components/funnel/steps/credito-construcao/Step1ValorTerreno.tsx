"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda, formatarPercentual, formatarPercentualAnual } from "@/lib/simulacao"
import {
  CONSTRUCAO_POR_CATEGORIA,
  regraConstrucao,
  tomadorPermitidoConstrucao,
} from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"
import { Info, Fence, Map } from "lucide-react"
import type { CategoriaTerrenoConstrucao, TipoPessoa } from "@/types"

const MIN = 100_000
const MAX = 10_000_000
const STEP = 10_000

const CATEGORIAS: {
  valor: CategoriaTerrenoConstrucao
  icon: typeof Fence
}[] = [
  { valor: "condominio", icon: Fence },
  { valor: "fora_condominio", icon: Map },
]

/** Resumo das condições da categoria, exibido dentro de cada cartão. */
function condicoesDaCategoria(categoria: CategoriaTerrenoConstrucao): string[] {
  const regra = CONSTRUCAO_POR_CATEGORIA[categoria]
  const taxa =
    regra.periodicidadeTaxa === "anual"
      ? `${formatarPercentualAnual(regra.taxa)} + ${regra.indexador}`
      : `${formatarPercentual(regra.taxa)} + ${regra.indexador}`
  return [
    `Até ${Math.round(regra.ltv * 100)}% ${regra.base === "obra" ? "do custo da obra" : "do VGV"}`,
    taxa,
    `Prazo de até ${regra.prazoMaximo / 12} anos`,
    regra.tomadores.join(" e "),
  ]
}

export function Step1ValorTerreno({ onNext }: { onNext: () => void }) {
  const { creditoConstrucao, setCreditoConstrucao } = useFunnelStore()
  const [categoria, setCategoria] = useState<CategoriaTerrenoConstrucao | "">(
    creditoConstrucao.categoria_terreno
  )
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa | "">(creditoConstrucao.tipo_pessoa)
  const [valor, setValor] = useState(creditoConstrucao.valor_terreno || MIN)

  const regra = categoria ? regraConstrucao(categoria) : null
  // Trocar para condomínio com PJ selecionada invalida o tomador: o campo
  // volta a ficar em aberto em vez de seguir com uma escolha não permitida.
  const tipoPessoaValido = !!categoria && tomadorPermitidoConstrucao(categoria, tipoPessoa)
  const podeAvancar = !!categoria && tipoPessoaValido && valor >= MIN

  function escolherCategoria(nova: CategoriaTerrenoConstrucao) {
    setCategoria(nova)
    // Categoria exclusiva de PF já deixa o tomador resolvido.
    const tomadores = CONSTRUCAO_POR_CATEGORIA[nova].tomadores
    if (tomadores.length === 1) setTipoPessoa(tomadores[0])
    else if (tipoPessoa && !tomadores.includes(tipoPessoa)) setTipoPessoa("")
  }

  function handleNext() {
    if (!podeAvancar) return
    setCreditoConstrucao({
      categoria_terreno: categoria as CategoriaTerrenoConstrucao,
      tipo_pessoa: tipoPessoa as TipoPessoa,
      valor_terreno: valor,
      // O prazo default depende da categoria escolhida.
      prazo_meses: regraConstrucao(categoria).prazoDefault,
    })
    pushDataLayer("step_completed", {
      funil: "credito_construcao",
      step: 1,
      categoria_terreno: categoria,
      tipo_pessoa: tipoPessoa,
      valor_terreno: valor,
    })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Onde fica o seu terreno?</h2>
        <p className="text-muted-foreground text-sm">
          A localização do terreno define as condições da operação: teto de crédito, taxa e prazo.
        </p>
      </div>

      <div className="space-y-3">
        {CATEGORIAS.map(({ valor: cat, icon: Icone }) => {
          const r = CONSTRUCAO_POR_CATEGORIA[cat]
          return (
            <button
              key={cat}
              type="button"
              onClick={() => escolherCategoria(cat)}
              className={cn(
                "w-full rounded-xl border-2 p-4 text-left transition-all",
                categoria === cat
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : "border-border hover:border-[var(--gold)]/50"
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Icone className="h-4 w-4 shrink-0" />
                {r.rotulo}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{r.descricao}</span>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {condicoesDaCategoria(cat).map((linha) => (
                  <li key={linha}>· {linha}</li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {regra && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Tipo de tomador</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { v: "PF", label: "Pessoa Física", desc: "CPF" },
              { v: "PJ", label: "Pessoa Jurídica", desc: "CNPJ" },
            ] as { v: TipoPessoa; label: string; desc: string }[]).map((op) => {
              const permitido = regra.tomadores.includes(op.v)
              return (
                <button
                  key={op.v}
                  type="button"
                  disabled={!permitido}
                  onClick={() => setTipoPessoa(op.v)}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    !permitido
                      ? "border-border opacity-50 cursor-not-allowed"
                      : tipoPessoa === op.v
                        ? "border-[var(--gold)] bg-[var(--gold)]/10"
                        : "border-border hover:border-[var(--gold)]/50"
                  )}
                >
                  <span className="block text-sm font-medium">{op.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {permitido ? op.desc : "não disponível nesta modalidade"}
                  </span>
                </button>
              )
            })}
          </div>
          {regra.tomadores.length === 1 && (
            <p className="text-xs text-muted-foreground">
              {regra.rotulo} atende apenas {regra.tomadores.join(" e ")}.
            </p>
          )}
        </div>
      )}

      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-sm font-medium">Valor do terreno</p>
          <p className="text-muted-foreground text-xs">
            Valor de mercado do terreno que você já possui (quitado) — garantia inicial do crédito.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
          <span className="text-4xl font-bold tracking-tight text-[var(--gold)]">
            {formatarMoeda(valor)}
          </span>
        </div>

        <Slider
          min={MIN}
          max={MAX}
          step={STEP}
          value={[valor]}
          onValueChange={(vals) => setValor(Array.isArray(vals) ? vals[0] : vals)}
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatarMoeda(MIN)}</span>
          <span>{formatarMoeda(MAX)}</span>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>O terreno precisa estar quitado e registrado em seu nome para ser utilizado como garantia.</p>
      </div>

      <Button
        onClick={handleNext}
        disabled={!podeAvancar}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        Continuar
      </Button>
    </div>
  )
}
