'use client';

import { useState, useEffect } from 'react';

export interface ViewportState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isVeryLargeDesktop: boolean;
  width: number;
  height: number;
}

/**
 * Hook to detect viewport size and device type
 * Mobile: <= 768px
 * Tablet: 769px - 1024px
 * Desktop: > 1024px
 */
export function useViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isVeryLargeDesktop: false,
    width: 1920,
    height: 1080,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
    setViewport({
      isMobile: width <= 768,
      isTablet: width > 768 && width <= 1024,
      isDesktop: width > 1024 && width <= 1536,
      isVeryLargeDesktop: width > 1536,
      width,
      height,
    });
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return viewport;
}

/**
 * Hook to detect if component should use mobile-optimized charts
 * Returns true for mobile and tablet devices
 */
export function useMobileCharts(): boolean {
  const { isMobile, isTablet } = useViewport();
  return isMobile || isTablet;
}

export default useViewport;