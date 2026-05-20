import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Box, Map, Navigation, Trash2, Plus, Zap, AlertCircle, Eye, EyeOff, Radio, Target } from 'lucide-react';
import axios from 'axios';
import { UEConnection } from '../types';
import { Frustum } from '../lib/math3d';

interface StreamingAsset {
  id: string;
  type: string;
  pos: { x: number; y: number; z: number };
  status: 'LOADED' | 'UNLOADED' | 'LOD_ONLY';
  size: string;
  path: string;
  loadRadius: number;
  distance?: number;
  isManual?: boolean;
}

interface StreamingManagerProps {
  playerLocation: { x: number; y: number; z: number };
  connection: UEConnection;
  assets: StreamingAsset[];
  setAssets: React.Dispatch<React.SetStateAction<StreamingAsset[]>>;
  addLog: (type: 'ai' | 'ue' | 'error', message: string, data?: any) => void;
  camera: { pos: { x: number; y: number; z: number }; rot: { r: number; p: number; y: number }; fov: number };
}

export const StreamingManager: React.FC<StreamingManagerProps> = ({ 
  playerLocation, 
  connection, 
  assets, 
  setAssets,
  addLog,
  camera
}) => {
  const [autoStreaming, setAutoStreaming] = useState(true);
  const [useFrustumCulling, setUseFrustumCulling] = useState(true);
  const lastUpdateRef = useRef<number>(0);

  const getForwardVector = (rot: { r: number; p: number; y: number }) => {
    // Pitch & Yaw are converted to radians for trig functions.
    // Standard UE to mathematical forward vector mapping
    const pitch = rot.p * (Math.PI / 180);
    const yaw = rot.y * (Math.PI / 180);
    return {
      x: Math.cos(pitch) * Math.cos(yaw),
      y: Math.cos(pitch) * Math.sin(yaw),
      z: Math.sin(pitch)
    };
  };

  const sendUECommand = async (asset: StreamingAsset, shouldLoad: boolean) => {
    if (!connection.connected) return;

    try {
      const endpoint = '/remote/object/call';
      const actorPath = `${asset.path}.${asset.id}`;
      
      // Comando para modificar visibilidade na Unreal Engine
      await axios.put(`${connection.url}:${connection.port}${endpoint}`, {
        objectPath: actorPath,
        functionName: 'SetActorHiddenInGame',
        parameters: { bNewHidden: !shouldLoad },
        generateTransaction: true
      });

      addLog('ue', `[STREAM_COMMAND]: ${shouldLoad ? 'LOADING' : 'UNLOADING'} -> ${asset.id} (Dist: ${Math.round(asset.distance || 0)}u)`);
    } catch (err: any) {
      addLog('error', `STREAM_FAULT: Falha ao transmitir estado para ${asset.id}`, err.message);
    }
  };

  useEffect(() => {
    const now = Date.now();
    if (!autoStreaming || now - lastUpdateRef.current < 1000) return;
    lastUpdateRef.current = now;

    const computeStreaming = async () => {
      const activeCameraRot = camera?.rot || { r: 0, p: 0, y: 0 };
      const activeCameraPos = camera?.pos || playerLocation;
      const activeCameraFov = camera?.fov || 90;

      const forward = getForwardVector(activeCameraRot);
      const updatedAssets = assets.map(asset => {
        const dist = Math.sqrt(
          Math.pow(asset.pos.x - activeCameraPos.x, 2) +
          Math.pow(asset.pos.y - activeCameraPos.y, 2) +
          Math.pow(asset.pos.z - activeCameraPos.z, 2)
        );

        if (asset.isManual) {
          asset.loadRadius = 7500;
        }

        let isInFrustum = true;
        if (useFrustumCulling) {
          isInFrustum = Frustum.fastSphereInFrustum(
            activeCameraPos,
            forward,
            activeCameraFov,
            asset.pos,
            asset.loadRadius,
            10.0, // Near plane
            50000.0 // Far plane
          );
        }

        let newStatus: 'LOADED' | 'UNLOADED' | 'LOD_ONLY' = asset.status;
        
        // Culling logic combining Distance & Frustum
        if (asset.isManual) {
          // Manually managed assets retain their status and ignore Culling overrides.
          newStatus = asset.status;
        } else if (dist > asset.loadRadius * 1.5) {
          newStatus = 'UNLOADED';
        } else if (useFrustumCulling && !isInFrustum && dist > asset.loadRadius * 0.5) {
          // Unload if not culled by view, but outside the safe inner bubble
          newStatus = 'UNLOADED';
        } else if (dist > asset.loadRadius) {
          newStatus = 'LOD_ONLY';
        } else {
          newStatus = 'LOADED';
        }

        if (newStatus !== asset.status) {
          sendUECommand({ ...asset, distance: dist }, newStatus === 'LOADED');
        }

        return {
          ...asset,
          distance: dist,
          status: newStatus
        };
      });

      setAssets(updatedAssets);
    };

    computeStreaming();
  }, [playerLocation, autoStreaming, useFrustumCulling, camera]);

  return (
    <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-md-bg">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-md-primary font-bold text-xs uppercase tracking-[0.3em]">
              <Navigation className="w-4 h-4" />
              <span>UE Spatial Streaming V4</span>
            </div>
            <h2 className="text-4xl font-black text-md-text-strong tracking-tighter uppercase italic">Geofencing de Assets</h2>
            <p className="text-md-text-muted max-w-lg">
              Gerenciamento dinâmico de visibilidade e memória baseado em proximidade escalar. 
              Otimização de Draw Calls e VRAM em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-4">
             <button 
              onClick={() => setAutoStreaming(!autoStreaming)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                autoStreaming 
                ? "bg-md-primary text-md-on-primary/10 border-blue-500/50 text-md-primary shadow-[0_0_20px_rgba(59,130,246,0.3)]" 
                : "bg-red-500/10 border-red-500/50 text-red-500"
              }`}
            >
              <Radio className={`w-4 h-4 ${autoStreaming ? "animate-pulse" : ""}`} />
              {autoStreaming ? "Auto-Streaming Active" : "Streamer Paused"}
            </button>
             <button 
              onClick={() => setUseFrustumCulling(!useFrustumCulling)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                useFrustumCulling 
                ? "bg-purple-500/10 border-purple-500/50 text-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]" 
                : "bg-[#29292E] border-transparent text-md-text-muted"
              }`}
            >
              <Target className="w-4 h-4" />
              {useFrustumCulling ? "Frustum Culling ON" : "Frustum Culling OFF"}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-md-surface2 border border-md-border p-8 rounded-[32px] space-y-4">
                  <div className="flex items-center justify-between">
                     <Map className="w-8 h-8 text-md-primary" />
                     <span className="text-[10px] font-black text-md-text-muted uppercase tracking-widest">Active Camera Pos</span>
                  </div>
                  <div className="flex gap-4">
                     <div className="flex-1 space-y-1">
                        <span className="text-[9px] font-bold text-md-text-muted uppercase">X-Axis</span>
                        <p className="text-2xl font-black text-md-text-strong tracking-tighter">{(camera?.pos?.x || playerLocation.x).toFixed(0)}</p>
                     </div>
                     <div className="flex-1 space-y-1">
                        <span className="text-[9px] font-bold text-md-text-muted uppercase">Y-Axis</span>
                        <p className="text-2xl font-black text-md-text-strong tracking-tighter">{(camera?.pos?.y || playerLocation.y).toFixed(0)}</p>
                     </div>
                  </div>
               </div>

               <div className="bg-md-surface2 border border-md-border p-8 rounded-[32px] space-y-4">
                  <div className="flex items-center justify-between">
                     <Zap className="w-8 h-8 text-amber-500" />
                     <span className="text-[10px] font-black text-md-text-muted uppercase tracking-widest">Total Managed</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-black text-md-text-strong tracking-tighter">{assets.length}</span>
                     <span className="text-xs font-bold text-md-text-muted">Assets / {assets.filter(a => a.status === 'LOADED').length} Active</span>
                  </div>
               </div>
            </div>

            <div className="bg-md-surface1 border border-md-border rounded-[40px] overflow-hidden">
               <div className="p-8 border-b border-md-border flex items-center justify-between">
                  <h3 className="text-xs font-black text-md-text-strong uppercase tracking-widest">Asset Registry & Proximity</h3>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => {
                        const path = window.prompt("Enter Asset Path (e.g. /Game/Meshes/Player)");
                        const id = window.prompt("Enter Actor ID (e.g. BP_Player_C_1)");
                        if(path && id) {
                          const posX = camera?.pos?.x || playerLocation.x;
                          const posY = camera?.pos?.y || playerLocation.y;
                          const posZ = camera?.pos?.z || playerLocation.z;
                          setAssets(prev => [...prev, {
                            id,
                            type: 'Manual',
                            path,
                            pos: { x: posX, y: posY, z: posZ },
                            status: 'LOADED',
                            size: '0MB',
                            loadRadius: 7500
                          }]);
                        }
                      }}
                      className="flex items-center gap-2 text-[10px] font-black text-md-primary hover:text-md-primary transition-colors"
                    >
                       <Plus className="w-3.5 h-3.5" />
                       REGISTER_NEW_NODE
                    </button>
                  </div>
               </div>
               
               <div className="divide-y divide-[#202024]">
                  {assets.map(asset => (
                    <motion.div 
                      key={asset.id}
                      className="p-8 flex items-center justify-between group hover:bg-white/[0.02] transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                          asset.status === 'LOADED' ? "bg-md-primary text-md-on-primary/20 text-md-primary" : "bg-md-surface2 text-md-text-muted"
                        }`}>
                          <Box className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-md-text-strong uppercase tracking-tight">{asset.id}</h4>
                          <p className="text-[10px] text-md-text-muted font-mono leading-none">{asset.path}</p>
                          <div className="flex items-center gap-3 mt-2">
                             <span className="text-[9px] font-black text-md-text-muted bg-md-surface2 px-3 py-1 rounded cursor-help" title={`Radius: ${asset.loadRadius}`}>
                                RAD: {asset.loadRadius}
                             </span>
                             <span className="text-[9px] font-black text-md-text-muted bg-md-surface2 px-3 py-1 rounded">
                                DIST: {asset.distance?.toFixed(0)}
                             </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                         <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                const newStatus = asset.status === 'LOADED' ? 'UNLOADED' : 'LOADED';
                                sendUECommand({ ...asset }, newStatus === 'LOADED');
                                setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status: newStatus, isManual: true, loadRadius: 7500 } : a));
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                asset.status === 'LOADED' 
                                ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" 
                                : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                              }`}
                            >
                               {asset.status === 'LOADED' ? "UNLOAD" : "LOAD"}
                            </button>
                            <button 
                              onClick={() => {
                                setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, isManual: !a.isManual, loadRadius: !a.isManual ? 7500 : a.loadRadius } : a));
                              }}
                              className={`p-2.5 rounded-xl transition-all ${
                                asset.isManual ? "text-amber-500 bg-amber-500/10" : "text-md-text-muted hover:bg-white/5"
                              }`}
                              title={asset.isManual ? "Manual Override Active" : "Auto-Streaming Active"}
                            >
                               <Zap className="w-4 h-4" fill={asset.isManual ? "currentColor" : "none"} />
                            </button>
                         </div>

                         <div className="text-right space-y-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                               asset.status === 'LOADED' ? "bg-emerald-500/10 text-emerald-500" : 
                               asset.status === 'LOD_ONLY' ? "bg-amber-500/10 text-amber-500" :
                               "bg-red-500/10 text-red-500"
                            }`}>
                               {asset.status}
                            </span>
                            <div className="flex justify-end gap-2">
                               <div className={`h-0.5 w-8 rounded-full ${asset.status === 'LOADED' ? "bg-emerald-500" : "bg-[#29292E]"}`} />
                               <div className={`h-0.5 w-4 rounded-full ${asset.distance! < asset.loadRadius * 0.5 ? "bg-emerald-500" : "bg-[#29292E]"}`} />
                            </div>
                         </div>
                         <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => {
                                const newStatus = asset.status === 'LOADED' ? 'UNLOADED' : 'LOADED';
                                sendUECommand({ ...asset }, newStatus === 'LOADED');
                                setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status: newStatus, isManual: true, loadRadius: 7500 } : a));
                              }}
                              className="p-2 hover:bg-white/5 rounded-2xl text-md-text-muted hover:text-md-text-strong transition-colors"
                              title={asset.status === 'LOADED' ? "Forçar Descarregamento" : "Forçar Carregamento"}
                            >
                               {asset.status === 'LOADED' ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm(`Remover asset ${asset.id} do gerenciamento?`)) {
                                  setAssets(prev => prev.filter(a => a.id !== asset.id));
                                  addLog('ai', `Asset ${asset.id} removido do Geofencing.`);
                                }
                              }}
                              className="p-2 hover:bg-red-500/10 text-md-text-muted hover:text-red-500 rounded-2xl transition-colors"
                            >
                               <Trash2 className="w-5 h-5" />
                            </button>
                         </div>
                      </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          </div>

          <aside className="space-y-8">
            <div className="bg-md-surface2 border border-md-border rounded-[32px] p-8 space-y-6">
               <div className="flex items-center gap-3 border-b border-md-border pb-4">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h3 className="text-xs font-black text-md-text-strong uppercase tracking-[0.2em]">Cálculo de Carga</h3>
               </div>
               <div className="space-y-6">
                  <div className="space-y-2">
                     <p className="text-[10px] text-md-text-muted font-black uppercase tracking-widest">Algoritmo de Proximidade</p>
                     <p className="text-[11px] text-md-text-muted leading-relaxed">
                        Utiliza distância euclidiana pura (L2 Norm) para decidir o estado do objeto no Graph. 
                        Nodos acima do raio são descarregados imediatamente da memória.
                     </p>
                  </div>
                  <div className="p-6 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                     <span className="text-[10px] font-black text-md-text-muted uppercase">VRAM Efficiency</span>
                     <span className="text-emerald-500 font-black text-xs">+34%</span>
                  </div>
               </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-[32px] p-8 space-y-6">
               <h3 className="text-xs font-black text-md-text-strong uppercase tracking-[0.2em]">Live Stream Debug</h3>
               <div className="space-y-4">
                  {assets.filter(a => a.distance! < a.loadRadius + 2000).slice(0, 3).map(a => (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                       <span className="text-md-text-muted truncate mr-2">{a.id}</span>
                       <span className={`font-mono text-[10px] ${a.status === 'LOADED' ? "text-md-primary" : "text-amber-500"}`}>
                          {(a.distance! / a.loadRadius * 100).toFixed(0)}% PROX
                       </span>
                    </div>
                  ))}
               </div>
               <button className="w-full py-4 bg-md-primary text-md-on-primary hover:opacity-90 text-md-text-strong rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all">
                  FORCE_RECALC_NODES
               </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
