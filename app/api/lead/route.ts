import { NextRequest, NextResponse } from "next/server"
import { criarLeadKommo } from "@/lib/kommo"
import type { LeadPayload } from "@/types"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const payload: LeadPayload = await req.json()

    if (!payload.produto || !payload.contato || !payload.simulacao) {
      return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 })
    }

    if (!payload.consentimento_lgpd) {
      return NextResponse.json({ ok: false, error: "Consentimento LGPD não fornecido" }, { status: 422 })
    }

    const lead_id = await criarLeadKommo(payload)

    return NextResponse.json({ ok: true, lead_id })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno"
    // Avoid logging sensitive fields in production
    if (process.env.NODE_ENV !== "production") {
      console.error("[/api/lead] error:", message)
    } else {
      console.error("[/api/lead] error sending lead to Kommo")
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
