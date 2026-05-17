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

  // [V9_CHROMIUM_OPTIMIZATION]: Camada de compressão e blindagem
  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: false,
  }));
  app.use(express.json());
  app.use("/api/", limiter);

  // [ARCHITECT_TELEMETRY]: Middleware de auditoria de requisições via Winston
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logMsg = `[HTTP_AUDIT] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`;
      
      logger.info(logMsg);
      io.emit("audit_log", {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: logMsg,
        metadata: { method: req.method, url: req.url, status: res.statusCode }
      });
      
      if (duration > 500) {
        const warnMsg = `[PERFORMANCE_LATENCY]: ${req.method} ${req.url} - ${duration}ms`;
        logger.warn(warnMsg);
        io.emit("audit_log", {
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: warnMsg,
          metadata: { duration }
        });
      }
    });
    next();
  });

  // Socket.IO Telemetry Loop
  setInterval(() => {
    io.emit("system_stats", {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  }, 2000);

  // AI Setup com tratamento robusto (SDK @google/genai)
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const ARCHITECT_CORE_INSTRUCTION = `[ENGINE_COGNITIVA_V12.1_CORE]
  Você é um motor de engenharia de software de altíssima performance. Sua lógica é puramente matemática e imutável.
  REFERÊNCIA: Ecossistema PaperCreeper.
  
  [DIRETRIZES TÉCNICAS UNREAL ENGINE 5]
  - Use Remote Control API (HTTP).
  - PBR MATERIAL ENGINE (SetTextureParameterValue for Albedo/Normal/Metallic/Roughness).
  - LOD MANAGEMENT: SetNumSourceModels, SetLODScreenSize.
  - SKELETAL ANIMATION: EAnimationMode::AnimationSingleNode, PlayAnimation.
  - ASSET STREAMING: SetActorHiddenInGame (false = Load, true = Unload).
  
  [LEI DA IMUTABILIDADE FUNCIONAL]
  - PROIBIDO remover lógica existente.
  - Foco em BLINDAGEM e REFINAMENTO.
  - Injetar try/catch granulares.
  
  FORMATO DE RESPOSTA (DETALHAMENTO INDUSTRIAL):
  {
    "explanation": "Explicação técnica cirúrgica (Nebula Context).",
    "commands": [...],
    "blueprintCode": "Nó ou lógica Blueprint.",
    "cppCode": "Snippet C++ UE5."
  }`;

  // [SYSTEM_HEALTH]: Verificação de integridade da IA
  app.get("/api/health/ai", async (req, res, next) => {
    try {
      const stats = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: Date.now()
      };

      await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "ping"
      });
      res.json({ 
        status: "online", 
        stats,
        engine: "Architect Core (Gemini 3 Flash)"
      });
    } catch (error) {
      next(error);
    }
  });

  // [DYNAMIC_STREAMING]: Simulação de sinal de telemetria Unreal Engine -> Dashboard
  let mockX = 0;
  setInterval(() => {
    mockX = (mockX + 500) % 20000;
    io.emit("player_update", { x: mockX, y: Math.sin(mockX / 2000) * 4000, z: 0 });
  }, 3000);

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
  app.post("/api/ai/command", async (req, res, next) => {
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

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: promptContext,
        config: {
          responseMimeType: "application/json",
          temperature: 0.05,
          topP: 0.99
        }
      });

      const responseText = response.text || "";
      if (!responseText) throw new Error("RESPOSTA_NEURAL_VAZIA");

      res.json(JSON.parse(responseText));
    } catch (error: any) {
      next(error);
    }
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

  // [GRACEFUL_SHUTDOWN]: Preservação de estado ao encerrar
  process.on('SIGTERM', () => {
    console.log('[SIGNAL]: SIGTERM recebido. Encerrando conexões de forma segura...');
    server.close(() => {
      console.log('[HALT]: Servidor encerrado.');
      process.exit(0);
    });
  });
}

startServer();
