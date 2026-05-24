import cidades from "./ibge-cidades.json"
import { CONFIG } from "./config"
import type { TipoImovel } from "@/types"

const cidadesSet = new Set(
  (cidades as { n: string; u: string }[]).map(
    (c) => `${normalizar(c.n)}_${c.u.toLowerCase()}`
  )
)

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
}

export function isCidadeQualificada(cidade: string, uf: string): boolean {
  const key = `${normalizar(cidade)}_${uf.toLowerCase()}`
  return cidadesSet.has(key)
}

export function calcularIdade(dataNascimento: string): number {
  const [ano, mes, dia] = dataNascimento.split("-").map(Number)
  const hoje = new Date()
  let idade = hoje.getFullYear() - ano
  if (
    hoje.getMonth() + 1 < mes ||
    (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)
  ) {
    idade--
  }
  return idade
}

export interface ResultadoQualificacao {
  qualificado: boolean
  motivos: string[]
}

export function qualificarHomeEquity(params: {
  valor_imovel: number
  tipo_imovel: TipoImovel
  situacao: "quitado" | "financiado"
  saldo_devedor?: number
  valor_solicitado: number
  cidade: string
  uf: string
  data_nascimento: string
}): ResultadoQualificacao {
  const { homeEquity: cfg } = CONFIG
  const motivos: string[] = []

  if (params.valor_imovel < cfg.valorImovelMinimo) {
    motivos.push(`Valor do imóvel abaixo do mínimo de ${cfg.valorImovelMinimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`)
  }

  if (!isCidadeQualificada(params.cidade, params.uf)) {
    motivos.push("Cidade não atendida (município com menos de 50.000 habitantes)")
  }

  if (params.tipo_imovel === ("rural" as TipoImovel)) {
    motivos.push("Imóvel rural não aceito nesta modalidade")
  }

  if (params.situacao === "financiado" && params.saldo_devedor !== undefined) {
    if (params.saldo_devedor > params.valor_imovel * cfg.saldoDevedorMaximoPercentual) {
      motivos.push("Saldo devedor superior a 50% do valor do imóvel")
    }
  }

  const ltvMaximo = params.valor_imovel * cfg.ltv
  if (params.valor_solicitado > ltvMaximo) {
    motivos.push("Valor solicitado superior a 55% do valor do imóvel")
  }

  const idade = calcularIdade(params.data_nascimento)
  if (idade < cfg.idadeMinima || idade > cfg.idadeMaxima) {
    motivos.push(`Idade fora da faixa permitida (${cfg.idadeMinima}–${cfg.idadeMaxima} anos)`)
  }

  return { qualificado: motivos.length === 0, motivos }
}

export function qualificarFinanciamentoImobiliario(params: {
  valor_imovel: number
  tipo_imovel: TipoImovel
  valor_solicitado: number
  cidade: string
  uf: string
  data_nascimento: string
}): ResultadoQualificacao {
  const { financiamentoImobiliario: cfg } = CONFIG
  const motivos: string[] = []

  if (params.valor_imovel < cfg.valorImovelMinimo) {
    motivos.push(`Valor do imóvel abaixo do mínimo de ${cfg.valorImovelMinimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`)
  }

  if (!isCidadeQualificada(params.cidade, params.uf)) {
    motivos.push("Cidade não atendida (município com menos de 50.000 habitantes)")
  }

  if (params.tipo_imovel === ("rural" as TipoImovel)) {
    motivos.push("Imóvel rural não aceito nesta modalidade")
  }

  const ltvMaximo = params.valor_imovel * cfg.ltv
  if (params.valor_solicitado > ltvMaximo) {
    motivos.push("Valor solicitado superior a 55% do valor do imóvel")
  }

  const idade = calcularIdade(params.data_nascimento)
  if (idade < cfg.idadeMinima || idade > cfg.idadeMaxima) {
    motivos.push(`Idade fora da faixa permitida (${cfg.idadeMinima}–${cfg.idadeMaxima} anos)`)
  }

  return { qualificado: motivos.length === 0, motivos }
}

export function qualificarCreditoConstrucao(params: {
  valor_terreno: number
  valor_obra: number
  valor_solicitado: number
  cidade: string
  uf: string
  data_nascimento: string
}): ResultadoQualificacao {
  const { creditoConstrucao: cfg } = CONFIG
  const motivos: string[] = []

  if (params.valor_obra < cfg.valorObraMinimo) {
    motivos.push(`Valor da obra abaixo do mínimo de ${cfg.valorObraMinimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`)
  }

  if (!isCidadeQualificada(params.cidade, params.uf)) {
    motivos.push("Cidade não atendida (município com menos de 50.000 habitantes)")
  }

  const garantia = params.valor_terreno + params.valor_obra
  const ltvMaximo = garantia * cfg.ltv
  if (params.valor_solicitado > ltvMaximo) {
    motivos.push("Valor solicitado superior a 55% do valor total (terreno + obra)")
  }

  const idade = calcularIdade(params.data_nascimento)
  if (idade < cfg.idadeMinima || idade > cfg.idadeMaxima) {
    motivos.push(`Idade fora da faixa permitida (${cfg.idadeMinima}–${cfg.idadeMaxima} anos)`)
  }

  return { qualificado: motivos.length === 0, motivos }
}

export function qualificarAutoEquity(params: {
  valor_veiculo: number
  ano_veiculo: number
  valor_solicitado: number
}): ResultadoQualificacao {
  const { autoEquity: cfg } = CONFIG
  const motivos: string[] = []
  const anoAtual = new Date().getFullYear()

  if (params.valor_veiculo < cfg.valorVeiculoMinimo) {
    motivos.push(`Valor do veículo abaixo do mínimo de ${cfg.valorVeiculoMinimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`)
  }

  if (params.ano_veiculo < anoAtual - cfg.idadeVeiculoMaxima) {
    motivos.push(`Veículo com mais de ${cfg.idadeVeiculoMaxima} anos não aceito`)
  }

  const ltvMaximo = params.valor_veiculo * cfg.ltv
  if (params.valor_solicitado > ltvMaximo) {
    motivos.push("Valor solicitado superior a 50% do valor do veículo")
  }

  return { qualificado: motivos.length === 0, motivos }
}
