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

interface FunnelStore {
  homeEquity: HomeEquityState
  autoEquity: AutoEquityState
  contato: Partial<ContatoFormData>
  tracking: TrackingData
  setHomeEquity: (data: Partial<HomeEquityState>) => void
  setAutoEquity: (data: Partial<AutoEquityState>) => void
  setContato: (data: Partial<ContatoFormData>) => void
  setTracking: (data: TrackingData) => void
  resetHomeEquity: () => void
  resetAutoEquity: () => void
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

export const useFunnelStore = create<FunnelStore>()(
  persist(
    (set) => ({
      homeEquity: defaultHomeEquity,
      autoEquity: defaultAutoEquity,
      contato: {},
      tracking: {},
      setHomeEquity: (data) =>
        set((s) => ({ homeEquity: { ...s.homeEquity, ...data } })),
      setAutoEquity: (data) =>
        set((s) => ({ autoEquity: { ...s.autoEquity, ...data } })),
      setContato: (data) =>
        set((s) => ({ contato: { ...s.contato, ...data } })),
      setTracking: (data) => set({ tracking: data }),
      resetHomeEquity: () => set({ homeEquity: defaultHomeEquity }),
      resetAutoEquity: () => set({ autoEquity: defaultAutoEquity }),
    }),
    {
      name: "moneygo-funnel",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : localStorage
      ),
    }
  )
)
