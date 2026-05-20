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
      onRefresh();
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
    
    // Update local property simulation if needed, but primarily call parent
    const objectPath = cameraComp ? `${selectedActor.path}.${cameraComp.id}` : selectedActor.path;
    await onPropertyUpdate(objectPath, 'FieldOfView', val);
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full bg-[#050505]">
      {/* Hierarchical Actor Browser */}
      <div className="w-80 border-r border-[#29292E] bg-[#0A0A0B] flex flex-col">
        <div className="p-4 border-b border-[#29292E] flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            Scene Tree
          </h3>
          <button onClick={handleRefresh} className="p-1 hover:bg-white/5 rounded transition-colors group">
            <RefreshCcw className="w-3 h-3 text-[#4D4D57] group-hover:text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          {actors.length === 0 ? (
            <div className="p-8 text-center text-[#4D4D57] text-xs">No actors detected in live scene</div>
          ) : (
            actors.map(actor => (
              <button
                key={actor.id}
                onClick={() => setSelectedActorId(actor.id)}
                className={`w-full p-4 flex items-center gap-3 text-left border-b border-[#202024] transition-all ${
                  selectedActorId === actor.id ? "bg-[#121214] border-l-2 border-l-purple-500" : "hover:bg-white/5 border-l-2 border-l-transparent"
                }`}
              >
                <div className="p-1 rounded bg-[#1A1A1E] text-purple-500">
                  <Box className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{actor.name}</p>
                  <p className="text-[10px] text-[#4D4D57] font-mono truncate">{actor.type}</p>
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
                <div className="p-4 bg-[#121214] rounded-2xl border border-[#29292E]">
                  <Box className="w-8 h-8 text-purple-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">{selectedActor.name}</h2>
                  <p className="text-[10px] text-[#4D4D57] font-mono bg-[#121214] px-2 py-0.5 rounded uppercase inline-block mt-1">{selectedActor.id}</p>
                </div>
              </div>
            </div>

            {/* Main Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Transform Block */}
              <div className="bg-[#121214] p-6 rounded-[24px] border border-[#29292E] space-y-4 shadow-sm">
                <h4 className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest flex items-center gap-2">
                  <Target className="w-3 h-3" /> Transform
                </h4>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                   <div className="text-[#8D8D99]">LOC</div> <div className="col-span-2 text-white">{selectedActor.transform.location.x.toFixed(2)}, {selectedActor.transform.location.y.toFixed(2)}, {selectedActor.transform.location.z.toFixed(2)}</div>
                   <div className="text-[#8D8D99]">ROT</div> <div className="col-span-2 text-white">{selectedActor.transform.rotation.r.toFixed(1)}°, {selectedActor.transform.rotation.p.toFixed(1)}°, {selectedActor.transform.rotation.y.toFixed(1)}°</div>
                   <div className="text-[#8D8D99]">SCL</div> <div className="col-span-2 text-white">{selectedActor.transform.scale.x.toFixed(2)}, {selectedActor.transform.scale.y.toFixed(2)}, {selectedActor.transform.scale.z.toFixed(2)}</div>
                </div>
              </div>

              {/* Camera Settings if applicable */}
              {isCamera && (
                <div className="bg-[#121214] p-6 rounded-[24px] border border-[#29292E] space-y-4 shadow-sm">
                  <h4 className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest flex items-center gap-2">
                    <Camera className="w-3 h-3 text-cyan-500" /> Optics
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#8D8D99] uppercase">Field of View</span>
                      <span className="text-xs text-white font-mono">{Number(currentFOV).toFixed(1)}°</span>
                    </div>
                    <input 
                      type="range"
                      min="5"
                      max="170"
                      step="0.1"
                      value={currentFOV}
                      onChange={(e) => handleFOVChange(parseFloat(e.target.value))}
                      className="w-full h-1 bg-[#29292E] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-[8px] text-[#4D4D57] font-bold uppercase">
                      <span>Wide</span>
                      <span>Tele</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Material Block */}
              <div className="bg-[#121214] p-6 rounded-[24px] border border-[#29292E] space-y-4">
                <h4 className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-3 h-3" /> Materials
                </h4>
                {selectedActor.materials.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedActor.materials.map((mat, i) => (
                      <li key={i} className="text-[11px] text-[#8D8D99] font-mono p-2 bg-black/40 rounded border border-white/5 flex justify-between">
                        <span>Slot {mat.slotIndex}</span>
                        <span className="text-white truncate max-w-[150px]" title={mat.materialPath}>{mat.materialPath.split('/').pop()}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[10px] text-[#4D4D57]">No materials applied.</div>
                )}
              </div>
            </div>

            {/* Components Block */}
            <div className="bg-[#0A0A0B] rounded-[24px] border border-[#29292E] p-6">
              <h4 className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest flex items-center gap-2 mb-6">
                <Cpu className="w-3 h-3" /> Component System
              </h4>
              <div className="space-y-2">
                {selectedActor.components.map(comp => (
                  <div key={comp.id} className="border border-[#29292E] rounded-xl overflow-hidden">
                    <button 
                      onClick={() => toggleComponent(comp.id)}
                      className="w-full p-4 bg-[#121214] flex items-center gap-2 text-left hover:bg-[#1A1A1E] transition-colors"
                    >
                      {expandedComponents.has(comp.id) ? <ChevronDown className="w-3 h-3 text-[#4D4D57]" /> : <ChevronRight className="w-3 h-3 text-[#4D4D57]" />}
                      <span className="text-xs font-bold text-white font-mono">{comp.type}</span>
                      <span className="text-[10px] text-[#4D4D57] ml-auto">[{comp.id}]</span>
                    </button>
                    {expandedComponents.has(comp.id) && (
                      <div className="p-4 bg-[#050505] grid grid-cols-2 gap-4">
                        {Object.entries(comp.properties).map(([key, val]) => (
                          <div key={key} className="text-[10px] space-y-1">
                            <span className="text-[#4D4D57] uppercase">{key}</span>
                            <div className="text-white font-mono bg-black/50 p-1 rounded truncate">{String(val)}</div>
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
          <div className="h-full flex flex-col items-center justify-center text-[#4D4D57] space-y-4">
            <AlertCircle className="w-8 h-8 opacity-20" />
            <p className="text-xs">No actor selected in the scene tree.</p>
          </div>
        )}
      </div>
    </div>
  );
};
