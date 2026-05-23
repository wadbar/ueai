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
    
    try {
      return await new Promise<ScrapeResult>((resolve, reject) => {
        const urlObj = new URL(config.url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const req = protocol.request(config.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (VLC/Kodi-Scraper-Like Architecture) Industrial/1.0',
            ...config.headers
          },
          timeout: config.timeoutMs,
          signal: this.abortController.signal
        }, (res) => {
          let rawData = '';
          
          res.setEncoding('utf8');
          res.on('data', (chunk) => { rawData += chunk; });
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
        // Backoff exponencial blindado
        await new Promise(r => setTimeout(r, Math.random() * 1000 * attempt));
        return this.scrapeWithRetry(config, attempt + 1);
      }
      throw error;
    }
  }

  public getActiveWorkers(): number {
    return this.activeConnections;
  }
}
