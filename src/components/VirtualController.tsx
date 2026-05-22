import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { MousePointer2, Move, ShieldCheck, Zap } from 'lucide-react';
import { CameraControlState } from '../types';
import { cn } from '../lib/utils';

interface VirtualControllerProps {
  onUpdate: (pos: { x: number, y: number, z: number }, rot: { r: number, p: number, y: number }) => void;
  onFOVUpdate?: (fov: number) => void;
  onBootstrap?: () => void;
  isActive: boolean;
  activeActor: string | null;
  currentFOV?: number;
}

export const VirtualController: React.FC<VirtualControllerProps> = ({ onUpdate, onFOVUpdate, onBootstrap, isActive, activeActor, currentFOV = 90 }) => {
  const [state, setState] = useState<CameraControlState>({
    isControlling: false,
    speed: 10.0,
    sensitivity: 0.1,
    keys: { w: false, a: false, s: false, d: false, q: false, e: false }
  });

  const [fov, setFov] = useState(currentFOV);

  const posRef = useRef({ x: 0, y: 0, z: 200 });
  const rotRef = useRef({ r: 0, p: 0, y: 0 });
  const requestRef = useRef<number>(0);

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
      setState(prev => ({ ...prev, keys: { ...prev.keys, [key]: true } }));
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
      setState(prev => ({ ...prev, keys: { ...prev.keys, [key]: false } }));
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!state.isControlling) return;
    
    rotRef.current.y += e.movementX * state.sensitivity;
    rotRef.current.p = Math.max(-89, Math.min(89, rotRef.current.p - e.movementY * state.sensitivity));
  };

  const animate = () => {
    if (!state.isControlling) return;

    const yawRad = (rotRef.current.y * Math.PI) / 180;
    const forward = { x: Math.cos(yawRad), y: Math.sin(yawRad) };
    const right = { x: -Math.sin(yawRad), y: Math.cos(yawRad) };

    const move = { x: 0, y: 0, z: 0 };
    if (state.keys.w) { move.x += forward.x; move.y += forward.y; }
    if (state.keys.s) { move.x -= forward.x; move.y -= forward.y; }
    if (state.keys.d) { move.x += right.x; move.y += right.y; }
    if (state.keys.a) { move.x -= right.x; move.y -= right.y; }
    if (state.keys.e) move.z += 1;
    if (state.keys.q) move.z -= 1;

    // Normalização e Escala
    const mag = Math.sqrt(move.x * move.x + move.y * move.y + move.z * move.z);
    if (mag > 0) {
      posRef.current.x += (move.x / mag) * state.speed;
      posRef.current.y += (move.y / mag) * state.speed;
      posRef.current.z += (move.z / mag) * state.speed;
    }

    onUpdate({ ...posRef.current }, { ...rotRef.current });
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (state.isControlling) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('mousemove', handleMouseMove);
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, [state.isControlling, state.keys]);

  const toggleControl = () => {
    if (!state.isControlling) {
       document.documentElement.requestPointerLock();
    } else {
       document.exitPointerLock();
    }
    setState(prev => ({ ...prev, isControlling: !prev.isControlling }));
  };

  const handleFOVChange = (val: number) => {
    setFov(val);
    if (onFOVUpdate) onFOVUpdate(val);
  };

  useEffect(() => {
    setFov(currentFOV);
  }, [currentFOV]);

  if (!isActive) return null;

  return (
    <div className="p-6 bg-md-surface1 border border-white/5 rounded-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-md-primary text-md-on-primary rounded-xl">
            <Move className="w-5 h-5 text-md-primary" />
          </div>
          <div>
            <h3 className="text-sm font-black text-md-text-strong uppercase tracking-tighter">Virtual Player Controller</h3>
            <p className="text-[10px] text-md-text-muted uppercase font-bold">Bridging Web & Unreal Engine</p>
          </div>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-2",
          state.isControlling ? "bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-white/5 text-md-text-muted"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full", state.isControlling ? "bg-emerald-500 animate-pulse" : "bg-md-text-muted")} />
          {state.isControlling ? 'Master Control Active' : 'Idle'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
               <span className="text-[9px] font-bold text-md-text-muted uppercase tracking-widest">Movement Stats</span>
               <Zap className="w-3 h-3 text-amber-500" />
          </div>
          <div className="space-y-3">
             <div className="flex justify-between text-[10px]">
                <span className="text-md-text-muted">Velocity</span>
                <span className="text-md-text-strong font-mono">{state.speed.toFixed(1)} uu/f</span>
             </div>
             <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-md-primary text-md-on-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(state.speed / 50) * 100}%` }}
                />
             </div>
             <input 
                type="range" 
                min="1" 
                max="100" 
                value={state.speed} 
                onChange={(e) => setState(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-md-surface3 rounded-xl appearance-none cursor-pointer accent-blue-500"
             />
          </div>
        </div>

        <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
               <span className="text-[9px] font-bold text-md-text-muted uppercase tracking-widest">Optics & Lens</span>
               <MousePointer2 className="w-3 h-3 text-cyan-500" />
          </div>
          <div className="space-y-3">
             <div className="flex justify-between text-[10px]">
                <span className="text-md-text-muted">Field of View</span>
                <div className="flex items-center gap-2">
                   <input 
                      type="number"
                      value={fov.toFixed(1)}
                      onChange={(e) => handleFOVChange(parseFloat(e.target.value) || 0)}
                      className="w-12 bg-transparent text-md-text-strong font-mono text-right focus:outline-none"
                   />
                   <span className="text-md-text-muted font-mono">DEG</span>
                </div>
             </div>
             <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((fov - 5) / 165) * 100}%` }}
                />
             </div>
             <input 
                type="range" 
                min="5" 
                max="170" 
                step="0.1"
                value={fov} 
                onChange={(e) => handleFOVChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-md-surface3 rounded-xl appearance-none cursor-pointer accent-cyan-500"
             />
          </div>
        </div>
      </div>

      <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col justify-center gap-4">
          {onBootstrap && (
            <button 
              onClick={onBootstrap}
              className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-xl text-[10px] font-black uppercase transition-all mb-1"
            >
              Bootstrap UE Environment (Python)
            </button>
          )}
          <button 
            onClick={toggleControl}
            disabled={!activeActor}
            className={cn(
              "w-full py-4 rounded-2xl text-xs font-black uppercase transition-all flex items-center justify-center gap-3",
              !activeActor ? "bg-white/5 text-md-text-muted cursor-not-allowed" :
              state.isControlling ? "bg-rose-500 text-md-text-strong shadow-lg shadow-rose-500/20" : "bg-md-primary text-md-on-primary hover:opacity-90"
            )}
          >
            {state.isControlling ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                Desativar Controle (ESC)
              </>
            ) : (
              <>
                <MousePointer2 className="w-4 h-4" />
                Assumir Controle Direto
              </>
            )}
          </button>
          {!activeActor && <p className="text-[9px] text-rose-500/60 uppercase font-bold text-center">Selecione um ator no Inspector para controlar</p>}
        </div>

      <div className="flex items-center gap-6 justify-center pt-2">
         <div className="flex flex-col items-center gap-2 opacity-40">
            <div className="flex gap-2">
               <div className={cn("px-2 py-1 rounded border border-white/10 text-[9px]", state.keys.w && "bg-white/20")}>W</div>
            </div>
            <div className="flex gap-2">
               <div className={cn("px-2 py-1 rounded border border-white/10 text-[9px]", state.keys.a && "bg-white/20")}>A</div>
               <div className={cn("px-2 py-1 rounded border border-white/10 text-[9px]", state.keys.s && "bg-white/20")}>S</div>
               <div className={cn("px-2 py-1 rounded border border-white/10 text-[9px]", state.keys.d && "bg-white/20")}>D</div>
            </div>
         </div>
         <div className="h-8 w-px bg-white/5" />
         <div className="text-[9px] text-md-text-muted uppercase font-medium leading-relaxed">
            <span className="text-md-text-strong">Mouse</span>: Rotate Camera<br/>
            <span className="text-md-text-strong">W/A/S/D</span>: Local Movement<br/>
            <span className="text-md-text-strong">Q/E</span>: Elevation (Z-Axis)
         </div>
      </div>
    </div>
  );
};
