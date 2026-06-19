import { NextRequest, NextResponse } from "next/server"
import { criarSupabaseServer } from "@/lib/supabase/server"
import { criarLeadKommo } from "@/lib/kommo"
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

    // A origem é derivada da sessão (não confiamos no cliente): se há operador
    // logado, a proposta é dele; senão é uma proposta do próprio cliente.
    const supabase = await criarSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: erroInsert } = await supabase.from("propostas").insert({
      produto: payload.produto,
      origem: user ? "operador" : "cliente",
      operador_id: user?.id ?? null,
      taxa_mensal: payload.simulacao.taxa_mensal ?? null,
      simulacao: payload.simulacao,
      contato: payload.contato,
    })

    if (erroInsert && process.env.NODE_ENV !== "production") {
      console.error("[/api/proposta] supabase insert:", erroInsert.message)
    }

    // Envia ao CRM em paralelo ao registro; falha no Kommo não derruba a proposta.
    let lead_id: number | string | null = null
    try {
      lead_id = await criarLeadKommo(payload)
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[/api/proposta] kommo:", err instanceof Error ? err.message : err)
      }
    }

    return NextResponse.json({ ok: true, lead_id, persisted: !erroInsert })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
