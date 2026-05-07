export type Produto = "home_equity" | "auto_equity"

export type TipoImovel = "casa" | "apartamento" | "comercial" | "terreno_condominio"
export type SituacaoImovel = "quitado" | "financiado"
export type SituacaoVeiculo = "quitado" | "financiado"
export type MelhorHorario = "manha" | "tarde" | "noite"
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
  valor_solicitado: number
  prazo_meses: number
  parcela_price: number
  primeira_parcela_sac: number
  ultima_parcela_sac: number
  taxa_mensal: number
  modalidade_taxa: ModalidadeTaxa
}

export interface SimulacaoAutoEquity {
  marca_modelo_ano: string
  valor_veiculo: number
  situacao: SituacaoVeiculo
  valor_solicitado: number
  prazo_meses: number
  parcela_price: number
  primeira_parcela_sac: number
  ultima_parcela_sac: number
  taxa_mensal: number
  modalidade_taxa: ModalidadeTaxa
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
  simulacao: SimulacaoHomeEquity | SimulacaoAutoEquity
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
