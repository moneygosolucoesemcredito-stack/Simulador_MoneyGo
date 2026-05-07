"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ContatoForm, type ContatoFormValues } from "@/components/funnel/ContatoForm"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularSimulacao } from "@/lib/simulacao"
import { qualificarHomeEquity } from "@/lib/qualificacao"
import { CONFIG } from "@/lib/config"
import { trackLead } from "@/components/tracking/MetaPixel"
import { pushDataLayer } from "@/components/tracking/GTM"
import { toast } from "sonner"
import type { LeadPayload } from "@/types"

export function Step7Contato() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { homeEquity, tracking } = useFunnelStore()

  async function handleSubmit(formData: ContatoFormValues) {
    setLoading(true)
    try {
      const { taxaMensal, modalidadeTaxa } = CONFIG.homeEquity
      const resultado = calcularSimulacao(homeEquity.valor_solicitado, taxaMensal, homeEquity.prazo_meses)

      const { qualificado } = qualificarHomeEquity({
        valor_imovel: homeEquity.valor_imovel,
        tipo_imovel: homeEquity.tipo_imovel as "casa",
        situacao: homeEquity.situacao as "quitado" | "financiado",
        saldo_devedor: homeEquity.saldo_devedor,
        valor_solicitado: homeEquity.valor_solicitado,
        cidade: homeEquity.cidade,
        uf: homeEquity.uf,
        data_nascimento: formData.data_nascimento,
      })

      const payload: LeadPayload = {
        produto: "home_equity",
        qualificado,
        simulacao: {
          valor_imovel: homeEquity.valor_imovel,
          tipo_imovel: homeEquity.tipo_imovel as "casa",
          situacao: homeEquity.situacao as "quitado",
          saldo_devedor: homeEquity.saldo_devedor || undefined,
          valor_solicitado: homeEquity.valor_solicitado,
          prazo_meses: homeEquity.prazo_meses,
          parcela_price: resultado.parcela_price,
          primeira_parcela_sac: resultado.primeira_parcela_sac,
          ultima_parcela_sac: resultado.ultima_parcela_sac,
          taxa_mensal: taxaMensal,
          modalidade_taxa: modalidadeTaxa,
        },
        contato: {
          nome: formData.nome,
          data_nascimento: formData.data_nascimento,
          cpf: formData.cpf,
          telefone: formData.telefone,
          email: formData.email,
          endereco: {
            cep: formData.cep,
            logradouro: formData.logradouro,
            numero: formData.numero,
            complemento: formData.complemento ?? "",
            bairro: formData.bairro,
            cidade: formData.cidade,
            uf: formData.uf,
          },
          melhor_horario: formData.melhor_horario,
        },
        tracking,
        consentimento_lgpd: true,
      }

      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Erro ao enviar")
      }

      trackLead({ produto: "home_equity", qualificado })
      pushDataLayer("lead_submitted", { funil: "home_equity", qualificado })

      router.push(qualificado ? "/obrigado" : "/nao-qualificado")
    } catch (err) {
      console.error(err)
      toast.error("Ocorreu um erro ao enviar seus dados. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return <ContatoForm onSubmit={handleSubmit} loading={loading} />
}
