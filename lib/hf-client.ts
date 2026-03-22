interface CacheEntry<T> {
  data: T;
  expiry: number;
  url: string;
}

interface QueuedRequest {
  resolve: (value: Response) => void;
  reject: (error: Error) => void;
  url: string;
  options: RequestInit;
  attempt: number;
}

interface HfClientConfig {
  baseUrl: string;
  rateLimitRpm: number;
  cacheTtlMs: number;
  maxRetries: number;
  timeoutMs: number;
  retryBackoffMs: number;
}

interface HfClientStats {
  cacheHits: number;
  cacheMisses: number;
  rateLimited: number;
  retries: number;
  dedupedRequests: number;
  requestsQueued: number;
}

const DEFAULT_CONFIG: HfClientConfig = {
  baseUrl: process.env.AI_SERVICE_URL || process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'https://gapura-dev-gapura-ai.hf.space',
  rateLimitRpm: parseInt(process.env.HF_RATE_LIMIT_RPM || '100', 10),
  cacheTtlMs: parseInt(process.env.HF_CACHE_TTL_MS || '300000', 10),
  maxRetries: parseInt(process.env.HF_MAX_RETRIES || '3', 10),
  timeoutMs: parseInt(process.env.HF_TIMEOUT_MS || '120000', 10),
  retryBackoffMs: parseInt(process.env.HF_RETRY_BACKOFF_MS || '1000', 10),
};

class HuggingFaceClient {
  private config: HfClientConfig;
  private requestTimestamps: number[] = [];
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private pendingRequests: Map<string, Promise<Response>> = new Map();
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue: boolean = false;
  private stats: HfClientStats = {
    cacheHits: 0,
    cacheMisses: 0,
    rateLimited: 0,
    retries: 0,
    dedupedRequests: 0,
    requestsQueued: 0,
  };

  constructor(config: Partial<HfClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCacheCleanup();
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiry < now) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }

  private generateCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  private cleanOldTimestamps(): void {
    const windowStart = Date.now() - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > windowStart);
  }

  private canMakeRequest(): boolean {
    this.cleanOldTimestamps();
    return this.requestTimestamps.length < this.config.rateLimitRpm;
  }

  private async waitForRateLimit(): Promise<void> {
    while (!this.canMakeRequest()) {
      const oldestInWindow = this.requestTimestamps[0];
      if (oldestInWindow) {
        const waitTime = Math.max(100, 60000 - (Date.now() - oldestInWindow) + 100);
        await this.sleep(Math.min(waitTime, 5000));
      }
      this.cleanOldTimestamps();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = this.config.timeoutMs,
    signal?: AbortSignal
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const onAbort = () => {
      clearTimeout(timeoutId);
      controller.abort();
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (signal?.aborted) throw error;
        throw new Error('Request timeout - AI service took too long to respond');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    }
  }

  private async executeRequest(
    url: string,
    options: RequestInit,
    attempt: number = 0
  ): Promise<Response> {
    await this.waitForRateLimit();
    this.recordRequest();

    try {
      const response = await this.fetchWithTimeout(url, options);

      if (response.status === 429 && attempt < this.config.maxRetries) {
        this.stats.rateLimited++;
        this.stats.retries++;
        
        const backoffMs = this.config.retryBackoffMs * Math.pow(2, attempt);
        await this.sleep(backoffMs);
        
        return this.executeRequest(url, options, attempt + 1);
      }

      return response;
    } catch (error) {
      if (attempt < this.config.maxRetries && error instanceof Error) {
        this.stats.retries++;
        const backoffMs = this.config.retryBackoffMs * Math.pow(2, attempt);
        await this.sleep(backoffMs);
        return this.executeRequest(url, options, attempt + 1);
      }
      throw error;
    }
  }

  private processQueue(): void {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    
    this.isProcessingQueue = true;

    const processNext = async () => {
      while (this.requestQueue.length > 0) {
        if (!this.canMakeRequest()) {
          await this.waitForRateLimit();
        }

        const request = this.requestQueue.shift();
        if (!request) break;

        try {
          const response = await this.executeRequest(
            request.url,
            request.options,
            request.attempt
          );
          request.resolve(response);
        } catch (error) {
          request.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }

      this.isProcessingQueue = false;
    };

    processNext();
  }

  async fetch(
    url: string,
    options: RequestInit = {},
    cacheOptions?: { 
      cacheKey?: string; 
      ttl?: number;
      bypassCache?: boolean;
    },
    signal?: AbortSignal
  ): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
    const effectiveTtl = cacheOptions?.ttl ?? this.config.cacheTtlMs;
    const cacheKey = cacheOptions?.cacheKey ?? this.generateCacheKey(fullUrl, options);

    if (!cacheOptions?.bypassCache && (options.method === 'GET' || !options.method)) {
      const cached = this.cache.get(cacheKey) as CacheEntry<Response> | undefined;
      if (cached && cached.expiry > Date.now()) {
        this.stats.cacheHits++;
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
        });
      }
      this.stats.cacheMisses++;

      if (this.pendingRequests.has(cacheKey)) {
        this.stats.dedupedRequests++;
        return this.pendingRequests.get(cacheKey)!;
      }
    }

    const requestPromise = (async () => {
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      if (!this.canMakeRequest()) {
        this.stats.requestsQueued++;
        return new Promise<Response>((resolve, reject) => {
          this.requestQueue.push({
            resolve,
            reject,
            url: fullUrl,
            options,
            attempt: 0,
          });
          this.processQueue();
        });
      }

      const response = await this.executeRequest(fullUrl, options);

      if (
        response.ok &&
        !cacheOptions?.bypassCache &&
        (options.method === 'GET' || !options.method)
      ) {
        try {
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          this.cache.set(cacheKey, {
            data,
            expiry: Date.now() + effectiveTtl,
            url: fullUrl,
          });
        } catch {
          // Non-JSON response, skip caching
        }
      }

      return response;
    })();

    if (!cacheOptions?.bypassCache && (options.method === 'GET' || !options.method)) {
      this.pendingRequests.set(cacheKey, requestPromise);
      requestPromise.finally(() => {
        this.pendingRequests.delete(cacheKey);
      });
    }

    return requestPromise;
  }

  async fetchJson<T = unknown>(
    url: string,
    options: RequestInit = {},
    cacheOptions?: {
      cacheKey?: string;
      ttl?: number;
      bypassCache?: boolean;
    },
    signal?: AbortSignal
  ): Promise<T> {
    const response = await this.fetch(url, options, cacheOptions, signal);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  getStats(): HfClientStats & { cacheSize: number; queueLength: number } {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      queueLength: this.requestQueue.length,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(pattern?: string | RegExp): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (typeof pattern === 'string') {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      } else {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  getConfig(): HfClientConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<HfClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

let globalHfClient: HuggingFaceClient | null = null;

export function getHfClient(config?: Partial<HfClientConfig>): HuggingFaceClient {
  if (!globalHfClient) {
    globalHfClient = new HuggingFaceClient(config);
  }
  return globalHfClient;
}

export function resetHfClient(): void {
  globalHfClient = null;
}

export { HuggingFaceClient };
export type { HfClientConfig, HfClientStats };
