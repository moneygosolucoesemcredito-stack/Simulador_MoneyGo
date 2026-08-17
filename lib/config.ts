import { taxaAnualEquivalente, taxaMensalEquivalente } from "./simulacao"
import type {
  CategoriaTerrenoConstrucao,
  CategoriaVeiculo,
  TipoImovel,
  TipoPessoa,
} from "@/types"

export const CONFIG = {
  homeEquity: {
    taxaMensal: 0.0119,
    modalidadeTaxa: "pos_fixada" as const,
    // Faixa de taxa selecionável pelo cliente (a.m., antes do IPCA)
    taxaMinima: 0.0099,
    taxaMaxima: 0.0199,
    taxaPasso: 0.0001,
    valorImovelMinimo: 250_000,
    // Teto de valor do imóvel removido no Home Equity (2026-08): não há valor
    // máximo — imóveis acima de R$ 5.000.000 são aceitos normalmente. O que
    // limita a operação é o LTV da tipologia (LTV_POR_TIPO_IMOVEL), não o valor
    // do bem. `valorImovelSliderReferencia` é só a escala inicial do controle
    // deslizante do Step 1: o campo de digitação aceita qualquer valor acima.
    valorImovelSliderReferencia: 5_000_000,
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
    // Trava de população removida no Home Equity (2026-07): aceita municípios de
    // qualquer porte. FI e Construção mantêm `populacaoMunicipalMinima`.
  },
  financiamentoImobiliario: {
    taxaMensal: 0.0083,
    modalidadeTaxa: "pos_fixada" as const,
    valorImovelMinimo: 200_000,
    // Teto de valor do imóvel removido no Financiamento Imobiliário (2026-08):
    // não há valor máximo. `valorImovelSliderReferencia` é apenas a escala
    // inicial da régua do Step 1 — o campo digitável aceita qualquer valor.
    valorImovelSliderReferencia: 5_000_000,
    valorCreditoMinimo: 100_000,
    // LTV varia por tipo de imóvel E por tipo de tomador (PF/PJ) —
    // ver LTV_POR_TIPO_IMOVEL_FI.
    mip: 0.00035,
    dfi: 0.000065,
    estruturacaoFixa: 5_000,
    iof: 0,
    // Renda necessária = parcela / 0,30 (política de comprometimento de renda).
    comprometimentoRenda: 0.3,
    prazosDisponiveis: [120, 180, 240, 300, 360, 420],
    prazoDefault: 240,
    idadeMinima: 18,
    idadeMaxima: 50,
    populacaoMunicipalMinima: 50_000,
  },
  creditoConstrucao: {
    modalidadeTaxa: "pos_fixada" as const,
    // Taxa, teto de crédito, público e prazo passam a depender da CATEGORIA do
    // terreno (2026-08) — ver CONSTRUCAO_POR_CATEGORIA.
    categoriaDefault: "condominio" as CategoriaTerrenoConstrucao,
    valorObraMinimo: 300_000,
    vgvMinimo: 300_000,
    valorCreditoMinimo: 150_000,
    mip: 0.00035,
    dfi: 0.000065,
    estruturacaoPercentual: 0.05,
    iof: 0,
    numeroDeTranches: 5,
    idadeMinima: 18,
    idadeMaxima: 60,
    populacaoMunicipalMinima: 50_000,
  },
  financiamentoVeiculo: {
    // "A partir de" 1,39% a.m. — pré-fixada (sem indexador).
    taxaMensal: 0.0139,
    modalidadeTaxa: "pre_fixada" as const,
    // Financia até 80% do valor do veículo (2026-08; antes eram 100%).
    ltv: 0.8,
    prazoMaximo: 60,
    // Menor valor que faz sentido financiar.
    valorFinanciadoMinimo: 5_000,
    // Elegibilidade do bem: veículo PESADO só é aceito com até 5 anos de
    // fabricação. Veículo leve não tem trava de idade nesta modalidade.
    idadeVeiculoMaximaPesado: 5,
    prazosDisponiveis: [12, 24, 36, 48, 60],
    prazoDefault: 48,
  },
  autoEquity: {
    // 2,50% a.m. — pré-fixada (sem indexador). Reajustada em 2026-08
    // (antes 1,99% a.m.).
    taxaMensal: 0.025,
    modalidadeTaxa: "pre_fixada" as const,
    valorVeiculoMinimo: 30_000,
    valorVeiculoMaximo: 500_000,
    // 80% da FIPE — percentual não deve aparecer na interface (só o valor máximo)
    ltv: 0.8,
    // Idade máxima de fabricação por categoria (2026-08): veículo leve (carro,
    // SUV, picape, utilitário leve) até 20 anos; veículo pesado (caminhão,
    // ônibus, cavalo mecânico) até 15 anos. Ver idadeMaximaVeiculo().
    idadeVeiculoMaximaLeve: 20,
    idadeVeiculoMaximaPesado: 15,
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

// ──────────────────────────────────────────────────────────────────────────
// Crédito de Construção — regras por categoria de terreno (2026-08).
// A categoria define público, teto de crédito, taxa e prazo máximo. Substitui
// a regra anterior (menor entre 80% da obra e 50% do VGV, com seletor TR/IPCA).
// ──────────────────────────────────────────────────────────────────────────

export interface RegraCategoriaConstrucao {
  rotulo: string
  descricao: string
  /** Tomadores aceitos. Condomínio é exclusivo de Pessoa Física. */
  tomadores: readonly TipoPessoa[]
  /** Base de cálculo do teto de crédito: custo da obra ou VGV. */
  base: "obra" | "vgv"
  /** Percentual da base liberado como crédito. */
  ltv: number
  indexador: "TR" | "IPCA"
  /** Periodicidade em que a taxa é publicada — TR ao ano, IPCA ao mês. */
  periodicidadeTaxa: "anual" | "mensal"
  /** Taxa publicada, na periodicidade acima (fração). */
  taxa: number
  prazoMaximo: number
  prazosDisponiveis: readonly number[]
  prazoDefault: number
}

export const CONSTRUCAO_POR_CATEGORIA: Record<
  CategoriaTerrenoConstrucao,
  RegraCategoriaConstrucao
> = {
  condominio: {
    rotulo: "Dentro de condomínio",
    descricao: "Terreno em condomínio fechado",
    tomadores: ["PF"],
    base: "obra",
    ltv: 0.8, // até 80% do custo total da obra
    indexador: "TR",
    periodicidadeTaxa: "anual",
    taxa: 0.1399, // 13,99% a.a. + TR
    prazoMaximo: 360, // 30 anos
    prazosDisponiveis: [120, 180, 240, 300, 360],
    prazoDefault: 240,
  },
  fora_condominio: {
    rotulo: "Fora de condomínio",
    descricao: "Terreno em rua aberta, loteamento ou área urbana comum",
    tomadores: ["PF", "PJ"],
    base: "vgv",
    ltv: 0.5, // até 50% do VGV (imóvel pronto)
    indexador: "IPCA",
    periodicidadeTaxa: "mensal",
    taxa: 0.0125, // 1,25% a.m. + IPCA
    prazoMaximo: 240, // 20 anos
    prazosDisponiveis: [120, 180, 240],
    prazoDefault: 240,
  },
}

/** Regra vigente da categoria (categoria vazia cai no default do produto). */
export function regraConstrucao(
  categoria: CategoriaTerrenoConstrucao | ""
): RegraCategoriaConstrucao {
  return CONSTRUCAO_POR_CATEGORIA[categoria || CONFIG.creditoConstrucao.categoriaDefault]
}

/** Taxa MENSAL da categoria — converte a taxa anual da TR quando necessário. */
export function taxaMensalConstrucao(categoria: CategoriaTerrenoConstrucao | ""): number {
  const regra = regraConstrucao(categoria)
  return regra.periodicidadeTaxa === "anual" ? taxaMensalEquivalente(regra.taxa) : regra.taxa
}

/** Taxa ANUAL da categoria — converte a taxa mensal do IPCA quando necessário. */
export function taxaAnualConstrucao(categoria: CategoriaTerrenoConstrucao | ""): number {
  const regra = regraConstrucao(categoria)
  return regra.periodicidadeTaxa === "anual" ? regra.taxa : taxaAnualEquivalente(regra.taxa)
}

/** Prazos ofertáveis na categoria (todos ≤ prazoMaximo). */
export function prazosDisponiveisConstrucao(
  categoria: CategoriaTerrenoConstrucao | ""
): readonly number[] {
  const regra = regraConstrucao(categoria)
  return regra.prazosDisponiveis.filter((p) => p <= regra.prazoMaximo)
}

/** O tomador é aceito nesta categoria? (condomínio só atende PF). */
export function tomadorPermitidoConstrucao(
  categoria: CategoriaTerrenoConstrucao | "",
  tipoPessoa: TipoPessoa | ""
): boolean {
  if (!tipoPessoa) return false
  return regraConstrucao(categoria).tomadores.includes(tipoPessoa)
}

// Trava de seguro habitacional (padrão de mercado para crédito com garantia de
// imóvel): a soma "idade do tomador + prazo (em anos)" não pode ultrapassar 80.
// Acima de 60 anos o prazo de 240 meses (20 anos) deixa de estar disponível e o
// teto passa a ser (80 − idade) × 12 meses. Ex.: 61 anos → 228 meses.
export const HE_IDADE_MAIS_PRAZO_MAXIMO_ANOS = 80

/**
 * Prazo máximo (em meses) do Home Equity para um tomador de determinada idade,
 * aplicando a trava "idade + prazo ≤ 80 anos":
 *   prazo_maximo = (80 − idade) × 12, limitado ao teto do produto (240 meses).
 * Retorna 0 quando a idade já esgota o limite (idade ≥ 80).
 */
export function prazoMaximoHomeEquity(idade: number): number {
  if (!Number.isFinite(idade) || idade < 0) return 0
  const tetoProduto = Math.max(...CONFIG.homeEquity.prazosDisponiveis)
  const limiteIdade = (HE_IDADE_MAIS_PRAZO_MAXIMO_ANOS - idade) * 12
  return Math.max(0, Math.min(tetoProduto, limiteIdade))
}

/**
 * Prazos discretos do Home Equity efetivamente ofertáveis para a idade,
 * filtrando `prazosDisponiveis` pelo teto calculado em `prazoMaximoHomeEquity`.
 */
export function prazosDisponiveisHomeEquity(idade: number): number[] {
  const max = prazoMaximoHomeEquity(idade)
  return CONFIG.homeEquity.prazosDisponiveis.filter((p) => p <= max)
}

/**
 * Idade máxima (anos de fabricação) aceita no Auto Equity para a categoria:
 * 20 anos para veículo leve e 15 anos para veículo pesado. Sem categoria
 * informada assume-se `leve` (categoria padrão do funil).
 */
export function idadeMaximaVeiculo(categoria: CategoriaVeiculo = "leve"): number {
  const { idadeVeiculoMaximaLeve, idadeVeiculoMaximaPesado } = CONFIG.autoEquity
  return categoria === "pesado" ? idadeVeiculoMaximaPesado : idadeVeiculoMaximaLeve
}

/**
 * Financiamento de Veículo — idade máxima (anos de fabricação) aceita na
 * categoria. Veículo pesado só entra com até 5 anos; leve não tem trava de
 * idade nesta modalidade (Infinity).
 */
export function idadeMaximaVeiculoFinanciamento(categoria: CategoriaVeiculo = "leve"): number {
  return categoria === "pesado"
    ? CONFIG.financiamentoVeiculo.idadeVeiculoMaximaPesado
    : Number.POSITIVE_INFINITY
}

/** Ano de fabricação mais antigo aceito no Financiamento de Veículo (pesado). */
export function anoMinimoVeiculoFinanciamento(
  categoria: CategoriaVeiculo = "leve",
  anoReferencia: number = new Date().getFullYear()
): number {
  const idadeMaxima = idadeMaximaVeiculoFinanciamento(categoria)
  return Number.isFinite(idadeMaxima) ? anoReferencia - idadeMaxima : 0
}

/** Ano de fabricação mais antigo aceito para a categoria (ex.: leve em 2026 → 2006). */
export function anoMinimoVeiculo(
  categoria: CategoriaVeiculo = "leve",
  anoReferencia: number = new Date().getFullYear()
): number {
  return anoReferencia - idadeMaximaVeiculo(categoria)
}

/**
 * Teto de crédito da construção, por categoria de terreno:
 *   dentro de condomínio → 80% do CUSTO DA OBRA
 *   fora de condomínio   → 50% do VGV (valor do imóvel pronto)
 */
export function limiteCreditoConstrucao(
  categoria: CategoriaTerrenoConstrucao | "",
  valores: { valorObra: number; vgv: number }
): number {
  const regra = regraConstrucao(categoria)
  const base = regra.base === "obra" ? valores.valorObra : valores.vgv
  return Math.max(0, base * regra.ltv)
}

// Teto regulatório de LTV: nenhuma operação com garantia de imóvel (Home
// Equity e Financiamento Imobiliário) pode exceder 55% do valor do bem.
// Tipologias podem impor limites AINDA mais restritivos (nunca mais frouxos).
export const LTV_MAXIMO_REGULATORIO = 0.55

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
  const ltv = tipoImovel ? LTV_POR_TIPO_IMOVEL[tipoImovel] : LTV_POR_TIPO_IMOVEL.casa
  return Math.min(ltv, LTV_MAXIMO_REGULATORIO)
}

// LTV do Financiamento Imobiliário por categoria de imóvel E por tipo de
// tomador. Diferente do Home Equity, o FI NÃO está sujeito ao teto de 55%
// (LTV_MAXIMO_REGULATORIO) — os limites por tipologia valem cheios.
//
// Política vigente (2026-08):
//   PF → casa/apartamento 80%, comercial 70%, terreno 60%
//   PJ → casa/apartamento/comercial 70%, terreno 60%
// Terreno é aceito sem exigir condomínio (`terreno_condominio` acompanha
// `terreno` caso chegue por outra via).
export const LTV_POR_TIPO_IMOVEL_FI: Record<TipoPessoa, Record<TipoImovel, number>> = {
  PF: {
    casa: 0.8,
    apartamento: 0.8,
    comercial: 0.7,
    terreno: 0.6,
    terreno_condominio: 0.6,
  },
  PJ: {
    casa: 0.7,
    apartamento: 0.7,
    comercial: 0.7,
    terreno: 0.6,
    terreno_condominio: 0.6,
  },
}

/**
 * LTV do Financiamento Imobiliário para a tipologia e o tipo de tomador.
 * Sem tipo de pessoa definido assume-se PF (perfil padrão do funil); sem
 * tipologia definida assume-se casa.
 */
export function ltvParaTipoImovelFI(
  tipoImovel: TipoImovel | "",
  tipoPessoa: TipoPessoa | "" = "PF"
): number {
  const tabela = LTV_POR_TIPO_IMOVEL_FI[tipoPessoa || "PF"]
  return tipoImovel ? tabela[tipoImovel] : tabela.casa
}

// Faixa de taxa (a.m., em fração) controlada pelo OPERADOR — nunca pelo cliente.
// fixed:true  => campo somente leitura no valor `default` (ex.: Auto Equity 2,50%).
// fixed:false => campo digitável, vazio por padrão, validado contra min/max.
export const RATE_CONFIG = {
  home_equity: { min: 0.0099, max: 0.0199, default: null, fixed: false },
  financiamento_imobiliario: { min: 0.0083, max: 0.0199, default: null, fixed: false },
  // Piso = menor taxa mensal ofertada nas categorias de construção (a de
  // condomínio, 13,99% a.a. + TR ≈ 1,0972% a.m.), arredondado para baixo.
  credito_construcao: { min: 0.0109, max: 0.0199, default: null, fixed: false },
  auto_equity: { min: 0.025, max: 0.025, default: 0.025, fixed: true },
  financiamento_veiculo: { min: 0.0139, max: 0.0199, default: null, fixed: false },
} as const

export type ProdutoTaxa = keyof typeof RATE_CONFIG
