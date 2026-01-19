import React, { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Book, 
  Video, 
  FileText, 
  HelpCircle, 
  Settings, 
  Smartphone,
  Users,
  BarChart3,
  Package,
  ArrowRight,
  ChevronRight,
  Play
} from 'lucide-react';

const categories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Book,
    color: 'text-blue-600',
    articles: [
      { title: 'Quick Start Guide', views: '12.5K', duration: '5 min read' },
      { title: 'Setting Up Your First Organization', views: '9.2K', duration: '10 min read' },
      { title: 'Inviting Team Members', views: '7.8K', duration: '3 min read' },
      { title: 'Understanding Roles & Permissions', views: '6.5K', duration: '7 min read' }
    ]
  },
  {
    id: 'mobile-app',
    title: 'Mobile App',
    icon: Smartphone,
    color: 'text-green-600',
    articles: [
      { title: 'Installing the Mobile App', views: '15.3K', duration: '4 min read' },
      { title: 'Scanning Barcodes & QR Codes', views: '11.2K', duration: '6 min read' },
      { title: 'Offline Mode & Sync', views: '8.9K', duration: '8 min read' },
      { title: 'Mobile Push Notifications', views: '5.4K', duration: '5 min read' }
    ]
  },
  {
    id: 'asset-management',
    title: 'Asset Management',
    icon: Package,
    color: 'text-purple-600',
    articles: [
      { title: 'Adding New Assets', views: '13.7K', duration: '5 min read' },
      { title: 'Bulk Import via CSV', views: '10.1K', duration: '10 min read' },
      { title: 'Asset Tracking & Location', views: '9.3K', duration: '7 min read' },
      { title: 'Maintenance Schedules', views: '7.2K', duration: '12 min read' }
    ]
  },
  {
    id: 'customer-management',
    title: 'Customer Management',
    icon: Users,
    color: 'text-orange-600',
    articles: [
      { title: 'Creating Customer Profiles', views: '8.9K', duration: '6 min read' },
      { title: 'Managing Deliveries', views: '7.5K', duration: '8 min read' },
      { title: 'Customer Portal Setup', views: '6.3K', duration: '10 min read' },
      { title: 'Billing & Invoicing', views: '5.8K', duration: '15 min read' }
    ]
  },
  {
    id: 'reporting',
    title: 'Reports & Analytics',
    icon: BarChart3,
    color: 'text-pink-600',
    articles: [
      { title: 'Understanding Your Dashboard', views: '12.1K', duration: '7 min read' },
      { title: 'Creating Custom Reports', views: '9.8K', duration: '12 min read' },
      { title: 'Exporting Data', views: '7.6K', duration: '5 min read' },
      { title: 'Scheduled Reports', views: '5.2K', duration: '8 min read' }
    ]
  },
  {
    id: 'settings',
    title: 'Settings & Configuration',
    icon: Settings,
    color: 'text-gray-600',
    articles: [
      { title: 'Organization Settings', views: '6.7K', duration: '10 min read' },
      { title: 'Integration Setup', views: '5.9K', duration: '15 min read' },
      { title: 'Custom Fields & Forms', views: '4.8K', duration: '12 min read' },
      { title: 'Security & Compliance', views: '4.2K', duration: '20 min read' }
    ]
  }
];

const videos = [
  {
    title: 'Complete Platform Overview',
    duration: '15:32',
    views: '25.3K',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400'
  },
  {
    title: 'Mobile App Tutorial',
    duration: '8:45',
    views: '18.7K',
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400'
  },
  {
    title: 'Setting Up Barcode Scanning',
    duration: '6:22',
    views: '15.2K',
    thumbnail: 'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=400'
  },
  {
    title: 'Advanced Reporting Features',
    duration: '12:18',
    views: '12.9K',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400'
  }
];

const faqs = [
  {
    question: 'How do I reset my password?',
    answer: 'Click on "Forgot Password" on the login page, enter your email, and follow the instructions sent to your inbox.'
  },
  {
    question: 'Can I import existing data?',
    answer: 'Yes! You can import assets, customers, and other data via CSV files. Go to Settings → Import/Export.'
  },
  {
    question: 'Does the mobile app work offline?',
    answer: 'Absolutely. The mobile app has full offline capabilities and will sync when you reconnect.'
  },
  {
    question: 'How many users can I add?',
    answer: 'This depends on your plan. Starter allows 15 users, Professional allows 25, and Enterprise is unlimited.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, ACH transfers, and wire transfers for annual payments.'
  }
];

const CategoryCard = ({ category, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const Icon = category.icon;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white border-2 border-black rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      <div 
        className="p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${category.color}`}>
              <Icon className="w-8 h-8" strokeWidth={2} />
            </div>
            <h3 className="text-xl font-bold text-black">{category.title}</h3>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="w-6 h-6 text-gray-400" />
          </motion.div>
        </div>
        <div className="text-sm text-gray-600">
          {category.articles.length} articles
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t-2 border-gray-200 bg-gray-50"
          >
            <div className="p-6 space-y-3">
              {category.articles.map((article, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400 group-hover:text-black" />
                    <div>
                      <div className="font-semibold text-black group-hover:underline">
                        {article.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {article.views} views • {article.duration}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-black" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-black to-gray-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block mb-4">
              <span className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold">
                <Book className="inline w-4 h-4 mr-2" />
                HELP CENTER
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              How can we help you?
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Search our knowledge base or browse articles by category
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                placeholder="Search for articles, guides, or videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-4 py-4 rounded-lg text-black text-lg focus:outline-none focus:ring-4 focus:ring-white/20"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { icon: Book, label: 'Getting Started', count: '12 articles' },
              { icon: Video, label: 'Video Tutorials', count: '24 videos' },
              { icon: FileText, label: 'Documentation', count: '156 docs' },
              { icon: HelpCircle, label: 'FAQs', count: '45 questions' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-white border-2 border-black rounded-lg p-6 text-center cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <Icon className="w-8 h-8 mx-auto mb-3 text-black" />
                  <div className="font-bold text-black mb-1">{item.label}</div>
                  <div className="text-sm text-gray-600">{item.count}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-black mb-8">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category, index) => (
              <CategoryCard key={category.id} category={category} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Video Tutorials */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-black">Video Tutorials</h2>
            <button className="text-black font-semibold hover:underline">
              View All →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {videos.map((video, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="relative rounded-lg overflow-hidden mb-3 border-2 border-black">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                    <div className="bg-white rounded-full p-4">
                      <Play className="w-8 h-8 text-black" fill="black" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black text-white px-2 py-1 rounded text-xs font-semibold">
                    {video.duration}
                  </div>
                </div>
                <h3 className="font-bold text-black group-hover:underline">{video.title}</h3>
                <p className="text-sm text-gray-600">{video.views} views</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-black mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-white border-2 border-black rounded-lg p-6"
              >
                <h3 className="font-bold text-lg text-black mb-2">{faq.question}</h3>
                <p className="text-gray-700">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">Still Need Help?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Our support team is here to help you succeed
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/contact')}
              className="bg-white text-black px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              Contact Support
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-black transition-colors"
            >
              Schedule a Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

