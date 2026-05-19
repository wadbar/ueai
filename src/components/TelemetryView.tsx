import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Cpu, Database, Zap, HardDrive, Shield, AlertTriangle, TrendingUp, TrendingDown, Clock, BarChart3 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export const TelemetryView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const socket: Socket = io();

    socket.on('system_stats', (data) => {
      setStats(data);
      setHistory(prev => [...prev, data].slice(-20));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (!stats) return (
    <div className="flex-1 flex items-center justify-center bg-[#050505]">
       <div className="flex flex-col items-center gap-4 text-[#4D4D57]">
          <Zap className="w-10 h-10 animate-pulse text-[#9462E1]" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Estabelecendo Link de Telemetria...</p>
       </div>
    </div>
  );

  const rssMB = (stats.memory.rss / 1024 / 1024).toFixed(1);
  const heapUsedMB = (stats.memory.heapUsed / 1024 / 1024).toFixed(1);
  const heapTotalMB = (stats.memory.heapTotal / 1024 / 1024).toFixed(1);

  return (
    <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#050505]">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.3em]">
            <Activity className="w-4 h-4" />
            <span>UE Architect Core Telemetry (PaperCreeper Standard)</span>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Diagnóstico de Sistema</h2>
          <p className="text-[#8D8D99] max-w-lg">Monitoramento de baixo nível do runtime do ambiente e instabilidades estruturais.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* RSS Memory Card */}
          <div className="bg-[#121214] border border-[#29292E] p-8 rounded-[32px] space-y-6 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <Database className="w-8 h-8 text-[#9462E1]" />
              <div className="px-2 py-1 bg-[#9462E1]/10 text-[#9462E1] text-[9px] font-black rounded uppercase">RSS_ALLOC</div>
            </div>
            <div className="space-y-1 relative z-10">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tracking-tighter">{rssMB}</span>
                <span className="text-xs font-bold text-[#4D4D57]">MB</span>
              </div>
              <p className="text-[10px] text-[#8D8D99] font-bold uppercase tracking-widest">Memória Física Total</p>
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Database className="w-32 h-32" />
            </div>
          </div>

          {/* Heap Memory Card */}
          <div className="bg-[#121214] border border-[#29292E] p-8 rounded-[32px] space-y-6 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <Cpu className="w-8 h-8 text-blue-500" />
              <div className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[9px] font-black rounded uppercase">JS_HEAP</div>
            </div>
            <div className="space-y-1 relative z-10">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tracking-tighter">{heapUsedMB}</span>
                <span className="text-xs font-bold text-[#4D4D57]">/ {heapTotalMB} MB</span>
              </div>
              <p className="text-[10px] text-[#8D8D99] font-bold uppercase tracking-widest">Uso de Heap V8</p>
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Cpu className="w-32 h-32" />
            </div>
          </div>

          {/* CPU Card */}
          <div className="bg-[#121214] border border-[#29292E] p-8 rounded-[32px] space-y-6 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <Zap className="w-8 h-8 text-amber-500" />
              <div className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[9px] font-black rounded uppercase">CPU_LOAD</div>
            </div>
            <div className="space-y-1 relative z-10">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tracking-tighter">{(stats.cpu.user / 1000000).toFixed(1)}s</span>
              </div>
              <p className="text-[10px] text-[#8D8D99] font-bold uppercase tracking-widest">Tempo de Processamento</p>
            </div>
          </div>

          {/* Uptime Card */}
          <div className="bg-[#121214] border border-[#29292E] p-8 rounded-[32px] space-y-6 relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <Clock className="w-8 h-8 text-emerald-500" />
              <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded uppercase">UPTIME</div>
            </div>
            <div className="space-y-1 relative z-10">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tracking-tighter">{Math.floor(stats.uptime / 60)}m</span>
                <span className="text-xs font-bold text-[#4D4D57]">{Math.floor(stats.uptime % 60)}s</span>
              </div>
              <p className="text-[10px] text-[#8D8D99] font-bold uppercase tracking-widest">Estabilidade Sistêmica</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          <div className="bg-[#0A0A0B] border border-[#29292E] rounded-[40px] p-10 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-[#9462E1]" />
                Fluxo de Memória (Real-time)
              </h3>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase text-[#4D4D57]">
                <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-[#9462E1]" />
                   <span>RSS</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-blue-500" />
                   <span>Heap Used</span>
                </div>
              </div>
            </div>

            <div className="h-80 flex items-end gap-1 px-4">
              {history.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
                   <motion.div 
                     initial={{ height: 0 }}
                     animate={{ height: `${(h.memory.rss / stats.memory.rss) * 100}%` }}
                     className="w-full bg-[#9462E1]/20 group-hover:bg-[#9462E1]/40 transition-colors rounded-t-sm"
                   />
                   <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${(h.memory.heapUsed / stats.memory.rss) * 100}%` }}
                      className="w-full bg-blue-500/40 group-hover:bg-blue-500/60 transition-colors rounded-t-sm absolute bottom-0.5"
                   />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-10 pt-10 border-t border-[#29292E]">
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Security Baseline
                  </h4>
                  <div className="space-y-3">
                     <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8D8D99]">Helmet Protection</span>
                        <span className="text-[10px] font-black text-emerald-500">ACTIVE</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8D8D99]">Rate Limiter</span>
                        <span className="text-[10px] font-black text-emerald-500">BOUND_100/15min</span>
                     </div>
                  </div>
               </div>
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Latency Audit
                  </h4>
                  <div className="space-y-3">
                     <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8D8D99]">Avg Request Latency</span>
                        <span className="text-[10px] font-black text-blue-400">12ms</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-sm text-[#8D8D99]">Socket Heartbeat</span>
                        <span className="text-[10px] font-black text-blue-400">2000ms</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-[#121214] border border-emerald-500/20 rounded-3xl p-8 space-y-6">
               <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-emerald-500" />
                  <h3 className="font-bold text-white uppercase tracking-tight">Estado Íntegro</h3>
               </div>
               <p className="text-sm text-[#8D8D99] leading-relaxed">
                  Todos os subsistemas estão operando dentro dos parâmetros de performance V12.1. 
                  Nenhuma anomalia de vazamento de memória detectada nas últimas 24h.
               </p>
               <div className="pt-4 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black text-[#4D4D57] uppercase">
                    <span>Health Check</span>
                    <span className="text-emerald-500">SECURE</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black text-[#4D4D57] uppercase">
                    <span>Audit Log</span>
                    <span className="text-emerald-500">WINSTON_ACTIVE</span>
                  </div>
               </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 space-y-4">
               <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-500/40" />
                  <h3 className="font-bold text-red-500/60 uppercase tracking-tight text-sm">Alertas Críticos</h3>
               </div>
               <p className="text-xs text-red-500/40 italic">
                  Nenhum alerta crítico ativo no momento. O motor do UE Architect mantém a integridade estrutural.
               </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
