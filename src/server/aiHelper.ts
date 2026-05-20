import { GoogleGenAI } from "@google/genai";
import logger from "../lib/logger";

const API_KEY = process.env.GEMINI_API_KEY || "";

export const ai = new GoogleGenAI({
  apiKey: API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * [AUTOCURA]: Wrapper determinístico para execução de tarefas de IA com retry exponencial.
 * Protege o core contra instabilidades temporárias de rede ou carga (429/503).
 */
export async function withAIRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Detecção de erros transientes (Excesso de demanda ou limites de cota)
      const isTransient = 
        error?.status === 429 || 
        error?.status === 503 || 
        error?.code === 429 || 
        error?.code === 503 ||
        error?.message?.toLowerCase().includes("high demand") ||
        error?.message?.toLowerCase().includes("unavailable") ||
        error?.message?.toLowerCase().includes("overloaded");

      if (isTransient && i < maxRetries - 1) {
        const backoff = initialDelay * Math.pow(2, i);
        logger.warn(`[AI_RECOVERY] Falha transiente detectada (${error?.status || '503'}). Tentativa ${i + 1}/${maxRetries}. Backoff: ${backoff}ms`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

export const ARCHITECT_CORE_INSTRUCTION = `[ENGINE_COGNITIVA_V12.1_CORE]
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
  "explanation": "Explicação técnica cirúrgica (UE Architect Context).",
  "commands": [...],
  "blueprintCode": "Nó ou lógica Blueprint.",
  "cppCode": "Snippet C++ UE5."
}`;
