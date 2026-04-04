/**
 * @file
 * Dibuat oleh Claude
 * 
 * File ini berisi implementasi custom SWR (Stale-While-Revalidate) dengan cache LRU
 * untuk mengelola data fetching pada dashboard IRRS dengan deduplikasi request dan
 * caching yang efisien
 */

import useSWR, { SWRConfiguration } from 'swr';
import { fetchWithDemo } from './utils';

/**
 * Kelas untuk mengimplementasikan cache LRU (Least Recently Used)
 * Cache ini akan menghapus item yang paling lama tidak digunakan ketika kapasitas penuh
 * 
 * @template T - Tipe data yang disimpan dalam cache
 */
class LRUCache<T> {
  private cache = new Map<string, T>();
  private maxSize: number;

  /**
   * Membuat instance baru dari LRUCache
   * 
   * @param maxSize - Ukuran maksimum cache (default: 200)
   */
  constructor(maxSize: number = 200) {
    this.maxSize = maxSize;
  }

  /**
   * Mengambil nilai dari cache berdasarkan key
   * Item yang diambil akan dipindahkan ke posisi terbaru (most recently used)
   * 
   * @param key - Kunci untuk mengambil nilai dari cache
   * @returns Nilai yang tersimpan dalam cache atau undefined jika tidak ditemukan
   */
  get(key: string): T | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Menyimpan nilai ke dalam cache
   * Jika key sudah ada, nilai akan diperbarui dan dipindahkan ke posisi terbaru
   * Jika cache penuh, item paling lama akan dihapus
   * 
   * @param key - Kunci untuk menyimpan nilai
   * @param value - Nilai yang akan disimpan
   */
  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * Menghapus nilai dari cache berdasarkan key
   * 
   * @param key - Kunci yang akan dihapus dari cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Mengembalikan jumlah item yang tersimpan dalam cache
   * 
   * @returns Ukuran cache saat ini
   */
  get size() {
    return this.cache.size;
  }
}

const swrCache = new LRUCache<unknown>(200);

/**
 * Provider untuk cache SWR yang menggunakan LRU cache
 * 
 * @returns Fungsi yang mengembalikan instance cache LRU
 * @example
 * ```typescript
 * const cacheProvider = lruProvider();
 * const cache = cacheProvider();
 * ```
 */
const stableProvider = () => swrCache as any;

/**
 * Fetcher untuk mengambil data dari API
 * 
 * @param url - URL yang akan diambil
 * @returns Data JSON dari response
 * @throws Error jika fetch gagal atau response tidak OK
 */
const fetcher = async (url: string) => {
  const res = await fetchWithDemo(url);
  if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
  return res.json();
};

/**
 * SWR hook dengan konfigurasi yang sesuai untuk dashboard IRRS
 * Hook ini menyediakan:
 * - Deduplikasi request yang sama secara bersamaan
 * - Stale-while-revalidate pada sisi klien
 * - Mengurangi re-fetch saat navigasi
 * 
 * @template T - Tipe data yang akan diambil
 * @param url - URL yang akan diambil, atau null untuk disable fetching
 * @param options - Konfigurasi tambahan untuk SWR
 * @returns Object berisi data, error, loading state, dan fungsi revalidate
 * @example
 * ```typescript
 * const { data, error, isLoading } = useData<Report>('/api/reports');
 * ```
 */
export function useData<T = unknown>(
  url: string | null,
  options?: SWRConfiguration
) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30s dedup window
    ...options,
    provider: stableProvider,
  });
}

/**
 * SWR hook untuk data yang jarang berubah (master data, opsi filter)
 * Hook ini memiliki konfigurasi yang lebih agresif untuk mengurangi request:
 * - Tidak me-revalidate saat fokus atau reconnect
 * - Interval deduplikasi lebih lama (5 menit)
 * - Tidak me-revalidate jika data sudah stale
 * 
 * @template T - Tipe data yang akan diambil
 * @param url - URL yang akan diambil, atau null untuk disable fetching
 * @param options - Konfigurasi tambahan untuk SWR
 * @returns Object berisi data, error, loading state, dan fungsi revalidate
 * @example
 * ```typescript
 * const { data: airlines } = useStaticData<Airline[]>('/api/airlines');
 * ```
 */
export function useStaticData<T = unknown>(
  url: string | null,
  options?: SWRConfiguration
) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000, // 5min dedup
    refreshInterval: 300000,
    ...options,
    provider: stableProvider,
  });
}
