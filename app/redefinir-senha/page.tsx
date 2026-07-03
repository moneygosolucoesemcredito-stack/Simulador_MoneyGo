"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { criarSupabaseBrowser } from "@/lib/supabase/client"
import { AlertCircle, KeyRound, Loader2 } from "lucide-react"
import { BRAND } from "@/lib/brand"

type Estado = "carregando" | "pronto" | "invalido" | "salvando" | "sucesso"

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof criarSupabaseBrowser> | null>(null)
  const [estado, setEstado] = useState<Estado>("carregando")
  const [senha, setSenha] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const [erro, setErro] = useState("")

  useEffect(() => {
    // O cliente troca o código de recuperação da URL por uma sessão
    // automaticamente ao ser criado (detectSessionInUrl).
    const supabase = criarSupabaseBrowser()
    supabaseRef.current = supabase

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setEstado((e) => (e === "carregando" ? "pronto" : e))
    })

    // Se depois de um instante ainda não há sessão, o link é inválido/expirado.
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      setEstado((e) => (e === "carregando" ? (data.session ? "pronto" : "invalido") : e))
    }, 1500)

    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    if (senha.length < 8) {
      setErro("A senha deve ter ao menos 8 caracteres.")
      return
    }
    if (senha !== confirmacao) {
      setErro("As senhas não conferem.")
      return
    }
    setEstado("salvando")
    const { error } = await supabaseRef.current!.auth.updateUser({ password: senha })
    if (error) {
      setErro("Não foi possível redefinir a senha. Tente novamente ou solicite um novo link.")
      setEstado("pronto")
      return
    }
    setEstado("sucesso")
    setTimeout(() => {
      router.push("/operador")
      router.refresh()
    }, 1500)
  }

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
          {estado === "carregando" && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Validando link de recuperação…</p>
            </div>
          )}

          {estado === "invalido" && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight">Link inválido ou expirado</h1>
                <p className="text-sm text-muted-foreground">
                  Solicite um novo link de recuperação para continuar.
                </p>
              </div>
              <Link href="/recuperar-senha" className="text-sm font-medium text-[var(--gold-dark)] hover:underline">
                Solicitar novo link
              </Link>
            </div>
          )}

          {(estado === "pronto" || estado === "salvando") && (
            <>
              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-bold tracking-tight">Definir nova senha</h1>
                <p className="text-sm text-muted-foreground">
                  Escolha uma nova senha para a sua conta.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="senha">Nova senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmacao">Confirmar nova senha</Label>
                  <Input
                    id="confirmacao"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
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
                  disabled={estado === "salvando" || !senha || !confirmacao}
                  className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {estado === "salvando" ? "Salvando…" : "Salvar nova senha"}
                </Button>
              </form>
            </>
          )}

          {estado === "sucesso" && (
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold tracking-tight">Senha redefinida!</h1>
              <p className="text-sm text-muted-foreground">Redirecionando…</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
