import { redirect } from "next/navigation"

// O painel do operador passou para /operador (protegido por login).
export default function SimularRedirect() {
  redirect("/operador")
}
