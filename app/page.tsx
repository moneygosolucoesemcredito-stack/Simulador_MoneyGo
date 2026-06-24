import { Hero } from "@/components/landing/Hero"
import { ProductCards } from "@/components/landing/ProductCards"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Partners } from "@/components/landing/Partners"
import { Faq } from "@/components/landing/Faq"
import { Footer } from "@/components/landing/Footer"
import Image from "next/image"
import Link from "next/link"
import { BRAND } from "@/lib/brand"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="absolute top-0 left-0 right-0 z-20 px-4 h-16 sm:h-20 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link href="/" className="shrink-0">
          <Image
            src={BRAND.logos.fullWhite}
            alt={BRAND.fullName}
            width={BRAND.logos.width}
            height={BRAND.logos.height}
              unoptimized
            priority
            className="h-9 w-auto sm:h-11"
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
