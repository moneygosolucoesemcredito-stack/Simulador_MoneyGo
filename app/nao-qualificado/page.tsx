import Link from "next/link"
import Image from "next/image"
import { Info, MessageCircle, ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/brand"
import { ResetFunnels } from "@/components/funnel/ResetFunnels"

export default function NaoQualificadoPage() {
  const waHref = BRAND.contact.whatsapp
    ? `https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(
        "Olá! Gostaria de entender melhor as opções de crédito disponíveis para mim."
      )}`
    : "/"
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <ResetFunnels />
      <div className="max-w-md w-full text-center space-y-6">
        <Link href="/">
          <Image
            src={BRAND.logos.mark}
            alt={BRAND.name}
            width={BRAND.logos.markWidth}
            height={BRAND.logos.markHeight}
              unoptimized
            className="h-9 w-auto mx-auto mb-4"
          />
        </Link>

        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <Info className="w-9 h-9 text-amber-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Sua simulação foi registrada
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Com base nos dados informados, o perfil atual não se enquadra
            nos critérios padrão desta modalidade. Mas não se preocupe —
            nossa equipe vai analisar manualmente seu caso e pode ter
            alternativas para você.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 text-left space-y-1">
          <p className="font-semibold">Próximos passos:</p>
          <p>Um consultor {BRAND.name} pode entrar em contato para entender melhor sua situação e apresentar alternativas disponíveis.</p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants(), "bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] font-semibold h-12")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Falar com um especialista
          </a>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 text-muted-foreground")}>
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
