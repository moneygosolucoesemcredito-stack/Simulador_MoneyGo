"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { FunnelShell } from "@/components/funnel/FunnelShell"
import { StepWrapper } from "@/components/funnel/StepWrapper"
import { useFunnelStore } from "@/stores/funnel-store"
import { Step1ValorTerreno } from "@/components/funnel/steps/credito-construcao/Step1ValorTerreno"
import { Step2ValorObra } from "@/components/funnel/steps/credito-construcao/Step2ValorObra"
import { Step3ValorDesejado } from "@/components/funnel/steps/credito-construcao/Step3ValorDesejado"
import { Step4Localizacao } from "@/components/funnel/steps/credito-construcao/Step4Localizacao"
import { Step5Resultado } from "@/components/funnel/steps/credito-construcao/Step5Resultado"
import { Step6Contato } from "@/components/funnel/steps/credito-construcao/Step6Contato"
import { pushDataLayer } from "@/components/tracking/GTM"

const TOTAL_STEPS = 6

export default function CreditoConstrucaoPage() {
  const { creditoConstrucao, setCreditoConstrucao, resetCreditoConstrucao } = useFunnelStore()
  const step = creditoConstrucao.step
  const router = useRouter()

  useEffect(() => {
    pushDataLayer("step_view", { funil: "credito_construcao", step })
  }, [step])

  function goTo(s: number) {
    setCreditoConstrucao({ step: s })
  }

  function handleNaoQualificado() {
    router.push("/nao-qualificado")
  }

  const content = () => {
    switch (step) {
      case 1:
        return <Step1ValorTerreno onNext={() => goTo(2)} />
      case 2:
        return <Step2ValorObra onNext={() => goTo(3)} />
      case 3:
        return <Step3ValorDesejado onNext={() => goTo(4)} />
      case 4:
        return (
          <Step4Localizacao
            onNext={() => goTo(5)}
            onNaoQualificado={handleNaoQualificado}
          />
        )
      case 5:
        return <Step5Resultado onNext={() => goTo(6)} />
      case 6:
        return <Step6Contato />
      default:
        return null
    }
  }

  return (
    <FunnelShell
      currentStep={step}
      totalSteps={TOTAL_STEPS}
      onBack={() => goTo(Math.max(1, step - 1))}
      showBack={step > 1 && step < 6}
      produto="Crédito de Construção"
    >
      <StepWrapper stepKey={step}>{content()}</StepWrapper>
    </FunnelShell>
  )
}
