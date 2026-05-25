import { useRef, useEffect } from 'react';
import { UEConnection, Actor, MaterialInstance, LODLevel } from '../types';

export function useAssetAutomation(
  connection: UEConnection,
  selectedActorData: Actor | null,
  selectedActorMeshPath: string | null,
  applyMaterial: (id: string, props: any) => Promise<void>,
  applyLODs: (path: string, lods: LODLevel[]) => Promise<void>,
  materials: MaterialInstance[],
  addLog: (type: any, msg: string) => void
) {
  const automationTriggered = useRef<string | null>(null);

  useEffect(() => {
    if (connection.connected && selectedActorData && selectedActorMeshPath && automationTriggered.current !== selectedActorData.path) {
      automationTriggered.current = selectedActorData.path;
      
      const runAutomation = async () => {
        addLog('ai', `Iniciando automação agnóstica para: ${selectedActorData.name}`);
        
        // 1. Concrete Material Automation
        const concreteInstance = materials.find((m) => m.id === 'M_Industrial_Concrete');
        if (concreteInstance) {
           await applyMaterial('M_Industrial_Concrete', concreteInstance).catch(e => addLog('error', `Auto-Material Fall: ${e.message}`));
        }
        
        // 2. LOD Automation (3 levels)
        await applyLODs(selectedActorMeshPath, [
          { level: 0, tris: '75', distance: 1.0, status: 'GENERATED' },
          { level: 1, tris: '50', distance: 0.5, status: 'GENERATED' },
          { level: 2, tris: '25', distance: 0.1, status: 'GENERATED' }
        ]).catch(e => addLog('error', `Auto-LOD Fall: ${e.message}`));

        addLog('ai', 'Automação industrial aplicada com sucesso.');
      };

      runAutomation().catch((err) => console.error("Asset Automation Exception:", err));
    }
  }, [connection.connected, selectedActorData?.path, selectedActorMeshPath, materials]);
}
