"use client"

import Link from "next/link"
import Image from "next/image"
import { LogOut } from "lucide-react"
import { BRAND } from "@/lib/brand"

interface OperadorHeaderProps {
  /** Texto pronto ("Olá, Daiana"); vazio enquanto a sessão não carrega. */
  saudacao: string
  onSair: () => void
}

/**
 * Cabeçalho da área do operador: logo na borda esquerda, saudação e "Sair"
 * na extrema direita da tela.
 *
 * A barra ocupa a largura total (o conteúdo da página é que fica em `max-w-lg`)
 * — antes o header também era estreito e centralizado, o que colava a
 * identificação do parceiro na logo em telas largas. O alinhamento à direita
 * vem de `ml-auto` no grupo, e não de largura fixa, então acompanha qualquer
 * resolução. A saudação trunca quando é longa (caso do fallback por e-mail) e
 * o botão "Sair" nunca encolhe.
 */
export function OperadorHeader({ saudacao, onSair }: OperadorHeaderProps) {
  return (
    <header className="border-b border-border bg-white sticky top-0 z-30">
      <div className="w-full px-4 h-14 flex items-center gap-3">
        {/* No celular a logo completa (proporção ~6,7:1) comeria a largura da
            saudação — daí a marca compacta abaixo de `sm`. */}
        <Link href="/" className="shrink-0">
          <Image
            src={BRAND.logos.mark}
            alt={BRAND.fullName}
            width={BRAND.logos.markWidth}
            height={BRAND.logos.markHeight}
            unoptimized
            priority
            className="h-8 w-auto sm:hidden"
          />
          <Image
            src={BRAND.logos.full}
            alt={BRAND.fullName}
            width={BRAND.logos.width}
            height={BRAND.logos.height}
            unoptimized
            priority
            className="hidden h-12 w-auto sm:block"
          />
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-3">
          {saudacao && (
            <span className="min-w-0 truncate text-xs text-muted-foreground" title={saudacao}>
              {saudacao}
            </span>
          )}
          <button
            onClick={onSair}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </div>
    </header>
  )
}
