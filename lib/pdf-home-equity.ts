import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"
import {
  formatarMoeda,
  formatarPercentual,
  formatarPercentualAnual,
  type ResultadoHomeEquity,
} from "./simulacao"
import { BRAND } from "./brand"

export interface DadosPdfHomeEquity {
  valorCredito: number
  valorImovel: number
  prazoMeses: number
  tomador: "PF" | "PJ"
}

const DISCLAIMER =
  "Para fins de simulação apenas. Taxas e valores sujeitos à aprovação de crédito " +
  "e às demais condições do produto vigentes no momento da contratação."

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
 * Gera e baixa um PDF da simulação de Home Equity espelhando a tela de
 * resultado: logo e cabeçalho com os dados da operação e tabela comparativa
 * SAC × PRICE.
 */
export async function gerarPdfHomeEquity(
  resultado: ResultadoHomeEquity,
  dados: DadosPdfHomeEquity
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
  doc.text(`${BRAND.name} — Simulação Home Equity`, margem, y)

  y += 18
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...CINZA)
  doc.text("Crédito com garantia de imóvel · pós-fixado + IPCA", margem, y)
  doc.setTextColor(0, 0, 0)

  // Resumo da operação
  autoTable(doc, {
    startY: y + 16,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    body: [
      ["Crédito solicitado", formatarMoeda(dados.valorCredito)],
      ["Valor do imóvel", formatarMoeda(dados.valorImovel)],
      ["Prazo", `${dados.prazoMeses} meses`],
      ["Tomador", dados.tomador === "PF" ? "Pessoa Física" : "Pessoa Jurídica"],
      ["Taxa de juros (mensal)", `${formatarPercentual(resultado.taxaMensal)} + IPCA`],
      ["Taxa de juros (anual equivalente)", formatarPercentualAnual(resultado.taxaAnual)],
    ],
    columnStyles: {
      0: { textColor: CINZA, cellWidth: 150 },
      1: { fontStyle: "bold" },
    },
  })

  // Comparativo SAC × PRICE
  const linha = (label: string, get: (t: ResultadoHomeEquity["sac"]) => string) => [
    label,
    get(resultado.sac),
    get(resultado.price),
  ]

  const apos = finalY(doc) ?? y + 60

  autoTable(doc, {
    startY: apos + 18,
    head: [["Condição", "SAC (decrescente)", "PRICE (fixa)"]],
    body: [
      linha("Primeira parcela aprox.", (t) => formatarMoeda(t.primeiraParcela)),
      linha("Última parcela aprox.", (t) => formatarMoeda(t.ultimaParcela)),
      linha("Renda sugerida", (t) => formatarMoeda(t.rendaSugerida)),
      linha("Parcela média", (t) => formatarMoeda(t.parcelaMedia)),
      linha("Custo efetivo total (CET)", (t) => formatarPercentualAnual(t.cetAnual)),
      linha("Total pago", (t) => formatarMoeda(t.totalPago)),
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

  // Disclaimer no rodapé
  const fim = finalY(doc) ?? apos + 120
  doc.setFontSize(8)
  doc.setTextColor(...CINZA)
  const largura = doc.internal.pageSize.getWidth() - margem * 2
  doc.text(doc.splitTextToSize(DISCLAIMER, largura), margem, fim + 24)

  const data = new Date().toISOString().slice(0, 10)
  doc.save(`${BRAND.id}-home-equity-${data}.pdf`)
}
