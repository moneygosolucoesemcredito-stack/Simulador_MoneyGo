"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { criarSupabaseBrowser } from "@/lib/supabase/client"
import { LogIn, AlertCircle } from "lucide-react"
import { BRAND } from "@/lib/brand"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const destino = searchParams.get("next") || "/operador"

  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setCarregando(true)
    try {
      const supabase = criarSupabaseBrowser()
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) {
        setErro("E-mail ou senha incorretos.")
        return
      }
      router.push(destino)
      router.refresh()
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="h-11"
        />
      </div>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {erro}
        </div>
      )}

      <Button
        type="submit"
        disabled={carregando || !email || !senha}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
      >
        <LogIn className="h-4 w-4 mr-2" />
        {carregando ? "Entrando…" : "Entrar"}
      </Button>

      <div className="text-center">
        <Link
          href="/recuperar-senha"
          className="text-sm font-medium text-[var(--gold-dark)] hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        As contas são criadas pela administração.
      </p>
    </form>
  )
}

export default function OperadorLoginPage() {
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
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Área do parceiro</h1>
            <p className="text-sm text-muted-foreground">Acesso restrito a parceiros MoneyGo</p>
          </div>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
