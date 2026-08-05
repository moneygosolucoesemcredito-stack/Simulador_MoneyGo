"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ContatoForm, type ContatoFormValues } from "@/components/funnel/ContatoForm"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularSimulacao } from "@/lib/simulacao"
import { qualificarCreditoConstrucao } from "@/lib/qualificacao"
import {
  CONFIG,
  regraConstrucao,
  taxaAnualConstrucao,
  taxaMensalConstrucao,
} from "@/lib/config"
import { trackLead } from "@/components/tracking/MetaPixel"
import { pushDataLayer } from "@/components/tracking/GTM"
import { toast } from "sonner"
import type { LeadPayload } from "@/types"

export function Step6Contato() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { creditoConstrucao, tracking } = useFunnelStore()

  async function handleSubmit(formData: ContatoFormValues) {
    setLoading(true)
    try {
      const { modalidadeTaxa, numeroDeTranches } = CONFIG.creditoConstrucao
      const categoria = creditoConstrucao.categoria_terreno
      const regra = regraConstrucao(categoria)
      // A taxa da categoria pode ser publicada ao ano (TR); o cálculo usa o
      // mensal equivalente.
      const taxaMensal = taxaMensalConstrucao(categoria)
      const resultado = calcularSimulacao(
        creditoConstrucao.valor_solicitado,
        taxaMensal,
        creditoConstrucao.prazo_meses
      )

      const { qualificado } = qualificarCreditoConstrucao({
        valor_terreno: creditoConstrucao.valor_terreno,
        valor_obra: creditoConstrucao.valor_obra,
        vgv: creditoConstrucao.vgv,
        valor_solicitado: creditoConstrucao.valor_solicitado,
        cidade: creditoConstrucao.cidade,
        uf: creditoConstrucao.uf,
        data_nascimento: formData.data_nascimento,
        categoria_terreno: categoria,
        tipo_pessoa: creditoConstrucao.tipo_pessoa,
        prazo_meses: creditoConstrucao.prazo_meses,
      })

      const payload: LeadPayload = {
        produto: "credito_construcao",
        qualificado,
        simulacao: {
          categoria_terreno: categoria || undefined,
          tipo_pessoa: (creditoConstrucao.tipo_pessoa || "PF") as "PF" | "PJ",
          valor_terreno: creditoConstrucao.valor_terreno,
          valor_obra: creditoConstrucao.valor_obra,
          vgv: creditoConstrucao.vgv,
          valor_solicitado: creditoConstrucao.valor_solicitado,
          prazo_meses: creditoConstrucao.prazo_meses,
          parcela_price: resultado.parcela_price,
          primeira_parcela_sac: resultado.primeira_parcela_sac,
          ultima_parcela_sac: resultado.ultima_parcela_sac,
          taxa_mensal: taxaMensal,
          taxa_anual: taxaAnualConstrucao(categoria),
          modalidade_taxa: modalidadeTaxa,
          indexador: regra.indexador,
          numero_tranches: numeroDeTranches,
          valor_por_tranche: Math.floor(creditoConstrucao.valor_solicitado / numeroDeTranches),
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

      trackLead({ produto: "credito_construcao", qualificado })
      pushDataLayer("lead_submitted", { funil: "credito_construcao", qualificado })

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
