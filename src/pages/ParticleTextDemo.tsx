import { ParticleTextEffect } from "@/components/ui/particle-text-effect";
import SEOHead from "../components/SEOHead";

export default function ParticleTextDemo() {
  return (
    <>
      <SEOHead
        title="Particle demo — Scanified"
        description="Internal particle text playground."
        keywords="demo"
        robots="noindex, nofollow"
      />
      <ParticleTextEffect />
    </>
  );
}
