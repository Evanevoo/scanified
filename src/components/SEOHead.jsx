import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEOHead = ({ 
  title = 'Scanified - Modern Asset Management Made Simple',
  description = 'The complete SaaS platform for cylinder and asset tracking. Real-time visibility, automated workflows, and powerful analytics to transform your operations.',
  keywords = 'asset tracking, cylinder management, gas cylinder tracking, inventory management, barcode scanning, asset management software',
  image = 'https://scanified.com/og-image.png',
  url,
  type = 'website'
}) => {
  const location = useLocation();
  const currentUrl = url || `https://scanified.com${location.pathname}`;

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Open Graph tags
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:image', image, 'property');
    updateMetaTag('og:url', currentUrl, 'property');
    updateMetaTag('og:type', type, 'property');
    updateMetaTag('og:site_name', 'Scanified', 'property');

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', title, 'name');
    updateMetaTag('twitter:description', description, 'name');
    updateMetaTag('twitter:image', image, 'name');

    // Additional SEO tags
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('language', 'English');
    updateMetaTag('author', 'Scanified');

    // Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = currentUrl;

    // Structured Data (JSON-LD) for Organization
    updateStructuredData();
  }, [title, description, keywords, image, currentUrl, type]);

  const updateMetaTag = (name, content, attribute = 'name') => {
    let element = document.querySelector(`meta[${attribute}="${name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  const updateStructuredData = () => {
    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Scanified',
      url: 'https://scanified.com',
      logo: 'https://scanified.com/logo.png',
      description: description,
      foundingDate: '2024',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'US'
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+1-800-SCANIFY',
        contactType: 'Customer Service',
        email: 'support@scanified.com',
        availableLanguage: 'English'
      },
      sameAs: [
        'https://twitter.com/scanified',
        'https://linkedin.com/company/scanified',
        'https://facebook.com/scanified'
      ],
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: '49',
        highPrice: '999',
        offerCount: '3'
      }
    };

    script.textContent = JSON.stringify(structuredData);
  };

  return null; // This component doesn't render anything
};

// Predefined SEO configs for different pages
export const SEOConfigs = {
  home: {
    title: 'Scanified - Modern Asset Management Made Simple',
    description: 'Track every asset, optimize every operation. The complete SaaS platform for cylinder and asset tracking with real-time visibility and powerful analytics.',
    keywords: 'asset tracking, cylinder management, gas cylinder tracking, inventory management, barcode scanning'
  },
  pricing: {
    title: 'Pricing - Scanified | Simple, Transparent Plans',
    description: 'Choose the perfect plan for your business. Starting at $49/month with no setup fees. 14-day free trial, cancel anytime.',
    keywords: 'pricing, plans, subscription, asset tracking cost, cylinder management pricing'
  },
  features: {
    title: 'Features - Scanified | Comprehensive Asset Management',
    description: 'Powerful features including real-time GPS tracking, barcode scanning, mobile apps, offline mode, automated workflows, and advanced analytics.',
    keywords: 'features, asset tracking features, GPS tracking, barcode scanning, mobile app, offline mode'
  },
  demo: {
    title: 'Demo - Scanified | See It In Action',
    description: 'Experience how Scanified transforms asset management. Watch interactive demos of our dashboard, mobile app, and key features.',
    keywords: 'demo, product demo, asset tracking demo, live demo, interactive demo'
  },
  caseStudies: {
    title: 'Case Studies - Scanified | Real Results from Real Businesses',
    description: 'See how companies have transformed their operations with Scanified. Real metrics, real savings, real success stories.',
    keywords: 'case studies, success stories, customer stories, ROI, results, testimonials'
  },
  knowledgeBase: {
    title: 'Help Center - Scanified | Knowledge Base & Support',
    description: 'Get help with Scanified. Browse articles, watch tutorials, and find answers to common questions in our comprehensive knowledge base.',
    keywords: 'help, support, knowledge base, tutorials, guides, documentation, FAQ'
  },
  about: {
    title: 'About Us - Scanified | Transforming Asset Management',
    description: 'Learn about Scanified\'s mission to make asset tracking simple, efficient, and accessible for businesses of all sizes.',
    keywords: 'about, company, team, mission, vision, who we are'
  },
  contact: {
    title: 'Contact Us - Scanified | Get In Touch',
    description: 'Have questions? Want to schedule a demo? Contact our team today. We\'re here to help you succeed.',
    keywords: 'contact, support, sales, demo, get in touch, customer service'
  }
};

export default SEOHead;

