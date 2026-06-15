"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { FunnelShell } from "@/components/funnel/FunnelShell"
import { StepWrapper } from "@/components/funnel/StepWrapper"
import { useFunnelStore } from "@/stores/funnel-store"
import { Step1ValorImovel } from "@/components/funnel/steps/financiamento-imobiliario/Step1ValorImovel"
import { Step2TipoImovel } from "@/components/funnel/steps/financiamento-imobiliario/Step2TipoImovel"
import { Step3Localizacao } from "@/components/funnel/steps/financiamento-imobiliario/Step3Localizacao"
import { Step4ValorDesejado } from "@/components/funnel/steps/financiamento-imobiliario/Step4ValorDesejado"
import { Step5Resultado } from "@/components/funnel/steps/financiamento-imobiliario/Step5Resultado"
import { Step6Contato } from "@/components/funnel/steps/financiamento-imobiliario/Step6Contato"
import { pushDataLayer } from "@/components/tracking/GTM"

const TOTAL_STEPS = 6

export default function FinanciamentoImobiliarioPage() {
  const { financiamentoImobiliario, setFinanciamentoImobiliario, resetFinanciamentoImobiliario } = useFunnelStore()
  const step = financiamentoImobiliario.step
  const router = useRouter()

  useEffect(() => {
    pushDataLayer("step_view", { funil: "financiamento_imobiliario", step })
  }, [step])

  function goTo(s: number) {
    setFinanciamentoImobiliario({ step: s })
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
        return (
          <Step3Localizacao
            onNext={() => goTo(4)}
            onNaoQualificado={handleNaoQualificado}
          />
        )
      case 4:
        return <Step4ValorDesejado onNext={() => goTo(5)} />
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
      showBack={step > 1}
      produto="Financiamento Imobiliário"
    >
      <StepWrapper stepKey={step}>{content()}</StepWrapper>
    </FunnelShell>
  )
}
