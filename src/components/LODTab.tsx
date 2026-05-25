import React from 'react';
import { Layers as LayersIcon, Trash2, Zap, TrendingDown, Plus } from 'lucide-react';
import { LODLevel } from '../types';

interface LODTabProps {
  selectedActorMeshPath: string | null;
  currentLODConfig: LODLevel[];
  loading: boolean;
  handleApplyLODs: (path: string, lods: LODLevel[]) => Promise<void>;
  handleAddLODLevel: () => void;
  handleUpdateLODLevel: (index: number, updates: Partial<LODLevel>) => void;
  handleRemoveLODLevel: (index: number) => void;
}

export const LODTab: React.FC<LODTabProps> = ({
  selectedActorMeshPath,
  currentLODConfig,
  loading,
  handleApplyLODs,
  handleAddLODLevel,
  handleUpdateLODLevel,
  handleRemoveLODLevel
}) => {
  return (
    <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-md-bg">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-[0.2em]">
            <LayersIcon className="w-4 h-4" />
            <span>Resource Optimization Suite</span>
          </div>
          <h2 className="text-3xl font-bold text-md-text-strong tracking-tight leading-tight">Mesh LOD Manager</h2>
          <p className="text-md-text-muted">Configure hierarhies for Level of Detail to optimize rendering performance.</p>
        </header>

        <div className="grid grid-cols-1 gap-8">
             <div className="bg-md-surface2 border border-md-border rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-md-border flex items-center justify-between bg-white/[0.02]">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-md-surface1 rounded-2xl flex items-center justify-center border border-white/5">
                         <LayersIcon className="w-8 h-8 text-md-text-muted" />
                      </div>
                      <div className="max-w-[400px]">
                         <h3 className="text-xl font-bold text-md-text-strong uppercase tracking-tight">Active LOD Map</h3>
                         <p className="text-xs text-md-text-muted font-mono truncate">{selectedActorMeshPath || 'Select an actor with a Static Mesh to configure LODs'}</p>
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
                                 <span className="text-amber-500 font-mono">{(Number(lod.distance) || 0).toFixed(3)}</span>
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
                     className="border-2 border-dashed border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-amber-500/5 hover:border-amber-500/20 transition-all group min-h-[220px]"
                   >
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-md-text-muted group-hover:text-amber-500 group-hover:scale-110 transition-all border border-white/5">
                         <Plus className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                         <h4 className="text-[11px] font-bold text-md-text-strong uppercase tracking-tight">New Level</h4>
                         <p className="text-[9px] text-md-text-muted mt-1">Incremental reduction</p>
                      </div>
                   </button>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};
