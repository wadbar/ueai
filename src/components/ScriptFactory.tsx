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
    <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-[#050505]">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#9462E1] font-bold text-xs uppercase tracking-[0.3em]">
              <Code2 className="w-4 h-4" />
              <span>UE Architect Script Factory V12</span>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Gerador Industrial</h2>
            <p className="text-[#8D8D99] max-w-lg">
              Motor de geração de artefatos de engenharia para Unreal Engine 5. 
              Tradução determinística de fluxos naturais em lógica de baixo nível.
            </p>
          </div>

          <div className="flex flex-col items-end gap-4">
             <div className="flex items-center gap-2 bg-[#121214] p-1 rounded-xl border border-[#29292E]">
                {['All', 'General', 'AI Generated', 'Materials', 'Camera', 'Automation'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${
                        activeCategory === cat ? "bg-[#9462E1] text-white shadow-[0_0_15px_rgba(148,98,225,0.4)]" : "text-[#4D4D57] hover:text-[#8D8D99]"
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
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest">Blueprint Logic (Graph View)</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => {
                          navigator.clipboard.writeText(currentAIResponse.blueprintCode || '');
                          alert('Blueprint copiado!');
                        }}
                        className="p-2 hover:bg-white/5 rounded-lg text-[#4D4D57] hover:text-white transition-colors"
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
                        className="p-2 hover:bg-white/5 rounded-lg text-[#4D4D57] hover:text-white transition-colors"
                       >
                          <Download className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                  <div className="relative group">
                    <pre className="p-8 bg-[#0A0A0B] border border-[#29292E] rounded-3xl text-blue-300 font-mono text-sm overflow-x-auto leading-relaxed shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)]">
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
                      <span className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest">C++ Source Code (UE5 SDK)</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button className="p-2 hover:bg-white/5 rounded-lg text-[#4D4D57] hover:text-white transition-colors">
                          <Copy className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                  <div className="relative group">
                    <pre className="p-8 bg-[#0A0A0B] border border-[#29292E] rounded-3xl text-green-300 font-mono text-sm overflow-x-auto leading-relaxed shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)]">
                      {currentAIResponse.cppCode || "NENHUM_SNIPPET_GERADO"}
                    </pre>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-[9px] font-bold text-[#29292E] bg-green-300 px-2 py-1 rounded">CPP_UE5_ENGINE</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-[600px] bg-[#0A0A0B] border-2 border-dashed border-[#202024] rounded-[40px] flex flex-col items-center justify-center text-center p-12 space-y-6">
                <div className="w-24 h-24 bg-[#121214] rounded-full flex items-center justify-center text-[#4D4D57] shadow-2xl">
                  <Code2 className="w-10 h-10" />
                </div>
                <div className="max-w-sm space-y-2">
                  <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Fábrica em Standby</h3>
                  <p className="text-sm text-[#8D8D99]">O gerador está pronto para traduzir suas ordens. Utilize o terminal para iniciar o processamento de artefatos.</p>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-8">
            <div className="bg-[#121214] border border-[#29292E] rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Histórico de Ordens</h3>
                <Terminal className="w-4 h-4 text-[#4D4D57]" />
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4D4D57]" />
                <input 
                  type="text" 
                  placeholder="Filtrar histórico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/40 border border-[#29292E] pl-10 pr-4 py-3 rounded-xl text-xs text-white focus:border-[#9462E1] outline-none transition-all placeholder:text-[#4D4D57]"
                />
              </div>
              
              <div className="space-y-3 max-h-[500px] overflow-auto pr-2 custom-scrollbar">
                {filteredHistory.map(cmd => (
                    <motion.div 
                      layout
                      key={cmd.id} 
                      className="group p-4 bg-[#0A0A0B] border border-[#29292E] rounded-2xl hover:border-[#9462E1]/50 transition-all space-y-3 relative overflow-hidden"
                    >
                       <div className="flex items-start justify-between gap-2">
                          <button 
                            onClick={() => setPrompt(cmd.text)}
                            className="text-left text-[11px] text-[#E1E1E6] font-bold leading-tight hover:text-[#9462E1] transition-colors"
                          >
                            {cmd.text}
                          </button>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => togglePin(cmd.id)}
                                className={`p-1.5 rounded-lg hover:bg-white/5 ${cmd.pinned ? "text-amber-500" : "text-[#4D4D57]"}`}
                             >
                                <Bookmark className="w-4 h-4" fill={cmd.pinned ? "currentColor" : "none"} />
                             </button>
                             <button 
                                onClick={() => deleteCommand(cmd.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#4D4D57] hover:text-red-500"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       </div>
                       <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                          <div className="flex items-center gap-2">
                             <Tag className="w-3 h-3 text-[#4D4D57]" />
                             <select 
                                value={cmd.category}
                                onChange={(e) => updateCategory(cmd.id, e.target.value)}
                                className="bg-transparent text-[#4D4D57] hover:text-[#8D8D99] focus:outline-none cursor-pointer border-none p-0"
                             >
                                {['General', 'AI Generated', 'Materials', 'Camera', 'Automation'].map(cat => (
                                   <option key={cat} value={cat} className="bg-[#121214] text-white">{cat}</option>
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
                    <Search className="w-8 h-8 mx-auto text-[#4D4D57]" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#4D4D57]">Nenhum registro encontrado</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-gradient-to-br from-[#9462E1]/10 to-transparent border border-[#9462E1]/20 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-[#9462E1]" />
                <h3 className="font-black text-white uppercase tracking-widest text-xs">Core Stats</h3>
              </div>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase text-[#4D4D57]">
                       <span>Cache Usage</span>
                       <span className="text-white">12%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="w-[12%] h-full bg-[#9462E1]" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase text-[#4D4D57]">
                       <span>Model Precision</span>
                       <span className="text-white">DETERMINISTIC</span>
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
