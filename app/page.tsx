import { Hero } from "@/components/landing/Hero"
import { ProductCards } from "@/components/landing/ProductCards"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Partners } from "@/components/landing/Partners"
import { Faq } from "@/components/landing/Faq"
import { Footer } from "@/components/landing/Footer"
import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="absolute top-0 left-0 right-0 z-20 px-4 h-16 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link href="/">
          <Image
            src="/logo.svg"
            alt="MoneyGo Soluções em Crédito"
            width={140}
            height={38}
            priority
          />
        </Link>
        <Link
          href="#faq"
          className="text-white/70 hover:text-white text-sm transition-colors hidden sm:block"
        >
          Dúvidas frequentes
        </Link>
      </header>

      <main className="flex-1">
        <Hero />
        <Partners />
        <ProductCards />
        <HowItWorks />
        <Faq />
      </main>

      <Footer />
    </div>
  )
}
