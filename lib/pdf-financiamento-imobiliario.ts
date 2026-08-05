import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"
import {
  formatarMoeda,
  formatarPercentual,
  gerarTabelasAmortizacao,
  rendaNecessaria,
  type ParcelaAmortizacao,
  type ResultadoSimulacao,
  type TabelasAmortizacao,
} from "./simulacao"
import { BRAND } from "./brand"

export interface DadosPdfFinanciamentoImobiliario {
  valorImovel: number
  valorCredito: number
  prazoMeses: number
  tomador: "PF" | "PJ"
  /** Momento em que a simulação foi gerada (default: agora) */
  dataSimulacao?: Date
  /**
   * Tabelas de amortização completas. Quando omitidas, são geradas aqui a
   * partir de crédito, taxa e prazo — a tela já as calcula e repassa.
   */
  tabelas?: TabelasAmortizacao
  /** Política de comprometimento de renda (default 30%). */
  comprometimentoRenda?: number
}

const DISCLAIMER =
  "Para fins de simulação apenas. Modalidade pós-fixada com correção pelo IPCA. " +
  "Taxas e valores sujeitos à aprovação de crédito e às demais condições do produto " +
  "vigentes no momento da contratação. IOF isento para pessoa física."

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

  autoTable(doc, {
    startY: 74,
    head: [["Nº", "Juros", "Amortização", "Parcela", "Saldo devedor"]],
    body: parcelas.map((p) => [
      String(p.numero),
      formatarMoeda(p.juros),
      formatarMoeda(p.amortizacao),
      formatarMoeda(p.parcela),
      formatarMoeda(p.saldoDevedor),
    ]),
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: ACCENT, textColor: [20, 20, 20], fontStyle: "bold" },
    columnStyles: {
      0: { halign: "right", cellWidth: 32, textColor: CINZA },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
      4: { halign: "right", textColor: CINZA },
    },
    margin: { left: margem, right: margem, top: 40 },
  })
}

/**
 * Gera e baixa um PDF da simulação de Financiamento Imobiliário espelhando a
 * tela de resultado: logo, cabeçalho com os dados da operação, comparativo
 * SAC × PRICE (incluindo a renda necessária) e, em páginas próprias, as
 * tabelas de amortização completas de ambos os sistemas.
 */
export async function gerarPdfFinanciamentoImobiliario(
  resultado: ResultadoSimulacao,
  dados: DadosPdfFinanciamentoImobiliario
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const margem = 40
  let y = 48

  // Logo da marca no topo
  const logo = await carregarLogo(BRAND.logos.full)
  if (logo) {
    const alturaLogo = 30
    doc.addImage(logo.dataUrl, "PNG", margem, y - 24, alturaLogo * logo.ratio, alturaLogo)
    y += 34
  }

  // Cabeçalho
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(`${BRAND.name} — Simulação Financiamento Imobiliário`, margem, y)

  y += 18
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...CINZA)
  doc.text("Financiamento com garantia de imóvel · pós-fixado + IPCA", margem, y)
  doc.setTextColor(0, 0, 0)

  // Resumo da operação
  autoTable(doc, {
    startY: y + 16,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    body: [
      ["Data da simulação", (dados.dataSimulacao ?? new Date()).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })],
      ["Valor do imóvel", formatarMoeda(dados.valorImovel)],
      ["Valor financiado", formatarMoeda(dados.valorCredito)],
      ["Prazo", `${dados.prazoMeses} meses (${dados.prazoMeses / 12} anos)`],
      ["Tomador", dados.tomador === "PF" ? "Pessoa Física" : "Pessoa Jurídica"],
      ["Taxa de juros (mensal)", `${formatarPercentual(resultado.taxa_mensal)} + IPCA`],
    ],
    columnStyles: {
      0: { textColor: CINZA, cellWidth: 150 },
      1: { fontStyle: "bold" },
    },
  })

  const apos = finalY(doc) ?? y + 60

  // Renda necessária = maior parcela do sistema / comprometimento (30%).
  const comprometimento = dados.comprometimentoRenda ?? 0.3
  const rendaSac = rendaNecessaria(resultado.primeira_parcela_sac, comprometimento)
  const rendaPrice = rendaNecessaria(resultado.parcela_price, comprometimento)

  // Comparativo SAC × PRICE
  autoTable(doc, {
    startY: apos + 18,
    head: [["Condição", "SAC", "PRICE"]],
    body: [
      ["Primeira parcela aprox.", formatarMoeda(resultado.primeira_parcela_sac), formatarMoeda(resultado.parcela_price)],
      ["Última parcela aprox.", formatarMoeda(resultado.ultima_parcela_sac), formatarMoeda(resultado.parcela_price)],
      ["Renda necessária", formatarMoeda(rendaSac), formatarMoeda(rendaPrice)],
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
  doc.setFontSize(8)
  doc.setTextColor(...CINZA)
  doc.text(
    `Renda necessária estimada com comprometimento de ${Math.round(comprometimento * 100)}% da renda mensal sobre a maior parcela do sistema.`,
    margem,
    aposComparativo + 14
  )
  doc.setTextColor(0, 0, 0)

  // Tabelas de amortização completas (parcela a parcela), uma por página.
  const tabelas =
    dados.tabelas ??
    gerarTabelasAmortizacao(dados.valorCredito, resultado.taxa_mensal, dados.prazoMeses)

  desenharTabelaCompleta(doc, "SAC", tabelas.sac, margem)
  desenharTabelaCompleta(doc, "PRICE", tabelas.price, margem)

  // Disclaimer no rodapé da última página
  const fim = finalY(doc) ?? aposComparativo + 120
  doc.setFontSize(8)
  doc.setTextColor(...CINZA)
  const largura = doc.internal.pageSize.getWidth() - margem * 2
  doc.text(doc.splitTextToSize(DISCLAIMER, largura), margem, fim + 24)

  const data = new Date().toISOString().slice(0, 10)
  doc.save(`${BRAND.id}-financiamento-imobiliario-${data}.pdf`)
}
