import React, { useState } from 'react';
import { 
  Sun, 
  Cloud, 
  Wind, 
  Zap, 
  Camera, 
  RotateCw, 
  Maximize,
  Save,
  Map as MapIcon,
  PlayCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface WorldSettingsProps {
  onSwitchLevel: (path: string) => void;
  onTakeScreenshot: (res: string) => void;
  onSetProperty: (object: string, prop: string, value: any) => void;
  addLog: (type: any, msg: string) => void;
}

export const WorldSettings: React.FC<WorldSettingsProps> = ({
  onSwitchLevel,
  onTakeScreenshot,
  onSetProperty,
  addLog
}) => {
  const [timeOfDay, setTimeOfDay] = useState(12);
  const [gravity, setGravity] = useState(1.0);
  const [exposure, setExposure] = useState(1.0);
  const [currentMap, setCurrentMap] = useState('/Game/StarterContent/Maps/Minimal_Default');

  const commonMaps = [
    { label: 'Minimal Default', path: '/Game/StarterContent/Maps/Minimal_Default' },
    { label: 'Advanced Lighting', path: '/Game/StarterContent/Maps/Advanced_Lighting' },
    { label: 'Starter Map', path: '/Game/Maps/StarterMap' }
  ];

  const updateTime = (val: number) => {
    setTimeOfDay(val);
    const rotation = (val / 24) * 360 - 90;
    // Tenta atualizar a Directional Light do sistema
    onSetProperty('/Game/StarterContent/Maps/Minimal_Default.Minimal_Default:PersistentLevel.DirectionalLight_1.LightComponent0', 'RelativeRotation', { r: 0, p: rotation, y: 0 });
    addLog('ue', `LUMINA_SYNC: Ciclo solar ajustado para ${val}:00h`);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#050505]">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col gap-2">
           <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
             <Cloud className="w-8 h-8 text-indigo-500" />
             World & Environment Control
           </h2>
           <p className="text-[#4D4D57] font-bold text-xs uppercase tracking-widest">Global overrides and render utilities</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Controls */}
          <div className="lg:col-span-8 space-y-8">
            {/* Environment Overrides */}
            <section className="bg-[#0A0A0B] border border-white/5 rounded-3xl p-8 space-y-8">
               <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                     <Sun className="w-5 h-5 text-amber-500" />
                     <span className="text-xs font-black text-white uppercase tracking-widest">Atmosphere & Lighting</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#4D4D57]">{timeOfDay}:00h</span>
               </div>

               <div className="space-y-6">
                  <div className="space-y-4">
                     <div className="flex justify-between text-[10px] text-[#8D8D99] font-black uppercase">
                        <span>Solar Cycle (Time of Day)</span>
                        <span className="text-white">{timeOfDay}:00</span>
                     </div>
                     <input 
                       type="range" min="0" max="24" step="0.1" 
                       value={timeOfDay}
                       onChange={(e) => updateTime(parseFloat(e.target.value))}
                       className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-4">
                        <div className="flex justify-between text-[10px] text-[#8D8D99] font-black uppercase">
                           <span>Exposure Bias</span>
                           <span className="text-white">{exposure.toFixed(1)}ev</span>
                        </div>
                        <input 
                          type="range" min="-5" max="5" step="0.1" 
                          value={exposure}
                          onChange={(e) => setExposure(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                     </div>
                     <div className="space-y-4">
                        <div className="flex justify-between text-[10px] text-[#8D8D99] font-black uppercase">
                           <span>Global Gravity</span>
                           <span className="text-white">{(gravity * 9.8).toFixed(1)} m/s²</span>
                        </div>
                        <input 
                          type="range" min="0" max="2" step="0.1" 
                          value={gravity}
                          onChange={(e) => setGravity(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-red-500"
                        />
                     </div>
                  </div>
               </div>
            </section>

            {/* Level Management */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-[#0A0A0B] border border-white/5 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                     <MapIcon className="w-5 h-5 text-emerald-500" />
                     <span className="text-xs font-black text-white uppercase tracking-widest">Level Manager</span>
                  </div>
                  
                  <div className="space-y-3">
                     {commonMaps.map((map) => (
                       <button 
                         key={map.path}
                         onClick={() => onSwitchLevel(map.path)}
                         className="w-full p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all group"
                       >
                          <div className="text-left">
                             <p className="text-sm font-bold text-white mb-0.5">{map.label}</p>
                             <p className="text-[10px] text-[#4D4D57] font-mono">{map.path}</p>
                          </div>
                          <PlayCircle className="w-5 h-5 text-[#4D4D57] group-hover:text-emerald-500 transition-all" />
                       </button>
                     ))}
                  </div>

                  <div className="pt-4">
                    <div className="bg-black/60 p-4 rounded-xl border border-white/5 space-y-3">
                       <p className="text-[10px] font-black text-[#4D4D57] uppercase tracking-widest">Custom Level Path</p>
                       <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="/Game/Maps/MyLevel" 
                            className="flex-1 bg-transparent border-b border-white/10 text-xs font-mono py-1 focus:border-emerald-500 outline-none text-[#8D8D99]"
                            value={currentMap}
                            onChange={(e) => setCurrentMap(e.target.value)}
                          />
                          <button 
                            onClick={() => onSwitchLevel(currentMap)}
                            className="p-2 bg-emerald-500 rounded-lg text-black hover:bg-emerald-400 transition-all"
                          >
                             <Zap className="w-4 h-4 fill-current" />
                          </button>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="bg-[#0A0A0B] border border-white/5 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                     <Camera className="w-5 h-5 text-sky-500" />
                     <span className="text-xs font-black text-white uppercase tracking-widest">Render Utility</span>
                  </div>

                  <div className="space-y-4">
                     <p className="text-xs text-[#8D8D99] leading-relaxed">
                        Execute capturas de alta fidelidade ignorando artefatos de compressão e temporização da UI.
                     </p>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => onTakeScreenshot('1920x1080')}
                          className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center gap-3 hover:bg-sky-500/10 hover:border-sky-500/30 transition-all group"
                        >
                           <Maximize className="w-6 h-6 text-[#4D4D57] group-hover:text-sky-400" />
                           <span className="text-[10px] font-black text-white uppercase tracking-widest">1080p Full HD</span>
                        </button>
                        <button 
                          onClick={() => onTakeScreenshot('3840x2160')}
                          className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center gap-3 hover:bg-sky-500/10 hover:border-sky-500/30 transition-all group"
                        >
                           <Zap className="w-6 h-6 text-[#4D4D57] group-hover:text-amber-400" />
                           <span className="text-[10px] font-black text-white uppercase tracking-widest">4K Ultra HD</span>
                        </button>
                     </div>

                     <div className="bg-sky-500/5 border border-sky-500/20 p-4 rounded-xl flex items-start gap-3">
                        <RotateCw className="w-4 h-4 text-sky-400 mt-1 shrink-0 animate-spin-slow" />
                        <p className="text-[10px] text-sky-400 font-medium">Os frames serão salvos no diretório /Saved/Screenshots/ do projeto Unreal host.</p>
                     </div>
                  </div>
               </div>
            </section>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-8 text-[#8D8D99]">
             <div className="bg-white/[0.02] rounded-3xl p-6 border border-white/5 space-y-4">
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Deployment Info</h4>
                <div className="space-y-3">
                   <div className="flex justify-between text-xs py-2 border-b border-white/5">
                      <span className="font-bold">Protocol</span>
                      <span className="text-[#4D4D57] font-mono">RC_API_v4</span>
                   </div>
                   <div className="flex justify-between text-xs py-2 border-b border-white/5">
                      <span className="font-bold">Sync Mode</span>
                      <span className="text-emerald-500 font-bold">DETERMINISTIC</span>
                   </div>
                   <div className="flex justify-between text-xs py-2">
                      <span className="font-bold">Frame Lock</span>
                      <span className="text-[#4D4D57]">OFF_STAGE</span>
                   </div>
                </div>
             </div>

             <div className="bg-white/[0.02] rounded-3xl p-6 border border-white/5 space-y-4">
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Operational Status</h4>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                      <Zap className="w-6 h-6 text-emerald-500" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-white">Engine Link</p>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">Connected / 1.2ms Latency</p>
                   </div>
                </div>
             </div>

             <button className="w-full py-4 bg-indigo-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-400 transition-all shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                Persist Environment State
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
