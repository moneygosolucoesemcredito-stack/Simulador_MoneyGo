import { NextRequest, NextResponse } from "next/server"
import { criarSupabaseServer } from "@/lib/supabase/server"
import { criarLeadKommo } from "@/lib/kommo"
import { enviarLeadGoogleSheets, sheetsConfigurado } from "@/lib/sheets"
import type { LeadPayload } from "@/types"

// Usa Node runtime: o cliente Supabase SSR lê cookies de sessão do operador.
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const payload: LeadPayload = await req.json()

    if (!payload.produto || !payload.contato || !payload.simulacao) {
      return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 })
    }
    if (!payload.consentimento_lgpd) {
      return NextResponse.json({ ok: false, error: "Consentimento LGPD não fornecido" }, { status: 422 })
    }

    // A origem é derivada da sessão (não confiamos no cliente). Uma sessão pode
    // ser de OPERADOR (está na allowlist `operadores`) ou de CLIENTE (conta
    // criada pelo link do consultor). No caso do cliente, o vínculo com o
    // consultor vem do cadastro dele (`clientes.operador_id`).
    const supabase = await criarSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let origem: "operador" | "cliente" = "cliente"
    let operadorId: string | null = null
    let clienteId: string | null = null

    if (user) {
      const { data: operador } = await supabase
        .from("operadores")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()

      if (operador) {
        origem = "operador"
        operadorId = user.id
      } else {
        clienteId = user.id
        const { data: cliente } = await supabase
          .from("clientes")
          .select("operador_id")
          .eq("id", user.id)
          .maybeSingle()
        operadorId = cliente?.operador_id ?? null
      }
    }

    const { error: erroInsert } = await supabase.from("propostas").insert({
      produto: payload.produto,
      origem,
      operador_id: operadorId,
      cliente_id: clienteId,
      taxa_mensal: payload.simulacao.taxa_mensal ?? null,
      simulacao: payload.simulacao,
      contato: payload.contato,
    })

    if (erroInsert && process.env.NODE_ENV !== "production") {
      console.error("[/api/proposta] supabase insert:", erroInsert.message)
    }

    // Envia ao CRM em paralelo ao registro; falha no Kommo não derruba a proposta.
    let lead_id: number | string | null = null
    let kommoOk = false
    try {
      lead_id = await criarLeadKommo(payload)
      kommoOk = true
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[/api/proposta] kommo:", err instanceof Error ? err.message : err)
      }
    }

    // Fallback: se o Kommo falhou, tenta o Google Sheets (quando configurado)
    // para não perder o lead. Falha no fallback também não derruba a proposta.
    let sheets_fallback = false
    if (!kommoOk && sheetsConfigurado()) {
      try {
        sheets_fallback = await enviarLeadGoogleSheets(payload)
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[/api/proposta] sheets:", err instanceof Error ? err.message : err)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      lead_id,
      persisted: !erroInsert,
      sheets_fallback,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
