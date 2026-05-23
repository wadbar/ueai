import { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Actor, UEConnection } from '../types';

export function useSceneInspector(connection: UEConnection) {
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(false);

  const scanScene = useCallback(async () => {
    if (!connection.connected) return;
    setLoading(true);
    
    try {
      let actorPaths = [];
      try {
        const response = await axios.put(`${connection.url}:${connection.port}/remote/object/call`, {
          objectPath: '/Script/UnrealEd.Default__EditorLevelLibrary',
          functionName: 'GetAllLevelActors'
        }, { timeout: 8000 });
        actorPaths = (response.data as any).ReturnValue || [];
      } catch (e) {
        // Fallback robusto via Python Bridge
        const script = `
import unreal
import json
actors = unreal.EditorLevelLibrary.get_all_level_actors()
actor_data = []
for a in actors:
    actor_data.append({
        "path": a.get_path_name(),
        "type": a.get_class().get_name(),
        "name": a.get_actor_label()
    })
print("ACTOR_DATA_START" + json.dumps(actor_data) + "ACTOR_DATA_END")
`;
        const pyRes = await axios.post(`${connection.url}:${connection.port}/remote/script/execute`, { script });
        const output = pyRes.data?.output || "";
        const match = output.match(/ACTOR_DATA_START(.*)ACTOR_DATA_END/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          actorPaths = parsed.map((p: any) => p.path);
        }
      }

      const detailedActors: Actor[] = actorPaths.map((path: any) => {
        const fullPath = typeof path === 'string' ? path : (path.ObjectPath || path.Path);
        return {
          id: fullPath,
          path: fullPath,
          name: fullPath.split('.').pop() || 'Unnamed',
          type: fullPath.includes('Camera') ? 'CineCameraActor' : 'StaticMeshActor',
          transform: {
            location: { x: 0, y: 0, z: 0 },
            rotation: { r: 0, p: 0, y: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          components: [],
          materials: [],
          properties: {}
        };
      });

      setActors(detailedActors);
      return detailedActors;
    } catch (err) {
      console.error('SCENE_SCAN_FAULT:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [connection]);

  const result = useMemo(() => ({
    actors,
    scanScene,
    loading
  }), [actors, scanScene, loading]);

  return result;
}
