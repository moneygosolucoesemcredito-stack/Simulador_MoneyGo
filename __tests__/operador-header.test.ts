import { describe, it, expect } from "vitest"
import {
  nomeColaborador,
  primeiroNomeColaborador,
  saudacaoColaborador,
} from "@/lib/operador"

/**
 * Cabeçalho da área do operador: a identificação passa de e-mail cru para
 * "Olá, [Nome]". O nome vem do user_metadata do Supabase Auth (não existe
 * tabela de parceiros); sem nome, o e-mail continua identificando a conta.
 */

describe("nome do colaborador a partir do metadata", () => {
  it("aceita as chaves usuais de nome", () => {
    expect(nomeColaborador({ user_metadata: { nome: "Daiana Hamud" } })).toBe("Daiana Hamud")
    expect(nomeColaborador({ user_metadata: { full_name: "Daiana Hamud" } })).toBe("Daiana Hamud")
    expect(nomeColaborador({ user_metadata: { name: "Daiana Hamud" } })).toBe("Daiana Hamud")
    expect(nomeColaborador({ user_metadata: { nome_completo: "Daiana Hamud" } })).toBe("Daiana Hamud")
    expect(nomeColaborador({ user_metadata: { display_name: "Daiana Hamud" } })).toBe("Daiana Hamud")
  })

  it("respeita a ordem de precedência entre as chaves", () => {
    expect(
      nomeColaborador({ user_metadata: { nome: "Daiana", full_name: "Outro Nome" } })
    ).toBe("Daiana")
  })

  it("normaliza espaços e ignora valores vazios ou de outro tipo", () => {
    expect(nomeColaborador({ user_metadata: { nome: "  Daiana   Hamud  " } })).toBe("Daiana Hamud")
    expect(nomeColaborador({ user_metadata: { nome: "   ", full_name: "Daiana" } })).toBe("Daiana")
    expect(nomeColaborador({ user_metadata: { nome: 42 } })).toBeNull()
    expect(nomeColaborador({ user_metadata: {} })).toBeNull()
    expect(nomeColaborador({})).toBeNull()
    expect(nomeColaborador(null)).toBeNull()
  })

  it("o cabeçalho usa só o primeiro nome", () => {
    expect(primeiroNomeColaborador({ user_metadata: { nome: "Daiana Hamud Silva" } })).toBe("Daiana")
    expect(primeiroNomeColaborador({ user_metadata: {} })).toBeNull()
  })
})

describe("saudação do cabeçalho", () => {
  it('mostra "Olá, [Nome]" quando o colaborador tem nome cadastrado', () => {
    expect(
      saudacaoColaborador({
        email: "daiana.hamud@moneygoassessoria.com.br",
        user_metadata: { nome: "Daiana Hamud" },
      })
    ).toBe("Olá, Daiana")
  })

  it("cai no e-mail enquanto o nome não estiver cadastrado", () => {
    expect(
      saudacaoColaborador({ email: "moneygosolucoesemcredito@gmail.com", user_metadata: {} })
    ).toBe("Olá, moneygosolucoesemcredito@gmail.com")
  })

  it("nunca exibe o e-mail cru sem a saudação", () => {
    const saudacao = saudacaoColaborador({ email: "parceiro@moneygo.com.br" })
    expect(saudacao.startsWith("Olá, ")).toBe(true)
  })

  it("sem usuário identificado não há saudação (o cabeçalho some com o texto)", () => {
    expect(saudacaoColaborador(null)).toBe("")
    expect(saudacaoColaborador({})).toBe("")
    expect(saudacaoColaborador({ email: "   " })).toBe("")
  })
})
