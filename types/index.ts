export type Produto = "home_equity" | "auto_equity" | "financiamento_imobiliario" | "credito_construcao" | "financiamento_veiculo"

// `terreno` = lote sem restrição de condomínio (aceito no Financiamento Imobiliário).
// `terreno_condominio` = lote em condomínio fechado (única forma de terreno aceita no Home Equity).
export type TipoImovel = "casa" | "apartamento" | "comercial" | "terreno" | "terreno_condominio"
export type SituacaoImovel = "quitado" | "financiado"
export type SituacaoVeiculo = "quitado" | "financiado"
// Categoria do veículo no Auto Equity — define a idade máxima aceita:
// `leve` = carros, SUVs, picapes e utilitários leves (até 20 anos);
// `pesado` = caminhões, ônibus, cavalos mecânicos e utilitários pesados (até 15 anos).
export type CategoriaVeiculo = "leve" | "pesado"
// Tomador da operação — define alíquota de IOF e, no Financiamento
// Imobiliário, também o LTV máximo por tipologia (ver LTV_POR_TIPO_IMOVEL_FI).
export type TipoPessoa = "PF" | "PJ"
// Categoria do terreno no Crédito de Construção — define público, teto de
// crédito, taxa e prazo máximo (ver CONSTRUCAO_POR_CATEGORIA):
// `condominio`      = terreno em condomínio fechado (só PF, 80% da obra,
//                     13,99% a.a. + TR, até 360 meses);
// `fora_condominio` = terreno em área comum (PF e PJ, 50% do VGV,
//                     1,25% a.m. + IPCA, até 240 meses).
export type CategoriaTerrenoConstrucao = "condominio" | "fora_condominio"
export type MelhorHorario = "manha" | "tarde"
export type ModalidadeTaxa = "pos_fixada" | "pre_fixada"

export interface Endereco {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

export interface SimulacaoHomeEquity {
  valor_imovel: number
  tipo_imovel: TipoImovel
  situacao: SituacaoImovel
  saldo_devedor?: number
  tipo_pessoa?: "PF" | "PJ"
  valor_solicitado: number
  prazo_meses: number
  parcela_price: number
  primeira_parcela_sac: number
  ultima_parcela_sac: number
  taxa_mensal: number
  taxa_anual?: number
  cet_anual_price?: number
  cet_anual_sac?: number
  primeira_parcela_price?: number
  ultima_parcela_price?: number
  renda_sugerida_price?: number
  renda_sugerida_sac?: number
  modalidade_taxa: ModalidadeTaxa
  /** Timestamp ISO de quando a simulação foi gerada */
  data_simulacao?: string
  /** Nome do cliente que realizou a simulação */
  nome?: string
}

export interface SimulacaoAutoEquity {
  marca_modelo_ano: string
  valor_veiculo: number
  /** Leve (até 20 anos) ou pesado (até 15 anos) — ver CategoriaVeiculo. */
  categoria_veiculo?: CategoriaVeiculo
  situacao: SituacaoVeiculo
  valor_solicitado: number
  prazo_meses: number
  parcela_price: number
  primeira_parcela_sac: number
  ultima_parcela_sac: number
  taxa_mensal: number
  modalidade_taxa: ModalidadeTaxa
  /** PF/PJ — define a alíquota de IOF embutida */
  tipo_pessoa?: "PF" | "PJ"
  /** IOF financiado junto ao crédito (R$) */
  iof_valor?: number
  /** Crédito + IOF (base das parcelas) */
  principal_financiado?: number
  /** Parcela dos meses com IOF diluído (1..meses_com_iof) */
  parcela_inicial?: number
  /** Parcela após a quitação do IOF */
  parcela_apos_iof?: number
  /** Quantidade de meses em que o IOF é diluído (até 12) */
  meses_com_iof?: number
}

export interface SimulacaoFinanciamentoVeiculo {
  marca_modelo_ano: string
  valor_veiculo: number
  /** Entrada paga pelo cliente (0 = financia 100% do bem) */
  valor_entrada: number
  /** Valor financiado = veículo − entrada */
  valor_solicitado: number
  prazo_meses: number
  parcela_price: number
  primeira_parcela_sac: number
  ultima_parcela_sac: number
  taxa_mensal: number
  /** CET anual estimado (sem tarifas adicionais = taxa anual equivalente) */
  cet_anual?: number
  modalidade_taxa: ModalidadeTaxa
}

export interface SimulacaoFinanciamentoImobiliario {
  valor_imovel: number
  tipo_imovel: TipoImovel
  /** PF/PJ do tomador */
  tipo_pessoa?: "PF" | "PJ"
  valor_solicitado: number
  prazo_meses: number
  parcela_price: number
  primeira_parcela_sac: number
  ultima_parcela_sac: number
  taxa_mensal: number
  modalidade_taxa: ModalidadeTaxa
  /** Timestamp ISO de quando a simulação foi gerada */
  data_simulacao?: string
  /** Nome do cliente que realizou a simulação */
  nome?: string
}

export interface SimulacaoCreditoConstrucao {
  /** Categoria do terreno — define teto, taxa, prazo e público da operação. */
  categoria_terreno?: CategoriaTerrenoConstrucao
  tipo_pessoa?: TipoPessoa
  /** Taxa publicada ao ano (TR) — presente quando a categoria cobra a.a. */
  taxa_anual?: number
  valor_terreno: number
  valor_obra: number
  vgv: number
  valor_solicitado: number
  prazo_meses: number
  parcela_price: number
  primeira_parcela_sac: number
  ultima_parcela_sac: number
  taxa_mensal: number
  modalidade_taxa: ModalidadeTaxa
  indexador: string
  numero_tranches: number
  valor_por_tranche: number
}

export interface FinanciamentoImobiliarioFunnelState {
  produto: "financiamento_imobiliario"
  step: number
  valor_imovel: number
  tipo_imovel: TipoImovel | ""
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  valor_solicitado: number
  prazo_meses: number
  simulacao?: SimulacaoFinanciamentoImobiliario
}

export interface CreditoConstrucaoFunnelState {
  produto: "credito_construcao"
  step: number
  valor_terreno: number
  valor_obra: number
  vgv: number
  valor_solicitado: number
  prazo_meses: number
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  simulacao?: SimulacaoCreditoConstrucao
}

export interface Contato {
  nome: string
  data_nascimento: string
  cpf: string
  telefone: string
  email: string
  endereco: Endereco
  melhor_horario: MelhorHorario
}

export interface TrackingData {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  gclid?: string
  fbclid?: string
  referrer?: string
}

export interface LeadPayload {
  produto: Produto
  qualificado: boolean
  simulacao: SimulacaoHomeEquity | SimulacaoAutoEquity | SimulacaoFinanciamentoImobiliario | SimulacaoCreditoConstrucao | SimulacaoFinanciamentoVeiculo
  contato: Contato
  tracking: TrackingData
  consentimento_lgpd: boolean
}

export interface HomeEquityFunnelState {
  produto: "home_equity"
  step: number
  valor_imovel: number
  tipo_imovel: TipoImovel | ""
  situacao: SituacaoImovel | ""
  saldo_devedor: number
  cep: string
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  valor_solicitado: number
  prazo_meses: number
  simulacao?: SimulacaoHomeEquity
}

export interface AutoEquityFunnelState {
  produto: "auto_equity"
  step: number
  marca_modelo_ano: string
  valor_veiculo: number
  categoria_veiculo: CategoriaVeiculo
  situacao: SituacaoVeiculo | ""
  valor_solicitado: number
  prazo_meses: number
  simulacao?: SimulacaoAutoEquity
}

export interface ContatoFormData extends Contato {
  consentimento_lgpd: boolean
}

export interface ViaCEPResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export interface KommoLeadResponse {
  ok: boolean
  lead_id?: number
  error?: string
}
