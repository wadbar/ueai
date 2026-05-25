import { Router, Response } from "express";
import { ai, withAIRetry, ARCHITECT_CORE_INSTRUCTION } from "../aiHelper";
import logger from "../../lib/logger";
import { AICommandRequest } from "../types";
import crypto from "crypto";

const router = Router();

const getModelForEnvironment = () => {
  return process.env.NODE_ENV !== "production" ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
};

router.get("/health", async (req, res) => {
  try {
    await withAIRetry(() => ai.models.generateContent({
      model: getModelForEnvironment(),
      contents: "ping"
    }));
    res.json({ status: "online", engine: getModelForEnvironment() });
  } catch (error: any) {
    const statusCode = error?.status || error?.code || 500;
    res.status(statusCode).json({ status: "error", code: statusCode });
  }
});

router.post("/command", async (req: AICommandRequest, res: Response) => {
  const { prompt, currentContext } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: "PAYLOAD_INVALIDO", message: "Prompt é obrigatório." });
  }

  try {
    const promptContext = `
      [SYSTEM_ARCHITECT_DIRECTIVE]
      ${ARCHITECT_CORE_INSTRUCTION}
      ---
      CONTEXTO_LOCAL: ${currentContext || "Nenhum contexto fornecido"}
      INPUT_USUARIO: ${prompt}
    `;

    // High precision cache key using SHA256 for deterministic identical results
    const cacheKey = crypto.createHash('sha256').update(promptContext).digest('hex').substring(0, 64);

    const response = await withAIRetry(() => ai.models.generateContent({
      model: getModelForEnvironment(),
      contents: promptContext,
      config: {
        responseMimeType: "application/json",
        temperature: 0.01,
        topP: 0.95
      }
    }), cacheKey, 120000);

    const responseText = response.text || "";
    if (!responseText) throw new Error("RESPOSTA_NEURAL_VAZIA");

    res.json(JSON.parse(responseText));
  } catch (error: any) {
    const statusCode = error?.status || error?.code || 500;
    logger.error(`[AI_COMMAND_ERROR]: ${error.message}`, { status: statusCode });

    if (statusCode === 429) {
      res.status(429).json({ status: "limited", message: "Quota exhausted." });
    } else if (statusCode === 503 || error?.message?.includes("demand")) {
      res.status(503).json({ status: "degraded", message: "AI Engine overloaded." });
    } else {
      res.status(500).json({ status: "error", message: "Internal Engine Failure" });
    }
  }
});

export default router;
