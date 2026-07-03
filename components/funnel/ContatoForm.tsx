"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { IMaskInput } from "react-imask"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buscarCEP } from "@/lib/viacep"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { BRAND } from "@/lib/brand"

function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "")
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i)
  let rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  if (rest !== Number(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  return rest === Number(digits[10])
}

export const contatoSchema = z.object({
  nome: z.string().min(3, "Nome deve ter ao menos 3 caracteres"),
  data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  cpf: z
    .string()
    .min(14, "CPF inválido")
    .refine((v) => validarCPF(v), "CPF inválido"),
  telefone: z.string().min(14, "Telefone inválido"),
  email: z.string().email("E-mail inválido"),
  cep: z.string().min(9, "CEP inválido"),
  logradouro: z.string().min(2, "Logradouro obrigatório"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro obrigatório"),
  cidade: z.string().min(2, "Cidade obrigatória"),
  uf: z.string().length(2, "UF inválida"),
  melhor_horario: z.enum(["manha", "tarde", "noite"]),
  consentimento_lgpd: z.literal(true, {
    message: "Você precisa aceitar os termos para continuar",
  }),
})

export type ContatoFormValues = z.infer<typeof contatoSchema>

interface ContatoFormProps {
  onSubmit: (data: ContatoFormValues) => Promise<void>
  loading?: boolean
  /** Valores iniciais (ex.: dados do cadastro do cliente logado). */
  defaults?: Partial<ContatoFormValues>
}

const HORARIOS = [
  { value: "manha", label: "Manhã (8h–12h)" },
  { value: "tarde", label: "Tarde (12h–18h)" },
  { value: "noite", label: "Noite (18h–21h)" },
]

export function ContatoForm({ onSubmit, loading = false, defaults }: ContatoFormProps) {
  const [cepLoading, setCepLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContatoFormValues>({
    resolver: zodResolver(contatoSchema),
    defaultValues: { melhor_horario: "tarde", ...defaults },
  })

  const horarioSelecionado = watch("melhor_horario")

  async function handleCepBlur(cep: string) {
    const cleaned = cep.replace(/\D/g, "")
    if (cleaned.length !== 8) return
    setCepLoading(true)
    const data = await buscarCEP(cleaned)
    setCepLoading(false)
    if (!data) return
    setValue("logradouro", data.logradouro || "")
    setValue("bairro", data.bairro || "")
    setValue("cidade", data.localidade)
    setValue("uf", data.uf)
  }

  const fieldClass = (error?: { message?: string }) =>
    cn(
      "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 placeholder:text-muted-foreground",
      error && "border-destructive"
    )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Seus dados</h2>
        <p className="text-muted-foreground text-sm">
          Preencha para um especialista entrar em contato.
        </p>
      </div>

      {/* Nome */}
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome completo</Label>
        <Input id="nome" placeholder="Seu nome completo" {...register("nome")} className={fieldClass(errors.nome)} />
        {errors.nome && <p className="text-destructive text-xs">{errors.nome.message}</p>}
      </div>

      {/* Data de nascimento */}
      <div className="space-y-1.5">
        <Label htmlFor="data_nascimento">Data de nascimento</Label>
        <Input id="data_nascimento" type="date" {...register("data_nascimento")} className={fieldClass(errors.data_nascimento)} />
        {errors.data_nascimento && <p className="text-destructive text-xs">{errors.data_nascimento.message}</p>}
      </div>

      {/* CPF */}
      <div className="space-y-1.5">
        <Label htmlFor="cpf">CPF</Label>
        <IMaskInput
          id="cpf"
          mask="000.000.000-00"
          onAccept={(val) => setValue("cpf", String(val), { shouldValidate: true })}
          className={fieldClass(errors.cpf)}
          placeholder="000.000.000-00"
        />
        {errors.cpf && <p className="text-destructive text-xs">{errors.cpf.message}</p>}
      </div>

      {/* Telefone */}
      <div className="space-y-1.5">
        <Label htmlFor="telefone">WhatsApp</Label>
        <IMaskInput
          id="telefone"
          mask="(00) 0 0000-0000"
          onAccept={(val) => setValue("telefone", String(val), { shouldValidate: true })}
          className={fieldClass(errors.telefone)}
          placeholder="(00) 9 0000-0000"
        />
        {errors.telefone && <p className="text-destructive text-xs">{errors.telefone.message}</p>}
      </div>

      {/* E-mail */}
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} className={fieldClass(errors.email)} />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>

      {/* Endereço */}
      <div className="space-y-3 pt-2">
        <p className="text-sm font-semibold">Endereço</p>

        <div className="space-y-1.5">
          <Label htmlFor="end-cep">CEP</Label>
          <div className="relative">
            <IMaskInput
              id="end-cep"
              mask="00000-000"
              onAccept={(val) => {
                setValue("cep", String(val), { shouldValidate: true })
                handleCepBlur(String(val))
              }}
              className={fieldClass(errors.cep)}
              placeholder="00000-000"
            />
            {cepLoading && <Loader2 className="absolute right-3 top-3 w-5 h-5 animate-spin text-muted-foreground" />}
          </div>
          {errors.cep && <p className="text-destructive text-xs">{errors.cep.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="logradouro">Rua / Avenida</Label>
          <Input id="logradouro" placeholder="Logradouro" {...register("logradouro")} className={fieldClass(errors.logradouro)} />
          {errors.logradouro && <p className="text-destructive text-xs">{errors.logradouro.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" placeholder="Nº" {...register("numero")} className={fieldClass(errors.numero)} />
            {errors.numero && <p className="text-destructive text-xs">{errors.numero.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="complemento">Complemento</Label>
            <Input id="complemento" placeholder="Apto, Bloco..." {...register("complemento")} className={fieldClass()} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bairro">Bairro</Label>
          <Input id="bairro" placeholder="Bairro" {...register("bairro")} className={fieldClass(errors.bairro)} />
          {errors.bairro && <p className="text-destructive text-xs">{errors.bairro.message}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" placeholder="Cidade" {...register("cidade")} className={fieldClass(errors.cidade)} />
            {errors.cidade && <p className="text-destructive text-xs">{errors.cidade.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uf">UF</Label>
            <Input id="uf" placeholder="UF" maxLength={2} {...register("uf")} className={cn(fieldClass(errors.uf), "uppercase")} />
            {errors.uf && <p className="text-destructive text-xs">{errors.uf.message}</p>}
          </div>
        </div>
      </div>

      {/* Melhor horário */}
      <div className="space-y-2">
        <Label>Melhor horário para contato</Label>
        <div className="grid grid-cols-3 gap-2">
          {HORARIOS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue("melhor_horario", value as "manha" | "tarde" | "noite")}
              className={cn(
                "rounded-lg border-2 py-2.5 text-xs font-medium transition-all",
                horarioSelecionado === value
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : "border-border text-muted-foreground hover:border-[var(--gold)]/50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* LGPD */}
      <div className="space-y-1.5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("consentimento_lgpd")}
            className="mt-0.5 w-4 h-4 accent-[var(--gold)]"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            Concordo com o tratamento dos meus dados pessoais conforme a{" "}
            <Link href="/privacidade" target="_blank" className="underline text-foreground">
              Política de Privacidade
            </Link>{" "}
            da {BRAND.fullName}, para fins de simulação e contato comercial.
          </span>
        </label>
        {errors.consentimento_lgpd && (
          <p className="text-destructive text-xs">{errors.consentimento_lgpd.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 text-base font-semibold bg-[var(--gold)] text-[var(--gold-foreground)] hover:bg-[var(--gold-dark)]"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar e falar com especialista"}
      </Button>
    </form>
  )
}
