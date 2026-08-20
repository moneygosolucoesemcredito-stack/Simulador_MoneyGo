"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FunnelShell } from "@/components/funnel/FunnelShell"
import { StepWrapper } from "@/components/funnel/StepWrapper"
import { CadastroCliente } from "@/components/funnel/CadastroCliente"
import { criarSupabaseBrowser } from "@/lib/supabase/client"
import { useFunnelStore, type HomeEquityState } from "@/stores/funnel-store"
import { Step1ValorImovel } from "@/components/funnel/steps/home-equity/Step1ValorImovel"
import { Step2TipoImovel } from "@/components/funnel/steps/home-equity/Step2TipoImovel"
import { Step3Situacao } from "@/components/funnel/steps/home-equity/Step3Situacao"
import { Step4Localizacao } from "@/components/funnel/steps/home-equity/Step4Localizacao"
import { Step5ValorDesejado } from "@/components/funnel/steps/home-equity/Step5ValorDesejado"
import { Step6Resultado } from "@/components/funnel/steps/home-equity/Step6Resultado"
import { Step7Contato } from "@/components/funnel/steps/home-equity/Step7Contato"
import { parseTaxaPercent, taxaDentroFaixa } from "@/lib/taxa"
import { CONFIG } from "@/lib/config"
import { pushDataLayer } from "@/components/tracking/GTM"

const TOTAL_STEPS = 7

/**
 * Taxa válida vinda de `?t=` (link de parceiro), ou null quando o parâmetro
 * está ausente, malformado ou fora da faixa permitida do produto.
 */
function taxaDoLinkParceiro(t: string | null): number | null {
  const taxa = t ? parseTaxaPercent(t) : null
  return taxa != null && taxaDentroFaixa(taxa, "home_equity") ? taxa : null
}

function HomeEquityFunnel() {
  const { homeEquity, setHomeEquity } = useFunnelStore()
  const step = homeEquity.step
  const router = useRouter()
  const searchParams = useSearchParams()
  const operadorLink = searchParams.get("op")

  // Link de operador (?t=) exige o cliente identificado: "checando" enquanto
  // consultamos a sessão, "necessario" mostra o cadastro, "liberado" segue.
  // O estado inicial é DERIVADO da URL, não ajustado depois por um setState
  // dentro do efeito: além de evitar o render em cascata, isso impede que o
  // Step 1 apareça por um instante antes de o cadastro entrar na frente.
  // A subárvore inteira é renderizada no cliente (fica dentro do <Suspense>
  // que envolve o uso de useSearchParams), então aqui já lemos a URL real.
  const [gate, setGate] = useState<"checando" | "necessario" | "liberado">(() =>
    taxaDoLinkParceiro(searchParams.get("t")) != null ? "checando" : "liberado"
  )

  // Hidrata o funil a partir da URL. A taxa é SEMPRE do operador:
  //  ?t=...     -> cliente com taxa travada (link enviado pelo operador)
  //  ?modo=op   -> operador digita a taxa na tela de resultado
  //  (sem nada) -> cliente público com taxa apenas indicativa
  useEffect(() => {
    const t = searchParams.get("t")
    const modo = searchParams.get("modo")
    const pessoa = searchParams.get("pessoa")
    const patch: Partial<HomeEquityState> = {}

    const taxaUrl = taxaDoLinkParceiro(t)
    if (taxaUrl != null) {
      patch.modo = "cliente"
      patch.taxa_mensal = taxaUrl
      patch.taxa_indicativa = false
      // Cliente veio por link de parceiro: precisa se cadastrar/entrar antes
      // do funil, para o lead ficar registrado mesmo se abandonar no meio.
      // O gate já nasceu em "checando"; aqui só resolvemos o desfecho.
      criarSupabaseBrowser()
        .auth.getSession()
        .then(({ data }) => setGate(data.session ? "liberado" : "necessario"))
    } else if (modo === "op") {
      patch.modo = "operador"
      patch.taxa_indicativa = false
    } else {
      // Caminho público: nunca expõe o campo de taxa. Usa taxa indicativa.
      patch.modo = "cliente"
      patch.taxa_mensal = CONFIG.homeEquity.taxaMensal
      patch.taxa_indicativa = true
    }

    // Só o link do operador trava o PF/PJ; em qualquer outro caso o seletor
    // permanece disponível para o cliente (inclusive ao refazer o funil).
    if (pessoa === "PF" || pessoa === "PJ") {
      patch.tipo_pessoa = pessoa
      patch.pessoa_travada_link = true
    } else {
      patch.pessoa_travada_link = false
    }
    setHomeEquity(patch)
    // Executa apenas na montagem (leitura inicial da URL).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    pushDataLayer("step_view", { funil: "home_equity", step })
  }, [step])

  function goTo(s: number) {
    setHomeEquity({ step: s })
  }

  // Lead-gen: para o LEAD (pessoa física, fluxo público/parceiro-link) o
  // cadastro é preenchido ANTES do resultado, reduzindo o abandono e permitindo
  // remarketing. Para o PARCEIRO (operador autenticado) mantém-se a simulação
  // direta: resultado primeiro, contato depois.
  const ehParceiro = homeEquity.modo === "operador"

  const content = () => {
    switch (step) {
      case 1:
        return <Step1ValorImovel onNext={() => goTo(2)} />
      case 2:
        return <Step2TipoImovel onNext={() => goTo(3)} />
      case 3:
        return <Step3Situacao onNext={() => goTo(4)} />
      case 4:
        return <Step4Localizacao onNext={() => goTo(5)} />
      case 5:
        return <Step5ValorDesejado onNext={() => goTo(6)} />
      case 6:
        return ehParceiro ? (
          <Step6Resultado onNext={() => goTo(7)} />
        ) : (
          <Step7Contato aoConcluir="avancar" onEnviado={() => goTo(7)} />
        )
      case 7:
        return ehParceiro ? (
          <Step7Contato aoConcluir="redirect" />
        ) : (
          <Step6Resultado terminal onNext={() => router.push("/obrigado")} />
        )
      default:
        return null
    }
  }

  if (gate !== "liberado") {
    return (
      <FunnelShell
        currentStep={1}
        totalSteps={TOTAL_STEPS}
        onBack={() => {}}
        showBack={false}
        produto="Home Equity"
      >
        {gate === "necessario" ? (
          <CadastroCliente
            operadorId={operadorLink}
            onAutenticado={() => setGate("liberado")}
          />
        ) : null}
      </FunnelShell>
    )
  }

  return (
    <FunnelShell
      currentStep={step}
      totalSteps={TOTAL_STEPS}
      onBack={() => goTo(Math.max(1, step - 1))}
      showBack={step > 1}
      produto="Home Equity"
    >
      <StepWrapper stepKey={step}>{content()}</StepWrapper>
    </FunnelShell>
  )
}

export default function HomeEquityPage() {
  return (
    <Suspense fallback={null}>
      <HomeEquityFunnel />
    </Suspense>
  )
}
