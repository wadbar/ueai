import React, { useState, useEffect, useRef } from 'react';
import { Activity, Settings2, Minimize2, Maximize2, AlertTriangle, Pause, Play, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

function AnimatedNumber({ value, formatFn }: { value: number; formatFn?: (v: number) => string }) {
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
  });

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  const display = useTransform(springValue, (v: number) => formatFn ? formatFn(v) : Math.round(v).toString());
  return <motion.span>{display as any}</motion.span>;
}

interface PerformanceHUDProps {
  stats: { 
    drawCalls: number, 
    triangles: number,
    cameraMetadata?: {
      name: string;
      rotation: { pitch: number; yaw: number; roll: number };
      fov?: number;
      isCamera: boolean;
    } | null
  } | null;
}

export function PerformanceHUD({ stats }: PerformanceHUDProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button, input')) return; // Ignore if clicking a button or input
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging.current) return;
    setPosition({
      x: dragStart.current.startX + (e.clientX - dragStart.current.x),
      y: dragStart.current.startY + (e.clientY - dragStart.current.y)
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    isDragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const [throttledStats, setThrottledStats] = useState(stats);
  const [opacity, setOpacity] = useState(0.8);
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'detailed' | 'lightweight'>('detailed');
  const [history, setHistory] = useState<{ time: number; drawCalls: number; triangles: number }[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [thresholds, setThresholds] = useState({
    dcAmber: 2000,
    dcRed: 5000,
    trisAmber: 1000000,
    trisRed: 5000000,
  });
  
  // Critical warnings
  const [isCriticalWarning, setIsCriticalWarning] = useState(false);
  const criticalStartTimeRef = useRef<number | null>(null);

  const playWarningSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.5); 
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1);
    } catch (e) {
      // Audio might be blocked by browser policy before user interaction
    }
  };

  useEffect(() => {
    if (isCriticalWarning) {
      playWarningSound();
    }
  }, [isCriticalWarning]);

  const lastUpdateRef = useRef<number>(Date.now());
  const pendingUpdateRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!stats) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    const THROTTLE_MS = 500;

    const applyStats = (newStats: { drawCalls: number, triangles: number }) => {
      if (isPaused) {
        // Still add to history so it doesn't leave gaps, but don't update current HUD
        setHistory(prev => {
          const newHistory = [...prev, { time: Date.now(), ...newStats }];
          const thirtySecondsAgo = Date.now() - 30000;
          return newHistory.filter(h => h.time > thirtySecondsAgo).slice(-15);
        });
        return;
      }

      setThrottledStats(newStats);
      
      setHistory(prev => {
        const newHistory = [...prev, { time: Date.now(), ...newStats }];
        // Keep last 30 seconds (assuming ~4s polling, buffer up to 15 items to be safe)
        const thirtySecondsAgo = Date.now() - 30000;
        return newHistory.filter(h => h.time > thirtySecondsAgo).slice(-15);
      });

      // Check critical limits
      const isOverLimit = newStats.drawCalls > thresholds.dcRed || newStats.triangles > thresholds.trisRed;
      if (isOverLimit) {
        if (criticalStartTimeRef.current === null) {
          criticalStartTimeRef.current = Date.now();
        } else if (Date.now() - criticalStartTimeRef.current > 3000) {
          setIsCriticalWarning(true);
        }
      } else {
        criticalStartTimeRef.current = null;
        setIsCriticalWarning(false);
      }
    };

    if (timeSinceLastUpdate >= THROTTLE_MS) {
      applyStats(stats);
      lastUpdateRef.current = now;
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    } else {
      if (!pendingUpdateRef.current) {
        pendingUpdateRef.current = setTimeout(() => {
          applyStats(stats);
          lastUpdateRef.current = Date.now();
          pendingUpdateRef.current = null;
        }, THROTTLE_MS - timeSinceLastUpdate);
      }
    }
  }, [stats, isPaused, thresholds]);

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (pendingUpdateRef.current) clearTimeout(pendingUpdateRef.current);
    };
  }, []);

  if (!throttledStats) return null;

  const getDrawCallColor = (dc: number) => {
    if (dc < thresholds.dcAmber) return 'text-emerald-500';
    if (dc < thresholds.dcRed) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getDrawCallBg = (dc: number) => {
    if (dc < thresholds.dcAmber) return 'bg-emerald-500/10 border-emerald-500/20';
    if (dc < thresholds.dcRed) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-rose-500/10 border-rose-500/20';
  };

  const getTrianglesColor = (tris: number) => {
    if (tris < thresholds.trisAmber) return 'text-emerald-500';
    if (tris < thresholds.trisRed) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getTrianglesBg = (tris: number) => {
    if (tris < thresholds.trisAmber) return 'bg-emerald-500/10 border-emerald-500/20';
    if (tris < thresholds.trisRed) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-rose-500/10 border-rose-500/20';
  };

  const formatTris = (tris: number) => {
    if (tris >= 1000000) return (tris / 1000000).toFixed(2) + 'M';
    if (tris >= 1000) return (tris / 1000).toFixed(1) + 'K';
    return tris.toString();
  };

  const downloadCSV = () => {
    if (history.length === 0) return;
    const header = "Time,Draw Calls,Triangles\n";
    const rows = history.map(h => {
      const date = new Date(h.time).toISOString();
      return `${date},${h.drawCalls},${h.triangles}`;
    }).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ue5_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const smoothedHistory = history.map((point, i, arr) => {
    const windowSize = 3;
    let sumDrawCalls = 0;
    let sumTriangles = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
      sumDrawCalls += arr[j].drawCalls;
      sumTriangles += arr[j].triangles;
      count++;
    }
    return {
      ...point,
      drawCalls: Math.round(sumDrawCalls / count),
      triangles: Math.round(sumTriangles / count)
    };
  });

  if (isMinimized) {
    return (
      <motion.div 
        className="PerformanceHUD fixed top-4 right-4 sm:top-6 sm:right-6 md:top-[10vh] md:right-[4vw] z-50 pointer-events-auto"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <button 
          onClick={() => setIsMinimized(false)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-12 h-12 bg-md-surface1/80 backdrop-blur-2xl border border-md-border/50 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.15)] flex items-center justify-center hover:bg-md-surface2 hover:scale-105 active:scale-95 transition-all cursor-grab active:cursor-grabbing"
          title="Restore Performance HUD"
        >
          <Activity className="w-5 h-5 text-md-primary" />
        </button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
        animate={{ opacity: opacity, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
        style={{ 
          opacity: opacity,
          transform: `translate(${position.x}px, ${position.y}px)`
        }}
        className={cn(
          "PerformanceHUD fixed top-4 right-4 sm:top-6 sm:right-6 md:top-[10vh] md:right-[4vw] z-50 bg-md-surface1/80 backdrop-blur-2xl border p-5 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex flex-col gap-4 w-[min(95vw,300px)] transition-[border-color,box-shadow,opacity]",
          isCriticalWarning ? "border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse" : "border-md-border/50",
          (showSettings || isMinimized === false) ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div 
          className="flex justify-between items-center pointer-events-auto cursor-grab active:cursor-grabbing pb-1"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="text-[10px] text-md-text-muted font-bold tracking-widest uppercase flex items-center gap-2 mb-1">
            <Activity className={cn("w-3 h-3", isCriticalWarning ? "text-rose-500" : "text-md-primary")} />
            {isCriticalWarning ? (
              <span className="text-rose-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                CRITICAL LOAD
              </span>
            ) : 'UE5 Telemetry HUD'}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={downloadCSV}
              className="p-1.5 rounded-md text-md-text-muted hover:text-md-text hover:bg-white/5 transition-colors"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className={cn("p-1.5 rounded-md transition-colors", isPaused ? "bg-amber-500/10 text-amber-500" : "text-md-text-muted hover:text-md-text hover:bg-white/5")}
              title={isPaused ? "Resume Updates" : "Pause Updates"}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={cn("p-1.5 rounded-md transition-colors", showSettings ? "bg-md-primary/10 text-md-primary" : "text-md-text-muted hover:text-md-text hover:bg-white/5")}
              title="Settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-md text-md-text-muted hover:text-md-text hover:bg-white/5 transition-colors"
              title="Minimize"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="p-3 bg-md-surface2 rounded-xl border border-md-border mb-2 pointer-events-auto flex flex-col gap-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-md-text-muted uppercase tracking-wider">HUD Opacity</label>
                <span className="text-[10px] text-md-text font-mono">{Math.round(opacity * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="1" 
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-md-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-md-text-muted uppercase tracking-wider mb-2 block">HUD Layout</label>
              <div className="flex bg-md-surface1 rounded-md overflow-hidden border border-md-border">
                <button 
                  onClick={() => setLayoutMode('detailed')}
                  className={cn("flex-1 py-1.5 text-[11px] font-bold transition-colors", layoutMode === 'detailed' ? "bg-md-primary/20 text-md-primary" : "text-md-text-muted hover:bg-white/5")}
                >
                  Detailed
                </button>
                <button 
                  onClick={() => setLayoutMode('lightweight')}
                  className={cn("flex-1 py-1.5 text-[11px] font-bold transition-colors", layoutMode === 'lightweight' ? "bg-md-primary/20 text-md-primary" : "text-md-text-muted hover:bg-white/5")}
                >
                  Lightweight
                </button>
              </div>
            </div>
            <div className="pt-2 border-t border-md-border">
              <label className="text-[10px] font-bold text-md-text-muted uppercase tracking-wider mb-2 block">Thresholds</label>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-amber-500">Draw Calls (Amber/Red)</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={thresholds.dcAmber}
                      onChange={(e) => setThresholds({...thresholds, dcAmber: parseInt(e.target.value) || 2000})}
                      className="w-full bg-md-surface1 border border-md-border rounded p-1 text-xs text-md-text font-mono outline-none focus:border-amber-500" 
                    />
                    <input 
                      type="number" 
                      value={thresholds.dcRed}
                      onChange={(e) => setThresholds({...thresholds, dcRed: parseInt(e.target.value) || 5000})}
                      className="w-full bg-md-surface1 border border-md-border rounded p-1 text-xs text-md-text font-mono outline-none focus:border-rose-500" 
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-amber-500">Triangles (Amber/Red)</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={thresholds.trisAmber}
                      onChange={(e) => setThresholds({...thresholds, trisAmber: parseInt(e.target.value) || 1000000})}
                      className="w-full bg-md-surface1 border border-md-border rounded p-1 text-xs text-md-text font-mono outline-none focus:border-amber-500" 
                    />
                    <input 
                      type="number" 
                      value={thresholds.trisRed}
                      onChange={(e) => setThresholds({...thresholds, trisRed: parseInt(e.target.value) || 5000000})}
                      className="w-full bg-md-surface1 border border-md-border rounded p-1 text-xs text-md-text font-mono outline-none focus:border-rose-500" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          {/* Draw Calls Block */}
          <div className={cn("p-2.5 rounded-xl border flex flex-col gap-1 transition-colors pointer-events-auto", getDrawCallBg(throttledStats.drawCalls))}>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-md-text font-bold uppercase tracking-wider">Draw Calls</span>
              <span className={cn("text-sm font-black font-mono tracking-tight", getDrawCallColor(throttledStats.drawCalls))}>
                <AnimatedNumber value={throttledStats.drawCalls} />
              </span>
            </div>
            {layoutMode === 'detailed' && (
              <div className="h-8 w-full select-none pointer-events-none mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={smoothedHistory}>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Line 
                      type="monotone" 
                      dataKey="drawCalls" 
                      stroke={throttledStats.drawCalls > thresholds.dcRed ? '#f43f5e' : (throttledStats.drawCalls > thresholds.dcAmber ? '#f59e0b' : '#10b981')} 
                      strokeWidth={2} 
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* Triangles Block */}
          <div className={cn("p-2.5 rounded-xl border flex flex-col gap-1 transition-colors pointer-events-auto", getTrianglesBg(throttledStats.triangles))}>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-md-text font-bold uppercase tracking-wider">Triangles</span>
              <span className={cn("text-sm font-black font-mono tracking-tight", getTrianglesColor(throttledStats.triangles))}>
                <AnimatedNumber value={throttledStats.triangles} formatFn={formatTris} />
              </span>
            </div>
            {layoutMode === 'detailed' && (
              <div className="h-8 w-full select-none pointer-events-none mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={smoothedHistory}>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Line 
                      type="monotone" 
                      dataKey="triangles" 
                      stroke={throttledStats.triangles > thresholds.trisRed ? '#f43f5e' : (throttledStats.triangles > thresholds.trisAmber ? '#f59e0b' : '#10b981')} 
                      strokeWidth={2} 
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* Active Camera/Object Metadata Overlay */}
          {throttledStats.cameraMetadata && (
            <div className="mt-2 p-2.5 rounded-xl border border-md-border/50 bg-md-surface2/50 flex flex-col gap-1.5 pointer-events-auto">
              <div className="text-[10px] text-md-text-muted font-bold uppercase tracking-wider mb-1">
                {throttledStats.cameraMetadata.isCamera ? 'Camera Metadata' : 'Selected Object'}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-md-text-muted">Target</span>
                <span className="font-mono text-md-text truncate max-w-[120px]" title={throttledStats.cameraMetadata.name}>
                  {throttledStats.cameraMetadata.name}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-md-text-muted">Rotation</span>
                <div className="font-mono text-[10px] text-md-primary flex gap-1">
                  <span>P:{Math.round(throttledStats.cameraMetadata.rotation.pitch)}°</span>
                  <span>Y:{Math.round(throttledStats.cameraMetadata.rotation.yaw)}°</span>
                  <span>R:{Math.round(throttledStats.cameraMetadata.rotation.roll)}°</span>
                </div>
              </div>
              {throttledStats.cameraMetadata.isCamera && throttledStats.cameraMetadata.fov !== undefined && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-md-text-muted">FOV / Lens</span>
                  <span className="font-mono text-emerald-400">
                    {Math.round(throttledStats.cameraMetadata.fov)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
