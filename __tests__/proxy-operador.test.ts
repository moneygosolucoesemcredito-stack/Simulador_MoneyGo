import { describe, it, expect, vi, beforeEach } from "vitest"

const getUser = vi.fn()
const buscarOperador = vi.fn()

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: () => getUser() },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => buscarOperador() }),
      }),
    }),
  }),
}))

vi.mock("@/lib/brand", () => ({
  BRAND: { supabase: { url: "https://projeto.supabase.co", anonKey: "anon" } },
}))

const { proxy } = await import("@/proxy")
const { NextRequest } = await import("next/server")

const ORIGEM = "https://simuladormoneygo.netlify.app"

function acessar(path: string) {
  return proxy(new NextRequest(`${ORIGEM}${path}`))
}

/** `null` quando o proxy deixou a requisição seguir. */
function destino(res: Response) {
  const location = res.headers.get("location")
  return location ? new URL(location) : null
}

const SEM_SESSAO = { data: { user: null } }
const COM_SESSAO = { data: { user: { id: "user-1" } } }
const E_OPERADOR = { data: { id: "user-1" } }
const NAO_E_OPERADOR = { data: null }

describe("proxy — acesso à área do operador", () => {
  beforeEach(() => {
    getUser.mockReset().mockResolvedValue(COM_SESSAO)
    buscarOperador.mockReset().mockResolvedValue(E_OPERADOR)
  })

  it("manda visitante sem sessão para o login, guardando o destino", async () => {
    getUser.mockResolvedValue(SEM_SESSAO)

    const res = await acessar("/operador")

    expect(destino(res)?.pathname).toBe("/operador/login")
    expect(destino(res)?.searchParams.get("next")).toBe("/operador")
  })

  it("deixa o login abrir para quem não tem sessão", async () => {
    getUser.mockResolvedValue(SEM_SESSAO)
    expect(destino(await acessar("/operador/login"))).toBeNull()
  })

  it("deixa o operador entrar no painel", async () => {
    expect(destino(await acessar("/operador"))).toBeNull()
  })

  it("encurta o caminho do operador que abre o login", async () => {
    const res = await acessar("/operador/login")
    expect(destino(res)?.pathname).toBe("/operador")
  })

  it("barra do painel quem tem sessão mas não está na allowlist", async () => {
    buscarOperador.mockResolvedValue(NAO_E_OPERADOR)

    const res = await acessar("/operador")

    expect(destino(res)?.pathname).toBe("/operador/login")
    expect(destino(res)?.searchParams.get("erro")).toBe("sem_acesso")
  })

  // Regressão: antes, quem tinha sessão sem estar na allowlist era mandado do
  // login para /operador, de lá para a home, e do "sou parceiro" de volta ao
  // login — um laço sem formulário à vista e sem como sair da conta.
  it("mostra o formulário de login para quem tem sessão sem acesso, em vez de prendê-lo num laço", async () => {
    buscarOperador.mockResolvedValue(NAO_E_OPERADOR)
    expect(destino(await acessar("/operador/login"))).toBeNull()
  })
})
