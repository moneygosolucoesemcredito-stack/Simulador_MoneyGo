import { describe, it, expect } from "vitest"
import {
  HE_IDADE_MAIS_PRAZO_MAXIMO_ANOS,
  prazoMaximoHomeEquity,
  prazosDisponiveisHomeEquity,
} from "@/lib/config"
import { qualificarHomeEquity } from "@/lib/qualificacao"

/** Data de nascimento (YYYY-MM-DD) que resulta exatamente na idade dada hoje. */
function nascimentoParaIdade(idade: number): string {
  const ano = new Date().getFullYear() - idade
  return `${ano}-01-01` // 1º de janeiro já passou → idade = anoAtual - anoNasc
}

describe("trava idade × prazo (seguro habitacional ≤ 80 anos)", () => {
  it("o limite da soma é 80 anos", () => {
    expect(HE_IDADE_MAIS_PRAZO_MAXIMO_ANOS).toBe(80)
  })

  it("até 60 anos o prazo máximo é o teto do produto (240 meses)", () => {
    expect(prazoMaximoHomeEquity(30)).toBe(240)
    expect(prazoMaximoHomeEquity(60)).toBe(240)
  })

  it("acima de 60 anos o prazo cai para (80 − idade) × 12 meses", () => {
    // Exemplo do requisito: 61 anos → 228 meses.
    expect(prazoMaximoHomeEquity(61)).toBe(228)
    expect(prazoMaximoHomeEquity(65)).toBe(180)
    expect(prazoMaximoHomeEquity(70)).toBe(120)
    expect(prazoMaximoHomeEquity(79)).toBe(12)
  })

  it("idade ≥ 80 não tem prazo elegível", () => {
    expect(prazoMaximoHomeEquity(80)).toBe(0)
    expect(prazoMaximoHomeEquity(85)).toBe(0)
  })

  it("bloqueia o prazo de 240 meses acima de 60 anos", () => {
    expect(prazosDisponiveisHomeEquity(61)).toEqual([60, 120, 180])
    expect(prazosDisponiveisHomeEquity(30)).toEqual([60, 120, 180, 240])
  })
})

describe("qualificarHomeEquity — idade × prazo", () => {
  const base = {
    valor_imovel: 500_000,
    tipo_imovel: "casa" as const,
    situacao: "quitado" as const,
    valor_solicitado: 200_000,
    cidade: "Joinville",
    uf: "SC",
  }

  it("aceita tomador de 61 anos com prazo dentro do teto (180 meses)", () => {
    const { qualificado } = qualificarHomeEquity({
      ...base,
      data_nascimento: nascimentoParaIdade(61),
      prazo_meses: 180,
    })
    expect(qualificado).toBe(true)
  })

  it("aceita 61 anos no limite exato de 228 meses", () => {
    const { qualificado } = qualificarHomeEquity({
      ...base,
      data_nascimento: nascimentoParaIdade(61),
      prazo_meses: 228,
    })
    expect(qualificado).toBe(true)
  })

  it("rejeita 61 anos com prazo de 240 meses", () => {
    const { qualificado, motivos } = qualificarHomeEquity({
      ...base,
      data_nascimento: nascimentoParaIdade(61),
      prazo_meses: 240,
    })
    expect(qualificado).toBe(false)
    expect(motivos.some((m) => m.includes("80 anos"))).toBe(true)
  })

  it("rejeita tomador de 80 anos (idade esgota o limite)", () => {
    const { qualificado } = qualificarHomeEquity({
      ...base,
      data_nascimento: nascimentoParaIdade(80),
      prazo_meses: 60,
    })
    expect(qualificado).toBe(false)
  })

  it("rejeita menor de 18 anos", () => {
    const { qualificado } = qualificarHomeEquity({
      ...base,
      data_nascimento: nascimentoParaIdade(16),
      prazo_meses: 120,
    })
    expect(qualificado).toBe(false)
  })

  it("sem prazo informado, valida apenas os limites de idade", () => {
    expect(
      qualificarHomeEquity({ ...base, data_nascimento: nascimentoParaIdade(61) }).qualificado
    ).toBe(true)
    expect(
      qualificarHomeEquity({ ...base, data_nascimento: nascimentoParaIdade(85) }).qualificado
    ).toBe(false)
  })
})
