"use client"

import { useEffect } from "react"
import { captureUTMs } from "@/lib/utm"
import { useFunnelStore } from "@/stores/funnel-store"

export function UTMCapture() {
  const setTracking = useFunnelStore((s) => s.setTracking)

  useEffect(() => {
    const utms = captureUTMs()
    setTracking(utms)
  }, [setTracking])

  return null
}
