import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Zap, Activity, Shield, Binary, Globe, Database, Layers, Target } from 'lucide-react';

export const CognitiveCore: React.FC<{ 
  stats?: any, 
  aiHealth?: any, 
  selectedActor?: any,
  materials?: any[],
  onApplyMaterial?: (id: string, props: any) => Promise<void>
}> = ({ stats, aiHealth, selectedActor, materials, onApplyMaterial }) => {
  const [pulse, setPulse] = useState(0);
  const [synapses, setSynapses] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 100);
      // Processamento da carga da CPU via telemetria de node
      const load = stats ? (stats.cpu.user / 1000000) % 100 : 0;
      setSynapses(prev => [...prev.slice(-19), load]);
    }, 1000);
    return () => clearInterval(interval);
  }, [stats]);

  // Valores reais baseados nos stats do servidor
  const memoryUsage = stats ? `${stats.memory.heapUsed}MB` : '---';
  const uptime = stats ? `${Math.floor(stats.uptime / 60)}m ${stats.uptime % 60}s` : '---';
  const activeScrapers = stats ? stats.activeScrapers : 0;

  return (
    <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#050505]">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-3 text-purple-500 font-bold text-xs uppercase tracking-[0.4em]">
            <Cpu className="w-5 h-5" />
            <span>UE Architect V12.1</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
               <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">Status do Núcleo Arquitetural</h2>
               <p className="text-[#8D8D99] max-w-2xl leading-relaxed">
                  Monitoramento determinístico de inferência e acoplamento modular. 
                  O ecossistema está em sincronia total com os repositórios globais do arquiteto.
               </p>
            </div>
            
            <AnimatePresence mode="wait">
              {selectedActor && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-[#121214] border border-blue-500/20 p-6 rounded-3xl min-w-[300px] shadow-2xl shadow-blue-500/5 relative"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="w-4 h-4 text-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Ator Selecionado (Live)</span>
                  </div>
                  <p className="text-sm font-black text-white uppercase truncate">{selectedActor.name}</p>
                  <p className="text-[10px] text-[#4D4D57] font-mono mt-1 truncate">{selectedActor.path}</p>
                  
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 overflow-hidden">
                      <div className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
                  </div>

                  {onApplyMaterial && materials && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                      <p className="text-[9px] font-bold text-[#4D4D57] uppercase tracking-widest mb-2">Ações Rápidas</p>
                      <button 
                        onClick={() => {
                          const concrete = materials.find(m => m.id === 'M_Industrial_Concrete');
                          if (concrete) onApplyMaterial('M_Industrial_Concrete', concrete);
                        }}
                        className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] font-black uppercase transition-all"
                      >
                        Aplicar M_Industrial_Concrete
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'JS Heap Memory', value: memoryUsage, icon: Zap, color: 'text-amber-500' },
            { label: 'Uptime do Motor', value: uptime, icon: Shield, color: 'text-emerald-500' },
            { label: 'Scraper Workers', value: activeScrapers, icon: Binary, color: 'text-blue-500' },
            { 
              label: 'Engine Cognitiva', 
              value: aiHealth?.status === 'online' ? 'DETERMINISTA' : 
                     aiHealth?.status === 'degraded' ? 'SOBRECARREGADA' :
                     aiHealth?.status === 'limited' ? 'COTA_LIMITE' : 'STANDBY', 
              icon: Globe, 
              color: aiHealth?.status === 'online' ? 'text-purple-500' :
                     aiHealth?.status === 'degraded' ? 'text-rose-500' :
                     aiHealth?.status === 'limited' ? 'text-amber-500' : 'text-[#4D4D57]' 
            },
          ].map((stat, i) => (
            <div key={i} className="bg-[#121214] border border-[#29292E] p-8 rounded-[32px] space-y-4 hover:border-white/10 transition-colors shadow-2xl">
              <div className="flex items-center justify-between">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <span className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest">{stat.label}</span>
              </div>
              <p className="text-3xl font-black text-white tracking-tighter uppercase truncate">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-[#0A0A0B] border border-[#29292E] rounded-[40px] p-10 space-y-8 shadow-inner">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
              <Activity className="w-4 h-4 text-purple-500" />
              Sinal de Carga de CPU (Workers)
            </h3>
            
            <div className="h-64 flex items-end gap-1 px-4">
              {synapses.map((h, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(10, h)}%` }}
                  className="flex-1 bg-gradient-to-t from-purple-600/40 to-purple-400/80 rounded-t-lg shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                  transition={{ duration: 0.8, ease: "linear" }}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-[#202024]">
               <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#4D4D57] uppercase">Estado Global</span>
                  <p className="text-xs font-black text-white uppercase">Operacional</p>
               </div>
               <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#4D4D57] uppercase">Delta de Carga</span>
                  <p className="text-xs font-black text-white uppercase">{stats ? (stats.cpu.user / 1000000).toFixed(2) : '0.00'}</p>
               </div>
               <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#4D4D57] uppercase">Ciclo GC</span>
                  <p className="text-xs font-black text-white uppercase">Limpo</p>
               </div>
               <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#4D4D57] uppercase">Safety Lock</span>
                  <p className="text-xs font-black text-emerald-500 uppercase">Compromissado</p>
               </div>
            </div>
          </div>

          <div className="space-y-8">
             <div className="bg-[#121214] border border-[#29292E] rounded-[32px] p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-[#29292E] pb-4">
                   <Layers className="w-5 h-5 text-blue-500" />
                   <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Memória de Processos</h3>
                </div>
                <div className="space-y-4">
                   <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#4D4D57] uppercase">Heap Total (MB)</span>
                      <span className="text-white font-black text-xs">{stats ? (stats.memory.heapTotal / 1024 / 1024).toFixed(0) : '0'}</span>
                   </div>
                   <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#4D4D57] uppercase">RSS (MB)</span>
                      <span className="text-blue-500 font-black text-xs">{stats ? (stats.memory.rss / 1024 / 1024).toFixed(0) : '0'}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
