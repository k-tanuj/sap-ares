import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { StepsSection } from "@/components/landing/steps-section";
import { BenefitsSection } from "@/components/landing/benefits-section";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans bg-white text-gray-900 selection:bg-gray-900 selection:text-white">
      <Header />
      
      <main>
        <Hero />
        <FeaturesGrid />
        <StepsSection />
        <BenefitsSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
