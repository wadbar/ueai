import React from 'react';
import { Trash2, ImageIcon, Upload, Filter, Zap, Target, Repeat } from 'lucide-react';
import { MaterialInstance, LogEntry, UECommand } from '../types';

interface MaterialsTabProps {
  materials: MaterialInstance[];
  selectedMaterialId: string;
  setSelectedMaterialId: (id: string) => void;
  editingProps: any;
  setEditingProps: React.Dispatch<React.SetStateAction<any>>;
  handleApplyMaterial: (id: string, props: any) => Promise<void>;
  handleBatchImportTextures: () => void;
  loading: boolean;
  addLog: (type: LogEntry['type'], msg: string) => void;
}

export const MaterialsTab: React.FC<MaterialsTabProps> = ({
  materials,
  selectedMaterialId,
  setSelectedMaterialId,
  editingProps,
  setEditingProps,
  handleApplyMaterial,
  handleBatchImportTextures,
  loading
}) => {
  return (
    <div className="flex-1 overflow-hidden flex bg-md-bg">
      {/* Sidebar: Material Instances */}
      <div className="w-80 border-r border-md-border flex flex-col bg-md-surface1/50 backdrop-blur-xl">
        <div className="p-6 border-b border-md-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-md-primary" />
            <h3 className="text-xs font-bold text-md-text-muted uppercase tracking-widest">Instances</h3>
          </div>
          <span className="text-[10px] font-mono text-md-text-muted bg-md-surface2 px-2 py-0.5 rounded-full">{materials.length}</span>
        </div>
        <div className="flex-1 overflow-auto p-4 custom-scrollbar space-y-2">
          {materials.map(mat => (
            <button
              key={mat.id}
              onClick={() => setSelectedMaterialId(mat.id)}
              className={`w-full text-left p-4 rounded-2xl transition-all border group ${
                selectedMaterialId === mat.id 
                ? 'bg-md-primary/10 border-md-primary shadow-lg shadow-md-primary/5' 
                : 'bg-transparent border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[11px] font-black uppercase tracking-tight ${selectedMaterialId === mat.id ? 'text-md-primary' : 'text-md-text-strong'}`}>
                  {mat.id}
                </span>
                <div className={`w-2 h-2 rounded-full ${mat.status === 'SYNCHRONIZED' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              </div>
              <p className="text-[9px] text-md-text-muted font-mono truncate opacity-60">
                {mat.path || 'No asset path'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Material Editor */}
      <div className="flex-1 overflow-auto p-12 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-12">
          <header className="flex items-end justify-between gap-8 pb-8 border-b border-white/5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-md-primary font-bold text-xs uppercase tracking-[0.2em]">
                <Target className="w-4 h-4" />
                <span>PBR Engine V12</span>
              </div>
              <h2 className="text-4xl font-bold text-md-text-strong tracking-tight leading-tight">Instance Editor</h2>
              <p className="text-md-text-muted max-w-xl">Ajuste os parâmetros físicos e mapas de textura da instância selecionada em tempo real no motor Unreal.</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleApplyMaterial(selectedMaterialId, editingProps)}
                disabled={loading}
                className="px-8 py-4 bg-md-primary disabled:opacity-30 disabled:cursor-not-allowed text-md-on-primary font-black uppercase text-[11px] rounded-2xl hover:bg-md-primary-hover transition-all flex items-center gap-2 shadow-2xl shadow-md-primary/20"
              >
                <Repeat className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Sync with Engine
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Physical Parameters */}
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-4 w-1 bg-md-primary rounded-full" />
                <h4 className="text-xs font-bold text-md-text-strong uppercase tracking-widest">Physical Shading</h4>
              </div>
              
              <div className="grid gap-8 p-8 bg-md-surface2/50 border border-md-border rounded-3xl">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest">Base Color</label>
                    <span className="text-[10px] font-mono text-md-primary">{editingProps.baseColor}</span>
                  </div>
                  <div className="flex gap-4">
                    <input 
                        type="color" 
                        className="w-16 h-12 bg-transparent appearance-none border-none cursor-pointer rounded-xl overflow-hidden"
                        value={editingProps.baseColor}
                        onChange={(e) => setEditingProps(prev => ({ ...prev, baseColor: e.target.value }))}
                    />
                    <input 
                        type="text" 
                        value={editingProps.baseColor}
                        onChange={(e) => setEditingProps(prev => ({ ...prev, baseColor: e.target.value }))}
                        className="flex-1 bg-md-surface1 border border-md-border p-3 rounded-xl text-xs font-mono text-md-text focus:border-md-primary outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest">Metallic</label>
                    <span className="text-[10px] font-mono text-md-primary">{editingProps.metallic.toFixed(2)}</span>
                  </div>
                  <input 
                      type="range" min="0" max="1" step="0.01" 
                      className="w-full h-1 bg-white/5 rounded-xl appearance-none cursor-pointer accent-md-primary"
                      value={editingProps.metallic}
                      onChange={(e) => setEditingProps(prev => ({ ...prev, metallic: parseFloat(e.target.value) }))}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest">Roughness</label>
                    <span className="text-[10px] font-mono text-md-primary">{editingProps.roughness.toFixed(2)}</span>
                  </div>
                  <input 
                      type="range" min="0" max="1" step="0.01" 
                      className="w-full h-1 bg-white/5 rounded-xl appearance-none cursor-pointer accent-md-primary"
                      value={editingProps.roughness}
                      onChange={(e) => setEditingProps(prev => ({ ...prev, roughness: parseFloat(e.target.value) }))}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest">Emissive Intensity</label>
                    <span className="text-[10px] font-mono text-md-primary">{editingProps.emissive}</span>
                  </div>
                  <div className="flex gap-4">
                    <input 
                        type="color" 
                        className="w-16 h-12 bg-transparent appearance-none border-none cursor-pointer rounded-xl overflow-hidden"
                        value={editingProps.emissive}
                        onChange={(e) => setEditingProps(prev => ({ ...prev, emissive: e.target.value }))}
                    />
                    <input 
                        type="text" 
                        value={editingProps.emissive}
                        onChange={(e) => setEditingProps(prev => ({ ...prev, emissive: e.target.value }))}
                        className="flex-1 bg-md-surface1 border border-md-border p-3 rounded-xl text-xs font-mono text-md-text focus:border-md-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Texture Mapping */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                  <h4 className="text-xs font-bold text-md-text-strong uppercase tracking-widest">Texture Channels</h4>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleBatchImportTextures}
                        className="text-[10px] text-md-primary hover:text-md-primary-hover font-bold uppercase"
                    >
                        Batch Import
                    </button>
                    <button 
                        onClick={() => {
                            const key = window.prompt('Nome do parâmetro de textura (ex: Texture_Parameter):');
                            if (key) setEditingProps(prev => ({
                                ...prev,
                                textures: { ...prev.textures, [key]: '' }
                            }));
                        }}
                        className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold uppercase"
                    >
                        + Adicionar Slot
                    </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(editingProps.textures).map(([type, pathValue]) => (
                  <div key={type} className="space-y-3 bg-md-surface2/30 p-4 rounded-3xl border border-white/5">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] text-md-text-muted font-bold uppercase tracking-widest truncate max-w-[120px]">{type}</label>
                      <button 
                        onClick={() => {
                          const newTextures = { ...editingProps.textures };
                          delete newTextures[type];
                          setEditingProps(prev => ({ ...prev, textures: newTextures }));
                        }}
                        className="text-red-500/50 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="relative group">
                      <div className="h-32 bg-md-surface2 border border-md-border rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-md-primary transition-all overflow-hidden border-dashed">
                        {pathValue ? (
                          <div className="w-full h-full bg-md-surface3 flex items-center justify-center italic text-[9px] text-md-text-muted px-4 text-center break-all font-mono leading-tight">
                            {pathValue}
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-6 h-6 text-md-text-muted/30" />
                            <span className="text-[9px] text-md-text-muted font-bold">MISSING_MAP</span>
                          </>
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-2xl gap-2">
                        <button 
                          onClick={() => {
                            const pathResult = window.prompt(`Importar textura para ${type}:`, (pathValue as any) || '/Game/Textures/');
                            if (pathResult !== null) setEditingProps(prev => ({ 
                                ...prev, 
                                textures: { ...prev.textures, [type]: pathResult } 
                            }));
                          }}
                          className="p-2 bg-md-primary text-md-on-primary rounded-xl text-md-text-strong hover:bg-md-primary-hover transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <input 
                      type="text" 
                      placeholder="/Game/Textures/..."
                      className="w-full bg-md-surface2 border border-md-border p-2 rounded-xl text-[9px] text-md-text-muted font-mono focus:border-md-primary outline-none"
                      value={pathValue as any}
                      onChange={(e) => setEditingProps(prev => ({ 
                        ...prev, 
                        textures: { ...prev.textures, [type]: e.target.value } 
                      }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
