import { DefinirSenhaForm } from "@/components/auth/DefinirSenhaForm"

export default function RedefinirSenhaPage() {
  return (
    <DefinirSenhaForm
      contexto="recuperacao"
      titulo="Definir nova senha"
      subtitulo="Escolha uma nova senha para a sua conta."
      textoValidando="Validando link de recuperação…"
      tituloLinkInvalido="Link inválido ou expirado"
      saida={{ href: "/recuperar-senha", label: "Solicitar novo link" }}
      textoBotao="Salvar nova senha"
      tituloSucesso="Senha redefinida!"
    />
  )
}
