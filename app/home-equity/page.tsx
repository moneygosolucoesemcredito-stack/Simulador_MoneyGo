"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FunnelShell } from "@/components/funnel/FunnelShell"
import { StepWrapper } from "@/components/funnel/StepWrapper"
import { CadastroCliente } from "@/components/funnel/CadastroCliente"
import { criarSupabaseBrowser } from "@/lib/supabase/client"
import { useFunnelStore, type HomeEquityState } from "@/stores/funnel-store"
import { Step1ValorImovel } from "@/components/funnel/steps/home-equity/Step1ValorImovel"
import { Step2TipoImovel } from "@/components/funnel/steps/home-equity/Step2TipoImovel"
import { Step3Situacao } from "@/components/funnel/steps/home-equity/Step3Situacao"
import { Step4Localizacao } from "@/components/funnel/steps/home-equity/Step4Localizacao"
import { Step5ValorDesejado } from "@/components/funnel/steps/home-equity/Step5ValorDesejado"
import { Step6Resultado } from "@/components/funnel/steps/home-equity/Step6Resultado"
import { Step7Contato } from "@/components/funnel/steps/home-equity/Step7Contato"
import { parseTaxaPercent, taxaDentroFaixa } from "@/lib/taxa"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"

const TOTAL_STEPS = 7

function HomeEquityFunnel() {
  const { homeEquity, setHomeEquity } = useFunnelStore()
  const step = homeEquity.step
  const router = useRouter()
  const searchParams = useSearchParams()
  const operadorLink = searchParams.get("op")

  // Link de operador (?t=) exige o cliente identificado: "checando" enquanto
  // consultamos a sessão, "necessario" mostra o cadastro, "liberado" segue.
  const [gate, setGate] = useState<"checando" | "necessario" | "liberado">("liberado")

  // Hidrata o funil a partir da URL. A taxa é SEMPRE do operador:
  //  ?t=...     -> cliente com taxa travada (link enviado pelo operador)
  //  ?modo=op   -> operador digita a taxa na tela de resultado
  //  (sem nada) -> cliente público com taxa apenas indicativa
  useEffect(() => {
    const t = searchParams.get("t")
    const modo = searchParams.get("modo")
    const pessoa = searchParams.get("pessoa")
    const patch: Partial<HomeEquityState> = {}

    const taxaUrl = t ? parseTaxaPercent(t) : null
    if (taxaUrl != null && taxaDentroFaixa(taxaUrl, "home_equity")) {
      patch.modo = "cliente"
      patch.taxa_mensal = taxaUrl
      patch.taxa_indicativa = false
      // Cliente veio por link de parceiro: precisa se cadastrar/entrar antes
      // do funil, para o lead ficar registrado mesmo se abandonar no meio.
      setGate("checando")
      criarSupabaseBrowser()
        .auth.getSession()
        .then(({ data }) => setGate(data.session ? "liberado" : "necessario"))
    } else if (modo === "op") {
      patch.modo = "operador"
      patch.taxa_indicativa = false
    } else {
      // Caminho público: nunca expõe o campo de taxa. Usa taxa indicativa.
      patch.modo = "cliente"
      patch.taxa_mensal = CONFIG.homeEquity.taxaMensal
      patch.taxa_indicativa = true
    }

    // Só o link do operador trava o PF/PJ; em qualquer outro caso o seletor
    // permanece disponível para o cliente (inclusive ao refazer o funil).
    if (pessoa === "PF" || pessoa === "PJ") {
      patch.tipo_pessoa = pessoa
      patch.pessoa_travada_link = true
    } else {
      patch.pessoa_travada_link = false
    }
    setHomeEquity(patch)
    // Executa apenas na montagem (leitura inicial da URL).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    pushDataLayer("step_view", { funil: "home_equity", step })
  }, [step])

  function goTo(s: number) {
    setHomeEquity({ step: s })
  }

  function handleNaoQualificado() {
    router.push("/nao-qualificado")
  }

  const content = () => {
    switch (step) {
      case 1:
        return <Step1ValorImovel onNext={() => goTo(2)} />
      case 2:
        return <Step2TipoImovel onNext={() => goTo(3)} />
      case 3:
        return <Step3Situacao onNext={() => goTo(4)} />
      case 4:
        return (
          <Step4Localizacao
            onNext={() => goTo(5)}
            onNaoQualificado={handleNaoQualificado}
          />
        )
      case 5:
        return <Step5ValorDesejado onNext={() => goTo(6)} />
      case 6:
        return <Step6Resultado onNext={() => goTo(7)} />
      case 7:
        return <Step7Contato />
      default:
        return null
    }
  }

  if (gate !== "liberado") {
    return (
      <FunnelShell
        currentStep={1}
        totalSteps={TOTAL_STEPS}
        onBack={() => {}}
        showBack={false}
        produto="Home Equity"
      >
        {gate === "necessario" ? (
          <CadastroCliente
            operadorId={operadorLink}
            onAutenticado={() => setGate("liberado")}
          />
        ) : null}
      </FunnelShell>
    )
  }

  return (
    <FunnelShell
      currentStep={step}
      totalSteps={TOTAL_STEPS}
      onBack={() => goTo(Math.max(1, step - 1))}
      showBack={step > 1}
      produto="Home Equity"
    >
      <StepWrapper stepKey={step}>{content()}</StepWrapper>
    </FunnelShell>
  )
}

export default function HomeEquityPage() {
  return (
    <Suspense fallback={null}>
      <HomeEquityFunnel />
    </Suspense>
  )
}
