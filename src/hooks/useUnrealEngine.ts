import { useState, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { UECommand, UEConnection, LogEntry } from '../types';

export function useUnrealEngine(connection: UEConnection, addLog: (type: LogEntry['type'], message: string, data?: any) => void) {
  const [loading, setLoading] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  const executeCommands = useCallback(async (commands: UECommand[]) => {
    if (!connection.connected) {
      addLog('error', 'STATUS_DISCONNECTED: Proceda com o teste de conexão primeiro.');
      return;
    }

    setLoading(true);
    addLog('ue', `Transmissão: ${commands.length} comandos.`);
    
    try {
      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        let retries = 0;
        const maxRetries = 2;
        let success = false;

        while (retries <= maxRetries && !success) {
          try {
            await axios.put(`${connection.url}:${connection.port}${cmd.endpoint}`, {
              ...cmd.body,
              generateTransaction: true 
            }, { timeout: 10000 });
            success = true;
          } catch (err) {
            retries++;
            if (retries > maxRetries) throw err;
            await new Promise(resolve => setTimeout(resolve, 500 * retries));
            addLog('system', `GRACEFUL_RECOVERY: Tentativa ${retries} para comando ${i+1}`);
          }
        }
      }
      addLog('success', 'BATCH_EXECUTION_COMPLETE');
    } catch (err: any) {
      addLog('error', `ABORT_SEQUENCE_CRITICAL: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [connection, addLog]);

  const setProperty = useCallback(async (objectPath: string, propertyName: string, value: any) => {
    try {
      await axios.put(`${connection.url}:${connection.port}/remote/object/property`, {
        objectPath,
        propertyName,
        propertyValue: value
      });
      return true;
    } catch (err: any) {
      addLog('error', `PROPERTY_FAULT: ${propertyName} em ${objectPath} - ${err.message}`);
      return false;
    }
  }, [connection, addLog]);

  const callFunction = useCallback(async (objectPath: string, functionName: string, parameters: any = {}) => {
    try {
      const response = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
        objectPath,
        functionName,
        parameters
      });
      return response.data;
    } catch (err: any) {
      addLog('error', `CALL_FAULT: ${functionName} em ${objectPath} - ${err.message}`);
      return null;
    }
  }, [connection, addLog]);

  const executePython = useCallback(async (script: string) => {
    addLog('system', 'EXEC_PY_REMOTE: Despachando payload Python...');
    try {
      await axios.post(`${connection.url}:${connection.port}/remote/script/execute`, {
        script
      });
      addLog('success', 'PYTHON_EXEC_OK');
      return true;
    } catch (err: any) {
      addLog('error', `PYTHON_FAULT: ${err.message}`);
      return false;
    }
  }, [connection, addLog]);

  const takeHighResScreenshot = useCallback(async (resolution: string = '1920x1080') => {
    addLog('system', `RENDER_UTILITY: Solicitando Captura de Alta Resolução (${resolution})...`);
    const [w, h] = resolution.split('x').map(Number);
    const script = `
import unreal
unreal.AutomationLibrary.take_high_res_screenshot(${w}, ${h}, "UE_Architect_Capture.png")
`;
    return await executePython(script);
  }, [executePython, addLog]);

  const switchLevel = useCallback(async (mapPath: string) => {
    addLog('system', `MAP_PIPELINE: Solicitando transição para ${mapPath}...`);
    // Usando ExecuteConsoleCommand pois OpenLevel é mais estável via console no RC
    try {
      await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
          objectPath: "/Script/Engine.Default__KismetSystemLibrary",
          functionName: "ExecuteConsoleCommand",
          parameters: {
              WorldContextObject: "/Game/StarterContent/Maps/Minimal_Default.Minimal_Default",
              Command: `open ${mapPath}`
          }
      });
      addLog('success', 'LEVEL_TRANSITION_QUEUED');
      return true;
    } catch (err: any) {
      addLog('error', `LEVEL_FAULT: ${err.message}`);
      return false;
    }
  }, [connection, addLog]);

  const batchQueueRef = useRef<Map<string, { pos: any, rot: any }>>(new Map());
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateRealtimeActor = useCallback(async (path: string, pos: { x: number, y: number, z: number }, rot: { r: number, p: number, y: number }) => {
    batchQueueRef.current.set(path, { pos, rot });

    if (!batchTimeoutRef.current) {
      batchTimeoutRef.current = setTimeout(() => {
        (async () => {
          const entries = Array.from(batchQueueRef.current.entries());
          batchQueueRef.current.clear();
          batchTimeoutRef.current = null;

          if (entries.length === 0) return;

          try {
            const requests = entries.map(([actorPath, data], index) => ({
              RequestId: index + 1,
              URL: '/remote/object/call',
              Verb: 'PUT',
              Body: {
                objectPath: actorPath,
                functionName: 'SetActorLocationAndRotation',
                parameters: {
                  NewLocation: data.pos,
                  NewRotation: data.rot,
                  bSweep: false,
                  bTeleport: true
                }
              }
            }));

            await axios.put(`${connection.url}:${connection.port}/remote/batch`, {
              Requests: requests
            });
          } catch (err) {
            // High-frequency silence
          }
        })().catch(() => {});
      }, 33); // ~30 FPS throttle
    }
  }, [connection]);

  const testConnection = useCallback(async () => {
    try {
      addLog('ue', `Testando conexão em ${connection.url}:${connection.port}...`);
      await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
          objectPath: "/Script/Engine.Default__GameplayStatics",
          functionName: "GetTimeSeconds",
          parameters: { WorldContextObject: "/Game/StarterContent/Maps/Minimal_Default.Minimal_Default" },
          generateTransaction: false
      }, { timeout: 3000 });
      
      return true;
    } catch (err: any) {
      addLog('error', `LINK_FAILURE: Verifique o Remote Control API (Porta ${connection.port}).`);
      return false;
    }
  }, [connection, addLog]);

  const auditSystem = useCallback(async () => {
    addLog('system', 'Iniciando auditoria preventiva de integridade estructural...');
    let healthScore = 100;

    if (!connection.url.startsWith('http')) {
      addLog('error', '[AUDIT_FAIL]: O host deve começar com http:// ou https://');
      healthScore -= 20;
    }

    try {
      addLog('system', '[CHECKING]: Testando latência com o motor Unreal...');
      const start = Date.now();
      await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
          objectPath: "/Script/Engine.Default__GameplayStatics",
          functionName: "GetTimeSeconds",
          generateTransaction: false
      }, { timeout: 2000 });
      addLog('ue', `[AUDIT_PASS]: Latência do motor ok (${Date.now() - start}ms)`);
    } catch (e) {
      addLog('error', '[AUDIT_WARN]: Motor Unreal inalcançável.');
      healthScore -= 40;
    }

    try {
      const res = await axios.get('/api/health/ai');
      if (res.data.status === 'online') {
        addLog('ai', '[AUDIT_PASS]: Engine Cognitiva operacional.');
      } else {
        healthScore -= 30;
      }
    } catch (e) {
      healthScore -= 50;
    }

    addLog('system', `Auditoria Concluída. Score: ${Math.max(0, healthScore)}%`);
  }, [connection, addLog]);

  const result = useMemo(() => ({
    loading,
    executeCommands,
    setProperty,
    callFunction,
    executePython,
    updateRealtimeActor,
    testConnection,
    auditSystem,
    takeHighResScreenshot,
    switchLevel
  }), [loading, executeCommands, setProperty, callFunction, executePython, updateRealtimeActor, testConnection, auditSystem, takeHighResScreenshot, switchLevel]);

  return result;
}
