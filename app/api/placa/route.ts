import { NextRequest, NextResponse } from "next/server"
import { parseValorFipe } from "@/lib/fipe"
import { normalizarPlaca, placaValida, type VeiculoPlaca } from "@/lib/placa"

// Node runtime: a chamada à API externa usa o token secreto do servidor.
export const runtime = "nodejs"

/**
 * Consulta de veículo por placa via API Placas (apiplacas.com.br).
 * O token fica em APIPLACAS_TOKEN (NUNCA NEXT_PUBLIC). Sem token, a rota
 * responde 503 e a UI cai no preenchimento manual.
 *
 * ⚠️ O endpoint e o mapeamento de campos abaixo seguem o formato documentado
 * do provedor; ao ativar com o token real, confira contra uma resposta de
 * verdade e ajuste `normalizar()` se necessário (é o único ponto a tocar).
 */
export async function GET(req: NextRequest) {
  const token = process.env.APIPLACAS_TOKEN
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Consulta por placa ainda não configurada" },
      { status: 503 }
    )
  }

  const placa = normalizarPlaca(req.nextUrl.searchParams.get("placa") ?? "")
  if (!placaValida(placa)) {
    return NextResponse.json({ ok: false, error: "Placa inválida" }, { status: 400 })
  }

  try {
    // Endpoint do provedor (token na URL, conforme doc do API Placas).
    const res = await fetch(`https://wdapi2.com.br/consulta/${placa}/${token}`, {
      // os dados de um veículo não mudam; cache curto reduz custo por consulta
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "Veículo não encontrado para esta placa" },
        { status: 404 }
      )
    }

    const dados = await res.json()
    const veiculo = normalizar(dados)
    if (!veiculo) {
      return NextResponse.json(
        { ok: false, error: "Não foi possível interpretar os dados do veículo" },
        { status: 422 }
      )
    }
    return NextResponse.json({ ok: true, veiculo })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Falha ao consultar a placa" },
      { status: 502 }
    )
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Mapeia a resposta do API Placas para o formato normalizado do app. */
function normalizar(d: any): VeiculoPlaca | null {
  if (!d) return null
  const marca: string = d.MARCA ?? d.marca ?? ""
  const modelo: string = d.MODELO ?? d.modelo ?? ""
  const ano = Number(d.anoModelo ?? d.ano_modelo ?? d.ano ?? 0)
  const combustivel: string = d.combustivel ?? d.extra?.combustivel ?? ""
  const potencia: string = String(d.potencia ?? d.cilindradas ?? d.extra?.potencia ?? "")

  // FIPE pode vir como objeto único, lista, ou em `fipe.dados[]`.
  const fipe = d.fipe?.dados?.[0] ?? d.fipe ?? d.FIPE ?? null
  const valor_fipe = fipe
    ? parseValorFipe(String(fipe.texto_valor ?? fipe.valor ?? fipe.Valor ?? "0"))
    : 0
  const codigo_fipe: string = fipe?.codigo_fipe ?? fipe?.CodigoFipe ?? d.codigo_fipe ?? ""

  if (!marca && !modelo) return null

  return {
    marca,
    modelo,
    marca_modelo_ano: [marca, modelo, ano || ""].filter(Boolean).join(" ").trim(),
    ano: ano || 0,
    combustivel,
    potencia,
    valor_fipe,
    codigo_fipe,
  }
}
