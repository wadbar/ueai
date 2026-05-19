import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Shield, AlertTriangle, Info, Trash2, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';

interface AuditLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  metadata?: any;
}

export const AuditTerminal: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // [WADBAR_NETWORK_PATTERN]: Conexão Socket.IO com monitoramento de batimento
    socketRef.current = io(window.location.origin);

    socketRef.current.on('audit_log', (log: AuditLog) => {
      setLogs(prev => [...prev.slice(-99), { ...log, id: Math.random().toString(36).substr(2, 9) }]);
      
      // Auto-scroll logic com debounced threshold
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        if (isNearBottom) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(filter.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="flex flex-col h-full bg-[#050505] font-mono">
      <div className="p-4 border-b border-[#202024] bg-[#0A0A0B] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em]">Live Audit System v12</h3>
            <p className="text-[10px] text-[#4D4D57]">Monitoramento em tempo real de subprocessos e requisições.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4D4D57]" />
            <input 
              type="text" 
              placeholder="FILTRAR_LOGS..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#121214] border border-[#202024] rounded-lg px-9 py-1.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50 w-64 transition-all"
            />
          </div>
          
          <select 
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="bg-[#121214] border border-[#202024] rounded-lg px-3 py-1.5 text-[10px] text-white focus:outline-none"
          >
            <option value="all">ALL_LEVELS</option>
            <option value="info">INFO</option>
            <option value="warn">WARN</option>
            <option value="error">ERROR</option>
          </select>

          <button 
            onClick={() => setLogs([])}
            className="p-2 hover:bg-red-500/10 text-[#4D4D57] hover:text-red-500 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto p-4 space-y-1 custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {filteredLogs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 py-1 group hover:bg-white/[0.02] transition-all rounded px-2"
            >
              <span className="text-[10px] text-[#4D4D57] min-w-[80px] whitespace-nowrap">
                [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
              </span>
              
              <span className={`text-[10px] font-bold uppercase min-w-[50px] ${
                log.level === 'error' ? 'text-red-500' : 
                log.level === 'warn' ? 'text-amber-500' : 
                'text-blue-500'
              }`}>
                {log.level}
              </span>

              <p className="text-[11px] text-[#E1E1E6] break-all">
                {log.message}
                {log.metadata && (
                  <span className="ml-2 text-[#4D4D57] italic">
                    {typeof log.metadata === 'object' ? JSON.stringify(log.metadata) : log.metadata}
                  </span>
                )}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredLogs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20">
            <Terminal className="w-12 h-12" />
            <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Aguardando Telemetria Ativa...</p>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-[#202024] bg-[#0A0A0B] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[9px] text-[#4D4D57] font-bold uppercase">Socket Link: Stable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] text-[#4D4D57] font-bold uppercase">Buffer: {logs.length}/100</span>
          </div>
        </div>
        <span className="text-[9px] text-[#29292E] font-bold italic uppercase">UE_Architect_Audit_Channel</span>
      </div>
    </div>
  );
};
