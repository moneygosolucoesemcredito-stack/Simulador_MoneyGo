"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useFunnelStore } from "@/stores/funnel-store"
import { pushDataLayer } from "@/components/tracking/GTM"
import { buscarCEP } from "@/lib/viacep"
import { isCidadeQualificada } from "@/lib/qualificacao"
import { IMaskInput } from "react-imask"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function Step4Localizacao({ onNext, onNaoQualificado }: { onNext: () => void; onNaoQualificado: () => void }) {
  const { creditoConstrucao, setCreditoConstrucao } = useFunnelStore()
  const [cep, setCep] = useState(creditoConstrucao.cep || "")
  const [logradouro, setLogradouro] = useState(creditoConstrucao.logradouro || "")
  const [bairro, setBairro] = useState(creditoConstrucao.bairro || "")
  const [cidade, setCidade] = useState(creditoConstrucao.cidade || "")
  const [uf, setUf] = useState(creditoConstrucao.uf || "")
  const [loading, setLoading] = useState(false)
  const [cepError, setCepError] = useState("")

  async function handleCepBlur() {
    const cleaned = cep.replace(/\D/g, "")
    if (cleaned.length !== 8) return
    setLoading(true)
    setCepError("")
    const data = await buscarCEP(cleaned)
    setLoading(false)
    if (!data) {
      setCepError("CEP não encontrado. Verifique e tente novamente.")
      return
    }
    setLogradouro(data.logradouro || "")
    setBairro(data.bairro || "")
    setCidade(data.localidade)
    setUf(data.uf)
  }

  function handleNext() {
    if (!cidade || !uf) return
    setCreditoConstrucao({ cep, logradouro, bairro, cidade, uf })
    pushDataLayer("step_completed", { funil: "credito_construcao", step: 4, cidade, uf })
    if (!isCidadeQualificada(cidade, uf)) {
      onNaoQualificado()
      return
    }
    onNext()
  }

  const canProceed = cidade && uf && !loading && !cepError

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Onde fica o terreno?</h2>
        <p className="text-muted-foreground text-sm">
          Informe o CEP do terreno onde a construção será realizada.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cep">CEP</Label>
          <div className="relative">
            <IMaskInput
              id="cep"
              mask="00000-000"
              value={cep}
              onAccept={(val) => setCep(String(val))}
              onBlur={handleCepBlur}
              className={cn(
                "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                cepError && "border-destructive"
              )}
              placeholder="00000-000"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-3 w-5 h-5 animate-spin text-muted-foreground" />
            )}
          </div>
          {cepError && <p className="text-destructive text-xs">{cepError}</p>}
        </div>

        {cidade && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1 text-sm">
            {logradouro && <p><span className="text-muted-foreground">Rua:</span> {logradouro}</p>}
            {bairro && <p><span className="text-muted-foreground">Bairro:</span> {bairro}</p>}
            <p><span className="text-muted-foreground">Cidade:</span> <strong>{cidade} — {uf}</strong></p>
          </div>
        )}
      </div>

      <Button
        onClick={handleNext}
        disabled={!canProceed}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[oklch(0.14_0_0)] hover:bg-[var(--gold-dark)]"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continuar"}
      </Button>
    </div>
  )
}
