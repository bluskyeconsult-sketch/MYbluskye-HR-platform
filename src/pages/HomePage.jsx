import HeroSection from '../components/HeroSection';
import ScrollingBanner from '../components/ScrollingBanner';
import FeaturedResources from '../components/FeaturedResources';
import CTASection from '../components/CTASection';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <ScrollingBanner />
      <HeroSection />
      <FeaturedResources />
      <CTASection />
    </main>
  );
}
