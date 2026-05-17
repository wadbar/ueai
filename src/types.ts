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
