import type { ViaCEPResponse } from "@/types"

export async function buscarCEP(cep: string): Promise<ViaCEPResponse | null> {
  const cleaned = cep.replace(/\D/g, "")
  if (cleaned.length !== 8) return null

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
    if (!res.ok) return null
    const data: ViaCEPResponse = await res.json()
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}
