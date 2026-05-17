import React, { useState } from 'react';
import { Search, Database, Layers, Target, RefreshCcw, Box } from 'lucide-react';
import { Actor } from '../types';

interface SceneInspectorProps {
  onRefresh: () => void;
  actors: Actor[];
}

export const SceneInspector: React.FC<SceneInspectorProps> = ({ onRefresh, actors }) => {
  const [selectedActor, setSelectedActor] = useState<Actor | null>(actors[0] || null);

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Actor List */}
      <div className="w-80 border-r border-[#29292E] bg-[#0A0A0B] flex flex-col">
        <div className="p-4 border-b border-[#29292E] flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            Scene Actors
          </h3>
          <button onClick={onRefresh} className="p-1 hover:bg-white/5 rounded">
            <RefreshCcw className="w-3 h-3 text-[#4D4D57]" />
          </button>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          {actors.map(actor => (
            <button
              key={actor.id}
              onClick={() => setSelectedActor(actor)}
              className={cn(
                "w-full p-4 flex items-center gap-3 text-left border-b border-[#202024] transition-colors",
                selectedActor?.id === actor.id ? "bg-[#121214]" : "hover:bg-white/5"
              )}
            >
              <Box className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-bold text-white">{actor.name}</p>
                <p className="text-[10px] text-[#4D4D57] font-mono">{actor.type}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail View */}
      <div className="flex-1 bg-[#050505] p-8 overflow-auto custom-scrollbar">
        {selectedActor ? (
          <div className="max-w-3xl space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-[#121214] rounded-2xl border border-[#29292E]">
                <Box className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">{selectedActor.name}</h2>
                <p className="text-[10px] text-[#4D4D57] font-mono bg-[#121214] px-2 py-0.5 rounded uppercase">{selectedActor.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#121214] p-6 rounded-[24px] border border-[#29292E] space-y-4">
                <h4 className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest flex items-center gap-2">
                  <Target className="w-3 h-3" /> Transform
                </h4>
                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                   <div className="text-[#8D8D99]">X:</div> <div className="col-span-2 text-white">{selectedActor.transform.location.x.toFixed(2)}</div>
                   <div className="text-[#8D8D99]">Y:</div> <div className="col-span-2 text-white">{selectedActor.transform.location.y.toFixed(2)}</div>
                   <div className="text-[#8D8D99]">Z:</div> <div className="col-span-2 text-white">{selectedActor.transform.location.z.toFixed(2)}</div>
                </div>
              </div>

               <div className="bg-[#121214] p-6 rounded-[24px] border border-[#29292E] space-y-4">
                <h4 className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-3 h-3" /> Materials
                </h4>
                <ul className="space-y-2">
                  {selectedActor.materials.map((mat, i) => (
                    <li key={i} className="text-[11px] text-[#8D8D99] font-mono p-2 bg-black/40 rounded border border-white/5">
                      [{mat.slotIndex}] {mat.materialPath.split('/').pop()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* Components list could go here */}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-[#4D4D57]">
            Select an actor to inspect
          </div>
        )}
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
