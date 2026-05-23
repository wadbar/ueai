import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Folder, File, Server, Moon, Sun, Search, Activity, Cpu, HardDrive, Clock, X, AlertTriangle, Code, Braces, Image as ImageIcon, Palette, Database, Globe, Terminal } from 'lucide-react';

// --- FileManagerSection Component ---
const initialFiles = [
  'server.ts',
  'package.json',
  'api/routes.ts',
  'config/database.yml',
  'logs/system.log',
  'src/index.css',
  'src/App.tsx',
  'assets/logo.png',
  'public/index.html',
  'Dockerfile'
];

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <Code className="w-4 h-4 text-blue-500" />;
    case 'json':
      return <Braces className="w-4 h-4 text-yellow-500" />;
    case 'png':
    case 'jpg':
    case 'svg':
      return <ImageIcon className="w-4 h-4 text-purple-500" />;
    case 'css':
      return <Palette className="w-4 h-4 text-pink-500" />;
    case 'yml':
    case 'yaml':
      return <Database className="w-4 h-4 text-green-500" />;
    case 'html':
      return <Globe className="w-4 h-4 text-orange-500" />;
    default:
      if (filename.includes('Dockerfile')) return <Terminal className="w-4 h-4 text-cyan-500" />;
      return <File className="w-4 h-4 text-[var(--md-sys-color-on-surface-variant)]" />;
  }
};

const FileManagerSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isCaseSensitive, setIsCaseSensitive] = useState(() => {
    return localStorage.getItem('ue_case_sensitive') === 'true';
  });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const listContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const saved = localStorage.getItem('ue_recent_searches');
    if (saved) {
      try { setRecentSearches(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ue_case_sensitive', isCaseSensitive.toString());
  }, [isCaseSensitive]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchTerm, isCaseSensitive]);

  // Scroll active item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listContainerRef.current) {
      const children = Array.from(listContainerRef.current.children) as HTMLElement[];
      const activeElement = children[selectedIndex];
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const saveSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const newHistory = [trimmed, ...prev.filter(t => t !== trimmed)].slice(0, 5);
      localStorage.setItem('ue_recent_searches', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('ue_recent_searches');
  };

  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return initialFiles;
    return initialFiles.filter(file => {
      if (isCaseSensitive) {
        return file.includes(searchTerm);
      }
      return file.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [searchTerm, isCaseSensitive]);

  const highlightMatch = (text: string) => {
    if (!searchTerm.trim()) return text;
    // Escape searchTerm for regex safety
    const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = isCaseSensitive ? 'g' : 'gi';
    const regex = new RegExp(`(${safeTerm})`, flags);
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => {
          const isMatch = isCaseSensitive ? part === searchTerm : part.toLowerCase() === searchTerm.toLowerCase();
          return isMatch ? (
            <span key={i} className="bg-yellow-500/20 text-[var(--md-sys-color-on-surface)] font-bold px-0.5 rounded">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </>
    );
  };

  return (
    <div className="bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-3xl p-6 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[var(--md-sys-color-primary)]">
          <Folder className="w-5 h-5" />
          <h3 className="font-bold text-lg text-[var(--md-sys-color-on-surface)]">File Manager</h3>
        </div>
      </div>
      
      <div className="relative mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--md-sys-color-on-surface-variant)]" />
          <input
            type="text"
            placeholder="Filter files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveSearchTerm(searchTerm);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
              }
            }}
            className="w-full bg-[var(--md-sys-color-surface-container-highest)] border border-[var(--md-sys-color-outline)] rounded-full pl-10 pr-4 py-3 text-[15px] min-h-[48px] text-[var(--md-sys-color-on-surface)] focus:outline-none focus:border-[var(--md-sys-color-primary)] transition-colors"
          />
          {searchTerm && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] px-2 py-0.5 rounded-full border border-[var(--md-sys-color-outline-variant)] pointer-events-none">
              {filteredFiles.length}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCaseSensitive(!isCaseSensitive)}
          title={isCaseSensitive ? "Case sensitive" : "Case insensitive"}
          className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-full text-base font-bold transition-colors border ${isCaseSensitive ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border-[var(--md-sys-color-primary)]' : 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)] border-[var(--md-sys-color-outline)] hover:border-[var(--md-sys-color-primary)]'}`}
        >
          Aa
        </button>
      </div>

      {recentSearches.length > 0 && !searchTerm && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Recent Searches
            </div>
            <button 
              onClick={clearHistory}
              className="text-xs min-h-[44px] px-4 -mr-4 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary)]/10 uppercase font-bold rounded-full transition-colors flex items-center justify-center"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term, idx) => (
              <button
                key={idx}
                onClick={() => setSearchTerm(term)}
                className="bg-[var(--md-sys-color-surface-container-highest)] hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] px-4 py-2 min-h-[44px] rounded-full text-sm transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-[var(--md-sys-color-on-surface-variant)]" />
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={listContainerRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
        <AnimatePresence>
          {filteredFiles.map((file, idx) => (
            <motion.div
              key={file}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-4 p-4 min-h-[56px] rounded-2xl border cursor-pointer transition-colors ${
                selectedIndex === idx 
                  ? 'bg-[var(--md-sys-color-surface-container-high)] border-[var(--md-sys-color-primary)]' 
                  : 'hover:bg-[var(--md-sys-color-surface-container-high)] border-transparent hover:border-[var(--md-sys-color-outline-variant)]'
              }`}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              {getFileIcon(file)}
              <span className="text-sm text-[var(--md-sys-color-on-surface)] font-mono">
                {highlightMatch(file)}
              </span>
            </motion.div>
          ))}
          {filteredFiles.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-4 text-sm text-[var(--md-sys-color-on-surface-variant)]"
            >
              No matching files found.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- MonitoringWidget Component (Recharts) ---
const MonitoringWidget = () => {
  const [data, setData] = useState<{ time: string, cpu: number, memory: number }[]>([]);
  const [alertState, setAlertState] = useState<{ active: boolean, message: string }>({ active: false, message: '' });
  
  // Track consecutive seconds over 85%
  const consecutiveHighTicks = React.useRef({ cpu: 0, memory: 0 });

  useEffect(() => {
    // Fill initial data
    const now = new Date();
    const initialData = Array.from({ length: 20 }).map((_, i) => {
      const t = new Date(now.getTime() - (20 - i) * 1000);
      return {
        time: `${t.getSeconds()}s`,
        cpu: 10 + Math.random() * 20,
        memory: 40 + Math.random() * 10
      };
    });
    setData(initialData);

    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData.slice(1)];
        const currentT = new Date();
        const nextCpu = Math.max(0, Math.min(100, (newData[newData.length - 1]?.cpu || 30) + (Math.random() * 20 - 10)));
        const nextMem = Math.max(0, Math.min(100, (newData[newData.length - 1]?.memory || 50) + (Math.random() * 10 - 5)));
        
        newData.push({
          time: `${currentT.getSeconds()}s`,
          cpu: nextCpu,
          memory: nextMem
        });

        // Threshold logic (5 minutes = 300 seconds)
        if (nextCpu > 85) consecutiveHighTicks.current.cpu += 1;
        else consecutiveHighTicks.current.cpu = 0;

        if (nextMem > 85) consecutiveHighTicks.current.memory += 1;
        else consecutiveHighTicks.current.memory = 0;

        if (consecutiveHighTicks.current.cpu >= 300) {
          setAlertState({ active: true, message: 'CRITICAL: CPU usage exceeded 85% for over 5 minutes.' });
        } else if (consecutiveHighTicks.current.memory >= 300) {
          setAlertState({ active: true, message: 'CRITICAL: Memory usage exceeded 85% for over 5 minutes.' });
        } else if (consecutiveHighTicks.current.cpu < 300 && consecutiveHighTicks.current.memory < 300) {
          setAlertState(prev => prev.active ? { active: false, message: '' } : prev);
        }

        return newData;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-3xl p-6 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--md-sys-color-primary)]" />
          <h3 className="font-bold text-lg text-[var(--md-sys-color-on-surface)]">System Resources</h3>
        </div>
      </div>

      <AnimatePresence>
        {alertState.active && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-1">System Alert</h4>
                <p className="text-sm text-[var(--md-sys-color-on-surface)]">{alertState.message}</p>
              </div>
              <button 
                onClick={() => setAlertState({ active: false, message: '' })}
                className="w-11 h-11 flex items-center justify-center hover:bg-red-500/20 rounded-full transition-colors text-red-500 shrink-0 -mt-1 -mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[var(--md-sys-color-surface-container-high)] p-4 rounded-2xl border border-[var(--md-sys-color-outline-variant)] flex flex-col">
          <div className="flex items-center gap-2 text-[var(--md-sys-color-on-surface-variant)] text-xs font-bold uppercase tracking-wider mb-2">
            <Cpu className="w-3.5 h-3.5" />
            CPU Load
          </div>
          <div className="text-2xl font-black text-[var(--md-sys-color-primary)]">
            {data.length > 0 ? data[data.length - 1].cpu.toFixed(1) : 0}%
          </div>
        </div>
        <div className="bg-[var(--md-sys-color-surface-container-high)] p-4 rounded-2xl border border-[var(--md-sys-color-outline-variant)] flex flex-col">
          <div className="flex items-center gap-2 text-[var(--md-sys-color-on-surface-variant)] text-xs font-bold uppercase tracking-wider mb-2">
            <HardDrive className="w-3.5 h-3.5" />
            Memory Usage
          </div>
          <div className="text-2xl font-black text-[var(--md-sys-color-tertiary)]">
            {data.length > 0 ? data[data.length - 1].memory.toFixed(1) : 0}%
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline-variant)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--md-sys-color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--md-sys-color-on-surface-variant)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--md-sys-color-surface-container-highest)', 
                borderColor: 'var(--md-sys-color-outline)',
                borderRadius: '16px',
                color: 'var(--md-sys-color-on-surface)'
              }}
              itemStyle={{ color: 'var(--md-sys-color-on-surface)' }}
            />
            <Line type="monotone" dataKey="cpu" stroke="var(--md-sys-color-primary)" strokeWidth={3} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="memory" stroke="var(--md-sys-color-tertiary)" strokeWidth={3} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- Main Panel Component ---
export const Panel = () => {
  const [theme, setTheme] = useState<'light'|'dark'>('dark');
  const [showServerPanel, setShowServerPanel] = useState(true);

  // Theme toggle function that updates HTML data-theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-6 bg-[var(--md-sys-color-background)]">
      
      {/* Header & Controls */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)]">Dashboard Panel</h2>
          <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] mt-1">System overview and control center</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowServerPanel(!showServerPanel)}
            className="px-4 py-2 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] rounded-full text-sm font-bold shadow-sm"
          >
            Toggle Server Panel
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-3 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] rounded-full shadow-sm transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      {/* Main Grid Layout (max-w-7xl, CSS Grid, responsive) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - System Monitoring */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <MonitoringWidget />
        </div>

        {/* Right Column - File Manager & Server Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-[600px] lg:h-auto">
          
          {/* Server Panel with AnimatePresence */}
          <AnimatePresence>
            {showServerPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.9 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-[var(--md-sys-color-secondary)]">
                    <Server className="w-5 h-5" />
                    <h3 className="font-bold text-lg text-[var(--md-sys-color-on-surface)]">Server Panel</h3>
                  </div>
                  <p className="text-sm text-[var(--md-sys-color-on-surface-variant)]">
                    Connected to regional edge node. All systems are operating normally.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    <span className="text-xs font-mono font-bold text-[var(--md-sys-color-on-surface)]">STATUS: ONLINE</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 min-h-[300px]">
            <FileManagerSection />
          </div>

        </div>
      </div>
    </div>
  );
};
