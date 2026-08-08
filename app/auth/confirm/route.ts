import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { criarSupabaseServer } from "@/lib/supabase/server"
import { caminhoComErro, caminhoInternoSeguro } from "@/lib/auth/recuperacao"

/**
 * Ponto de entrada dos links de e-mail do Supabase (recuperação de senha e
 * convite de parceiro).
 *
 * Validar aqui, no servidor, em vez de deixar para o browser, resolve os dois
 * jeitos mais comuns de o link "não funcionar":
 *  - o parceiro pede a recuperação no computador e abre o e-mail no celular
 *    (o verificador PKCE fica no navegador de origem, e a troca falha lá);
 *  - antivírus e filtros de e-mail corporativo abrem o link antes da pessoa,
 *    queimando o token de uso único.
 * Com `token_hash` nenhum estado precisa existir no navegador — qualquer
 * aparelho abre o link e a sessão é gravada em cookie na resposta.
 *
 * Formatos aceitos:
 *  - `/auth/confirm?token_hash=…&type=recovery&next=/redefinir-senha`
 *  - `/auth/confirm?code=…`  (template padrão `{{ .ConfirmationURL }}`, PKCE)
 */

// Precisa ler e gravar cookies de sessão a cada request.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TIPOS_ACEITOS: readonly EmailOtpType[] = [
  "recovery",
  "invite",
  "signup",
  "magiclink",
  "email",
  "email_change",
]

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const destino = caminhoInternoSeguro(params.get("next"))

  // O próprio Supabase já pode ter recusado o token antes de chegar aqui.
  const erroRecebido = params.get("error_code") ?? params.get("error")
  if (erroRecebido) redirect(caminhoComErro(destino, erroRecebido))

  const tokenHash = params.get("token_hash")
  const tipo = params.get("type") as EmailOtpType | null
  const code = params.get("code")

  if (!tokenHash && !code) redirect(caminhoComErro(destino, "validation_failed"))

  const supabase = await criarSupabaseServer()

  if (tokenHash) {
    if (!tipo || !TIPOS_ACEITOS.includes(tipo)) {
      redirect(caminhoComErro(destino, "validation_failed"))
    }
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
    if (error) redirect(caminhoComErro(destino, error.code ?? "access_denied"))
    redirect(destino)
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code!)
  if (error) redirect(caminhoComErro(destino, error.code ?? "access_denied"))
  redirect(destino)
}
