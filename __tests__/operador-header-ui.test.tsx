// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { OperadorHeader } from "@/components/operador/OperadorHeader"
import { saudacaoColaborador } from "@/lib/operador"

afterEach(cleanup)

describe("Cabeçalho do operador", () => {
  it('exibe a saudação com o nome, no lugar do e-mail cru', () => {
    const saudacao = saudacaoColaborador({
      email: "daiana.hamud@moneygoassessoria.com.br",
      user_metadata: { nome: "Daiana Hamud" },
    })
    render(<OperadorHeader saudacao={saudacao} onSair={() => {}} />)

    expect(screen.getByText("Olá, Daiana")).toBeTruthy()
    expect(screen.queryByText("daiana.hamud@moneygoassessoria.com.br")).toBeNull()
  })

  it("usa o e-mail como fallback quando não há nome cadastrado", () => {
    const saudacao = saudacaoColaborador({ email: "moneygosolucoesemcredito@gmail.com" })
    render(<OperadorHeader saudacao={saudacao} onSair={() => {}} />)
    expect(screen.getByText("Olá, moneygosolucoesemcredito@gmail.com")).toBeTruthy()
  })

  it("saudação e Sair ficam no mesmo grupo, empurrado para a direita", () => {
    render(<OperadorHeader saudacao="Olá, Daiana" onSair={() => {}} />)
    const sair = screen.getByRole("button", { name: /Sair/ })
    const grupo = sair.parentElement as HTMLElement

    // ml-auto empurra o grupo até a borda direita da barra, em qualquer largura
    expect(grupo.className).toContain("ml-auto")
    expect(grupo.textContent).toContain("Olá, Daiana")
    // a saudação vem antes do botão dentro do grupo
    expect(grupo.firstElementChild?.textContent).toBe("Olá, Daiana")
  })

  it("a barra ocupa a largura total (nada de container estreito centralizado)", () => {
    const { container } = render(<OperadorHeader saudacao="Olá, Daiana" onSair={() => {}} />)
    const barra = container.querySelector("header > div") as HTMLElement
    expect(barra.className).toContain("w-full")
    expect(barra.className).not.toContain("max-w-lg")
    expect(barra.className).not.toContain("mx-auto")
  })

  it("a saudação trunca em telas apertadas e o Sair não encolhe", () => {
    const saudacao = saudacaoColaborador({ email: "moneygosolucoesemcredito@gmail.com" })
    render(<OperadorHeader saudacao={saudacao} onSair={() => {}} />)

    const texto = screen.getByText(saudacao)
    expect(texto.className).toContain("truncate")
    expect(texto.className).toContain("min-w-0")
    expect(texto.getAttribute("title")).toBe(saudacao) // texto completo no hover
    // Abaixo de `sm` a logo completa toma a largura: a saudação some, como o
    // e-mail já fazia antes, em vez de virar reticências.
    expect(texto.className).toContain("hidden")
    expect(texto.className).toContain("sm:block")
    expect(screen.getByRole("button", { name: /Sair/ }).className).toContain("shrink-0")
  })

  it("a logo é a completa, no tamanho de antes (h-12), sem variante por breakpoint", () => {
    const { container } = render(<OperadorHeader saudacao="Olá, Daiana" onSair={() => {}} />)
    const imagens = container.querySelectorAll("img")
    expect(imagens).toHaveLength(1)
    expect(imagens[0].className).toContain("h-12")
    expect(imagens[0].className).not.toContain("sm:hidden")
  })

  it("sem sessão carregada mostra só o Sair, sem texto solto", () => {
    render(<OperadorHeader saudacao="" onSair={() => {}} />)
    expect(screen.getByRole("button", { name: /Sair/ })).toBeTruthy()
    expect(screen.queryByText(/Olá/)).toBeNull()
  })

  it("o botão dispara o logout", () => {
    const sair = vi.fn()
    render(<OperadorHeader saudacao="Olá, Daiana" onSair={sair} />)
    fireEvent.click(screen.getByRole("button", { name: /Sair/ }))
    expect(sair).toHaveBeenCalledTimes(1)
  })
})
