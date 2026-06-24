"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/brand"

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--ink)] text-white pt-20 pb-16 px-4">
      {/* Subtle gold gradient accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, var(--gold), transparent)",
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-1 text-xs font-medium text-[var(--gold)] mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            Correspondente bancário multibanco — +10 instituições parceiras
          </span>

          <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-balance">
            Crédito com garantia de{" "}
            <span className="text-[var(--gold)]">imóvel ou veículo</span>
            <br className="hidden sm:block" />
            {" "}com as melhores taxas
          </h1>
        </motion.div>

        <motion.p
          className="text-base sm:text-lg text-white/70 max-w-xl mx-auto text-balance"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Simule em minutos, sem burocracia. Um especialista {BRAND.name} entra em
          contato para fechar as melhores condições para você.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="/entrar?produto=home-equity"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-13 px-8 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] shadow-lg shadow-[var(--gold)]/20"
            )}
          >
            Simular com Imóvel
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <Link
            href="/entrar?produto=auto-equity"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-13 px-8 text-base font-semibold border-white/30 text-white bg-white/5 hover:bg-white/10"
            )}
          >
            Simular com Veículo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </motion.div>

        <motion.p
          className="text-xs text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Simulação 100% gratuita e sem compromisso. Sem consulta ao SPC/Serasa nesta etapa.
        </motion.p>
      </div>
    </section>
  )
}
