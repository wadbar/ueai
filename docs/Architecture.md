# 🏗️ Arquitetura de Alta Performance V12.2 Extreme

Nossa stack transcende o tradicional MERN. Nós operamos com um ecossistema Node.js / React configurados para **Concorrência Suprema**.

## 1. Fast Routing & Compression (Backend)
O Express é envelopado com camadas pesadas de segurança (`helmet`) e limitação de taxa adaptativa para mitigar ataques DDoS:
- **`compression(level: 9)`**: Compacta respostas de texto (JSON, Blueprint strings) de dezenas de megabytes para meros kilobytes instantaneamente.
- **`Keep-Alive Timeouts Tunnig`**: Foi calibrado em `61s / 65s` (TCP Layer) para evitar overhead em Cloud Providers (AWS/GCP), que costumam dropar sockets instáveis e long-polls após 60s. Evita a recriação da hand-shake TLS.

## 2. Frontend React: Micro-Chunking & Esbuild
O setup em `vite.config.ts` injeta o poder da Engine Esbuild no Rollup minifier:
- Desabilita `reportCompressedSize` para não desperdiçar RAM do C.I./C.D. 
- Fragmentação cirúrgica: `react-vendor` separando os renders pesados do `three-vendor` da React Three Fiber, permitindo com que os Assets sejam colocados no Cache Layer do Browser garantindo aberturas subsequentes praticamente instantâneas (<0.3s).

## 3. Gestão de Memória V8
Os processos Node costumam limitar a Memória RAM base indiscriminadamente. Como trafegamos pesados diagramas Blueprint para a Unreal (em string base), foi injetado implicitamente:
\`\`\`bash
NODE_OPTIONS="--max-old-space-size=4096 --no-warnings"
\`\`\`
Para produção (start script), configuramos \`--optimize_for_size --gc_interval=100\`, forçando o Garbage Collector V8 a não permitir que ponteiros pendentes se tornem OutOfMemory (OOM) em longo prazo sob estresse e longas jornadas de uso.
