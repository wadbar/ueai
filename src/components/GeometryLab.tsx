import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Box, 
  Layers, 
  Cpu, 
  Camera, 
  Activity, 
  Database, 
  CheckCircle2, 
  Clock, 
  Maximize2,
  HardDrive,
  RefreshCw,
  Terminal as TerminalIcon,
  Zap,
  Shield,
  FileCode
} from 'lucide-react';
import { MeshDiagnostics, PhotogrammetryJob } from '../types';
import { cn } from '../lib/utils';

interface GeometryLabProps {
  activeActor: any;
  diagnostics: MeshDiagnostics | null;
  onRefreshDiagnostics?: () => Promise<void>;
}

/**
 * Geometry Laboratory: Engine de processamento geométrico avançado.
 * Implementa padrões inspirados em MeshLab, AliceVision (Meshroom) e Open3D.
 */
export const GeometryLab: React.FC<GeometryLabProps> = ({ activeActor, diagnostics, onRefreshDiagnostics }) => {
  const [pipelineStatus, setPipelineStatus] = useState<'IDLE' | 'PROCESSING' | 'SYNCING'>('IDLE');
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([
    "[KERNEL]: AliceVision Pipeline v2.3 inicializado.",
    "[SYSTEM]: Detector de feições SIFT carregado em GPU_0."
  ]);

  const [jobs, setJobs] = useState<PhotogrammetryJob[]>([
    { id: 'REC_7721', status: 'COMPLETE', progress: 100, sourceImages: 142, elapsedTime: '14m 22s' },
    { id: 'REC_8842', status: 'ALIGNING', progress: 45, sourceImages: 89, elapsedTime: '02m 10s' }
  ]);

  const addPipelineLog = useCallback((msg: string) => {
    setPipelineLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const runMeshOptimization = async () => {
    if (pipelineStatus !== 'IDLE') return;
    
    setPipelineStatus('PROCESSING');
    addPipelineLog("Otimização Determinística: Rodando remoção de faces duplicadas...");
    
    // Simulação de Pipeline Real (Inspired by Open3D clustering)
    await new Promise(r => setTimeout(r, 1500));
    addPipelineLog("Sucesso: Clusters geométricos unificados.");
    addPipelineLog("Recalculando normais via MeshLab Bridge...");
    
    await new Promise(r => setTimeout(r, 1000));
    setPipelineStatus('IDLE');
    addPipelineLog("OPTIMIZATION_COMPLETE: Malha pronta para Nanite.");
    
    if (onRefreshDiagnostics) await onRefreshDiagnostics();
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#050505]">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header - CAD Integrity Branding */}
        <div className="flex items-end justify-between border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Shield className="w-4 h-4 text-emerald-500" />
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Protocolo de Integridade Ativo</span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Geometry Laboratory</h2>
            <p className="text-xs text-[#4D4D57] uppercase font-bold mt-1 tracking-widest">
              Digital Twin Synthesis & Mesh Diagnostics • <span className="text-blue-500">AliceVision Framework</span>
            </p>
          </div>
          <div className="flex gap-4">
             <div className="text-right">
                <span className="text-[10px] text-[#4D4D57] font-black uppercase">Core Compute</span>
                <p className="text-xs text-white font-mono uppercase">Linux_Debian_WSL2</p>
             </div>
             <div className="w-px h-8 bg-white/5 mx-2" />
             <div className="text-right">
                <span className="text-[10px] text-[#4D4D57] font-black uppercase">Latency</span>
                <p className="text-xs text-cyan-400 font-mono">0.8ms</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Diagnostic Panel - MeshLab/Blender Inspired */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
             <section className="bg-[#0A0A0B] border border-white/5 rounded-3xl p-6 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Box className="w-32 h-32 text-blue-500" />
                </div>
                
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-xl">
                         <Layers className="w-5 h-5 text-blue-500" />
                      </div>
                      <h3 className="text-sm font-black text-white uppercase">Geometric Analysis</h3>
                   </div>
                   <button 
                     onClick={runMeshOptimization}
                     disabled={!activeActor || pipelineStatus !== 'IDLE'}
                     className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                     <RefreshCw className={cn("w-3 h-3", pipelineStatus !== 'IDLE' && "animate-spin")} />
                     Re-Sync Mesh Analytics
                   </button>
                </div>

                {!activeActor ? (
                  <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-black/20">
                     <Box className="w-8 h-8 text-[#29292E] mb-2" />
                     <p className="text-[10px] text-[#4D4D57] font-bold uppercase">Nenhum Ator Selecionado para Diagnóstico</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {[
                         { label: 'Vertex Count', val: diagnostics?.vertexCount?.toLocaleString() || '---', color: 'text-blue-400' },
                         { label: 'Triangle Count', val: diagnostics?.triangleCount?.toLocaleString() || '---', color: 'text-indigo-400' },
                         { label: 'LOD Groups', val: diagnostics?.lods || '0', color: 'text-emerald-400' },
                         { label: 'UV Channels', val: diagnostics?.uvChannels || '0', color: 'text-amber-400' }
                       ].map((stat, i) => (
                         <div key={i} className="bg-white/2 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            <span className="text-[9px] text-[#4D4D57] font-black uppercase block mb-1">{stat.label}</span>
                            <span className={cn("text-lg font-mono font-bold", stat.color)}>{stat.val}</span>
                         </div>
                       ))}
                    </div>

                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                       <div className="flex items-center gap-2 mb-3">
                          <TerminalIcon className="w-3 h-3 text-[#4D4D57]" />
                          <span className="text-[9px] font-black text-[#4D4D57] uppercase tracking-widest">Procedural Terminal</span>
                       </div>
                       <div className="space-y-1">
                          {pipelineLogs.map((log, i) => (
                            <div key={i} className="text-[10px] font-mono text-[#8D8D99] opacity-70">
                               {log}
                            </div>
                          ))}
                          {pipelineStatus !== 'IDLE' && (
                             <div className="text-[10px] font-mono text-blue-400 animate-pulse">
                                [KERNEL]: Processando buffers de geometria...
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
                         <span className="text-[10px] font-black text-white uppercase">Nanite Virtualization Engine</span>
                      </div>
                      <span className="text-[9px] text-[#4D4D57] font-mono">{diagnostics?.naniteEnabled ? 'ACTIVE' : 'DISABLED'}</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <Activity className="w-4 h-4 text-[#4D4D57]" />
                         <span className="text-[10px] font-black text-white uppercase">Geometric Health Check</span>
                      </div>
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-black uppercase">Optimized</span>
                   </div>
                </div>
             </section>

             {/* Meshroom Reconstruction View */}
             <section className="bg-[#0A0A0B] border border-white/5 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-xl">
                        <Camera className="w-5 h-5 text-amber-500" />
                      </div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">Photogrammetry Pipeline</h3>
                   </div>
                   <button className="px-4 py-2 bg-amber-500 text-black text-[10px] font-black uppercase rounded-lg hover:bg-amber-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20">
                      <Database className="w-3 h-3" />
                      Ingest SIFT Metadata
                   </button>
                </div>

                <div className="space-y-4">
                   {jobs.map((job) => (
                     <div key={job.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-6 group hover:border-white/10 transition-all">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                          job.status === 'COMPLETE' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/20 text-blue-400"
                        )}>
                           {job.status === 'COMPLETE' ? <CheckCircle2 className="w-6 h-6" /> : <Activity className="w-6 h-6 animate-spin-slow" />}
                        </div>
                        <div className="flex-1">
                           <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-white uppercase">{job.id}</span>
                              <span className="text-[10px] font-bold text-[#4D4D57]">{job.progress}% COMPLETE</span>
                           </div>
                           <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                className={cn("h-full", job.status === 'COMPLETE' ? "bg-emerald-500" : "bg-blue-500")}
                                initial={{ width: 0 }}
                                animate={{ width: `${job.progress}%` }}
                              />
                           </div>
                           <div className="flex gap-4 mt-2">
                              <span className="flex items-center gap-1 text-[9px] font-bold text-[#4D4D57] uppercase">
                                 <Clock className="w-3 h-3" /> {job.elapsedTime}
                              </span>
                              <span className="flex items-center gap-1 text-[9px] font-bold text-[#4D4D57] uppercase">
                                 <HardDrive className="w-3 h-3" /> {job.sourceImages} Images
                              </span>
                              <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-bold text-white/40 uppercase">
                                {job.status}
                              </span>
                           </div>
                        </div>
                        <button className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                           <Maximize2 className="w-4 h-4" />
                        </button>
                     </div>
                   ))}
                </div>
             </section>
          </div>

          {/* Right Column - System Resources & High Contrast Info */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
             <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                <Cpu className="absolute -bottom-4 -right-4 w-48 h-48 opacity-10 rotate-12" />
                <div className="flex items-center gap-2 mb-1">
                   <Zap className="w-3 h-3 text-indigo-200" />
                   <h4 className="text-[10px] font-black uppercase opacity-70 tracking-widest">Nervous Processing Priority</h4>
                </div>
                <p className="text-4xl font-black tracking-tighter mb-6">RTX_ACCEL</p>
                <div className="space-y-4 relative z-10">
                   <div className="flex justify-between items-center text-[11px] font-bold border-b border-white/20 pb-2">
                      <span className="opacity-70 uppercase tracking-widest">Worker Pool</span>
                      <span className="font-mono">8 THREADS (CLARK)</span>
                   </div>
                   <div className="flex justify-between items-center text-[11px] font-bold border-b border-white/20 pb-2">
                      <span className="opacity-70 uppercase tracking-widest">Memory Allocation</span>
                      <span className="font-mono">4.2 GB / 12 GB</span>
                   </div>
                   <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="opacity-70 uppercase tracking-widest">Bridge Latency</span>
                      <span className="font-mono">1.2ms</span>
                   </div>
                </div>
             </div>

             <div className="bg-[#0A0A0B] border border-white/5 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-6">
                   <FileCode className="w-4 h-4 text-white/40" />
                   <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">DCC Standards Protocol</h4>
                </div>
                <div className="space-y-4">
                   {[
                     { repo: 'Blender', tip: 'Apply all modifiers before synchronization for deterministic results.' },
                     { repo: 'Three.js', tip: 'Utilize Draco compression for high-poly geometries to optimize transmission.' },
                     { repo: 'AliceVision', tip: 'CCTag markers are identified in source telemetry for precise alignment.' },
                     { repo: 'MeshLab', tip: 'Vertex normal reconstruction is required for volumetric accuracy.' }
                   ].map((item, idx) => (
                     <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white/2 border border-white/5 hover:border-blue-500/20 transition-all cursor-default">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                           <span className="text-[9px] font-black text-white">{item.repo[0]}</span>
                        </div>
                        <div>
                           <span className="text-[10px] font-black text-white uppercase block mb-1">{item.repo} Manual</span>
                           <p className="text-[10px] text-[#8D8D99] leading-relaxed font-medium">{item.tip}</p>
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

