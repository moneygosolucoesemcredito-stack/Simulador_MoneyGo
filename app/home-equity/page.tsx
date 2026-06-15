"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { FunnelShell } from "@/components/funnel/FunnelShell"
import { StepWrapper } from "@/components/funnel/StepWrapper"
import { useFunnelStore } from "@/stores/funnel-store"
import { Step1ValorImovel } from "@/components/funnel/steps/home-equity/Step1ValorImovel"
import { Step2TipoImovel } from "@/components/funnel/steps/home-equity/Step2TipoImovel"
import { Step3Situacao } from "@/components/funnel/steps/home-equity/Step3Situacao"
import { Step4Localizacao } from "@/components/funnel/steps/home-equity/Step4Localizacao"
import { Step5ValorDesejado } from "@/components/funnel/steps/home-equity/Step5ValorDesejado"
import { Step6Resultado } from "@/components/funnel/steps/home-equity/Step6Resultado"
import { Step7Contato } from "@/components/funnel/steps/home-equity/Step7Contato"
import { pushDataLayer } from "@/components/tracking/GTM"

const TOTAL_STEPS = 7

export default function HomeEquityPage() {
  const { homeEquity, setHomeEquity, resetHomeEquity } = useFunnelStore()
  const step = homeEquity.step
  const router = useRouter()

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
