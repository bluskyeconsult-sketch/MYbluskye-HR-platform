import HeroSection from '../components/HeroSection';
import FeaturedResources from '../components/FeaturedResources';
import CTASection from '../components/CTASection';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <FeaturedResources />
      <CTASection />
    </main>
  );
}
