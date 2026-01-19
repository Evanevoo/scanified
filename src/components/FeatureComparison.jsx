import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, X, Star } from 'lucide-react';

const features = [
  { category: 'Core Features', items: [
    { name: 'Asset Tracking', scanified: true, competitor1: true, competitor2: true },
    { name: 'Real-time GPS Location', scanified: true, competitor1: true, competitor2: false },
    { name: 'Barcode/QR Scanning', scanified: true, competitor1: true, competitor2: true },
    { name: 'Mobile App (iOS & Android)', scanified: true, competitor1: true, competitor2: false },
    { name: 'Offline Mode', scanified: true, competitor1: false, competitor2: false },
    { name: 'Customer Portal', scanified: true, competitor1: false, competitor2: true }
  ]},
  { category: 'Advanced Features', items: [
    { name: 'AI-Powered Analytics', scanified: true, competitor1: false, competitor2: false },
    { name: 'Route Optimization', scanified: true, competitor1: true, competitor2: false },
    { name: 'Automated Workflows', scanified: true, competitor1: false, competitor2: false },
    { name: 'Custom Reports', scanified: true, competitor1: true, competitor2: true },
    { name: 'API Access', scanified: true, competitor1: true, competitor2: false },
    { name: 'Bulk Operations', scanified: true, competitor1: false, competitor2: true }
  ]},
  { category: 'Support & Service', items: [
    { name: '24/7 Support', scanified: true, competitor1: false, competitor2: true },
    { name: 'Live Chat', scanified: true, competitor1: false, competitor2: false },
    { name: 'Free Onboarding', scanified: true, competitor1: false, competitor2: false },
    { name: 'Video Tutorials', scanified: true, competitor1: true, competitor2: true },
    { name: 'Phone Support', scanified: true, competitor1: true, competitor2: true },
    { name: 'Dedicated Account Manager', scanified: 'Enterprise', competitor1: 'Enterprise', competitor2: false }
  ]},
  { category: 'Pricing & Value', items: [
    { name: 'Free Trial', scanified: '14 days', competitor1: '7 days', competitor2: 'No' },
    { name: 'Starting Price', scanified: '$49/mo', competitor1: '$79/mo', competitor2: '$99/mo' },
    { name: 'Setup Fees', scanified: '$0', competitor1: '$500', competitor2: '$0' },
    { name: 'Cancel Anytime', scanified: true, competitor1: true, competitor2: false },
    { name: 'Money-back Guarantee', scanified: '30 days', competitor1: 'No', competitor2: '14 days' },
    { name: 'Price Lock Guarantee', scanified: true, competitor1: false, competitor2: false }
  ]}
];

const FeatureRow = ({ item, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const renderCell = (value) => {
    if (value === true) {
      return <Check className="w-6 h-6 text-green-600 mx-auto" strokeWidth={3} />;
    } else if (value === false || value === 'No') {
      return <X className="w-6 h-6 text-gray-300 mx-auto" strokeWidth={2} />;
    } else {
      return <span className="text-sm font-semibold text-black">{value}</span>;
    }
  };

  return (
    <motion.tr
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <td className="py-4 px-6 text-left font-medium text-gray-700">{item.name}</td>
      <td className="py-4 px-6 text-center bg-blue-50">{renderCell(item.scanified)}</td>
      <td className="py-4 px-6 text-center">{renderCell(item.competitor1)}</td>
      <td className="py-4 px-6 text-center">{renderCell(item.competitor2)}</td>
    </motion.tr>
  );
};

export default function FeatureComparison() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-block mb-4">
            <span className="bg-black text-white px-4 py-2 rounded-full text-sm font-bold tracking-wide">
              <Star className="inline w-4 h-4 mr-2" />
              FEATURE COMPARISON
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
            See How We Compare
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Scanified offers more features at a better price than the competition
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white border-2 border-black rounded-lg overflow-hidden shadow-xl"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-black text-white">
                <tr>
                  <th className="py-6 px-6 text-left text-lg font-bold">Features</th>
                  <th className="py-6 px-6 text-center bg-blue-600">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-2xl font-bold">Scanified</div>
                      <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold">
                        BEST VALUE
                      </div>
                    </div>
                  </th>
                  <th className="py-6 px-6 text-center">
                    <div className="text-lg font-semibold opacity-80">Competitor A</div>
                  </th>
                  <th className="py-6 px-6 text-center">
                    <div className="text-lg font-semibold opacity-80">Competitor B</div>
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {features.map((category, categoryIndex) => (
                  <React.Fragment key={categoryIndex}>
                    {/* Category Header */}
                    <tr className="bg-gray-100">
                      <td colSpan="4" className="py-3 px-6 font-bold text-black text-sm uppercase tracking-wide">
                        {category.category}
                      </td>
                    </tr>
                    {/* Category Items */}
                    {category.items.map((item, itemIndex) => (
                      <FeatureRow 
                        key={itemIndex} 
                        item={item} 
                        index={categoryIndex * 10 + itemIndex}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
        >
          <div className="bg-white border-2 border-black rounded-lg p-6 text-center">
            <div className="text-4xl font-bold text-black mb-2">40%</div>
            <div className="text-gray-600">More Features</div>
          </div>
          <div className="bg-white border-2 border-black rounded-lg p-6 text-center">
            <div className="text-4xl font-bold text-black mb-2">35%</div>
            <div className="text-gray-600">Lower Price</div>
          </div>
          <div className="bg-white border-2 border-black rounded-lg p-6 text-center">
            <div className="text-4xl font-bold text-black mb-2">2x</div>
            <div className="text-gray-600">Better Support</div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-lg text-gray-600 mb-6">
            Ready to experience the difference?
          </p>
          <button className="bg-black text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-colors">
            Start Free Trial →
          </button>
        </motion.div>
      </div>
    </section>
  );
}

