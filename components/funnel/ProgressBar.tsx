"use client"

import { Progress } from "@/components/ui/progress"

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  label?: string
}

export function ProgressBar({ currentStep, totalSteps, label }: ProgressBarProps) {
  const percent = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label ?? `Etapa ${currentStep} de ${totalSteps}`}</span>
        <span>{percent}%</span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  )
}
