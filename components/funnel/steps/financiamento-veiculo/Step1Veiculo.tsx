"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/funnel/CurrencyInput"
import { useFunnelStore } from "@/stores/funnel-store"
import { pushDataLayer } from "@/components/tracking/GTM"
import { formatarMoeda } from "@/lib/simulacao"
import { Car, ThumbsUp, Loader2, CheckCircle2, ArrowLeft, Search } from "lucide-react"
import { consultarPlaca, normalizarPlaca, placaValida } from "@/lib/placa"
import { listarMarcas, listarModelos, listarAnos, consultarPreco, type FipeItem } from "@/lib/fipe"

const anoAtual = new Date().getFullYear()

type Mode = "choice" | "placa" | "manual"

/** Dados do veículo vindos da placa OU da cascata FIPE (marca → modelo → ano). */
interface VeiculoEncontrado {
  marca_modelo_ano: string
  ano_veiculo: number
  valor_fipe: number
  placa: string
  combustivel: string
  potencia: string
  fipe_codigo: string
}

const inputSelectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

/** Cartão com os dados encontrados do veículo. */
function CartaoVeiculo({ veiculo }: { veiculo: VeiculoEncontrado }) {
  return (
    <div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-5 space-y-3">
      <div className="flex items-center gap-2 text-[var(--gold)]">
        <CheckCircle2 className="w-4 h-4" />
        <span className="text-sm font-medium">Veículo identificado</span>
      </div>
      <p className="font-semibold leading-tight">{veiculo.marca_modelo_ano}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-1">
        {veiculo.ano_veiculo > 0 && (
          <div className="flex justify-between border-b border-border/60 pb-1">
            <span className="text-muted-foreground">Ano</span>
            <span className="font-medium">{veiculo.ano_veiculo}</span>
          </div>
        )}
        {veiculo.combustivel && (
          <div className="flex justify-between border-b border-border/60 pb-1">
            <span className="text-muted-foreground">Combustível</span>
            <span className="font-medium">{veiculo.combustivel}</span>
          </div>
        )}
        {veiculo.fipe_codigo && (
          <div className="flex justify-between border-b border-border/60 pb-1">
            <span className="text-muted-foreground">Código FIPE</span>
            <span className="font-medium">{veiculo.fipe_codigo}</span>
          </div>
        )}
        <div className="flex justify-between border-b border-border/60 pb-1">
          <span className="text-muted-foreground">Valor FIPE</span>
          <span className="font-semibold text-[var(--gold)]">
            {veiculo.valor_fipe > 0 ? formatarMoeda(veiculo.valor_fipe) : "—"}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Caminho "Sim, tenho a placa". */
function PlacaForm({
  onFound,
  irParaManual,
}: {
  onFound: (v: VeiculoEncontrado) => void
  irParaManual: () => void
}) {
  const [placa, setPlaca] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const valida = placaValida(placa)

  async function buscar() {
    setErro(null)
    setBuscando(true)
    const r = await consultarPlaca(placa)
    setBuscando(false)
    if (!r.ok) {
      setErro(
        r.naoConfigurado
          ? "A consulta automática por placa ainda não está ativa. Use a busca por modelo."
          : r.error
      )
      return
    }
    onFound({
      marca_modelo_ano: r.veiculo.marca_modelo_ano,
      ano_veiculo: r.veiculo.ano,
      valor_fipe: r.veiculo.valor_fipe,
      placa: normalizarPlaca(placa),
      combustivel: r.veiculo.combustivel,
      potencia: r.veiculo.potencia,
      fipe_codigo: r.veiculo.codigo_fipe,
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="placa">Placa do veículo</Label>
        <Input
          id="placa"
          autoFocus
          inputMode="text"
          maxLength={7}
          placeholder="ABC1D23"
          value={placa}
          onChange={(e) => {
            setPlaca(normalizarPlaca(e.target.value))
            setErro(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valida && !buscando) buscar()
          }}
          className="uppercase tracking-widest"
        />
        <p className="text-xs text-muted-foreground">Aceita placa antiga e Mercosul.</p>
      </div>

      {erro && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
          <p>{erro}</p>
          <button onClick={irParaManual} className="font-semibold underline">
            Buscar por marca e modelo
          </button>
        </div>
      )}

      <Button
        onClick={buscar}
        disabled={!valida || buscando}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        {buscando ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Buscando…
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" /> Buscar veículo
          </>
        )}
      </Button>
    </div>
  )
}

/** Caminho "Buscar por modelo" — FIPE em cascata (marca → modelo → ano). */
function ManualForm({ onFound }: { onFound: (v: VeiculoEncontrado) => void }) {
  const [marcas, setMarcas] = useState<FipeItem[]>([])
  const [modelos, setModelos] = useState<FipeItem[]>([])
  const [anos, setAnos] = useState<FipeItem[]>([])
  const [marca, setMarca] = useState("")
  const [modelo, setModelo] = useState("")
  const [ano, setAno] = useState("")
  const [carregando, setCarregando] = useState<"marcas" | "modelos" | "anos" | "preco" | null>("marcas")
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    listarMarcas().then((m) => {
      setMarcas(m)
      setCarregando(null)
      if (m.length === 0) setErro("Não foi possível carregar a tabela FIPE agora. Tente novamente.")
    })
  }, [])

  async function selecionarMarca(codigo: string) {
    setMarca(codigo)
    setModelo("")
    setAno("")
    setModelos([])
    setAnos([])
    if (!codigo) return
    setCarregando("modelos")
    setModelos(await listarModelos(codigo))
    setCarregando(null)
  }

  async function selecionarModelo(codigo: string) {
    setModelo(codigo)
    setAno("")
    setAnos([])
    if (!codigo) return
    setCarregando("anos")
    setAnos(await listarAnos(marca, codigo))
    setCarregando(null)
  }

  async function selecionarAno(codigo: string) {
    setAno(codigo)
    if (!codigo) return
    setCarregando("preco")
    const preco = await consultarPreco(marca, modelo, codigo)
    setCarregando(null)
    if (!preco) {
      setErro("Não foi possível obter o valor FIPE. Tente outro ano.")
      return
    }
    setErro(null)
    const anoVeiculo = preco.anoModelo > anoAtual ? anoAtual : preco.anoModelo
    onFound({
      marca_modelo_ano: `${preco.marca} ${preco.modelo} ${anoVeiculo}`,
      ano_veiculo: anoVeiculo,
      valor_fipe: preco.valor,
      placa: "",
      combustivel: preco.combustivel,
      potencia: "",
      fipe_codigo: preco.codigoFipe,
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="marca">Marca</Label>
        <select
          id="marca"
          value={marca}
          disabled={carregando === "marcas" || marcas.length === 0}
          onChange={(e) => selecionarMarca(e.target.value)}
          className={inputSelectClass}
        >
          <option value="">{carregando === "marcas" ? "Carregando…" : "Selecione a marca"}</option>
          {marcas.map((m) => (
            <option key={m.codigo} value={m.codigo}>{m.nome}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="modelo">Modelo</Label>
        <select
          id="modelo"
          value={modelo}
          disabled={!marca || carregando === "modelos"}
          onChange={(e) => selecionarModelo(e.target.value)}
          className={inputSelectClass}
        >
          <option value="">{carregando === "modelos" ? "Carregando…" : "Selecione o modelo"}</option>
          {modelos.map((m) => (
            <option key={m.codigo} value={m.codigo}>{m.nome}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ano">Ano</Label>
        <select
          id="ano"
          value={ano}
          disabled={!modelo || carregando === "anos"}
          onChange={(e) => selecionarAno(e.target.value)}
          className={inputSelectClass}
        >
          <option value="">{carregando === "anos" ? "Carregando…" : "Selecione o ano"}</option>
          {anos.map((a) => (
            <option key={a.codigo} value={a.codigo}>{a.nome}</option>
          ))}
        </select>
      </div>

      {carregando === "preco" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Buscando valor FIPE…
        </p>
      )}

      {erro && <p className="text-destructive text-xs">{erro}</p>}
    </div>
  )
}

export function Step1Veiculo({ onNext }: { onNext: () => void }) {
  const { setFinanciamentoVeiculo } = useFunnelStore()
  const [mode, setMode] = useState<Mode>("choice")
  const [veiculo, setVeiculo] = useState<VeiculoEncontrado | null>(null)
  // FIPE preenche automaticamente; o cliente pode ajustar (valor negociado).
  const [valorVeiculo, setValorVeiculo] = useState(0)

  function encontrado(v: VeiculoEncontrado) {
    setVeiculo(v)
    setValorVeiculo(v.valor_fipe)
  }

  function confirmar() {
    if (!veiculo || valorVeiculo <= 0) return
    setFinanciamentoVeiculo({
      marca_modelo_ano: veiculo.marca_modelo_ano,
      ano_veiculo: veiculo.ano_veiculo,
      valor_veiculo: valorVeiculo,
      placa: veiculo.placa,
      combustivel: veiculo.combustivel,
      potencia: veiculo.potencia,
      fipe_codigo: veiculo.fipe_codigo,
    })
    pushDataLayer("step_completed", {
      funil: "financiamento_veiculo",
      step: 1,
      origem_veiculo: veiculo.placa ? "placa" : "manual",
    })
    onNext()
  }

  if (veiculo) {
    const ajustado = veiculo.valor_fipe > 0 && Math.abs(valorVeiculo - veiculo.valor_fipe) >= 1
    return (
      <div className="space-y-5">
        <CartaoVeiculo veiculo={veiculo} />

        <div className="space-y-1.5">
          <Label htmlFor="valor-veiculo">Valor do veículo</Label>
          <CurrencyInput id="valor-veiculo" value={valorVeiculo} onChange={setValorVeiculo} />
          <p className="text-xs text-muted-foreground">
            {ajustado
              ? `Ajustado a partir da FIPE (${formatarMoeda(veiculo.valor_fipe)}).`
              : "Preenchido pela tabela FIPE — ajuste se o valor negociado for outro."}
          </p>
        </div>

        <Button
          onClick={confirmar}
          disabled={valorVeiculo <= 0}
          className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
        >
          Continuar
        </Button>
        <button
          onClick={() => setVeiculo(null)}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          Buscar outro veículo
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {mode === "choice" ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Qual veículo você quer financiar?</h2>
            <p className="text-muted-foreground text-sm">
              Buscamos o valor de mercado na tabela FIPE. Você tem a placa do veículo?
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("placa")}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-border p-4 text-sm font-medium transition-all hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/5"
            >
              <ThumbsUp className="w-4 h-4 shrink-0" />
              Sim, tenho a placa
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-border p-4 text-sm font-medium transition-all hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/5"
            >
              <Car className="w-4 h-4 shrink-0" />
              Buscar por modelo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <button
            onClick={() => setMode("choice")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Trocar opção
          </button>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "placa" ? "Buscar pela placa" : "Selecione o veículo"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === "placa"
                ? "Vamos identificar o modelo, ano e valor FIPE automaticamente."
                : "Escolha marca, modelo e ano — o valor FIPE é preenchido automaticamente."}
            </p>
          </div>

          {mode === "placa" ? (
            <PlacaForm onFound={encontrado} irParaManual={() => setMode("manual")} />
          ) : (
            <ManualForm onFound={encontrado} />
          )}
        </div>
      )}
    </div>
  )
}
