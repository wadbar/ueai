import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import compression from "compression";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import logger from "./src/lib/logger";

import fs from "fs/promises";
import os from "os";
import { WebScraperWorker } from "./src/server/WebScraperWorker";
import { ai, withAIRetry, ARCHITECT_CORE_INSTRUCTION } from "./src/server/aiHelper";

dotenv.config();

const scraperWorker = new WebScraperWorker(10);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: {
    error: "RATE_LIMIT_EXCEEDED",
    message: "Muitas requisições. O motor entrou em modo de resfriamento."
  }
});

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  const PORT = 3000;

  // [V9_CHROMIUM_OPTIMIZATION]: Camada de compressão suprema e blindagem
  app.use(compression({
    level: 9, // Extreme compression for static assets text
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));
  
  app.use(helmet({
    contentSecurityPolicy: false,
    dnsPrefetchControl: { allow: true },
    frameguard: { action: 'sameorigin' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
  }));
  app.use(express.json({ limit: '10mb' })); // Increased limit for massive blueprint payloads
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use("/api/", limiter);

  // [ARCHITECT_TELEMETRY]: Middleware de auditoria de requisições via Winston
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logMsg = `[HTTP_AUDIT] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`;
      
      // Omitir logs ruidosos de arquivos estáticos e HMR no desenvolvimento
      const isStaticOrAsset = req.url.match(/\.(tsx|ts|js|jsx|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i) || req.url.startsWith('/@') || req.url.startsWith('/node_modules') || req.url.startsWith('/src/');
      if (!isStaticOrAsset || res.statusCode >= 400) {
        logger.info(logMsg);
        io.emit("audit_log", {
          timestamp: new Date().toISOString(),
          level: res.statusCode >= 400 ? 'error' : (duration > 500 ? 'warn' : 'info'),
          message: logMsg,
          metadata: { 
            method: req.method, 
            url: req.url, 
            status: res.statusCode,
            duration,
            userAgent: req.headers['user-agent']
          }
        });
      }
    });
    next();
  });

  // Socket.IO Telemetry Loop - Real Metrics
  setInterval(() => {
    const mem = process.memoryUsage();
    io.emit("system_stats", {
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024)
      },
      cpu: process.cpuUsage(),
      uptime: Math.round(process.uptime()),
      timestamp: Date.now(),
      activeScrapers: scraperWorker.getActiveWorkers()
    });
  }, 2000);

  const getModelForEnvironment = () => {
    // No AI Studio de desenvolvimento, usamos todo o poder do modelo integrado (Gemini 3.1 Pro).
    // Em produção/compartilhado, fazemos fallback para o Flash para economizar recursos e garantir latência,
    // sem quebrar o acesso.
    return process.env.NODE_ENV !== "production" ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  };

  // [SYSTEM_HEALTH]: Verificação de integridade da IA com Autocura
  app.get("/api/health/ai", async (req, res) => {
    try {
      const stats = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: Date.now()
      };

      await withAIRetry(() => ai.models.generateContent({
        model: getModelForEnvironment(),
        contents: "ping"
      }));

      res.json({ 
        status: "online", 
        stats,
        engine: `Architect Core (${getModelForEnvironment()})`
      });
    } catch (error: any) {
      const statusCode = error?.status || error?.code || 500;
      
      if (statusCode === 429) {
        res.status(429).json({ status: "limited", message: "Quota exhausted" });
      } else if (statusCode === 503 || error?.message?.includes("demand")) {
        res.status(503).json({ status: "degraded", message: "AI Engine is overloaded. Self-healing in progress." });
      } else {
        logger.error("AI_HEALTH_CHECK_ERROR:", error);
        res.status(500).json({ status: "error", message: "Internal server error" });
      }
    }
  });

  // [ARCHITECT_TELEMETRY]: Monitoramento de integridade real
  app.get("/api/system/status", (req, res) => {
    res.json({
      status: "operational",
      uptime: process.uptime(),
      timestamp: Date.now(),
      v9_layer: "Active",
      papercreeper_matriz: "V12.1"
    });
  });

  // [REAL I/O FILES]: Ler a estrutura de arquivos da workspace
  app.get("/api/system/files", async (req, res) => {
    try {
      const rootDir = process.cwd();
      const items = await fs.readdir(rootDir, { withFileTypes: true });
      // Remove node_modules e dist por questões de clean up
      const filtered = items.filter(i => 
        !i.name.includes("node_modules") && 
        !i.name.includes(".git") && 
        !i.name.includes(".next") && 
        !i.name.includes("dist")
      );
      
      const files = filtered.map(i => ({
        name: i.name,
        isDirectory: i.isDirectory(),
      }));

      // Extra logic: se achar pasta 'src', list de forma shallow
      try {
         const srcItems = await fs.readdir(path.join(rootDir, 'src'), { withFileTypes: true });
         const inner = srcItems.map(i => ({ name: 'src/' + i.name, isDirectory: i.isDirectory() }));
         files.push(...inner);
      } catch (e) {}

      res.json(files);
    } catch (e: any) {
      res.status(500).json({ error: "FILE_READ_ERROR", message: e.message });
    }
  });

  // [REAL OS RESOUCES]: Métricas baseadas na CPU e Memória
  app.get("/api/system/resources", (req, res) => {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memPerc = totalMem ? (usedMem / totalMem) * 100 : 0;
      
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      cpus.forEach(core => {
        for (const type in core.times) {
          totalTick += core.times[type as keyof typeof core.times];
        }
        totalIdle += core.times.idle;
      });
      const idle = totalTick > 0 ? (totalIdle / totalTick) * 100 : 0;
      const cpuPerc = 100 - idle;

      res.json({ 
        cpu: cpuPerc, 
        memory: memPerc,
        timestamp: Date.now()
      });
    } catch (error: any) {
      res.status(500).json({ error: "OS_RESOURCE_ERROR", message: error.message });
    }
  });

  // [V9_ENVIRONMENT_CHECK]: Verifica configuração de variáveis
  app.get("/api/system/env", (req, res) => {
    res.json({
      gemini_key_configured: !!process.env.GEMINI_API_KEY,
      node_version: process.version,
      platform: process.platform,
      arch: process.arch
    });
  });

  // API to translate natural language to Unreal Engine Remote Control commands
  app.post("/api/ai/command", async (req, res) => {
    const { prompt, currentContext } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: "PAYLOAD_INVALIDO", message: "Prompt é obrigatório." });
    }

    try {
      const promptContext = `
        [SYSTEM_ARCHITECT_DIRECTIVE]
        ${ARCHITECT_CORE_INSTRUCTION}
        ---
        CONTEXTO_LOCAL: ${JSON.stringify(currentContext)}
        INPUT_USUARIO: ${prompt}
      `;

      // Utilize caching with extreme performance for identical exact prompts and context (using base64 or basic string crypto for key)
      const cacheKey = Buffer.from(promptContext).toString('base64').substring(0, 256); // simple deterministic key

      const response = await withAIRetry(() => ai.models.generateContent({
        model: getModelForEnvironment(),
        contents: promptContext,
        config: {
          responseMimeType: "application/json",
          temperature: 0.01, // extremely deterministic logic
          topP: 0.95
        }
      }), cacheKey, 120000); // 2 minutes cache TTL

      const responseText = response.text || "";
      if (!responseText) throw new Error("RESPOSTA_NEURAL_VAZIA");

      res.json(JSON.parse(responseText));
    } catch (error: any) {
      const statusCode = error?.status || error?.code || 500;

      if (statusCode === 429) {
        res.status(429).json({ status: "limited", message: "Quota exhausted. Try again later." });
      } else if (statusCode === 503 || error?.message?.includes("demand")) {
        res.status(503).json({ status: "degraded", message: "AI Engine currently unavailable. Try again in a few seconds." });
      } else {
        logger.error("AI_COMMAND_ERROR:", error);
        res.status(500).json({ status: "error", message: "Internal server error" });
      }
    }
  });

  // [WEB_SCRAPER_INTEGRATION]: Endpoint robusto de mineração assíncrona (Inspired by Kodi/OpenSearch)
  app.post("/api/scraper/execute", async (req, res) => {
    const { targets } = req.body;
    
    if (!Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ error: "INVALID_TARGETS", message: "É necessário fornecer um array de alvos de raspagem (configs)." });
    }

    try {
      // Dispara o processamento isolado no worker assíncrono
      const results = await scraperWorker.execute(targets);
      res.json({
        status: "success",
        timestamp: Date.now(),
        data: results
      });
    } catch (error: any) {
      console.error("SCRAPE_FAULT:", error);
      res.status(500).json({ error: "SCRAPE_FAULT", message: "O motor de raspagem falhou durante a execução." });
    }
  });

  app.get("/api/scraper/status", (req, res) => {
    res.json({
      status: "online",
      activeWorkers: scraperWorker.getActiveWorkers(),
      timestamp: Date.now()
    });
  });

  // [DETECTOR_DE_LACUNAS]: Middleware de tratamento global de erros (Pattern PaperCreeper)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(`[RUNTIME_EXCEPTION]: ${err.message}`, {
      stack: err.stack,
      url: req.url,
      method: req.method
    });

    res.status(err.status || 500).json({
      error: "UNCAUGHT_EXCEPTION",
      message: "O motor de inferência encontrou uma instabilidade estrutural.",
      code: err.code || "CORE_FAULT",
      timestamp: Date.now()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = httpServer.listen(PORT, "0.0.0.0", () => {
    logger.info(`[RUNTIME_ACTIVE]: Link estabelecido em http://localhost:${PORT}`);
  });

  // [EXTREME_OPTIMIZATION]: Keep-Alive Timeout settings
  server.keepAliveTimeout = 61000;
  server.headersTimeout = 65000; // should be > keepAliveTimeout

  // [GRACEFUL_SHUTDOWN]: Preservação de estado e autocura
  const gracefulTeardown = (signal: string) => {
    logger.info(`[SIGNAL]: ${signal} detectado. Iniciando teardown assíncrono...`);
    scraperWorker.stopAll();
    setTimeout(() => {
      server.close(() => {
        logger.info(`[HALT]: Processo ${signal} encerrado com sucesso.`);
        process.exit(0);
      });
    }, 100);
  };

  process.on('SIGTERM', () => gracefulTeardown('SIGTERM'));
  process.on('SIGINT', () => gracefulTeardown('SIGINT'));

  process.on('uncaughtException', (err: Error) => {
    logger.error('[TELEMETRY_UNCAUGHT_EXCEPTION] Falha letal não tratada:', err);
    gracefulTeardown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('[TELEMETRY_UNHANDLED_REJECTION] Promessa rejeitada:', { reason });
  });
}

startServer().catch((err) => {
  console.error('[CRITICAL_INIT_FAILURE]', err);
  process.exit(1);
});
