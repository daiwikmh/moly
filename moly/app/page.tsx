import { Navigation } from "@/app/components/landing/navigation";
import { HeroSection } from "@/app/components/landing/hero-section";
import { HowItWorksSection } from "@/app/components/landing/how-it-works-section";
import { DevelopersSection } from "@/app/components/landing/developers-section";
import { FooterSection } from "@/app/components/landing/footer-section";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <Navigation />
      <HeroSection />
      <HowItWorksSection />
      <DevelopersSection />
      <FooterSection />
    </main>
  );
}
