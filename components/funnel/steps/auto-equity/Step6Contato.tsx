"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ContatoForm, type ContatoFormValues } from "@/components/funnel/ContatoForm"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularSimulacao } from "@/lib/simulacao"
import { qualificarAutoEquity } from "@/lib/qualificacao"
import { CONFIG } from "@/lib/config"
import { trackLead } from "@/components/tracking/MetaPixel"
import { pushDataLayer } from "@/components/tracking/GTM"
import { toast } from "sonner"
import type { LeadPayload } from "@/types"

export function Step6Contato() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { autoEquity, tracking } = useFunnelStore()

  async function handleSubmit(formData: ContatoFormValues) {
    setLoading(true)
    try {
      const { taxaMensal, modalidadeTaxa } = CONFIG.autoEquity
      const resultado = calcularSimulacao(autoEquity.valor_solicitado, taxaMensal, autoEquity.prazo_meses)

      const { qualificado } = qualificarAutoEquity({
        valor_veiculo: autoEquity.valor_veiculo,
        ano_veiculo: autoEquity.ano_veiculo,
        valor_solicitado: autoEquity.valor_solicitado,
      })

      const payload: LeadPayload = {
        produto: "auto_equity",
        qualificado,
        simulacao: {
          marca_modelo_ano: autoEquity.marca_modelo_ano,
          valor_veiculo: autoEquity.valor_veiculo,
          situacao: autoEquity.situacao as "quitado",
          valor_solicitado: autoEquity.valor_solicitado,
          prazo_meses: autoEquity.prazo_meses,
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

      trackLead({ produto: "auto_equity", qualificado })
      pushDataLayer("lead_submitted", { funil: "auto_equity", qualificado })

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
