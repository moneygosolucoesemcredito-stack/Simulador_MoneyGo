"use client"

import { motion } from "framer-motion"
import Image from "next/image"

const PARCEIROS = [
  { nome: "Itaú", logo: "/parceiros/itau.png" },
  { nome: "Banco Inter", logo: "/parceiros/inter.png" },
  { nome: "Banco Paulista", logo: "/parceiros/paulista.png" },
  { nome: "Galleria Bank", logo: "/parceiros/galleria.png" },
  { nome: "Banco Fibra", logo: "/parceiros/fibra.png" },
  { nome: "Trinus Bank", logo: "/parceiros/trinus.png" },
  { nome: "EQI", logo: "/parceiros/eqi.png" },
]

export function Partners() {
  return (
    <section className="py-12 px-4 bg-muted/20 border-y border-border">
      <div className="max-w-4xl mx-auto">
        <motion.p
          className="text-center text-sm text-muted-foreground mb-8 font-medium tracking-wide uppercase"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          +10 instituições financeiras parceiras
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-70">
          {PARCEIROS.map((p) => (
            <div key={p.nome} className="h-8 flex items-center">
              {/* TODO: replace with actual partner logo files in /public/parceiros/ */}
              <span className="text-sm font-semibold text-muted-foreground">{p.nome}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
