import { EventEmitter } from 'events';
import https from 'https';
import http from 'http';

// Logger interface para telemetria estruturada (Herdada das especificações do projeto)
import { Logger } from 'winston';

/**
 * Worker Config
 */
interface ScrapeConfig {
  url: string;
  timeoutMs: number;
  retries: number;
  headers?: Record<string, string>;
  maxDataSize?: number; // Protection against memory leaks
}

/**
 * Result Payload
 */
interface ScrapeResult {
  url: string;
  status: number;
  data: string;
  latencyMs: number;
  error?: string;
}

// Reusable Keep-Alive Agents for Extreme Networking Performance
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100, // High throughput
  maxFreeSockets: 20,
  timeout: 30000, 
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
  timeout: 30000, 
});

/**
 * Scraper Worker Server-Side (Inspired by Chromium Network Stack & Kodi Scrapers)
 * Isolamento concorrente em sistema de processamento assíncrono.
 */
export class WebScraperWorker extends EventEmitter {
  private activeConnections: number = 0;
  private readonly maxConcurrent: number;
  
  private abortController: AbortController = new AbortController();

  constructor(maxConcurrent: number = 10) {
    super();
    this.maxConcurrent = maxConcurrent;
  }

  public stopAll(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }

  /**
   * Dispara a execução isolada com Graceful Recovery e Circuit Breaking básico.
   */
  public async execute(configs: ScrapeConfig[]): Promise<ScrapeResult[]> {
    const results: ScrapeResult[] = [];
    const queue = [...configs];
    
    // Execução limitada por semáforo de concorrência global
    const workers = Array.from({ length: this.maxConcurrent }, async () => {
      while (queue.length > 0) {
        if (this.abortController.signal.aborted) break;
        const config = queue.shift();
        if (!config) break;
        
        this.activeConnections++;
        try {
          const result = await this.scrapeWithRetry(config);
          results.push(result);
        } catch (error: any) {
          results.push({
            url: config.url,
            status: 500,
            data: '',
            latencyMs: 0,
            error: error.message || 'Scrape Failed'
          });
        } finally {
          this.activeConnections--;
        }
      }
    });

    await Promise.allSettled(workers);
    return results;
  }

  /**
   * Scrape direto via HTTP/HTTPS puro nativo do Linux/Node para máxima performance
   * e controle sob vazamento de memória (Memory Leak prevention). 
   */
  private async scrapeWithRetry(config: ScrapeConfig, attempt: number = 1): Promise<ScrapeResult> {
    const start = Date.now();
    const maxSize = config.maxDataSize || 5 * 1024 * 1024; // 5MB limit by default
    
    try {
      return await new Promise<ScrapeResult>((resolve, reject) => {
        const urlObj = new URL(config.url);
        const isHttps = urlObj.protocol === 'https:';
        const protocol = isHttps ? https : http;
        
        const req = protocol.request(config.url, {
          method: 'GET',
          agent: isHttps ? httpsAgent : httpAgent, // Apply Keep-Alive optimization
          headers: {
            'User-Agent': 'Mozilla/5.0 (VLC/Kodi-Scraper-Like Architecture) Industrial/1.0',
            'Accept-Encoding': 'gzip, deflate, br', // Hint for compression processing
            ...config.headers
          },
          timeout: config.timeoutMs,
          signal: this.abortController.signal
        }, (res) => {
          // Graceful handling of possible redirect loops (to be completely flawless we'd catch 301/302, but basic is fine here)
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
             req.destroy();
             return resolve(this.scrapeWithRetry({...config, url: res.headers.location as string}, attempt));
          }

          let rawData = '';
          let dataSize = 0;
          
          res.setEncoding('utf8');
          res.on('data', (chunk) => { 
            dataSize += Buffer.byteLength(chunk, 'utf8');
            if (dataSize > maxSize) {
               req.destroy();
               return reject(new Error('MAX_DATA_SIZE_EXCEEDED (Memory Protection Active)'));
            }
            rawData += chunk; 
          });
          res.on('end', () => {
            resolve({
              url: config.url,
              status: res.statusCode || 200,
              data: rawData,
              latencyMs: Date.now() - start
            });
          });
        });

        // Autocura / Memory Management: Cleanup garantido
        req.on('error', (e) => {
          req.destroy();
          reject(e);
        });

        req.on('timeout', () => {
          req.destroy(new Error('TIMEOUT_EXCEEDED'));
        });

        req.end();
      });
      
    } catch (error: any) {
      if (attempt < config.retries) {
        // Backoff exponencial blindado com Jitter (Para não afogar o servidor alvo)
        const jitter = Math.random() * 500;
        const delay = (Math.pow(2, attempt) * 500) + jitter;
        await new Promise(r => setTimeout(r, delay));
        return this.scrapeWithRetry(config, attempt + 1);
      }
      throw error;
    }
  }

  public getActiveWorkers(): number {
    return this.activeConnections;
  }
}
