/**
 * Regras compartilhadas do fluxo "esqueci minha senha" do parceiro.
 *
 * O link que chega no e-mail pode ter três formatos, dependendo do template
 * configurado no Supabase — e cada um falha de um jeito diferente:
 *
 *  - `?token_hash=…&type=recovery` → validado no servidor por `/auth/confirm`
 *    (template recomendado: funciona em qualquer navegador/aparelho);
 *  - `?code=…` (PKCE)              → trocado por sessão, também em
 *    `/auth/confirm`, usando o verificador guardado em cookie;
 *  - `#access_token=…` (implícito) → só o browser enxerga o fragmento, então
 *    quem resolve é o `detectSessionInUrl` do cliente Supabase.
 *
 * Quando o Supabase recusa o token, o erro vem na query OU no fragmento — por
 * isso as duas fontes precisam ser lidas antes de decidir que o link é ruim.
 */

/** Para onde o parceiro vai depois que o link é validado. */
export const CAMINHO_REDEFINICAO = "/redefinir-senha"

/**
 * Caminho interno seguro para redirecionar. Aceita só rota relativa: um
 * `//evil.com` ou `/\evil.com` vira URL absoluta no browser e transformaria o
 * link de recuperação em redirect aberto para fora do site.
 */
export function caminhoInternoSeguro(
  valor: string | null | undefined,
  padrao: string = CAMINHO_REDEFINICAO
): string {
  if (typeof valor !== "string") return padrao
  const bruto = valor.trim()
  if (!bruto.startsWith("/")) return padrao
  if (bruto.startsWith("//") || bruto.startsWith("/\\")) return padrao
  // Só ASCII imprimível sem espaço: tab, quebra de linha e caractere de
  // controle são normalizados pelo browser e serviriam para burlar a checagem
  // acima (ex.: barra + tab + barra vira "//evil.com").
  if (!/^[!-~]+$/.test(bruto)) return padrao
  return bruto
}

/** Mesmo caminho, já com o código do erro anexado na query. */
export function caminhoComErro(destino: string, codigo: string): string {
  const url = new URL(destino, "http://interno")
  url.searchParams.set("error_code", codigo)
  return `${url.pathname}${url.search}`
}

const MENSAGEM_PADRAO =
  "Não foi possível validar este link. Solicite um novo link de recuperação."

/**
 * Códigos que o Supabase devolve no `error_code`. A mensagem é sempre em
 * português e diz o que fazer — o texto original vem em inglês e genérico.
 */
const MENSAGENS: Record<string, string> = {
  otp_expired:
    "Este link expirou. Por segurança ele vale por pouco tempo — solicite um novo.",
  access_denied:
    "Este link já foi usado ou expirou. Solicite um novo link de recuperação.",
  flow_state_expired:
    "Este link expirou. Solicite um novo link de recuperação.",
  flow_state_not_found:
    "Este link precisa ser aberto no mesmo navegador em que você pediu a recuperação. Solicite um novo link e abra-o neste aparelho.",
  bad_code_verifier:
    "Este link precisa ser aberto no mesmo navegador em que você pediu a recuperação. Solicite um novo link e abra-o neste aparelho.",
  validation_failed:
    "O link veio incompleto — alguns aplicativos de e-mail cortam o endereço. Copie o link inteiro ou solicite um novo.",
  over_email_send_rate_limit:
    "Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit:
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  same_password: "A nova senha precisa ser diferente da senha atual.",
  weak_password: "Senha muito fraca. Use uma combinação mais difícil de adivinhar.",
  session_expired:
    "A sessão de recuperação expirou antes de você salvar. Solicite um novo link.",
  sem_credencial:
    "Abra o link que enviamos por e-mail para definir uma nova senha.",
}

/** Texto em português para um código de erro do Supabase. */
export function mensagemDoErro(codigo: string | null | undefined): string {
  if (!codigo) return MENSAGEM_PADRAO
  return MENSAGENS[codigo] ?? MENSAGEM_PADRAO
}

export interface ErroRecuperacao {
  codigo: string
  mensagem: string
}

function paramsDe(fonte: string, prefixo: string): URLSearchParams {
  const limpo = fonte.startsWith(prefixo) ? fonte.slice(prefixo.length) : fonte
  return new URLSearchParams(limpo)
}

/**
 * Erro reportado pelo Supabase na URL de retorno. Procura primeiro na query
 * (fluxo token_hash/PKCE) e depois no fragmento (fluxo implícito).
 */
export function extrairErroDaUrl(
  search: string = "",
  hash: string = ""
): ErroRecuperacao | null {
  const fontes = [paramsDe(search, "?"), paramsDe(hash, "#")]
  for (const params of fontes) {
    const codigo = params.get("error_code") ?? params.get("error")
    if (!codigo) continue
    return { codigo, mensagem: mensagemDoErro(codigo) }
  }
  return null
}

/**
 * Se a URL carrega alguma credencial de recuperação. Sem nenhuma e sem sessão
 * ativa, não há o que esperar: a página já pode pedir um link novo em vez de
 * ficar "validando" até estourar o tempo.
 */
export function temCredencialNaUrl(search: string = "", hash: string = ""): boolean {
  const chaves = ["token_hash", "code", "access_token", "refresh_token", "token"]
  const fontes = [paramsDe(search, "?"), paramsDe(hash, "#")]
  return fontes.some((params) => chaves.some((chave) => params.get(chave)))
}
