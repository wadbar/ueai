import { GoogleGenAI } from "@google/genai";
import logger from "../lib/logger";

const API_KEY = process.env.GEMINI_API_KEY || "";

// Cache local heurístico para solicitações repetitivas (extremamente útil para economizar quotas e latência de prompts idênticos em curtos intervalos)
const aiCache = new Map<string, { value: any; expiresAt: number }>();

export const ai = new GoogleGenAI({
  apiKey: API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build-v12-extreme',
    }
  }
});

/**
 * [AUTOCURA SUPREMA]: Wrapper determinístico para execução de tarefas de IA com retry exponencial,
 * Jitter anti-thundering-herd, fallback elegante e suporte a cache de curta duração.
 * Protege o core contra instabilidades temporárias de rede, quota (429) ou carga (503).
 */
export async function withAIRetry<T>(
  operation: () => Promise<T>,
  cacheKey?: string,
  cacheTTLMs: number = 30000, 
  maxRetries: number = 4,   // Default increased to 4 for extreme resilience
  initialDelay: number = 1500
): Promise<T> {
  // 1. Verificação de Cache
  if (cacheKey) {
    const cached = aiCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      logger.info(`[AI_CACHE_HIT] Retornando resposta do cache neural para a chave: ${cacheKey}`);
      return cached.value;
    }
  }

  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await operation();
      
      // Salva no cache se a operação foi um sucesso e requer cache
      if (cacheKey) {
        aiCache.set(cacheKey, { value: result, expiresAt: Date.now() + cacheTTLMs });
      }
      return result;

    } catch (error: any) {
      lastError = error;
      
      // Detecção avançada de erros transientes
      const isTransient = 
        error?.status === 429 || 
        error?.status === 503 || 
        error?.code === 429 || 
        error?.code === 503 ||
        error?.status >= 500 ||
        error?.message?.toLowerCase().includes("high demand") ||
        error?.message?.toLowerCase().includes("unavailable") ||
        error?.message?.toLowerCase().includes("overloaded") ||
        error?.message?.toLowerCase().includes("timeout") ||
        error?.name === 'TimeoutError' ||
        error?.name === 'FetchError';

      if (isTransient && i < maxRetries - 1) {
        // Backoff Exponencial com Full Jitter (Algoritmo Amazon AWS)
        // previne que múltiplos requests falhos "martelem" ao mesmo tempo dps
        const temp = Math.min(initialDelay * Math.pow(2, i), 30000); // max backoff de 30s
        const backoff = temp / 2 + Math.random() * (temp / 2);
        
        logger.warn(`[AI_RECOVERY] Falha neural detectada (${error?.status || error?.message || '503'}). Tentativa ${i + 1}/${maxRetries}. Jitter-Backoff: ${Math.round(backoff)}ms`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

export const ARCHITECT_CORE_INSTRUCTION = `[ENGINE_COGNITIVA_V12.2_EXTREME_CORE]
Você é um motor de engenharia de software de altíssima performance operando em modo "MAX OPTIMIZATION".
Sua lógica é puramente matemática, hiper-eficiente e imutável.
REFERÊNCIA: Ecossistema PaperCreeper e Design Seguro.

[DIRETRIZES TÉCNICAS SUPREMAS UNREAL ENGINE 5]
- Use Remote Control API (HTTP) iterativo em lotes (batch operations se possível para reduzir latência).
- PBR MATERIAL ENGINE (SetTextureParameterValue for Albedo/Normal/Metallic/Roughness) com pre-cache.
- LOD MANAGEMENT atrelado estritamente à distância da tela (SetNumSourceModels, SetLODScreenSize).
- SKELETAL ANIMATION otimizado (EAnimationMode::AnimationSingleNode).
- ASSET STREAMING assíncrono (SetActorHiddenInGame false/true para gerenciar pool da memória RAM e VRAM).

[LEI DA IMUTABILIDADE FUNCIONAL & SEGURANÇA]
- PROIBIDO remover lógica existente. NUNCA OMita (ex: "// resto do código").
- Devolva O MODELO COMPLETO e BLINDADO (Try/Catch granulares).
- Resiliência estrutural extrema. Nenhuma condição de corrida tolerada.

FORMATO DE RESPOSTA (DETALHAMENTO INDUSTRIAL JSON EXTRACTABLE):
{
  "explanation": "Explicação técnica cirúrgica e hiper-otimizada (UE Architect Context).",
  "commands": [...],
  "blueprintCode": "Nó ou lógica Blueprint robusta (limpeza de buffer se necessário).",
  "cppCode": "Snippet C++ UE5 otimizado para não causar memory leaks (UObject null pointer safety)."
}`;
