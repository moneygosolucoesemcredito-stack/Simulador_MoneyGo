"use client"

import { motion } from "framer-motion"
import Image from "next/image"

const PARCEIROS = [
  { nome: "Itaú", logo: "/parceiros/itau-logo.png" },
  { nome: "Bradesco", logo: "/parceiros/bradesco-logo.png" },
  { nome: "Santander", logo: "/parceiros/santander-logo.png" },
  { nome: "Banco Inter", logo: "/parceiros/inter-logo.png" },
  { nome: "C6 Bank", logo: "/parceiros/c6-logo.png" },
  { nome: "Daycoval", logo: "/parceiros/daycoval-logo.png" },
  { nome: "Banco Paulista", logo: "/parceiros/paulista-logo.png" },
  { nome: "Galleria Bank", logo: "/parceiros/galleria-logo.png" },
  { nome: "Banco Fibra", logo: "/parceiros/fibra-logo.png" },
  { nome: "Crediblue", logo: "/parceiros/crediblue-logo.png" },
  { nome: "TCash", logo: "/parceiros/tcash-logo.png" },
]

export function Partners() {
  return (
    <section className="py-12 px-4 bg-muted/20 border-y border-border">
      <div className="max-w-5xl mx-auto">
        <motion.p
          className="text-center text-sm text-muted-foreground mb-8 font-medium tracking-wide uppercase"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          +10 instituições financeiras parceiras
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6">
          {PARCEIROS.map((p) => (
            <div
              key={p.nome}
              className="relative h-12 w-28 grayscale opacity-60 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
              title={p.nome}
            >
              <Image
                src={p.logo}
                alt={p.nome}
                fill
                sizes="112px"
                className="object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
