import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Package, 
  Users, 
  BarChart3,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const caseStudies = [
  {
    id: 1,
    company: 'Industrial Gas Solutions',
    logo: 'IGS',
    heroImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    challenge: 'Managing 5,000+ cylinders across 50 locations with constant loss and tracking issues',
    solution: 'Implemented Scanified with mobile scanning and real-time GPS tracking',
    results: [
      { metric: '45%', label: 'Reduction in Lost Assets', icon: Package },
      { metric: '$125K', label: 'Annual Savings', icon: DollarSign },
      { metric: '3 hours', label: 'Time Saved Daily', icon: Clock },
      { metric: '99.8%', label: 'Tracking Accuracy', icon: BarChart3 }
    ],
    testimonial: {
      quote: "Scanified transformed our operations completely. We went from guessing where our cylinders were to having real-time visibility. The ROI was immediate.",
      author: "John Martinez",
      role: "Operations Manager"
    },
    highlights: [
      'Deployed across all 50 locations in 2 weeks',
      'Reduced cylinder search time from hours to minutes',
      'Improved customer satisfaction by 35%',
      'Cut operational costs by $125,000 annually'
    ],
    industry: 'Medical Gas Distribution',
    size: '150 employees',
    location: 'California, USA'
  },
  {
    id: 2,
    company: 'Welding Supply Depot',
    logo: 'WSD',
    heroImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
    challenge: 'Manual paperwork causing delivery delays and customer complaints',
    solution: 'Digitized entire delivery workflow with Scanified mobile app',
    results: [
      { metric: '60%', label: 'Faster Deliveries', icon: TrendingUp },
      { metric: '$80K', label: 'Cost Reduction', icon: DollarSign },
      { metric: '2 hours', label: 'Saved Per Route', icon: Clock },
      { metric: '50%', label: 'More Deliveries', icon: Package }
    ],
    testimonial: {
      quote: "Our drivers love how easy it is. No more clipboards, no more mistakes. Everything is digital and automatic. It's been a game-changer.",
      author: "Sarah Chen",
      role: "CEO"
    },
    highlights: [
      'Eliminated 100% of paperwork',
      'Increased delivery capacity by 50%',
      'Driver satisfaction up 40%',
      'Customer complaints down 75%'
    ],
    industry: 'Industrial Distribution',
    size: '75 employees',
    location: 'Texas, USA'
  },
  {
    id: 3,
    company: 'MedGas Supply Co.',
    logo: 'MGS',
    heroImage: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800',
    challenge: 'Compliance tracking and audit preparation taking weeks',
    solution: 'Automated compliance reporting and audit trails with Scanified',
    results: [
      { metric: '90%', label: 'Faster Audits', icon: Clock },
      { metric: '100%', label: 'Compliance Rate', icon: CheckCircle },
      { metric: '$50K', label: 'Annual Savings', icon: DollarSign },
      { metric: '500', label: 'Hours Saved', icon: TrendingUp }
    ],
    testimonial: {
      quote: "Audit preparation went from a 3-week nightmare to a few hours. The automated compliance reports are worth their weight in gold.",
      author: "Dr. Emily Rodriguez",
      role: "Compliance Director"
    },
    highlights: [
      'Reduced audit prep time from 3 weeks to 8 hours',
      'Achieved 100% regulatory compliance',
      'Automated all tracking documentation',
      'Passed last 5 audits with zero findings'
    ],
    industry: 'Medical Gas Services',
    size: '200 employees',
    location: 'Florida, USA'
  }
];

const CaseStudyCard = ({ study, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const navigate = useNavigate();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      className="bg-white border-2 border-black rounded-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
    >
      {/* Hero Image */}
      <div className="relative h-64 overflow-hidden bg-gray-200">
        <img 
          src={study.heroImage} 
          alt={study.company}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-white text-black px-4 py-2 inline-block rounded-lg font-bold text-lg mb-2">
            {study.logo}
          </div>
          <h3 className="text-white text-2xl font-bold">{study.company}</h3>
          <p className="text-white/90">{study.industry}</p>
        </div>
      </div>

      <div className="p-8">
        {/* Challenge */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">The Challenge</h4>
          <p className="text-gray-700">{study.challenge}</p>
        </div>

        {/* Solution */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">The Solution</h4>
          <p className="text-gray-700">{study.solution}</p>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {study.results.map((result, idx) => {
            const Icon = result.icon;
            return (
              <div key={idx} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 text-center">
                <Icon className="w-6 h-6 mx-auto mb-2 text-black" />
                <div className="text-3xl font-bold text-black mb-1">{result.metric}</div>
                <div className="text-xs text-gray-600">{result.label}</div>
              </div>
            );
          })}
        </div>

        {/* Testimonial */}
        <div className="bg-black text-white p-6 rounded-lg mb-6">
          <p className="italic mb-4">"{study.testimonial.quote}"</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="font-bold">{study.testimonial.author}</div>
              <div className="text-sm text-gray-300">{study.testimonial.role}</div>
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Key Highlights</h4>
          <ul className="space-y-2">
            {study.highlights.map((highlight, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 text-sm">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Company Info */}
        <div className="pt-6 border-t-2 border-gray-200 flex justify-between text-sm text-gray-600">
          <div>
            <span className="font-semibold">Industry:</span> {study.industry}
          </div>
          <div>
            <span className="font-semibold">Size:</span> {study.size}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function CaseStudiesPage() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className="inline-block mb-4">
              <span className="bg-black text-white px-4 py-2 rounded-full text-sm font-bold">
                SUCCESS STORIES
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-black mb-6">
              Real Results from Real Businesses
            </h1>
            <p className="text-xl text-gray-600">
              See how companies like yours have transformed their operations with Scanified
            </p>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
          >
            <div className="bg-white border-2 border-black rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-black mb-2">500+</div>
              <div className="text-sm text-gray-600">Happy Customers</div>
            </div>
            <div className="bg-white border-2 border-black rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-black mb-2">$2M+</div>
              <div className="text-sm text-gray-600">Total Savings</div>
            </div>
            <div className="bg-white border-2 border-black rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-black mb-2">50%</div>
              <div className="text-sm text-gray-600">Avg. Cost Reduction</div>
            </div>
            <div className="bg-white border-2 border-black rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-black mb-2">98%</div>
              <div className="text-sm text-gray-600">Would Recommend</div>
            </div>
          </motion.div>

          {/* Case Studies Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
            {caseStudies.map((study, index) => (
              <CaseStudyCard key={study.id} study={study} index={index} />
            ))}
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-black text-white rounded-lg p-12 text-center"
          >
            <h2 className="text-4xl font-bold mb-4">Ready to Write Your Success Story?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Join these industry leaders and transform your operations today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/create-organization')}
                className="bg-white text-black px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors"
              >
                Start Free Trial
                <ArrowRight className="inline w-5 h-5 ml-2" />
              </button>
              <button
                onClick={() => navigate('/demo')}
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-black transition-colors"
              >
                Schedule a Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

