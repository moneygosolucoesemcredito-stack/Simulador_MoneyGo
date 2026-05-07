import { describe, it, expect } from "vitest"
import { isCidadeQualificada, qualificarHomeEquity, qualificarAutoEquity } from "@/lib/qualificacao"

describe("isCidadeQualificada", () => {
  it("aceita cidades grandes conhecidas", () => {
    expect(isCidadeQualificada("Joinville", "SC")).toBe(true)
    expect(isCidadeQualificada("São Paulo", "SP")).toBe(true)
    expect(isCidadeQualificada("Florianópolis", "SC")).toBe(true)
    expect(isCidadeQualificada("Curitiba", "PR")).toBe(true)
  })

  it("é case-insensitive e ignora acentos", () => {
    expect(isCidadeQualificada("joinville", "SC")).toBe(true)
    // SAO PAULO → lowercase → "sao paulo" → sem acento = match com "São Paulo" normalizado
    expect(isCidadeQualificada("SAO PAULO", "SP")).toBe(true)
    expect(isCidadeQualificada("sao paulo", "SP")).toBe(true)
    expect(isCidadeQualificada("florianopolis", "SC")).toBe(true)
  })

  it("rejeita cidades inventadas", () => {
    expect(isCidadeQualificada("Cidade Inexistente", "SC")).toBe(false)
    expect(isCidadeQualificada("", "SP")).toBe(false)
  })
})

describe("qualificarHomeEquity", () => {
  const base = {
    valor_imovel: 500_000,
    tipo_imovel: "casa" as const,
    situacao: "quitado" as const,
    valor_solicitado: 200_000,
    cidade: "Joinville",
    uf: "SC",
    data_nascimento: "1985-05-15",
  }

  it("qualifica lead com dados válidos", () => {
    const { qualificado, motivos } = qualificarHomeEquity(base)
    expect(qualificado).toBe(true)
    expect(motivos).toHaveLength(0)
  })

  it("rejeita imóvel abaixo do mínimo", () => {
    const { qualificado, motivos } = qualificarHomeEquity({ ...base, valor_imovel: 100_000 })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("mínimo"))).toBe(true)
  })

  it("rejeita crédito acima de 60% do imóvel", () => {
    const { qualificado } = qualificarHomeEquity({ ...base, valor_solicitado: 350_000 })
    expect(qualificado).toBe(false)
  })

  it("rejeita financiado com saldo devedor > 50%", () => {
    const { qualificado } = qualificarHomeEquity({
      ...base,
      situacao: "financiado",
      saldo_devedor: 300_000, // 60% do imóvel → inválido
    })
    expect(qualificado).toBe(false)
  })

  it("rejeita cidade não qualificada", () => {
    const { qualificado } = qualificarHomeEquity({ ...base, cidade: "Cidade Pequena" })
    expect(qualificado).toBe(false)
  })

  it("rejeita menor de 18 anos", () => {
    const ano = new Date().getFullYear()
    const { qualificado } = qualificarHomeEquity({
      ...base,
      data_nascimento: `${ano - 16}-01-01`,
    })
    expect(qualificado).toBe(false)
  })

  it("rejeita maior de 75 anos", () => {
    const { qualificado } = qualificarHomeEquity({
      ...base,
      data_nascimento: "1940-01-01",
    })
    expect(qualificado).toBe(false)
  })
})

describe("qualificarAutoEquity", () => {
  const anoAtual = new Date().getFullYear()

  it("qualifica veículo válido", () => {
    const { qualificado } = qualificarAutoEquity({
      valor_veiculo: 80_000,
      ano_veiculo: anoAtual - 5,
      valor_solicitado: 30_000,
    })
    expect(qualificado).toBe(true)
  })

  it("rejeita veículo muito antigo", () => {
    const { qualificado, motivos } = qualificarAutoEquity({
      valor_veiculo: 80_000,
      ano_veiculo: anoAtual - 16,
      valor_solicitado: 30_000,
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("anos"))).toBe(true)
  })

  it("rejeita crédito acima de 50% do veículo", () => {
    const { qualificado } = qualificarAutoEquity({
      valor_veiculo: 80_000,
      ano_veiculo: anoAtual - 5,
      valor_solicitado: 50_000, // > 50% = R$ 40k
    })
    expect(qualificado).toBe(false)
  })

  it("rejeita veículo abaixo do mínimo", () => {
    const { qualificado } = qualificarAutoEquity({
      valor_veiculo: 20_000,
      ano_veiculo: anoAtual - 5,
      valor_solicitado: 8_000,
    })
    expect(qualificado).toBe(false)
  })
})
