import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CANONICAL_SITE_ORIGIN, absoluteUrl } from '../config/site';

const DEFAULT_TITLE = 'Scanified - Modern Asset Management Made Simple';
const DEFAULT_DESCRIPTION =
  'The complete SaaS platform for cylinder and asset tracking. Real-time visibility, automated workflows, and powerful analytics to transform your operations.';
const DEFAULT_KEYWORDS =
  'asset tracking, cylinder management, gas cylinder tracking, inventory management, barcode scanning, asset management software';

const SEOHead = ({
  config,
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  robots = 'index, follow',
}) => {
  const location = useLocation();
  const currentUrl = url || absoluteUrl(location.pathname);
  const resolvedTitle = title ?? config?.title ?? DEFAULT_TITLE;
  const resolvedDescription = description ?? config?.description ?? DEFAULT_DESCRIPTION;
  const resolvedKeywords = keywords ?? config?.keywords ?? DEFAULT_KEYWORDS;
  const resolvedImage = image ?? `${CANONICAL_SITE_ORIGIN}/og-image.png`;

  useEffect(() => {
    document.title = resolvedTitle;

    const updateMetaTag = (name, content, attribute = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    updateMetaTag('description', resolvedDescription);
    updateMetaTag('keywords', resolvedKeywords);

    updateMetaTag('og:title', resolvedTitle, 'property');
    updateMetaTag('og:description', resolvedDescription, 'property');
    updateMetaTag('og:image', resolvedImage, 'property');
    updateMetaTag('og:url', currentUrl, 'property');
    updateMetaTag('og:type', type, 'property');
    updateMetaTag('og:site_name', 'Scanified', 'property');

    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', resolvedTitle, 'name');
    updateMetaTag('twitter:description', resolvedDescription, 'name');
    updateMetaTag('twitter:image', resolvedImage, 'name');
    updateMetaTag('twitter:url', currentUrl, 'name');

    updateMetaTag('robots', robots);
    updateMetaTag('language', 'English');
    updateMetaTag('author', 'Scanified');

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = currentUrl;

    let script = document.querySelector('script#schema-organization[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.id = 'schema-organization';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Scanified',
      url: CANONICAL_SITE_ORIGIN,
      logo: `${CANONICAL_SITE_ORIGIN}/logo.png`,
      description: resolvedDescription,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        email: 'support@scanified.com',
        availableLanguage: 'English',
      },
    };

    script.textContent = JSON.stringify(structuredData);
  }, [resolvedTitle, resolvedDescription, resolvedKeywords, resolvedImage, currentUrl, type, robots]);

  return null;
};

// Predefined SEO configs for different pages
export const SEOConfigs = {
  home: {
    title: 'Scanified - Modern Asset Management Made Simple',
    description:
      'Track every asset, optimize every operation. The complete SaaS platform for cylinder and asset tracking with real-time visibility and powerful analytics.',
    keywords: 'asset tracking, cylinder management, gas cylinder tracking, inventory management, barcode scanning',
  },
  pricing: {
    title: 'Pricing - Scanified | Simple, Transparent Plans',
    description:
      'Choose the perfect plan for your business. Starting at $49/month with no setup fees. 7-day free trial, cancel anytime.',
    keywords: 'pricing, plans, subscription, asset tracking cost, cylinder management pricing',
  },
  features: {
    title: 'Features - Scanified | Comprehensive Asset Management',
    description:
      'Barcode and mobile scanning, location-aware operations, rental and billing workflows, reporting, and integrations—built for cylinder and asset fleets.',
    keywords: 'features, asset tracking, barcode scanning, cylinder management, mobile app, rentals, reporting',
  },
  demo: {
    title: 'Demo - Scanified | See It In Action',
    description:
      'Experience how Scanified transforms asset management. Watch interactive demos of our dashboard, mobile app, and key features.',
    keywords: 'demo, product demo, asset tracking demo, live demo, interactive demo',
  },
  caseStudies: {
    title: 'Case Studies - Scanified | Real Results from Real Businesses',
    description:
      'See how companies have transformed their operations with Scanified. Real metrics, real savings, real success stories.',
    keywords: 'case studies, success stories, customer stories, ROI, results, testimonials',
  },
  knowledgeBase: {
    title: 'Help Center - Scanified | Knowledge Base & Support',
    description:
      'Get help with Scanified. Browse articles, watch tutorials, and find answers to common questions in our comprehensive knowledge base.',
    keywords: 'help, support, knowledge base, tutorials, guides, documentation, FAQ',
  },
  about: {
    title: 'About Us - Scanified | Transforming Asset Management',
    description:
      "Learn about Scanified's mission to make asset tracking simple, efficient, and accessible for businesses of all sizes.",
    keywords: 'about, company, team, mission, vision, who we are',
  },
  contact: {
    title: 'Contact Us - Scanified | Get In Touch',
    description:
      "Have questions? Want to schedule a demo? Contact our team today. We're here to help you succeed.",
    keywords: 'contact, support, sales, demo, get in touch, customer service',
  },
};

export default SEOHead;
