"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ContatoForm, type ContatoFormValues } from "@/components/funnel/ContatoForm"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularAutoEquity } from "@/lib/simulacao"
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
      const { taxaMensal, modalidadeTaxa, iofPF, iofPJ } = CONFIG.autoEquity
      const tipoPessoa = (autoEquity.tipo_pessoa || "PF") as "PF" | "PJ"
      // IOF financiado com juros e diluído nas 12 primeiras parcelas.
      const ae = calcularAutoEquity({
        valorCredito: autoEquity.valor_solicitado,
        prazoMeses: autoEquity.prazo_meses,
        taxaMensal,
        tipoPessoa,
        iofPF,
        iofPJ,
      })

      const { qualificado, motivos } = qualificarAutoEquity({
        valor_veiculo: autoEquity.valor_veiculo,
        ano_veiculo: autoEquity.ano_veiculo,
        valor_solicitado: autoEquity.valor_solicitado,
        situacao: autoEquity.situacao,
        categoria_veiculo: autoEquity.categoria_veiculo,
      })

      // Veículo inelegível não vira lead: a operação não trabalha esses
      // contatos. O Step 1 já barra o veículo — aqui é a última trava, para
      // estado antigo em sessão ou dado alterado no caminho.
      if (!qualificado) {
        pushDataLayer("lead_descartado", { funil: "auto_equity", motivos })
        router.push("/nao-qualificado")
        return
      }

      // Só chega aqui quem passou na qualificação.
      const payload: LeadPayload = {
        produto: "auto_equity",
        qualificado: true,
        simulacao: {
          marca_modelo_ano: autoEquity.marca_modelo_ano,
          valor_veiculo: autoEquity.valor_veiculo,
          categoria_veiculo: autoEquity.categoria_veiculo,
          situacao: autoEquity.situacao as "quitado" | "financiado",
          valor_solicitado: autoEquity.valor_solicitado,
          prazo_meses: autoEquity.prazo_meses,
          // Parcela exibida ao cliente (meses com IOF). SAC não existe no
          // produto: os campos legados carregam primeira/última parcela Price.
          parcela_price: ae.parcelaInicial,
          primeira_parcela_sac: ae.parcelaInicial,
          ultima_parcela_sac: ae.parcelaRestante,
          taxa_mensal: taxaMensal,
          modalidade_taxa: modalidadeTaxa,
          tipo_pessoa: tipoPessoa,
          iof_valor: ae.iofValor,
          principal_financiado: ae.principalFinanciado,
          parcela_inicial: ae.parcelaInicial,
          parcela_apos_iof: ae.parcelaRestante,
          meses_com_iof: ae.mesesComIOF,
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

      trackLead({ produto: "auto_equity", qualificado: true })
      pushDataLayer("lead_submitted", { funil: "auto_equity", qualificado: true })

      router.push("/obrigado")
    } catch (err) {
      console.error(err)
      toast.error("Ocorreu um erro ao enviar seus dados. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return <ContatoForm onSubmit={handleSubmit} loading={loading} />
}
