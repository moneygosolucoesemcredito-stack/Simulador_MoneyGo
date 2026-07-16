import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import { BRAND } from "@/lib/brand"

export const metadata = {
  title: `Política de Privacidade — ${BRAND.fullName}`,
}

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 h-14 flex items-center max-w-3xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 prose prose-sm prose-zinc max-w-none">
        <Image src={BRAND.logos.mark} alt={BRAND.name} width={BRAND.logos.markWidth} height={BRAND.logos.markHeight}
              unoptimized className="h-9 w-auto mb-8" />

        <h1>Política de Privacidade</h1>
        <p><strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR")}</p>

        <h2>1. Quem somos</h2>
        <p>
          A <strong>{BRAND.fullName}</strong> (CNPJ {BRAND.cnpj}),
          correspondente bancário multibanco, é responsável pelo tratamento dos dados pessoais
          coletados neste site.
        </p>

        <h2>2. Quais dados coletamos</h2>
        <ul>
          <li>Dados de identificação: nome completo, data de nascimento, CPF</li>
          <li>Dados de contato: telefone (WhatsApp), e-mail</li>
          <li>Dados de localização: endereço completo (CEP, logradouro, bairro, cidade, UF)</li>
          <li>Dados financeiros da simulação: valor do bem, valor solicitado, prazo</li>
          <li>Dados de navegação: cookies, UTMs, endereço IP (via Meta Pixel e Google Analytics)</li>
        </ul>

        <h2>3. Para que usamos seus dados</h2>
        <ul>
          <li>Processar sua simulação de crédito</li>
          <li>Entrar em contato para apresentar condições personalizadas</li>
          <li>Encaminhar sua solicitação às instituições financeiras parceiras</li>
          <li>Cumprir obrigações legais e regulatórias</li>
          <li>Melhorar nossos serviços por meio de análise de dados</li>
        </ul>

        <h2>4. Compartilhamento de dados</h2>
        <p>
          Seus dados poderão ser compartilhados com as instituições financeiras parceiras para
          fins de análise de crédito, mediante seu consentimento. Não vendemos seus dados a terceiros.
        </p>

        <h2>5. Seus direitos (LGPD)</h2>
        <p>
          Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
          acessar, corrigir, deletar, portar seus dados e revogar o consentimento a qualquer
          momento. Entre em contato: <strong>{BRAND.contact.email}</strong>.
        </p>

        <h2>6. Cookies</h2>
        <p>
          Utilizamos cookies próprios e de terceiros (Meta Pixel, Google Analytics/GTM) para
          medir o desempenho das campanhas e melhorar sua experiência. Você pode gerenciar
          suas preferências pelo banner de cookies exibido na primeira visita.
        </p>

        <h2>7. Retenção de dados</h2>
        <p>
          Mantemos seus dados pelo prazo necessário à prestação do serviço e cumprimento de
          obrigações legais, respeitando os prazos mínimos exigidos pelo Banco Central e pelas
          leis aplicáveis.
        </p>

        <h2>8. Contato</h2>
        <p>
          Dúvidas sobre privacidade? Fale com nosso Encarregado de Dados (DPO):{" "}
          <strong>{BRAND.contact.email}</strong>
        </p>
      </main>
    </div>
  )
}
