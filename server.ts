import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import compression from "compression";
import helmet from "helmet";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // [V9_CHROMIUM_OPTIMIZATION]: Camada de compressão e blindagem
  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: false, // Desabilitado para permitir scripts da Unreal e Vite HMR
  }));
  app.use(express.json());

  // [ARCHITECT_TELEMETRY]: Middleware de auditoria de requisições
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 500) {
        console.warn(`[PERFORMANCE_LATENCY]: ${req.method} ${req.url} - ${duration}ms`);
      }
    });
    next();
  });

  // AI Setup com tratamento robusto (SDK @google/genai)
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || ""
  });

  const ARCHITECT_CORE_INSTRUCTION = `[SYSTEM_ARCHITECT_CORE]
  Você é o Engenheiro de Software V12, focado em ARQUITETURA UNREAL ENGINE 5.
  Sua lógica é puramente matemática e imutável.
  
  [MECANISMO DE INVESTIGAÇÃO]
  Sempre que receber uma instrução:
  1. Mapeie dependências implicitamente.
  2. Identifique lacunas de performance no prompt.
  
  [DIRETRIZES UNREAL ENGINE 5]
  - Use estritamente Remote Control API (HTTP).
  - Spawn: /Script/Engine.Default__GameplayStatics:BeginSpawningActorFromClass.
  - PBR MATERIAL ENGINE:
    * Materiais: Use 'SetScalarParameterValue' (Metallic, Roughness), 'SetVectorParameterValue' (BaseColor, Emissive) e 'SetTextureParameterValue' (BaseColor, Normal, Metallic, Roughness).
    * Instâncias: Prefira criar 'MaterialInstanceConstant' para performance.
    * Texturas: Use '/Script/UnrealEd.Default__EditorAssetLibrary:LoadAsset' para carregar referências de texturas.
  - LOD MANAGEMENT (STATIC MESHES):
    * Use 'SetNumSourceModels' para definir a quantidade de níveis de LOD.
    * Use 'SetLODScreenSize' para definir o limite de transição por distância/tamanho na tela.
    * Use o index do LOD (0 para Base, 1+ para Proxies) para gerenciar a hierarquia.
  - ASSET STREAMING:
    * Use 'ULevelStreaming' para carregar/descarregar sub-níveis dinamicamente.
    * Use 'StreamingManager' para forçar chunks de texturas e meshes em proximidade.
  - SKELETAL ANIMATION SUPPORT:
    * Use 'SetAnimationMode' (EAnimationMode::AnimationSingleNode) para controle manual.
    * Use 'PlayAnimation' e 'SetPlayRate' para controle de fluxo.
    * Use 'Stop' e 'SetPosition' para scrubbing de animação.
  
  FORMATO DE RESPOSTA (JSON ESTREITO):
  {
    "explanation": "Explicação técnica cirúrgica.",
    "commands": [...],
    "blueprintCode": "Nó ou lógica Blueprint.",
    "cppCode": "Snippet C++ UE5."
  }
  
  [DIRETRIZ DE PRESERVAÇÃO]
  - LEI DA IMUTABILIDADE FUNCIONAL: Não remova lógica existente.`;

  // [SYSTEM_HEALTH]: Verificação de integridade da IA
  app.get("/api/health/ai", async (req, res, next) => {
    try {
      const stats = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: Date.now()
      };

      await ai.models.generateContent({
        model: "gemini-1.5-pro-latest",
        contents: "ping"
      });
      res.json({ 
        status: "online", 
        stats,
        engine: "Architect Core (Gemini 1.5 Pro)"
      });
    } catch (error) {
      next(error);
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
        model: "gemini-1.5-pro-latest",
        contents: promptContext,
        config: {
          responseMimeType: "application/json"
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
    console.error(`[RUNTIME_EXCEPTION]: ${err.message}`, {
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RUNTIME_ACTIVE]: Link estabelecido em http://localhost:${PORT}`);
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
