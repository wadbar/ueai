import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Layers, 
  Activity, 
  RefreshCw,
  Terminal as TerminalIcon,
  Zap,
  Shield,
  FileCode,
  Cpu
} from 'lucide-react';
import { MeshDiagnostics } from '../types';
import { cn } from '../lib/utils';

interface GeometryLabProps {
  activeActor: any;
  diagnostics: MeshDiagnostics | null;
  onRefreshDiagnostics?: () => Promise<void>;
}

export const GeometryLab: React.FC<GeometryLabProps> = ({ activeActor, diagnostics, onRefreshDiagnostics }) => {
  const [pipelineStatus, setPipelineStatus] = useState<'IDLE' | 'PROCESSING'>('IDLE');
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);

  const addPipelineLog = useCallback((msg: string) => {
    setPipelineLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const runMeshOptimization = async () => {
    if (pipelineStatus !== 'IDLE' || !activeActor) return;
    
    setPipelineStatus('PROCESSING');
    addPipelineLog(`Iniciando extração de dados geométricos: ${activeActor.name}...`);
    
    try {
      if (onRefreshDiagnostics) {
        await onRefreshDiagnostics();
      }
      addPipelineLog("Recalibragem de vértices concluída com sucesso.");
    } catch (error: any) {
      addPipelineLog(`ERRO (UNCAUGHT_EXCEPTION): ${error.message || 'Falha na conexão'}`);
    } finally {
      setPipelineStatus('IDLE');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-md-bg">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-end justify-between border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Shield className="w-4 h-4 text-emerald-500" />
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Protocolo de Integridade Analítica</span>
            </div>
            <h2 className="text-3xl font-black text-md-text-strong uppercase tracking-tighter">Diagnostic Analytics Lab</h2>
            <p className="text-xs text-md-text-muted uppercase font-bold mt-1 tracking-widest">
              Extração Topológica em Tempo Real • <span className="text-md-primary">Unreal Remote Protocol</span>
            </p>
          </div>
          <div className="flex gap-4">
             <div className="text-right">
                <span className="text-[10px] text-md-text-muted font-black uppercase">Core Compute</span>
                <p className="text-xs text-md-text-strong font-mono uppercase">Linux_Debian</p>
             </div>
             <div className="w-px h-8 bg-white/5 mx-2" />
             <div className="text-right">
                <span className="text-[10px] text-md-text-muted font-black uppercase">Node Engine</span>
                <p className="text-xs text-cyan-400 font-mono">DETERMINÍSTICO</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7 space-y-6">
             <section className="bg-md-surface1 border border-white/5 rounded-3xl p-6 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Box className="w-32 h-32 text-md-primary" />
                </div>
                
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-md-primary text-md-on-primary rounded-2xl">
                         <Layers className="w-5 h-5 text-md-primary" />
                      </div>
                      <h3 className="text-sm font-black text-md-text-strong uppercase">Geometric Analysis</h3>
                   </div>
                   <button 
                     onClick={runMeshOptimization}
                     disabled={!activeActor || pipelineStatus !== 'IDLE'}
                     className="flex items-center gap-2 px-3 py-1.5 bg-md-primary text-md-on-primary hover:bg-md-primary-hover hover:text-md-on-primary border border-blue-500/20 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                     <RefreshCw className={cn("w-3 h-3", pipelineStatus !== 'IDLE' && "animate-spin")} />
                     Re-Sync Mesh Analytics
                   </button>
                </div>

                {!activeActor ? (
                  <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-black/20">
                     <Box className="w-8 h-8 text-[#29292E] mb-2" />
                     <p className="text-[10px] text-md-text-muted font-bold uppercase">Nenhum Ator Selecionado para Diagnóstico</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {[
                         { label: 'Vertex Count', val: diagnostics?.vertexCount?.toLocaleString() || '---', color: 'text-md-primary' },
                         { label: 'Triangle Count', val: diagnostics?.triangleCount?.toLocaleString() || '---', color: 'text-indigo-400' },
                         { label: 'LOD Groups', val: diagnostics?.lods || '0', color: 'text-emerald-400' },
                         { label: 'UV Channels', val: diagnostics?.uvChannels || '0', color: 'text-amber-400' }
                       ].map((stat, i) => (
                         <div key={i} className="bg-white/2 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            <span className="text-[9px] text-md-text-muted font-black uppercase block mb-1">{stat.label}</span>
                            <span className={cn("text-lg font-mono font-bold", stat.color)}>{stat.val}</span>
                         </div>
                       ))}
                    </div>

                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                       <div className="flex items-center gap-2 mb-3">
                          <TerminalIcon className="w-3 h-3 text-md-text-muted" />
                          <span className="text-[9px] font-black text-md-text-muted uppercase tracking-widest">Procedural Terminal</span>
                       </div>
                       <div className="space-y-1">
                          {pipelineLogs.map((log, i) => (
                            <div key={i} className="text-[10px] font-mono text-md-text-muted opacity-70">
                               {log}
                            </div>
                          ))}
                          {pipelineStatus !== 'IDLE' && (
                             <div className="text-[10px] font-mono text-md-primary animate-pulse">
                                [KERNEL]: Extraindo buffer da API de Remote Control...
                             </div>
                          )}
                       </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className={cn(
                           "w-2 h-2 rounded-full",
                           diagnostics?.naniteEnabled ? "bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" : "bg-white/10"
                         )} />
                         <span className="text-[10px] font-black text-md-text-strong uppercase">Nanite Virtualization Engine</span>
                      </div>
                      <span className="text-[9px] text-md-text-muted font-mono">{diagnostics?.naniteEnabled ? 'ACTIVE' : 'DISABLED'}</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <Activity className="w-4 h-4 text-md-text-muted" />
                         <span className="text-[10px] font-black text-md-text-strong uppercase">Geometric Health Check</span>
                      </div>
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-black uppercase">Optimized</span>
                   </div>
                </div>
             </section>
          </div>

          <div className="col-span-12 lg:col-span-5 space-y-6">
             <div className="bg-indigo-600 rounded-3xl p-8 text-md-text-strong relative overflow-hidden shadow-2xl">
                <Cpu className="absolute -bottom-4 -right-4 w-48 h-48 opacity-10 rotate-12" />
                <div className="flex items-center gap-2 mb-1">
                   <Zap className="w-3 h-3 text-indigo-200" />
                   <h4 className="text-[10px] font-black uppercase opacity-70 tracking-widest">Nervous Processing Priority</h4>
                </div>
                <p className="text-4xl font-black tracking-tighter mb-6">RTX_ACCEL</p>
                <div className="space-y-4 relative z-10">
                   <div className="flex justify-between items-center text-[11px] font-bold border-b border-white/20 pb-2">
                      <span className="opacity-70 uppercase tracking-widest">VRAM Pipeline</span>
                      <span className="font-mono">Real-Time Sync</span>
                   </div>
                   <div className="flex justify-between items-center text-[11px] font-bold border-b border-white/20 pb-2">
                      <span className="opacity-70 uppercase tracking-widest">Transport Protocol</span>
                      <span className="font-mono">HTTP / JSON</span>
                   </div>
                   <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="opacity-70 uppercase tracking-widest">Bridge Diagnostics</span>
                      <span className="font-mono">Strict Types</span>
                   </div>
                </div>
             </div>

             <div className="bg-md-surface1 border border-white/5 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                   <FileCode className="w-4 h-4 text-md-text-strong/40" />
                   <h4 className="text-[10px] font-black text-md-text-strong/40 uppercase tracking-widest">DCC Standards Protocol</h4>
                </div>
                <div className="space-y-4">
                   {[
                     { repo: 'Blender', tip: 'Apply all modifiers before synchronization for deterministic results.' },
                     { repo: 'Three.js', tip: 'Utilize Draco compression for high-poly geometries to optimize transmission.' },
                     { repo: 'Network', tip: 'Unreal Remote API is accessed directly via Axio instances and Python snippets.' }
                   ].map((item, idx) => (
                     <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white/2 border border-white/5 hover:border-blue-500/20 transition-all cursor-default">
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                           <span className="text-[9px] font-black text-md-text-strong">{item.repo[0]}</span>
                        </div>
                        <div>
                           <span className="text-[10px] font-black text-md-text-strong uppercase block mb-1">{item.repo} Manual</span>
                           <p className="text-[10px] text-md-text-muted leading-relaxed font-medium">{item.tip}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};


