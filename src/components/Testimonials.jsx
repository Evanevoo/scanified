import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'John Martinez',
    role: 'Operations Manager',
    company: 'Industrial Gas Solutions',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    content: "Scanified has completely transformed how we track our cylinders. We've reduced asset loss by 45% and saved countless hours on manual tracking.",
    rating: 5,
    metrics: '45% reduction in asset loss'
  },
  {
    id: 2,
    name: 'Sarah Chen',
    role: 'CEO',
    company: 'MedGas Supply Co.',
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
    content: "The mobile app makes field operations seamless. Our delivery drivers love how easy it is to scan and update cylinder locations in real-time.",
    rating: 5,
    metrics: '3 hours saved daily'
  },
  {
    id: 3,
    name: 'Michael Thompson',
    role: 'Logistics Director',
    company: 'Welding Supply Depot',
    image: 'https://randomuser.me/api/portraits/men/67.jpg',
    content: "Best ROI we've seen from any software investment. The analytics dashboard gives us insights we never had before about our fleet utilization.",
    rating: 5,
    metrics: '$50K+ annual savings'
  },
  {
    id: 4,
    name: 'Emily Rodriguez',
    role: 'Fleet Manager',
    company: 'Oxygen Plus Services',
    image: 'https://randomuser.me/api/portraits/women/68.jpg',
    content: "Implementation was incredibly smooth. The team provided excellent onboarding, and we were fully operational within a week. Game changer for us!",
    rating: 5,
    metrics: 'Up and running in 1 week'
  },
  {
    id: 5,
    name: 'David Park',
    role: 'VP of Operations',
    company: 'AirTech Distribution',
    image: 'https://randomuser.me/api/portraits/men/22.jpg',
    content: "The barcode scanning feature alone has saved us from countless errors. Customer service is outstanding - they respond within minutes.",
    rating: 5,
    metrics: '99.9% tracking accuracy'
  },
  {
    id: 6,
    name: 'Lisa Anderson',
    role: 'Business Owner',
    company: 'ProGas LLC',
    image: 'https://randomuser.me/api/portraits/women/25.jpg',
    content: "As a small business, we needed something powerful but affordable. Scanified delivers enterprise features at a price we can afford.",
    rating: 5,
    metrics: 'Perfect for small teams'
  }
];

const TestimonialCard = ({ testimonial, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="h-full"
    >
      <div className="bg-white border-2 border-black rounded-lg p-6 h-full flex flex-col hover:shadow-2xl transition-shadow duration-300">
        {/* Quote Icon */}
        <Quote className="w-10 h-10 text-gray-300 mb-4" />
        
        {/* Rating */}
        <div className="flex gap-1 mb-4">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          ))}
        </div>

        {/* Content */}
        <p className="text-gray-700 mb-6 flex-grow text-base leading-relaxed">
          "{testimonial.content}"
        </p>

        {/* Metrics Badge */}
        {testimonial.metrics && (
          <div className="mb-4">
            <span className="inline-block bg-black text-white text-sm px-3 py-1 rounded-full font-semibold">
              {testimonial.metrics}
            </span>
          </div>
        )}

        {/* Author Info */}
        <div className="flex items-center gap-4 pt-4 border-t-2 border-gray-100">
          <img 
            src={testimonial.image} 
            alt={testimonial.name}
            className="w-12 h-12 rounded-full border-2 border-black"
          />
          <div>
            <div className="font-bold text-black">{testimonial.name}</div>
            <div className="text-sm text-gray-600">{testimonial.role}</div>
            <div className="text-sm text-gray-500">{testimonial.company}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-block mb-4">
            <span className="bg-black text-white px-4 py-2 rounded-full text-sm font-bold tracking-wide">
              ★ CUSTOMER REVIEWS
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Loved by Businesses Worldwide
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of satisfied customers who have transformed their operations with Scanified
          </p>
          
          {/* Stats Bar */}
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-black">500+</div>
              <div className="text-sm text-gray-600 mt-1">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-black">4.9/5</div>
              <div className="text-sm text-gray-600 mt-1">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-black">98%</div>
              <div className="text-sm text-gray-600 mt-1">Would Recommend</div>
            </div>
          </div>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard 
              key={testimonial.id} 
              testimonial={testimonial} 
              index={index}
            />
          ))}
        </div>

        {/* Trust Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 text-sm mb-6">TRUSTED BY INDUSTRY LEADERS</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
            {/* Placeholder for company logos */}
            <div className="text-2xl font-bold text-gray-400">Industrial Gas Co.</div>
            <div className="text-2xl font-bold text-gray-400">MedSupply Inc.</div>
            <div className="text-2xl font-bold text-gray-400">Welding Pro</div>
            <div className="text-2xl font-bold text-gray-400">AirTech</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

