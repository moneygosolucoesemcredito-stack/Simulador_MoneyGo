"use client"

import { useEffect } from "react"
import { FunnelShell } from "@/components/funnel/FunnelShell"
import { StepWrapper } from "@/components/funnel/StepWrapper"
import { useFunnelStore } from "@/stores/funnel-store"
import { Step1Veiculo } from "@/components/funnel/steps/financiamento-veiculo/Step1Veiculo"
import { Step2EntradaPrazo } from "@/components/funnel/steps/financiamento-veiculo/Step2EntradaPrazo"
import { Step3Resultado } from "@/components/funnel/steps/financiamento-veiculo/Step3Resultado"
import { Step4Contato } from "@/components/funnel/steps/financiamento-veiculo/Step4Contato"
import { pushDataLayer } from "@/components/tracking/GTM"

const TOTAL_STEPS = 4

export default function FinanciamentoVeiculoPage() {
  const { financiamentoVeiculo, setFinanciamentoVeiculo } = useFunnelStore()
  const step = financiamentoVeiculo.step

  useEffect(() => {
    pushDataLayer("step_view", { funil: "financiamento_veiculo", step })
  }, [step])

  function goTo(s: number) {
    setFinanciamentoVeiculo({ step: s })
  }

  const content = () => {
    switch (step) {
      case 1:
        return <Step1Veiculo onNext={() => goTo(2)} />
      case 2:
        return <Step2EntradaPrazo onNext={() => goTo(3)} />
      case 3:
        return <Step3Resultado onNext={() => goTo(4)} />
      case 4:
        return <Step4Contato />
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
      produto="Financiamento de Veículo"
    >
      <StepWrapper stepKey={step}>{content()}</StepWrapper>
    </FunnelShell>
  )
}
