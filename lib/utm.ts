import type { TrackingData } from "@/types"

const UTM_KEYS: (keyof TrackingData)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
]
const SESSION_KEY = "moneygo_tracking"

export function captureUTMs(): TrackingData {
  if (typeof window === "undefined") return {}

  const params = new URLSearchParams(window.location.search)
  const data: TrackingData = {}

  for (const key of UTM_KEYS) {
    const value = params.get(key)
    if (value) data[key] = value
  }

  if (document.referrer) data.referrer = document.referrer

  const existing = loadUTMs()
  // Only overwrite if new params exist (first touch attribution)
  const merged = Object.keys(data).length > 0 ? data : existing

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged))
    } catch {}
  }

  return merged
}

export function loadUTMs(): TrackingData {
  if (typeof window === "undefined") return {}
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as TrackingData) : {}
  } catch {
    return {}
  }
}
