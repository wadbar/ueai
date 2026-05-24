import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Folder, File, Server, Moon, Sun, Search, Activity, Cpu, HardDrive, Clock, X, AlertTriangle, Code, Braces, Image as ImageIcon, Palette, Database, Globe, Terminal, ChevronUp, ChevronDown } from 'lucide-react';

const getFileIcon = (filename: string, isDir: boolean) => {
  if (isDir) return <Folder className="w-4 h-4 text-blue-400" />;
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
  
  // Real I/O state
  const [realFiles, setRealFiles] = useState<{name: string, isDirectory: boolean}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  type SortKey = 'name' | 'type';
  type SortDirection = 'asc' | 'desc';
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('/api/system/files');
        if (!response.ok) throw new Error('Falha HTTP ao ler arquivos');
        const data = await response.json();
        setRealFiles(data);
      } catch (err) {
        console.error("Falha ao recuperar os arquivos do disco", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFiles();
  }, []);

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
    let files = realFiles;
    if (searchTerm.trim()) {
      files = realFiles.filter((file) => {
        if (isCaseSensitive) {
          return file.name.includes(searchTerm);
        }
        return file.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    return [...files].sort((a, b) => {
      let aValue = a.name.toLowerCase();
      let bValue = b.name.toLowerCase();
      if (sortConfig.key === 'type') {
        aValue = a.isDirectory ? '000_folder' : (a.name.split('.').pop()?.toLowerCase() || '');
        bValue = b.isDirectory ? '000_folder' : (b.name.split('.').pop()?.toLowerCase() || '');
      }
      const compare = aValue.localeCompare(bValue);
      return sortConfig.direction === 'asc' ? compare : -compare;
    });
  }, [searchTerm, isCaseSensitive, sortConfig, realFiles]);

  const highlightMatch = (text: string) => {
    if (!searchTerm.trim()) return text;
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

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="m3-card h-full relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--md-sys-color-on-surface)]">
          <Folder className="w-5 h-5 text-[var(--md-sys-color-primary)]" />
          <h3 className="font-bold text-lg text-[var(--md-sys-color-on-surface)]">File Manager Real-Time</h3>
        </div>
      </div>
      
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Filter files on disk..."
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
            className="m3-input pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--md-sys-color-on-surface-variant)] pointer-events-none" />
          {searchTerm && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] px-2 py-0.5 rounded-full border border-[var(--md-sys-color-outline-variant)] pointer-events-none">
              {filteredFiles.length}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCaseSensitive(!isCaseSensitive)}
          title={isCaseSensitive ? "Case sensitive" : "Case insensitive"}
          className={isCaseSensitive ? 'm3-button-filled' : 'm3-button-tonal'}
        >
          Aa
        </button>
      </div>

      {recentSearches.length > 0 && !searchTerm && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Recent Searches
            </div>
            <button 
              onClick={clearHistory}
              className="m3-button-tonal"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term, idx) => (
              <button
                key={idx}
                onClick={() => setSearchTerm(term)}
                className="m3-button-tonal"
              >
                <Search className="w-4 h-4 text-[var(--md-sys-color-on-surface-variant)]" />
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File List Header */}
      <div className="flex items-center px-4 py-2 bg-[var(--md-sys-color-surface-container-high)] rounded-xl border border-[var(--md-sys-color-outline-variant)]">
        <button 
          className="m3-button-tonal flex-1 justify-between shadow-none border-none bg-transparent"
          onClick={() => handleSort('name')}
        >
          File Name
          {sortConfig.key === 'name' && (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
          )}
        </button>
        <button 
          className="m3-button-tonal shadow-none border-none bg-transparent"
          onClick={() => handleSort('type')}
        >
          Type
          {sortConfig.key === 'type' && (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      <div ref={listContainerRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-2 relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-[var(--md-sys-color-surface-container)] flex items-center justify-center">
            <div className="animate-spin-slow rounded-full h-8 w-8 border-b-2 border-[var(--md-sys-color-primary)]"></div>
          </div>
        )}
        <AnimatePresence>
          {filteredFiles.map((fileInfo, idx) => (
            <motion.div
              key={fileInfo.name}
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
              <div className="flex-1 flex items-center gap-4 text-[var(--md-sys-color-on-surface)]">
                {getFileIcon(fileInfo.name, fileInfo.isDirectory)}
                <span className="text-sm font-mono break-all">
                  {highlightMatch(fileInfo.name)}
                </span>
              </div>
              <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] uppercase font-bold w-24 text-right">
                {fileInfo.isDirectory ? 'DIR' : (fileInfo.name.split('.').length > 1 ? fileInfo.name.split('.').pop() : 'FILE')}
              </span>
            </motion.div>
          ))}
          {!isLoading && filteredFiles.length === 0 && (
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
    let isMounted = true;
    
    // Fill local buffers to initialize line charts seamlessly
    const initialData = Array.from({ length: 20 }).map(() => ({ time: '', cpu: 0, memory: 0 }));
    setData(initialData);

    const pullMetrics = async () => {
      try {
        const res = await fetch('/api/system/resources');
        if (!res.ok) throw new Error('OS_PROBE_FAILED');
        const metrics = await res.json();
        
        if (isMounted) {
          setData(prevData => {
            const newData = [...prevData.slice(1)];
            const t = new Date();
            
            const cpuVal = metrics.cpu || 0;
            const memVal = metrics.memory || 0;
            
            newData.push({
              time: `${t.getSeconds()}s`,
              cpu: cpuVal,
              memory: memVal
            });

            if (cpuVal > 85) consecutiveHighTicks.current.cpu += 1;
            else consecutiveHighTicks.current.cpu = 0;

            if (memVal > 85) consecutiveHighTicks.current.memory += 1;
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
        }
      } catch (err) {
        // Silent recovery
      }
    };

    const interval = setInterval(() => pullMetrics().catch(() => {}), 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="m3-card h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--md-sys-color-primary)]" />
          <h3 className="font-bold text-lg text-[var(--md-sys-color-on-surface)]">System Resources</h3>
        </div>
      </div>

      <AnimatePresence>
        {alertState.active && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)] uppercase tracking-widest mb-1">System Alert</h4>
                <p className="text-sm text-[var(--md-sys-color-on-surface)]">{alertState.message}</p>
              </div>
              <button 
                onClick={() => setAlertState({ active: false, message: '' })}
                className="m3-button-tonal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--md-sys-color-surface-container-high)] p-4 rounded-2xl border border-[var(--md-sys-color-outline-variant)] flex flex-col">
          <div className="flex items-center gap-2 text-[var(--md-sys-color-on-surface-variant)] text-xs font-bold uppercase tracking-wider mb-2">
            <Cpu className="w-3.5 h-3.5" />
            CPU Load (Real-Time)
          </div>
          <div className="text-2xl font-black text-[var(--md-sys-color-on-surface)]">
            {data.length > 0 ? (data[data.length - 1].cpu || 0).toFixed(1) : 0}%
          </div>
        </div>
        <div className="bg-[var(--md-sys-color-surface-container-high)] p-4 rounded-2xl border border-[var(--md-sys-color-outline-variant)] flex flex-col">
          <div className="flex items-center gap-2 text-[var(--md-sys-color-on-surface-variant)] text-xs font-bold uppercase tracking-wider mb-2">
            <HardDrive className="w-3.5 h-3.5" />
            RAM Usage (Real-Time)
          </div>
          <div className="text-2xl font-black text-[var(--md-sys-color-on-surface)]">
            {data.length > 0 ? (data[data.length - 1].memory || 0).toFixed(1) : 0}%
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
            <Line type="monotone" dataKey="memory" stroke="var(--md-sys-color-primary-container)" strokeWidth={3} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- Main Panel Component ---
export const Panel = () => {
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    const saved = localStorage.getItem('ue_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [showServerPanel, setShowServerPanel] = useState(true);

  // Theme toggle function that updates HTML data-theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ue_theme', theme);
    
    // Dispatch custom event for same-window syncing
    window.dispatchEvent(new Event('ue_theme_changed'));
    
    const handleStorage = () => {
      const saved = localStorage.getItem('ue_theme');
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('ue_theme_changed', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('ue_theme_changed', handleStorage);
    };
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
          <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] mt-1">System overview and remote Node telemetry</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowServerPanel(!showServerPanel)}
            className="m3-button-filled"
          >
            Toggle Server Panel
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="m3-button-tonal"
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
                <div className="m3-card">
                  <div className="flex items-center gap-2 text-[var(--md-sys-color-on-surface-variant)]">
                    <Server className="w-5 h-5 text-[var(--md-sys-color-primary)]" />
                    <h3 className="font-bold text-lg text-[var(--md-sys-color-on-surface)]">Server Panel</h3>
                  </div>
                  <p className="text-sm text-[var(--md-sys-color-on-surface-variant)]">
                    Connected to regional edge node. OS Telemetry and File I/O active.
                  </p>
                  <div className="flex items-center gap-3">
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
