import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"
import {
  formatarMoeda,
  formatarPercentual,
  formatarPercentualAnual,
  type ParcelaAmortizacao,
  type ResultadoSimulacao,
  type TabelasAmortizacao,
} from "./simulacao"
import { CONFIG, regraConstrucao } from "./config"
import { BRAND } from "./brand"
import type { CategoriaTerrenoConstrucao, TipoPessoa } from "@/types"

export interface DadosPdfCreditoConstrucao {
  categoria: CategoriaTerrenoConstrucao | ""
  tomador: TipoPessoa
  valorTerreno: number
  valorObra: number
  vgv: number
  valorCredito: number
  prazoMeses: number
  /** Momento em que a simulação foi gerada (default: agora) */
  dataSimulacao?: Date
  /** Tabelas completas; se ausentes, são geradas a partir de crédito/taxa/prazo. */
  tabelas?: TabelasAmortizacao
}

const DISCLAIMER =
  "Para fins de simulação apenas. Modalidade pós-fixada corrigida pelo indexador da modalidade. " +
  "O crédito é liberado em tranches conforme o avanço físico da obra, mais o Habite-se. " +
  "Taxas e valores sujeitos à aprovação de crédito, à análise do projeto e à avaliação da garantia."

const ACCENT: [number, number, number] = BRAND.pdfAccentRgb
const CINZA: [number, number, number] = [110, 110, 110]

/** Lê o `finalY` da última tabela desenhada (anexado pelo plugin em runtime). */
function finalY(doc: jsPDF): number | undefined {
  return (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
}

/** Carrega a logo da marca como data URL (com proporção) para o jsPDF. */
async function carregarLogo(src: string): Promise<{ dataUrl: string; ratio: number } | null> {
  try {
    const res = await fetch(src)
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = dataUrl
    })
    return { dataUrl, ratio: img.width / img.height }
  } catch {
    // Sem logo o PDF continua válido — segue apenas com o cabeçalho em texto.
    return null
  }
}

/**
 * Desenha a tabela de amortização completa de um sistema (todas as parcelas)
 * em uma nova página. O autoTable pagina sozinho e repete o cabeçalho.
 */
function desenharTabelaCompleta(
  doc: jsPDF,
  sistema: "SAC" | "PRICE",
  parcelas: ParcelaAmortizacao[],
  margem: number
) {
  if (parcelas.length === 0) return

  doc.addPage()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(0, 0, 0)
  doc.text(`Tabela de amortização — ${sistema}`, margem, 48)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...CINZA)
  doc.text(
    sistema === "SAC"
      ? `${parcelas.length} parcelas · amortização constante, parcela decrescente`
      : `${parcelas.length} parcelas · parcela fixa, amortização crescente`,
    margem,
    62
  )
  doc.setTextColor(0, 0, 0)

  // A coluna de seguros só aparece quando a operação de fato os cobra.
  const comSeguros = parcelas.some((p) => p.seguros > 0)

  autoTable(doc, {
    startY: 74,
    head: comSeguros
      ? [["Nº", "Juros", "Amortização", "Seguros", "Parcela", "Saldo devedor"]]
      : [["Nº", "Juros", "Amortização", "Parcela", "Saldo devedor"]],
    body: parcelas.map((p) => [
      String(p.numero),
      formatarMoeda(p.juros),
      formatarMoeda(p.amortizacao),
      ...(comSeguros ? [formatarMoeda(p.seguros)] : []),
      formatarMoeda(p.parcela),
      formatarMoeda(p.saldoDevedor),
    ]),
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: ACCENT, textColor: [20, 20, 20], fontStyle: "bold" },
    columnStyles: {
      0: { halign: "right", cellWidth: 32, textColor: CINZA },
      1: { halign: "right" },
      2: { halign: "right" },
      3: comSeguros
        ? { halign: "right", textColor: CINZA }
        : { halign: "right", fontStyle: "bold" },
      4: comSeguros ? { halign: "right", fontStyle: "bold" } : { halign: "right", textColor: CINZA },
      ...(comSeguros ? { 5: { halign: "right", textColor: CINZA } } : {}),
    },
    margin: { left: margem, right: margem, top: 40 },
  })
}

/**
 * Gera e baixa um PDF da simulação de Crédito de Construção: logo, resumo das
 * condições da categoria (teto, taxa, prazo, tranches), comparativo SAC × PRICE
 * e, em páginas próprias, as tabelas de amortização completas dos dois sistemas.
 */
export async function gerarPdfCreditoConstrucao(
  resultado: ResultadoSimulacao,
  dados: DadosPdfCreditoConstrucao
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const margem = 40
  let y = 48

  const regra = regraConstrucao(dados.categoria)
  const { numeroDeTranches } = CONFIG.creditoConstrucao
  const valorPorTranche = Math.floor(dados.valorCredito / numeroDeTranches)

  // A taxa é apresentada na periodicidade em que o produto a publica.
  const taxaPublicada =
    regra.periodicidadeTaxa === "anual"
      ? `${formatarPercentualAnual(regra.taxa)} + ${regra.indexador}`
      : `${formatarPercentual(regra.taxa)} + ${regra.indexador}`
  const taxaEquivalente =
    regra.periodicidadeTaxa === "anual"
      ? `${formatarPercentual(resultado.taxa_mensal)} (equivalente ao mês)`
      : `${formatarPercentualAnual(Math.pow(1 + resultado.taxa_mensal, 12) - 1)} (equivalente ao ano)`

  const logo = await carregarLogo(BRAND.logos.full)
  if (logo) {
    const alturaLogo = 30
    doc.addImage(logo.dataUrl, "PNG", margem, y - 24, alturaLogo * logo.ratio, alturaLogo)
    y += 34
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(`${BRAND.name} — Simulação Crédito de Construção`, margem, y)

  y += 18
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...CINZA)
  doc.text(`${regra.rotulo} · ${regra.descricao}`, margem, y)
  doc.setTextColor(0, 0, 0)

  // Resumo da operação — inclui a base do teto conforme a categoria.
  autoTable(doc, {
    startY: y + 16,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    body: [
      ["Data da simulação", (dados.dataSimulacao ?? new Date()).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })],
      ["Categoria do terreno", regra.rotulo],
      ["Tomador", dados.tomador === "PF" ? "Pessoa Física" : "Pessoa Jurídica"],
      ["Valor do terreno", formatarMoeda(dados.valorTerreno)],
      regra.base === "obra"
        ? ["Custo da obra", formatarMoeda(dados.valorObra)]
        : ["VGV estimado", formatarMoeda(dados.vgv)],
      [
        "Teto de crédito",
        `${Math.round(regra.ltv * 100)}% ${regra.base === "obra" ? "do custo da obra" : "do VGV"}`,
      ],
      ["Crédito solicitado", formatarMoeda(dados.valorCredito)],
      ["Custos de contratação", formatarMoeda(resultado.cac_total)],
      ["Valor financiado", formatarMoeda(resultado.principal_financiado)],
      ["Prazo", `${dados.prazoMeses} meses (${dados.prazoMeses / 12} anos)`],
      ["Taxa de juros", taxaPublicada],
      ["Taxa equivalente", taxaEquivalente],
      ["Liberação", `${numeroDeTranches} tranches de ~${formatarMoeda(valorPorTranche)} + Habite-se`],
    ],
    columnStyles: {
      0: { textColor: CINZA, cellWidth: 150 },
      1: { fontStyle: "bold" },
    },
  })

  const apos = finalY(doc) ?? y + 60

  // Comparativo SAC × PRICE
  autoTable(doc, {
    startY: apos + 18,
    head: [["Condição", "SAC", "PRICE"]],
    body: [
      ["Primeira parcela aprox.", formatarMoeda(resultado.primeira_parcela_sac), formatarMoeda(resultado.primeira_parcela_price)],
      ["Última parcela aprox.", formatarMoeda(resultado.ultima_parcela_sac), formatarMoeda(resultado.ultima_parcela_price)],
      ["Total pago", formatarMoeda(resultado.valor_total_sac), formatarMoeda(resultado.valor_total_price)],
      ["Custo efetivo total", formatarPercentualAnual(resultado.cet_anual_sac), formatarPercentualAnual(resultado.cet_anual_price)],
      ["Quantidade de parcelas", `${dados.prazoMeses}`, `${dados.prazoMeses}`],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: ACCENT, textColor: [20, 20, 20], fontStyle: "bold" },
    columnStyles: {
      0: { textColor: CINZA },
      1: { halign: "right", fontStyle: "bold" },
      2: { halign: "right", fontStyle: "bold" },
    },
  })

  const aposComparativo = finalY(doc) ?? apos + 120

  // Tabelas de amortização completas (parcela a parcela), uma por página.
  const tabelas = dados.tabelas ?? resultado.tabelas

  desenharTabelaCompleta(doc, "SAC", tabelas.sac, margem)
  desenharTabelaCompleta(doc, "PRICE", tabelas.price, margem)

  const fim = finalY(doc) ?? aposComparativo + 120
  doc.setFontSize(8)
  doc.setTextColor(...CINZA)
  const largura = doc.internal.pageSize.getWidth() - margem * 2
  doc.text(doc.splitTextToSize(DISCLAIMER, largura), margem, fim + 24)

  const data = new Date().toISOString().slice(0, 10)
  doc.save(`${BRAND.id}-credito-construcao-${data}.pdf`)
}
