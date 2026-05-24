"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { TrackingData, ContatoFormData } from "@/types"

export interface HomeEquityState {
  step: number
  valor_imovel: number
  tipo_imovel: string
  situacao: string
  saldo_devedor: number
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

export interface AutoEquityState {
  step: number
  marca_modelo_ano: string
  ano_veiculo: number
  valor_veiculo: number
  situacao: string
  valor_solicitado: number
  prazo_meses: number
}

export interface FinanciamentoImobiliarioState {
  step: number
  valor_imovel: number
  tipo_imovel: string
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
  valor_terreno: number
  valor_obra: number
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
  contato: Partial<ContatoFormData>
  tracking: TrackingData
  setHomeEquity: (data: Partial<HomeEquityState>) => void
  setAutoEquity: (data: Partial<AutoEquityState>) => void
  setFinanciamentoImobiliario: (data: Partial<FinanciamentoImobiliarioState>) => void
  setCreditoConstrucao: (data: Partial<CreditoConstrucaoState>) => void
  setContato: (data: Partial<ContatoFormData>) => void
  setTracking: (data: TrackingData) => void
  resetHomeEquity: () => void
  resetAutoEquity: () => void
  resetFinanciamentoImobiliario: () => void
  resetCreditoConstrucao: () => void
}

const defaultHomeEquity: HomeEquityState = {
  step: 1,
  valor_imovel: 500_000,
  tipo_imovel: "",
  situacao: "",
  saldo_devedor: 0,
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  valor_solicitado: 150_000,
  prazo_meses: 180,
}

const defaultAutoEquity: AutoEquityState = {
  step: 1,
  marca_modelo_ano: "",
  ano_veiculo: new Date().getFullYear() - 2,
  valor_veiculo: 80_000,
  situacao: "",
  valor_solicitado: 30_000,
  prazo_meses: 36,
}

const defaultFinanciamentoImobiliario: FinanciamentoImobiliarioState = {
  step: 1,
  valor_imovel: 400_000,
  tipo_imovel: "",
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
  valor_terreno: 500_000,
  valor_obra: 1_000_000,
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
      setContato: (data) =>
        set((s) => ({ contato: { ...s.contato, ...data } })),
      setTracking: (data) => set({ tracking: data }),
      resetHomeEquity: () => set({ homeEquity: defaultHomeEquity }),
      resetAutoEquity: () => set({ autoEquity: defaultAutoEquity }),
      resetFinanciamentoImobiliario: () => set({ financiamentoImobiliario: defaultFinanciamentoImobiliario }),
      resetCreditoConstrucao: () => set({ creditoConstrucao: defaultCreditoConstrucao }),
    }),
    {
      name: "moneygo-funnel",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : localStorage
      ),
    }
  )
)
