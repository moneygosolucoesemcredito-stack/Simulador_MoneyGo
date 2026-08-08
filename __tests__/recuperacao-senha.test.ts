import { describe, it, expect } from "vitest"
import {
  CAMINHO_REDEFINICAO,
  caminhoComErro,
  caminhoInternoSeguro,
  extrairErroDaUrl,
  mensagemDoErro,
  temCredencialNaUrl,
} from "@/lib/auth/recuperacao"

describe("caminhoInternoSeguro", () => {
  it("aceita caminho relativo do próprio site", () => {
    expect(caminhoInternoSeguro("/redefinir-senha")).toBe("/redefinir-senha")
    expect(caminhoInternoSeguro("/operador?aba=links")).toBe("/operador?aba=links")
  })

  it("cai no padrão quando não vem nada", () => {
    expect(caminhoInternoSeguro(null)).toBe(CAMINHO_REDEFINICAO)
    expect(caminhoInternoSeguro(undefined)).toBe(CAMINHO_REDEFINICAO)
    expect(caminhoInternoSeguro("")).toBe(CAMINHO_REDEFINICAO)
  })

  it("recusa URL absoluta — o link do e-mail não pode levar para fora", () => {
    expect(caminhoInternoSeguro("https://evil.com")).toBe(CAMINHO_REDEFINICAO)
    expect(caminhoInternoSeguro("//evil.com")).toBe(CAMINHO_REDEFINICAO)
    expect(caminhoInternoSeguro("/\\evil.com")).toBe(CAMINHO_REDEFINICAO)
    expect(caminhoInternoSeguro("javascript:alert(1)")).toBe(CAMINHO_REDEFINICAO)
  })

  it("recusa caminho com espaço ou caractere de controle", () => {
    expect(caminhoInternoSeguro("/\t/evil.com")).toBe(CAMINHO_REDEFINICAO)
    expect(caminhoInternoSeguro("/\n/evil.com")).toBe(CAMINHO_REDEFINICAO)
    expect(caminhoInternoSeguro("/rota com espaco")).toBe(CAMINHO_REDEFINICAO)
  })
})

describe("caminhoComErro", () => {
  it("anexa o código do erro na query", () => {
    expect(caminhoComErro("/redefinir-senha", "otp_expired")).toBe(
      "/redefinir-senha?error_code=otp_expired"
    )
  })

  it("preserva a query que o destino já tinha", () => {
    expect(caminhoComErro("/redefinir-senha?next=/operador", "access_denied")).toBe(
      "/redefinir-senha?next=%2Foperador&error_code=access_denied"
    )
  })
})

describe("mensagemDoErro", () => {
  it("explica link expirado e diz o que fazer", () => {
    expect(mensagemDoErro("otp_expired")).toMatch(/expirou/i)
    expect(mensagemDoErro("otp_expired")).toMatch(/novo/i)
  })

  it("explica que o PKCE exige o mesmo navegador", () => {
    expect(mensagemDoErro("flow_state_not_found")).toMatch(/mesmo navegador/i)
    expect(mensagemDoErro("bad_code_verifier")).toMatch(/mesmo navegador/i)
  })

  it("cai numa mensagem genérica para código desconhecido ou ausente", () => {
    expect(mensagemDoErro("codigo_que_nao_existe")).toMatch(/novo link/i)
    expect(mensagemDoErro(null)).toMatch(/novo link/i)
  })

  it("nunca devolve texto vazio", () => {
    for (const codigo of ["otp_expired", "access_denied", "", null, undefined]) {
      expect(mensagemDoErro(codigo).length).toBeGreaterThan(0)
    }
  })
})

describe("extrairErroDaUrl", () => {
  it("lê o erro da query (fluxo token_hash / PKCE)", () => {
    const erro = extrairErroDaUrl("?error_code=otp_expired", "")
    expect(erro?.codigo).toBe("otp_expired")
    expect(erro?.mensagem).toMatch(/expirou/i)
  })

  it("lê o erro do fragmento (fluxo implícito)", () => {
    const erro = extrairErroDaUrl("", "#error=access_denied&error_description=Email+link+is+invalid")
    expect(erro?.codigo).toBe("access_denied")
  })

  it("prefere error_code, que é mais específico que error", () => {
    const erro = extrairErroDaUrl("?error=access_denied&error_code=otp_expired", "")
    expect(erro?.codigo).toBe("otp_expired")
  })

  it("devolve null quando a URL não reporta erro", () => {
    expect(extrairErroDaUrl("?code=abc", "")).toBeNull()
    expect(extrairErroDaUrl("", "")).toBeNull()
  })
})

describe("temCredencialNaUrl", () => {
  it("reconhece os três formatos de link", () => {
    expect(temCredencialNaUrl("?token_hash=abc&type=recovery", "")).toBe(true)
    expect(temCredencialNaUrl("?code=abc", "")).toBe(true)
    expect(temCredencialNaUrl("", "#access_token=abc&type=recovery")).toBe(true)
  })

  it("é falso quando a pessoa abriu a página direto", () => {
    expect(temCredencialNaUrl("", "")).toBe(false)
    expect(temCredencialNaUrl("?utm_source=email", "")).toBe(false)
  })
})
