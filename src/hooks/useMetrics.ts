import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SystemStats, UEConnection } from '../types';

export function useMetrics(connection: UEConnection) {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const [uePerformanceStats, setUePerformanceStats] = useState<{ 
    drawCalls: number, 
    triangles: number,
    cameraMetadata?: any
  } | null>(null);

  useEffect(() => {
    const socket = io(window.location.origin);
    socket.on("system_stats", (data: SystemStats) => {
      setSystemStats(data);
      setLastHeartbeat(Date.now());
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (!connection.connected) return;

    let isPolling = false;
    const pollUEPerformance = async () => {
      if (isPolling) return;
      isPolling = true;
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
                total_tris += comp.static_mesh.get_num_triangles(0)
                draw_calls += comp.get_num_materials()
    print("UE_PERF_START" + json.dumps({"drawCalls": draw_calls, "triangles": total_tris}) + "UE_PERF_END")
except: pass
      `;
      try {
        const res = await axios.post(`${connection.url}:${connection.port}/remote/script/execute`, { script }, { timeout: 2000 });
        const output = res.data?.output || "";
        const match = output.match(/UE_PERF_START(.*)UE_PERF_END/);
        if (match) {
          setUePerformanceStats(JSON.parse(match[1]));
        }
      } catch (e) {
      } finally {
        isPolling = false;
      }
    };

    const interval = setInterval(() => pollUEPerformance().catch(() => {}), 4000);
    return () => clearInterval(interval);
  }, [connection.connected, connection.url, connection.port]);

  return { systemStats, uePerformanceStats, lastHeartbeat };
}
