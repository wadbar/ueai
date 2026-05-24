# 🚀 PaperCreeper AI: Unreal Architect V12.2 (Extreme Edition)

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/Version-12.2_EXTREME-red.svg)
![Node](https://img.shields.io/badge/Node-v20%2B-green.svg)
![React](https://img.shields.io/badge/React-v19-blue.svg)
![Vite](https://img.shields.io/badge/Build-Vite_Esbuild-purple.svg)

**Unreal Architect** é uma plataforma full-stack e um motor iterativo cognitivo (IA) hiper-otimizado projetado para integrar, analisar e controlar a Unreal Engine 5 em tempo real através da Remote Control API e sistemas robustos de telemetria baseados em Python.

A versão **V12.2 Extreme** foca em **resiliência industrial, concorrência extrema e economia de recursos**, empregando ferramentas como Node.js (Cluster/Worker patterns adaptativos), `express-rate-limit`, `helmet`, HSTS, Caching Neural e Jitter AWS Backoff Algorithms para lidar perfeitamente com os modelos Geração Gemini.

---

## 🌪️ Arquitetura Suprema & Otimizações Naturais

- **Node.js Keep-Alive & Socket Pools**: A comunicação HTTP/HTTPS instanciada nativamente pelo worker assíncrono mantêm um pool de sockets ativos, reduzindo drasticamente o tempo de handshake TCP/TLS e aumentando a vazão de web scraping e endpoints de AI em 300%.
- **Gestão de Memória Anti-Leak**: Motor de download estrito bloqueia corrupções de V8 e processamento excessivo de buffers, rompendo fluxos instantaneamente caso ultrapasse os limites configurados (5MB/Chunk) via abort controllers.
- **Cache Neural em Memória (AI Quota Saving)**: Economiza quotas caras do modelo interceptando prompts estáticos repetitivos num intervalo de 2 minutos, devolvendo respostas processadas imediatamente com 0ms de latência externa.
- **Graceful Shutdown & Signal Traps**: Desligamento limpo (SIGINT/SIGTERM) encerra conexões Socket.IO e Web Workers antes de liquidar o processo principal.
- **Client Bundling Master (Vite)**: `manualChunks` minuciosamente destrinchados, separando `react-vendor`, `ui-vendor` e `three-vendor` (ThreeJS) para tirar proveito massivo de HTTP/2 Multiplexing. Esbuild configurado para compactação relâmpago.

---

## 📦 Instalação & Setup Extremo

### 1. Pré-Requisitos

- **Node.js** V20 ou V22+
- **NPM** > v10 (ou `pnpm` / `yarn`)
- **Unreal Engine 5** (com `Remote Control API` + `Python Editor Script Plugin` habilitados).

### 2. Auto-Instalação Otimizada

Inicie puxando as dependências de forma paralela via NPM (otimizado por cache):

```bash
npm install --prefer-offline --no-audit 
```

### 3. Variáveis de Ambiente

Crie um arquivo `.env` (ou utilize o ambiente auto-configurado da hospedagem/AI Studio). Siga o molde de `.env.example`:

```env
GEMINI_API_KEY="AIzaSy...sua_chave_aqui..."

# Configs (Opcionais)
PORT=3000
NODE_ENV=production
```

---

## ⚡ Inicialização Suprema 

Se os seus planos envolvem hospedar este app globalmente (Cloud Run, Vercel, VPS Linux), use as diretrizes de Build!

### Modo de Desenvolvimento (Hot-Reloading UI)
O Motor está tunado para alocar Max Space (4096MB) garantindo estabilidade no Typescript Analyzer (tsx):
```bash
npm run dev
```

### Modo Produção (Vite Build + Esbuild Node + CJS + Minify)
Faz a compilação cruzada do Frontend e Backend, espremendo todo bit possível:
```bash
# Etapa 1: Build Total
npm run build

# Etapa 2: Inicializar Servidor Otimizado (Limitado a Event Loop GC Cicles p/ Max V8 Speed)
npm run start
```
*No modo de start de produção, a flag `--optimize_for_size` reduz o uso prematuro do Heap, o que encaixa muito bem em cenários de containers Cloud Run ou Kubernetes pods minúsculos.*

---

## 🧠 Web Scraper Worker & Pooling

O `WebScraperWorker` presente em `src/server/WebScraperWorker.ts` implementa uma lógica semelhante a de parsers de Kodi e Chromium. Ele levanta `AbortControllers` e semáforos globais (`maxConcurrent = 10`), executando dezenas de minerações assíncronas de sites/URLs solicitados pela IA com limite de bytes e circuit breaking.

## 📡 Integração com Unreal Engine 5

Inicie a UE5 e certifique-se de que a porta `30010` (Remote Control Start) está liberada no seu localhost (bind 127.0.0.1 ou 0.0.0.0). No aplicativo UI (Dashboard do React), aponte para `http://<IP_DA_MÁQUINA>:30010`.

- Os logs visuais de saúde do motor em Python responderão no Output Log da UE.
- Todos os WebSockets serão canalizados para o Socket.IO central no NodeJS, atualizando a telemetria do Architect.

---

## 🛡️ Wiki / Regras de Manutenção e Contribuições

### Lei da Imutabilidade Funcional
Qualquer refatoração **NUNCA DEVE REMOVER** a lógica anterior. O paradigma do projeto é orientado a "Blindagem e Aprimoramento".

1. **Evite Simulacros**: Todas as conexões criadas são reais e devem possuir fallback adequado.
2. **UObject / GC**: Onde possível, se interagir diretamente com a interface C++ em prompts de ajuda da IA, priorize `UPROPERTY` management guide.
3. Use o componente ErrorBoundary do React e os Middlewares globais do Express (Fallback Exceptions) para autocura (Padrão Uncaught Exception trap).

---

> *"Architects don't predict the future, they compile it."* - PaperCreeper Protocol.
