import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Cpu, Zap, Activity, Shield, Binary, Globe, Database, Layers } from 'lucide-react';

export const CognitiveEngine: React.FC = () => {
  const [pulse, setPulse] = useState(0);
  const [synapses, setSynapses] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => (p + 1) % 100);
      setSynapses(Array.from({ length: 8 }, () => Math.random() * 100));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#050505]">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-3 text-purple-500 font-bold text-xs uppercase tracking-[0.4em]">
            <Cpu className="w-5 h-5" />
            <span>Nebula Cognitive Engine V12.1</span>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">Status do Núcleo Arquitetural</h2>
          <p className="text-[#8D8D99] max-w-2xl leading-relaxed">
            Monitoramento determinístico de inferência e acoplamento modular. 
            O ecossistema está em sincronia total com os repositórios globais do arquiteto.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Neural Throughput', value: '1.2 Tb/s', icon: Zap, color: 'text-amber-500' },
            { label: 'Logic Consistency', value: '99.998%', icon: Shield, color: 'text-emerald-500' },
            { label: 'Modular Coupling', value: 'Deterministic', icon: Binary, color: 'text-blue-500' },
            { label: 'Global Grounding', value: 'Active', icon: Globe, color: 'text-purple-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-[#121214] border border-[#29292E] p-8 rounded-[32px] space-y-4 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <span className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest">{stat.label}</span>
              </div>
              <p className="text-3xl font-black text-white tracking-tighter uppercase">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-[#0A0A0B] border border-[#29292E] rounded-[40px] p-10 space-y-8">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
              <Activity className="w-4 h-4 text-purple-500" />
              Sinal de Pulso Cognitivo
            </h3>
            
            <div className="h-64 flex items-end gap-1 px-4">
              {synapses.map((h, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  className="flex-1 bg-gradient-to-t from-purple-600/40 to-purple-400/80 rounded-t-lg shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-[#202024]">
               <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#4D4D57] uppercase">Kernel Status</span>
                  <p className="text-xs font-black text-white uppercase">Operational</p>
               </div>
               <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#4D4D57] uppercase">Entropy level</span>
                  <p className="text-xs font-black text-white uppercase">0.002%</p>
               </div>
               <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#4D4D57] uppercase">GC Cycle</span>
                  <p className="text-xs font-black text-white uppercase">Clean</p>
               </div>
               <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#4D4D57] uppercase">Safety Lock</span>
                  <p className="text-xs font-black text-emerald-500 uppercase">Engaged</p>
               </div>
            </div>
          </div>

          <div className="space-y-8">
             <div className="bg-[#121214] border border-[#29292E] rounded-[32px] p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-[#29292E] pb-4">
                   <Layers className="w-5 h-5 text-blue-500" />
                   <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Contextual Memory</h3>
                </div>
                <div className="space-y-4">
                   <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#4D4D57] uppercase">Session Tokens</span>
                      <span className="text-white font-black text-xs">4.2K</span>
                   </div>
                   <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#4D4D57] uppercase">Long-Term Storage</span>
                      <span className="text-blue-500 font-black text-xs">Persisted</span>
                   </div>
                </div>
             </div>

             <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-[32px] p-8 space-y-6">
                <div className="flex items-center gap-3">
                   <Database className="w-5 h-5 text-purple-500" />
                   <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Repository Sync</h3>
                </div>
                <div className="space-y-3">
                   {['PaperCreeper', 'Nebula', 'ueai', 'papermu'].map(repo => (
                     <div key={repo} className="flex items-center justify-between text-[11px]">
                        <span className="text-[#8D8D99] font-bold">{repo}</span>
                        <span className="text-emerald-500 font-black">SYNCED</span>
                     </div>
                   ))}
                </div>
                <button className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 transition-all">
                   FORCE_ECOSYSTEM_POLL
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
