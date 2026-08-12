/**
 * Identidade do colaborador logado (área do operador).
 *
 * O nome vem, em ordem: da coluna `nome` da tabela `operadores` — preenchida
 * no mesmo passo em que o parceiro entra na allowlist —, depois do
 * `user_metadata` do Supabase Auth, que só existe quando alguém o preencheu à
 * mão. Sem nenhum dos dois, o e-mail continua sendo a identificação: é melhor
 * o colaborador ver a própria conta do que uma saudação genérica.
 *
 * A `operadores` vem primeiro porque é o único lugar onde o nome é registrado
 * naturalmente: quem convida um parceiro já precisa inseri-lo lá para liberar
 * o painel. Convites do dashboard do Supabase não carregam metadata nenhum.
 */

/** Formato mínimo do usuário do Supabase de que precisamos aqui. */
export interface UsuarioLogado {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

/** Chaves de nome aceitas, na ordem em que são procuradas no metadata. */
const CHAVES_NOME = ["nome", "full_name", "name", "nome_completo", "display_name"] as const

function textoLimpo(valor: unknown): string | null {
  if (typeof valor !== "string") return null
  const limpo = valor.trim().replace(/\s+/g, " ")
  return limpo.length > 0 ? limpo : null
}

/** Nome completo do colaborador, se algum campo do metadata trouxer. */
export function nomeColaborador(usuario: UsuarioLogado | null | undefined): string | null {
  const meta = usuario?.user_metadata
  if (!meta) return null
  for (const chave of CHAVES_NOME) {
    const nome = textoLimpo(meta[chave])
    if (nome) return nome
  }
  return null
}

/** Primeiro nome — é o que cabe no cabeçalho. */
export function primeiroNomeColaborador(
  usuario: UsuarioLogado | null | undefined,
  nomeCadastrado?: string | null
): string | null {
  const nome = textoLimpo(nomeCadastrado) ?? nomeColaborador(usuario)
  return nome ? nome.split(" ")[0] : null
}

/**
 * Saudação do cabeçalho: "Olá, Daiana" quando há nome cadastrado; caindo no
 * e-mail ("Olá, daiana@empresa.com.br") enquanto o nome não existir. Sem
 * usuário identificado devolve string vazia — o cabeçalho não mostra nada.
 *
 * `nomeCadastrado` é a coluna `operadores.nome` e tem precedência sobre o
 * metadata.
 */
export function saudacaoColaborador(
  usuario: UsuarioLogado | null | undefined,
  nomeCadastrado?: string | null
): string {
  const nome = primeiroNomeColaborador(usuario, nomeCadastrado)
  if (nome) return `Olá, ${nome}`
  const email = textoLimpo(usuario?.email)
  return email ? `Olá, ${email}` : ""
}
