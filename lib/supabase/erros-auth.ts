/**
 * Tradução dos erros do Supabase Auth nos fluxos em que o usuário chega por um
 * link de e-mail (recuperação de senha e convite de parceiro). Fica fora dos
 * componentes para poder ser testado sem montar a página.
 */

/** De onde o usuário veio — muda só o texto, nunca a lógica. */
export type ContextoDoLink = "recuperacao" | "convite"

/** Erros de `auth.updateUser({ password })` que o usuário resolve sozinho. */
export function mensagemDoErroDeSenha(
  codigo: string | undefined,
  mensagem: string
): string {
  if (codigo === "same_password" || /should be different/i.test(mensagem)) {
    return "A nova senha precisa ser diferente da atual."
  }
  if (codigo === "weak_password" || /weak.?password|password should be/i.test(mensagem)) {
    return "Senha muito fraca. Use ao menos 8 caracteres, misturando letras e números."
  }
  if (codigo === "session_not_found" || /session|jwt|expired/i.test(mensagem)) {
    return "Sua sessão expirou. Peça um novo link para continuar."
  }
  return "Não foi possível salvar a senha. Tente novamente ou peça um novo link."
}

/**
 * Normaliza o motivo de um link recusado. Aceita tanto os códigos do Supabase
 * (`otp_expired`, `access_denied`) quanto os códigos curtos que o
 * `/auth/confirm` repassa na query.
 */
export function motivoDoLink(codigo: string | null | undefined): "expirado" | "invalido" {
  if (!codigo) return "invalido"
  return /expired|expirado/i.test(codigo) ? "expirado" : "invalido"
}

const MENSAGENS: Record<ContextoDoLink, Record<"expirado" | "invalido", string>> = {
  recuperacao: {
    expirado: "Este link já expirou. Solicite um novo para continuar.",
    invalido:
      "Este link é inválido ou já foi utilizado. Solicite um novo para continuar.",
  },
  convite: {
    expirado:
      "Este convite já expirou. Peça à administração para enviar um novo convite.",
    invalido:
      "Este convite é inválido ou já foi utilizado. Se você já criou sua senha, entre normalmente pelo login.",
  },
}

/** Texto exibido quando o link não vale mais, ajustado ao contexto. */
export function mensagemDoLink(
  motivo: "expirado" | "invalido",
  contexto: ContextoDoLink = "recuperacao"
): string {
  return MENSAGENS[contexto][motivo]
}
