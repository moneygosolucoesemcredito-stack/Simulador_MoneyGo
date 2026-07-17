"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, Car, CarFront, Home, HardHat, UserCog, UserRound, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/brand"

const PRODUTOS = [
  { id: "home-equity", rota: "/home-equity", titulo: "Home Equity", sub: "Garantia de imóvel", icon: Building2 },
  { id: "auto-equity", rota: "/auto-equity", titulo: "Auto Equity", sub: "Garantia de veículo", icon: Car },
  { id: "financiamento-imobiliario", rota: "/financiamento-imobiliario", titulo: "Financiamento Imobiliário", sub: "Compra ou refinanciamento", icon: Home },
  { id: "credito-construcao", rota: "/credito-construcao", titulo: "Crédito para Construção", sub: "Construção em terreno", icon: HardHat },
  { id: "financiamento-veiculo", rota: "/financiamento-veiculo", titulo: "Financiamento de Veículo", sub: "Compra de carro novo ou usado", icon: CarFront },
] as const

function Portaria() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const produtoInicial = searchParams.get("produto") || ""
  const [mostrarProdutos, setMostrarProdutos] = useState(false)

  function irParaCliente(rota: string) {
    router.push(`${rota}?modo=cliente`)
  }

  function escolherCliente() {
    const match = PRODUTOS.find((p) => p.id === produtoInicial)
    if (match) {
      irParaCliente(match.rota)
    } else {
      setMostrarProdutos(true)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Como você quer continuar?</h1>
        <p className="text-sm text-muted-foreground">
          Simule você mesmo ou acesse a área do consultor.
        </p>
      </div>

      {!mostrarProdutos ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={escolherCliente}
            className="w-full flex items-center gap-3 rounded-2xl border-2 border-border p-4 text-left transition-all hover:border-[var(--gold)]/60"
          >
            <div className="w-11 h-11 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
              <UserRound className="w-6 h-6 text-[var(--gold)]" />
            </div>
            <div className="min-w-0">
              <span className="block font-semibold">Quero simular</span>
              <span className="block text-xs text-muted-foreground">
                Faça sua simulação e fale com um especialista
              </span>
            </div>
            <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground shrink-0" />
          </button>

          <Link
            href="/operador/login"
            className="w-full flex items-center gap-3 rounded-2xl border-2 border-border p-4 text-left transition-all hover:border-[var(--gold)]/60"
          >
            <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <UserCog className="w-6 h-6 text-foreground" />
            </div>
            <div className="min-w-0">
              <span className="block font-semibold">Sou Parceiro {BRAND.name}</span>
              <span className="block text-xs text-muted-foreground">
                Acesse para definir a taxa e gerar links
              </span>
            </div>
            <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground shrink-0" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium">Escolha o produto para simular</p>
          <div className="grid grid-cols-1 gap-2.5">
            {PRODUTOS.map((p) => {
              const Icon = p.icon
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => irParaCliente(p.rota)}
                  className="flex items-center gap-3 rounded-xl border-2 border-border p-3.5 text-left transition-all hover:border-[var(--gold)]/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[var(--gold)]" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{p.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{p.sub}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground shrink-0" />
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setMostrarProdutos(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Voltar
          </button>
        </div>
      )}
    </div>
  )
}

export default function EntrarPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-white">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="shrink-0">
            <Image
              src={BRAND.logos.full}
              alt={BRAND.fullName}
              width={BRAND.logos.width}
              height={BRAND.logos.height}
              unoptimized
              priority
              className="h-12 w-auto"
            />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Suspense fallback={null}>
          <Portaria />
        </Suspense>
      </main>
    </div>
  )
}
