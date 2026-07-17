"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ContatoForm, type ContatoFormValues } from "@/components/funnel/ContatoForm"
import { criarSupabaseBrowser } from "@/lib/supabase/client"
import { useFunnelStore } from "@/stores/funnel-store"
import { calcularHomeEquity } from "@/lib/simulacao"
import { qualificarHomeEquity } from "@/lib/qualificacao"
import { CONFIG } from "@/lib/config"
import { trackLead } from "@/components/tracking/MetaPixel"
import { pushDataLayer } from "@/components/tracking/GTM"
import { toast } from "sonner"
import type { LeadPayload } from "@/types"

export function Step7Contato() {
  const [loading, setLoading] = useState(false)
  const [defaults, setDefaults] = useState<Partial<ContatoFormValues> | null>(null)
  const router = useRouter()
  const { homeEquity, tracking } = useFunnelStore()

  // Cliente que se cadastrou pelo link do parceiro já informou nome, e-mail
  // e WhatsApp — pré-preenche para não digitar de novo.
  useEffect(() => {
    const supabase = criarSupabaseBrowser()
    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (!data.user) return {}
        const { data: cliente } = await supabase
          .from("clientes")
          .select("nome, email, telefone")
          .eq("id", data.user.id)
          .maybeSingle()
        if (!cliente) return {}
        return {
          nome: cliente.nome || undefined,
          email: cliente.email || undefined,
          telefone: cliente.telefone || undefined,
        }
      })
      .then(setDefaults)
      .catch(() => setDefaults({}))
  }, [])

  async function handleSubmit(formData: ContatoFormValues) {
    setLoading(true)
    try {
      const { modalidadeTaxa } = CONFIG.homeEquity
      const taxaMensal = homeEquity.taxa_mensal || CONFIG.homeEquity.taxaMensal
      const tipoPessoa = (homeEquity.tipo_pessoa || "PF") as "PF" | "PJ"
      const resultado = calcularHomeEquity({
        valorCredito: homeEquity.valor_solicitado,
        valorImovel: homeEquity.valor_imovel,
        prazoMeses: homeEquity.prazo_meses,
        taxaMensal,
        tipoPessoa,
      })

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
          tipo_pessoa: tipoPessoa,
          valor_solicitado: homeEquity.valor_solicitado,
          prazo_meses: homeEquity.prazo_meses,
          parcela_price: resultado.price.primeiraParcela,
          primeira_parcela_price: resultado.price.primeiraParcela,
          ultima_parcela_price: resultado.price.ultimaParcela,
          primeira_parcela_sac: resultado.sac.primeiraParcela,
          ultima_parcela_sac: resultado.sac.ultimaParcela,
          renda_sugerida_price: resultado.price.rendaSugerida,
          renda_sugerida_sac: resultado.sac.rendaSugerida,
          cet_anual_price: resultado.price.cetAnual,
          cet_anual_sac: resultado.sac.cetAnual,
          taxa_mensal: taxaMensal,
          taxa_anual: resultado.taxaAnual,
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

      const res = await fetch("/api/proposta", {
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

  // Aguarda a consulta do cadastro para o formulário nascer já preenchido.
  if (defaults === null) return null

  return <ContatoForm onSubmit={handleSubmit} loading={loading} defaults={defaults} />
}
