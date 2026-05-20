
export type UESeverity = 'info' | 'warn' | 'error' | 'success' | 'ue' | 'ai' | 'system';

export interface Actor {
  id: string;
  path: string;
  name: string;
  type: string;
  transform: {
    location: { x: number; y: number; z: number };
    rotation: { r: number; p: number; y: number };
    scale: { x: number; y: number; z: number };
  };
  components: any[];
  materials: any[];
  properties: any;
}

export interface LODLevel {
  level: number;
  tris: string;
  distance: number;
  status: string;
}

export interface LODConfig {
  id: string;
  path: string;
  currentLODs: number;
  lods: LODLevel[];
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: UESeverity;
  message: string;
  data?: any;
}

export interface UEConnection {
  url: string;
  port: string;
  connected: boolean;
}

export interface AIResponse {
  explanation: string;
  commands: UECommand[];
  blueprintCode?: string;
  cppCode?: string;
}

export interface SystemHealth {
  status: 'online' | 'degraded' | 'offline' | 'checking';
  latency?: string;
}

export interface UECommand {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
}

export interface MaterialInstance {
  id: string;
  baseColor: string;
  metallic: number;
  roughness: number;
  emissive: string;
  status: 'SYNCHRONIZED' | 'DIRTY' | 'ERROR';
  textures: Record<string, string>;
}

export interface SkeletalMesh {
  id: string;
  assetPath: string;
  currentAnim: string;
  playing: boolean;
  loop: boolean;
  playRate: number;
  animations: string[];
}

export interface CameraConfig {
  id: string;
  pos: { x: number; y: number; z: number };
  rot: { r: number; p: number; y: number };
  fov: number;
  active: boolean;
}

export interface CameraControlState {
  isControlling: boolean;
  speed: number;
  sensitivity: number;
  keys: {
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    q: boolean;
    e: boolean;
  };
}

export interface MeshDiagnostics {
  vertexCount: number;
  triangleCount: number;
  uvChannels: number;
  hasVertexColors: boolean;
  lods: number;
  collisionType: string;
  naniteEnabled: boolean;
}

export interface PhotogrammetryJob {
  id: string;
  status: 'QUEUED' | 'ALIGNING' | 'MESHTEXTURE' | 'COMPLETE' | 'FAILED';
  progress: number;
  sourceImages: number;
  elapsedTime: string;
}

export interface SystemStats {
  fps: number;
  cpu: number;
  gpu: number;
  ram: string;
  ping: number;
  uptime: string;
}
