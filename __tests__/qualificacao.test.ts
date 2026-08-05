import { describe, it, expect } from "vitest"
import {
  isCidadeQualificada,
  qualificarHomeEquity,
  qualificarFinanciamentoImobiliario,
  qualificarAutoEquity,
} from "@/lib/qualificacao"

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

  it("aceita cidade de qualquer porte (trava de população removida no Home Equity)", () => {
    const { qualificado, motivos } = qualificarHomeEquity({
      ...base,
      cidade: "Cidade Pequena",
      uf: "SC",
    })
    expect(qualificado).toBe(true)
    expect(motivos.some((m) => m.includes("habitantes"))).toBe(false)
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

  it("LTV de imóvel comercial é 45%, não 55%", () => {
    // 50% do imóvel — passaria em casa/apto (55%), mas excede o teto de comercial (45%)
    const { qualificado, motivos } = qualificarHomeEquity({
      ...base,
      tipo_imovel: "comercial",
      valor_solicitado: 250_000,
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("45%"))).toBe(true)
  })

  it("aceita imóvel comercial dentro do limite de 45%", () => {
    const { qualificado } = qualificarHomeEquity({
      ...base,
      tipo_imovel: "comercial",
      valor_solicitado: 225_000, // exatamente 45%
    })
    expect(qualificado).toBe(true)
  })

  it("LTV de terreno em condomínio é 35%, não 55%", () => {
    const { qualificado, motivos } = qualificarHomeEquity({
      ...base,
      tipo_imovel: "terreno_condominio",
      valor_solicitado: 200_000, // 40% do imóvel — excede o teto de 35%
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("35%"))).toBe(true)
  })

  it("aceita casa/apartamento com LTV de 55%", () => {
    const { qualificado } = qualificarHomeEquity({
      ...base,
      tipo_imovel: "apartamento",
      valor_solicitado: 275_000, // exatamente 55%
    })
    expect(qualificado).toBe(true)
  })
})

describe("qualificarFinanciamentoImobiliario", () => {
  const base = {
    valor_imovel: 500_000,
    tipo_imovel: "casa" as const,
    valor_solicitado: 200_000,
    cidade: "Joinville",
    uf: "SC",
    data_nascimento: "1985-05-15",
  }

  it("qualifica lead com dados válidos", () => {
    const { qualificado, motivos } = qualificarFinanciamentoImobiliario(base)
    expect(qualificado).toBe(true)
    expect(motivos).toHaveLength(0)
  })

  // O FI usa os LTVs cheios por tipologia e por tomador (PF: casa/apto 80%,
  // comercial 70%, terreno 60%) — não está sujeito ao teto de 55% do HE.
  // Sem `tipo_pessoa` a qualificação assume PF. A matriz PF × PJ completa fica
  // em __tests__/real_estate_financing.test.ts.
  it("aceita casa/apartamento com LTV de 80%", () => {
    const { qualificado } = qualificarFinanciamentoImobiliario({
      ...base,
      valor_solicitado: 400_000, // exatamente 80%
    })
    expect(qualificado).toBe(true)
  })

  it("rejeita casa/apartamento acima de 80%", () => {
    const { qualificado, motivos } = qualificarFinanciamentoImobiliario({
      ...base,
      valor_solicitado: 410_000, // 82% > 80%
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("80%"))).toBe(true)
  })

  it("aceita comercial com LTV de 70%", () => {
    const { qualificado } = qualificarFinanciamentoImobiliario({
      ...base,
      tipo_imovel: "comercial",
      valor_solicitado: 350_000, // exatamente 70%
    })
    expect(qualificado).toBe(true)
  })

  it("rejeita comercial acima de 70%", () => {
    const { qualificado, motivos } = qualificarFinanciamentoImobiliario({
      ...base,
      tipo_imovel: "comercial",
      valor_solicitado: 375_000, // 75% > 70%
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("70%"))).toBe(true)
  })

  it("aceita terreno (sem exigir condomínio) com LTV de 60%", () => {
    const { qualificado } = qualificarFinanciamentoImobiliario({
      ...base,
      tipo_imovel: "terreno",
      valor_solicitado: 300_000, // exatamente 60%
    })
    expect(qualificado).toBe(true)
  })

  it("rejeita terreno acima de 60%", () => {
    const { qualificado, motivos } = qualificarFinanciamentoImobiliario({
      ...base,
      tipo_imovel: "terreno",
      valor_solicitado: 325_000, // 65% > 60%
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("60%"))).toBe(true)
  })

  it("rejeita cidade não qualificada", () => {
    const { qualificado } = qualificarFinanciamentoImobiliario({ ...base, cidade: "Cidade Pequena" })
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

  it("aceita veículo com até 20 anos", () => {
    const { qualificado } = qualificarAutoEquity({
      valor_veiculo: 80_000,
      ano_veiculo: anoAtual - 20,
      valor_solicitado: 30_000,
    })
    expect(qualificado).toBe(true)
  })

  it("rejeita veículo com mais de 20 anos", () => {
    const { qualificado, motivos } = qualificarAutoEquity({
      valor_veiculo: 80_000,
      ano_veiculo: anoAtual - 21,
      valor_solicitado: 30_000,
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("anos"))).toBe(true)
  })

  it("rejeita veículo financiado", () => {
    const { qualificado, motivos } = qualificarAutoEquity({
      valor_veiculo: 80_000,
      ano_veiculo: anoAtual - 5,
      valor_solicitado: 30_000,
      situacao: "financiado",
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("financiado"))).toBe(true)
  })

  it("aceita veículo quitado", () => {
    const { qualificado } = qualificarAutoEquity({
      valor_veiculo: 80_000,
      ano_veiculo: anoAtual - 5,
      valor_solicitado: 30_000,
      situacao: "quitado",
    })
    expect(qualificado).toBe(true)
  })

  it("aceita crédito até 80% do veículo", () => {
    const { qualificado } = qualificarAutoEquity({
      valor_veiculo: 80_000,
      ano_veiculo: anoAtual - 5,
      valor_solicitado: 64_000, // exatamente 80%
    })
    expect(qualificado).toBe(true)
  })

  it("rejeita crédito acima de 80% do veículo", () => {
    const { qualificado } = qualificarAutoEquity({
      valor_veiculo: 80_000,
      ano_veiculo: anoAtual - 5,
      valor_solicitado: 70_000, // > 80% = R$ 64k
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
