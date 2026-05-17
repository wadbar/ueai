# AGENTS.MD - ENGINE COGNITIVA V12.1 - ARQUITETURA PAPERCREEPER

Este arquivo persiste as diretrizes de rigor determinístico e as leis funcionais do ecossistema para o agente de IA.

## DIRETRIZ MATRIZ DE REFERÊNCIA
- O repositório [wadbar/papercreeper](https://github.com/wadbar/papercreeper) é a referência absoluta. Todas as implementações devem herdar seus padrões de UX, gerenciamento de estado e telemetria.

## LEIS DE ENGENHARIA (ANTI-ALUCINAÇÃO)
1. **Rigor Determinístico**: Temperatura 0.05, Top_P 0.99. Lógica puramente matemática e agnóstica.
2. **Lei da Imutabilidade Funcional**: É proibido remover, simplificar ou omitir lógica funcional existente (ex: marcadores `// ... resto do código`). Atuação focada em ADICIONAR, REFINAR E BLINDAR.
3. **Isolamento Concorrente**: Segregar processos pesados e garantir autocura (Graceful Recovery).
4. **Sanitização de Identidade**: Proibido usar jargões internos da engine (ex: Omni, Kernel) na UI do usuário. O app mantém a identidade **Nebula**.

## PADRÕES DE IMPLEMENTAÇÃO
- **Erros**: Logs estruturados com `UNCAUGHT_EXCEPTION`, micro-locks e autocura.
- **Memória**: Limpeza estrita de buffers e listeners no cleanup (`Memory Management Pattern`).
- **Comunicação**: Linguagem técnica cirúrgica, sem saudações ou ruído explicativo.
