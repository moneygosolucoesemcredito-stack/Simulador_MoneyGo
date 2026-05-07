import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="bg-[oklch(0.14_0_0)] text-white/70 pt-12 pb-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="grid sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Image
              src="/logo-white.svg"
              alt="MoneyGo Soluções em Crédito"
              width={120}
              height={34}
              className="brightness-0 invert"
            />
            <p className="text-xs leading-relaxed">
              Correspondente bancário multibanco, especializado em crédito com
              garantia de imóvel e veículo.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <p className="text-white text-sm font-semibold">Produtos</p>
            <ul className="space-y-2 text-xs">
              <li><Link href="/home-equity" className="hover:text-white transition-colors">Home Equity</Link></li>
              <li><Link href="/auto-equity" className="hover:text-white transition-colors">Auto Equity</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <p className="text-white text-sm font-semibold">Legal</p>
            <ul className="space-y-2 text-xs">
              <li><Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
              <li><a href="https://www.instagram.com/moneygosolucoesemcredito" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 space-y-2 text-xs">
          <p>
            {/* TODO: confirmar CNPJ e endereço com o cliente */}
            <strong className="text-white/50">MoneyGo Soluções em Crédito</strong> —{" "}
            {/* TODO: confirmar CNPJ e endereço */}
            CNPJ: 00.000.000/0001-00 — Endereço: Rua Exemplo, 000 — Cidade/UF
          </p>
          <p>
            Correspondente Bancário autorizado pelo Banco Central do Brasil, nos termos da
            Resolução CMN nº 3.954/2011.
          </p>
          <p className="text-white/30">
            © {new Date().getFullYear()} MoneyGo Soluções em Crédito. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
