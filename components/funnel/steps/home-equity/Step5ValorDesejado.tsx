"use client"

import { useMemo, useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFunnelStore } from "@/stores/funnel-store"
import { formatarMoeda } from "@/lib/simulacao"
import {
  CONFIG,
  HE_IDADE_MAIS_PRAZO_MAXIMO_ANOS,
  ltvParaTipoImovel,
  prazoMaximoHomeEquity,
  prazosDisponiveisHomeEquity,
} from "@/lib/config"
import { calcularIdade } from "@/lib/qualificacao"
import { pushDataLayer } from "@/components/tracking/GTM"
import { cn } from "@/lib/utils"
import type { TipoImovel } from "@/types"

type TipoPessoa = "PF" | "PJ"

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/

/** Valida uma data YYYY-MM-DD e devolve a idade plausível (18–119) ou null. */
function idadeValidada(data: string): number | null {
  if (!DATA_REGEX.test(data)) return null
  const idade = calcularIdade(data)
  if (!Number.isFinite(idade) || idade < 0 || idade > 119) return null
  return idade
}

function rotuloPrazo(meses: number): string {
  return meses >= 12 ? `${meses / 12}a` : `${meses}m`
}

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
  const [dataNascimento, setDataNascimento] = useState(homeEquity.data_nascimento || "")

  // Trava de seguro habitacional (idade + prazo ≤ 80 anos). O prazo máximo cai
  // dinamicamente conforme a idade do tomador; abaixo de 18 ou ≥ 80 anos não há
  // prazo elegível.
  const idade = useMemo(() => idadeValidada(dataNascimento), [dataNascimento])
  const prazoMaximoIdade = idade != null ? prazoMaximoHomeEquity(idade) : null
  const prazosOfertados = useMemo<readonly number[]>(
    () => (idade == null ? CONFIG.homeEquity.prazosDisponiveis : prazosDisponiveisHomeEquity(idade)),
    [idade]
  )

  const idadeAbaixoMinimo = idade != null && idade < CONFIG.homeEquity.idadeMinima
  const idadeSemPrazo = idade != null && (prazoMaximoIdade ?? 0) <= 0
  const idadeValida = idade != null && !idadeAbaixoMinimo && !idadeSemPrazo

  // Prazo efetivo: se a idade rebaixou o teto e o prazo escolhido não é mais
  // ofertável, cai para o maior prazo disponível — sem mutar estado no render.
  const prazoEfetivo =
    prazosOfertados.includes(prazo)
      ? prazo
      : prazosOfertados[prazosOfertados.length - 1] ?? prazo

  const podeAvancar =
    (precisaEscolherPessoa ? !!tipoPessoa : true) &&
    idadeValida &&
    prazosOfertados.length > 0

  function handleNext() {
    // Trava de LTV: nunca avança acima do teto da tipologia (≤ 55%).
    // Trava de idade: nunca avança com prazo acima do máximo para a idade.
    if (!podeAvancar || valor > valorMaximo) return
    setHomeEquity({
      valor_solicitado: valor,
      prazo_meses: prazoEfetivo,
      data_nascimento: dataNascimento,
      ...(precisaEscolherPessoa ? { tipo_pessoa: tipoPessoa as TipoPessoa } : {}),
    })
    pushDataLayer("step_completed", {
      funil: "home_equity",
      step: 5,
      valor_solicitado: valor,
      prazo_meses: prazoEfetivo,
      idade,
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

      {/* Data de nascimento — obrigatória: define a trava idade × prazo (≤ 80). */}
      <div className="space-y-2">
        <Label htmlFor="he-data-nascimento" className="text-sm font-medium">
          Data de nascimento
        </Label>
        <Input
          id="he-data-nascimento"
          type="date"
          value={dataNascimento}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDataNascimento(e.target.value)}
          aria-invalid={idade != null && !idadeValida}
          className="h-11 text-base"
        />
        {idadeAbaixoMinimo ? (
          <p className="text-xs text-destructive">
            É necessário ter ao menos {CONFIG.homeEquity.idadeMinima} anos para simular.
          </p>
        ) : idadeSemPrazo ? (
          <p className="text-xs text-destructive">
            Idade acima do limite: idade + prazo deve ser ≤ {HE_IDADE_MAIS_PRAZO_MAXIMO_ANOS} anos.
          </p>
        ) : idade != null ? (
          <p className="text-xs text-muted-foreground">
            {idade} anos · prazo máximo de {prazoMaximoIdade} meses (regra de seguro:
            idade + prazo ≤ {HE_IDADE_MAIS_PRAZO_MAXIMO_ANOS} anos).
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Usada para calcular o prazo máximo permitido (idade + prazo ≤ {HE_IDADE_MAIS_PRAZO_MAXIMO_ANOS} anos).
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Prazo de pagamento</p>
        {idadeValida && prazosOfertados.length > 0 ? (
          <>
            <div className="grid grid-cols-4 gap-2">
              {prazosOfertados.map((p) => (
                <button
                  key={p}
                  onClick={() => setPrazo(p)}
                  className={cn(
                    "rounded-lg border-2 py-2.5 text-sm font-medium transition-all",
                    prazoEfetivo === p
                      ? "border-[var(--gold)] bg-[var(--gold)]/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-[var(--gold)]/50"
                  )}
                >
                  {rotuloPrazo(p)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {prazoEfetivo >= 12 ? `${prazoEfetivo / 12} anos` : `${prazoEfetivo} meses`} ({prazoEfetivo} parcelas)
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Informe uma data de nascimento válida para ver os prazos disponíveis.
          </p>
        )}
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
