"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { motion } from "framer-motion"

/** Conteúdo do FAQ — exportado para permitir asserções diretas nos testes. */
export const PERGUNTAS = [
  {
    q: "O que é crédito com garantia de imóvel (Home Equity)?",
    a: "É uma modalidade em que você utiliza um imóvel de sua propriedade como garantia para obter crédito com taxas muito mais baixas do que empréstimos pessoais ou crédito rotativo. O imóvel fica alienado fiduciariamente durante o prazo, mas você continua morando ou usando normalmente.",
  },
  {
    q: "Posso usar um imóvel financiado como garantia?",
    a: "Sim, desde que o saldo devedor seja de no máximo 30% do valor de mercado do imóvel. Neste caso, parte do crédito é usada para quitar o financiamento existente e o restante fica disponível para você.",
  },
  {
    q: "Quais tipos de imóvel são aceitos?",
    a: "Aceitamos imóveis residenciais (casa e apartamento), comerciais e terrenos em condomínio. Imóveis rurais não são aceitos nesta modalidade.",
  },
  {
    q: "O que é crédito com garantia de veículo (Auto Equity)?",
    a: "Você utiliza seu veículo quitado como garantia e obtém crédito com taxas pré-fixadas competitivas. O veículo permanece em seu uso durante todo o período.",
  },
  {
    q: "Que tipos de veículo são aceitos no Auto Equity?",
    a: "Veículos quitados com valor de tabela FIPE a partir de R$ 30.000. Veículos leves (carros, SUVs e picapes) são aceitos com até 20 anos de fabricação. Veículos pesados (caminhões, cavalos mecânicos e ônibus) também são aceitos: até 15 anos de fabricação no Auto Equity e no máximo 5 anos no Financiamento de Veículo. Veículos financiados não são aceitos nesta modalidade.",
  },
  {
    q: "A MoneyGo é uma instituição financeira?",
    a: "Não, a MoneyGo é uma correspondente bancária atuando com mais de 50 Instituições Financeiras no mercado Brasileiro.",
  },
  {
    q: "Quanto tempo leva para receber o crédito?",
    a: "Após a análise e aprovação (que pode variar de 3 a 15 dias úteis dependendo da instituição financeira), a assinatura é feita digitalmente e o crédito é liberado em conta em até 2 dias úteis.",
  },
  {
    q: "A simulação é gratuita?",
    a: "Sim, 100% gratuita e sem compromisso. Nenhuma consulta ao SPC/Serasa é feita nesta etapa.",
  },
]

export function Faq() {
  return (
    <section className="py-16 px-4 bg-background" id="faq">
      <div className="max-w-2xl mx-auto">
        <motion.div
          className="text-center mb-10 space-y-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
          <p className="text-muted-foreground">
            Tire suas dúvidas sobre crédito com garantia.
          </p>
        </motion.div>

        <Accordion multiple={false} className="space-y-2">
          {PERGUNTAS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-border rounded-xl px-4 data-[state=open]:border-[var(--gold)]/40"
            >
              <AccordionTrigger className="text-left text-sm font-medium py-4 hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
