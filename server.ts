import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Setup
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API to translate natural language to Unreal Engine Remote Control commands
  app.post("/api/ai/command", async (req, res) => {
    const { prompt, currentContext } = req.body;

    const systemInstruction = `
      Você é um arquiteto especialista em Unreal Engine 5.
      Sua tarefa é converter pedidos em linguagem natural em comandos JSON para a Unreal Engine Remote Control API (HTTP).
      
      Sempre tente traduzir as intenções do usuário para as classes e funções corretas da UE5.
      Exemplo para Câmeras:
      - Para criar uma câmera: Use SpawnActor com a classe '/Script/CinematicCamera.CineCameraActor'.
      - Para posição/rotação: Use '/Script/Engine.Actor:K2_SetActorLocationAndRotation'.
      - Para Field of View: No componente 'CameraComponent', a propriedade é 'FieldOfView'.
      
      Endpoints suportados pela API da UE:
      1. PUT /remote/object/call: Chama uma função (Ex: SpawnActor, SetActorLocation).
      2. PUT /remote/object/property: Define uma propriedade (Ex: FieldOfView).
      
      FORMATO DE RESPOSTA (JSON):
      {
        "explanation": "Explicação técnica clara em português.",
        "commands": [
          {
            "endpoint": "/remote/object/call", 
            "method": "PUT",
            "body": {
              "objectPath": "Caminho_do_Objeto (ou /Script/Engine.Default__GamepadStatics para funções estáticas como SpawnActorFromClass)",
              "functionName": "Nome_da_Funcao",
              "parameters": { ... },
              "generateTransaction": true
            }
          }
        ],
        "blueprintCode": "Nó Blueprint ou Pseudocódigo.",
        "cppCode": "Código C++ UE5."
      }

      Contexto atual da cena: ${currentContext || "Cena inicial"}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview", // Use pro for complex UE logic
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              commands: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    endpoint: { type: Type.STRING },
                    method: { type: Type.STRING },
                    body: { type: Type.OBJECT }
                  }
                }
              },
              blueprintCode: { type: Type.STRING },
              cppCode: { type: Type.STRING }
            },
            required: ["explanation", "commands"]
          }
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
