import Link from "next/link"
import Image from "next/image"
import { BRAND } from "@/lib/brand"

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.069 1.646.069 4.849 0 3.205-.012 3.584-.069 4.85-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.645.07-4.85.07-3.204 0-3.584-.012-4.849-.07-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.647 2.163 15.268 2.163 12s.012-3.584.07-4.849c.062-1.366.336-2.633 1.311-3.608.975-.975 2.242-1.249 3.608-1.311C8.416 2.175 8.796 2.163 12 2.163zm0 1.802c-3.146 0-3.504.012-4.738.068-.97.044-1.51.207-1.86.345-.467.181-.8.397-1.15.748-.35.35-.566.683-.748 1.15-.137.35-.3.89-.345 1.86-.056 1.234-.067 1.592-.067 4.738s.011 3.504.067 4.738c.044.97.207 1.51.345 1.86.181.467.397.8.748 1.15.35.35.683.566 1.15.748.35.137.89.3 1.86.345 1.234.056 1.592.067 4.738.067s3.504-.011 4.738-.067c.97-.044 1.51-.207 1.86-.345.467-.181.8-.397 1.15-.748.35-.35.566-.683.748-1.15.137-.35.3-.89.345-1.86.056-1.234.067-1.592.067-4.738s-.011-3.504-.067-4.738c-.044-.97-.207-1.51-.345-1.86-.181-.467-.397-.8-.748-1.15-.35-.35-.683-.566-1.15-.748-.35-.137-.89-.3-1.86-.345-1.234-.056-1.592-.067-4.738-.067zm0 3.063A4.972 4.972 0 1 1 12 16.97a4.972 4.972 0 0 1 0-9.942zm0 8.197a3.225 3.225 0 1 0 0-6.45 3.225 3.225 0 0 0 0 6.45zm6.406-8.4a1.161 1.161 0 1 1-2.323 0 1.161 1.161 0 0 1 2.323 0z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.073C22 6.51 17.523 2 12 2S2 6.51 2 12.073C2 17.1 5.657 21.26 10.438 22v-7.02H7.898v-2.907h2.54V9.847c0-2.523 1.492-3.917 3.777-3.917 1.094 0 2.238.196 2.238.196v2.477h-1.261c-1.242 0-1.63.775-1.63 1.57v1.886h2.773l-.443 2.907h-2.33V22C18.343 21.26 22 17.1 22 12.073z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

const SOCIAIS = [
  { nome: "Instagram", href: BRAND.social.instagram, Icon: InstagramIcon },
  { nome: "WhatsApp", href: BRAND.social.whatsapp, Icon: WhatsAppIcon },
  { nome: "Facebook", href: BRAND.social.facebook, Icon: FacebookIcon },
].filter((s): s is { nome: string; href: string; Icon: typeof InstagramIcon } => Boolean(s.href))

export function Footer() {
  return (
    <footer className="bg-[var(--ink)] text-white/70 pt-12 pb-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="grid sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Image
              src={BRAND.logos.fullWhite}
              alt={BRAND.fullName}
              width={BRAND.logos.width}
              height={BRAND.logos.height}
              unoptimized
              className="h-10 w-auto"
            />
            <p className="text-xs leading-relaxed">
              {BRAND.tagline}
            </p>
          </div>

          {/* Produtos */}
          <div className="space-y-3">
            <p className="text-white text-sm font-semibold">Produtos</p>
            <ul className="space-y-2 text-xs">
              <li><Link href="/home-equity" className="hover:text-white transition-colors">Home Equity</Link></li>
              <li><Link href="/financiamento-imobiliario" className="hover:text-white transition-colors">Financiamento Imobiliário</Link></li>
              <li><Link href="/credito-construcao" className="hover:text-white transition-colors">Crédito de Construção</Link></li>
              <li><Link href="/auto-equity" className="hover:text-white transition-colors">Auto Equity</Link></li>
              <li><Link href="/financiamento-veiculo" className="hover:text-white transition-colors">Financiamento de Veículo</Link></li>
            </ul>
          </div>

          {/* Redes & Legal */}
          <div className="space-y-3">
            <p className="text-white text-sm font-semibold">Redes sociais</p>
            <div className="flex items-center gap-3">
              {SOCIAIS.map(({ nome, href, Icon }) => (
                <a
                  key={nome}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={nome}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-[var(--gold)]/20 border border-white/10 hover:border-[var(--gold)]/50 flex items-center justify-center text-white/70 hover:text-[var(--gold)] transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
            <ul className="space-y-2 text-xs pt-1">
              <li><Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 space-y-3 text-xs leading-relaxed">
          <p>
            Essa plataforma pertence à{" "}
            <strong className="text-white/80">{BRAND.legalName}</strong>{" "}
            | CNPJ: {BRAND.cnpj}. Atuamos como assessoria financeira em concessão
            de crédito no varejo e no atacado.
          </p>
          <p>
            Crédito sujeito a margem consignável disponível no momento da contratação e às
            condições do convênio. Valores de parcelas, prazos, taxa de juros, tarifas e CET
            (Custo Efetivo Total) podem variar conforme o convênio e a qualquer tempo, sem
            necessidade de aviso prévio.
          </p>
          <p className="text-white/30 pt-2">
            © {new Date().getFullYear()} {BRAND.fullName}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
