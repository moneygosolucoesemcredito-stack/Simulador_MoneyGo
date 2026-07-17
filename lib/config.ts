import type { TipoImovel } from "@/types"

export const CONFIG = {
  homeEquity: {
    taxaMensal: 0.0119,
    modalidadeTaxa: "pos_fixada" as const,
    // Faixa de taxa selecionável pelo cliente (a.m., antes do IPCA)
    taxaMinima: 0.0099,
    taxaMaxima: 0.0199,
    taxaPasso: 0.0001,
    valorImovelMinimo: 250_000,
    valorImovelMaximo: 5_000_000,
    valorCreditoMinimo: 75_000,
    // LTV varia por tipo de imóvel — ver LTV_POR_TIPO_IMOVEL.
    saldoDevedorMaximoPercentual: 0.5,
    // Seguros e encargos (espelham a planilha "Simulacao HE.xlsx")
    mip: 0.00035, // sobre o saldo devedor, ao mês
    dfi: 0.000065, // sobre o valor do imóvel, ao mês (imóvel até R$ 10mi)
    dfiAcima10M: 0.000085, // imóvel acima de R$ 10mi
    dfiLimiteImovel: 10_000_000.01,
    txAdminMensal: 25, // R$ por mês (Gaia)
    estruturacaoPercentual: 0, // zerada a pedido da MoneyGo (planilha traz 5%)
    taxaRegistro: 7_000, // R$ fixo (CAC)
    // IOF embutido no principal, por tipo de pessoa
    iofPF: 0.0338,
    iofPJ: 0.0188,
    iof: 0.0188, // mantido por compatibilidade
    comprometimentoRenda: 0.3, // renda sugerida = parcela / 0,30
    prazosDisponiveis: [60, 120, 180, 240],
    prazoDefault: 180,
    idadeMinima: 18,
    idadeMaxima: 60,
    populacaoMunicipalMinima: 50_000,
  },
  financiamentoImobiliario: {
    taxaMensal: 0.0083,
    modalidadeTaxa: "pos_fixada" as const,
    valorImovelMinimo: 200_000,
    valorCreditoMinimo: 100_000,
    // LTV varia por tipo de imóvel — ver LTV_POR_TIPO_IMOVEL_FI.
    mip: 0.00035,
    dfi: 0.000065,
    estruturacaoFixa: 5_000,
    iof: 0,
    prazosDisponiveis: [120, 180, 240, 300, 360],
    prazoDefault: 240,
    idadeMinima: 18,
    idadeMaxima: 50,
    populacaoMunicipalMinima: 50_000,
  },
  creditoConstrucao: {
    // Duas opções de taxa pós-fixada (a.m.): a partir de 1,17% + TR ou 1,25% + IPCA.
    taxas: {
      tr: { taxaMensal: 0.0117, indexador: "TR", aPartirDe: true },
      ipca: { taxaMensal: 0.0125, indexador: "IPCA", aPartirDe: false },
    },
    indexadorDefault: "tr" as const,
    modalidadeTaxa: "pos_fixada" as const,
    valorObraMinimo: 300_000,
    valorCreditoMinimo: 150_000,
    // Crédito limitado ao MENOR entre 80% do custo da obra e 50% do VGV
    // (valor geral de venda do imóvel pronto) — ver limiteCreditoConstrucao.
    ltvObra: 0.8,
    ltvVgv: 0.5,
    mip: 0.00035,
    dfi: 0.000065,
    estruturacaoPercentual: 0.05,
    iof: 0,
    numeroDeTranches: 5,
    prazosDisponiveis: [120, 180, 240],
    prazoDefault: 240,
    idadeMinima: 18,
    idadeMaxima: 60,
    populacaoMunicipalMinima: 50_000,
  },
  financiamentoVeiculo: {
    // "A partir de" 1,39% a.m. — pré-fixada (sem indexador).
    taxaMensal: 0.0139,
    modalidadeTaxa: "pre_fixada" as const,
    // Financia até 100% do valor do veículo.
    ltv: 1,
    prazoMaximo: 60,
    prazosDisponiveis: [12, 24, 36, 48, 60],
    prazoDefault: 48,
  },
  autoEquity: {
    taxaMensal: 0.0199,
    modalidadeTaxa: "pre_fixada" as const,
    valorVeiculoMinimo: 30_000,
    valorVeiculoMaximo: 500_000,
    // 80% da FIPE — percentual não deve aparecer na interface (só o valor máximo)
    ltv: 0.8,
    idadeVeiculoMaxima: 20,
    // IOF embutido no principal, por tipo de pessoa (mesmas alíquotas do HE)
    iofPF: 0.0338,
    iofPJ: 0.0188,
    prazosDisponiveis: [12, 18, 24, 30, 36, 40, 48],
    prazoDefault: 36,
  },
  kommo: {
    subdomain: process.env.KOMMO_SUBDOMAIN ?? "moneygo",
    token: process.env.KOMMO_LONG_LIVED_TOKEN ?? "",
    pipelineId: Number(process.env.KOMMO_PIPELINE_ID ?? "12887799"),
    homeEquityStageId: Number(process.env.KOMMO_HOME_EQUITY_STAGE_ID ?? "99376387"),
    autoEquityStageId: Number(process.env.KOMMO_AUTO_EQUITY_STAGE_ID ?? "0"),
    financiamentoImobiliarioStageId: Number(process.env.KOMMO_FINANCIAMENTO_STAGE_ID ?? "0"),
    creditoConstrucaoStageId: Number(process.env.KOMMO_CONSTRUCAO_STAGE_ID ?? "0"),
    financiamentoVeiculoStageId: Number(process.env.KOMMO_FINANCIAMENTO_VEICULO_STAGE_ID ?? "0"),
  },
} as const

export type IndexadorConstrucao = keyof typeof CONFIG.creditoConstrucao.taxas

/** Limite de crédito da construção: o menor entre 80% do custo da obra e 50% do VGV. */
export function limiteCreditoConstrucao(valorObra: number, vgv: number): number {
  const { ltvObra, ltvVgv } = CONFIG.creditoConstrucao
  return Math.min(valorObra * ltvObra, vgv * ltvVgv)
}

// LTV (crédito máximo sobre o valor do bem) por categoria de imóvel.
// Vale apenas para Home Equity — Financiamento Imobiliário usa
// LTV_POR_TIPO_IMOVEL_FI; Crédito de Construção usa limiteCreditoConstrucao
// e Auto Equity mantém seu próprio `ltv` fixo em CONFIG.
export const LTV_POR_TIPO_IMOVEL: Record<TipoImovel, number> = {
  casa: 0.55,
  apartamento: 0.55,
  comercial: 0.45,
  // O funil de HE só oferece terreno em condomínio; `terreno` avulso fica no
  // mesmo teto conservador caso chegue por outra via.
  terreno: 0.35,
  terreno_condominio: 0.35,
}

export function ltvParaTipoImovel(tipoImovel: TipoImovel | ""): number {
  return tipoImovel ? LTV_POR_TIPO_IMOVEL[tipoImovel] : LTV_POR_TIPO_IMOVEL.casa
}

// LTV do Financiamento Imobiliário por categoria de imóvel.
// Terreno é aceito sem exigir condomínio — ambas as formas ficam em 70%.
export const LTV_POR_TIPO_IMOVEL_FI: Record<TipoImovel, number> = {
  casa: 0.8,
  apartamento: 0.8,
  comercial: 0.7,
  terreno: 0.7,
  terreno_condominio: 0.7,
}

export function ltvParaTipoImovelFI(tipoImovel: TipoImovel | ""): number {
  return tipoImovel ? LTV_POR_TIPO_IMOVEL_FI[tipoImovel] : LTV_POR_TIPO_IMOVEL_FI.casa
}

// Faixa de taxa (a.m., em fração) controlada pelo OPERADOR — nunca pelo cliente.
// fixed:true  => campo somente leitura no valor `default` (ex.: Auto Equity 1,99%).
// fixed:false => campo digitável, vazio por padrão, validado contra min/max.
export const RATE_CONFIG = {
  home_equity: { min: 0.0099, max: 0.0199, default: null, fixed: false },
  financiamento_imobiliario: { min: 0.0083, max: 0.0199, default: null, fixed: false },
  credito_construcao: { min: 0.0117, max: 0.0199, default: null, fixed: false },
  auto_equity: { min: 0.0199, max: 0.0199, default: 0.0199, fixed: true },
  financiamento_veiculo: { min: 0.0139, max: 0.0199, default: null, fixed: false },
} as const

export type ProdutoTaxa = keyof typeof RATE_CONFIG
