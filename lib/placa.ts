/**
 * Consulta de veículo por placa. A chamada à API paga (API Placas) acontece
 * no servidor (`/api/placa`) para não expor o token. Aqui ficam só a
 * validação/normalização da placa e o tipo de retorno normalizado.
 */
export interface VeiculoPlaca {
  marca: string
  modelo: string
  /** Texto pronto p/ exibir: "Marca Modelo Ano". */
  marca_modelo_ano: string
  ano: number
  combustivel: string
  /** Potência/cilindradas, quando disponível (pode vir vazio). */
  potencia: string
  /** Valor FIPE em reais (0 se a API não retornar). */
  valor_fipe: number
  codigo_fipe: string
}

/** Remove tudo que não é letra/número e deixa maiúsculo. */
export function normalizarPlaca(placa: string): string {
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

/** Aceita placa antiga (ABC1234) e Mercosul (ABC1D23). */
export function placaValida(placa: string): boolean {
  const p = normalizarPlaca(placa)
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p)
}

export type ConsultaPlacaResult =
  | { ok: true; veiculo: VeiculoPlaca }
  | { ok: false; error: string; naoConfigurado?: boolean }

/** Chama a rota server-side `/api/placa`. */
export async function consultarPlaca(placa: string): Promise<ConsultaPlacaResult> {
  const p = normalizarPlaca(placa)
  if (!placaValida(p)) return { ok: false, error: "Placa inválida" }
  try {
    const res = await fetch(`/api/placa?placa=${p}`)
    const json = await res.json()
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        error: json.error ?? "Não foi possível consultar a placa",
        naoConfigurado: res.status === 503,
      }
    }
    return { ok: true, veiculo: json.veiculo as VeiculoPlaca }
  } catch {
    return { ok: false, error: "Falha de conexão ao consultar a placa" }
  }
}
