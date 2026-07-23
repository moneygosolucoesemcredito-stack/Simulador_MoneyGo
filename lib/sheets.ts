import type { LeadPayload } from "@/types"

// ──────────────────────────────────────────────────────────────────────────
// Fallback de persistência de leads via Google Sheets (Apps Script Web App).
//
// Prioridade de integração: Kommo CRM (lib/kommo.ts). Este módulo é acionado
// apenas como contingência — quando o Kommo falha ou não está configurado —
// para nenhum lead se perder. O passo a passo de publicação do Web App está em
// docs/integracao-crm.md.
//
// A URL do Web App é secreta (contém o deployment id) e fica somente no server
// (sem prefixo NEXT_PUBLIC_). Sem ela, o fallback é um no-op silencioso.
// ──────────────────────────────────────────────────────────────────────────

const WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL ?? ""

/** Linha gravada na planilha — só os campos essenciais do lead. */
export interface LeadSheetRow {
  data: string
  nome: string
  email: string
  telefone: string
  produto: string
  valor: number
  prazo_meses: number
  qualificado: boolean
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export function sheetsConfigurado(): boolean {
  return WEBHOOK_URL.length > 0
}

/** Extrai a linha da planilha a partir do payload do lead. */
export function montarLinhaSheets(payload: LeadPayload): LeadSheetRow {
  const { contato, simulacao, tracking, produto, qualificado } = payload
  return {
    data: new Date().toISOString(),
    nome: contato.nome,
    email: contato.email,
    telefone: contato.telefone,
    produto,
    valor: simulacao.valor_solicitado,
    prazo_meses: simulacao.prazo_meses,
    qualificado,
    utm_source: tracking.utm_source,
    utm_medium: tracking.utm_medium,
    utm_campaign: tracking.utm_campaign,
  }
}

/**
 * Envia o lead para o Web App do Google Sheets. Retorna `true` em caso de
 * sucesso e `false` quando não configurado — erros de rede sobem para o chamador
 * decidir (o /api/proposta apenas registra e segue, sem derrubar a resposta).
 */
export async function enviarLeadGoogleSheets(payload: LeadPayload): Promise<boolean> {
  if (!WEBHOOK_URL) return false
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(montarLinhaSheets(payload)),
  })
  if (!res.ok) {
    throw new Error(`Google Sheets webhook error ${res.status}`)
  }
  return true
}
