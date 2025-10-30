import logger from '../utils/logger';
// Google Analytics and tracking utilities
export const GA_TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID || 'G-XXXXXXXXXX';

// Initialize Google Analytics
export const initGA = () => {
  if (typeof window !== 'undefined' && GA_TRACKING_ID) {
    // Load Google Analytics script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', GA_TRACKING_ID, {
      page_title: document.title,
      page_location: window.location.href,
    });
  }
};

// Track page views
export const trackPageView = (page_path) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path,
      page_title: document.title,
      page_location: window.location.href,
    });
  }
};

// Track custom events
export const trackEvent = (action, category = 'General', label = '', value = 0) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track conversions
export const trackConversion = (conversionType, value = 0, currency = 'USD') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: GA_TRACKING_ID,
      event_category: 'Conversion',
      event_label: conversionType,
      value: value,
      currency: currency,
    });
  }
};

// Predefined tracking functions for common actions
export const trackSignup = (plan = 'free_trial') => {
  trackEvent('signup', 'User', plan);
  trackConversion('signup', 0);
};

export const trackLogin = () => {
  trackEvent('login', 'User');
};

export const trackTrialStart = (plan) => {
  trackEvent('trial_start', 'Subscription', plan);
  trackConversion('trial_start', 0);
};

export const trackSubscription = (plan, amount) => {
  trackEvent('subscribe', 'Subscription', plan, amount);
  trackConversion('purchase', amount);
};

export const trackContactForm = (formType = 'contact') => {
  trackEvent('contact_form_submit', 'Lead', formType);
  trackConversion('lead', 0);
};

export const trackDemo = (source = 'website') => {
  trackEvent('demo_request', 'Lead', source);
  trackConversion('demo_request', 0);
};

export const trackDownload = (resource) => {
  trackEvent('download', 'Content', resource);
};

export const trackNewsletterSignup = (source = 'website') => {
  trackEvent('newsletter_signup', 'Lead', source);
  trackConversion('newsletter_signup', 0);
};

export const trackPhoneCall = (number) => {
  trackEvent('phone_call', 'Contact', number);
  trackConversion('phone_call', 0);
};

export const trackEmailClick = (email) => {
  trackEvent('email_click', 'Contact', email);
};

export const trackChatStart = () => {
  trackEvent('chat_start', 'Support');
};

export const trackVideoPlay = (videoTitle) => {
  trackEvent('video_play', 'Content', videoTitle);
};

export const trackPricingView = (plan) => {
  trackEvent('pricing_view', 'Pricing', plan);
};

export const trackFeatureClick = (feature) => {
  trackEvent('feature_click', 'Navigation', feature);
};

export const trackExternalLink = (url) => {
  trackEvent('external_link', 'Navigation', url);
};

export const trackSearch = (query) => {
  trackEvent('search', 'Navigation', query);
};

export const trackError = (error, page) => {
  trackEvent('error', 'Technical', `${page}: ${error}`);
};

// Track user engagement
export const trackTimeOnPage = (page, timeInSeconds) => {
  trackEvent('time_on_page', 'Engagement', page, timeInSeconds);
};

export const trackScrollDepth = (depth) => {
  trackEvent('scroll_depth', 'Engagement', `${depth}%`, depth);
};

// E-commerce tracking
export const trackPurchase = (transactionId, items, value, currency = 'USD') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: value,
      currency: currency,
      items: items
    });
  }
};

export const trackAddToCart = (item) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: 'USD',
      value: item.price,
      items: [item]
    });
  }
};

// User identification (for authenticated users)
export const identifyUser = (userId, traits = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      user_id: userId,
      custom_map: traits
    });
  }
};

// Track user properties
export const setUserProperties = (properties) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      custom_map: properties
    });
  }
};

// Facebook Pixel integration
export const initFacebookPixel = (pixelId) => {
  if (typeof window !== 'undefined' && pixelId) {
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }
};

export const trackFacebookEvent = (event, parameters = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', event, parameters);
  }
};

// LinkedIn Insight Tag
export const initLinkedInInsight = (partnerId) => {
  if (typeof window !== 'undefined' && partnerId) {
    window._linkedin_partner_id = partnerId;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(partnerId);
    
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    document.head.appendChild(script);
  }
};

export const trackLinkedInEvent = (conversionId) => {
  if (typeof window !== 'undefined' && window.lintrk) {
    window.lintrk('track', { conversion_id: conversionId });
  }
};

// Hot jar integration
export const initHotjar = (hjid, hjsv) => {
  if (typeof window !== 'undefined' && hjid) {
    (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
      h._hjSettings={hjid,hjsv};
      a=o.getElementsByTagName('head')[0];
      r=o.createElement('script');r.async=1;
      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
      a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  }
};

// Performance monitoring
export const trackPerformance = () => {
  if (typeof window !== 'undefined' && window.performance) {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      
      trackEvent('page_load_time', 'Performance', window.location.pathname, Math.round(loadTime));
    });
  }
};

// Scroll depth tracking
export const initScrollTracking = () => {
  if (typeof window !== 'undefined') {
    let maxScroll = 0;
    const trackingThresholds = [25, 50, 75, 100];
    const trackedThresholds = new Set();

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / documentHeight) * 100);

      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        
        trackingThresholds.forEach(threshold => {
          if (scrollPercent >= threshold && !trackedThresholds.has(threshold)) {
            trackedThresholds.add(threshold);
            trackScrollDepth(threshold);
          }
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }
};

// Initialize all tracking
export const initAllTracking = () => {
  initGA();
  initScrollTracking();
  trackPerformance();
  
  // Initialize other tracking services if IDs are provided
  const fbPixelId = import.meta.env.VITE_FB_PIXEL_ID;
  const linkedInId = import.meta.env.VITE_LINKEDIN_PARTNER_ID;
  const hotjarId = import.meta.env.VITE_HOTJAR_ID;
  
  if (fbPixelId) initFacebookPixel(fbPixelId);
  if (linkedInId) initLinkedInInsight(linkedInId);
  if (hotjarId) initHotjar(hotjarId, 6);
};

// Debug mode for development
export const enableDebugMode = () => {
  if (typeof window !== 'undefined') {
    window.gtag_debug = true;
    if (process.env.NODE_ENV === 'development') {
      logger.log('Analytics debug mode enabled');
    }
  }
}; 