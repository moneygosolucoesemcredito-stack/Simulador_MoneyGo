"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { criarSupabaseBrowser } from "@/lib/supabase/client"
import {
  mensagemDoErroDeSenha,
  mensagemDoLink,
  motivoDoLink,
  type ContextoDoLink,
} from "@/lib/supabase/erros-auth"
import { AlertCircle, KeyRound, Loader2 } from "lucide-react"
import { BRAND } from "@/lib/brand"

type Estado = "carregando" | "pronto" | "invalido" | "salvando" | "sucesso"

/** Quanto esperamos por uma troca de token que ainda vai acontecer no cliente. */
const TIMEOUT_TROCA_MS = 10_000

export interface DefinirSenhaFormProps {
  /** Muda apenas os textos de link inválido/expirado. */
  contexto: ContextoDoLink
  titulo: string
  subtitulo: string
  textoValidando: string
  tituloLinkInvalido: string
  /** Ação oferecida quando o link não vale mais. */
  saida: { href: string; label: string }
  textoBotao: string
  tituloSucesso: string
}

/**
 * Formulário de definição de senha para quem chegou por um link de e-mail —
 * recuperação de senha ou convite de parceiro. Nos dois casos o
 * `/auth/confirm` já validou o token no servidor e gravou a sessão em cookie;
 * aqui só resta gravar a credencial com `updateUser`.
 */
export function DefinirSenhaForm({
  contexto,
  titulo,
  subtitulo,
  textoValidando,
  tituloLinkInvalido,
  saida,
  textoBotao,
  tituloSucesso,
}: DefinirSenhaFormProps) {
  const router = useRouter()
  const supabaseRef = useRef<ReturnType<typeof criarSupabaseBrowser> | null>(null)
  const [estado, setEstado] = useState<Estado>("carregando")
  const [senha, setSenha] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const [erro, setErro] = useState("")
  const [erroLink, setErroLink] = useState(() => mensagemDoLink("invalido", contexto))

  useEffect(() => {
    const supabase = criarSupabaseBrowser()
    supabaseRef.current = supabase

    let ativo = true
    let timer: ReturnType<typeof setTimeout> | undefined

    function liberar() {
      if (!ativo) return
      limparUrl()
      setEstado((e) => (e === "carregando" ? "pronto" : e))
    }

    function invalidar(codigo: string | null) {
      if (!ativo) return
      setErroLink(mensagemDoLink(motivoDoLink(codigo), contexto))
      setEstado((e) => (e === "carregando" ? "invalido" : e))
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (sessao) liberar()
    })

    void (async () => {
      const params = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))

      // Motivo repassado pelo /auth/confirm, ou erro que o próprio Supabase
      // devolveu no redirect (token já usado, expirado, access_denied…).
      const codigoErro =
        params.get("erro") ??
        params.get("error_code") ??
        params.get("error") ??
        hash.get("error_code") ??
        hash.get("error")

      if (codigoErro) {
        limparUrl()
        invalidar(codigoErro)
        return
      }

      // Caminho normal: /auth/confirm já validou o token no servidor e gravou
      // os cookies, então a sessão já existe aqui.
      const { data } = await supabase.auth.getSession()
      if (!ativo) return
      if (data.session) {
        liberar()
        return
      }

      // Links antigos, já entregues, apontam direto para esta página com
      // `?code=` (PKCE) ou `#access_token=` (implícito). Aí quem troca é o
      // `detectSessionInUrl` do cliente — damos tempo a ele em vez de declarar
      // o link inválido de imediato.
      const trocaEmAndamento = params.has("code") || hash.has("access_token")
      if (!trocaEmAndamento) {
        invalidar("invalido")
        return
      }

      timer = setTimeout(async () => {
        const { data: atual } = await supabase.auth.getSession()
        if (!ativo) return
        if (atual.session) liberar()
        else invalidar("invalido")
      }, TIMEOUT_TROCA_MS)
    })()

    return () => {
      ativo = false
      sub.subscription.unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [contexto])

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

    const supabase = supabaseRef.current
    if (!supabase) return

    setEstado("salvando")

    const { error } = await supabase.auth.updateUser({ password: senha })

    if (error) {
      setErro(mensagemDoErroDeSenha(error.code, error.message))
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
              <p className="text-sm">{textoValidando}</p>
            </div>
          )}

          {estado === "invalido" && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight">{tituloLinkInvalido}</h1>
                <p className="text-sm text-muted-foreground">{erroLink}</p>
              </div>
              <Link
                href={saida.href}
                className="text-sm font-medium text-[var(--gold-dark)] hover:underline"
              >
                {saida.label}
              </Link>
            </div>
          )}

          {(estado === "pronto" || estado === "salvando") && (
            <>
              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
                <p className="text-sm text-muted-foreground">{subtitulo}</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="senha">Senha</Label>
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
                  <Label htmlFor="confirmacao">Confirmar senha</Label>
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
                  {estado === "salvando" ? "Salvando…" : textoBotao}
                </Button>
              </form>
            </>
          )}

          {estado === "sucesso" && (
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold tracking-tight">{tituloSucesso}</h1>
              <p className="text-sm text-muted-foreground">Redirecionando…</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

/** Tira código/token/erro da barra de endereço — o link não deve ficar no histórico. */
function limparUrl() {
  if (!window.location.search && !window.location.hash) return
  window.history.replaceState({}, "", window.location.pathname)
}
