"use client"

import CookieConsent from "react-cookie-consent"
import Link from "next/link"

export function CookieBanner() {
  return (
    <CookieConsent
      location="bottom"
      buttonText="Aceitar cookies"
      declineButtonText="Recusar"
      enableDeclineButton
      cookieName="moneygo_cookie_consent"
      style={{ background: "#0A0A0A", fontSize: "13px", zIndex: 9999 }}
      buttonStyle={{
        background: "var(--gold)",
        color: "var(--gold-foreground)",
        fontWeight: "600",
        borderRadius: "6px",
        fontSize: "13px",
      }}
      declineButtonStyle={{
        background: "transparent",
        border: "1px solid #555",
        color: "#ccc",
        borderRadius: "6px",
        fontSize: "13px",
      }}
    >
      Utilizamos cookies para melhorar sua experiência e analisar o tráfego.{" "}
      <Link href="/privacidade" className="underline text-[var(--gold)]">
        Saiba mais
      </Link>
      .
    </CookieConsent>
  )
}
