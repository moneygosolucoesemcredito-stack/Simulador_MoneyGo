import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// No Next 16 o antigo `middleware.ts` foi renomeado para `proxy.ts`.
// Aqui fazemos o refresh da sessão do Supabase e protegemos /operador.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Sem sessão tentando acessar o painel → manda para o login.
  if (path.startsWith("/operador") && !ehLogin && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/operador/login"
    url.searchParams.set("next", path)
    return NextResponse.redirect(url)
  }

  // Já logado e indo para o login → manda para o painel.
  if (ehLogin && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/operador"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/operador/:path*"],
}
