"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { ProgressBar } from "./ProgressBar"
import { BRAND } from "@/lib/brand"

interface FunnelShellProps {
  currentStep: number
  totalSteps: number
  onBack?: () => void
  showBack?: boolean
  children: React.ReactNode
  produto: string
}

export function FunnelShell({
  currentStep,
  totalSteps,
  onBack,
  showBack = true,
  children,
  produto,
}: FunnelShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            {/* h-10: a logo do MoneyGo é um lockup largo (1400×209) — acima disso
                ela consome o espaço do rótulo do produto ao lado. */}
            <Image
              src={BRAND.logos.full}
              alt={BRAND.fullName}
              width={BRAND.logos.width}
              height={BRAND.logos.height}
              unoptimized
              priority
              className="h-10 w-auto"
            />
          </Link>
          <span className="text-xs font-medium text-muted-foreground text-right hidden sm:block">
            {produto}
          </span>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-lg mx-auto w-full px-4 pt-4">
        <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
      </div>

      {/* Back button */}
      {showBack && currentStep > 1 && onBack && (
        <div className="max-w-lg mx-auto w-full px-4 pt-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      )}

      {/* Step content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer note */}
      <footer className="max-w-lg mx-auto w-full px-4 pb-6 text-center">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Simulação sem compromisso. Sujeita a análise de crédito.{" "}
          <Link href="/privacidade" className="underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </footer>
    </div>
  )
}
