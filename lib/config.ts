export const CONFIG = {
  homeEquity: {
    taxaMensal: 0.0119,
    modalidadeTaxa: "pos_fixada" as const,
    valorImovelMinimo: 250_000,
    valorCreditoMinimo: 50_000,
    ltv: 0.6, // máximo 60% do valor do imóvel
    saldoDevedorMaximoPercentual: 0.5, // financiado: saldo ≤ 50% do imóvel
    prazosDisponiveis: [60, 120, 180, 240],
    prazoDefault: 180,
    idadeMinima: 18,
    idadeMaxima: 75,
    populacaoMunicipalMinima: 50_000,
  },
  autoEquity: {
    taxaMensal: 0.0159,
    modalidadeTaxa: "pre_fixada" as const,
    valorVeiculoMinimo: 30_000,
    valorVeiculoMaximo: 500_000,
    ltv: 0.5, // máximo 50% do valor do veículo
    idadeVeiculoMaxima: 15, // anos
    prazosDisponiveis: [12, 24, 36, 48, 60],
    prazoDefault: 36,
  },
  kommo: {
    subdomain: process.env.KOMMO_SUBDOMAIN ?? "moneygo",
    token: process.env.KOMMO_LONG_LIVED_TOKEN ?? "",
    pipelineId: Number(process.env.KOMMO_PIPELINE_ID ?? "12887799"),
    // TODO: verify stage IDs in Kommo → Settings → Pipelines
    homeEquityStageId: Number(process.env.KOMMO_HOME_EQUITY_STAGE_ID ?? "99376387"),
    autoEquityStageId: Number(process.env.KOMMO_AUTO_EQUITY_STAGE_ID ?? "0"),
  },
} as const
