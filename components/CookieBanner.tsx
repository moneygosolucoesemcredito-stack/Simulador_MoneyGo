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
      style={{
        background: "var(--cookie-bg)",
        color: "var(--cookie-fg)",
        borderTop: "1px solid var(--cookie-border)",
        fontSize: "13px",
        zIndex: 9999,
      }}
      buttonStyle={{
        background: "var(--cookie-accept-bg)",
        color: "var(--cookie-accept-fg)",
        fontWeight: "600",
        borderRadius: "6px",
        fontSize: "13px",
      }}
      declineButtonStyle={{
        background: "transparent",
        border: "1px solid var(--cookie-decline-border)",
        color: "var(--cookie-decline-fg)",
        borderRadius: "6px",
        fontSize: "13px",
      }}
    >
      Utilizamos cookies para melhorar sua experiência e analisar o tráfego.{" "}
      <Link href="/privacidade" className="underline text-[var(--cookie-link)]">
        Saiba mais
      </Link>
      .
    </CookieConsent>
  )
}
