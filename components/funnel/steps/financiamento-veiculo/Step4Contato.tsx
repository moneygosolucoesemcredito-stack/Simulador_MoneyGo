"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ContatoForm, type ContatoFormValues } from "@/components/funnel/ContatoForm"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularFinanciamentoVeiculo } from "@/lib/simulacao"
import { qualificarFinanciamentoVeiculo } from "@/lib/qualificacao"
import { CONFIG } from "@/lib/config"
import { trackLead } from "@/components/tracking/MetaPixel"
import { pushDataLayer } from "@/components/tracking/GTM"
import { toast } from "sonner"
import type { LeadPayload } from "@/types"

export function Step4Contato() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { financiamentoVeiculo, tracking } = useFunnelStore()

  async function handleSubmit(formData: ContatoFormValues) {
    setLoading(true)
    try {
      const { taxaMensal, modalidadeTaxa } = CONFIG.financiamentoVeiculo
      // Valor informado direto pelo cliente (trava de 80% aplicada no Step 2).
      const valorFinanciado = financiamentoVeiculo.valor_financiado
      // Entrada deixa de ser um campo: é o que sobra entre o bem e o financiado.
      const recursosProprios = Math.max(0, financiamentoVeiculo.valor_veiculo - valorFinanciado)

      const fv = calcularFinanciamentoVeiculo({
        valorCredito: valorFinanciado,
        taxaMensal,
        prazoMeses: financiamentoVeiculo.prazo_meses,
      })

      const { qualificado } = qualificarFinanciamentoVeiculo({
        valor_veiculo: financiamentoVeiculo.valor_veiculo,
        valor_solicitado: valorFinanciado,
        prazo_meses: financiamentoVeiculo.prazo_meses,
        categoria_veiculo: financiamentoVeiculo.categoria_veiculo,
        ano_veiculo: financiamentoVeiculo.ano_veiculo,
      })

      const payload: LeadPayload = {
        produto: "financiamento_veiculo",
        qualificado,
        simulacao: {
          marca_modelo_ano: financiamentoVeiculo.marca_modelo_ano,
          categoria_veiculo: financiamentoVeiculo.categoria_veiculo,
          ano_veiculo: financiamentoVeiculo.ano_veiculo,
          valor_veiculo: financiamentoVeiculo.valor_veiculo,
          valor_entrada: recursosProprios,
          valor_solicitado: valorFinanciado,
          prazo_meses: financiamentoVeiculo.prazo_meses,
          // Produto 100% Price: os campos SAC legados carregam a mesma parcela.
          parcela_price: fv.parcela,
          primeira_parcela_sac: fv.parcela,
          ultima_parcela_sac: fv.parcela,
          taxa_mensal: taxaMensal,
          cet_anual: fv.taxaAnual,
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

      trackLead({ produto: "financiamento_veiculo", qualificado })
      pushDataLayer("lead_submitted", { funil: "financiamento_veiculo", qualificado })

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
