import { DefinirSenhaForm } from "@/components/auth/DefinirSenhaForm"

/**
 * Destino do convite de parceiro. O link do e-mail passa pelo /auth/confirm
 * (`type=invite`), que valida o token e grava a sessão; aqui o parceiro só
 * escolhe a senha de acesso ao painel.
 */
export default function CriarSenhaPage() {
  return (
    <DefinirSenhaForm
      contexto="convite"
      titulo="Bem-vindo à MoneyGo"
      subtitulo="Crie uma senha para acessar a área do parceiro."
      textoValidando="Validando seu convite…"
      tituloLinkInvalido="Convite inválido ou expirado"
      saida={{ href: "/operador/login", label: "Ir para o login" }}
      textoBotao="Criar senha e entrar"
      tituloSucesso="Conta criada!"
    />
  )
}
