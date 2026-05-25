import React, { useState, useEffect, useCallback } from 'react';
import { Layers, RefreshCcw, Box, Target, Database, ChevronRight, ChevronDown, Cpu, AlertCircle, Camera } from 'lucide-react';
import { Actor } from '../types';

interface SceneInspectorProps {
  onRefresh: () => void;
  actors: Actor[];
  onPropertyUpdate?: (actorPath: string, propertyName: string, value: any) => Promise<void>;
}

/**
 * SceneInspector (Architecture Pattern: Tree-based Scene Inspection)
 * Inspired by professional CAD/3D engine inspector patterns (FreeCAD/Open3D).
 * Provides robust hierarchical inspection of actors, components, and raw data invariants.
 */
export const SceneInspector: React.FC<SceneInspectorProps> = ({ onRefresh, actors, onPropertyUpdate }) => {
  const [selectedActorId, setSelectedActorId] = useState<string | null>(actors[0]?.id || null);
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());

  // Deterministic selector for the current actor
  const selectedActor = actors.find(a => a.id === selectedActorId) || null;

  useEffect(() => {
    if (actors.length > 0 && !selectedActorId) {
      setSelectedActorId(actors[0].id);
    }
  }, [actors, selectedActorId]);

  const toggleComponent = (compId: string) => {
    setExpandedComponents(prev => {
      const next = new Set(prev);
      if (next.has(compId)) next.delete(compId);
      else next.add(compId);
      return next;
    });
  };

  const handleRefresh = useCallback(() => {
    try {
      const result = onRefresh() as any;
      if (result && result.catch) {
        result.catch((e: any) => console.error('UNHANDLED_EXCEPTION in SceneInspector.refresh:', e));
      }
    } catch (error) {
      console.error('UNCAUGHT_EXCEPTION in SceneInspector.refresh:', error);
    }
  }, [onRefresh]);

  const isCamera = selectedActor?.type.toLowerCase().includes('camera');
  
  // Find Camera Component for FOV
  const cameraComp = selectedActor?.components.find(c => c.type.toLowerCase().includes('cameracomponent'));
  const currentFOV = cameraComp?.properties.FieldOfView || selectedActor?.properties?.FieldOfView || 90;

  const handleFOVChange = async (val: number) => {
    if (!selectedActor || !onPropertyUpdate) return;
    
    // Update property remotely natively via parent component integration
    const objectPath = cameraComp ? `${selectedActor.path}.${cameraComp.id}` : selectedActor.path;
    onPropertyUpdate(objectPath, 'FieldOfView', val).catch(() => {});
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full bg-md-bg">
      {/* Hierarchical Actor Browser */}
      <div className="w-80 border-r border-md-border bg-md-surface1 flex flex-col">
        <div className="p-4 border-b border-md-border flex items-center justify-between">
          <h3 className="text-xs font-black text-md-text-strong uppercase tracking-[0.2em] flex items-center gap-2">
            <Layers className="w-4 h-4 text-md-primary" />
            Scene Tree
          </h3>
          <button onClick={handleRefresh} className="p-2 hover:bg-white/5 rounded transition-colors group">
            <RefreshCcw className="w-3 h-3 text-md-text-muted group-hover:text-md-text-strong" />
          </button>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          {actors.length === 0 ? (
            <div className="p-8 text-center text-md-text-muted text-xs">No actors detected in live scene</div>
          ) : (
            actors.map(actor => (
              <button
                key={actor.id}
                onClick={() => setSelectedActorId(actor.id)}
                className={`w-full p-4 flex items-center gap-3 text-left border-b border-md-border transition-all ${
                  selectedActorId === actor.id ? "bg-md-surface2 border-l-2 border-l-purple-500" : "hover:bg-white/5 border-l-2 border-l-transparent"
                }`}
              >
                <div className="p-2 rounded bg-md-surface1 text-md-primary">
                  <Box className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-md-text-strong truncate">{actor.name}</p>
                  <p className="text-[10px] text-md-text-muted font-mono truncate">{actor.type}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Inspector Property Grid */}
      <div className="flex-1 p-8 overflow-auto custom-scrollbar">
        {selectedActor ? (
          <div className="max-w-4xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-md-surface2 rounded-2xl border border-md-border">
                  <Box className="w-8 h-8 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-md-text-strong uppercase tracking-tight">{selectedActor.name}</h2>
                  <p className="text-[10px] text-md-text-muted font-mono bg-md-surface2 px-3 py-1 rounded uppercase inline-block mt-1">{selectedActor.id}</p>
                </div>
              </div>
            </div>

            {/* Main Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Transform Block */}
              <div className="bg-md-surface2 p-6 rounded-[24px] border border-md-border space-y-4 shadow-sm">
                <h4 className="text-[10px] font-black text-md-text-muted uppercase tracking-widest flex items-center gap-2">
                  <Target className="w-3 h-3" /> Transform
                </h4>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                   <div className="text-md-text-muted">LOC</div> <div className="col-span-2 text-md-text-strong">{selectedActor.transform.location.x.toFixed(2)}, {selectedActor.transform.location.y.toFixed(2)}, {selectedActor.transform.location.z.toFixed(2)}</div>
                   <div className="text-md-text-muted">ROT</div> <div className="col-span-2 text-md-text-strong">{selectedActor.transform.rotation.r.toFixed(1)}°, {selectedActor.transform.rotation.p.toFixed(1)}°, {selectedActor.transform.rotation.y.toFixed(1)}°</div>
                   <div className="text-md-text-muted">SCL</div> <div className="col-span-2 text-md-text-strong">{selectedActor.transform.scale.x.toFixed(2)}, {selectedActor.transform.scale.y.toFixed(2)}, {selectedActor.transform.scale.z.toFixed(2)}</div>
                </div>
              </div>

              {/* Camera Settings if applicable */}
              {isCamera && (
                <div className="bg-md-surface2 p-6 rounded-[24px] border border-md-border space-y-4 shadow-sm">
                  <h4 className="text-[10px] font-black text-md-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Camera className="w-3 h-3 text-cyan-500" /> Optics
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-md-text-muted uppercase">Field of View</span>
                      <span className="text-xs text-md-text-strong font-mono">{Number(currentFOV).toFixed(1)}°</span>
                    </div>
                    <input 
                      type="range"
                      min="5"
                      max="170"
                      step="0.1"
                      value={currentFOV}
                      onChange={(e) => handleFOVChange(parseFloat(e.target.value))}
                      className="w-full h-1 bg-md-surface3 rounded-xl appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[8px] text-md-text-muted font-bold uppercase">
                      <span>Wide</span>
                      <span>Tele</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Material Block */}
              <div className="bg-md-surface2 p-6 rounded-[24px] border border-md-border space-y-4">
                <h4 className="text-[10px] font-black text-md-text-muted uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-3 h-3" /> Materials
                </h4>
                {selectedActor.materials.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedActor.materials.map((mat, i) => (
                      <li key={i} className="text-[11px] text-md-text-muted font-mono p-2 bg-black/40 rounded border border-white/5 flex justify-between">
                        <span>Slot {mat.slotIndex}</span>
                        <span className="text-md-text-strong truncate max-w-[150px]" title={mat.materialPath}>{mat.materialPath.split('/').pop()}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[10px] text-md-text-muted">No materials applied.</div>
                )}
              </div>
            </div>

            {/* Components Block */}
            <div className="bg-md-surface1 rounded-[24px] border border-md-border p-6">
              <h4 className="text-[10px] font-black text-md-text-muted uppercase tracking-widest flex items-center gap-2 mb-6">
                <Cpu className="w-3 h-3" /> Component System
              </h4>
              <div className="space-y-2">
                {selectedActor.components.map(comp => (
                  <div key={comp.id} className="border border-md-border rounded-2xl overflow-hidden">
                    <button 
                      onClick={() => toggleComponent(comp.id)}
                      className="w-full p-4 bg-md-surface2 flex items-center gap-2 text-left hover:bg-md-surface3 transition-colors"
                    >
                      {expandedComponents.has(comp.id) ? <ChevronDown className="w-3 h-3 text-md-text-muted" /> : <ChevronRight className="w-3 h-3 text-md-text-muted" />}
                      <span className="text-xs font-bold text-md-text-strong font-mono">{comp.type}</span>
                      <span className="text-[10px] text-md-text-muted ml-auto">[{comp.id}]</span>
                    </button>
                    {expandedComponents.has(comp.id) && (
                      <div className="p-4 bg-md-bg grid grid-cols-2 gap-4">
                        {Object.entries(comp.properties).map(([key, val]) => (
                          <div key={key} className="text-[10px] space-y-1">
                            <span className="text-md-text-muted uppercase">{key}</span>
                            <div className="text-md-text-strong font-mono bg-black/50 p-2 rounded truncate">{String(val)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-md-text-muted space-y-4">
            <AlertCircle className="w-8 h-8 opacity-20" />
            <p className="text-xs">No actor selected in the scene tree.</p>
          </div>
        )}
      </div>
    </div>
  );
};
