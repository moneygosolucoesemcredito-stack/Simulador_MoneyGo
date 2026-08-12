import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { BRAND } from "@/lib/brand"

// No Next 16 o antigo `middleware.ts` foi renomeado para `proxy.ts`.
// Aqui fazemos o refresh da sessão do Supabase e protegemos /operador.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    BRAND.supabase.url,
    BRAND.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const ehLogin = path === "/operador/login"

  function irPara(pathname: string, params?: Record<string, string>) {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = ""
    for (const [chave, valor] of Object.entries(params ?? {})) {
      url.searchParams.set(chave, valor)
    }
    return NextResponse.redirect(url)
  }

  // Sem sessão: o login é a única página aberta da área.
  if (!user) {
    return ehLogin ? response : irPara("/operador/login", { next: path })
  }

  // Com sessão, a allowlist `operadores` decide o acesso ao painel. Contas de
  // CLIENTE (criadas pelo link do consultor) também vivem em `auth.users` e
  // não podem entrar aqui.
  const { data: operador } = await supabase
    .from("operadores")
    .select("id")
    .eq("id", user.id)
    .maybeSingle()

  if (ehLogin) {
    // Só encurta o caminho de quem de fato tem acesso. Mandar todo mundo que
    // tem sessão para /operador prendia num laço quem não é operador:
    // login → /operador → home → login, sem nunca ver o formulário nem um
    // botão de sair.
    return operador ? irPara("/operador") : response
  }

  if (!operador) {
    // Volta para o login com o motivo à vista, em vez de um salto silencioso
    // para a home — lá o usuário consegue sair e entrar com outra conta.
    return irPara("/operador/login", { erro: "sem_acesso" })
  }

  return response
}

export const config = {
  matcher: ["/operador/:path*"],
}
