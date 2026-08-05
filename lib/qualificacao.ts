import cidades from "./ibge-cidades.json"
import {
  CONFIG,
  HE_IDADE_MAIS_PRAZO_MAXIMO_ANOS,
  idadeMaximaVeiculo,
  idadeMaximaVeiculoFinanciamento,
  limiteCreditoConstrucao,
  ltvParaTipoImovel,
  ltvParaTipoImovelFI,
  prazoMaximoHomeEquity,
  regraConstrucao,
  tomadorPermitidoConstrucao,
} from "./config"
import type {
  CategoriaTerrenoConstrucao,
  CategoriaVeiculo,
  TipoImovel,
  TipoPessoa,
} from "@/types"

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
  /** Prazo pretendido (meses). Quando informado, valida a trava idade × prazo. */
  prazo_meses?: number
}): ResultadoQualificacao {
  const { homeEquity: cfg } = CONFIG
  const motivos: string[] = []

  // Só há piso de valor do imóvel: o teto de R$ 5.000.000 foi removido (2026-08).
  // Imóveis acima disso são aceitos — quem limita a operação é o LTV da tipologia.
  if (params.valor_imovel < cfg.valorImovelMinimo) {
    motivos.push(`Valor do imóvel abaixo do mínimo de ${cfg.valorImovelMinimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`)
  }

  // Trava de população removida no Home Equity: imóveis em cidades de qualquer
  // porte são aceitos, desde que atendam aos demais critérios de garantia.
  // (Financiamento Imobiliário e Construção mantêm o filtro geográfico.)

  if (params.tipo_imovel === ("rural" as TipoImovel)) {
    motivos.push("Imóvel rural não aceito nesta modalidade")
  }

  if (params.situacao === "financiado" && params.saldo_devedor !== undefined) {
    if (params.saldo_devedor > params.valor_imovel * cfg.saldoDevedorMaximoPercentual) {
      motivos.push("Saldo devedor superior a 50% do valor do imóvel")
    }
  }

  const ltv = ltvParaTipoImovel(params.tipo_imovel)
  const ltvMaximo = params.valor_imovel * ltv
  if (params.valor_solicitado > ltvMaximo) {
    motivos.push(`Valor solicitado superior a ${Math.round(ltv * 100)}% do valor do imóvel`)
  }

  // Trava de seguro habitacional: idade + prazo (anos) ≤ 80. Substitui o teto
  // fixo de idade — um tomador acima de 60 anos continua elegível, mas o prazo
  // máximo cai para (80 − idade) × 12 meses (ex.: 61 anos → 228 meses).
  const idade = calcularIdade(params.data_nascimento)
  if (idade < cfg.idadeMinima) {
    motivos.push(`Idade mínima de ${cfg.idadeMinima} anos não atingida`)
  } else {
    const prazoMax = prazoMaximoHomeEquity(idade)
    if (prazoMax <= 0) {
      motivos.push(
        `Idade acima do limite: idade + prazo deve ser ≤ ${HE_IDADE_MAIS_PRAZO_MAXIMO_ANOS} anos`
      )
    } else if (params.prazo_meses !== undefined && params.prazo_meses > prazoMax) {
      motivos.push(
        `Prazo acima do máximo para a idade (${prazoMax} meses): idade + prazo deve ser ≤ ${HE_IDADE_MAIS_PRAZO_MAXIMO_ANOS} anos`
      )
    }
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
  /** Tomador — muda o LTV máximo (PJ é mais restritivo). Ausente assume PF. */
  tipo_pessoa?: TipoPessoa | ""
}): ResultadoQualificacao {
  const { financiamentoImobiliario: cfg } = CONFIG
  const motivos: string[] = []

  // Só há piso de valor do imóvel: o teto de R$ 5.000.000 foi removido (2026-08).
  if (params.valor_imovel < cfg.valorImovelMinimo) {
    motivos.push(`Valor do imóvel abaixo do mínimo de ${cfg.valorImovelMinimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`)
  }

  if (!isCidadeQualificada(params.cidade, params.uf)) {
    motivos.push("Cidade não atendida (município com menos de 50.000 habitantes)")
  }

  if (params.tipo_imovel === ("rural" as TipoImovel)) {
    motivos.push("Imóvel rural não aceito nesta modalidade")
  }

  // LTV por tipologia E por tomador: PF casa/apto 80%, comercial 70%, terreno 60%;
  // PJ casa/apto/comercial 70%, terreno 60%.
  const tipoPessoa = params.tipo_pessoa || "PF"
  const ltv = ltvParaTipoImovelFI(params.tipo_imovel, tipoPessoa)
  const ltvMaximo = params.valor_imovel * ltv
  if (params.valor_solicitado > ltvMaximo) {
    motivos.push(
      `Valor solicitado superior a ${Math.round(ltv * 100)}% do valor do imóvel (${tipoPessoa})`
    )
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
  vgv: number
  valor_solicitado: number
  cidade: string
  uf: string
  data_nascimento: string
  /** Categoria do terreno — define público, teto, taxa e prazo. Default: condomínio. */
  categoria_terreno?: CategoriaTerrenoConstrucao | ""
  /** Tomador. Dentro de condomínio só Pessoa Física é aceita. */
  tipo_pessoa?: TipoPessoa | ""
  /** Prazo pretendido (meses). Quando informado, valida o teto da categoria. */
  prazo_meses?: number
}): ResultadoQualificacao {
  const { creditoConstrucao: cfg } = CONFIG
  const motivos: string[] = []

  const categoria = params.categoria_terreno || cfg.categoriaDefault
  const regra = regraConstrucao(categoria)
  const tipoPessoa = params.tipo_pessoa || "PF"

  // Público por categoria: condomínio é exclusivo de Pessoa Física.
  if (!tomadorPermitidoConstrucao(categoria, tipoPessoa)) {
    motivos.push(
      `${regra.rotulo}: modalidade disponível apenas para ${regra.tomadores.join(" e ")}`
    )
  }

  // Piso da base de cálculo da categoria: custo da obra (condomínio) ou VGV.
  if (regra.base === "obra") {
    if (params.valor_obra < cfg.valorObraMinimo) {
      motivos.push(`Valor da obra abaixo do mínimo de ${cfg.valorObraMinimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`)
    }
  } else if (params.vgv < cfg.vgvMinimo) {
    motivos.push(`VGV abaixo do mínimo de ${cfg.vgvMinimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`)
  }

  if (!isCidadeQualificada(params.cidade, params.uf)) {
    motivos.push("Cidade não atendida (município com menos de 50.000 habitantes)")
  }

  // Teto de crédito da categoria: 80% da obra (condomínio) ou 50% do VGV.
  const limite = limiteCreditoConstrucao(categoria, {
    valorObra: params.valor_obra,
    vgv: params.vgv,
  })
  if (params.valor_solicitado > limite) {
    motivos.push(
      regra.base === "obra"
        ? `Valor solicitado superior a ${Math.round(regra.ltv * 100)}% do custo da obra`
        : `Valor solicitado superior a ${Math.round(regra.ltv * 100)}% do VGV`
    )
  }

  // Prazo máximo da categoria: 360 meses em condomínio, 240 fora.
  if (params.prazo_meses !== undefined && params.prazo_meses > regra.prazoMaximo) {
    motivos.push(
      `Prazo superior ao máximo de ${regra.prazoMaximo} meses para ${regra.rotulo.toLowerCase()}`
    )
  }

  const idade = calcularIdade(params.data_nascimento)
  if (idade < cfg.idadeMinima || idade > cfg.idadeMaxima) {
    motivos.push(`Idade fora da faixa permitida (${cfg.idadeMinima}–${cfg.idadeMaxima} anos)`)
  }

  return { qualificado: motivos.length === 0, motivos }
}

/** Mensagem única de bem recusado no Financiamento de Veículo. */
export const BEM_NAO_ELEGIVEL_FINANCIAMENTO = "Bem não elegível para esta modalidade"

/**
 * Elegibilidade do BEM no Financiamento de Veículo, avaliada já no Step 1:
 * veículo PESADO só é aceito com até 5 anos de fabricação. Veículo leve não
 * tem trava de idade nesta modalidade.
 */
export function qualificarVeiculoFinanciamento(params: {
  ano_veiculo: number
  categoria_veiculo?: CategoriaVeiculo | string
  anoReferencia?: number
}): ResultadoQualificacao {
  const motivos: string[] = []
  const categoria: CategoriaVeiculo = params.categoria_veiculo === "pesado" ? "pesado" : "leve"

  if (categoria === "pesado") {
    const anoAtual = params.anoReferencia ?? new Date().getFullYear()
    const idadeMaxima = idadeMaximaVeiculoFinanciamento(categoria)
    if (!params.ano_veiculo || params.ano_veiculo <= 0) {
      motivos.push(`${BEM_NAO_ELEGIVEL_FINANCIAMENTO}: ano de fabricação não identificado`)
    } else if (anoAtual - params.ano_veiculo > idadeMaxima) {
      motivos.push(
        `${BEM_NAO_ELEGIVEL_FINANCIAMENTO}: veículo pesado com mais de ${idadeMaxima} anos de fabricação`
      )
    }
  }

  return { qualificado: motivos.length === 0, motivos }
}

export function qualificarFinanciamentoVeiculo(params: {
  valor_veiculo: number
  valor_solicitado: number
  prazo_meses: number
  /** Leve ou pesado — pesado tem trava de idade. Ausente assume `leve`. */
  categoria_veiculo?: CategoriaVeiculo | string
  /** Ano de fabricação — usado na trava de idade do veículo pesado. */
  ano_veiculo?: number
}): ResultadoQualificacao {
  const { financiamentoVeiculo: cfg } = CONFIG
  const motivos: string[] = []

  if (params.valor_veiculo <= 0 || params.valor_solicitado <= 0) {
    motivos.push("Valores do veículo e do financiamento devem ser maiores que zero")
  }

  // Trava de LTV: o valor a financiar não pode passar de 80% do bem.
  if (params.valor_solicitado > params.valor_veiculo * cfg.ltv) {
    motivos.push(`Valor solicitado superior a ${Math.round(cfg.ltv * 100)}% do valor do veículo`)
  }

  if (params.prazo_meses > cfg.prazoMaximo) {
    motivos.push(`Prazo superior ao máximo de ${cfg.prazoMaximo} meses`)
  }

  // Elegibilidade do bem (idade do veículo pesado).
  if (params.ano_veiculo !== undefined) {
    motivos.push(
      ...qualificarVeiculoFinanciamento({
        ano_veiculo: params.ano_veiculo,
        categoria_veiculo: params.categoria_veiculo,
      }).motivos
    )
  }

  return { qualificado: motivos.length === 0, motivos }
}

/**
 * Elegibilidade do BEM, avaliada já no primeiro passo do funil (valor FIPE
 * mínimo e idade máxima da categoria). Veículo inelegível encerra a jornada
 * ali: a MoneyGo não trabalha esses leads, nem para contato posterior.
 */
export function qualificarVeiculoAutoEquity(params: {
  valor_veiculo: number
  ano_veiculo: number
  /** Categoria do veículo — define a idade máxima (leve 20 anos / pesado 15 anos).
   *  Ausente ou inválida cai no padrão do funil: `leve`. */
  categoria_veiculo?: CategoriaVeiculo | string
}): ResultadoQualificacao {
  const { autoEquity: cfg } = CONFIG
  const motivos: string[] = []
  const anoAtual = new Date().getFullYear()
  const categoria: CategoriaVeiculo = params.categoria_veiculo === "pesado" ? "pesado" : "leve"

  if (params.valor_veiculo < cfg.valorVeiculoMinimo) {
    motivos.push(`Valor do veículo abaixo do mínimo de ${cfg.valorVeiculoMinimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`)
  }

  // Idade máxima por categoria: leve 20 anos, pesado 15 anos. Sem o ano de
  // fabricação não há como aplicar a trava — o veículo também não passa.
  const idadeMaxima = idadeMaximaVeiculo(categoria)
  if (!params.ano_veiculo || params.ano_veiculo <= 0) {
    motivos.push("Ano de fabricação do veículo não identificado")
  } else if (params.ano_veiculo < anoAtual - idadeMaxima) {
    motivos.push(
      `Veículo ${categoria} com mais de ${idadeMaxima} anos não aceito`
    )
  }

  return { qualificado: motivos.length === 0, motivos }
}

export function qualificarAutoEquity(params: {
  valor_veiculo: number
  ano_veiculo: number
  valor_solicitado: number
  situacao?: "quitado" | "financiado" | string
  /** Categoria do veículo — define a idade máxima (leve 20 anos / pesado 15 anos).
   *  Ausente ou inválida cai no padrão do funil: `leve`. */
  categoria_veiculo?: CategoriaVeiculo | string
}): ResultadoQualificacao {
  const { autoEquity: cfg } = CONFIG
  const motivos: string[] = []

  if (params.situacao === "financiado") {
    motivos.push("Veículo financiado não aceito — apenas veículos quitados")
  }

  // Valor mínimo e idade máxima: mesma trava aplicada no Step 1 do funil.
  motivos.push(...qualificarVeiculoAutoEquity(params).motivos)

  const ltvMaximo = params.valor_veiculo * cfg.ltv
  if (params.valor_solicitado > ltvMaximo) {
    motivos.push(`Valor solicitado superior a ${Math.round(cfg.ltv * 100)}% do valor do veículo`)
  }

  return { qualificado: motivos.length === 0, motivos }
}
