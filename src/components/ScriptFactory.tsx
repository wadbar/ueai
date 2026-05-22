import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Code2, Database, Filter, Tag, Bookmark, Trash2, Search, Download, Copy, Play, Terminal } from 'lucide-react';
import { AIResponse } from '../types';

interface SavedCommand {
  id: string;
  text: string;
  pinned: boolean;
  category?: string;
  timestamp: number;
}

interface ScriptFactoryProps {
  currentAIResponse: AIResponse | null;
  commandHistory: SavedCommand[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  togglePin: (id: string) => void;
  updateCategory: (id: string, category: string) => void;
  deleteCommand: (id: string) => void;
  setPrompt: (text: string) => void;
}

export const ScriptFactory: React.FC<ScriptFactoryProps> = ({
  currentAIResponse,
  commandHistory,
  activeCategory,
  setActiveCategory,
  togglePin,
  updateCategory,
  deleteCommand,
  setPrompt
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = commandHistory
    .filter(c => activeCategory === 'All' || c.category === activeCategory)
    .filter(c => c.text.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  return (
    <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-md-bg">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-md-primary font-bold text-xs uppercase tracking-[0.3em]">
              <Code2 className="w-4 h-4" />
              <span>UE Architect Script Factory V12</span>
            </div>
            <h2 className="text-4xl font-black text-md-text-strong tracking-tighter uppercase italic">Gerador Industrial</h2>
            <p className="text-md-text-muted max-w-lg">
              Sistema de geração de artefatos de engenharia para Unreal Engine 5. 
              Tradução determinística de fluxos naturais em lógica de baixo nível.
            </p>
          </div>

          <div className="flex flex-col items-end gap-4">
             <div className="flex items-center gap-2 bg-md-surface2 p-2 rounded-2xl border border-md-border">
                {['All', 'General', 'AI Generated', 'Materials', 'Camera', 'Automation'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${
                        activeCategory === cat ? "bg-md-primary text-md-on-primary shadow-[0_0_15px_rgba(148,98,225,0.4)]" : "text-md-text-muted hover:text-md-text-muted"
                      }`}
                    >
                      {cat}
                    </button>
                ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-10">
            {currentAIResponse ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-1 gap-10"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-md-primary text-md-on-primary animate-pulse" />
                      <span className="text-[10px] font-black text-md-text-muted uppercase tracking-widest">Blueprint Logic (Graph View)</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => {
                          navigator.clipboard.writeText(currentAIResponse.blueprintCode || '');
                          alert('Blueprint copiado!');
                        }}
                        className="p-2 hover:bg-white/5 rounded-xl text-md-text-muted hover:text-md-text-strong transition-colors"
                       >
                          <Copy className="w-4 h-4" />
                       </button>
                       <button 
                        onClick={() => {
                          const element = document.createElement("a");
                          const file = new Blob([currentAIResponse.blueprintCode || ''], {type: 'text/plain'});
                          element.href = URL.createObjectURL(file);
                          element.download = "unreal_blueprint_export.txt";
                          document.body.appendChild(element);
                          element.click();
                        }}
                        className="p-2 hover:bg-white/5 rounded-xl text-md-text-muted hover:text-md-text-strong transition-colors"
                       >
                          <Download className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                  <div className="relative group">
                    <pre className="p-8 bg-md-surface1 border border-md-border rounded-3xl text-blue-300 font-mono text-sm overflow-x-auto leading-relaxed shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)]">
                      {currentAIResponse.blueprintCode || "AGUARDANDO_DADOS_PROCESSO"}
                    </pre>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-[9px] font-bold text-[#29292E] bg-blue-300 px-2 py-1 rounded">UE5_BLUEPRINT_NODE</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                     <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-black text-md-text-muted uppercase tracking-widest">C++ Source Code (UE5 SDK)</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button className="p-2 hover:bg-white/5 rounded-xl text-md-text-muted hover:text-md-text-strong transition-colors">
                          <Copy className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                  <div className="relative group">
                    <pre className="p-8 bg-md-surface1 border border-md-border rounded-3xl text-green-300 font-mono text-sm overflow-x-auto leading-relaxed shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)]">
                      {currentAIResponse.cppCode || "NENHUM_SNIPPET_GERADO"}
                    </pre>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-[9px] font-bold text-[#29292E] bg-green-300 px-2 py-1 rounded">CPP_UE5_ENGINE</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                     <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[10px] font-black text-md-text-muted uppercase tracking-widest">Deployment: Realtime Spectator Controller (Python)</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => {
                          const script = `
import unreal

def setup_spectator():
    # Carregar Ator SpectatorPawn
    pawn_class = unreal.EditorAssetLibrary.load_blueprint_class('/Game/Blueprints/BP_Spectator_Architect')
    if not pawn_class:
        unreal.log_warning("BP_Spectator_Architect não encontrado. Criando SpectatorPawn padrão.")
        pawn_class = unreal.SpectatorPawn
    
    # Spawn Ator
    location = unreal.Vector(0, 0, 500)
    rotation = unreal.Rotator(0, 0, 0)
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(pawn_class, location, rotation)
    
    # Possess by Player 0
    player_controller = unreal.GameplayStatics.get_player_controller(unreal.EditorLevelLibrary.get_editor_world(), 0)
    player_controller.possess(actor)
    
    unreal.log("Spectator Controller implantado com sucesso.")

setup_spectator()
`.trim();
                          navigator.clipboard.writeText(script);
                          alert('Script Python copiado! Execute no Python Console do Unreal.');
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-black rounded-xl text-[10px] font-black uppercase hover:bg-amber-400 transition-all"
                       >
                          <Play className="w-3 h-3 fill-current" />
                          Copiar para Unreal
                       </button>
                    </div>
                  </div>
                  <div className="relative group">
                    <pre className="p-8 bg-md-surface1 border border-md-border rounded-3xl text-amber-500 font-mono text-sm overflow-x-auto leading-relaxed shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)]">
                      {`# Unreal Spectator Controller v12
import unreal
import json

# Blender Bridge Protocol - Inspired by meshroom2blender
def sync_with_blender(actor_label):
    # Remote call to Blender instance or export to exchange folder
    unreal.log(f"Exporting {actor_label} to Blender via GLTF Bridge...")

# Configurando o ambiente de controle remoto
actor_path = "/Game/Maps/Main.Main:PersistentLevel.CineCameraActor_0"
unreal.log(f"Iniciando acoplamento com: {actor_path}")

# Habilitando Input em Tempo Real via API
# Este script deve ser executado para permitir que o Web Controller assuma o controle.
`}
                    </pre>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-[600px] bg-md-surface1 border-2 border-dashed border-md-border rounded-[40px] flex flex-col items-center justify-center text-center p-12 space-y-6">
                <div className="w-24 h-24 bg-md-surface2 rounded-full flex items-center justify-center text-md-text-muted shadow-2xl">
                  <Code2 className="w-10 h-10" />
                </div>
                <div className="max-w-sm space-y-2">
                  <h3 className="text-xl font-bold text-md-text-strong uppercase italic tracking-tighter">Fábrica em Standby</h3>
                  <p className="text-sm text-md-text-muted">O gerador está pronto para traduzir suas ordens. Utilize o terminal para iniciar o processamento de artefatos.</p>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-8">
            <div className="bg-md-surface2 border border-md-border rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-md-text-strong uppercase tracking-widest">Histórico de Ordens</h3>
                <Terminal className="w-4 h-4 text-md-text-muted" />
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2/2 -translate-y-1/2 w-4 h-4 text-md-text-muted" />
                <input 
                  type="text" 
                  placeholder="Filtrar histórico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-md-border pl-10 pr-4 py-3 rounded-2xl text-xs text-md-text-strong focus:border-md-primary outline-none transition-all placeholder:text-md-text-muted"
                />
              </div>
              
              <div className="space-y-3 max-h-[500px] overflow-auto pr-2 custom-scrollbar">
                {filteredHistory.map(cmd => (
                    <motion.div 
                      layout
                      key={cmd.id} 
                      className="group p-4 bg-md-surface1 border border-md-border rounded-2xl hover:border-md-primary transition-all space-y-3 relative overflow-hidden"
                    >
                       <div className="flex items-start justify-between gap-2">
                          <button 
                            onClick={() => setPrompt(cmd.text)}
                            className="text-left text-[11px] text-md-text font-bold leading-tight hover:text-md-primary transition-colors"
                          >
                            {cmd.text}
                          </button>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => togglePin(cmd.id)}
                                className={`p-2.5 rounded-xl hover:bg-white/5 ${cmd.pinned ? "text-amber-500" : "text-md-text-muted"}`}
                             >
                                <Bookmark className="w-4 h-4" fill={cmd.pinned ? "currentColor" : "none"} />
                             </button>
                             <button 
                                onClick={() => deleteCommand(cmd.id)}
                                className="p-2.5 rounded-xl hover:bg-red-500/10 text-md-text-muted hover:text-red-500"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       </div>
                       <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                          <div className="flex items-center gap-2">
                             <Tag className="w-3 h-3 text-md-text-muted" />
                             <select 
                                value={cmd.category}
                                onChange={(e) => updateCategory(cmd.id, e.target.value)}
                                className="bg-transparent text-md-text-muted hover:text-md-text-muted focus:outline-none cursor-pointer border-none p-0"
                             >
                                {['General', 'AI Generated', 'Materials', 'Camera', 'Automation'].map(cat => (
                                   <option key={cat} value={cat} className="bg-md-surface2 text-md-text-strong">{cat}</option>
                                ))}
                             </select>
                          </div>
                          <span className="text-[#202024]">#{cmd.id.slice(0, 4)}</span>
                       </div>
                       
                       {/* Hover Pulse Effect */}
                       <div className="absolute inset-0 bg-gradient-to-tr from-[#9462E1]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </motion.div>
                  ))}
                {filteredHistory.length === 0 && (
                  <div className="py-20 text-center space-y-2 opacity-30">
                    <Search className="w-8 h-8 mx-auto text-md-text-muted" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-md-text-muted">Nenhum registro encontrado</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-gradient-to-br from-[#9462E1]/10 to-transparent border border-md-primary rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-md-primary" />
                <h3 className="font-black text-md-text-strong uppercase tracking-widest text-xs">Core Stats</h3>
              </div>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase text-md-text-muted">
                       <span>Cache Usage</span>
                       <span className="text-md-text-strong">12%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="w-[12%] h-full bg-md-primary text-md-on-primary" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase text-md-text-muted">
                       <span>Model Precision</span>
                       <span className="text-md-text-strong">DETERMINISTIC</span>
                    </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
