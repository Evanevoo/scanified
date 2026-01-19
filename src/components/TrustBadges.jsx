import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Shield, Lock, CheckCircle, Award, Zap, HeadphonesIcon } from 'lucide-react';

const badges = [
  {
    icon: Shield,
    title: 'SOC 2 Type II',
    description: 'Certified secure',
    color: 'text-blue-600'
  },
  {
    icon: Lock,
    title: 'GDPR Compliant',
    description: 'Data privacy',
    color: 'text-green-600'
  },
  {
    icon: CheckCircle,
    title: 'ISO 27001',
    description: 'Security certified',
    color: 'text-purple-600'
  },
  {
    icon: Award,
    title: '99.9% Uptime',
    description: 'SLA guarantee',
    color: 'text-yellow-600'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Sub-second response',
    color: 'text-orange-600'
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Support',
    description: 'Always available',
    color: 'text-pink-600'
  }
];

const TrustBadge = ({ badge, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const Icon = badge.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex flex-col items-center text-center p-6 bg-white border-2 border-black rounded-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
    >
      <div className={`${badge.color} mb-3`}>
        <Icon className="w-12 h-12" strokeWidth={2} />
      </div>
      <h3 className="font-bold text-black text-lg mb-1">{badge.title}</h3>
      <p className="text-sm text-gray-600">{badge.description}</p>
    </motion.div>
  );
};

export default function TrustBadges() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Enterprise-Grade Security & Reliability
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your data security and privacy are our top priorities. We're certified and compliant with industry standards.
          </p>
        </motion.div>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {badges.map((badge, index) => (
            <TrustBadge key={index} badge={badge} index={index} />
          ))}
        </div>

        {/* Additional Trust Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">SSL Encrypted • Automated Backups • Bank-Level Security</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

