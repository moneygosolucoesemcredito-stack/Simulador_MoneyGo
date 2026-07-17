"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ContatoForm, type ContatoFormValues } from "@/components/funnel/ContatoForm"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularSimulacao } from "@/lib/simulacao"
import { qualificarFinanciamentoImobiliario } from "@/lib/qualificacao"
import { CONFIG } from "@/lib/config"
import { trackLead } from "@/components/tracking/MetaPixel"
import { pushDataLayer } from "@/components/tracking/GTM"
import { toast } from "sonner"
import type { LeadPayload } from "@/types"

export function Step6Contato() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { financiamentoImobiliario, tracking } = useFunnelStore()

  async function handleSubmit(formData: ContatoFormValues) {
    setLoading(true)
    try {
      const { taxaMensal, modalidadeTaxa } = CONFIG.financiamentoImobiliario
      const resultado = calcularSimulacao(
        financiamentoImobiliario.valor_solicitado,
        taxaMensal,
        financiamentoImobiliario.prazo_meses
      )

      const { qualificado } = qualificarFinanciamentoImobiliario({
        valor_imovel: financiamentoImobiliario.valor_imovel,
        tipo_imovel: financiamentoImobiliario.tipo_imovel as "casa",
        valor_solicitado: financiamentoImobiliario.valor_solicitado,
        cidade: financiamentoImobiliario.cidade,
        uf: financiamentoImobiliario.uf,
        data_nascimento: formData.data_nascimento,
      })

      const payload: LeadPayload = {
        produto: "financiamento_imobiliario",
        qualificado,
        simulacao: {
          valor_imovel: financiamentoImobiliario.valor_imovel,
          tipo_imovel: financiamentoImobiliario.tipo_imovel as "casa",
          tipo_pessoa: (financiamentoImobiliario.tipo_pessoa || "PF") as "PF" | "PJ",
          valor_solicitado: financiamentoImobiliario.valor_solicitado,
          prazo_meses: financiamentoImobiliario.prazo_meses,
          parcela_price: resultado.parcela_price,
          primeira_parcela_sac: resultado.primeira_parcela_sac,
          ultima_parcela_sac: resultado.ultima_parcela_sac,
          taxa_mensal: taxaMensal,
          modalidade_taxa: modalidadeTaxa,
          data_simulacao: new Date().toISOString(),
          nome: formData.nome,
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
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Erro ao enviar")

      trackLead({ produto: "financiamento_imobiliario", qualificado })
      pushDataLayer("lead_submitted", { funil: "financiamento_imobiliario", qualificado })

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
