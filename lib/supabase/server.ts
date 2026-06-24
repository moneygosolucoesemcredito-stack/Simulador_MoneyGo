import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { BRAND } from "@/lib/brand"

/**
 * Cliente Supabase para Server Components / Route Handlers.
 * No Next 16 `cookies()` é assíncrono — por isso o await.
 */
export async function criarSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(
    BRAND.supabase.url,
    BRAND.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Chamado de um Server Component — pode ser ignorado quando há
            // proxy.ts cuidando do refresh da sessão.
          }
        },
      },
    }
  )
}
