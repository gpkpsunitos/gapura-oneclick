/**
 * @file
 * 
 * File ini berisi hook React untuk mendeteksi ukuran viewport dan tipe device
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * State viewport berisi informasi ukuran dan tipe device
 * @interface ViewportState
 */
export interface ViewportState {
  /** Apakah device adalah mobile (<= 768px) */
  isMobile: boolean;
  /** Apakah device adalah tablet (769px - 1024px) */
  isTablet: boolean;
  /** Apakah device adalah desktop (> 1024px dan <= 1536px) */
  isDesktop: boolean;
  /** Apakah device adalah large desktop (> 1536px) */
  isVeryLargeDesktop: boolean;
  /** Lebar viewport dalam pixel */
  width: number;
  /** Tinggi viewport dalam pixel */
  height: number;
}

/**
 * Hook untuk mendeteksi ukuran viewport dan tipe device
 * Mobile: <= 768px
 * Tablet: 769px - 1024px
 * Desktop: > 1024px dan <= 1536px
 * Very Large Desktop: > 1536px
 * @returns Object dengan status viewport dan ukuran
 * @example
 * ```tsx
 * const { isMobile, width, height } = useViewport();
 * if (isMobile) {
 *   return <MobileLayout />;
 * }
 * return <DesktopLayout />;
 * ```
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
 * Hook untuk mendeteksi apakah component harus menggunakan chart mobile-optimized
 * @returns true jika device adalah mobile atau tablet
 * @example
 * ```tsx
 * const useMobile = useMobileCharts();
 * const chartConfig = useMobile ? mobileConfig : desktopConfig;
 * ```
 */
export function useMobileCharts(): boolean {
  const { isMobile, isTablet } = useViewport();
  return isMobile || isTablet;
}

export default useViewport;