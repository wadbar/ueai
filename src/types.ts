export interface UECommand {
  endpoint: string;
  method: string;
  body: any;
}

export interface AIResponse {
  explanation: string;
  commands: UECommand[];
  blueprintCode?: string;
  cppCode?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'ai' | 'ue' | 'error';
  message: string;
  data?: any;
}

export interface UEConnection {
  url: string;
  port: string;
  connected: boolean;
}

export interface ActorComponent {
  id: string;
  type: string;
  properties: Record<string, any>;
}

export interface Actor {
  id: string;
  name: string;
  type: string;
  transform: {
    location: { x: number, y: number, z: number };
    rotation: { r: number, p: number, y: number };
    scale: { x: number, y: number, z: number };
  };
  components: ActorComponent[];
  materials: { slotIndex: number, materialPath: string }[];
}
