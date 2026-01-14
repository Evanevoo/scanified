import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  MapPin, 
  BarChart3, 
  Bell, 
  Shield, 
  Zap,
  CheckCircle2,
  ArrowRight,
  Users,
  TrendingUp,
  Clock,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAssetConfig } from '../hooks/useAssetConfig';
import SEOHead, { SEOConfigs } from '../components/SEOHead';
import { ParticleTextEffect } from '@/components/ui/particle-text-effect';

const FeatureCard = ({ icon, title, description, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
    >
      <Card className="border-2 border-black bg-white hover:shadow-xl transition-all duration-300 h-full">
        <CardHeader>
          <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center mb-4">
            <div className="text-white">{icon}</div>
          </div>
          <CardTitle className="text-xl text-black">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base text-gray-700">{description}</CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const StatCard = ({ value, label, icon }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      whileHover={{ scale: 1.05 }}
      className="flex flex-col items-center justify-center p-6 rounded-lg bg-white border-2 border-black"
    >
      <div className="text-black mb-2">{icon}</div>
      <div className="text-4xl font-bold text-black mb-2">{value}</div>
      <div className="text-sm text-gray-700">{label}</div>
    </motion.div>
  );
};

const BenefitItem = ({ text, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex items-start gap-3"
    >
      <CheckCircle2 className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
      <span className="text-gray-700">{text}</span>
    </motion.div>
  );
};

export default function ModernLandingPage() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const { config: assetConfig } = useAssetConfig();
  
  // Words for particle effect background
  const particleWords = [
    assetConfig.appName?.toUpperCase() || "SCANIFIED",
    "TRACKING",
    "ASSETS",
    "MANAGEMENT",
    "ANALYTICS"
  ];

  const features = [
    {
      icon: <MapPin className="w-6 h-6 text-white" />,
      title: "Real-Time Location Tracking",
      description: `Monitor the exact location of every ${assetConfig.assetTypeSingular || 'asset'} in your fleet with GPS-enabled tracking and geofencing capabilities.`
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-white" />,
      title: "Advanced Analytics",
      description: "Get actionable insights with comprehensive dashboards showing usage patterns, delivery times, and inventory optimization."
    },
    {
      icon: <Bell className="w-6 h-6 text-white" />,
      title: "Smart Alerts",
      description: "Receive instant notifications for low inventory, maintenance schedules, and unauthorized movements of your assets."
    },
    {
      icon: <Shield className="w-6 h-6 text-white" />,
      title: "Compliance & Safety",
      description: "Ensure regulatory compliance with automated safety checks, certification tracking, and audit-ready reports."
    },
    {
      icon: <Zap className="w-6 h-6 text-white" />,
      title: "Automated Workflows",
      description: "Streamline operations with automated refill requests, delivery scheduling, and customer notifications."
    },
    {
      icon: <Package className="w-6 h-6 text-white" />,
      title: "Inventory Management",
      description: `Optimize stock levels with predictive analytics, reduce losses, and improve ${assetConfig.assetTypePlural || 'asset'} utilization across locations.`
    }
  ];

  const benefits = [
    `Reduce ${assetConfig.assetTypePlural || 'asset'} loss by up to 40% with real-time tracking`,
    "Improve delivery efficiency and customer satisfaction",
    "Automate compliance reporting and safety checks",
    "Scale operations without increasing overhead costs",
    "Access data from anywhere with cloud-based platform",
    "Integrate seamlessly with existing business systems"
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEOHead config={SEOConfigs.home} />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-24 md:py-32">
        {/* Particle Text Effect Background */}
        <ParticleTextEffect 
          words={particleWords} 
          asBackground={true}
          className="z-0"
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 border-2 border-black bg-white text-black" variant="outline">
                <Zap className="w-3 h-3 mr-1" />
                {organization?.name ? `Used by ${organization.name}` : 'Trusted by 500+ Businesses'}
              </Badge>
            </motion.div>
            <motion.h1 
              className="text-5xl md:text-7xl font-bold text-black mb-20 md:mb-32 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Track Every {assetConfig.assetTypeSingular || 'Asset'},
              <motion.span 
                className="block text-black"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Optimize Every Operation
              </motion.span>
            </motion.h1>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="text-base px-8 h-12 bg-black text-white hover:bg-gray-800" onClick={(e) => { e.preventDefault(); navigate('/create-organization'); }}>
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" variant="outline" className="text-base px-8 h-12 border-2 border-black text-black hover:bg-black hover:text-white" onClick={(e) => { e.preventDefault(); navigate('/demo'); }}>
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>
            <motion.p 
              className="text-sm text-gray-600 mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
            >
              No credit card required • 14-day free trial • Cancel anytime
            </motion.p>
            <motion.div 
              className="flex flex-col items-center gap-4 mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-5 h-5 text-gray-700" />
                <p className="text-sm font-semibold text-gray-700">Download Our Mobile App</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.a
                  href="https://apps.apple.com/ca/app/scanified/id6749334978"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg border-2 border-black hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C1.79 15.25 4.96 7.5 9.38 7.5c1.34 0 2.43.9 3.66.9 1.2 0 1.92-.89 3.25-.89 3.97 0 6.9 5.8 4.76 10.77zm-1.1-15.5c.58-.68.98-1.64.88-2.58-.85.05-1.88.57-2.5 1.28-.55.64-1.03 1.66-.9 2.65.95.07 1.92-.5 2.52-1.35z"/>
                  </svg>
                  <span className="font-semibold">App Store</span>
                </motion.a>
                <motion.a
                  href="https://play.google.com/store/apps/details?id=com.evanevoo.scanifiedandroid&hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg border-2 border-black hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <span className="font-semibold">Google Play</span>
                </motion.a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 border-2 border-black bg-white text-black" variant="outline">Features</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Powerful features designed to streamline your {assetConfig.assetTypePlural || 'gas cylinder'} tracking and asset management operations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-black bg-gray-100">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-black">{assetConfig.appName || 'CylinderTrack'}</span>
              </div>
              <p className="text-sm text-gray-700">
                The complete platform for {assetConfig.assetTypePlural || 'gas cylinder'} and asset tracking.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-gray-700 hover:text-black transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-gray-700 hover:text-black transition-colors">Pricing</a></li>
                <li><a href="#" className="text-sm text-gray-700 hover:text-black transition-colors" onClick={(e) => { e.preventDefault(); navigate('/security'); }}>Security</a></li>
                <li><a href="#" className="text-sm text-gray-700 hover:text-black transition-colors" onClick={(e) => { e.preventDefault(); navigate('/integrations'); }}>Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-gray-700 hover:text-black transition-colors" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>About Us</a></li>
                <li><a href="#" className="text-sm text-gray-700 hover:text-black transition-colors">Careers</a></li>
                <li><a href="#" className="text-sm text-gray-700 hover:text-black transition-colors" onClick={(e) => { e.preventDefault(); navigate('/blog'); }}>Blog</a></li>
                <li><a href="#" className="text-sm text-gray-700 hover:text-black transition-colors" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-gray-700 hover:text-black transition-colors" onClick={(e) => { e.preventDefault(); navigate('/privacy-policy'); }}>Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-gray-700 hover:text-black transition-colors" onClick={(e) => { e.preventDefault(); navigate('/terms-of-service'); }}>Terms of Service</a></li>
                <li><a href="#" className="text-sm text-gray-700 hover:text-black transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="text-sm text-gray-700 hover:text-black transition-colors">GDPR</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-4">Mobile App</h3>
              <div className="flex flex-col gap-3">
                <a
                  href="https://apps.apple.com/ca/app/scanified/id6749334978"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg border-2 border-black hover:bg-gray-800 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C1.79 15.25 4.96 7.5 9.38 7.5c1.34 0 2.43.9 3.66.9 1.2 0 1.92-.89 3.25-.89 3.97 0 6.9 5.8 4.76 10.77zm-1.1-15.5c.58-.68.98-1.64.88-2.58-.85.05-1.88.57-2.5 1.28-.55.64-1.03 1.66-.9 2.65.95.07 1.92-.5 2.52-1.35z"/>
                  </svg>
                  <span>Download on App Store</span>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.evanevoo.scanifiedandroid&hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg border-2 border-black hover:bg-gray-800 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <span>Get it on Google Play</span>
                </a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t-2 border-black">
            <p className="text-center text-sm text-gray-700">
              © 2024 {assetConfig.appName || 'CylinderTrack'}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
