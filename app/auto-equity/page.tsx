"use client"

import { useEffect } from "react"
import { FunnelShell } from "@/components/funnel/FunnelShell"
import { StepWrapper } from "@/components/funnel/StepWrapper"
import { useFunnelStore } from "@/stores/funnel-store"
import { Step1VeiculoInfo } from "@/components/funnel/steps/auto-equity/Step1VeiculoInfo"
import { Step2ValorVeiculo } from "@/components/funnel/steps/auto-equity/Step2ValorVeiculo"
import { Step3Situacao } from "@/components/funnel/steps/auto-equity/Step3Situacao"
import { Step4ValorDesejado } from "@/components/funnel/steps/auto-equity/Step4ValorDesejado"
import { Step5Resultado } from "@/components/funnel/steps/auto-equity/Step5Resultado"
import { Step6Contato } from "@/components/funnel/steps/auto-equity/Step6Contato"
import { pushDataLayer } from "@/components/tracking/GTM"

const TOTAL_STEPS = 6

export default function AutoEquityPage() {
  const { autoEquity, setAutoEquity } = useFunnelStore()
  const step = autoEquity.step

  useEffect(() => {
    pushDataLayer("step_view", { funil: "auto_equity", step })
  }, [step])

  function goTo(s: number) {
    setAutoEquity({ step: s })
  }

  const content = () => {
    switch (step) {
      case 1:
        return <Step1VeiculoInfo onNext={() => goTo(2)} />
      case 2:
        return <Step2ValorVeiculo onNext={() => goTo(3)} />
      case 3:
        return <Step3Situacao onNext={() => goTo(4)} />
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
      produto="Auto Equity"
    >
      <StepWrapper stepKey={step}>{content()}</StepWrapper>
    </FunnelShell>
  )
}
