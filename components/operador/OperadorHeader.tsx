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
        {/* Logo inalterada: a mesma imagem, no mesmo tamanho e no mesmo canto
            de antes. Só o alinhamento do bloco à direita mudou. */}
        <Link href="/" className="shrink-0">
          <Image
            src={BRAND.logos.full}
            alt={BRAND.fullName}
            width={BRAND.logos.width}
            height={BRAND.logos.height}
            unoptimized
            priority
            className="h-12 w-auto"
          />
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-3">
          {/* A logo completa ocupa quase toda a largura de um celular; abaixo de
              `sm` a saudação fica oculta (o e-mail já se comportava assim antes)
              para não virar reticências nem espremer o "Sair". */}
          {saudacao && (
            <span
              className="hidden min-w-0 truncate text-xs text-muted-foreground sm:block"
              title={saudacao}
            >
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
