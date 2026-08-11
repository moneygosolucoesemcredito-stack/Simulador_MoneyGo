import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { BRAND } from "@/lib/brand"

/**
 * Endpoint de callback do Supabase Auth (recuperação de senha, convite,
 * confirmação de e-mail, magic link).
 *
 * Atende aos dois formatos que o Supabase pode entregar:
 *
 * 1. `?token_hash=...&type=recovery`  — formato recomendado. O template de
 *    e-mail monta o link com `{{ .TokenHash }}` e nós validamos aqui no
 *    servidor com `verifyOtp`. Não depende de nada guardado no navegador,
 *    então funciona quando o usuário pede o link no desktop e abre no celular.
 *
 * 2. `?code=...` — fluxo PKCE do `{{ .ConfirmationURL }}` padrão. O
 *    `code_verifier` foi gravado em cookie pelo `createBrowserClient`
 *    (@supabase/ssr), então o servidor consegue lê-lo e chamar
 *    `exchangeCodeForSession`. Só funciona no mesmo navegador que pediu o link.
 *
 * Em ambos os casos a sessão de recuperação é gravada nos cookies da resposta
 * antes do redirect, e a página de destino já abre autenticada — sem corrida
 * com `detectSessionInUrl` no cliente.
 */
// Troca de token/cookie de sessão: nunca pode ser pré-renderizado nem cacheado.
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl

  const tokenHash = searchParams.get("token_hash")
  const code = searchParams.get("code")
  const type = (searchParams.get("type") ?? "recovery") as EmailOtpType
  const destino = rotaInterna(searchParams.get("next")) ?? "/redefinir-senha"

  // Cookies que o cliente Supabase quiser gravar. Só são aplicados no final,
  // quando já sabemos para onde redirecionar.
  const cookiesParaGravar: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(BRAND.supabase.url, BRAND.supabase.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(lista) {
        cookiesParaGravar.push(...lista)
      },
    },
  })

  function responder(caminho: string) {
    const response = NextResponse.redirect(new URL(caminho, origin))
    cookiesParaGravar.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options)
    )
    return response
  }

  // O próprio /auth/v1/verify do Supabase redireciona para cá com `error=...`
  // quando o token já foi usado ou expirou. Repassamos o motivo.
  const erroSupabase = searchParams.get("error_code") ?? searchParams.get("error")
  if (erroSupabase) {
    return responder(`${destino}?erro=${motivo(erroSupabase)}`)
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (error) {
      return responder(`${destino}?erro=${motivo(error.code ?? error.message)}`)
    }
    return responder(destino)
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return responder(`${destino}?erro=${motivo(error.code ?? error.message)}`)
    }
    return responder(destino)
  }

  return responder(`${destino}?erro=invalido`)
}

/**
 * Só aceita caminhos internos como destino do redirect. Evita open redirect
 * via `?next=https://site-malicioso` ou `?next=//site-malicioso`.
 */
function rotaInterna(valor: string | null): string | null {
  if (!valor) return null
  if (!valor.startsWith("/") || valor.startsWith("//")) return null
  return valor
}

/** Normaliza o erro do Supabase no código curto que a UI sabe traduzir. */
function motivo(codigo: string): "expirado" | "invalido" {
  return /expired/i.test(codigo) ? "expirado" : "invalido"
}
