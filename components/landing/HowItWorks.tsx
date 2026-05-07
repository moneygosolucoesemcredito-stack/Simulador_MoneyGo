"use client"

import { motion } from "framer-motion"
import { ClipboardList, Calculator, UserCheck, CheckCircle } from "lucide-react"

const etapas = [
  {
    icon: Calculator,
    numero: "01",
    titulo: "Simule online",
    descricao:
      "Informe os dados do seu imóvel ou veículo e veja em segundos o valor que pode liberar e as parcelas estimadas.",
  },
  {
    icon: ClipboardList,
    numero: "02",
    titulo: "Preencha seus dados",
    descricao:
      "Informe seus dados pessoais e de contato. Sem consulta ao SPC/Serasa nesta etapa.",
  },
  {
    icon: UserCheck,
    numero: "03",
    titulo: "Fale com um especialista",
    descricao:
      "Um consultor MoneyGo entra em contato no horário que você escolher para apresentar as melhores condições.",
  },
  {
    icon: CheckCircle,
    numero: "04",
    titulo: "Receba seu crédito",
    descricao:
      "Após aprovação e assinatura digital, o valor é liberado diretamente na sua conta.",
  },
]

export function HowItWorks() {
  return (
    <section className="py-16 px-4 bg-muted/30" id="como-funciona">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Como funciona</h2>
          <p className="text-muted-foreground">
            Do interesse ao crédito em 4 passos simples.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {etapas.map((etapa, i) => {
            const Icon = etapa.icon
            return (
              <motion.div
                key={etapa.numero}
                className="flex flex-col gap-3"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[var(--gold)]" />
                  </div>
                  <span className="text-2xl font-bold text-[var(--gold)]/40 leading-none">
                    {etapa.numero}
                  </span>
                </div>
                <h3 className="font-semibold">{etapa.titulo}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {etapa.descricao}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
