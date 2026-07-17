"use client"

import { useState } from "react"
import Link from "next/link"
import { IMaskInput } from "react-imask"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { criarSupabaseBrowser } from "@/lib/supabase/client"
import { AlertCircle, MailCheck, UserPlus, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/brand"

interface CadastroClienteProps {
  /** Parceiro que gerou o link (?op=) — vincula o lead a ele. */
  operadorId: string | null
  /** Chamado quando o cliente está autenticado e pode seguir para o funil. */
  onAutenticado: () => void
}

type Aba = "cadastro" | "login"

const inputMask =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

export function CadastroCliente({ operadorId, onAutenticado }: CadastroClienteProps) {
  const [aba, setAba] = useState<Aba>("cadastro")
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false)

  async function garantirCadastro(userId: string) {
    // Grava (ou completa) a linha em `clientes` vinculada ao operador do link.
    // Upsert: no login de quem já tem conta a linha já existe e nada muda.
    const supabase = criarSupabaseBrowser()
    await supabase.from("clientes").upsert(
      {
        id: userId,
        nome: nome || email,
        email,
        telefone,
        ...(operadorId ? { operador_id: operadorId } : {}),
      },
      { onConflict: "id", ignoreDuplicates: true }
    )
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    if (senha.length < 8) {
      setErro("A senha deve ter ao menos 8 caracteres.")
      return
    }
    setCarregando(true)
    try {
      const supabase = criarSupabaseBrowser()
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome, telefone } },
      })
      if (error) {
        setErro(
          error.message.includes("already registered")
            ? "Este e-mail já possui conta. Use a aba “Já tenho conta”."
            : "Não foi possível criar sua conta. Verifique os dados e tente novamente."
        )
        return
      }
      if (data.session && data.user) {
        await garantirCadastro(data.user.id)
        onAutenticado()
      } else {
        // Projeto com confirmação de e-mail ligada: sem sessão até confirmar.
        setAguardandoConfirmacao(true)
      }
    } finally {
      setCarregando(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setCarregando(true)
    try {
      const supabase = criarSupabaseBrowser()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) {
        setErro("E-mail ou senha incorretos.")
        return
      }
      if (data.user) await garantirCadastro(data.user.id)
      onAutenticado()
    } finally {
      setCarregando(false)
    }
  }

  if (aguardandoConfirmacao) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <MailCheck className="w-7 h-7 text-emerald-600" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Confirme seu e-mail</h2>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para <strong>{email}</strong>. Depois de
            confirmar, abra o link do parceiro novamente para continuar a simulação.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Identifique-se para simular</h2>
        <p className="text-sm text-muted-foreground">
          Você recebeu um link exclusivo de um parceiro {BRAND.name}. Crie sua conta
          para continuar — assim sua proposta já fica registrada com seus dados.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        {([
          { v: "cadastro", label: "Criar conta" },
          { v: "login", label: "Já tenho conta" },
        ] as { v: Aba; label: string }[]).map((op) => (
          <button
            key={op.v}
            type="button"
            onClick={() => {
              setAba(op.v)
              setErro("")
            }}
            className={cn(
              "rounded-lg py-2 text-sm font-medium transition-all",
              aba === op.v ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            )}
          >
            {op.label}
          </button>
        ))}
      </div>

      {aba === "cadastro" ? (
        <form onSubmit={handleCadastro} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cad-nome">Nome completo</Label>
            <Input
              id="cad-nome"
              autoComplete="name"
              required
              minLength={3}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cad-telefone">WhatsApp</Label>
            <IMaskInput
              id="cad-telefone"
              mask="(00) 00000-0000"
              value={telefone}
              onAccept={(val) => setTelefone(String(val))}
              placeholder="(00) 00000-0000"
              className={inputMask}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cad-email">E-mail</Label>
            <Input
              id="cad-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cad-senha">Senha</Label>
            <Input
              id="cad-senha"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
          </div>

          {erro && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {erro}
            </div>
          )}

          <Button
            type="submit"
            disabled={carregando || !nome || !telefone || !email || !senha}
            className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {carregando ? "Criando conta…" : "Criar conta e simular"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="log-email">E-mail</Label>
            <Input
              id="log-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="log-senha">Senha</Label>
            <Input
              id="log-senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="h-11"
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {erro}
            </div>
          )}

          <Button
            type="submit"
            disabled={carregando || !email || !senha}
            className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)] disabled:opacity-50"
          >
            <LogIn className="h-4 w-4 mr-2" />
            {carregando ? "Entrando…" : "Entrar e simular"}
          </Button>

          <div className="text-center">
            <Link
              href="/recuperar-senha"
              className="text-sm font-medium text-[var(--gold-dark)] hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
        </form>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Seus dados são usados apenas para a sua proposta, conforme a{" "}
        <Link href="/privacidade" className="underline">
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  )
}
