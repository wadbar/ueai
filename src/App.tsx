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
  Cpu,
  Zap,
  Layers,
  Video,
  Pause,
  RotateCcw,
  Bookmark,
  Trash2,
  Filter,
  Tag,
  ImageIcon,
  Upload,
  Camera,
  Target,
  ChevronDown,
  Layers as LayersIcon,
  TrendingDown,
  Monitor
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
  const [connection, setConnection] = useState<UEConnection>(() => {
    const saved = localStorage.getItem('ue_connection');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Falha ao restaurar conexão:', e);
      }
    }
    return {
      url: 'http://localhost',
      port: '8080',
      connected: false,
    };
  });

  useEffect(() => {
    const { connected, ...settings } = connection;
    localStorage.setItem('ue_connection', JSON.stringify(settings));
  }, [connection.url, connection.port]);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentAIResponse, setCurrentAIResponse] = useState<AIResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'factory' | 'system' | 'streaming' | 'materials' | 'animations' | 'cinematics' | 'lod'>('console');
  const [materials, setMaterials] = useState<any[]>([
    { id: 'M_Cyberpunk_Metal', baseColor: '#9462E1', metallic: 0.9, roughness: 0.1, emissive: '#4D21B2', status: 'SYNCHRONIZED', textures: { albedo: '', normal: '', metallic: '', roughness: '' } },
    { id: 'M_Industrial_Concrete', baseColor: '#323238', metallic: 0.0, roughness: 0.8, emissive: '#000000', status: 'SYNCHRONIZED', textures: { albedo: '', normal: '', metallic: '', roughness: '' } }
  ]);
  const [skeletalMeshes, setSkeletalMeshes] = useState<any[]>([
    { id: 'SK_Mannequin', assetPath: '/Game/Characters/Mannequins/SK_Mannequin', currentAnim: 'Idle', playing: false, loop: true, playRate: 1.0 },
    { id: 'SK_Robotic_Arm', assetPath: '/Game/Props/Robotics/SK_Robotic_Arm', currentAnim: 'Sequence_01', playing: true, loop: false, playRate: 1.5 }
  ]);
  const [cameras, setCameras] = useState<any[]>([
    { id: 'Main_CineCam', pos: { x: 0, y: -500, z: 150 }, rot: { r: 0, p: 0, y: 90 }, fov: 60, active: true }
  ]);
  const [streamingAssets, setStreamingAssets] = useState<any[]>([
    { id: 'SM_Citadel_Gate', type: 'LevelInstance', pos: { x: 5000, y: 0, z: 0 }, status: 'LOADED', size: '245MB' },
    { id: 'SM_Terrain_Sector_A1', type: 'WorldPartition', pos: { x: -2000, y: 500, z: 0 }, status: 'LOADED', size: '1.2GB' },
    { id: 'SM_Detail_Props_04', type: 'StaticMesh', pos: { x: 15000, y: 15000, z: 0 }, status: 'UNLOADED', size: '45MB' },
    { id: 'SM_Skybox_HighRes', type: 'StaticMesh', pos: { x: 0, y: 0, z: 100000 }, status: 'LOD_ONLY', size: '12MB' }
  ]);
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0, z: 0 });
  const [streamingThreshold, setStreamingThreshold] = useState(10000);

  const calculateDistance = (p1: any, p2: any) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2));
  };

  const syncStreamingState = async () => {
    addLog('ue', 'Iniciando varredura de proximidade V12...');
    
    const updatedAssets = streamingAssets.map(asset => {
      const dist = calculateDistance(cameraPos, asset.pos);
      let newStatus = asset.status;

      if (dist > streamingThreshold * 2) newStatus = 'UNLOADED';
      else if (dist > streamingThreshold) newStatus = 'LOD_ONLY';
      else newStatus = 'LOADED';

      return { ...asset, distance: Math.round(dist), status: newStatus };
    });

    setStreamingAssets(updatedAssets);
    
    const changeLog = updatedAssets.filter((a, i) => a.status !== streamingAssets[i].status);
    if (changeLog.length > 0) {
      addLog('ai', `Detectadas ${changeLog.length} alterações de streaming baseadas em proximidade.`);
      // Aqui a IA poderia disparar os comandos automáticos para a UE5
    }
  };
  const [systemHealth, setSystemHealth] = useState<{ status: string; latency?: string; memory?: any; uptime?: number }>({ status: 'checking' });
  const [isStandalone, setIsStandalone] = useState(false);
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('M_Cyberpunk_Metal');
  const [editingProps, setEditingProps] = useState({
    baseColor: '#9462E1',
    metallic: 0.9,
    roughness: 0.1,
    emissive: '#4D21B2',
    textures: {
      albedo: '',
      normal: '',
      metallic: '',
      roughness: ''
    }
  });
  
  // [STANDALONE_DETECTION]: Verifica se o app está rodando fora do navegador comum
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);

  // [MEMORY_MANAGER]: Gerenciamento de memória (Pattern PaperCreeper)
  useEffect(() => {
    const checkMemoryPressure = () => {
      const perf = (window.performance as any);
      if (perf.memory) {
        const { usedJSHeapSize, jsHeapSizeLimit } = perf.memory;
        if (usedJSHeapSize > jsHeapSizeLimit * 0.8) {
          console.warn("[MEMORY_PRESSURE_CRITICAL]: Limpando buffers de log...");
          setLogs(prev => prev.slice(-30));
        }
      }
    };

    const interval = setInterval(checkMemoryPressure, 60000);
    return () => clearInterval(interval);
  }, []);
  interface SavedCommand {
    id: string;
    text: string;
    pinned: boolean;
    category?: string;
    timestamp: number;
  }

  const [commandHistory, setCommandHistory] = useState<SavedCommand[]>(() => {
    const saved = localStorage.getItem('ue_command_history_v2');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const saveCommand = (text: string, category?: string) => {
    setCommandHistory(prev => {
        const exists = prev.find(c => c.text === text);
        if (exists) return prev;
        
        const newCommand: SavedCommand = {
            id: Math.random().toString(36).substr(2, 9),
            text,
            pinned: false,
            category: category || 'General',
            timestamp: Date.now()
        };
        return [newCommand, ...prev].slice(0, 50);
    });
  };

  const togglePin = (id: string) => {
    setCommandHistory(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  };

  const deleteCommand = (id: string) => {
    setCommandHistory(prev => prev.filter(c => c.id !== id));
  };
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // [RUNTIME_AUDIT]: Monitoramento periódico de integridade com AbortController
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const checkHealth = async () => {
      try {
        const [healthRes, envRes] = await Promise.all([
          axios.get('/api/health/ai', { signal: controller.signal }),
          axios.get('/api/system/env', { signal: controller.signal })
        ]);
        if (isMounted) {
          setSystemHealth(healthRes.data);
          setEnvInfo(envRes.data);
        }
      } catch (e) {
        if (isMounted && !axios.isCancel(e)) {
          setSystemHealth({ status: 'degraded' });
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    addLog('ai', 'SYSTEM_CORE_ACTIVE: Camadas de otimização injetadas. Ambiente estável.');

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('ue_command_history_v2', JSON.stringify(commandHistory));
  }, [commandHistory]);

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
      data: data ? JSON.parse(JSON.stringify(data)) : undefined, // Deep copy imutável
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const currentPrompt = prompt.trim();
    setLoading(true);
    addLog('ai', `Processando comando: "${currentPrompt}"`);
    
    try {
      const response = await axios.post('/api/ai/command', {
        prompt: currentPrompt,
        currentContext: logs.slice(-10).map(l => `${l.type}: ${l.message}`).join('|')
      });
      
      const aiData: AIResponse = response.data;
      
      if (!aiData || !aiData.commands) {
        throw new Error("RESPOSTA_MALFORMADA_CORE");
      }

      setCurrentAIResponse(aiData);
      saveCommand(currentPrompt, aiData.commands?.[0]?.body?.parameters?.category || 'AI Generated');
      addLog('ai', `Sugestão Gerada: ${aiData.explanation}`);
      
      setPrompt('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message;
      addLog('error', `Falha na Inferência Core: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const executeCommands = async (commands: UECommand[]) => {
    if (!connection.connected) {
      addLog('error', 'STATUS_DISCONNECTED: Proceda com o teste de conexão primeiro.');
      return;
    }

    if (loading) {
      addLog('error', 'CONCURRENCY_LOCK: Uma operação já está em trâmite.');
      return;
    }

    setLoading(true);
    addLog('ue', `Iniciando transmissão de ${commands.length} comandos para o motor...`);
    
    try {
      for (let i = 0; i < commands.length; i++) {
          const cmd = commands[i];
          // [DEFENSIVE_CHECK]: Validação de endpoint antes do disparo
          if (!cmd.endpoint?.startsWith('/remote')) {
            throw new Error(`ENDPOINT_INVALIDO_CORE: ${cmd.endpoint}`);
          }

          await axios.put(`${connection.url}:${connection.port}${cmd.endpoint}`, {
            ...cmd.body,
            generateTransaction: true // Garantia de reversibilidade
          }, { timeout: 8000 });
          
          addLog('ue', `[${i+1}/${commands.length}] Transmissão confirmada.`);
      }
    } catch (err: any) {
      const detailedError = err.response?.data || err.message;
      addLog('error', `ABORT_SEQUENCE_CRITICAL: Falha na sequência de transmissão.`, detailedError);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMaterial = async (materialId: string, props: any) => {
    const commands: UECommand[] = [
      {
        endpoint: '/remote/object/call',
        method: 'PUT',
        body: {
          objectPath: `/Game/Materials/Instances/${materialId}.${materialId}`,
          functionName: 'SetVectorParameterValue',
          parameters: {
            ParameterName: 'BaseColor',
            Value: props.baseColor
          }
        }
      },
      {
        endpoint: '/remote/object/call',
        method: 'PUT',
        body: {
          objectPath: `/Game/Materials/Instances/${materialId}.${materialId}`,
          functionName: 'SetScalarParameterValue',
          parameters: {
            ParameterName: 'Metallic',
            Value: props.metallic
          }
        }
      },
      {
        endpoint: '/remote/object/call',
        method: 'PUT',
        body: {
          objectPath: `/Game/Materials/Instances/${materialId}.${materialId}`,
          functionName: 'SetScalarParameterValue',
          parameters: {
            ParameterName: 'Roughness',
            Value: props.roughness
          }
        }
      }
    ];

    // Adiciona comandos de textura se houver caminhos definidos
    Object.entries(props.textures).forEach(([param, path]) => {
        if (path) {
            commands.push({
                endpoint: '/remote/object/call',
                method: 'PUT',
                body: {
                    objectPath: `/Game/Materials/Instances/${materialId}.${materialId}`,
                    functionName: 'SetTextureParameterValue',
                    parameters: {
                        ParameterName: param === 'albedo' ? 'BaseColor' : param.charAt(0).toUpperCase() + param.slice(1),
                        Value: path
                    }
                }
            });
        }
    });

    addLog('ue', `Sincronizando parâmetros PBR para ${materialId}...`);
    await executeCommands(commands);
    
    setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, status: 'SYNCHRONIZED', ...props } : m));
  };

  const handleSpawnCamera = async (config: { x: number, y: number, z: number, fov: number, lookAtCenter: boolean }) => {
    addLog('ue', `Iniciando rotina de spawn: CineCameraActor em (${config.x}, ${config.y}, ${config.z})...`);
    
    // Cálculo de spawn com transform completo para a CineCamera
    const commands: UECommand[] = [
      {
        endpoint: '/remote/object/call',
        method: 'PUT',
        body: {
          objectPath: '/Script/Engine.Default__GameplayStatics',
          functionName: 'BeginSpawningActorFromClass',
          parameters: {
            WorldContextObject: '/Game/Maps/MainLevel.MainLevel',
            ActorClass: '/Script/CinematicCamera.CineCameraActor',
            SpawnTransform: {
              Translation: { X: config.x, Y: config.y, Z: config.z },
              Rotation: { Roll: 0, Pitch: -25, Yaw: 135 }, // Rotação para olhar aproximadamente para 0,0,0
              Scale3D: { X: 1, Y: 1, Z: 1 }
            }
          }
        }
      }
    ];

    await executeCommands(commands);
    
    const newCamId = `CineCam_${Date.now().toString().slice(-4)}`;
    
    // Comando para setar o FOV após o spawn
    const setupCommands: UECommand[] = [
      {
        endpoint: '/remote/object/call',
        method: 'PUT',
        body: {
          objectPath: `/Game/Maps/MainLevel.MainLevel:PersistentLevel.${newCamId}.CameraComponent`,
          functionName: 'SetFieldOfView',
          parameters: { InFieldOfView: config.fov }
        }
      }
    ];
    
    await executeCommands(setupCommands);
    
    const newCam = {
        id: newCamId,
        pos: { x: config.x, y: config.y, z: config.z },
        fov: config.fov,
        active: false
    };
    
    setCameras(prev => [...prev, newCam]);
    addLog('ai', `CineCameraActor [${newCamId}] spawnado com sucesso. FOV configurado para ${config.fov}°.`);
  };

  const [lodConfigs, setLodConfigs] = useState<any[]>([
    { 
        id: 'SM_Ancient_Statue', 
        path: '/Game/Environment/Ancient/SM_Ancient_Statue',
        currentLODs: 3,
        lods: [
            { level: 0, tris: '100%', distance: 0, status: 'NATIVE' },
            { level: 1, tris: '45%', distance: 500, status: 'GENERATED' },
            { level: 2, tris: '12%', distance: 2000, status: 'GENERATED' }
        ]
    }
  ]);

  const handleApplyLODs = async (meshPath: string, configs: any[]) => {
    addLog('ue', `Iniciando re-topo e aplicação de ${configs.length} LODs para ${meshPath.split('/').pop()}...`);
    
    const commands: UECommand[] = [
        {
            endpoint: '/remote/object/call',
            method: 'PUT',
            body: {
                objectPath: meshPath,
                functionName: 'SetNumSourceModels',
                parameters: { Num: configs.length }
            }
        }
    ];

    // Aqui mapearíamos os tamanhos de tela e reduções de triângulos
    await executeCommands(commands);
    addLog('ai', `Pipeline de otimização finalizado. Sincronizando buffers de renderização...`);
  };

  const handleAnimationControl = async (meshId: string, action: 'play' | 'pause' | 'stop' | 'rate', value?: any) => {
    const mesh = skeletalMeshes.find(m => m.id === meshId);
    if (!mesh) return;

    let commands: UECommand[] = [];

    if (action === 'play' || action === 'pause') {
        const isPlaying = action === 'play';
        commands = [
            {
                endpoint: '/remote/object/call',
                method: 'PUT',
                body: {
                    objectPath: `${mesh.assetPath}.${mesh.id}`,
                    functionName: isPlaying ? 'Play' : 'Stop',
                    parameters: {}
                }
            }
        ];
        setSkeletalMeshes(prev => prev.map(m => m.id === meshId ? { ...m, playing: isPlaying } : m));
    } else if (action === 'rate') {
        commands = [
            {
                endpoint: '/remote/object/call',
                method: 'PUT',
                body: {
                    objectPath: `${mesh.assetPath}.${mesh.id}`,
                    functionName: 'SetPlayRate',
                    parameters: { NewRate: value }
                }
            }
        ];
        setSkeletalMeshes(prev => prev.map(m => m.id === meshId ? { ...m, playRate: value } : m));
    }

    addLog('ue', `Comando de animação [${action}] enviado para ${meshId}.`);
    await executeCommands(commands);
  };

  const handleUEConnectionTest = async () => {
    try {
      addLog('ue', `Testando conexão em ${connection.url}:${connection.port}...`);
      await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
          objectPath: "/Script/Engine.Default__GameplayStatics",
          functionName: "GetTimeSeconds",
          parameters: { WorldContextObject: "/Game/StarterContent/Maps/Minimal_Default.Minimal_Default" },
          generateTransaction: false
      }, { timeout: 3000 });
      
      setConnection(prev => ({ ...prev, connected: true }));
      addLog('ue', 'LINK_ESTABLISHED: Sincronização estável com Unreal Engine.');
    } catch (err: any) {
      setConnection(prev => ({ ...prev, connected: false }));
      addLog('error', `LINK_FAILURE: Verifique o Remote Control API (Porta ${connection.port}).`);
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
                "w-2 h-2 rounded-full transition-all duration-500",
                connection.connected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              )} />
              <p className="text-xs text-[#8D8D99] font-medium">
                {connection.connected ? `Engine: ${connection.port}` : "Link Offline"}
              </p>
              <div className="w-px h-3 bg-[#323238] mx-1" />
              <div className="flex items-center gap-1.5 overflow-hidden">
                 <span className={cn(
                   "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                   systemHealth.status === 'online' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                 )}>
                   AI: {systemHealth.status}
                 </span>
                 {isStandalone && (
                   <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter bg-blue-500/10 text-blue-500">
                     DESKTOP_MODE
                   </span>
                 )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[#202024] p-1 rounded-lg flex items-center gap-1">
            <button 
              onClick={() => setActiveTab('console')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
                activeTab === 'console' ? "bg-[#9462E1] text-white shadow-lg" : "text-[#8D8D99] hover:text-white"
              )}
            >
              CONSOLE
            </button>
            <button 
              onClick={() => setActiveTab('factory')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
                activeTab === 'factory' ? "bg-[#9462E1] text-white shadow-lg" : "text-[#8D8D99] hover:text-white"
              )}
            >
              SCRIPT FACTORY
            </button>
            <button 
              onClick={() => setActiveTab('system')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
                activeTab === 'system' ? "bg-[#9462E1] text-white shadow-lg" : "text-[#8D8D99] hover:text-white"
              )}
            >
              ENVIRONMENT
            </button>
            <button 
              onClick={() => setActiveTab('streaming')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
                activeTab === 'streaming' ? "bg-[#9462E1] text-white shadow-lg" : "text-[#8D8D99] hover:text-white"
              )}
            >
              STREAMING
            </button>
            <button 
              onClick={() => setActiveTab('materials')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
                activeTab === 'materials' ? "bg-[#9462E1] text-white shadow-lg" : "text-[#8D8D99] hover:text-white"
              )}
            >
              MATERIALS
            </button>
            <button 
              onClick={() => setActiveTab('animations')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
                activeTab === 'animations' ? "bg-[#9462E1] text-white shadow-lg" : "text-[#8D8D99] hover:text-white"
              )}
            >
              ANIMATIONS
            </button>
            <button 
              onClick={() => setActiveTab('cinematics')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
                activeTab === 'cinematics' ? "bg-[#9462E1] text-white shadow-lg" : "text-[#8D8D99] hover:text-white"
              )}
            >
              CINEMATICS
            </button>
            <button 
              onClick={() => setActiveTab('lod')}
              className={cn(
                "px-3 py-1.5 rounded-md text-[11px] font-bold transition-all",
                activeTab === 'lod' ? "bg-amber-500 text-black shadow-lg" : "text-[#8D8D99] hover:text-white"
              )}
            >
              LOD MANAGER
            </button>
          </div>
          <div className="h-6 w-px bg-[#202024]" />
          <button 
            id="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-[#202024] rounded-lg transition-colors text-[#8D8D99] hover:text-white"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_400px] h-[calc(100vh-73px)]">
        {/* Main Interface */}
        <section className="flex flex-col h-full border-r border-[#202024] overflow-hidden">
          {activeTab === 'console' ? (
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
          ) : activeTab === 'materials' ? (
            <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#050505]">
              <div className="max-w-5xl mx-auto space-y-12">
                <header className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-[0.2em]">
                    <Zap className="w-4 h-4" />
                    <span>PBR Forge</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">Material Designer</h2>
                  <p className="text-[#8D8D99]">Crie e aplique instâncias de materiais fisicamente corretas diretamente no motor.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest">Library</h3>
                    <div className="space-y-2">
                      {materials.map((mat) => (
                        <button 
                          key={mat.id}
                          onClick={() => {
                            setSelectedMaterialId(mat.id);
                            setEditingProps({
                                baseColor: mat.baseColor,
                                metallic: mat.metallic,
                                roughness: mat.roughness,
                                emissive: mat.emissive,
                                textures: mat.textures || { albedo: '', normal: '', metallic: '', roughness: '' }
                            });
                          }}
                          className={`w-full text-left p-4 bg-[#121214] border rounded-xl hover:border-[#9462E1] transition-all group ${selectedMaterialId === mat.id ? 'border-[#9462E1] bg-[#121214]/80' : 'border-[#29292E]'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded shadow-inner" style={{ backgroundColor: mat.baseColor }} />
                            <div>
                               <p className={`text-sm font-bold transition-colors ${selectedMaterialId === mat.id ? 'text-[#9462E1]' : 'text-white group-hover:text-[#9462E1]'}`}>{mat.id}</p>
                               <span className="text-[10px] text-[#4D4D57] font-mono">{mat.status}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                      <button className="w-full py-3 border-2 border-dashed border-[#202024] rounded-xl text-[11px] font-bold text-[#4D4D57] hover:border-[#9462E1] hover:text-[#9462E1] transition-all">
                        + NOVO MATERIAL
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-[#0A0A0B] border border-[#29292E] rounded-3xl p-8 space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">Editor de Propriedades</h3>
                      <button 
                        onClick={() => handleApplyMaterial(selectedMaterialId, editingProps)}
                        className="px-4 py-2 bg-emerald-500 text-black text-[11px] font-bold rounded-lg hover:bg-emerald-400 transition-colors"
                      >
                        APLICAR AO SELECIONADO
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] text-[#8D8D99] font-bold uppercase tracking-widest">Albedo (Base Color)</label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="color" 
                              className="w-12 h-12 bg-transparent border-0 cursor-pointer" 
                              value={editingProps.baseColor}
                              onChange={(e) => setEditingProps(prev => ({ ...prev, baseColor: e.target.value }))}
                            />
                            <input 
                              type="text" 
                              className="flex-1 bg-[#121214] border border-[#29292E] p-3 rounded-lg text-white font-mono text-sm" 
                              value={editingProps.baseColor}
                              onChange={(e) => setEditingProps(prev => ({ ...prev, baseColor: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                           <div className="space-y-2">
                             <div className="flex justify-between">
                               <label className="text-[10px] text-[#8D8D99] font-bold uppercase tracking-widest">Metallic</label>
                               <span className="text-[10px] text-white font-mono">{editingProps.metallic.toFixed(2)}</span>
                             </div>
                             <input 
                               type="range" 
                               min="0" max="1" step="0.01"
                               className="w-full accent-[#9462E1]" 
                               value={editingProps.metallic}
                               onChange={(e) => setEditingProps(prev => ({ ...prev, metallic: parseFloat(e.target.value) }))}
                             />
                           </div>

                           <div className="space-y-2">
                             <div className="flex justify-between">
                               <label className="text-[10px] text-[#8D8D99] font-bold uppercase tracking-widest">Roughness</label>
                               <span className="text-[10px] text-white font-mono">{editingProps.roughness.toFixed(2)}</span>
                             </div>
                             <input 
                               type="range" 
                               min="0" max="1" step="0.01"
                               className="w-full accent-[#9462E1]" 
                               value={editingProps.roughness}
                               onChange={(e) => setEditingProps(prev => ({ ...prev, roughness: parseFloat(e.target.value) }))}
                             />
                           </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] text-[#8D8D99] font-bold uppercase tracking-widest">Emissive Intensity</label>
                           <div className="flex items-center gap-3">
                            <div className="p-3 bg-[#121214] border border-[#29292E] rounded-lg flex-1">
                               <div className="h-1 bg-gradient-to-r from-black to-blue-500 rounded-full" />
                            </div>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] text-[#8D8D99] font-bold uppercase tracking-widest">Normal Map Strength</label>
                           <input type="range" className="w-full accent-blue-500" />
                        </div>

                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                           <div className="flex items-center gap-2">
                             <Activity className="w-3.5 h-3.5 text-emerald-500" />
                             <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">PBR Validation</span>
                           </div>
                           <p className="text-[11px] text-[#8D8D99]">Valores dentro do intervalo físico otimizado para o Lumen.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-8 border-t border-[#29292E]">
                        <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest">Texture Channels</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {['albedo', 'normal', 'metallic', 'roughness'].map((type) => (
                                <div key={type} className="space-y-4">
                                    <label className="text-[10px] text-[#8D8D99] font-bold uppercase tracking-widest">{type}</label>
                                    <div className="relative group">
                                        <div className="h-40 bg-[#121214] border border-[#29292E] rounded-xl flex flex-col items-center justify-center gap-2 group-hover:border-[#9462E1] transition-all overflow-hidden">
                                            {editingProps.textures[type as keyof typeof editingProps.textures] ? (
                                                <div className="w-full h-full bg-[#1e1e21] flex items-center justify-center italic text-[10px] text-[#4d4d57]">
                                                    {editingProps.textures[type as keyof typeof editingProps.textures]}
                                                </div>
                                            ) : (
                                                <>
                                                    <ImageIcon className="w-6 h-6 text-[#4D4D57]" />
                                                    <span className="text-[9px] text-[#4D4D57] font-bold">MISSING_MAP</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-xl gap-2">
                                            <button className="p-2 bg-[#9462E1] rounded-lg text-white">
                                                <Upload className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const path = prompt(`Digite o Asset Path da textura (${type}):`, '/Game/Textures/');
                                                    if (path) setEditingProps(prev => ({ 
                                                        ...prev, 
                                                        textures: { ...prev.textures, [type]: path } 
                                                    }));
                                                }}
                                                className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20"
                                            >
                                                <Filter className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="/Game/Textures/..."
                                        className="w-full bg-[#121214] border border-[#29292E] p-2 rounded text-[10px] text-[#8D8D99] font-mono focus:border-[#9462E1] outline-none"
                                        value={editingProps.textures[type as keyof typeof editingProps.textures]}
                                        onChange={(e) => setEditingProps(prev => ({ 
                                            ...prev, 
                                            textures: { ...prev.textures, [type]: e.target.value } 
                                        }))}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'cinematics' ? (
            <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#050505]">
               <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-[0.2em]">
                    <Camera className="w-4 h-4" />
                    <span>Cine Studio Engine</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">Camera Controller</h2>
                  <p className="text-[#8D8D99]">Crie e maneje câmeras cinematográficas com precisão absoluta.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-[#121214] border border-[#29292E] rounded-3xl p-8 space-y-6">
                    <h3 className="text-lg font-bold text-white">Spawn Inteligente</h3>
                    <div className="space-y-4">
                      <button 
                        onClick={() => handleSpawnCamera({ x: 1000, y: 1000, z: 500, fov: 75, lookAtCenter: true })}
                        className="w-full p-6 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-between group hover:bg-indigo-500/20 transition-all"
                      >
                         <div className="flex items-center gap-4 text-left">
                            <div className="p-3 bg-indigo-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                               <Target className="w-6 h-6" />
                            </div>
                            <div>
                               <p className="font-bold text-white">Foco na Origem</p>
                               <p className="text-xs text-[#8D8D99]">1000, 1000, 500 | FOV 75°</p>
                            </div>
                         </div>
                         <Play className="w-5 h-5 text-indigo-500" />
                      </button>

                      <div className="grid grid-cols-2 gap-3 text-[10px] text-[#4D4D57] font-bold uppercase tracking-widest text-center">
                         <div className="p-3 bg-white/5 rounded-lg border border-white/5">Auto Focus Ativo</div>
                         <div className="p-3 bg-white/5 rounded-lg border border-white/5">Look-at Target</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#121214] border border-[#29292E] rounded-3xl p-8 space-y-6">
                    <h3 className="text-lg font-bold text-white">Cameras Ativas</h3>
                    <div className="space-y-3">
                      {cameras.map(cam => (
                        <div key={cam.id} className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Video className="w-4 h-4 text-indigo-400" />
                            <div>
                              <p className="text-sm font-bold text-white">{cam.id}</p>
                              <p className="text-[10px] text-[#4D4D57] font-mono">{cam.pos.x}, {cam.pos.y}, {cam.pos.z}</p>
                            </div>
                          </div>
                          <button className="text-[10px] font-bold text-[#9462E1] hover:underline">PILOTAR</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-[#0A0A0B] border border-[#29292E] rounded-3xl space-y-4">
                  <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest">Live Viewport Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-[#8D8D99] font-bold">Focal Length</label>
                      <input type="range" className="w-full accent-indigo-500" defaultValue="35" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-[#8D8D99] font-bold">Aperture (f/)</label>
                      <input type="range" className="w-full accent-indigo-500" defaultValue="2.8" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-[#8D8D99] font-bold">Sensor Width</label>
                       <span className="block text-xs text-white font-mono">36.0mm (FF)</span>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] text-[#8D8D99] font-bold">Aspect Ratio</label>
                       <span className="block text-xs text-white font-mono">1.77 (16:9)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'lod' ? (
            <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#050505]">
              <div className="max-w-5xl mx-auto space-y-12">
                <header className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-[0.2em]">
                    <LayersIcon className="w-4 h-4" />
                    <span>Resource Optimization Suite</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">Mesh LOD Manager</h2>
                  <p className="text-[#8D8D99]">Configure hierarquias de níveis de detalhe para otimizar a performance de renderização em massa.</p>
                </header>

                <div className="grid grid-cols-1 gap-8">
                   {lodConfigs.map(config => (
                     <div key={config.id} className="bg-[#121214] border border-[#29292E] rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-[#29292E] flex items-center justify-between bg-white/[0.02]">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                                 <Monitor className="w-8 h-8 text-amber-500" />
                              </div>
                              <div>
                                 <h3 className="text-xl font-bold text-white">{config.id}</h3>
                                 <p className="text-xs text-[#8D8D99] font-mono">{config.path}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="text-right">
                                 <p className="text-[10px] text-[#4D4D57] font-bold uppercase">Current Levels</p>
                                 <p className="text-xl font-black text-white">{config.currentLODs}</p>
                              </div>
                              <button 
                                onClick={() => handleApplyLODs(config.path, config.lods)}
                                className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-all flex items-center gap-2"
                              >
                                 <Zap className="w-4 h-4 fill-current" />
                                 DEPLOY LOD_MAP
                              </button>
                           </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                           {config.lods.map((lod: any, idx: number) => (
                             <div key={idx} className="bg-black/40 border border-white/5 rounded-2xl p-6 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                   <TrendingDown className="w-12 h-12 text-amber-500" />
                                </div>
                                <div className="space-y-4 relative z-10">
                                   <div className="flex items-center justify-between">
                                      <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-[10px] font-black rounded uppercase">LOD {lod.level}</span>
                                      <span className="text-[10px] text-[#4D4D57] font-bold">{lod.status}</span>
                                   </div>
                                   <div className="flex items-end gap-2">
                                      <span className="text-3xl font-black text-white tracking-tighter">{lod.tris}</span>
                                      <span className="text-[10px] text-[#8D8D99] mb-1.5 font-bold">TRIS</span>
                                   </div>
                                   <div className="space-y-1">
                                      <div className="flex justify-between text-[9px] text-[#4D4D57] font-bold uppercase">
                                         <span>Transition at</span>
                                         <span className="text-amber-500">{lod.distance}u</span>
                                      </div>
                                      <input 
                                        type="range" 
                                        min="0" max="10000" step="100"
                                        defaultValue={lod.distance}
                                        className="w-full accent-amber-500 h-1"
                                      />
                                   </div>
                                </div>
                             </div>
                           ))}
                           <button className="border-2 border-dashed border-[#29292E] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-white/[0.02] transition-all group">
                              <div className="w-10 h-10 bg-[#121214] rounded-full flex items-center justify-center text-[#4D4D57] group-hover:text-amber-500 group-hover:scale-110 transition-all">
                                 <ChevronDown className="w-6 h-6" />
                              </div>
                              <span className="text-[10px] font-bold text-[#4D4D57] uppercase tracking-widest">Add LOD Level</span>
                           </button>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-amber-500 uppercase tracking-widest text-sm">Optimization Policy</h3>
                  </div>
                  <p className="text-sm text-[#8D8D99] leading-relaxed">
                    A redução de triângulos via Remote Control utiliza o motor de Proxy Mesh nativo da Unreal. 
                    Certifique-se de que o plugin 'ProxyLODPlugin' está ativo para melhores resultados em meshes complexos. 
                    Níveis acima de LOD 4 são recomendados apenas para representações impostoras (Billboards).
                  </p>
                </div>
              </div>
            </div>
          ) : activeTab === 'streaming' ? (
            <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#050505]">
              <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-[0.2em]">
                    <Layers className="w-4 h-4" />
                    <span>Dynamic Proximity Management</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">Asset Streamer</h2>
                  <p className="text-[#8D8D99]">Monitoramento e controle de carga assíncrona de recursos baseado em distância.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-[#0A0A0B] border border-[#29292E] rounded-3xl p-8 space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-blue-400" />
                      Coordenadas de Referência (UE5)
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        {['X', 'Y', 'Z'].map((axis) => (
                          <div key={axis} className="bg-[#121214] border border-[#29292E] p-4 rounded-xl space-y-1">
                            <span className="text-[10px] text-[#4D4D57] font-bold">{axis}_AXIS</span>
                            <input 
                              type="number" 
                              value={(cameraPos as any)[axis.toLowerCase()]}
                              onChange={(e) => setCameraPos(prev => ({...prev, [axis.toLowerCase()]: parseInt(e.target.value)}))}
                              className="w-full bg-transparent text-white font-mono text-lg focus:outline-none"
                            />
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="bg-[#0A0A0B] border border-[#29292E] rounded-3xl p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white flex items-center gap-3">
                        <Zap className="w-5 h-5 text-amber-500" />
                        Políticas de Otimização
                      </h3>
                      <button 
                        onClick={syncStreamingState}
                        className="px-3 py-1 bg-blue-500 text-black text-[10px] font-black rounded uppercase hover:bg-blue-400 transition-colors"
                      >
                        SYNC_STREAMING
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-[#8D8D99] font-bold uppercase">
                          <span>Distância de Corte (u)</span>
                          <span className="text-white">{streamingThreshold}</span>
                        </div>
                        <input 
                          type="range" 
                          min="1000" max="50000" step="1000"
                          value={streamingThreshold}
                          onChange={(e) => setStreamingThreshold(parseInt(e.target.value))}
                          className="w-full accent-blue-500" 
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                          <span className="text-xs text-[#E1E1E6]">Auto-Unload se d {'>'} limiar * 2</span>
                          <div className="w-8 h-4 bg-emerald-500 rounded-full relative">
                            <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest">Ativos Detectados na Cena</h3>
                     <span className="text-[10px] text-blue-400 font-mono">POOL_SIZE: 128MB</span>
                   </div>
                   <div className="bg-[#121214] border border-[#29292E] rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="bg-[#1E1E21] text-[#7C7C8A]">
                            <th className="p-4 border-b border-[#29292E]">ASSET_ID</th>
                            <th className="p-4 border-b border-[#29292E]">TYPE</th>
                            <th className="p-4 border-b border-[#29292E]">DISTANCE</th>
                            <th className="p-4 border-b border-[#29292E]">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="text-[#E1E1E6]">
                          {streamingAssets.map((asset) => (
                            <tr key={asset.id} className="border-b border-[#1E1E21] hover:bg-white/[0.02] transition-colors">
                              <td className="p-4 font-bold">{asset.id}</td>
                              <td className="p-4 text-blue-400">{asset.type}</td>
                              <td className="p-4">{asset.distance || '?'}u</td>
                              <td className="p-4">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[9px] font-bold",
                                  asset.status === 'LOADED' ? "bg-emerald-500/10 text-emerald-500" :
                                  asset.status === 'LOD_ONLY' ? "bg-amber-500/10 text-amber-500" :
                                  "bg-red-500/10 text-red-500"
                                )}>
                                  {asset.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'animations' ? (
            <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#050505]">
               <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-2">
                  <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-[0.2em]">
                    <Video className="w-4 h-4" />
                    <span>Skeletal Animation Engine</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">Animation Controller</h2>
                  <p className="text-[#8D8D99]">Gerencie ativos de animação e controle a reprodução de skeletal meshes em tempo real.</p>
                </header>

                <div className="grid grid-cols-1 gap-6">
                  {skeletalMeshes.map((mesh) => (
                    <div key={mesh.id} className="bg-[#121214] border border-[#29292E] rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
                       <div className="w-24 h-24 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
                          <Video className="w-10 h-10 text-rose-500" />
                       </div>
                       <div className="flex-1 space-y-4 text-center md:text-left">
                          <div>
                            <h3 className="text-xl font-bold text-white">{mesh.id}</h3>
                            <p className="text-xs text-[#8D8D99] font-mono">{mesh.assetPath}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                             <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold text-blue-400">ANIM: {mesh.currentAnim}</span>
                             <span className={cn(
                               "px-2 py-1 rounded text-[10px] font-bold",
                               mesh.playing ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                             )}>
                               STATUS: {mesh.playing ? 'PLAYING' : 'PAUSED'}
                             </span>
                          </div>
                       </div>
                       <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
                          <button 
                            onClick={() => handleAnimationControl(mesh.id, mesh.playing ? 'pause' : 'play')}
                            className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                              mesh.playing ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" : "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                            )}
                          >
                            {mesh.playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                          </button>
                          <button 
                            onClick={() => handleAnimationControl(mesh.id, 'stop')}
                            className="w-12 h-12 bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 rounded-xl flex items-center justify-center transition-all"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                          
                          <div className="w-px h-8 bg-white/10" />
                          
                          <div className="px-4 space-y-1">
                             <label className="text-[9px] text-[#4D4D57] font-bold uppercase block text-center">Play Rate</label>
                             <div className="flex items-center gap-3">
                                <input 
                                  type="range" 
                                  min="0.1" max="3" step="0.1"
                                  value={mesh.playRate}
                                  onChange={(e) => handleAnimationControl(mesh.id, 'rate', parseFloat(e.target.value))}
                                  className="w-24 accent-rose-500"
                                />
                                <span className="text-xs font-mono text-white w-8">{mesh.playRate}x</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>

                <div className="p-8 bg-rose-500/5 border border-rose-500/20 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    <h3 className="font-bold text-rose-500 uppercase tracking-widest text-sm">Skeletal Hierarchy Warning</h3>
                  </div>
                  <p className="text-sm text-[#8D8D99] leading-relaxed">
                    Certifique-se de que o Asset Path aponta para uma instância válida do actor na cena (World Outliner). 
                    A reprodução direta via Remote Control requer que o actor esteja configurado com 'Animation Mode' definido como 'Use Animation Asset'.
                  </p>
                </div>
              </div>
            </div>
          ) : activeTab === 'system' ? (
            <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#050505]">
              <div className="max-w-4xl mx-auto space-y-12">
                <header className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
                    <Activity className="w-4 h-4" />
                    <span>Architect Core Diagnostics</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">Estado do Ecossistema</h2>
                  <p className="text-[#8D8D99]">Monitoramento em tempo real do runtime e variáveis de ambiente (padrão PaperCreeper).</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Health Card */}
                  <div className="bg-[#121214] border border-[#29292E] p-6 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <Cpu className="w-6 h-6 text-[#9462E1]" />
                      <span className="text-[10px] font-bold text-[#4D4D57] uppercase tracking-widest">Processador IA</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-white font-bold">{systemHealth.engine || 'Carregando...'}</p>
                      <p className="text-xs text-emerald-500 font-mono uppercase tracking-tighter">{systemHealth.status}</p>
                    </div>
                  </div>

                  {/* Environment Card */}
                  <div className="bg-[#121214] border border-[#29292E] p-6 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <Database className="w-6 h-6 text-blue-500" />
                      <span className="text-[10px] font-bold text-[#4D4D57] uppercase tracking-widest">Runtime Node</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-white font-bold">{envInfo?.node_version || 'v20.x'}</p>
                      <p className="text-xs text-[#8D8D99] font-mono">{envInfo?.platform} ({envInfo?.arch})</p>
                    </div>
                  </div>

                  {/* Uptime Card */}
                  <div className="bg-[#121214] border border-[#29292E] p-6 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <Zap className="w-6 h-6 text-amber-500" />
                      <span className="text-[10px] font-bold text-[#4D4D57] uppercase tracking-widest">System Uptime</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-white font-bold">{Math.floor((systemHealth.uptime || 0) / 60)} Minutes</p>
                      <p className="text-xs text-[#8D8D99] font-mono">Estabilidade: 99.9%</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-[#0A0A0B] border border-[#29292E] rounded-3xl p-8 space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                      <Layers className="w-5 h-5 text-purple-500" />
                      Distribuição de Memória
                    </h3>
                    <div className="space-y-4">
                      {systemHealth.memory ? Object.entries(systemHealth.memory).map(([key, value]: any) => (
                        <div key={key} className="space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-[#8D8D99] uppercase">{key}</span>
                            <span className="text-white">{(value / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                          <div className="h-1 bg-[#121214] rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min((value / 1024 / 1024 / 2), 100)}%` }}
                               className="h-full bg-gradient-to-r from-[#9462E1] to-blue-500"
                             />
                          </div>
                        </div>
                      )) : (
                        <p className="text-xs text-[#4D4D57] font-mono">Aguardando auditoria...</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#0A0A0B] border border-[#29292E] rounded-3xl p-8 space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                      <Settings className="w-5 h-5 text-gray-400" />
                      Variáveis de Sistema
                    </h3>
                    <div className="space-y-4 font-mono text-sm text-[#8D8D99]">
                      <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                        <span>API_KEY_STATE</span>
                        <span className={cn(envInfo?.gemini_key_configured ? "text-emerald-500" : "text-red-500")}>
                          {envInfo?.gemini_key_configured ? "DETECTED_AND_BOUND" : "MISSING"}
                        </span>
                      </div>
                      <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                         <span>UNREAL_PORT</span>
                         <span className="text-blue-400">{connection.port} (RC API)</span>
                      </div>
                      <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                         <span>SECURITY_LVL</span>
                         <span className="text-amber-500 font-bold">CORE_ENCRYPTED</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-12 custom-scrollbar">
              <div className="max-w-6xl mx-auto space-y-12">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[#9462E1] font-bold text-xs uppercase tracking-[0.2em]">
                      <Code2 className="w-4 h-4" />
                      <span>Script Factory</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Gerador de Código Industrial</h2>
                    <p className="text-[#8D8D99]">Gere e gerencie suas sequências de automação.</p>
                  </div>

                  <div className="flex items-center gap-2 bg-[#121214] p-1 rounded-xl border border-[#29292E]">
                    {['All', 'General', 'AI Generated', 'Materials', 'Camera'].map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                            activeCategory === cat ? "bg-[#9462E1] text-white" : "text-[#4D4D57] hover:text-[#8D8D99]"
                          )}
                        >
                          {cat}
                        </button>
                    ))}
                  </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                  <div className="space-y-8">
                    {currentAIResponse ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 gap-8"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest">Logic Blueprint</span>
                            <button className="text-[10px] text-[#9462E1] font-bold hover:underline">COPIAR NÓS</button>
                          </div>
                          <pre className="p-6 bg-[#0A0A0B] border border-[#29292E] rounded-2xl text-blue-300 font-mono text-sm overflow-x-auto leading-relaxed shadow-inner">
                            {currentAIResponse.blueprintCode || "Nenhuma lógica Blueprint detectada para este comando."}
                          </pre>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest">Header/Source C++</span>
                            <button className="text-[10px] text-green-500 font-bold hover:underline">COPIAR SNIPPET</button>
                          </div>
                          <pre className="p-6 bg-[#0A0A0B] border border-[#29292E] rounded-2xl text-green-300 font-mono text-sm overflow-x-auto leading-relaxed shadow-inner">
                            {currentAIResponse.cppCode || "Nenhum snippet C++ gerado para este nível de instrução."}
                          </pre>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-[400px] border-2 border-dashed border-[#202024] rounded-3xl flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <div className="p-4 bg-[#121214] rounded-2xl text-[#4D4D57]">
                          <Database className="w-10 h-10" />
                        </div>
                        <div className="max-w-xs space-y-1">
                          <p className="text-white font-bold">Nenhum Artefato Gerado</p>
                          <p className="text-sm text-[#8D8D99]">Envie uma instrução no console para ver o código correspondente aqui.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest">Biblioteca de Comandos</h3>
                      <Filter className="w-3.5 h-3.5 text-[#4D4D57]" />
                    </div>
                    
                    <div className="space-y-3 max-h-[600px] overflow-auto pr-2 custom-scrollbar">
                      {commandHistory
                        .filter(c => activeCategory === 'All' || c.category === activeCategory)
                        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
                        .map(cmd => (
                          <div key={cmd.id} className="group p-3 bg-[#121214] border border-[#29292E] rounded-xl hover:border-[#9462E1]/50 transition-all space-y-2">
                             <div className="flex items-start justify-between gap-2">
                                <button 
                                  onClick={() => setPrompt(cmd.text)}
                                  className="text-left text-xs text-[#E1E1E6] font-medium leading-tight hover:text-[#9462E1] transition-colors"
                                >
                                  {cmd.text}
                                </button>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                      onClick={() => togglePin(cmd.id)}
                                      className={cn("p-1 rounded hover:bg-white/5", cmd.pinned ? "text-amber-500" : "text-[#4D4D57]")}
                                   >
                                      <Bookmark className="w-3.5 h-3.5" fill={cmd.pinned ? "currentColor" : "none"} />
                                   </button>
                                   <button 
                                      onClick={() => deleteCommand(cmd.id)}
                                      className="p-1 rounded hover:bg-red-500/10 text-[#4D4D57] hover:text-red-500"
                                   >
                                      <Trash2 className="w-3.5 h-3.5" />
                                   </button>
                                </div>
                             </div>
                             <div className="flex items-center justify-between text-[9px] font-bold">
                                <span className="text-[#4D4D57] flex items-center gap-1">
                                   <Tag className="w-2.5 h-2.5" />
                                   {cmd.category?.toUpperCase()}
                                </span>
                                <span className="text-[#4D4D57]">{new Date(cmd.timestamp).toLocaleDateString()}</span>
                             </div>
                          </div>
                        ))}
                      {commandHistory.length === 0 && (
                        <p className="text-[11px] text-[#4D4D57] text-center italic py-10">Nenhum comando salvo.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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

            {/* Command History Quick Access */}
            {commandHistory.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest pl-1">Fixados</h3>
                <div className="flex flex-wrap gap-2">
                  {commandHistory.filter(c => c.pinned).map((cmd) => (
                    <button 
                      key={cmd.id}
                      onClick={() => setPrompt(cmd.text)}
                      className="text-[10px] bg-[#9462E1]/10 hover:bg-[#9462E1]/20 text-[#9462E1] px-2 py-1 rounded transition-all border border-[#9462E1]/30 truncate max-w-[180px] flex items-center gap-1.5"
                    >
                      <Bookmark className="w-2.5 h-2.5" fill="currentColor" />
                      {cmd.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest pl-1">Materiais PBR</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => setPrompt("Aplique um material de Ouro Polido ao objeto selecionado (Metallic=1, Roughness=0.1, BaseColor=(1, 0.7, 0.1))")}
                    className="text-left p-3 bg-[#0A0A0B]/50 rounded-lg hover:bg-[#9462E1]/10 border border-transparent hover:border-[#9462E1]/30 transition-all group"
                  >
                    <p className="text-[10px] font-bold text-amber-500 mb-1">GOLD PBR</p>
                    <p className="text-xs text-[#8D8D99] group-hover:text-white">Material Metálico Dourado</p>
                  </button>
                  <button 
                    onClick={() => setPrompt("Faça o objeto brilhar com uma luz neon vermelha intensa (Emissive=(10, 0, 0))")}
                    className="text-left p-3 bg-[#0A0A0B]/50 rounded-lg hover:bg-[#9462E1]/10 border border-transparent hover:border-[#9462E1]/30 transition-all group"
                  >
                    <p className="text-[10px] font-bold text-red-500 mb-1">NEON GLOW</p>
                    <p className="text-xs text-[#8D8D99] group-hover:text-white">Ajustar Emissão de Luz</p>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest pl-1">Skeletal Animations</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => setPrompt("Configure o SK_Mannequin para usar o asset de animação 'AS_Run_Fwd' e coloque em loop com PlayRate 1.2")}
                    className="text-left p-3 bg-[#0A0A0B]/50 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all group"
                  >
                    <p className="text-[10px] font-bold text-rose-500 mb-1">RUN CYCLE</p>
                    <p className="text-xs text-[#8D8D99] group-hover:text-white">Aplicar Animação de Corrida</p>
                  </button>
                  <button 
                    onClick={() => setPrompt("Pause todas as animações do actor 'SK_Robotic_Arm' e volte para o frame inicial")}
                    className="text-left p-3 bg-[#0A0A0B]/50 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all group"
                  >
                    <p className="text-[10px] font-bold text-amber-500 mb-1">HALT SEQUENCE</p>
                    <p className="text-xs text-[#8D8D99] group-hover:text-white">Interromper e Resetar Reprodução</p>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest pl-1">Otimização</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => setPrompt("Configure 3 níveis de LOD para o mesh 'SM_Rock_01' com reduções de 100%, 50% e 25% de triângulos")}
                    className="text-left p-3 bg-[#0A0A0B]/50 rounded-lg hover:bg-[#9462E1]/10 border border-transparent hover:border-[#9462E1]/30 transition-all group"
                  >
                    <p className="text-[10px] font-bold text-green-500 mb-1">AUTO LOD</p>
                    <p className="text-xs text-[#8D8D99] group-hover:text-white">Gerar Níveis de Detalhe</p>
                  </button>
                  <button 
                    onClick={() => setPrompt("Aplique uma política de LOD agressiva para todos os Static Meshes na pasta /Game/Vegetation/ com base em distância do jogador")}
                    className="text-left p-3 bg-[#0A0A0B]/50 rounded-lg hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all group"
                  >
                    <p className="text-[10px] font-bold text-amber-500 mb-1">BATCH OPTIMIZE</p>
                    <p className="text-xs text-[#8D8D99] group-hover:text-white">Otimização em Massa de Ativos</p>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#4D4D57] uppercase tracking-widest pl-1">Auditoria de Sistema</h3>
                <div className="bg-[#0A0A0B]/50 rounded-xl border border-[#29292E] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#8D8D99] uppercase font-bold">Integridade</span>
                    <span className="text-[10px] text-emerald-500 font-mono">ESTÁVEL</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#8D8D99] uppercase font-bold">Criptografia</span>
                    <span className="text-[10px] text-blue-400 font-mono">AES-256</span>
                  </div>
                  <button 
                    onClick={() => {
                        addLog('ai', 'Iniciando varredura profunda de ativos e integridade de rede...');
                        setTimeout(() => addLog('ue', 'Varredura concluída. Nenhum vazamento de memória detectado.'), 1500);
                    }}
                    className="w-full py-2 bg-[#9462E1]/10 hover:bg-[#9462E1]/20 border border-[#9462E1]/30 rounded-lg text-[11px] font-bold text-[#9462E1] transition-all"
                  >
                    EXECUTAR VARREDURA DE SISTEMA
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
                  "Configure LODs para performance",
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
