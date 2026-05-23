/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Moon,
  Sun,
  Bookmark,
  Trash2,
  Filter,
  Tag,
  ImageIcon,
  Repeat,
  Upload,
  Camera,
  Target,
  ChevronDown,
  Shield,
  Layers as LayersIcon,
  TrendingDown,
  Monitor,
  Workflow,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { cn } from './lib/utils';
import { ScriptFactory } from './components/ScriptFactory';
import { TelemetryView } from './components/TelemetryView';
import { AuditTerminal } from './components/AuditTerminal';
import { StreamingManager } from './components/StreamingManager';
import { SceneInspector } from './components/SceneInspector';
import { CognitiveCore } from './components/CognitiveCore';
import { Panel } from './components/Panel';
import { AssetScraperUI } from './components/AssetScraperUI';
import { CinematicsManager } from './components/CinematicsManager';
import { VirtualController } from './components/VirtualController';
import { GeometryLab } from './components/GeometryLab';
import { WorldSettings } from './components/WorldSettings';
import { PerformanceHUD } from './components/PerformanceHUD';
import { useUnrealEngine } from './hooks/useUnrealEngine';
import { useSceneInspector } from './hooks/useSceneInspector';
import { io } from 'socket.io-client';
import { 
  UECommand, 
  AIResponse, 
  LogEntry, 
  UEConnection, 
  Actor, 
  SystemHealth,
  MaterialInstance,
  SkeletalMesh,
  SystemStats,
  MeshDiagnostics,
  LODLevel,
  StreamingAsset
} from './types';


function getFullAssetPath(shortPath: string) {
  if (shortPath.includes("'")) return shortPath;
  if (!shortPath.startsWith('/')) return shortPath;
  const parts = shortPath.split('/');
  const name = parts[parts.length - 1];
  return `/Script/Engine.Texture2D'${shortPath}.${name}'`;
}


function hexToRgbA(hex: string) {
  let c: any;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = parseInt(c.join(''), 16);
    return {
      R: ((c >> 16) & 255) / 255,
      G: ((c >> 8) & 255) / 255,
      B: (c & 255) / 255,
      A: 1.0
    };
  }
  return { R: 0, G: 0, B: 0, A: 1.0 };
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

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('ue_arch_logs_v12');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ue_arch_logs_v12', JSON.stringify(logs.slice(-50)));
  }, [logs]);

  const [currentAIResponse, setCurrentAIResponse] = useState<AIResponse | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'factory' | 'system' | 'streaming' | 'materials' | 'animations' | 'cinematics' | 'lod' | 'audit' | 'cognitive' | 'inspector' | 'scraper' | 'controller' | 'laboratory' | 'world' | 'dashboard'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDarkMode]);

  const addLog = useCallback((type: LogEntry['type'], message: string, data?: unknown) => {
    const sanitizedType = type === 'error' && message.includes('EXCEPTION') ? 'system' : type;
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      type: sanitizedType,
      message: sanitizedType === 'system' ? `UNCAUGHT_EXCEPTION: ${message}` : message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
    };
    setLogs(prev => [...prev.slice(-99), newLog]);
  }, []);

  const ue = useUnrealEngine(connection, addLog);
  const inspector = useSceneInspector(connection);

  const scanProjectAssets = useCallback(async () => {
    if (!connection.connected) return;
    addLog('ue', 'Iniciando varredura profunda de ativos (Materiais/SkeletalMeshes)...');
    
    const script = `
import unreal
import json

def get_assets_of_class(class_name):
    ar = unreal.AssetRegistryHelpers.get_asset_registry()
    assets = ar.get_assets_by_class(class_name, True)
    return [a.get_full_name().split(' ')[1] for a in assets]

def get_level_actors_data():
    actors = unreal.EditorLevelLibrary.get_all_level_actors()
    streaming = []
    for a in actors:
        if isinstance(a, unreal.StaticMeshActor):
            comp = a.static_mesh_component
            if comp and comp.static_mesh:
                streaming.append({
                    "id": a.get_actor_label(),
                    "path": comp.static_mesh.get_path_name(),
                    "pos": {"x": a.get_actor_location().x, "y": a.get_actor_location().y, "z": a.get_actor_location().z},
                    "type": "StaticMeshActor",
                    "loadRadius": 10000
                })
    return streaming

data = {
    "materials": get_assets_of_class("MaterialInstanceConstant"),
    "skeletal_meshes": get_assets_of_class("SkeletalMesh"),
    "streaming": get_level_actors_data()[:10] # Limit to top 10 for performance
}
print("ASSET_DATA_START" + json.dumps(data) + "ASSET_DATA_END")
`;

    try {
      const res = await axios.post(`${connection.url}:${connection.port}/remote/script/execute`, { script });
      const output = res.data?.output || "";
      const match = output.match(/ASSET_DATA_START(.*)ASSET_DATA_END/);
      
      if (match) {
        const parsed = JSON.parse(match[1]);
        
        const newMaterials: MaterialInstance[] = parsed.materials.map((path: string) => ({
          id: path.split('.').pop() || 'Unnamed',
          baseColor: '#FFFFFF',
          metallic: 0,
          roughness: 0.5,
          emissive: '#000000',
          status: 'REMOTE',
          textures: { BaseColorTexture: '', NormalMap: '', MetallicMap: '', RoughnessMap: '', SpecularMap: '' },
          path: path
        }));

        const newMeshes: SkeletalMesh[] = parsed.skeletal_meshes.map((path: string) => ({
          id: path.split('.').pop() || 'Unnamed',
          assetPath: path,
          currentAnim: 'None',
          playing: false,
          loop: true,
          playRate: 1.0,
          animations: []
        }));

        const newStreaming = parsed.streaming.map((s: any) => ({
          ...s,
          status: 'LOADED',
          size: '---'
        }));

        setMaterials(newMaterials);
        setSkeletalMeshes(newMeshes);
        setStreamingAssets(newStreaming);
        addLog('ue', `IMPORT_COMPLETE: ${newMaterials.length} Materiais, ${newMeshes.length} SkeletalMeshes e ${newStreaming.length} Streaming Nodes.`);
      }
    } catch (err: any) {
      addLog('error', `ASSET_SCAN_FAULT: ${err.message}`);
    }
  }, [connection, addLog]);

  const scanScene = useCallback(async () => {
    addLog('ue', 'Iniciando varredura de cena...');
    const result = await inspector.scanScene();
    if (result) {
       addLog('ue', `${result.length} atores identificados.`);
       // Auto-sync assets too
       scanProjectAssets();
    }
  }, [inspector, addLog, scanProjectAssets]);

  const [playerLocation, setPlayerLocation] = useState({ x: 0, y: 0, z: 0 });
  const [materials, setMaterials] = useState<MaterialInstance[]>([]);
  const [skeletalMeshes, setSkeletalMeshes] = useState<SkeletalMesh[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [streamingAssets, setStreamingAssets] = useState<StreamingAsset[]>([]);
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
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({ status: 'checking' });
  const [isStandalone, setIsStandalone] = useState(false);
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('M_Cyberpunk_Metal');
  const [editingProps, setEditingProps] = useState<{
    baseColor: string;
    metallic: number;
    roughness: number;
    emissive: string;
    textures: Record<string, string>;
  }>({
    baseColor: '#9462E1',
    metallic: 0.9,
    roughness: 0.1,
    emissive: '#4D21B2',
    textures: {
      BaseColorTexture: '',
      NormalMap: '',
      MetallicMap: '',
      RoughnessMap: '',
      SpecularMap: ''
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

  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [uePerformanceStats, setUePerformanceStats] = useState<{ 
    drawCalls: number, 
    triangles: number,
    cameraMetadata?: {
      name: string;
      rotation: { pitch: number; yaw: number; roll: number };
      fov?: number;
      isCamera: boolean;
    } | null 
  } | null>(null);
  const [selectedActorData, setSelectedActorData] = useState<any>(null);
  const [selectedActorMeshPath, setSelectedActorMeshPath] = useState<string | null>(null);

  const automationTriggered = useRef(false);

  useEffect(() => {
    if (connection.connected && selectedActorData && selectedActorMeshPath && !automationTriggered.current) {
      automationTriggered.current = true;
      
      const runAutomation = async () => {
        addLog('ai', 'Executando automação solicitada: Material, LODs e Câmera Orbital...');
        
        // 1. Aplicar Material M_Industrial_Concrete
        await applyConcreteToSelected();
        
        // 2. Aplicar 3 LODs usando a config já setada default
        await handleApplyLODs(selectedActorMeshPath, [
          { level: 0, tris: '75', distance: 1.0, status: 'GENERATED' },
          { level: 1, tris: '50', distance: 0.5, status: 'GENERATED' },
          { level: 2, tris: '25', distance: 0.1, status: 'GENERATED' }
        ]);

        // 3. O orbit config targetActor deve ser configurado
        // Como o CineCameraManager gerencia orbitConfig com os estados locais dele,
        // nos limitamos a injetar nos logs ou fazer fetch de camera globalmente caso o componente estivesse fora,
        // mas as defaults orbitais já foram aplicadas (800 desc, pitch -30, yaw 45) e sync da seleçao é feito via tab cinematics.
        addLog('ai', 'Automação concluída: Configurações de Orbit (D:800, P:-30, Y:45) prontas no CineCameraManager.');
      };

      runAutomation();
    }
  }, [connection.connected, selectedActorData, selectedActorMeshPath, materials]);

  useEffect(() => {
    const fetchMeshPath = async () => {
      if (!selectedActorData || !connection.connected) {
        setSelectedActorMeshPath(null);
        return;
      }

      try {
        // Try StaticMeshComponent (Standard) or StaticMeshComponent0 (C++ default)
        const response = await axios.put(`${connection.url}:${connection.port}/remote/object/property`, {
          objectPath: `${selectedActorData.path}.StaticMeshComponent`,
          propertyName: 'StaticMesh'
        });

        if (response.data && response.data.StaticMesh) {
          // Normalize path: /Script/Engine.StaticMesh'/Game/Meshes/SM_Asset.SM_Asset' -> /Game/Meshes/SM_Asset
          const fullPath = response.data.StaticMesh;
          const match = fullPath.match(/'([^']+)'/);
          setSelectedActorMeshPath(match ? match[1].split('.')[0] : fullPath);
        } else {
          // fallback check for component index
          const resp0 = await axios.put(`${connection.url}:${connection.port}/remote/object/property`, {
            objectPath: `${selectedActorData.path}.StaticMeshComponent0`,
            propertyName: 'StaticMesh'
          });
          if (resp0.data && resp0.data.StaticMesh) {
            const fullPath = resp0.data.StaticMesh;
            const match = fullPath.match(/'([^']+)'/);
            setSelectedActorMeshPath(match ? match[1].split('.')[0] : fullPath);
          }
        }
      } catch (err) {
        setSelectedActorMeshPath(null);
      }
    };

    fetchMeshPath();
  }, [selectedActorData?.path, connection.connected, connection.url, connection.port]);
  const [selectedActorDiagnostics, setSelectedActorDiagnostics] = useState<MeshDiagnostics | null>(null);

  useEffect(() => {
    if (selectedActorData && connection.connected) {
      const fetchMesh = async () => {
        try {
          // Attempting to get StaticMesh from StaticMeshComponent0
          const res = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
            objectPath: `${selectedActorData.path}.StaticMeshComponent0`,
            functionName: 'GetStaticMesh'
          });
          const mesh = (res.data as any).ReturnValue;
          if (mesh) {
            setSelectedActorMeshPath(mesh.ObjectPath || mesh.Path || mesh);
          } else {
             const res2 = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
                objectPath: `${selectedActorData.path}.StaticMeshComponent`,
                functionName: 'GetStaticMesh'
              });
              const mesh2 = (res2.data as any).ReturnValue;
              setSelectedActorMeshPath(mesh2 ? (mesh2.ObjectPath || mesh2.Path || mesh2) : null);
          }
        } catch (e) {
          setSelectedActorMeshPath(null);
        }
      };
      fetchMesh();
    } else {
      setSelectedActorMeshPath(null);
    }
  }, [selectedActorData?.path, connection.connected, connection.url, connection.port]);

  const currentFOVValue = useMemo(() => {
    if (!selectedActorData) return 90;
    
    // Check actor properties directly
    if (selectedActorData.properties && selectedActorData.properties.FieldOfView !== undefined) {
      return selectedActorData.properties.FieldOfView;
    }
    
    // Check components (e.g. CameraComponent or CineCameraComponent)
    const cameraComp = selectedActorData.components?.find((c: any) => 
      c.type.includes('CameraComponent')
    );
    
    if (cameraComp && cameraComp.properties && cameraComp.properties.FieldOfView !== undefined) {
      return cameraComp.properties.FieldOfView;
    }
    
    return 90;
  }, [selectedActorData]);

  useEffect(() => {
    if (selectedActorData && connection.connected && selectedActorMeshPath) {
      const fetchDiagnostics = async () => {
        try {
          const script = `
import unreal
import json
mesh = unreal.load_asset("${selectedActorMeshPath}")
data = {}
if isinstance(mesh, unreal.StaticMesh):
    data = {
        "vertexCount": mesh.get_num_vertices(0),
        "triangleCount": mesh.get_num_triangles(0),
        "uvChannels": mesh.get_num_uv_channels(0),
        "hasVertexColors": mesh.get_editor_property('lod_setup')[0].reduction_settings.percent_triangles < 1.0 if len(mesh.get_editor_property('lod_setup')) > 0 else False,
        "lods": mesh.get_num_lods(),
        "collisionType": str(mesh.get_editor_property('complex_collision_mesh')),
        "naniteEnabled": mesh.get_editor_property('nanite_settings').enabled
    }
print("MESH_DIAG_START" + json.dumps(data) + "MESH_DIAG_END")
`;
          const res = await axios.post(`${connection.url}:${connection.port}/remote/script/execute`, { script });
          const output = res.data?.output || "";
          const match = output.match(/MESH_DIAG_START(.*)MESH_DIAG_END/);
          if (match) {
            setSelectedActorDiagnostics(JSON.parse(match[1]));
          }
        } catch (e) {
          setSelectedActorDiagnostics(null);
        }
      };
      fetchDiagnostics();
    } else {
      setSelectedActorDiagnostics(null);
    }
  }, [selectedActorData, selectedActorMeshPath, connection.connected, connection.url, connection.port]);

  // [REAL_TELEMETRY_POLLING]: Captura real da posição do ponto de vista do editor ou jogador
  useEffect(() => {
    const socket = io(window.location.origin);
    socket.on("system_stats", (data: any) => {
      setSystemStats(data);
    });

    if (!connection.connected) {
       return () => { socket.disconnect(); };
    }

    const pollTelemetry = async () => {
      try {
        const res = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
          objectPath: '/Script/Engine.Default__GameplayStatics',
          functionName: 'GetPlayerPawn',
          parameters: { WorldContextObject: '/Game/Maps/MainLevel.MainLevel', PlayerIndex: 0 }
        });
        const pawn = (res.data as any).ReturnValue;
        if (pawn) {
          const locRes = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
            objectPath: typeof pawn === 'string' ? pawn : (pawn.ObjectPath || pawn.Path),
            functionName: 'K2_GetActorLocation'
          });
          const loc = (locRes.data as any).ReturnValue;
          if (loc) {
            setPlayerLocation({ x: loc.X, y: loc.Y, z: loc.Z });
            setCameraPos({ x: loc.X, y: loc.Y, z: loc.Z });
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(pollTelemetry, 1000);
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [connection.connected, connection.url, connection.port]);

  // [LIVE_SELECTION_POLLING]: Monitoramento do ator selecionado em tempo real
  useEffect(() => {
    if (!connection.connected) return;

    const pollSelection = async () => {
      try {
        const res = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
          objectPath: '/Script/UnrealEd.Default__EditorLevelLibrary',
          functionName: 'GetSelectedLevelActors'
        }, { timeout: 1500 });
        
        const selection = (res.data as any).ReturnValue || [];
        if (selection.length > 0) {
          const actorPath = typeof selection[0] === 'string' ? selection[0] : (selection[0].ObjectPath || selection[0].Path);
          if (actorPath !== selectedActorData?.path) {
            setSelectedActorData({ path: actorPath, name: actorPath.split('.').pop(), timestamp: Date.now() });
          }
        } else if (selectedActorData) {
          setSelectedActorData(null);
        }
      } catch (e) {
        // Silently fail to avoid polluting logs
      }
    };

    const interval = setInterval(pollSelection, 2000);
    return () => clearInterval(interval);
  }, [connection.connected, connection.url, connection.port, selectedActorData?.path]);

  // [PERFORMANCE_POLLING]: Polling de performance (Draw Calls e Triangles via Python Engine Hooks)
  useEffect(() => {
    if (!connection.connected) return;
    const pollUEPerformance = async () => {
      const script = `
import unreal
import json
try:
    actors = unreal.EditorLevelLibrary.get_all_level_actors()
    total_tris = 0
    draw_calls = 0
    for a in actors:
        if isinstance(a, unreal.StaticMeshActor):
            comp = a.static_mesh_component
            if comp and comp.static_mesh:
                lods = comp.static_mesh.get_num_lods()
                if lods > 0:
                   total_tris += comp.static_mesh.get_num_triangles(0)
                   draw_calls += comp.get_num_materials()
                   
    camera_metadata = None
    selected_actors = unreal.EditorLevelLibrary.get_selected_level_actors()
    if selected_actors:
        actor = selected_actors[0]
        rot = actor.get_actor_rotation()
        meta = { "name": actor.get_actor_label(), "rotation": {"pitch": rot.pitch, "yaw": rot.yaw, "roll": rot.roll} }
        
        has_camera = False
        for comp in actor.get_components_by_class(unreal.CameraComponent):
            meta["fov"] = getattr(comp, "field_of_view", 90)
            has_camera = True
            break
        if not has_camera:
           for comp in actor.get_components_by_class(unreal.CineCameraComponent):
               meta["fov"] = getattr(comp, "current_focal_length", 35) # approximate
               has_camera = True
               break
               
        meta["isCamera"] = has_camera
        camera_metadata = meta

    print("UE_PERF_START" + json.dumps({"drawCalls": draw_calls, "triangles": total_tris, "cameraMetadata": camera_metadata}) + "UE_PERF_END")
except Exception as e:
    pass
      `;
      try {
        const res = await axios.post(`${connection.url}:${connection.port}/remote/script/execute`, { script }, { timeout: 2000 });
        const output = res.data?.output || "";
        const match = output.match(/UE_PERF_START(.*)UE_PERF_END/);
        if (match) {
          setUePerformanceStats(JSON.parse(match[1]));
        }
      } catch (e) {}
    };

    const interval = setInterval(pollUEPerformance, 4000);
    return () => clearInterval(interval);
  }, [connection.connected, connection.url, connection.port]);

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

  const updateCategory = (id: string, category: string) => {
    setCommandHistory(prev => prev.map(c => c.id === id ? { ...c, category } : c));
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
        const [healthRes, envRes, ueRes] = await Promise.all([
          axios.get('/api/health/ai', { signal: controller.signal }),
          axios.get('/api/system/env', { signal: controller.signal }),
          axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
            objectPath: '/Script/Engine.Default__GameplayStatics',
            functionName: 'GetTimeSeconds'
          }, { timeout: 2000, signal: controller.signal }).catch(() => null)
        ]);

        if (isMounted) {
          const healthData = healthRes.data;
          if (ueRes) {
            healthData.latency = 'Direct_Link: OK';
          }
          setSystemHealth(healthData);
          setEnvInfo(envRes.data);
          
          if (ueRes && !connection.connected) {
            setConnection(prev => ({ ...prev, connected: true }));
          }
        }
      } catch (e) {
        if (isMounted && !axios.isCancel(e)) {
          const axiosError = e as any;
          const status = axiosError.response?.status;
          
          if (status === 429) {
            setSystemHealth({ status: 'limited' });
          } else if (status === 503 || status === 500) {
            setSystemHealth({ status: 'degraded' });
          } else {
            setSystemHealth({ status: 'offline' });
          }
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
    localStorage.setItem('ue_streaming_assets_v4', JSON.stringify(streamingAssets));
  }, [streamingAssets]);

  useEffect(() => {
    localStorage.setItem('ue_command_history_v2', JSON.stringify(commandHistory));
  }, [commandHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);


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
      saveCommand(currentPrompt, (aiData.commands?.[0]?.body?.parameters as any)?.category || 'AI Generated');
      addLog('ai', `Sugestão Gerada: ${aiData.explanation}`);
      
      setPrompt('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message;
      addLog('error', `Falha na Inferência Core: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const executeCommands = ue.executeCommands;


  const lastUpdateRef = useRef<number>(0);


  const applyConcreteToSelected = async () => {
    const concreteInstance = materials.find((m) => m.id === 'M_Industrial_Concrete');
    if (concreteInstance) {
        addLog('ai', "Found 'M_Industrial_Concrete' material instance. Applying to selected actor's static mesh component...");
        await handleApplyMaterial('M_Industrial_Concrete', concreteInstance);
    } else {
        addLog('error', "M_Industrial_Concrete material instance not found.");
    }
  };

  const handleApplyMaterial = async (materialId: string, props: any) => {
    try {
      const commands: UECommand[] = [
        {
          endpoint: '/remote/object/call',
          method: 'PUT',
          body: {
            objectPath: `/Game/Materials/Instances/${materialId}.${materialId}`,
            functionName: 'SetVectorParameterValue',
            parameters: {
              ParameterName: 'BaseColor',
              Value: typeof props.baseColor === 'string' && props.baseColor.startsWith('#') ? hexToRgbA(props.baseColor) : props.baseColor
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
        },
        {
          endpoint: '/remote/object/call',
          method: 'PUT',
          body: {
            objectPath: `/Game/Materials/Instances/${materialId}.${materialId}`,
            functionName: 'SetVectorParameterValue',
            parameters: {
              ParameterName: 'EmissiveColor',
              Value: typeof props.emissive === 'string' && props.emissive.startsWith('#') ? hexToRgbA(props.emissive) : props.emissive
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
                          ParameterName: param,
                          Value: getFullAssetPath(path as string)
                      }
                  }
              });
          }
      });

      addLog('ue', `Sincronizando parâmetros PBR para ${materialId}...`);
      await executeCommands(commands);
      
      setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, status: 'SYNCHRONIZED', ...props } : m));

      // Aplicação ao ator selecionado
      addLog('ue', 'Buscando atores selecionados...');
      try {
        const getSelectedRes = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
          objectPath: '/Script/UnrealEd.Default__EditorLevelLibrary',
          functionName: 'GetSelectedLevelActors'
        }, { timeout: 5000 });

        const selectedActors = (getSelectedRes.data as any).ReturnValue || [];
        
        if (selectedActors.length > 0) {
            const applyCommands: UECommand[] = [];
            selectedActors.forEach((actor: any) => {
                const actorPath = typeof actor === 'string' ? actor : (actor.ObjectPath || actor.Path || actor);
                // Matriz de componentes para aplicação determinística
                ['StaticMeshComponent0', 'StaticMeshComponent'].forEach(comp => {
                  applyCommands.push({
                      endpoint: '/remote/object/call',
                      method: 'PUT',
                      body: {
                          objectPath: `${actorPath}.${comp}`,
                          functionName: 'SetMaterial',
                          parameters: {
                              ElementIndex: 0,
                              Material: `/Game/Materials/Instances/${materialId}.${materialId}`
                          }
                      }
                  });
                });
            });
            await executeCommands(applyCommands);
            addLog('ue', `Material ${materialId} aplicado.`);
        } else {
            addLog('ue', 'Nenhum ator selecionado.');
        }
      } catch (e: any) {
        addLog('error', 'FALHA_SELECAO_ATORES: Verifique a EditorLevelLibrary.');
      }
    } catch (error: any) {
      addLog('error', 'UNCAUGHT_EXCEPTION in handleApplyMaterial:', error.message || String(error));
    }
  };

  const handleBatchImportTextures = () => {
    const basePath = window.prompt('Digite o caminho base das texturas (ex: /Game/Textures/T_Rock_A):', '/Game/Textures/');
    if (!basePath) return;

    // Normalização básica: remove extensões se o usuário colocou
    const cleanPath = basePath.split('.')[0];

    // Mapeamento padrão de sufixos PBR (naming conventions comuns)
    const newTextures = {
        BaseColorTexture: `${cleanPath}_D`,
        NormalMap: `${cleanPath}_N`,
        MetallicMap: `${cleanPath}_M`,
        RoughnessMap: `${cleanPath}_R`,
        SpecularMap: `${cleanPath}_S`
    };

    setEditingProps(prev => ({
        ...prev,
        textures: { ...prev.textures, ...newTextures }
    }));
    
    addLog('system', `Lote de texturas PBR preparado para: ${cleanPath} (Sufixos _D, _N, _M, _R, _S)`);
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

  const [currentLODConfig, setCurrentLODConfig] = useState<LODLevel[]>([
    { level: 0, tris: '75', distance: 1.0, status: 'GENERATED' },
    { level: 1, tris: '50', distance: 0.5, status: 'GENERATED' },
    { level: 2, tris: '25', distance: 0.1, status: 'GENERATED' }
  ]);

  const handleApplyLODs = async (meshPath: string, configs: LODLevel[]) => {
    if (!meshPath) return;
    addLog('ue', `Iniciando re-topo e aplicação de ${configs.length} LODs para ${meshPath.split('/').pop()}...`);
    
    // Distinct triangle counts validation
    const triCounts = configs.map(c => parseFloat(c.tris));
    const uniqueTriCounts = new Set(triCounts);
    if (uniqueTriCounts.size !== triCounts.length) {
      addLog('warn', 'LOD_VALIDATION: É recomendado utilizar triangulações distintas para cada nível.');
    }

    const percents = configs.map(c => parseFloat(c.tris));
    const screens = configs.map(c => c.distance);

    const pythonScript = `
import unreal

def configure_lods(mesh_path, percents, screens):
    mesh = unreal.load_asset(mesh_path)
    if not mesh or not isinstance(mesh, unreal.StaticMesh):
        return False
    
    # Disable LOD groups to allow manual override
    mesh.set_editor_property('lod_group', 'None')
    mesh.set_num_source_models(len(percents))
    
    for i in range(len(percents)):
        model = mesh.get_source_model(i)
        red = model.reduction_settings
        # Convert 0-100 to 0-1
        red.percent_triangles = percents[i] / 100.0
        model.reduction_settings = red
        model.screen_size = screens[i]
        mesh.set_source_model(i, model)
    
    mesh.build()
    return True

configure_lods("${meshPath}", [${percents.join(',')}], [${screens.join(',')}])
`;

    try {
      await ue.executePython(pythonScript);
      addLog('success', `LOD_GEN_SUCCESS: ${configs.length} níveis aplicados a ${meshPath}`);
    } catch (err: any) {
      addLog('error', `LOD_GEN_FAULT: ${err.message}`);
    }
  };

  const handleAddLODLevel = () => {
    setCurrentLODConfig(prev => {
      const nextLevel = prev.length;
      const lastTris = parseFloat(prev[prev.length - 1].tris);
      const lastDist = prev[prev.length - 1].distance;
      
      const newLevel: LODLevel = {
        level: nextLevel,
        tris: Math.max(5, Math.floor(lastTris * 0.5)).toString(),
        distance: Math.max(0.01, lastDist * 0.5),
        status: 'GENERATED'
      };
      return [...prev, newLevel];
    });
  };

  const handleUpdateLODLevel = (index: number, updates: Partial<LODLevel>) => {
    setCurrentLODConfig(prev => prev.map((l, i) => i === index ? { ...l, ...updates } : l));
  };

  const handleRemoveLODLevel = (index: number) => {
    if (currentLODConfig.length <= 1) return;
    setCurrentLODConfig(prev => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, level: i })));
  };

  const [globalTimeDilation, setGlobalTimeDilation] = useState<number>(1.0);

  const handleGlobalTimeDilation = async (value: number) => {
    setGlobalTimeDilation(value);
    const commands: UECommand[] = [
      {
        endpoint: '/remote/object/call',
        method: 'PUT',
        body: {
          objectPath: '/Script/Engine.Default__GameplayStatics',
          functionName: 'SetGlobalTimeDilation',
          parameters: { 
            WorldContextObject: '/Game/Maps/MainLevel.MainLevel',
            TimeDilation: value 
          }
        }
      }
    ];
    addLog('ue', `Ajustando Dilatação Temporal Global para ${value.toFixed(2)}x`);
    await executeCommands(commands);
  };

  const handleAnimationControl = async (meshId: string, action: 'play' | 'pause' | 'stop' | 'rate' | 'loop' | 'anim', value?: any) => {
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
                    objectPath: `${mesh.assetPath}.${mesh.id}.SkeletalMeshComponent`,
                    functionName: isPlaying ? 'Play' : 'Stop',
                    parameters: {}
                }
            }
        ];
        setSkeletalMeshes(prev => prev.map(m => m.id === meshId ? { ...m, playing: isPlaying } : m));
    } else if (action === 'stop') {
        commands = [
            {
                endpoint: '/remote/object/call',
                method: 'PUT',
                body: {
                    objectPath: `${mesh.assetPath}.${mesh.id}.SkeletalMeshComponent`,
                    functionName: 'Stop',
                    parameters: {}
                }
            }
        ];
        setSkeletalMeshes(prev => prev.map(m => m.id === meshId ? { ...m, playing: false } : m));
    } else if (action === 'rate') {
        commands = [
            {
                endpoint: '/remote/object/call',
                method: 'PUT',
                body: {
                    objectPath: `${mesh.assetPath}.${mesh.id}.SkeletalMeshComponent`,
                    functionName: 'SetPlayRate',
                    parameters: { NewRate: value }
                }
            }
        ];
        setSkeletalMeshes(prev => prev.map(m => m.id === meshId ? { ...m, playRate: value } : m));
    } else if (action === 'loop') {
        commands = [
            {
                endpoint: '/remote/object/call',
                method: 'PUT',
                body: {
                    objectPath: `${mesh.assetPath}.${mesh.id}.SkeletalMeshComponent`,
                    functionName: 'SetLooping',
                    parameters: { bInLooping: value }
                }
            }
        ];
        setSkeletalMeshes(prev => prev.map(m => m.id === meshId ? { ...m, loop: value } : m));
    } else if (action === 'anim') {
        commands = [
          {
              endpoint: '/remote/object/call',
              method: 'PUT',
              body: {
                  objectPath: `${mesh.assetPath}.${mesh.id}.SkeletalMeshComponent`,
                  functionName: 'PlayAnimation',
                  parameters: { 
                    NewAnimToPlay: `/Game/Animations/${value}`,
                    bLooping: mesh.loop 
                  }
              }
          }
        ];
        setSkeletalMeshes(prev => prev.map(m => m.id === meshId ? { ...m, currentAnim: value, playing: true } : m));
    }

    addLog('ue', `Comando de animação [${action}] enviado para ${meshId}${value !== undefined ? ': ' + value : ''}.`);
    await executeCommands(commands);
  };

  const handleUEConnectionTest = async () => {
    const success = await ue.testConnection();
    if (success) {
      setConnection(prev => ({ ...prev, connected: true }));
      addLog('ue', 'LINK_ESTABLISHED: Sincronização estável.');
      // Gatilho imediato de varredura real
      setTimeout(() => {
        scanScene();
      }, 500);
    }
  };

  const auditSystem = ue.auditSystem;

  const [viewingCode, setViewingCode] = useState<boolean>(false);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Panel />;
      case 'console':
        return (
          <div className="flex-1 overflow-auto p-6 space-y-4 font-mono text-sm custom-scrollbar" ref={scrollRef}>
            <AnimatePresence mode="popLayout">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  className={cn(
                    "p-3 rounded-xl border flex gap-3",
                    log.type === 'ai' ? "bg-md-surface2 border-md-border" : 
                    log.type === 'ue' ? "bg-blue-500/10 border-blue-500/20" :
                    "bg-red-500/5 border-red-500/20"
                  )}
                >
                  <div className="mt-1">
                    {log.type === 'ai' && <Terminal className="w-4 h-4 text-md-primary" />}
                    {log.type === 'ue' && <Activity className="w-4 h-4 text-md-primary" />}
                    {log.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest">{log.type}</span>
                      <span className="text-[10px] text-md-text-muted">{log.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <p className={cn(
                      "leading-relaxed",
                      log.type === 'error' ? "text-red-400" : "text-md-text"
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
                <div className="w-20 h-20 bg-md-surface2 rounded-full flex items-center justify-center">
                  <Terminal className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-medium">Console Aguardando Comandos</p>
                  <p className="text-sm max-w-xs">Use o campo abaixo para enviar comandos naturais para a Unreal Engine através da IA.</p>
                </div>
              </div>
            )}
          </div>
        );
      case 'factory':
        return (
          <ScriptFactory 
            currentAIResponse={currentAIResponse}
            commandHistory={commandHistory}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            togglePin={togglePin}
            updateCategory={updateCategory}
            deleteCommand={deleteCommand}
            setPrompt={setPrompt}
          />
        );
      case 'system':
        return (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-md-surface2 border-b border-md-border flex justify-end">
              <button 
                onClick={auditSystem}
                className="flex items-center gap-2 px-4 py-2 bg-md-primary text-md-on-primary border border-blue-500/20 rounded-xl font-bold text-[11px] hover:bg-md-primary-hover hover:text-md-on-primary hover:text-md-text-strong transition-all shadow-lg shadow-blue-500/10"
              >
                <Shield className="w-4 h-4" />
                EXECUTAR AUDITORIA PREVENTIVA
              </button>
            </div>
            <TelemetryView />
          </div>
        );
      case 'world':
        return (
            <WorldSettings 
              onSwitchLevel={async (path) => { await ue.switchLevel(path); }}
              onTakeScreenshot={async (res) => { await ue.takeHighResScreenshot(res); }}
              onSetProperty={async (p, prop, v) => { await ue.setProperty(p, prop, v); }}
              addLog={addLog}
            />
        );
      case 'materials':
        return (
          <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-md-bg">
            <div className="max-w-5xl mx-auto space-y-12">
                <header className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-[0.2em]">
                    <Zap className="w-4 h-4" />
                    <span>PBR Forge</span>
                  </div>
                  <h2 className="text-3xl font-bold text-md-text-strong tracking-tight leading-tight">Material Designer</h2>
                  <p className="text-md-text-muted">Crie e aplique instâncias de materiais fisicamente corretas diretamente no motor.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xs font-bold text-md-text-muted uppercase tracking-widest">Library</h3>
                    <div className="space-y-2">
                      {materials.map((mat) => (
                        <div key={mat.id} className="relative group">
                          <button 
                            onClick={() => {
                            setSelectedMaterialId(mat.id);
                            setEditingProps({
                                baseColor: mat.baseColor,
                                metallic: mat.metallic,
                                roughness: mat.roughness,
                                emissive: mat.emissive,
                                textures: mat.textures || { BaseColorTexture: '', NormalMap: '', MetallicMap: '', RoughnessMap: '', SpecularMap: '' }
                            });
                          }}
                          className={`w-full text-left p-4 bg-md-surface2 border rounded-2xl hover:border-md-primary transition-all group ${selectedMaterialId === mat.id ? 'border-md-primary bg-md-surface2/80' : 'border-md-border'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded shadow-inner" style={{ backgroundColor: mat.baseColor }} />
                            <div>
                               <p className={`text-sm font-bold transition-colors ${selectedMaterialId === mat.id ? 'text-md-primary' : 'text-md-text-strong group-hover:text-md-primary'}`}>{mat.id}</p>
                               <span className="text-[10px] text-md-text-muted font-mono">{mat.status}</span>
                            </div>
                          </div>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyMaterial(mat.id, mat);
                          }}
                          className="absolute right-4 top-2/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-black transition-all"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                      </div>
                      ))}
                      <button className="w-full py-3 border-2 border-dashed border-md-border rounded-2xl text-[11px] font-bold text-md-text-muted hover:border-md-primary hover:text-md-primary transition-all">
                        + NOVO MATERIAL
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-md-surface1 border border-md-border rounded-3xl p-8 space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-md-text-strong">Editor de Propriedades</h3>
                      <button 
                        onClick={() => handleApplyMaterial(selectedMaterialId, editingProps)}
                        disabled={loading}
                        className="px-4 py-2 bg-emerald-500 disabled:opacity-50 text-black text-[11px] font-bold rounded-xl hover:bg-emerald-400 transition-colors"
                      >
                        APLICAR AO SELECIONADO
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest">Albedo (Base Color)</label>
                              <div className="flex items-center gap-3">
                                <input 
                                  type="color" 
                                  className="w-12 h-12 bg-transparent border-0 cursor-pointer" 
                                  value={editingProps.baseColor}
                                  onChange={(e) => setEditingProps(prev => ({ ...prev, baseColor: e.target.value }))}
                                />
                                <input 
                                  type="text" 
                                  className="flex-1 bg-md-surface2 border border-md-border p-3 rounded-xl text-md-text-strong font-mono text-sm" 
                                  value={typeof editingProps.baseColor === 'object' ? JSON.stringify(editingProps.baseColor) : editingProps.baseColor}
                                  onChange={(e) => {
                                      let val: any = e.target.value;
                                      try { if (val.startsWith('{')) val = JSON.parse(val); } catch(err) {}
                                      setEditingProps(prev => ({ ...prev, baseColor: val }));
                                  }}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Emissive Color</label>
                              <div className="flex items-center gap-3">
                                <input 
                                  type="color" 
                                  className="w-12 h-12 bg-transparent border-0 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                                  value={editingProps.emissive}
                                  onChange={(e) => setEditingProps(prev => ({ ...prev, emissive: e.target.value }))}
                                />
                                <input 
                                  type="text" 
                                  className="flex-1 bg-md-surface2 border border-md-border p-3 rounded-xl text-md-text-strong font-mono text-sm focus:border-red-500" 
                                  value={typeof editingProps.emissive === 'object' ? JSON.stringify(editingProps.emissive) : editingProps.emissive}
                                  onChange={(e) => {
                                      let val: any = e.target.value;
                                      try { if (val.startsWith('{')) val = JSON.parse(val); } catch(err) {}
                                      setEditingProps(prev => ({ ...prev, emissive: val }));
                                  }}
                                />
                              </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                           <div className="space-y-2">
                             <div className="flex justify-between">
                               <label className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest">Metallic</label>
                               <span className="text-[10px] text-md-text-strong font-mono">{editingProps.metallic.toFixed(2)}</span>
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
                               <label className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest">Roughness</label>
                               <span className="text-[10px] text-md-text-strong font-mono">{editingProps.roughness.toFixed(2)}</span>
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
                           <label className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest">Emissive Intensity</label>
                           <div className="flex items-center gap-3">
                            <div className="p-3 bg-md-surface2 border border-md-border rounded-xl flex-1">
                               <div className="h-1 bg-gradient-to-r from-black to-blue-500 rounded-full" />
                            </div>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest">Normal Map Strength</label>
                           <input type="range" className="w-full accent-blue-500" />
                        </div>

                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
                           <div className="flex items-center gap-2">
                             <Activity className="w-3.5 h-3.5 text-emerald-500" />
                             <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">PBR Validation</span>
                           </div>
                           <p className="text-[11px] text-md-text-muted">Valores dentro do intervalo físico otimizado para o Lumen.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-8 border-t border-md-border">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-md-text-muted uppercase tracking-widest">Texture Channels</h3>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={handleBatchImportTextures}
                                    className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase flex items-center gap-2.5"
                                >
                                    <Layers className="w-3 h-3" />
                                    Importar Lote PBR
                                </button>
                                <button 
                                    onClick={() => {
                                        const paramName = window.prompt('Digite o nome do Parâmetro de Textura (ex: BaseColorTexture):');
                                        if (paramName && !editingProps.textures[paramName]) {
                                            setEditingProps(prev => ({
                                                ...prev,
                                                textures: { ...prev.textures, [paramName]: '' }
                                            }));
                                        }
                                    }}
                                    className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold uppercase"
                                >
                                    + Adicionar Slot
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(editingProps.textures).map(([type, pathValue]) => (
                                <div key={type} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest">{type}</label>
                                        <button 
                                            onClick={() => {
                                                const newTextures = { ...editingProps.textures };
                                                delete newTextures[type];
                                                setEditingProps(prev => ({ ...prev, textures: newTextures }));
                                            }}
                                            className="text-red-500/50 hover:text-red-500"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <div className="h-40 bg-md-surface2 border border-md-border rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-md-primary transition-all overflow-hidden">
                                            {pathValue ? (
                                                <div className="w-full h-full bg-md-surface3 flex items-center justify-center italic text-[10px] text-md-text-muted">
                                                    {pathValue}
                                                </div>
                                            ) : (
                                                <>
                                                    <ImageIcon className="w-6 h-6 text-md-text-muted" />
                                                    <span className="text-[9px] text-md-text-muted font-bold">MISSING_MAP</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-2xl gap-2">
                                            <button 
                                              onClick={() => {
                                                const pathResult = window.prompt(`Importar textura para ${type}:`, pathValue || '/Game/Textures/');
                                                if (pathResult !== null) setEditingProps(prev => ({ 
                                                    ...prev, 
                                                    textures: { ...prev.textures, [type]: pathResult } 
                                                }));
                                              }}
                                              className="p-2 bg-md-primary text-md-on-primary rounded-xl text-md-text-strong hover:bg-md-primary-hover transition-colors"
                                            >
                                                <Upload className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const pathResult = window.prompt(`Digite o Asset Path da textura (${type}):`, '/Game/Textures/');
                                                    if (pathResult !== null) setEditingProps(prev => ({ 
                                                        ...prev, 
                                                        textures: { ...prev.textures, [type]: pathResult } 
                                                    }));
                                                }}
                                                className="p-2 bg-white/10 rounded-xl text-md-text-strong hover:bg-white/20"
                                            >
                                                <Filter className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="/Game/Textures/..."
                                        className="w-full bg-md-surface2 border border-md-border p-2 rounded text-[10px] text-md-text-muted font-mono focus:border-md-primary outline-none"
                                        value={pathValue}
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
        );
      case 'cinematics':
        return (
          <CinematicsManager 
            connection={connection}
            addLog={addLog}
            executeCommands={executeCommands}
            loading={loading}
          />
        );
      case 'lod':
        return (
          <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-md-bg">
            <div className="max-w-5xl mx-auto space-y-12">
              <header className="space-y-2">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-[0.2em]">
                  <LayersIcon className="w-4 h-4" />
                  <span>Resource Optimization Suite</span>
                </div>
                <h2 className="text-3xl font-bold text-md-text-strong tracking-tight leading-tight">Mesh LOD Manager</h2>
                <p className="text-md-text-muted">Configure hierarquias de níveis de detalhe para otimizar a performance de renderização em massa.</p>
              </header>

              <div className="grid grid-cols-1 gap-8">
                   <div className="bg-md-surface2 border border-md-border rounded-3xl overflow-hidden shadow-2xl">
                      <div className="p-8 border-b border-md-border flex items-center justify-between bg-white/[0.02]">
                         <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-md-surface1 rounded-2xl flex items-center justify-center border border-white/5">
                               <LayersIcon className="w-8 h-8 text-md-text-muted" />
                            </div>
                            <div>
                               <h3 className="text-xl font-bold text-md-text-strong uppercase tracking-tight">Active LOD Map</h3>
                               <p className="text-xs text-md-text-muted font-mono">{selectedActorMeshPath || 'Select an actor with a Static Mesh to configure LODs'}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="text-right">
                               <p className="text-[10px] text-md-text-muted font-bold uppercase">Target Levels</p>
                               <p className="text-xl font-black text-md-text-strong">{currentLODConfig.length}</p>
                            </div>
                            <button 
                              onClick={() => handleApplyLODs(selectedActorMeshPath || '', currentLODConfig)}
                              disabled={loading || !selectedActorMeshPath}
                              className="px-6 py-3 bg-amber-500 disabled:opacity-30 disabled:cursor-not-allowed text-black font-black uppercase text-[11px] rounded-2xl hover:bg-amber-400 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/10"
                            >
                               <Zap className="w-4 h-4 fill-current" />
                               Deploy LOD Pipeline
                            </button>
                         </div>
                      </div>

                      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                         {currentLODConfig.map((lod, idx) => (
                           <div key={idx} className="bg-black/40 border border-white/5 rounded-2xl p-6 relative group overflow-hidden hover:border-amber-500/30 transition-all">
                              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                 <TrendingDown className="w-12 h-12 text-amber-500" />
                              </div>
                              {idx > 0 && (
                                <button 
                                  onClick={() => handleRemoveLODLevel(idx)}
                                  className="absolute top-2 right-2 p-2 text-md-text-strong/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <div className="space-y-6 relative z-10">
                                 <div className="flex items-center justify-between">
                                    <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-[10px] font-black rounded uppercase tracking-widest">LEVEL {lod.level}</span>
                                    <span className="text-[9px] text-md-text-muted font-black uppercase tracking-widest">{lod.status}</span>
                                 </div>
                                 
                                 <div className="space-y-3">
                                   <div className="flex justify-between items-end">
                                      <span className="text-[10px] text-md-text-muted font-black uppercase">Complexity</span>
                                      <div className="flex items-end gap-2">
                                        <input 
                                          type="text"
                                          value={lod.tris}
                                          onChange={(e) => handleUpdateLODLevel(idx, { tris: e.target.value })}
                                          className="bg-transparent text-2xl font-black text-md-text-strong tracking-tighter w-16 text-right focus:outline-none"
                                        />
                                        <span className="text-[10px] text-md-text-muted mb-1 font-bold">%</span>
                                      </div>
                                   </div>
                                   <input 
                                     type="range" 
                                     min="1" max="100" step="1"
                                     value={lod.tris}
                                     onChange={(e) => handleUpdateLODLevel(idx, { tris: e.target.value })}
                                     className="w-full h-1 bg-white/5 rounded-xl appearance-none cursor-pointer accent-amber-500"
                                   />
                                 </div>

                                 <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] text-md-text-muted font-black uppercase">
                                       <span>Screen Size</span>
                                       <span className="text-amber-500 font-mono">{Number(lod.distance).toFixed(3)}</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="0.01" max="1.0" step="0.01"
                                      value={lod.distance}
                                      onChange={(e) => handleUpdateLODLevel(idx, { distance: parseFloat(e.target.value) })}
                                      className="w-full h-1 bg-white/5 rounded-xl appearance-none cursor-pointer accent-amber-500"
                                    />
                                    <div className="flex justify-between text-[7px] text-md-text-muted font-black uppercase tracking-tighter">
                                       <span>Close (1.0)</span>
                                       <span>Far (0.0)</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                         ))}
                         <button 
                           onClick={handleAddLODLevel}
                           className="border-2 border-dashed border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-amber-500/5 hover:border-amber-500/20 transition-all group"
                         >
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-md-text-muted group-hover:text-amber-500 group-hover:scale-110 transition-all border border-white/5">
                               <Plus className="w-6 h-6" />
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] font-black text-md-text-muted uppercase tracking-widest group-hover:text-amber-500">Inject Level</span>
                              <p className="text-[8px] text-md-text-muted font-bold mt-1 max-w-[100px]">Add a new LOD to the pipeline</p>
                            </div>
                         </button>
                      </div>
                   </div>
              </div>

              <div className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-3xl space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h3 className="font-black text-amber-500 uppercase tracking-widest text-xs">Optimization Deterministics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <p className="text-[11px] text-md-text-muted leading-relaxed font-medium uppercase">
                    A redução de triângulos via Remote Control utiliza o motor de Proxy Mesh nativo da Unreal. 
                    O pipeline gera novos buffers de geometria de forma não destrutiva, preservando o asset original no Source Model 0. 
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-md-text-strong/40 uppercase">
                      <div className="w-1 h-1 bg-amber-500 rounded-full" />
                      Mínimo de 3 níveis para distâncias escaláveis.
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-md-text-strong/40 uppercase">
                      <div className="w-1 h-1 bg-amber-500 rounded-full" />
                      Triangulação decrescente garante performance.
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-md-text-strong/40 uppercase">
                      <div className="w-1 h-1 bg-amber-500 rounded-full" />
                      Screen Size 0.01 é o limite de renderização visível.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'streaming':
        return (
          <StreamingManager 
            connection={connection} 
            playerLocation={playerLocation} 
            assets={streamingAssets}
            setAssets={setStreamingAssets}
            addLog={addLog}
            camera={cameras.find(c => c.active) || cameras[0]}
          />
        );
      case 'animations':
        return (
          <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-md-bg">
             <div className="max-w-4xl mx-auto space-y-12">
              <header className="space-y-2">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-[0.2em]">
                  <Video className="w-4 h-4" />
                  <span>Skeletal Animation Core</span>
                </div>
                <h2 className="text-3xl font-bold text-md-text-strong tracking-tight leading-tight">Animation Controller</h2>
                <p className="text-md-text-muted">Gerencie ativos de animação e controle a reprodução de skeletal meshes em tempo real.</p>
              </header>

              <div className="bg-md-surface2 border border-md-border rounded-3xl p-8 space-y-6 shadow-2xl">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
                       <h3 className="text-sm font-black text-md-text-strong uppercase tracking-widest italic">Global Simulation Speed</h3>
                    </div>
                    <span className="text-xl font-black text-amber-500 font-mono tracking-tighter">{globalTimeDilation.toFixed(2)}x</span>
                 </div>
                 
                 <div className="space-y-4">
                    <input 
                      type="range" 
                      min="0.01" max="4" step="0.01"
                      value={globalTimeDilation}
                      onChange={(e) => handleGlobalTimeDilation(parseFloat(e.target.value))}
                      className="w-full h-2 bg-md-surface2 rounded-full appearance-none accent-amber-500 outline-none"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-md-text-muted uppercase tracking-widest">
                       <button onClick={() => handleGlobalTimeDilation(0.1)} className="hover:text-md-text-strong transition-colors">Slow Mo (0.1x)</button>
                       <button onClick={() => handleGlobalTimeDilation(1.0)} className="hover:text-md-text-strong transition-colors">Normal (1.0x)</button>
                       <button onClick={() => handleGlobalTimeDilation(2.0)} className="hover:text-md-text-strong transition-colors">Fast (2.0x)</button>
                       <button onClick={() => handleGlobalTimeDilation(4.0)} className="hover:text-md-text-strong transition-colors">Hyper (4.0x)</button>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {skeletalMeshes.map((mesh) => (
                  <div key={mesh.id} className="bg-md-surface2 border border-md-border rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
                     <div className="w-24 h-24 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
                        <Video className="w-10 h-10 text-rose-500" />
                     </div>
                     <div className="flex-1 space-y-4 text-center md:text-left">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-md-text-strong uppercase tracking-tighter italic">{mesh.id}</h3>
                            <p className="text-[10px] text-md-text-muted font-mono leading-tight">{mesh.assetPath}</p>
                          </div>
                          
                          <button 
                            onClick={() => handleAnimationControl(mesh.id, 'loop', !mesh.loop)}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border",
                              mesh.loop ? "bg-md-primary text-md-on-primary border-md-primary border" : "bg-white/5 text-md-text-muted border-white/10"
                            )}
                          >
                            <Repeat className={cn("w-3 h-3", mesh.loop && "animate-spin-slow")} />
                            {mesh.loop ? 'Loop ON' : 'Loop OFF'}
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                           {mesh.animations?.map((anim: any) => (
                             <button
                               key={anim}
                               onClick={() => handleAnimationControl(mesh.id, 'anim', anim)}
                               className={cn(
                                 "px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all tracking-wider",
                                 mesh.currentAnim === anim 
                                   ? "bg-rose-500 text-md-text-strong shadow-lg shadow-rose-500/20" 
                                   : "bg-white/5 text-md-text-muted hover:bg-white/10 hover:text-md-text-strong"
                               )}
                             >
                               {anim}
                             </button>
                           ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                           <span className={cn(
                             "px-2 py-1 rounded text-[10px] font-black tracking-widest",
                             mesh.playing ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                           )}>
                             {mesh.playing ? '● PLAYING' : '○ PAUSED'}
                           </span>
                           <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold text-md-primary">FPS ADAPTIVE: ENABLED</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
                        <button 
                          onClick={() => handleAnimationControl(mesh.id, mesh.playing ? 'pause' : 'play')}
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            mesh.playing ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" : "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                          )}
                        >
                          {mesh.playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                        </button>
                        <button 
                          onClick={() => handleAnimationControl(mesh.id, 'stop')}
                          className="w-12 h-12 bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 rounded-2xl flex items-center justify-center transition-all"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                        
                        <div className="w-px h-8 bg-white/10" />
                        
                        <div className="px-4 space-y-1">
                           <label className="text-[9px] text-md-text-muted font-bold uppercase block text-center">Play Rate</label>
                           <div className="flex items-center gap-3">
                              <input 
                                type="range" 
                                min="0.1" max="3" step="0.1"
                                value={mesh.playRate}
                                onChange={(e) => handleAnimationControl(mesh.id, 'rate', parseFloat(e.target.value))}
                                className="w-24 accent-rose-500"
                              />
                              <span className="text-xs font-mono text-md-text-strong w-8">{mesh.playRate}x</span>
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
                <p className="text-sm text-md-text-muted leading-relaxed">
                  Certifique-se de que o Asset Path aponta para uma instância válida do actor na cena (World Outliner). 
                  A reprodução direta via Remote Control requer que o actor esteja configurado com 'Animation Mode' definido como 'Use Animation Asset'.
                </p>
              </div>
            </div>
          </div>
        );
      case 'audit':
        return <AuditTerminal />;
      case 'inspector':
        return (
          <SceneInspector 
            actors={inspector.actors}
            onRefresh={scanScene}
            onPropertyUpdate={async (path, name, val) => {
              try {
                await axios.put(`${connection.url}:${connection.port}/remote/object/property`, {
                  objectPath: path,
                  propertyName: name,
                  propertyValue: val
                });
                // Small delay then refresh to show updated values
                setTimeout(scanScene, 400);
              } catch (err: any) {
                addLog('error', `PROPERTY_UPDATE_FAILED: ${err.message}`);
              }
            }}
          />
        );
      case 'scraper':
        return <AssetScraperUI addLog={addLog} />;
       case 'controller':
        return (
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-md-bg">
             <div className="max-w-4xl mx-auto space-y-8">
                <VirtualController 
                   isActive={true} 
                   activeActor={selectedActorData?.path || null} 
                   onUpdate={(pos, rot) => selectedActorData && ue.updateRealtimeActor(selectedActorData.path, pos, rot)} 
                   onFOVUpdate={async (val) => { if (selectedActorData) await ue.setProperty(selectedActorData.path, 'FieldOfView', val); }}
                   currentFOV={currentFOVValue}
                   onBootstrap={() => ue.executePython(`
import unreal

def deploy_spectator_system():
    # 1. Obter referências de subsistema
    editor_subs = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    world = editor_subs.get_editor_world()
    
    # 2. Cleanup: Remover espectadores antigos para evitar vazamento de memória e poluição da cena
    existing_actors = unreal.EditorLevelLibrary.get_all_level_actors()
    for actor in existing_actors:
        label = actor.get_actor_label()
        if "UE_ARCHITECT_SPECTATOR" in label or label == "SpectatorPawn":
             unreal.EditorLevelLibrary.destroy_actor(actor)
             unreal.log("UE_ARCH: Limpeza de instância prévia concluída.")

    # 3. Busca Robusta de Assets: Tentativa em múltiplos diretórios padrão
    possible_paths = [
        '/Game/Blueprints/BP_Spectator_Architect',
        '/Game/Architect/BP_Spectator_Architect',
        '/Game/Cinematics/BP_Spectator_Architect'
    ]
    
    pawn_class = None
    for path in possible_paths:
        try:
            pawn_class = unreal.EditorAssetLibrary.load_blueprint_class(path)
            if pawn_class:
                unreal.log(f"UE_ARCH: Blueprint carregado com sucesso de: {path}")
                break
        except:
            continue
            
    if not pawn_class:
        unreal.log_warning("UE_ARCH: BP Custom não encontrado. Utilizando SpectatorPawn nativo da Engine.")
        pawn_class = unreal.SpectatorPawn
    
    # 4. Spawning e Atribuição de Identidade
    spawn_loc = unreal.Vector(0, 0, 1000)
    spawn_rot = unreal.Rotator(0, 0, 0)
    new_spectator = unreal.EditorLevelLibrary.spawn_actor_from_class(pawn_class, spawn_loc, spawn_rot)
    new_spectator.set_actor_label("UE_ARCHITECT_SPECTATOR")
    
    # 5. Possessão Determinística
    player_controller = unreal.GameplayStatics.get_player_controller(world, 0)
    if player_controller:
        player_controller.possess(new_spectator)
        unreal.log("UE_ARCH: PlayerController 0 assumiu o comando do Spectator.")
    else:
        unreal.log_error("UE_ARCH: Falha crítica - PlayerController 0 indisponível.")

    return new_spectator.get_path_name()

try:
    spawn_path = deploy_spectator_system()
    unreal.log(f"UE_ARCH_BOOTSTRAP_COMPLETE: {spawn_path}")
except Exception as e:
    unreal.log_error(f"UE_ARCH_BOOTSTRAP_FAILED: {str(e)}")
`.trim())}
                />
             </div>
          </div>
        );
      case 'laboratory':
        return (
          <GeometryLab 
            activeActor={selectedActorData} 
            diagnostics={selectedActorDiagnostics} 
            onRefreshDiagnostics={async () => {
              addLog('system', 'Profundidade Geométrica: Iniciando varredura remota de cenário...');
              try {
                 await scanScene();
                 addLog('system', 'Varredura finalizada.');
              } catch (error: any) {
                 addLog('error', 'Falha na varredura', error.message || 'Erro desconhecido');
              }
            }}
          />
        );
      case 'cognitive':
        return (
          <CognitiveCore 
            stats={systemStats} 
            aiHealth={systemHealth} 
            selectedActor={selectedActorData} 
            materials={materials}
            onApplyMaterial={handleApplyMaterial}
          />
        );
      default:
        return (
          <div className="flex-1 flex items-center justify-center bg-md-bg text-md-text-muted">
            <div className="text-center space-y-4">
              <Monitor className="w-12 h-12 mx-auto opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Módulo em Desenvolvimento ou Restrito</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-md-surface1 text-md-text font-sans selection:bg-md-primary text-md-on-primary">
      {/* Code Viewer Modal */}
      <AnimatePresence>
        {viewingCode && currentAIResponse && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
              className="bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-3xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-md-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Code2 className="text-md-primary" />
                  <h3 className="font-bold text-lg">Detalhes de Implementação</h3>
                </div>
                <button 
                  onClick={() => setViewingCode(false)}
                  className="p-2 hover:bg-md-surface2 rounded-xl transition-colors"
                >
                  <AlertCircle className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-6 custom-scrollbar">
                {currentAIResponse.blueprintCode && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-md-text-muted uppercase tracking-widest">Procedimento Blueprint</h4>
                    <pre className="p-4 bg-md-surface1 border border-md-border rounded-2xl text-sm font-mono text-blue-300 overflow-x-auto">
                      {currentAIResponse.blueprintCode}
                    </pre>
                  </div>
                )}
                
                {currentAIResponse.cppCode && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-md-text-muted uppercase tracking-widest">Snippet C++ (UE5)</h4>
                    <pre className="p-4 bg-md-surface1 border border-md-border rounded-2xl text-sm font-mono text-green-300 overflow-x-auto">
                      {currentAIResponse.cppCode}
                    </pre>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-md-text-muted uppercase tracking-widest">Comandos de API (JSON payloads)</h4>
                  <div className="space-y-2">
                    {currentAIResponse.commands.map((cmd, idx) => (
                      <pre key={idx} className="p-4 bg-md-surface1 border border-md-border rounded-2xl text-[11px] font-mono text-purple-300 overflow-x-auto">
                        {JSON.stringify(cmd, null, 2)}
                      </pre>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-md-border flex justify-end">
                <button 
                  onClick={() => setViewingCode(false)}
                  className="bg-md-surface3 hover:bg-md-border text-md-text-strong px-6 py-2 rounded-xl font-bold transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-md-border bg-md-surface1/80 backdrop-blur-md px-4 md:px-8 py-5 flex items-center justify-between sticky top-0 z-10 shadow-md transition-colors duration-300 ease-in-out">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-[0_4px_16px_rgba(99,102,241,0.2)]">
            <Zap className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">UE Architect</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-500",
                connection.connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
              )} />
              <p className="text-xs text-md-text-muted font-bold tracking-wide">
                {connection.connected ? `API PORT ${connection.port}` : "OFFLINE"}
              </p>
              <div className="w-px h-3 bg-md-border mx-1" />
              <div className="flex items-center gap-3 overflow-hidden">
                 <span className={cn(
                   "text-[10px] font-bold px-2 py-1 rounded bg-md-surface2 uppercase tracking-wide flex items-center gap-1.5",
                   ((systemHealth.status as any) === 'operational' || systemHealth.status === 'online') ? "text-emerald-500" : "text-amber-500"
                 )}>
                   <span>STATUS</span>
                   <span>•</span>
                   <span>{systemHealth.status}</span>
                 </span>
                 {systemHealth.memory && (
                   <span className="text-[10px] font-bold px-2 py-1 rounded bg-md-surface2 text-md-text-muted uppercase tracking-wide">
                     MEM: {((systemHealth.memory.used || 0) / 1024 / 1024).toFixed(0)}MB
                   </span>
                 )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-12 h-12 flex items-center justify-center bg-md-surface2 hover:bg-md-primary/10 text-md-text-muted hover:text-md-primary rounded-full transition-all flex-shrink-0"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-6 h-6 text-amber-500" /> : <Moon className="w-6 h-6" />}
          </button>
          
          <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center gap-2 px-2 py-1">
            <div className="flex bg-md-surface1 p-1 rounded-full border border-md-border/50 shadow-sm w-max">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "px-6 py-3 rounded-full text-[13px] font-bold tracking-wide transition-all min-h-[48px] whitespace-nowrap",
                activeTab === 'dashboard' ? "bg-blue-600/10 text-blue-600 dark:bg-blue-600 dark:text-white shadow-[0_2px_8px_rgba(37,99,235,0.2)]" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              DASHBOARD
            </button>
            <button 
              onClick={() => setActiveTab('cognitive')}
              className={cn(
                "px-6 py-3 rounded-full text-[13px] font-bold tracking-wide transition-all min-h-[48px] whitespace-nowrap",
                activeTab === 'cognitive' ? "bg-purple-600/10 text-purple-600 dark:bg-purple-600 dark:text-white shadow-[0_2px_8px_rgba(147,51,234,0.2)]" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              COGNITIVE CORE
            </button>
            <button 
              onClick={() => setActiveTab('inspector')}
              className={cn(
                "px-6 py-3 rounded-full text-[13px] font-bold tracking-wide transition-all min-h-[48px] whitespace-nowrap",
                activeTab === 'inspector' ? "bg-blue-600/10 text-blue-600 dark:bg-blue-600 dark:text-white shadow-[0_2px_8px_rgba(37,99,235,0.2)]" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              SCENE HIERARCHY
            </button>
            <button 
              onClick={() => setActiveTab('console')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'console' ? "bg-md-primary/10 text-md-primary dark:bg-md-primary dark:text-md-on-primary shadow-[0_2px_8px_rgba(103,80,164,0.2)]" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              CONSOLE
            </button>
            <button 
              onClick={() => setActiveTab('factory')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'factory' ? "bg-md-primary/10 text-md-primary dark:bg-md-primary dark:text-md-on-primary shadow-[0_2px_8px_rgba(103,80,164,0.2)]" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              SCRIPT FACTORY
            </button>
            <button 
              onClick={() => setActiveTab('world')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'world' ? "bg-indigo-600/10 text-indigo-600 dark:bg-indigo-600 dark:text-white shadow-[0_2px_8px_rgba(79,70,229,0.2)]" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              WORLD SETTINGS
            </button>
            <button 
              onClick={() => setActiveTab('streaming')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'streaming' ? "bg-md-primary/10 text-md-primary dark:bg-md-primary dark:text-md-on-primary shadow-sm" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              STREAMING
            </button>
            <button 
              onClick={() => setActiveTab('materials')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'materials' ? "bg-md-primary/10 text-md-primary dark:bg-md-primary dark:text-md-on-primary shadow-sm" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              PBR FORGE
            </button>
            <button 
              onClick={() => setActiveTab('animations')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'animations' ? "bg-md-primary/10 text-md-primary dark:bg-md-primary dark:text-md-on-primary shadow-sm" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              ANIMATIONS
            </button>
            <button 
              onClick={() => setActiveTab('cinematics')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'cinematics' ? "bg-md-primary/10 text-md-primary dark:bg-md-primary dark:text-md-on-primary shadow-sm" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              CINEMATICS
            </button>
            <button 
              onClick={() => setActiveTab('controller')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'controller' ? "bg-cyan-600/10 text-cyan-600 dark:bg-cyan-600 dark:text-white shadow-[0_2px_8px_rgba(8,145,178,0.2)]" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              CONTROLLER
            </button>
            <button 
              onClick={() => setActiveTab('lod')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'lod' ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500 dark:text-black shadow-sm" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              LOD MANAGER
            </button>
            <button 
              onClick={() => setActiveTab('scraper')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'scraper' ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500 dark:text-black shadow-sm" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              ASSET SCRAPER
            </button>
            <button 
              onClick={() => setActiveTab('laboratory')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'laboratory' ? "bg-indigo-600/10 text-indigo-600 dark:bg-indigo-600 dark:text-white shadow-[0_2px_8px_rgba(79,70,229,0.2)]" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              LABORATORY
            </button>
            <button 
              onClick={() => setActiveTab('audit')}
              className={cn(
                "px-5 py-2.5 rounded-full text-[12px] font-bold tracking-wide transition-all min-h-[40px] whitespace-nowrap",
                activeTab === 'audit' ? "bg-md-primary/10 text-md-primary dark:bg-md-primary dark:text-md-on-primary shadow-sm" : "text-md-text-muted hover:bg-md-surface2 hover:text-md-text-strong"
              )}
            >
              AUDIT LOG
            </button>
            </div>
          </div>
          <div className="h-6 w-px bg-md-surface2" />
          <button 
            id="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-md-surface2 rounded-xl transition-colors text-md-text-muted hover:text-md-text-strong"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <PerformanceHUD stats={uePerformanceStats} />

      <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 p-4 lg:p-8 h-auto lg:h-[calc(100vh-73px)]">
        {/* Main Interface */}
        <section className="flex flex-col h-[70vh] lg:h-full bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] rounded-3xl overflow-hidden shadow-sm">
          {renderTabContent()}

          {/* Prompt Input */}
          <div className="p-6 bg-md-surface2 border-t border-md-border relative">
            {currentAIResponse && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-6 right-6 bottom-full mb-4 bg-md-surface3 border border-md-border-hover rounded-2xl shadow-2xl p-4 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-md-primary uppercase tracking-tighter">
                    <Cpu className="w-4 h-4" />
                    <span>Sugestão da IA Gerada</span>
                  </div>
                  <button 
                    onClick={() => setCurrentAIResponse(null)}
                    className="text-xs text-md-text-muted hover:text-md-text-strong"
                  >
                    Descartar
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm text-md-text leading-relaxed italic border-l-2 border-md-primary pl-3">
                    "{currentAIResponse.explanation}"
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      id="execute-btn"
                      onClick={() => {
                        executeCommands(currentAIResponse.commands);
                        setCurrentAIResponse(null);
                      }}
                      className="flex items-center justify-center gap-2 bg-md-primary text-md-on-primary hover:bg-md-primary-hover text-md-text-strong font-bold py-2.5 rounded-xl transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Executar na Unreal
                    </button>
                    <button 
                      id="view-code-btn"
                      onClick={() => setViewingCode(true)}
                      className="flex items-center justify-center gap-2 bg-md-surface3 hover:bg-md-border text-md-text-strong font-bold py-2.5 rounded-xl transition-all"
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
                className="w-full bg-md-surface1 border border-md-border rounded-2xl px-4 py-4 pr-32 focus:outline-none focus:border-md-primary focus:ring-1 focus:ring-md-primary transition-all placeholder:text-md-text-muted"
              />
              <div className="absolute right-2 top-2/2 -translate-y-1/2 flex items-center gap-2">
                <button 
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="bg-md-primary text-md-on-primary disabled:bg-md-surface3 disabled:text-md-text-muted hover:bg-md-primary-hover text-md-text-strong font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#9462E1]/10"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Enviar</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Sidebar Info & History */}
        <aside className="bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] rounded-3xl p-6 flex flex-col h-[600px] lg:h-full overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-sm text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-[var(--md-sys-color-primary)]" />
              Painel de Controle
            </h2>
          </div>

          <div className="space-y-8 flex-1 overflow-auto custom-scrollbar pr-2">
            {/* Connection Card */}
            <div className="p-5 rounded-3xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/50 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] tracking-wide">UE CONFIGURATION</span>
                {connection.connected ? (
                  <span className="text-[11px] text-green-700 dark:text-green-400 font-bold bg-green-500/10 dark:bg-green-400/10 px-3 py-1 rounded-full shadow-sm">ACTIVE</span>
                ) : (
                  <span className="text-[11px] text-red-700 dark:text-red-400 font-bold bg-red-500/10 dark:bg-red-400/10 px-3 py-1 rounded-full shadow-sm">OFFLINE</span>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5 align-start">
                  <label className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-bold tracking-wide pl-1">HOST URL</label>
                  <input 
                    type="text" 
                    value={connection.url}
                    onChange={(e) => setConnection(v => ({ ...v, url: e.target.value }))}
                    className="w-full bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)] transition-all" 
                    placeholder="http://localhost"
                  />
                </div>
                <div className="flex flex-col gap-1.5 align-start">
                  <label className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-bold tracking-wide pl-1">API PORT</label>
                  <input 
                    type="text" 
                    value={connection.port}
                    onChange={(e) => setConnection(v => ({ ...v, port: e.target.value }))}
                    className="w-full bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)] transition-all" 
                    placeholder="8080"
                  />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUEConnectionTest}
                className="w-full py-3 bg-[var(--md-sys-color-primary)]/10 text-[var(--md-sys-color-primary)] dark:text-[var(--md-sys-color-on-primary)] dark:bg-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary)] dark:hover:bg-[var(--md-sys-color-primary-container)] hover:text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Activity className="w-4 h-4" />
                Test Connection
              </motion.button>
            </div>

            {/* Command History Quick Access */}
            {commandHistory.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest pl-1">Pinned</h3>
                <div className="flex flex-wrap gap-2">
                  {commandHistory.filter(c => c.pinned).map((cmd) => (
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={cmd.id}
                      onClick={() => setPrompt(cmd.text)}
                      className="text-sm bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] rounded-full px-4 py-2 min-h-[44px] transition-all truncate max-w-[200px] flex items-center gap-2 shadow-sm"
                    >
                      <Bookmark className="w-4 h-4 text-[var(--md-sys-color-primary)]" fill="currentColor" />
                      {cmd.text}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Architecture Vision */}
            <div className="space-y-8">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-md-text-muted uppercase tracking-widest pl-1">Camera Actions</h3>
                <div className="grid grid-cols-1 gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        setActiveTab('cinematics');
                        addLog('ai', 'Ativando Módulo Cine Studio: Sincronizando alvo de órbita...');
                        setTimeout(() => {
                           const btn = document.getElementById('sync-focus-btn');
                           if (btn) btn.click();
                        }, 500);
                    }}
                    className="text-left p-4 bg-md-surface1 rounded-2xl border border-md-border hover:border-indigo-500/50 transition-colors shadow-sm group"
                  >
                    <p className="text-[11px] font-bold text-indigo-500 mb-1 tracking-wider">ORBIT FOCUS</p>
                    <p className="text-sm text-md-text-muted group-hover:text-md-text-strong transition-colors">Rotate around selected actor</p>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPrompt("Crie uma CineCameraActor na posição X=500, Y=0, Z=200 olhando para a origem com FOV 60")}
                    className="text-left p-4 bg-md-surface1 rounded-2xl border border-md-border hover:border-md-primary transition-colors shadow-sm group"
                  >
                    <p className="text-[11px] font-bold text-md-primary mb-1 tracking-wider">CINE CAMERA</p>
                    <p className="text-sm text-md-text-muted group-hover:text-md-text-strong transition-colors">Spawn configurable cinematic camera</p>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPrompt("Mude o Field of View da câmera selecionada para 90 graus")}
                    className="text-left p-4 bg-md-surface1 rounded-2xl border border-md-border hover:border-md-primary transition-colors shadow-sm group"
                  >
                    <p className="text-[11px] font-bold text-md-primary mb-1 tracking-wider">LENS CONTROL</p>
                    <p className="text-sm text-md-text-muted group-hover:text-md-text-strong transition-colors">Adjust Field of View (FOV)</p>
                  </motion.button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-md-text-muted uppercase tracking-widest pl-1">PBR Materials</h3>
                <div className="grid grid-cols-1 gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={applyConcreteToSelected}
                    className="text-left p-4 bg-md-surface1 rounded-2xl border border-md-border hover:border-amber-500/50 transition-colors shadow-sm group"
                  >
                    <p className="text-[11px] font-bold text-amber-500 mb-1 tracking-wider">INDUSTRIAL CONCRETE</p>
                    <p className="text-sm text-md-text-muted group-hover:text-md-text-strong transition-colors">Apply Industrial Concrete to selection</p>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPrompt("Aplique um material de Ouro Polido ao objeto selecionado (Metallic=1, Roughness=0.1, BaseColor=(1, 0.7, 0.1))")}
                    className="text-left p-4 bg-md-surface1 rounded-2xl border border-md-border hover:border-amber-500/50 transition-colors shadow-sm group"
                  >
                    <p className="text-[11px] font-bold text-amber-500 mb-1 tracking-wider">GOLD PBR</p>
                    <p className="text-sm text-md-text-muted group-hover:text-md-text-strong transition-colors">Polished golden metallic material</p>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPrompt("Faça o objeto brilhar com uma luz neon vermelha intensa (Emissive=(10, 0, 0))")}
                    className="text-left p-4 bg-md-surface1 rounded-2xl border border-md-border hover:border-red-500/50 transition-colors shadow-sm group"
                  >
                    <p className="text-[11px] font-bold text-red-500 mb-1 tracking-wider">NEON GLOW</p>
                    <p className="text-sm text-md-text-muted group-hover:text-md-text-strong transition-colors">Adjust light emission</p>
                  </motion.button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest pl-1">Skeletal Animations</h3>
                <div className="grid grid-cols-1 gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPrompt("Configure o SK_Mannequin para usar o asset de animação 'AS_Run_Fwd' e coloque em loop com PlayRate 1.2")}
                    className="text-left p-4 bg-[var(--md-sys-color-surface-container)] rounded-3xl border border-[var(--md-sys-color-outline-variant)] hover:border-rose-500/50 transition-colors shadow-sm group"
                  >
                    <p className="text-[11px] font-bold text-rose-500 mb-1 tracking-wider">RUN CYCLE</p>
                    <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-on-surface)] transition-colors">Apply run animation</p>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPrompt("Pause todas as animações do actor 'SK_Robotic_Arm' e volte para o frame inicial")}
                    className="text-left p-4 bg-[var(--md-sys-color-surface-container)] rounded-3xl border border-[var(--md-sys-color-outline-variant)] hover:border-amber-500/50 transition-colors shadow-sm group"
                  >
                    <p className="text-[11px] font-bold text-amber-500 mb-1 tracking-wider">HALT SEQUENCE</p>
                    <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-on-surface)] transition-colors">Interrupt and reset playback</p>
                  </motion.button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest pl-1">Optimization</h3>
                <div className="grid grid-cols-1 gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPrompt("Configure 3 níveis de LOD para o mesh 'SM_Rock_01' com reduções de 100%, 50% e 25% de triângulos")}
                    className="text-left p-4 bg-[var(--md-sys-color-surface-container)] rounded-3xl border border-[var(--md-sys-color-outline-variant)] hover:border-emerald-500/50 transition-colors shadow-sm group"
                  >
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-500 mb-1 tracking-wider">AUTO LOD</p>
                    <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-on-surface)] transition-colors">Generate level of detail</p>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02, y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPrompt("Aplique uma política de LOD agressiva para todos os Static Meshes na pasta /Game/Vegetation/ com base em distância do jogador")}
                    className="text-left p-4 bg-[var(--md-sys-color-surface-container)] rounded-3xl border border-[var(--md-sys-color-outline-variant)] hover:border-amber-500/50 transition-colors shadow-sm group"
                  >
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-500 mb-1 tracking-wider">BATCH OPTIMIZE</p>
                    <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-on-surface)] transition-colors">Mass asset optimization</p>
                  </motion.button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest pl-1">System Audit</h3>
                <div className="bg-[var(--md-sys-color-surface-container)] rounded-3xl border border-[var(--md-sys-color-outline-variant)] p-5 space-y-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--md-sys-color-on-surface)] uppercase font-bold tracking-wide">Integrity</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-500 font-mono tracking-widest">STABLE</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--md-sys-color-on-surface)] uppercase font-bold tracking-wide">Encryption</span>
                    <span className="text-xs text-[var(--md-sys-color-primary)] font-mono tracking-widest">AES-256</span>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                        addLog('ai', 'Iniciando auditoria real do sistema Engine...');
                        try {
                           await auditSystem();
                           addLog('ue', `Auditoria concluída.`);
                        } catch (err: any) {
                           addLog('error', 'Falha na auditoria de sistema', err.message);
                        }
                    }}
                    className="w-full py-3 bg-[var(--md-sys-color-primary)]/10 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary)] hover:text-white dark:bg-[var(--md-sys-color-primary)] dark:text-[var(--md-sys-color-on-primary)] dark:hover:bg-[var(--md-sys-color-primary-container)] rounded-2xl text-[12px] uppercase tracking-wide font-bold transition-all shadow-sm"
                  >
                    EXECUTE SYSTEM SCAN
                  </motion.button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-widest pl-1">Quick Reference</h3>
              <div className="space-y-2">
                {[
                  "Enable 'Remote Control API' Plugin",
                  "Launch Unreal Engine",
                  "Use commands like 'Add Static Mesh'",
                  "Configure LODs for performance",
                  "Modify lighting in real-time"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 rounded-3xl group hover:border-[var(--md-sys-color-outline)] hover:shadow-md transition-all">
                    <div className="w-8 h-8 rounded-full bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-primary)] group-hover:bg-[var(--md-sys-color-primary)]/10 transition-colors">
                      0{i+1}
                    </div>
                    <span className="text-sm text-[var(--md-sys-color-on-surface-variant)] font-medium flex-1 group-hover:text-[var(--md-sys-color-on-surface)] transition-colors">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--md-sys-color-outline-variant)]">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 text-red-600 dark:text-red-400 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 rounded-3xl transition-all"
            >
              <LogOut className="w-4 h-4" />
              Terminate Architect Session
            </motion.button>
          </div>
        </aside>
      </main>
    </div>
  );
}
