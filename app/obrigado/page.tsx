import Link from "next/link"
import Image from "next/image"
import { CheckCircle, MessageCircle } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/brand"
import { ResetFunnels } from "@/components/funnel/ResetFunnels"

export default function ObrigadoPage() {
  const waHref = BRAND.contact.whatsapp
    ? `https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(
        `Olá! Acabei de simular meu crédito no site da ${BRAND.name}.`
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

        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Solicitação recebida!
          </h1>
          <p className="text-muted-foreground">
            Seu pedido foi registrado com sucesso. Um especialista {BRAND.name} entrará
            em contato no horário que você escolheu para apresentar as melhores
            condições do mercado.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm space-y-2 text-left">
          <p className="font-semibold">O que acontece agora?</p>
          <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside">
            <li>Nosso especialista analisa seu perfil</li>
            <li>Você recebe contato pelo WhatsApp informado</li>
            <li>Apresentamos as condições personalizadas para você</li>
            <li>Seguimos para análise formal e liberação do crédito</li>
          </ol>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants(), "bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] font-semibold h-12")}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Fale pelo WhatsApp agora
          </a>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}>
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
