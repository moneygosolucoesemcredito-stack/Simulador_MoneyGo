import { CONFIG } from "./config"
import type { LeadPayload, Produto } from "@/types"

const BASE_URL = `https://${CONFIG.kommo.subdomain}.kommo.com/api/v4`

async function fetchKommo<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONFIG.kommo.token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Kommo API error ${response.status}: ${body}`)
  }

  return response.json() as Promise<T>
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}

const STAGE_BY_PRODUTO: Record<Produto, number> = {
  home_equity: CONFIG.kommo.homeEquityStageId,
  auto_equity: CONFIG.kommo.autoEquityStageId,
  financiamento_imobiliario: CONFIG.kommo.financiamentoImobiliarioStageId,
  credito_construcao: CONFIG.kommo.creditoConstrucaoStageId,
  financiamento_veiculo: CONFIG.kommo.financiamentoVeiculoStageId,
}

function buildKommoPayload(payload: LeadPayload) {
  const { produto, simulacao, contato, tracking, qualificado } = payload

  const stageId = STAGE_BY_PRODUTO[produto]

  const tags = [
    produto,
    qualificado ? "qualificado" : "nao_qualificado",
    "meta_ads",
    ...(tracking.utm_campaign ? [tracking.utm_campaign] : []),
  ]

  const customFields = buildCustomFields(simulacao, tracking)

  return [
    {
      name: contato.nome,
      pipeline_id: CONFIG.kommo.pipelineId,
      status_id: stageId,
      tags: tags.map((tag) => ({ name: tag })),
      custom_fields_values: customFields,
      _embedded: {
        contacts: [
          {
            name: contato.nome,
            custom_fields_values: [
              {
                field_code: "PHONE",
                values: [{ value: contato.telefone, enum_code: "WORK" }],
              },
              {
                field_code: "EMAIL",
                values: [{ value: contato.email, enum_code: "WORK" }],
              },
            ],
          },
        ],
      },
    },
  ]
}

function buildCustomFields(
  simulacao: LeadPayload["simulacao"],
  tracking: LeadPayload["tracking"]
) {
  const fields: { field_code?: string; field_id?: number; values: { value: string | number }[] }[] = []

  const addField = (code: string, value: string | number | undefined) => {
    if (value === undefined || value === "") return
    fields.push({ field_code: code, values: [{ value }] })
  }

  if ("valor_imovel" in simulacao) {
    addField("CF_VALOR_IMOVEL", simulacao.valor_imovel)
    addField("CF_TIPO_IMOVEL", simulacao.tipo_imovel)
    if ("situacao" in simulacao) addField("CF_SITUACAO_IMOVEL", (simulacao as { situacao: string }).situacao)
    if ("saldo_devedor" in simulacao && (simulacao as { saldo_devedor?: number }).saldo_devedor) {
      addField("CF_SALDO_DEVEDOR", (simulacao as { saldo_devedor: number }).saldo_devedor)
    }
  }

  if ("valor_terreno" in simulacao) {
    addField("CF_VALOR_TERRENO", (simulacao as { valor_terreno: number }).valor_terreno)
    addField("CF_VALOR_OBRA", (simulacao as { valor_obra: number }).valor_obra)
    addField("CF_NUMERO_TRANCHES", (simulacao as { numero_tranches: number }).numero_tranches)
  }

  if ("valor_veiculo" in simulacao) {
    addField("CF_MARCA_MODELO_ANO", simulacao.marca_modelo_ano)
    addField("CF_VALOR_VEICULO", simulacao.valor_veiculo)
  }

  if ("valor_entrada" in simulacao && simulacao.valor_entrada > 0) {
    addField("CF_VALOR_ENTRADA", simulacao.valor_entrada)
  }

  addField("CF_VALOR_SOLICITADO", simulacao.valor_solicitado)
  addField("CF_PRAZO_MESES", simulacao.prazo_meses)
  addField("CF_PARCELA_PRICE", simulacao.parcela_price)
  addField("CF_PRIMEIRA_PARCELA_SAC", simulacao.primeira_parcela_sac)
  addField("CF_TAXA_MENSAL", simulacao.taxa_mensal)

  addField("CF_UTM_SOURCE", tracking.utm_source)
  addField("CF_UTM_MEDIUM", tracking.utm_medium)
  addField("CF_UTM_CAMPAIGN", tracking.utm_campaign)
  addField("CF_UTM_CONTENT", tracking.utm_content)
  addField("CF_UTM_TERM", tracking.utm_term)
  addField("CF_FBCLID", tracking.fbclid)
  addField("CF_GCLID", tracking.gclid)

  return fields
}

export async function criarLeadKommo(payload: LeadPayload): Promise<number> {
  const body = buildKommoPayload(payload)

  const response = await withRetry(() =>
    fetchKommo<{ _embedded: { leads: { id: number }[] } }>(
      "/leads/complex",
      { method: "POST", body: JSON.stringify(body) }
    )
  )

  const leadId = response._embedded?.leads?.[0]?.id
  if (!leadId) throw new Error("Kommo did not return a lead ID")
  return leadId
}
