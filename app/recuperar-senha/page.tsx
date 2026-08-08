"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { criarSupabaseBrowser } from "@/lib/supabase/client"
import { AlertCircle, MailCheck, ArrowLeft } from "lucide-react"
import { BRAND } from "@/lib/brand"
import { mensagemDoErro } from "@/lib/auth/recuperacao"

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setCarregando(true)
    try {
      const supabase = criarSupabaseBrowser()
      // O link do e-mail cai em /auth/confirm, que valida o token no servidor
      // e só então manda para a tela de nova senha. Esta URL precisa estar na
      // allowlist do Supabase (Authentication > URL Configuration).
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm`,
      })
      // Erro de envio (limite de e-mails, SMTP fora do ar) precisa aparecer:
      // sem isso o parceiro fica esperando um e-mail que nunca saiu. E-mail
      // inexistente não gera erro — o Supabase responde sucesso de propósito,
      // e é assim que evitamos revelar quem tem conta.
      if (error) {
        setErro(mensagemDoErro(error.code))
        return
      }
      setEnviado(true)
    } catch {
      setErro("Não foi possível enviar agora. Verifique sua conexão e tente de novo.")
    } finally {
      setCarregando(false)
    }
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
          {enviado ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <MailCheck className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight">Verifique seu e-mail</h1>
                <p className="text-sm text-muted-foreground">
                  Se existir uma conta para <strong>{email}</strong>, você receberá um
                  link para redefinir a senha. O link expira em alguns minutos.
                </p>
              </div>
              <Link
                href="/operador/login"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
                <p className="text-sm text-muted-foreground">
                  Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.
                </p>
              </div>
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

                {erro && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {erro}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={carregando || !email}
                  className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
                >
                  {carregando ? "Enviando…" : "Enviar link de recuperação"}
                </Button>
                <Link
                  href="/operador/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar ao login
                </Link>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
