"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Building2,
  Car,
  Home,
  HardHat,
  PlayCircle,
  Share2,
  Copy,
  Check,
  ArrowRight,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { criarSupabaseBrowser } from "@/lib/supabase/client"
import { parseTaxaPercent, taxaDentroFaixa, taxaParaPercentStr, descricaoFaixa } from "@/lib/taxa"
import { BRAND } from "@/lib/brand"

type TipoPessoa = "PF" | "PJ"
type FormaOfertar = "simular" | "link"

const PRODUTOS = [
  { id: "home_equity", rota: "/home-equity", titulo: "Home Equity", sub: "Garantia de imóvel", icon: Building2, fluxoCompleto: true },
  { id: "auto_equity", rota: "/auto-equity", titulo: "Auto Equity", sub: "Garantia de veículo", icon: Car, fluxoCompleto: false },
  { id: "financiamento_imobiliario", rota: "/financiamento-imobiliario", titulo: "Financiamento Imobiliário", sub: "Compra ou refinanciamento", icon: Home, fluxoCompleto: false },
  { id: "credito_construcao", rota: "/credito-construcao", titulo: "Crédito para Construção", sub: "Construção em terreno", icon: HardHat, fluxoCompleto: false },
] as const

export default function OperadorPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [pessoa, setPessoa] = useState<TipoPessoa | "">("")
  const [produtoId, setProdutoId] = useState<(typeof PRODUTOS)[number]["id"] | "">("")
  const [forma, setForma] = useState<FormaOfertar | "">("")
  const [taxaRaw, setTaxaRaw] = useState("")
  const [link, setLink] = useState("")
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const supabase = criarSupabaseBrowser()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  const produto = PRODUTOS.find((p) => p.id === produtoId) ?? null
  const taxaDigitada = parseTaxaPercent(taxaRaw)
  const taxaValida = taxaDigitada != null && taxaDentroFaixa(taxaDigitada, "home_equity")
  const foraDaFaixa = taxaRaw.trim() !== "" && !taxaValida

  const linkDisponivel = !!produto?.fluxoCompleto
  const formaEfetiva: FormaOfertar | "" = forma === "link" && !linkDisponivel ? "" : forma

  async function sair() {
    const supabase = criarSupabaseBrowser()
    await supabase.auth.signOut()
    router.push("/operador/login")
    router.refresh()
  }

  function iniciarSimulacao() {
    if (!produto || !pessoa) return
    if (produto.fluxoCompleto) {
      router.push(`${produto.rota}?modo=op&pessoa=${pessoa}`)
    } else {
      router.push(produto.rota)
    }
  }

  function gerarLink() {
    if (!produto || !pessoa || !taxaValida || !taxaDigitada) return
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const url = `${origin}${produto.rota}?t=${taxaParaPercentStr(taxaDigitada)}&pessoa=${pessoa}`
    setLink(url)
    setCopiado(false)
  }

  async function copiar() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* clipboard indisponível — usuário pode copiar manualmente */
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-white sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
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
          <div className="flex items-center gap-3">
            {email && <span className="text-xs text-muted-foreground hidden sm:block">{email}</span>}
            <button
              onClick={sair}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Nova simulação</h1>
          <p className="text-sm text-muted-foreground">
            Defina o cliente, o produto e como quer ofertar.
          </p>
        </div>

        {/* 1. Tipo de cliente */}
        <section className="space-y-3">
          <p className="text-sm font-medium">1. Tipo de cliente</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { v: "PF", label: "Pessoa Física", desc: "CPF" },
              { v: "PJ", label: "Pessoa Jurídica", desc: "CNPJ" },
            ] as { v: TipoPessoa; label: string; desc: string }[]).map((op) => (
              <button
                key={op.v}
                type="button"
                onClick={() => setPessoa(op.v)}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  pessoa === op.v
                    ? "border-[var(--gold)] bg-[var(--gold)]/10"
                    : "border-border hover:border-[var(--gold)]/50"
                )}
              >
                <span className="block text-sm font-medium">{op.label}</span>
                <span className="block text-xs text-muted-foreground">{op.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Produto */}
        <section className="space-y-3">
          <p className="text-sm font-medium">2. Produto</p>
          <div className="grid grid-cols-1 gap-2.5">
            {PRODUTOS.map((p) => {
              const Icon = p.icon
              const ativo = produtoId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProdutoId(p.id)
                    setLink("")
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all",
                    ativo
                      ? "border-[var(--gold)] bg-[var(--gold)]/10"
                      : "border-border hover:border-[var(--gold)]/50"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[var(--gold)]" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{p.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{p.sub}</span>
                  </div>
                  {!p.fluxoCompleto && (
                    <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      simulação padrão
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* 3. Forma de ofertar */}
        <section className="space-y-3">
          <p className="text-sm font-medium">3. Forma de ofertar</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForma("simular")}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition-all",
                formaEfetiva === "simular"
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : "border-border hover:border-[var(--gold)]/50"
              )}
            >
              <PlayCircle className="w-5 h-5 text-[var(--gold)] mb-1.5" />
              <span className="block text-sm font-medium">Fazer uma simulação</span>
              <span className="block text-xs text-muted-foreground">Você simula agora</span>
            </button>
            <button
              type="button"
              disabled={!linkDisponivel}
              onClick={() => setForma("link")}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                formaEfetiva === "link"
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : "border-border hover:border-[var(--gold)]/50"
              )}
            >
              <Share2 className="w-5 h-5 text-[var(--gold)] mb-1.5" />
              <span className="block text-sm font-medium">Compartilhar link</span>
              <span className="block text-xs text-muted-foreground">
                {linkDisponivel ? "Cliente simula sozinho" : "Em breve"}
              </span>
            </button>
          </div>
        </section>

        {/* 4. Ação */}
        {formaEfetiva === "simular" && (
          <Button
            onClick={iniciarSimulacao}
            disabled={!produto || !pessoa}
            className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
          >
            Iniciar simulação <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}

        {formaEfetiva === "link" && (
          <section className="space-y-3 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/[0.04] p-4">
            <p className="text-sm font-medium">Defina a taxa que irá no link</p>
            <div className="relative">
              <Input
                inputMode="decimal"
                placeholder="Ex.: 1,35"
                value={taxaRaw}
                onChange={(e) => {
                  setTaxaRaw(e.target.value)
                  setLink("")
                }}
                aria-invalid={foraDaFaixa}
                className="h-11 pr-16 text-base"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                % a.m.
              </span>
            </div>
            <p className={foraDaFaixa ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {foraDaFaixa
                ? `Taxa fora da faixa permitida. ${descricaoFaixa("home_equity")}`
                : descricaoFaixa("home_equity")}
            </p>

            <Button
              onClick={gerarLink}
              disabled={!produto || !pessoa || !taxaValida}
              className="w-full h-11 font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
            >
              <Share2 className="w-4 h-4 mr-2" /> Gerar link do cliente
            </Button>

            {link && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2">
                  <span className="text-xs text-muted-foreground truncate">{link}</span>
                  <button
                    type="button"
                    onClick={copiar}
                    className="ml-auto shrink-0 inline-flex items-center gap-1 text-xs font-medium text-[var(--gold-dark)] hover:underline"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Envie este link ao cliente. A taxa vai travada e não aparece para ele.
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
