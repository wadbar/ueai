/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Settings, 
  Terminal, 
  Gamepad2, 
  Activity, 
  Code2, 
  LogOut, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Database,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UECommand, AIResponse, LogEntry, UEConnection } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<UEConnection>({
    url: 'http://localhost',
    port: '8080',
    connected: false,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentAIResponse, setCurrentAIResponse] = useState<AIResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (type: LogEntry['type'], message: string, data?: any) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message,
      data,
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleUEConnectionTest = async () => {
    try {
      addLog('ue', `Testando conexão em ${connection.url}:${connection.port}...`);
      // UE Remote Control API typically has a health check or we just try to get presets
      await axios.put(`${connection.url}:${connection.port}/remote/object/getProperty`, {
          objectPath: "/Engine/Transient.REMOTECONTROL_PRESET",
          propertyName: "Name"
      }, { timeout: 2000 });
      
      setConnection(prev => ({ ...prev, connected: true }));
      addLog('ue', 'Conexão estabelecida com Unreal Engine!');
    } catch (err: any) {
      setConnection(prev => ({ ...prev, connected: false }));
      addLog('error', `Falha na conexão: ${err.message}. Verifique se o plugin Remote Control está ativado e a porta está correta.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    addLog('ai', `Processando comando: "${prompt}"`);
    
    try {
      const response = await axios.post('/api/ai/command', {
        prompt,
        currentContext: logs.slice(-5).map(l => l.message).join('\n')
      });
      
      const aiData: AIResponse = response.data;
      setCurrentAIResponse(aiData);
      addLog('ai', `AI Suggestion: ${aiData.explanation}`);
      
      setPrompt('');
    } catch (err: any) {
      addLog('error', `Erro na IA: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const executeCommands = async (commands: UECommand[]) => {
    if (!connection.connected) {
      addLog('error', 'Não é possível executar comandos sem conexão com a Unreal Engine.');
      return;
    }

    addLog('ue', `Executando ${commands.length} comandos na Unreal...`);
    
    for (const cmd of commands) {
      try {
        await axios.put(`${connection.url}:${connection.port}${cmd.endpoint}`, cmd.body);
        addLog('ue', `Comando executado com sucesso: ${cmd.endpoint}`);
      } catch (err: any) {
        addLog('error', `Falha ao executar comando ${cmd.endpoint}: ${err.message}`);
        break;
      }
    }
  };

  const [viewingCode, setViewingCode] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E1E1E6] font-sans selection:bg-[#9462E1]/30">
      {/* Code Viewer Modal */}
      <AnimatePresence>
        {viewingCode && currentAIResponse && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121214] border border-[#29292E] rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-[#202024] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Code2 className="text-[#9462E1]" />
                  <h3 className="font-bold text-lg">Detalhes de Implementação</h3>
                </div>
                <button 
                  onClick={() => setViewingCode(false)}
                  className="p-2 hover:bg-[#202024] rounded-lg transition-colors"
                >
                  <AlertCircle className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar">
                {currentAIResponse.blueprintCode && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#8D8D99] uppercase tracking-widest">Procedimento Blueprint</h4>
                    <pre className="p-4 bg-[#0A0A0B] border border-[#29292E] rounded-xl text-sm font-mono text-blue-300 overflow-x-auto">
                      {currentAIResponse.blueprintCode}
                    </pre>
                  </div>
                )}
                
                {currentAIResponse.cppCode && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#8D8D99] uppercase tracking-widest">Snippet C++ (UE5)</h4>
                    <pre className="p-4 bg-[#0A0A0B] border border-[#29292E] rounded-xl text-sm font-mono text-green-300 overflow-x-auto">
                      {currentAIResponse.cppCode}
                    </pre>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#8D8D99] uppercase tracking-widest">Comandos de API (JSON payloads)</h4>
                  <div className="space-y-2">
                    {currentAIResponse.commands.map((cmd, idx) => (
                      <pre key={idx} className="p-4 bg-[#0A0A0B] border border-[#29292E] rounded-xl text-[11px] font-mono text-purple-300 overflow-x-auto">
                        {JSON.stringify(cmd, null, 2)}
                      </pre>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#202024] flex justify-end">
                <button 
                  onClick={() => setViewingCode(false)}
                  className="bg-[#29292E] hover:bg-[#323238] text-white px-6 py-2 rounded-lg font-bold transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-[#202024] bg-[#121214] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#9462E1] to-[#633BBC] rounded-xl flex items-center justify-center shadow-lg shadow-[#9462E1]/20">
            <Gamepad2 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">UE AI Architect</h1>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-2 h-2 rounded-full",
                connection.connected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              )} />
              <p className="text-xs text-[#8D8D99] font-medium">
                {connection.connected ? `Conectado: ${connection.url}:${connection.port}` : "Desconectado"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            id="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-[#202024] rounded-lg transition-colors text-[#8D8D99] hover:text-white"
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-[#202024] mx-2" />
          <div className="flex items-center gap-4 text-xs font-mono text-[#8D8D99]">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>Gemini 3.1 Pro</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>UE 5.x</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_400px] h-[calc(100vh-73px)]">
        {/* Main Interface */}
        <section className="flex flex-col h-full border-r border-[#202024] overflow-hidden">
          {/* Action Log / Console Area */}
          <div className="flex-1 overflow-auto p-6 space-y-4 font-mono text-sm custom-scrollbar" ref={scrollRef}>
            <AnimatePresence mode="popLayout">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  className={cn(
                    "p-3 rounded-lg border flex gap-3",
                    log.type === 'ai' ? "bg-[#121214] border-[#29292E]" : 
                    log.type === 'ue' ? "bg-[#1E293B]/20 border-blue-500/20" :
                    "bg-red-500/5 border-red-500/20"
                  )}
                >
                  <div className="mt-1">
                    {log.type === 'ai' && <Terminal className="w-4 h-4 text-[#9462E1]" />}
                    {log.type === 'ue' && <Activity className="w-4 h-4 text-blue-400" />}
                    {log.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#7C7C8A] font-bold uppercase tracking-widest">{log.type}</span>
                      <span className="text-[10px] text-[#7C7C8A]">{log.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className={cn(
                      "leading-relaxed",
                      log.type === 'error' ? "text-red-400" : "text-[#E1E1E6]"
                    )}>
                      {log.message}
                    </p>
                    {log.data && (
                      <pre className="mt-2 p-2 bg-black/40 rounded border border-white/5 overflow-x-auto text-[11px] text-blue-300">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {logs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                <div className="w-20 h-20 bg-[#202024] rounded-full flex items-center justify-center">
                  <Terminal className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-medium">Console Aguardando Comandos</p>
                  <p className="text-sm max-w-xs">Use o campo abaixo para enviar comandos naturais para a Unreal Engine através da IA.</p>
                </div>
              </div>
            )}
          </div>

          {/* Prompt Input */}
          <div className="p-6 bg-[#121214] border-t border-[#202024] relative">
            {currentAIResponse && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-6 right-6 bottom-full mb-4 bg-[#1E1E21] border border-[#323238] rounded-xl shadow-2xl p-4 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#9462E1] uppercase tracking-tighter">
                    <Cpu className="w-4 h-4" />
                    <span>Sugestão da IA Gerada</span>
                  </div>
                  <button 
                    onClick={() => setCurrentAIResponse(null)}
                    className="text-xs text-[#8D8D99] hover:text-white"
                  >
                    Descartar
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm text-[#E1E1E6] leading-relaxed italic border-l-2 border-[#9462E1] pl-3">
                    "{currentAIResponse.explanation}"
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      id="execute-btn"
                      onClick={() => {
                        executeCommands(currentAIResponse.commands);
                        setCurrentAIResponse(null);
                      }}
                      className="flex items-center justify-center gap-2 bg-[#9462E1] hover:bg-[#A970FF] text-white font-bold py-2.5 rounded-lg transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Executar na Unreal
                    </button>
                    <button 
                      id="view-code-btn"
                      onClick={() => setViewingCode(true)}
                      className="flex items-center justify-center gap-2 bg-[#29292E] hover:bg-[#323238] text-white font-bold py-2.5 rounded-lg transition-all"
                    >
                      <Code2 className="w-4 h-4" />
                      Ver Código
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="relative">
              <input 
                id="prompt-input"
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Crie um cubo metálico no centro da cena com luz azul..."
                disabled={loading}
                className="w-full bg-[#0A0A0B] border border-[#29292E] rounded-xl px-4 py-4 pr-32 focus:outline-none focus:border-[#9462E1] focus:ring-1 focus:ring-[#9462E1] transition-all placeholder:text-[#4D4D57]"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button 
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="bg-[#9462E1] disabled:bg-[#29292E] disabled:text-[#4D4D57] hover:bg-[#A970FF] text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-[#9462E1]/10"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Enviar</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Sidebar Info & History */}
        <aside className="bg-[#121214] p-6 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-sm text-[#7C7C8A] uppercase tracking-widest flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-[#9462E1]" />
              Painel de Controle
            </h2>
          </div>

          <div className="space-y-6 flex-1 overflow-auto custom-scrollbar">
            {/* Connection Card */}
            <div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#29292E] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8D8D99]">CONFIGURAÇÃO UE</span>
                {connection.connected ? (
                  <span className="text-[10px] text-green-400 font-bold bg-green-400/10 px-2 py-0.5 rounded-full">ATIVO</span>
                ) : (
                  <span className="text-[10px] text-red-400 font-bold bg-red-400/10 px-2 py-0.5 rounded-full">OFFLINE</span>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#4D4D57] font-bold">HOST URL</label>
                  <input 
                    type="text" 
                    value={connection.url}
                    onChange={(e) => setConnection(v => ({ ...v, url: e.target.value }))}
                    className="bg-[#121214] border border-[#29292E] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#9462E1]" 
                    placeholder="http://localhost"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#4D4D57] font-bold">PORTA API</label>
                  <input 
                    type="text" 
                    value={connection.port}
                    onChange={(e) => setConnection(v => ({ ...v, port: e.target.value }))}
                    className="bg-[#121214] border border-[#29292E] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#9462E1]" 
                    placeholder="8080"
                  />
                </div>
              </div>

              <button 
                onClick={handleUEConnectionTest}
                className="w-full py-2 bg-[#29292E] hover:bg-[#323238] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Activity className="w-3.5 h-3.5" />
                Testar Conexão
              </button>
            </div>

            {/* AI Architecture Vision */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest pl-1">Ações Rápidas de Câmera</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => setPrompt("Crie uma CineCameraActor na posição X=500, Y=0, Z=200 olhando para a origem com FOV 60")}
                    className="text-left p-3 bg-[#0A0A0B]/50 rounded-lg hover:bg-[#9462E1]/10 border border-transparent hover:border-[#9462E1]/30 transition-all group"
                  >
                    <p className="text-[10px] font-bold text-[#9462E1] mb-1">CINE CAMERA</p>
                    <p className="text-xs text-[#8D8D99] group-hover:text-white">Spawn Câmera Cinemática Configurável</p>
                  </button>
                  <button 
                    onClick={() => setPrompt("Mude o Field of View da câmera selecionada para 90 graus")}
                    className="text-left p-3 bg-[#0A0A0B]/50 rounded-lg hover:bg-[#9462E1]/10 border border-transparent hover:border-[#9462E1]/30 transition-all group"
                  >
                    <p className="text-[10px] font-bold text-blue-400 mb-1">LENS CONTROL</p>
                    <p className="text-xs text-[#8D8D99] group-hover:text-white">Ajustar Campo de Visão (FOV)</p>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest pl-1">Documentação Rápida</h3>
              <div className="space-y-2">
                {[
                  "Ative o Plugin 'Remote Control API'",
                  "Inicie a Unreal Engine",
                  "Use comandos como 'Add Static Mesh'",
                  "Peça por scripts C++ complexos",
                  "Mude iluminação em tempo real"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#0A0A0B]/50 rounded-lg group hover:bg-[#0A0A0B] transition-colors">
                    <div className="w-5 h-5 rounded bg-[#202024] flex items-center justify-center text-[10px] font-bold text-[#8D8D99] group-hover:text-[#9462E1]">
                      0{i+1}
                    </div>
                    <span className="text-xs text-[#8D8D99] font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#202024]">
            <button className="w-full py-3 text-red-500 text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-500/5 rounded-lg transition-all">
              <LogOut className="w-4 h-4" />
              Encerrar Sessão Architect
            </button>
          </div>
        </aside>
      </main>

      {/* Global Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #121214;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #29292E;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #323238;
        }
      `}</style>
    </div>
  );
}
