import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  MapPin,
  BarChart3,
  Bell,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  ScanLine,
  Truck,
  Radar,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';
import SEOHead from '../components/SEOHead';
import { fetchPublicSubscriptionPlans } from '../services/publicPlansService';

/**
 * Design-exploration variant (v3) — dark "operations ecosystem" aesthetic.
 * Self-contained: ships its own nav/footer instead of MarketingLayout/NavigationBar,
 * which are tuned for the light marketing theme. Not linked from primary nav.
 */

const dark = {
  bg: '#060B14',
  bgElevated: '#0A121F',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  teal: '#40B5AD',
  tealLight: '#5FCDC5',
  tealHover: '#2E9B94',
  tealGlow: 'rgba(64, 181, 173, 0.35)',
};

const monoStack = '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
];

function GlowBlob({ className, color, size, initial, animate, duration }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(60px)',
      }}
      initial={initial}
      animate={reduceMotion ? initial : animate}
      transition={{ duration, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
    />
  );
}

function EcosystemVisual({ appName, reduceMotion }) {
  // radiusPct: distance from center as a % of the container box (keeps nodes inside bounds at any size)
  const nodes = [
    { icon: Truck, label: 'Depot', angle: -50, radiusPct: 29 },
    { icon: MapPin, label: 'Customer site', angle: 20, radiusPct: 32 },
    { icon: ScanLine, label: 'Scan', angle: 95, radiusPct: 29 },
    { icon: Bell, label: 'Alerts', angle: 160, radiusPct: 31 },
    { icon: BarChart3, label: 'Analytics', angle: 220, radiusPct: 30 },
    { icon: Shield, label: 'Compliance', angle: 285, radiusPct: 29 },
  ];

  return (
    <div
      className="relative w-full aspect-square max-w-[520px] mx-auto"
      role="img"
      aria-label={`${appName} ecosystem — depots, customer sites, scanning, alerts, analytics, and compliance connected around a central asset ledger`}
    >
      {/* Rings */}
      {[0.42, 0.66, 0.9].map((scale, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute inset-0 m-auto rounded-full border"
          style={{
            width: `${scale * 100}%`,
            height: `${scale * 100}%`,
            borderColor: 'rgba(64, 181, 173, 0.16)',
            borderStyle: i === 1 ? 'dashed' : 'solid',
          }}
        />
      ))}

      {/* Center hub */}
      <motion.div
        aria-hidden
        className="absolute inset-0 m-auto w-24 h-24 rounded-2xl flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${dark.teal}, ${dark.tealHover})`,
          boxShadow: `0 0 50px ${dark.tealGlow}`,
        }}
        animate={reduceMotion ? {} : { boxShadow: [`0 0 30px ${dark.tealGlow}`, `0 0 60px ${dark.tealGlow}`, `0 0 30px ${dark.tealGlow}`] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Package className="w-10 h-10 text-white" />
      </motion.div>

      {/* Orbiting nodes */}
      {nodes.map(({ icon: Icon, label, angle, radiusPct }, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 50 + radiusPct * Math.cos(rad);
        const y = 50 + radiusPct * Math.sin(rad);
        return (
          <motion.div
            key={label}
            className="absolute flex flex-col items-center gap-1.5"
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.3 + i * 0.08 }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center border"
              style={{ background: dark.bgElevated, borderColor: dark.borderStrong }}
            >
              <Icon className="w-5 h-5" style={{ color: dark.tealLight }} />
            </div>
            <span
              className="text-[10px] tracking-wide uppercase whitespace-nowrap"
              style={{ color: dark.textMuted, fontFamily: monoStack }}
            >
              {label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function SectionKicker({ children }) {
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs uppercase tracking-widest mb-4"
      style={{
        borderColor: 'rgba(64, 181, 173, 0.3)',
        background: 'rgba(64, 181, 173, 0.08)',
        color: dark.tealLight,
        fontFamily: monoStack,
      }}
    >
      <Radar className="w-3.5 h-3.5" aria-hidden />
      {children}
    </span>
  );
}

function GlassCard({ children, className = '', highlighted = false }) {
  return (
    <div
      className={`rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${className}`}
      style={{
        background: highlighted ? 'rgba(64, 181, 173, 0.07)' : dark.surface,
        borderColor: highlighted ? 'rgba(64, 181, 173, 0.4)' : dark.border,
        boxShadow: highlighted ? `0 0 40px ${dark.tealGlow}` : 'none',
      }}
    >
      {children}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, index, reduceMotion }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : index * 0.06 }}
    >
      <GlassCard className="h-full hover:border-white/20">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(64, 181, 173, 0.12)', border: `1px solid ${dark.border}` }}
        >
          <Icon className="w-5 h-5" style={{ color: dark.tealLight }} />
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: dark.textPrimary }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: dark.textSecondary }}>
          {description}
        </p>
      </GlassCard>
    </motion.div>
  );
}

export default function CyberLandingPage() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(true);

  const appName = assetConfig.appName || 'Scanified';
  const assetSingular = assetConfig.assetTypeSingular || 'asset';
  const assetPlural = assetConfig.assetTypePlural || 'assets';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPricingLoading(true);
      const { tiers } = await fetchPublicSubscriptionPlans();
      if (!cancelled) {
        setPricingTiers(tiers);
        setPricingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const features = useMemo(
    () => [
      {
        icon: MapPin,
        title: 'Real-Time Location Tracking',
        description: `See where every ${assetSingular} is across depots and customer sites with scanning and location-aware workflows.`,
      },
      {
        icon: BarChart3,
        title: 'Advanced Analytics',
        description: 'Actionable dashboards for usage patterns, delivery times, and inventory optimization.',
      },
      {
        icon: Bell,
        title: 'Smart Alerts',
        description: 'Instant notifications for low inventory, maintenance, and unauthorized movements.',
      },
      {
        icon: Shield,
        title: 'Compliance & Safety',
        description: 'Automated safety checks, certification tracking, and audit-ready reports.',
      },
      {
        icon: Zap,
        title: 'Automated Workflows',
        description: 'Streamline refill requests, delivery scheduling, and customer notifications.',
      },
      {
        icon: Package,
        title: 'Inventory Management',
        description: `Optimize stock levels and improve ${assetPlural} utilization across locations.`,
      },
    ],
    [assetSingular, assetPlural]
  );

  const steps = [
    { icon: ScanLine, title: 'Scan', description: `Every ${assetSingular} gets a barcode scan the moment it moves — no manual logs.` },
    { icon: Radar, title: 'Track', description: `Live location and status across depots, trucks, and customer sites.` },
    { icon: CheckCircle2, title: 'Bill', description: 'Rentals, transfers, and usage roll straight into accurate invoices.' },
  ];

  const marqueeItems = ['Scan', 'Transfer', 'Rent', 'Bill', 'Audit', 'Comply', 'Track', 'Alert'];

  return (
    <div
      className="cyber-landing-root min-h-screen w-full overflow-x-hidden"
      style={{ background: dark.bg, color: dark.textPrimary, fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <SEOHead
        title={`${appName} — Operations Ecosystem (Design Preview)`}
        description="Design exploration: a dark, ecosystem-styled variant of the Scanified landing page. Not the live production page."
        robots="noindex, nofollow"
      />

      {/* Nav */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(6, 11, 20, 0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? `1px solid ${dark.border}` : '1px solid transparent',
        }}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/landing-dark')}
            className="flex items-center gap-2 font-semibold tracking-tight cursor-pointer"
            style={{ color: dark.textPrimary }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${dark.teal}, ${dark.tealHover})` }}
            >
              <Package className="w-4 h-4 text-white" />
            </div>
            {appName}
          </button>

          <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium transition-colors hover:text-white"
                style={{ color: dark.textSecondary }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer hover:text-white"
              style={{ color: dark.textSecondary }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => navigate('/create-organization')}
              className="text-sm font-semibold px-4 py-2.5 rounded-lg text-white transition-all cursor-pointer hover:brightness-110"
              style={{ background: dark.teal, boxShadow: `0 4px 20px ${dark.tealGlow}` }}
            >
              Start free trial
            </button>
          </div>

          <button
            type="button"
            className="md:hidden p-2 -mr-2 cursor-pointer"
            style={{ color: dark.textPrimary }}
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div
            className="md:hidden px-4 pb-4 flex flex-col gap-3"
            style={{ background: 'rgba(6, 11, 20, 0.98)', borderTop: `1px solid ${dark.border}` }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium py-2"
                style={{ color: dark.textSecondary }}
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => navigate('/create-organization')}
              className="text-sm font-semibold px-4 py-3 rounded-lg text-white mt-2 cursor-pointer"
              style={{ background: dark.teal }}
            >
              Start free trial
            </button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative pt-40 pb-24 md:pt-48 md:pb-32">
        <GlowBlob
          className="-top-20 -left-40"
          color="rgba(64, 181, 173, 0.35)"
          size={480}
          initial={{ x: 0, y: 0 }}
          animate={{ x: 40, y: 30 }}
          duration={9}
        />
        <GlowBlob
          className="top-40 -right-40"
          color="rgba(95, 205, 197, 0.25)"
          size={420}
          initial={{ x: 0, y: 0 }}
          animate={{ x: -30, y: -20 }}
          duration={11}
        />
        {/* Perspective grid floor */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-64 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(64,181,173,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(64,181,173,0.12) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(to top, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
          }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <div>
              <SectionKicker>Operations Ecosystem</SectionKicker>
              <motion.h1
                className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.08] mb-5 tracking-tight"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.5 }}
              >
                Every {assetSingular}, every depot,{' '}
                <span
                  style={{
                    background: `linear-gradient(135deg, ${dark.tealLight}, ${dark.teal})`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  one connected system.
                </span>
              </motion.h1>
              <motion.p
                className="text-lg mb-8 max-w-xl"
                style={{ color: dark.textSecondary }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.1 }}
              >
                {organization?.name
                  ? `Built for teams like ${organization.name} — scan, transfer, and bill ${assetPlural} in one place.`
                  : `Industrial gas and asset operations on one platform — scan, transfer, rent, and bill without the spreadsheet chase.`}
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.18 }}
              >
                <button
                  type="button"
                  onClick={() => navigate('/create-organization')}
                  className="inline-flex items-center justify-center gap-2 text-base font-semibold px-8 h-12 rounded-lg text-white transition-all cursor-pointer hover:brightness-110"
                  style={{ background: dark.teal, boxShadow: `0 8px 30px ${dark.tealGlow}` }}
                >
                  Start free trial
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/demo')}
                  className="cyber-outline-btn inline-flex items-center justify-center text-base font-semibold px-8 h-12 rounded-lg border transition-colors cursor-pointer hover:bg-white/5"
                  style={{ borderColor: dark.borderStrong, color: dark.textPrimary }}
                >
                  Watch demo
                </button>
              </motion.div>
              <p className="text-sm mt-5" style={{ color: dark.textMuted, fontFamily: monoStack }}>
                No credit card · 7-day trial · Cancel anytime
              </p>
            </div>

            <EcosystemVisual appName={appName} reduceMotion={!!reduceMotion} />
          </div>
        </div>

        {/* Capability marquee */}
        <div
          className="mt-20 border-y overflow-hidden py-4"
          style={{ borderColor: dark.border }}
          aria-hidden={false}
        >
          <div className={`flex gap-10 whitespace-nowrap ${reduceMotion ? '' : 'cyber-marquee'}`}>
            {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="text-sm uppercase tracking-widest flex items-center gap-2"
                style={{ color: dark.textMuted, fontFamily: monoStack }}
              >
                <span style={{ color: dark.tealLight }}>●</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <SectionKicker>Features</SectionKicker>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: dark.textPrimary }}>
              Everything you need to run the fleet
            </h2>
            <p className="text-lg" style={{ color: dark.textSecondary }}>
              Tools designed for {assetPlural} tracking and day-to-day operations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} index={index} reduceMotion={!!reduceMotion} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative py-24 scroll-mt-20" style={{ background: dark.bgElevated }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <SectionKicker>How it works</SectionKicker>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: dark.textPrimary }}>
              From scan to invoice
            </h2>
            <p className="text-lg" style={{ color: dark.textSecondary }}>
              Three steps replace the spreadsheet chase.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto relative">
            <div
              aria-hidden
              className="hidden md:block absolute top-11 left-[16.5%] right-[16.5%] h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${dark.teal}, transparent)` }}
            />
            {steps.map((step, i) => (
              <div key={step.title} className="relative text-center">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center relative z-10"
                  style={{
                    background: dark.bg,
                    border: `1px solid ${dark.borderStrong}`,
                    boxShadow: `0 0 24px ${dark.tealGlow}`,
                  }}
                >
                  <step.icon className="w-6 h-6" style={{ color: dark.tealLight }} />
                </div>
                <span
                  className="text-xs uppercase tracking-widest"
                  style={{ color: dark.tealLight, fontFamily: monoStack }}
                >
                  Step {i + 1}
                </span>
                <h3 className="text-xl font-semibold mt-2 mb-2" style={{ color: dark.textPrimary }}>
                  {step.title}
                </h3>
                <p className="text-sm max-w-xs mx-auto" style={{ color: dark.textSecondary }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-24 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <SectionKicker>Pricing</SectionKicker>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: dark.textPrimary }}>
              Simple, transparent pricing
            </h2>
            <p className="text-lg" style={{ color: dark.textSecondary }}>
              Start with a 7-day free trial. Upgrade when your team is ready.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {pricingLoading && (
              <p className="col-span-full text-center" style={{ color: dark.textSecondary }}>
                Loading plans…
              </p>
            )}
            {!pricingLoading && pricingTiers.length === 0 && (
              <p className="col-span-full text-center" style={{ color: dark.textSecondary }}>
                Pricing plans are not published yet. Active plans from Owner portal → Plans appear here.
              </p>
            )}
            {pricingTiers.map((tier) => (
              <GlassCard key={tier.id} highlighted={!!tier.highlighted} className="flex flex-col">
                {tier.highlighted && (
                  <span
                    className="w-fit mb-3 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ background: dark.teal }}
                  >
                    Most popular
                  </span>
                )}
                <h3 className="text-xl font-semibold mb-1" style={{ color: dark.textPrimary }}>
                  {tier.name}
                </h3>
                <p className="text-sm mb-4" style={{ color: dark.textSecondary }}>
                  {tier.description}
                </p>
                <p className="mb-5" style={{ fontFamily: monoStack }}>
                  <span className="text-3xl font-bold" style={{ color: dark.textPrimary }}>
                    ${tier.price}
                  </span>
                  <span style={{ color: dark.textMuted }}> / {tier.priceInterval}</span>
                </p>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((feature, fi) => (
                    <li
                      key={`${tier.id}-f-${fi}`}
                      className="flex items-start gap-2 text-sm"
                      style={{ color: dark.textSecondary }}
                    >
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: dark.tealLight }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate('/create-organization')}
                  className="w-full text-sm font-semibold py-3 rounded-lg transition-all cursor-pointer hover:brightness-110"
                  style={
                    tier.highlighted
                      ? { background: dark.teal, color: '#fff', boxShadow: `0 4px 20px ${dark.tealGlow}` }
                      : { background: 'transparent', color: dark.textPrimary, border: `1px solid ${dark.borderStrong}` }
                  }
                >
                  Start free trial
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24">
        <div className="container mx-auto px-4">
          <div
            className="max-w-4xl mx-auto text-center rounded-3xl border p-12 md:p-16 relative overflow-hidden"
            style={{ borderColor: dark.borderStrong, background: 'rgba(64, 181, 173, 0.06)' }}
          >
            <GlowBlob
              className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              color="rgba(64, 181, 173, 0.3)"
              size={400}
              initial={{ scale: 1 }}
              animate={{ scale: 1.15 }}
              duration={6}
            />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: dark.textPrimary }}>
                Ready to see it running on your fleet?
              </h2>
              <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: dark.textSecondary }}>
                Start a 7-day trial or watch a walkthrough first — no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/create-organization')}
                  className="inline-flex items-center justify-center gap-2 text-base font-semibold px-8 h-12 rounded-lg text-white transition-all cursor-pointer hover:brightness-110"
                  style={{ background: dark.teal, boxShadow: `0 8px 30px ${dark.tealGlow}` }}
                >
                  Start free trial
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/demo')}
                  className="cyber-outline-btn inline-flex items-center justify-center text-base font-semibold px-8 h-12 rounded-lg border transition-colors cursor-pointer hover:bg-white/5"
                  style={{ borderColor: dark.borderStrong, color: dark.textPrimary }}
                >
                  Watch demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10" style={{ borderColor: dark.border }}>
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold" style={{ color: dark.textPrimary }}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${dark.teal}, ${dark.tealHover})` }}
            >
              <Package className="w-3.5 h-3.5 text-white" />
            </div>
            {appName}
          </div>
          <div className="flex gap-6 text-sm" style={{ color: dark.textMuted }}>
            <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms-of-service" className="hover:text-white transition-colors">Terms</a>
            <a href="/contact-us" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-sm" style={{ color: dark.textMuted }}>
            © {new Date().getFullYear()} {appName}
          </p>
        </div>
      </footer>

      <style>{`
        /* src/tailwind.css defines an unlayered "h1, h2, h3, h4 { color: var(--text-main); font-family: var(--font-serif) }"
           rule that beats inherited color/font on any heading without its own explicit style. Override it here
           with a higher-specificity selector scoped to this page instead of touching the shared stylesheet. */
        .cyber-landing-root h1,
        .cyber-landing-root h2,
        .cyber-landing-root h3,
        .cyber-landing-root h4 {
          color: inherit;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          line-height: inherit;
          letter-spacing: inherit;
        }
        /* Same file also has an unlayered "button { background-color: var(--accent); border: none; ... }" rule
           that picks up the signed-in org's white-label accent color on any button lacking its own explicit
           inline background, and forces border-style:none (which no Tailwind border-width utility overrides).
           Tailwind's own utility classes already win on padding/radius/font-weight/color against that
           low-specificity rule, so only these two properties need neutralizing here. */
        .cyber-landing-root button {
          background-color: transparent;
        }
        .cyber-landing-root button:hover {
          background-color: transparent;
        }
        /* Only the outline buttons want a real border; scoping border-style narrowly avoids
           reintroducing a border on buttons that never asked for one. */
        .cyber-landing-root .cyber-outline-btn {
          border-style: solid;
        }
        /* Same file also has ".sidebar, .nav, nav { background: var(--bg-sidebar) !important; ... }" —
           forces a white bg onto any bare <nav> tag via !important, which even inline styles can't beat.
           Only a scoped rule that is itself !important (and more specific) can win here. */
        .cyber-landing-root nav {
          background: transparent !important;
          color: inherit !important;
        }
        .cyber-marquee {
          width: max-content;
          animation: cyber-marquee-scroll 30s linear infinite;
        }
        @keyframes cyber-marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
