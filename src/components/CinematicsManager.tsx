import React, { useState, useEffect } from 'react';
import { Camera, RotateCcw, Play, Zap, Target, Video, Activity, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { UEConnection, UECommand } from '../types';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CinematicsManagerProps {
  connection: UEConnection;
  addLog: (type: 'ai' | 'ue' | 'error' | 'system', message: string, data?: unknown) => void;
  executeCommands: (commands: UECommand[]) => Promise<void>;
  loading: boolean;
}

export const CinematicsManager: React.FC<CinematicsManagerProps> = ({ 
  connection, 
  addLog, 
  executeCommands,
  loading 
}) => {
  const [orbitConfig, setOrbitConfig] = useState({
    distance: 800,
    pitch: -30,
    yaw: 45,
    targetActor: '',
    cameraActor: '',
    autoUpdate: true
  });

  const [discoveredCameras, setDiscoveredCameras] = useState<string[]>([]);
  const [discoveredSequences, setDiscoveredSequences] = useState<string[]>([]);
  const [activeSequence, setActiveSequence] = useState<string>('');
  const [scanning, setScanning] = useState(false);

  const scanCameras = async () => {
    setScanning(true);
    addLog('ue', 'Buscando instâncias de CineCameraActor na cena...');
    try {
      const response = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
        objectPath: '/Script/Engine.Default__GameplayStatics',
        functionName: 'GetAllActorsOfClass',
        parameters: {
          WorldContextObject: '/Game/Maps/MainLevel.MainLevel',
          ActorClass: '/Script/CinematicCamera.CineCameraActor'
        }
      });

      const cameras = (response.data as any).OutActors || [];
      const camPaths = cameras.map((c: any) => typeof c === 'string' ? c : (c.ObjectPath || c.Path));
      setDiscoveredCameras(camPaths);
      
      if (camPaths.length > 0 && !orbitConfig.cameraActor) {
        setOrbitConfig(prev => ({ ...prev, cameraActor: camPaths[0] }));
      }
      
      addLog('ue', `${camPaths.length} câmeras detectadas.`);
    } catch (err: any) {
      addLog('error', `FALHA_SCAN_CAMERA: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const scanSequences = async () => {
    addLog('ue', 'Buscando instâncias de LevelSequenceActor...');
    try {
      const response = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
        objectPath: '/Script/Engine.Default__GameplayStatics',
        functionName: 'GetAllActorsOfClass',
        parameters: {
          WorldContextObject: '/Game/Maps/MainLevel.MainLevel',
          ActorClass: '/Script/LevelSequence.LevelSequenceActor'
        }
      });
      const sequences = (response.data as any).OutActors || [];
      const seqPaths = sequences.map((c: any) => typeof c === 'string' ? c : (c.ObjectPath || c.Path));
      setDiscoveredSequences(seqPaths);
      if (seqPaths.length > 0) setActiveSequence(seqPaths[0]);
      
      const mySeq = seqPaths.find((p: string) => p.includes('MyLevelSequence'));
      if (mySeq) {
         addLog('ue', 'Iniciando reprodução automática da sequência MyLevelSequence');
         await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
            objectPath: `${mySeq}.SequencePlayer`,
            functionName: 'Play',
            parameters: {}
         });
      }
    } catch (e) {}
  };

  const controlSequence = async (action: 'Play' | 'Pause' | 'Stop') => {
    if (!activeSequence) return;
    try {
      await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
        objectPath: `${activeSequence}.SequencePlayer`,
        functionName: action,
        parameters: {}
      });
      addLog('ue', `SEQUENCER: ${action} executado em ${activeSequence.split('.').pop()}`);
    } catch (err: any) {
      addLog('error', `SEQUENCER_FAULT: ${err.message}`);
    }
  };

  useEffect(() => {
    scanCameras();
    scanSequences();
    syncSelectedAsTarget();
  }, [connection.connected]);

  const syncSelectedAsTarget = async () => {
    addLog('ue', 'Sincronizando alvo via EditorLevelLibrary...');
    try {
      const res = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
        objectPath: '/Script/UnrealEd.Default__EditorLevelLibrary',
        functionName: 'GetSelectedLevelActors'
      });
      const selected = (res.data as any).ReturnValue || [];
      if (selected.length > 0) {
        const actorPath = typeof selected[0] === 'string' ? selected[0] : (selected[0].ObjectPath || selected[0].Path);
        setOrbitConfig(prev => ({ ...prev, targetActor: actorPath }));
        addLog('ue', `Alvo travado: ${actorPath.split('.').pop()}`);
      } else {
        addLog('error', 'Nenhuma seleção ativa detectada no motor.');
      }
    } catch (e) {
      addLog('error', 'FALHA_SINC_ALVO: Remote Control indisponível.');
    }
  };

  const applyOrbit = async () => {
    if (!orbitConfig.cameraActor) {
      addLog('error', 'SELECAO_INVALIDA: Defina uma CineCameraActor primeiro.');
      return;
    }

    try {
      let targetPos = { X: 0, Y: 0, Z: 0 };
      
      if (orbitConfig.targetActor) {
        const actorRes = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
          objectPath: orbitConfig.targetActor,
          functionName: 'K2_GetActorLocation'
        });
        targetPos = (actorRes.data as any).ReturnValue || { X: 0, Y: 0, Z: 0 };
      }

      const pitchRad = (orbitConfig.pitch * Math.PI) / 180;
      const yawRad = (orbitConfig.yaw * Math.PI) / 180;

      const Cx = targetPos.X + orbitConfig.distance * Math.cos(pitchRad) * Math.cos(yawRad);
      const Cy = targetPos.Y + orbitConfig.distance * Math.cos(pitchRad) * Math.sin(yawRad);
      const Cz = targetPos.Z + orbitConfig.distance * Math.sin(pitchRad);

      const dx = targetPos.X - Cx;
      const dy = targetPos.Y - Cy;
      const dz = targetPos.Z - Cz;
      
      const newYaw = Math.atan2(dy, dx) * (180 / Math.PI);
      const dist2D = Math.sqrt(dx * dx + dy * dy);
      const newPitch = Math.atan2(dz, dist2D) * (180 / Math.PI);

      const commands: UECommand[] = [
        {
          endpoint: '/remote/object/call',
          method: 'PUT',
          body: {
            objectPath: orbitConfig.cameraActor,
            functionName: 'K2_SetActorLocation',
            parameters: {
              NewLocation: { X: Cx, Y: Cy, Z: Cz },
              bSweep: false,
              bTeleport: true
            }
          }
        },
        {
          endpoint: '/remote/object/call',
          method: 'PUT',
          body: {
            objectPath: orbitConfig.cameraActor,
            functionName: 'K2_SetActorRotation',
            parameters: {
              NewRotation: { Roll: 0, Pitch: newPitch, Yaw: newYaw },
              bTeleportPhysics: true
            }
          }
        }
      ];

      await executeCommands(commands);
    } catch (err: any) {
      addLog('error', `FALHA_ORBIT_ENGINE: ${err.message}`);
    }
  };

  useEffect(() => {
    if (orbitConfig.autoUpdate) {
      const timeout = setTimeout(applyOrbit, 100);
      return () => clearTimeout(timeout);
    }
  }, [orbitConfig.distance, orbitConfig.pitch, orbitConfig.yaw, orbitConfig.autoUpdate]);

  return (
    <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-md-bg">
       <div className="max-w-4xl mx-auto space-y-12">
          <header className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-[0.2em]">
              <Video className="w-4 h-4" />
              <span>Sistemas de Cinematografia Determinística</span>
            </div>
            <h2 className="text-3xl font-bold text-md-text-strong tracking-tight leading-tight uppercase italic">Controlador de Órbita</h2>
            <p className="text-md-text-muted">Manipulação trigonométrica de CineCameraActors com trava de foco via EditorLevelLibrary.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-md-surface2 border border-md-border rounded-3xl p-8 space-y-8">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-md-text-muted uppercase tracking-widest">Parâmetros Geométricos</h3>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] text-md-text-muted font-bold">AUTO_SYNC</span>
                       <button 
                         onClick={() => setOrbitConfig(prev => ({ ...prev, autoUpdate: !prev.autoUpdate }))}
                         className={cn(
                           "w-10 h-5 rounded-full relative transition-all",
                           orbitConfig.autoUpdate ? "bg-emerald-500" : "bg-md-surface2"
                         )}
                       >
                          <div className={cn(
                            "absolute top-2 w-3 h-3 bg-white rounded-full transition-all",
                            orbitConfig.autoUpdate ? "right-1" : "left-1"
                          )} />
                       </button>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-3">
                       <div className="flex justify-between text-[11px] font-bold text-md-text-muted uppercase">
                          <span>Raio de Órbita</span>
                          <span className="text-indigo-400 font-mono">{orbitConfig.distance}u</span>
                       </div>
                       <input 
                         type="range" min="50" max="10000" step="10"
                         value={orbitConfig.distance}
                         onChange={(e) => setOrbitConfig(prev => ({ ...prev, distance: parseInt(e.target.value) }))}
                         className="w-full h-1 bg-md-surface2 rounded-full appearance-none accent-indigo-500 outline-none"
                       />
                    </div>

                    <div className="space-y-3">
                       <div className="flex justify-between text-[11px] font-bold text-md-text-muted uppercase">
                          <span>Inclinação (Pitch)</span>
                          <span className="text-indigo-400 font-mono">{orbitConfig.pitch}°</span>
                       </div>
                       <input 
                         type="range" min="-89" max="89" step="1"
                         value={orbitConfig.pitch}
                         onChange={(e) => setOrbitConfig(prev => ({ ...prev, pitch: parseInt(e.target.value) }))}
                         className="w-full h-1 bg-md-surface2 rounded-full appearance-none accent-indigo-500 outline-none"
                       />
                    </div>

                    <div className="space-y-3">
                       <div className="flex justify-between text-[11px] font-bold text-md-text-muted uppercase">
                          <span>Rotação (Yaw)</span>
                          <span className="text-indigo-400 font-mono">{orbitConfig.yaw}°</span>
                       </div>
                       <input 
                         type="range" min="-180" max="180" step="1"
                         value={orbitConfig.yaw}
                         onChange={(e) => setOrbitConfig(prev => ({ ...prev, yaw: parseInt(e.target.value) }))}
                         className="w-full h-1 bg-md-surface2 rounded-full appearance-none accent-indigo-500 outline-none"
                       />
                    </div>
                 </div>

                 <div className="pt-8 border-t border-md-border grid grid-cols-2 gap-4">
                    <button 
                      onClick={applyOrbit}
                      disabled={loading || orbitConfig.autoUpdate}
                      className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-md-text-strong font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 uppercase text-[10px]"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      Manual Sync
                    </button>
                    <button 
                      id="sync-focus-btn"
                      onClick={syncSelectedAsTarget}
                      className="flex items-center justify-center gap-2 bg-md-surface2 hover:bg-md-surface3 text-md-text-strong font-bold py-4 rounded-2xl transition-all border border-white/5 uppercase text-[10px]"
                    >
                      <Target className="w-4 h-4" />
                      Lock Focus
                    </button>
                 </div>
              </div>

              <div className="bg-md-surface2 border border-md-border rounded-3xl p-6 flex flex-col gap-4">
                 <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-md-text-muted uppercase tracking-widest">Vetor do Alvo</h4>
                    <div className="px-2 py-1 bg-white/5 rounded text-[10px] text-indigo-400 font-mono">STATUS: LOCK</div>
                 </div>
                 <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                       <Target className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                       <p className="text-xs font-bold text-md-text-strong truncate">{orbitConfig.targetActor ? orbitConfig.targetActor.split('.').pop() : 'Nenhum alvo selecionado'}</p>
                       <p className="text-[10px] font-mono text-md-text-muted truncate">{orbitConfig.targetActor || 'Engine_Wait_Input'}</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="space-y-6">
               <div className="bg-md-surface2 border border-md-border rounded-3xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-md-text-muted uppercase tracking-widest">Matriz de Câmeras</h3>
                    <button 
                      onClick={scanCameras}
                      disabled={scanning}
                      className={cn(
                        "p-2 hover:bg-md-surface2 rounded-xl transition-colors text-md-text-muted hover:text-indigo-400",
                        scanning && "animate-spin"
                      )}
                    >
                       <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-auto custom-scrollbar pr-2">
                     {discoveredCameras.map((camPath) => {
                        const camName = camPath.split('.').pop();
                        return (
                          <button 
                            key={camPath}
                            onClick={() => setOrbitConfig(prev => ({ ...prev, cameraActor: camPath }))}
                            className={cn(
                              "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                              orbitConfig.cameraActor === camPath ? "bg-indigo-500/10 border-indigo-500 text-md-text-strong" : "bg-md-surface1 border-md-border text-md-text-muted hover:border-indigo-500/50"
                            )}
                          >
                             <div className="flex items-center gap-3 overflow-hidden">
                                <Camera className={cn("w-4 h-4 shrink-0", orbitConfig.cameraActor === camPath ? "text-indigo-400" : "")} />
                                <div className="overflow-hidden">
                                   <p className="text-xs font-bold truncate">{camName}</p>
                                   <p className="text-[9px] font-mono opacity-40 truncate">{camPath}</p>
                                </div>
                             </div>
                             {orbitConfig.cameraActor === camPath && <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          </button>
                        );
                     })}
                     {discoveredCameras.length === 0 && !scanning && (
                        <div className="py-8 text-center border-2 border-dashed border-md-border rounded-2xl flex flex-col items-center gap-3">
                           <Camera className="w-8 h-8 text-[#202024]" />
                           <p className="text-[10px] font-bold text-md-text-muted uppercase tracking-widest">Nenhuma Câmera Detectada</p>
                           <button onClick={scanCameras} className="text-[10px] text-indigo-500 hover:underline">Scan Scene</button>
                        </div>
                     )}
                  </div>

                  <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-4">
                     <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-[10px] font-black text-md-text-strong uppercase">Pipeline Log</h4>
                     </div>
                     <div className="space-y-2">
                        <div className="flex items-center justify-between text-[9px] font-bold">
                           <span className="text-md-text-muted">TRIGONOMETRIA</span>
                           <span className="text-emerald-500">OPTIMIZED</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-bold">
                           <span className="text-md-text-muted">ESTADO_LATENCIA</span>
                           <span className="text-md-primary">~15ms</span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="p-8 bg-md-surface1 border border-md-border rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-md-text-strong uppercase tracking-widest text-xs italic">Cine Director V12</h3>
                  </div>
                  <p className="text-[11px] text-md-text-muted leading-relaxed">
                    O controle de órbita via Remote Control recalcula as posições cartesianas baseadas em coordenadas esféricas 
                    a cada alteração de slider. Para órbita suave, ative o 'AUTO_SYNC'.
                  </p>
               </div>
            </div>
          </div>
       </div>
    </div>
  );
};
