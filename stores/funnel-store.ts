"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  TrackingData,
  ContatoFormData,
  CategoriaVeiculo,
  CategoriaTerrenoConstrucao,
  TipoPessoa,
} from "@/types"

export interface HomeEquityState {
  step: number
  valor_imovel: number
  tipo_imovel: string
  situacao: string
  saldo_devedor: number
  tipo_pessoa: "PF" | "PJ" | ""
  /** true apenas quando o PF/PJ veio travado pelo link do operador (?pessoa=).
   *  Só nesse caso o seletor deixa de ser exibido ao cliente. */
  pessoa_travada_link: boolean
  /** Data de nascimento do tomador (YYYY-MM-DD) — trava idade × prazo (≤ 80). */
  data_nascimento: string
  /** Nome do lead/tomador — personaliza a simulação (tela de resultado e PDF). */
  nome_lead: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  valor_solicitado: number
  prazo_meses: number
  /** taxa a.m. (fração) definida pelo OPERADOR (0 = ainda não definida) */
  taxa_mensal: number
  /** operador: digita a taxa e simula | cliente: abre link com taxa travada */
  modo: "operador" | "cliente"
  /** true quando a taxa é apenas indicativa (cliente público, sem link de operador) */
  taxa_indicativa: boolean
}

export interface AutoEquityState {
  step: number
  marca_modelo_ano: string
  ano_veiculo: number
  valor_veiculo: number
  /** Leve (carro/SUV/picape, até 20 anos) ou pesado (caminhão/ônibus, até 15 anos). */
  categoria_veiculo: CategoriaVeiculo
  /** Placa consultada (quando o usuário escolheu "tenho a placa"). */
  placa: string
  /** Combustível (FIPE/placa): Gasolina, Álcool, Flex, Diesel… */
  combustivel: string
  /** Potência/cilindradas, quando a API de placa retorna. */
  potencia: string
  /** Código FIPE do veículo (rastreabilidade). */
  fipe_codigo: string
  situacao: string
  /** PF/PJ — define a alíquota de IOF embutida no principal */
  tipo_pessoa: "PF" | "PJ" | ""
  valor_solicitado: number
  prazo_meses: number
}

export interface FinanciamentoVeiculoState {
  step: number
  marca_modelo_ano: string
  ano_veiculo: number
  /** Valor do veículo (FIPE, ajustável pelo cliente). */
  valor_veiculo: number
  /** Placa consultada (quando o usuário escolheu "tenho a placa"). */
  placa: string
  combustivel: string
  potencia: string
  fipe_codigo: string
  /** Entrada paga pelo cliente (0 = financia 100%). */
  valor_entrada: number
  prazo_meses: number
}

export interface FinanciamentoImobiliarioState {
  step: number
  valor_imovel: number
  tipo_imovel: string
  /** PF/PJ do tomador — mantém a consistência de perfil com o Home Equity */
  tipo_pessoa: "PF" | "PJ" | ""
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  valor_solicitado: number
  prazo_meses: number
}

export interface CreditoConstrucaoState {
  step: number
  /** Terreno em condomínio fechado ou fora dele — define público, teto,
   *  taxa e prazo máximo (ver CONSTRUCAO_POR_CATEGORIA). */
  categoria_terreno: CategoriaTerrenoConstrucao | ""
  /** Tomador. Dentro de condomínio só PF é aceita. */
  tipo_pessoa: TipoPessoa | ""
  valor_terreno: number
  valor_obra: number
  vgv: number
  valor_solicitado: number
  prazo_meses: number
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

interface FunnelStore {
  homeEquity: HomeEquityState
  autoEquity: AutoEquityState
  financiamentoImobiliario: FinanciamentoImobiliarioState
  creditoConstrucao: CreditoConstrucaoState
  financiamentoVeiculo: FinanciamentoVeiculoState
  contato: Partial<ContatoFormData>
  tracking: TrackingData
  setHomeEquity: (data: Partial<HomeEquityState>) => void
  setAutoEquity: (data: Partial<AutoEquityState>) => void
  setFinanciamentoImobiliario: (data: Partial<FinanciamentoImobiliarioState>) => void
  setCreditoConstrucao: (data: Partial<CreditoConstrucaoState>) => void
  setFinanciamentoVeiculo: (data: Partial<FinanciamentoVeiculoState>) => void
  setContato: (data: Partial<ContatoFormData>) => void
  setTracking: (data: TrackingData) => void
  resetHomeEquity: () => void
  resetAutoEquity: () => void
  resetFinanciamentoImobiliario: () => void
  resetCreditoConstrucao: () => void
  resetFinanciamentoVeiculo: () => void
  resetContato: () => void
}

const defaultHomeEquity: HomeEquityState = {
  step: 1,
  valor_imovel: 500_000,
  tipo_imovel: "",
  situacao: "",
  saldo_devedor: 0,
  tipo_pessoa: "",
  pessoa_travada_link: false,
  data_nascimento: "",
  nome_lead: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  valor_solicitado: 150_000,
  prazo_meses: 180,
  taxa_mensal: 0,
  modo: "operador",
  taxa_indicativa: false,
}

const defaultAutoEquity: AutoEquityState = {
  step: 1,
  marca_modelo_ano: "",
  ano_veiculo: new Date().getFullYear() - 2,
  valor_veiculo: 80_000,
  categoria_veiculo: "leve",
  placa: "",
  combustivel: "",
  potencia: "",
  fipe_codigo: "",
  situacao: "",
  tipo_pessoa: "",
  valor_solicitado: 30_000,
  prazo_meses: 36,
}

const defaultFinanciamentoVeiculo: FinanciamentoVeiculoState = {
  step: 1,
  marca_modelo_ano: "",
  ano_veiculo: new Date().getFullYear() - 2,
  valor_veiculo: 0,
  placa: "",
  combustivel: "",
  potencia: "",
  fipe_codigo: "",
  valor_entrada: 0,
  prazo_meses: 48,
}

const defaultFinanciamentoImobiliario: FinanciamentoImobiliarioState = {
  step: 1,
  valor_imovel: 400_000,
  tipo_imovel: "",
  tipo_pessoa: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  valor_solicitado: 200_000,
  prazo_meses: 240,
}

const defaultCreditoConstrucao: CreditoConstrucaoState = {
  step: 1,
  categoria_terreno: "",
  tipo_pessoa: "",
  valor_terreno: 500_000,
  valor_obra: 1_000_000,
  vgv: 3_000_000,
  valor_solicitado: 500_000,
  prazo_meses: 240,
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
}

export const useFunnelStore = create<FunnelStore>()(
  persist(
    (set) => ({
      homeEquity: defaultHomeEquity,
      autoEquity: defaultAutoEquity,
      financiamentoImobiliario: defaultFinanciamentoImobiliario,
      creditoConstrucao: defaultCreditoConstrucao,
      financiamentoVeiculo: defaultFinanciamentoVeiculo,
      contato: {},
      tracking: {},
      setHomeEquity: (data) =>
        set((s) => ({ homeEquity: { ...s.homeEquity, ...data } })),
      setAutoEquity: (data) =>
        set((s) => ({ autoEquity: { ...s.autoEquity, ...data } })),
      setFinanciamentoImobiliario: (data) =>
        set((s) => ({ financiamentoImobiliario: { ...s.financiamentoImobiliario, ...data } })),
      setCreditoConstrucao: (data) =>
        set((s) => ({ creditoConstrucao: { ...s.creditoConstrucao, ...data } })),
      setFinanciamentoVeiculo: (data) =>
        set((s) => ({ financiamentoVeiculo: { ...s.financiamentoVeiculo, ...data } })),
      setContato: (data) =>
        set((s) => ({ contato: { ...s.contato, ...data } })),
      setTracking: (data) => set({ tracking: data }),
      resetHomeEquity: () => set({ homeEquity: defaultHomeEquity }),
      resetAutoEquity: () => set({ autoEquity: defaultAutoEquity }),
      resetFinanciamentoImobiliario: () => set({ financiamentoImobiliario: defaultFinanciamentoImobiliario }),
      resetCreditoConstrucao: () => set({ creditoConstrucao: defaultCreditoConstrucao }),
      resetFinanciamentoVeiculo: () => set({ financiamentoVeiculo: defaultFinanciamentoVeiculo }),
      resetContato: () => set({ contato: {} }),
    }),
    {
      name: "moneygo-funnel",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : localStorage
      ),
    }
  )
)
