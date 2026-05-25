import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import compression from "compression";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import logger from "./src/lib/logger";

// Route Imports
import systemRoutes from "./src/server/routes/systemRoutes";
import aiRoutes from "./src/server/routes/aiRoutes";
import scraperRoutes from "./src/server/routes/scraperRoutes";

// Singleton Imports
import { scraperWorker } from "./src/server/WebScraperWorker";

dotenv.config();

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

  // [V9_ENVIRONMENT_OPTIMIZATION]: Extreme compression and security
  app.use(compression({
    level: 9, 
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

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // [ARCHITECT_TELEMETRY]: Request Audit Middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logMsg = `[HTTP_AUDIT] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`;
      
      const isStaticOrAsset = req.url.match(/\.(tsx|ts|js|jsx|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i) || 
                            req.url.startsWith('/@') || 
                            req.url.startsWith('/node_modules') || 
                            req.url.startsWith('/src/');
                            
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

  // [SOCKET_HANDLERS]
  io.on("connection", (socket) => {
    socket.on("client_ping", (cb) => {
      if (typeof cb === "function") cb(Date.now());
    });
  });

  // [TELEMETRY_LOOP]
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

  // [API_MOUNTS]: Agnostic Modular Routes
  app.use("/api/system", systemRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/scraper", scraperRoutes);

  // Backward compatibility check for top-level health
  app.get("/api/health/ai", (req, res, next) => {
    // Proxy to /api/ai/health but keeping specific old behavior if any
    res.redirect("/api/ai/health");
  });

  // [ERROR_DETECTION]: Detector de Lacunas (Pattern PaperCreeper)
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

  server.keepAliveTimeout = 61000;
  server.headersTimeout = 65000;

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
