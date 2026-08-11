/**
 * Tradução dos erros do Supabase Auth que aparecem no fluxo de recuperação de
 * senha. Fica fora do componente para poder ser testado sem montar a página.
 */

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
    return "Sua sessão de recuperação expirou. Solicite um novo link."
  }
  return "Não foi possível redefinir a senha. Tente novamente ou solicite um novo link."
}

/**
 * Normaliza o motivo de um link de recuperação recusado. Aceita tanto os
 * códigos do Supabase (`otp_expired`, `access_denied`) quanto os códigos curtos
 * que o `/auth/confirm` repassa na query.
 */
export function motivoDoLink(codigo: string | null | undefined): "expirado" | "invalido" {
  if (!codigo) return "invalido"
  return /expired|expirado/i.test(codigo) ? "expirado" : "invalido"
}

export const MENSAGEM_LINK: Record<"expirado" | "invalido", string> = {
  expirado: "Este link já expirou. Solicite um novo para continuar.",
  invalido: "Este link é inválido ou já foi utilizado. Solicite um novo para continuar.",
}
