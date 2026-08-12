import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  mensagemDoErroDeSenha,
  mensagemDoLink,
  motivoDoLink,
} from "@/lib/supabase/erros-auth"

// --- Stub do cliente Supabase usado pelo Route Handler -----------------------

const verifyOtp = vi.fn()
const exchangeCodeForSession = vi.fn()

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    opcoes: { cookies: { setAll: (l: unknown[]) => void } }
  ) => {
    // Grava um cookie de sessão como o cliente real faria, para o teste
    // conseguir verificar que ele chega na resposta do redirect.
    const gravarSessao = () =>
      opcoes.cookies.setAll([
        { name: "sb-teste-auth-token", value: "sessao", options: { path: "/" } },
      ])

    return {
      auth: {
        verifyOtp: async (args: unknown) => {
          const r = await verifyOtp(args)
          if (!r?.error) gravarSessao()
          return r
        },
        exchangeCodeForSession: async (args: unknown) => {
          const r = await exchangeCodeForSession(args)
          if (!r?.error) gravarSessao()
          return r
        },
      },
    }
  },
}))

vi.mock("@/lib/brand", () => ({
  BRAND: { supabase: { url: "https://projeto.supabase.co", anonKey: "anon" } },
}))

const { GET } = await import("@/app/auth/confirm/route")
const { NextRequest } = await import("next/server")

const ORIGEM = "https://simuladormoneygo.netlify.app"

function chamar(query: string) {
  return GET(new NextRequest(`${ORIGEM}/auth/confirm${query}`))
}

function destino(res: Response) {
  return new URL(res.headers.get("location")!)
}

describe("/auth/confirm", () => {
  beforeEach(() => {
    verifyOtp.mockReset().mockResolvedValue({ error: null })
    exchangeCodeForSession.mockReset().mockResolvedValue({ error: null })
  })

  it("valida token_hash com verifyOtp e leva ao destino já com a sessão em cookie", async () => {
    const res = await chamar("?token_hash=abc123&type=recovery&next=%2Fredefinir-senha")

    expect(verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc123" })
    expect(res.status).toBe(307)
    expect(destino(res).pathname).toBe("/redefinir-senha")
    expect(destino(res).search).toBe("")
    expect(res.headers.get("set-cookie")).toContain("sb-teste-auth-token=sessao")
  })

  it("assume type=recovery quando o link não traz o parâmetro", async () => {
    await chamar("?token_hash=abc123")
    expect(verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc123" })
  })

  it("valida o convite de parceiro e leva para /criar-senha", async () => {
    const res = await chamar("?token_hash=convite123&type=invite&next=%2Fcriar-senha")

    expect(verifyOtp).toHaveBeenCalledWith({ type: "invite", token_hash: "convite123" })
    expect(destino(res).pathname).toBe("/criar-senha")
    expect(destino(res).search).toBe("")
    expect(res.headers.get("set-cookie")).toContain("sb-teste-auth-token=sessao")
  })

  it("devolve o convite recusado para /criar-senha, não para a recuperação", async () => {
    verifyOtp.mockResolvedValue({ error: { code: "otp_expired", message: "expired" } })

    const res = await chamar("?token_hash=velho&type=invite&next=%2Fcriar-senha")

    expect(destino(res).pathname).toBe("/criar-senha")
    expect(destino(res).searchParams.get("erro")).toBe("expirado")
  })

  it("troca o código do fluxo PKCE por sessão quando o link vem com ?code=", async () => {
    const res = await chamar("?code=pkce-code&next=%2Fredefinir-senha")

    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code")
    expect(destino(res).pathname).toBe("/redefinir-senha")
    expect(res.headers.get("set-cookie")).toContain("sb-teste-auth-token=sessao")
  })

  it("marca o link como expirado quando o verifyOtp recusa o token", async () => {
    verifyOtp.mockResolvedValue({ error: { code: "otp_expired", message: "Token has expired" } })

    const res = await chamar("?token_hash=velho&type=recovery")

    expect(destino(res).pathname).toBe("/redefinir-senha")
    expect(destino(res).searchParams.get("erro")).toBe("expirado")
  })

  it("repassa o erro que o próprio Supabase devolve no redirect", async () => {
    const res = await chamar("?error=access_denied&error_code=otp_expired")

    expect(verifyOtp).not.toHaveBeenCalled()
    expect(destino(res).searchParams.get("erro")).toBe("expirado")
  })

  it("recusa link sem token e sem código", async () => {
    const res = await chamar("")
    expect(destino(res).searchParams.get("erro")).toBe("invalido")
  })

  it("ignora `next` externo para não virar open redirect", async () => {
    const externo = await chamar("?token_hash=abc&next=https%3A%2F%2Fatacante.com")
    expect(destino(externo).origin).toBe(ORIGEM)
    expect(destino(externo).pathname).toBe("/redefinir-senha")

    const protocoloRelativo = await chamar("?token_hash=abc&next=%2F%2Fatacante.com")
    expect(destino(protocoloRelativo).origin).toBe(ORIGEM)
    expect(destino(protocoloRelativo).pathname).toBe("/redefinir-senha")
  })
})

describe("mensagens de erro do fluxo de senha", () => {
  it("distingue link expirado de link inválido", () => {
    expect(motivoDoLink("otp_expired")).toBe("expirado")
    expect(motivoDoLink("expirado")).toBe("expirado")
    expect(motivoDoLink("access_denied")).toBe("invalido")
    expect(motivoDoLink(null)).toBe("invalido")
    expect(mensagemDoLink("expirado")).not.toBe(mensagemDoLink("invalido"))
  })

  it("fala de convite, e não de recuperação, quando o contexto é o convite", () => {
    expect(mensagemDoLink("expirado", "convite")).toMatch(/convite/i)
    expect(mensagemDoLink("invalido", "convite")).toMatch(/login/i)
    expect(mensagemDoLink("expirado", "recuperacao")).not.toMatch(/convite/i)
  })

  it("traduz os erros de updateUser que o usuário resolve sozinho", () => {
    expect(mensagemDoErroDeSenha("same_password", "")).toMatch(/diferente da atual/i)
    expect(mensagemDoErroDeSenha("weak_password", "")).toMatch(/fraca/i)
    expect(mensagemDoErroDeSenha("session_not_found", "")).toMatch(/novo link/i)
    expect(mensagemDoErroDeSenha(undefined, "algo inesperado")).toMatch(
      /não foi possível salvar a senha/i
    )
  })
})
