import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for lazy loading data
 * Provides infinite scroll and progressive loading capabilities
 */
export const useLazyLoading = (fetchFunction, options = {}) => {
  const {
    initialData = [],
    pageSize = 20,
    threshold = 100, // pixels from bottom to trigger load
    enabled = true,
    resetOnChange = true
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  
  const observerRef = useRef();
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction(page, pageSize);
      
      if (result.data && result.data.length > 0) {
        setData(prev => [...prev, ...result.data]);
        setPage(prev => prev + 1);
        setHasMore(result.data.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
      setHasMore(false);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [fetchFunction, page, pageSize, hasMore]);

  const reset = useCallback(() => {
    setData(initialData);
    setPage(0);
    setHasMore(true);
    setError(null);
    setLoading(false);
    loadingRef.current = false;
  }, [initialData]);

  const refresh = useCallback(() => {
    reset();
    loadMore();
  }, [reset, loadMore]);

  // Intersection Observer for infinite scroll
  const lastElementRef = useCallback((node) => {
    if (loadingRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && enabled) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    
    if (node) observerRef.current.observe(node);
  }, [loadMore, hasMore, enabled]);

  // Load initial data
  useEffect(() => {
    if (enabled && data.length === 0) {
      loadMore();
    }
  }, [enabled, data.length, loadMore]);

  // Cleanup observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    refresh,
    lastElementRef
  };
};

/**
 * Custom hook for virtual scrolling
 * Efficiently renders large lists by only showing visible items
 */
export const useVirtualScrolling = (items, options = {}) => {
  const {
    itemHeight = 50,
    containerHeight = 400,
    overscan = 5
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    setContainerRef
  };
};

/**
 * Custom hook for progressive image loading
 * Loads images as they come into view
 */
export const useProgressiveImage = (src, placeholder) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, setImageRef] = useState(null);

  useEffect(() => {
    if (!imageRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.onload = () => setImageSrc(src);
            img.src = src;
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(imageRef);

    return () => {
      if (imageRef) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, src]);

  return [imageSrc, setImageRef];
};
