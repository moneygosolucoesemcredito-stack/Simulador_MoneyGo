import { createBrowserClient } from "@supabase/ssr"
import { BRAND } from "@/lib/brand"

/** Cliente Supabase para uso em Client Components (browser). */
export function criarSupabaseBrowser() {
  return createBrowserClient(BRAND.supabase.url, BRAND.supabase.anonKey)
}
