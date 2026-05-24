# 🕷️ Web Scraper e Autocura Estrutural

O `WebScraperWorker` é onde a engenharia pesada do NodeJS nativo brilha, dispensando middlewares lentos. Utilizamos `http`/`https` puro com configuração customizada `http.Agent`.

### Keep-Alive HTTP Pools
Foi atribuído um `httpsAgent` fixo com `maxSockets = 100` e `keepAlive = true`. Isso impede o ciclo infernal de `SYN` > `SYN-ACK` > `ACK` > `SSL Handshake` em conexões a um mesmo domínio repetidamente, garantindo performance nível Chromium.

### Proteção Ativa Contra Memory Leaks Limiters
Para suportar cenários em que links e domínios falhos respondem PDFs infinitos ou fluxos estáticos não finalizados, a cada `data` chunk processado, bufferizamos e checamos o size `maxDataSize`. Caso o limite programático (5MB) seja atingido, usamos `req.destroy()`, rompendo agressivamente a alocação do V8, liberando Threads do Event Loop de entrarem no desespero de travar a aplicação, resultando num ambiente livre de engasgos e OOM Exceptions.
