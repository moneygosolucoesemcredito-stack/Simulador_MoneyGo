"use client"

import { useEffect } from "react"
import { useFunnelStore } from "@/stores/funnel-store"

/**
 * Limpa todos os funis e os dados de contato ao montar.
 * Usado nas páginas de destino pós-envio (/obrigado e /nao-qualificado) para
 * que uma nova simulação na mesma aba comece do zero — importante em
 * dispositivo compartilhado (consultor atendendo vários clientes).
 */
export function ResetFunnels() {
  const {
    resetHomeEquity,
    resetAutoEquity,
    resetFinanciamentoImobiliario,
    resetCreditoConstrucao,
    resetFinanciamentoVeiculo,
    resetContato,
  } = useFunnelStore()

  useEffect(() => {
    resetHomeEquity()
    resetAutoEquity()
    resetFinanciamentoImobiliario()
    resetCreditoConstrucao()
    resetFinanciamentoVeiculo()
    resetContato()
  }, [resetHomeEquity, resetAutoEquity, resetFinanciamentoImobiliario, resetCreditoConstrucao, resetFinanciamentoVeiculo, resetContato])

  return null
}
