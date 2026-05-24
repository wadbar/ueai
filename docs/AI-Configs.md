# 🧠 Configurações de IA e Resiliência (AI-Configs)

A verdadeira mágica deste motor acontece da integração com APIs GenAI (Notoriamente a infra Gemini 3.1 Pro via `aiHelper.ts`).

## Autocura com Retry Exponencial e Arquitetura AWS Jitter

O método customizado `withAIRetry` no núcleo do backend resolve dois problemas vitais das APIs de IA:
1. **Quota / Limit Reached (HTTP 429)**: Responde com limites.
2. **Server Overloaded (HTTP 503)**: Cai em momentos de alta demanda simultânea.

### Maximização "Jitter"
Ao invés de tentar novamente os requistos no mesmo microssegundo (criando *Thundering Herd Effect*), adicionamos um `Math.random()` modificado. Ele gera uma variação (Jitter) temporal de alguns picos milissegundos a vários segundos entre requisições simultâneas em cache miss/fail. 

### Neural Memorization Layer (In-Memory Cache)
No ambiente Extreme, injetamos uma memória HashMap assíncrona baseada em UUID de hash 256 criptográfico para as queries idênticas: se um input ou código que você solicitou e o contexto da Unreal estarem intocados dentro de uma janela (ex: 2 min TTL), não desperdiçamos seu Token Google/API. A resposta retorna instaneamente (`2ms`), gerando 0 latência. 

## Prompt Sistêmico Imutável
A string `ARCHITECT_CORE_INSTRUCTION` força respostas blindadas em JSON. Usamos Temperatura `0.01` ao invés de grandes escalas criativas, forçando uma engenharia determinística de precisão, isenta de alucinações (e formatado em JSON Extractable).
