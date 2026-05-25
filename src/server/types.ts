import { Request } from 'express';

export interface AICommandRequest extends Request {
  body: {
    prompt: string;
    currentContext?: string;
  };
}

export interface ScraperExecuteRequest extends Request {
  body: {
    targets: any[];
  };
}

export interface SystemStats {
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  uptime: number;
  timestamp: number;
  activeScrapers: number;
}
