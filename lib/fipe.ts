/**
 * Consulta à Tabela FIPE pela API pública e gratuita da parallelum, usada no
 * caminho "Continuar sem placa" do funil de Auto Equity.
 * Fluxo em cascata: marca → modelo → ano → preço.
 *
 * A tabela é escolhida pela categoria do veículo: `carros` para leves (carro,
 * SUV, picape) e `caminhoes` para pesados (caminhão, cavalo mecânico, ônibus).
 *
 * Sem chave de API. Se a API estiver indisponível, as funções retornam
 * vazio/null e a UI trata o fallback.
 */
import type { CategoriaVeiculo } from "@/types"

const API = "https://parallelum.com.br/fipe/api/v1"

/** Tabelas FIPE usadas pelo Auto Equity. */
export type TabelaFipe = "carros" | "caminhoes"

/** leve → tabela de carros; pesado → tabela de caminhões. */
export function tabelaFipeDaCategoria(categoria: CategoriaVeiculo = "leve"): TabelaFipe {
  return categoria === "pesado" ? "caminhoes" : "carros"
}

function base(tabela: TabelaFipe = "carros"): string {
  return `${API}/${tabela}`
}

export interface FipeItem {
  codigo: string
  nome: string
}

export interface FipePreco {
  valor: number
  combustivel: string
  anoModelo: number
  codigoFipe: string
  marca: string
  modelo: string
}

/** "R$ 50.000,00" → 50000 */
export function parseValorFipe(valor: string): number {
  const limpo = valor.replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", ".")
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function listarMarcas(tabela: TabelaFipe = "carros"): Promise<FipeItem[]> {
  return (await getJson<FipeItem[]>(`${base(tabela)}/marcas`)) ?? []
}

export async function listarModelos(
  codigoMarca: string,
  tabela: TabelaFipe = "carros"
): Promise<FipeItem[]> {
  const data = await getJson<{ modelos: FipeItem[] }>(
    `${base(tabela)}/marcas/${codigoMarca}/modelos`
  )
  return data?.modelos ?? []
}

export async function listarAnos(
  codigoMarca: string,
  codigoModelo: string,
  tabela: TabelaFipe = "carros"
): Promise<FipeItem[]> {
  return (
    (await getJson<FipeItem[]>(
      `${base(tabela)}/marcas/${codigoMarca}/modelos/${codigoModelo}/anos`
    )) ?? []
  )
}

export async function consultarPreco(
  codigoMarca: string,
  codigoModelo: string,
  codigoAno: string,
  tabela: TabelaFipe = "carros"
): Promise<FipePreco | null> {
  const data = await getJson<{
    Valor: string
    Marca: string
    Modelo: string
    AnoModelo: number
    Combustivel: string
    CodigoFipe: string
  }>(`${base(tabela)}/marcas/${codigoMarca}/modelos/${codigoModelo}/anos/${codigoAno}`)
  if (!data) return null
  return {
    valor: parseValorFipe(data.Valor),
    combustivel: data.Combustivel,
    anoModelo: data.AnoModelo,
    codigoFipe: data.CodigoFipe,
    marca: data.Marca,
    modelo: data.Modelo,
  }
}
