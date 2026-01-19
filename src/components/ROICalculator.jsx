import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, DollarSign, Clock, Package } from 'lucide-react';

export default function ROICalculator() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const [inputs, setInputs] = useState({
    cylinders: 500,
    hourlyRate: 25,
    hoursPerWeek: 10,
    lostCylinders: 5
  });

  const calculateROI = () => {
    // Time savings calculation
    const weeklyTimeSaved = inputs.hoursPerWeek * 0.7; // 70% time reduction
    const annualTimeSavings = weeklyTimeSaved * 52 * inputs.hourlyRate;

    // Asset loss reduction
    const cylinderValue = 150; // Average cylinder value
    const monthlyLossSavings = inputs.lostCylinders * cylinderValue * 0.8; // 80% reduction
    const annualAssetSavings = monthlyLossSavings * 12;

    // Operational efficiency
    const annualEfficiencyGains = (inputs.cylinders * 2) * 12; // $2 per cylinder per month

    // Total savings
    const totalAnnualSavings = annualTimeSavings + annualAssetSavings + annualEfficiencyGains;

    // Cost of Scanified
    const annualCost = inputs.cylinders <= 500 ? 588 : 1788; // Starter or Professional plan

    // ROI
    const netSavings = totalAnnualSavings - annualCost;
    const roiPercentage = ((netSavings / annualCost) * 100).toFixed(0);
    const paybackMonths = (annualCost / (totalAnnualSavings / 12)).toFixed(1);

    return {
      annualTimeSavings,
      annualAssetSavings,
      annualEfficiencyGains,
      totalAnnualSavings,
      annualCost,
      netSavings,
      roiPercentage,
      paybackMonths
    };
  };

  const results = calculateROI();

  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <span className="bg-black text-white px-4 py-2 rounded-full text-sm font-bold tracking-wide">
                <TrendingUp className="inline w-4 h-4 mr-2" />
                ROI CALCULATOR
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Calculate Your Potential Savings
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See how much time and money you could save with Scanified
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white border-2 border-black rounded-lg p-8"
            >
              <h3 className="text-2xl font-bold text-black mb-6">Your Current Situation</h3>
              
              <div className="space-y-6">
                {/* Number of Cylinders */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Package className="inline w-4 h-4 mr-2" />
                    Number of Cylinders
                  </label>
                  <input
                    type="number"
                    value={inputs.cylinders}
                    onChange={(e) => handleInputChange('cylinders', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none text-lg font-semibold"
                  />
                </div>

                {/* Hourly Rate */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <DollarSign className="inline w-4 h-4 mr-2" />
                    Average Hourly Labor Rate ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.hourlyRate}
                    onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none text-lg font-semibold"
                  />
                </div>

                {/* Hours Per Week */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Clock className="inline w-4 h-4 mr-2" />
                    Hours Spent on Manual Tracking (per week)
                  </label>
                  <input
                    type="number"
                    value={inputs.hoursPerWeek}
                    onChange={(e) => handleInputChange('hoursPerWeek', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none text-lg font-semibold"
                  />
                </div>

                {/* Lost Cylinders */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Package className="inline w-4 h-4 mr-2" />
                    Cylinders Lost/Month
                  </label>
                  <input
                    type="number"
                    value={inputs.lostCylinders}
                    onChange={(e) => handleInputChange('lostCylinders', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none text-lg font-semibold"
                  />
                </div>
              </div>
            </motion.div>

            {/* Results Section */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-6"
            >
              {/* Main ROI Card */}
              <div className="bg-gradient-to-br from-black to-gray-800 text-white border-2 border-black rounded-lg p-8">
                <h3 className="text-xl font-semibold mb-2">Your Annual ROI</h3>
                <div className="text-6xl font-bold mb-4">{results.roiPercentage}%</div>
                <div className="text-2xl font-semibold mb-2">
                  Net Savings: ${results.netSavings.toLocaleString()}
                </div>
                <div className="text-lg opacity-90">
                  Payback Period: {results.paybackMonths} months
                </div>
              </div>

              {/* Breakdown Cards */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white border-2 border-black rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-600 mb-1">Time Savings</div>
                      <div className="text-2xl font-bold text-black">
                        ${results.annualTimeSavings.toLocaleString()}
                      </div>
                    </div>
                    <Clock className="w-12 h-12 text-blue-500" />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">70% reduction in manual tracking</div>
                </div>

                <div className="bg-white border-2 border-black rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-600 mb-1">Asset Recovery</div>
                      <div className="text-2xl font-bold text-black">
                        ${results.annualAssetSavings.toLocaleString()}
                      </div>
                    </div>
                    <Package className="w-12 h-12 text-green-500" />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">80% reduction in lost cylinders</div>
                </div>

                <div className="bg-white border-2 border-black rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-600 mb-1">Efficiency Gains</div>
                      <div className="text-2xl font-bold text-black">
                        ${results.annualEfficiencyGains.toLocaleString()}
                      </div>
                    </div>
                    <TrendingUp className="w-12 h-12 text-purple-500" />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">Improved operational efficiency</div>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-gray-50 border-2 border-black rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-4">
                  These are conservative estimates. Actual results may be higher!
                </p>
                <button className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors w-full">
                  Start Saving Today →
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

