"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Building2, Car, ArrowRight, TrendingDown, Clock, HardHat, Home } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CONFIG } from "@/lib/config"
import { formatarPercentual } from "@/lib/simulacao"

const produtos = [
  {
    href: "/home-equity",
    icon: Building2,
    titulo: "Home Equity",
    subtitulo: "Crédito com garantia de imóvel",
    descricao:
      "Use o valor do seu imóvel para obter crédito com as menores taxas do mercado. Ideal para quitar dívidas, investir no seu negócio ou realizar projetos.",
    taxa: formatarPercentual(CONFIG.homeEquity.taxaMensal),
    modalidade: "Pós-fixada + IPCA",
    prazo: "até 240 meses",
    ltv: "até 55% do valor",
    destaque: true,
  },
  {
    href: "/financiamento-imobiliario",
    icon: Home,
    titulo: "Financiamento Imobiliário",
    subtitulo: "Compra ou refinanciamento de imóvel",
    descricao:
      "Financie a compra do seu imóvel residencial ou comercial com as melhores condições. Prazo de até 30 anos e taxa a partir de " + formatarPercentual(CONFIG.financiamentoImobiliario.taxaMensal) + ".",
    taxa: formatarPercentual(CONFIG.financiamentoImobiliario.taxaMensal),
    modalidade: "Pós-fixada + IPCA",
    prazo: "até 360 meses",
    ltv: "até 55% do valor",
    destaque: false,
  },
  {
    href: "/credito-construcao",
    icon: HardHat,
    titulo: "Crédito de Construção",
    subtitulo: "Financiamento para construção em terreno próprio",
    descricao:
      "Construa no seu terreno com crédito liberado em tranches conforme o avanço da obra. Carência durante a construção e até 20 anos para pagar.",
    taxa: formatarPercentual(CONFIG.creditoConstrucao.taxaMensal),
    modalidade: "Pós-fixada + IPCA",
    prazo: "até 240 meses",
    ltv: "até 55% do valor",
    destaque: false,
  },
  {
    href: "/auto-equity",
    icon: Car,
    titulo: "Auto Equity",
    subtitulo: "Crédito com garantia de veículo",
    descricao:
      "Utilize seu carro de passeio como garantia e acesse crédito rápido com taxa pré-fixada. Continue usando o veículo normalmente.",
    taxa: formatarPercentual(CONFIG.autoEquity.taxaMensal),
    modalidade: "Pré-fixada",
    prazo: "até 60 meses",
    ltv: "até 50% do valor",
    destaque: false,
  },
]

export function ProductCards() {
  return (
    <section className="py-16 px-4 bg-background" id="produtos">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Escolha sua modalidade</h2>
          <p className="text-muted-foreground">
            Soluções de crédito com garantia para cada necessidade.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-5">
          {produtos.map((p, i) => {
            const Icon = p.icon
            return (
              <motion.div
                key={p.href}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card
                  className={`h-full border-2 transition-all hover:shadow-lg ${
                    p.destaque
                      ? "border-[var(--gold)] shadow-[var(--gold)]/10"
                      : "border-border hover:border-[var(--gold)]/40"
                  }`}
                >
                  {p.destaque && (
                    <div className="bg-[var(--gold)] text-[oklch(0.14_0_0)] text-xs font-semibold text-center py-1.5 rounded-t-lg tracking-wide">
                      MAIS PROCURADO
                    </div>
                  )}
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-[var(--gold)]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{p.titulo}</h3>
                        <p className="text-xs text-muted-foreground">{p.subtitulo}</p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">{p.descricao}</p>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-[var(--gold)] shrink-0" />
                        <span>
                          A partir de <strong>{p.taxa}</strong> — {p.modalidade}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--gold)] shrink-0" />
                        <span>Prazo {p.prazo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[var(--gold)] shrink-0" />
                        <span>Crédito {p.ltv} do bem</span>
                      </div>
                    </div>

                    <Link
                      href={`/entrar?produto=${p.href.slice(1)}`}
                      className={cn(
                        buttonVariants(),
                        "w-full bg-[var(--gold)] text-[oklch(0.14_0_0)] hover:bg-[var(--gold-dark)] font-semibold"
                      )}
                    >
                      Simular grátis <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
