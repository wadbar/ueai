import React from 'react';
import { LayoutDashboard, Zap, Activity, HardDrive, Cpu, Clock, Box, ShieldCheck } from 'lucide-react';
import { SystemStats } from '../types';

interface DashboardTabProps {
  systemStats: SystemStats | null;
  uePerformanceStats: { drawCalls: number; triangles: number } | null;
  envInfo: any;
  systemHealth: any;
  connection: any;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  systemStats,
  uePerformanceStats,
  envInfo,
  systemHealth,
  connection
}) => {
  // Defensive normalization of props to prevent 'null' property access errors
  const safeEnvInfo = typeof envInfo === 'object' && envInfo !== null ? envInfo : {};
  const safeSystemHealth = typeof systemHealth === 'object' && systemHealth !== null ? systemHealth : { status: 'offline' };
  const safeConnection = typeof connection === 'object' && connection !== null ? connection : { url: '---', port: '---', connected: false };

  // Unified property retrieval (Server uses snake_case, UI might expect camelCase)
  const nodeVersionDisplay = safeEnvInfo.node_version || safeEnvInfo.nodeVersion || '---';
  const platformDisplay = safeEnvInfo.platform || '---';
  const cpuCountDisplay = (safeEnvInfo.cpus?.length ?? 0) > 0 ? `${safeEnvInfo.cpus.length} cores` : '---';

  return (
    <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-md-bg">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-md-primary font-bold text-xs uppercase tracking-[0.2em]">
            <Activity className="w-4 h-4" />
            <span>Telemetry & Runtime Analytics</span>
          </div>
          <h2 className="text-4xl font-bold text-md-text-strong tracking-tight">System Matrix</h2>
          <p className="text-md-text-muted">Monitoramento em tempo real do ecossistema e performance do motor.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="UE Draw Calls" 
            value={uePerformanceStats?.drawCalls ?? '---'} 
            unit="batch" 
            icon={<Zap className="w-5 h-5 text-amber-500" />} 
          />
          <StatCard 
            title="UE Polygons" 
            value={(uePerformanceStats?.triangles ?? 0) / 1000} 
            unit="k tris" 
            icon={<Box className="w-5 h-5 text-emerald-500" />} 
          />
          <StatCard 
            title="Runtime Uptime" 
            value={systemStats?.uptime ?? '---'} 
            unit="sec" 
            icon={<Clock className="w-5 h-5 text-blue-500" />} 
          />
          <StatCard 
            title="Active Scrapers" 
            value={systemStats?.activeScrapers ?? 0} 
            unit="daemons" 
            icon={<Activity className="w-5 h-5 text-rose-500" />} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8">
              <section className="bg-md-surface2 border border-md-border rounded-3xl p-8 shadow-2xl">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-md-text-strong flex items-center gap-3">
                       <Cpu className="w-5 h-5 text-md-primary" />
                       Node.js Memory Engine
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${safeSystemHealth.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                       {safeSystemHealth.status || 'OFFLINE'}
                    </div>
                 </div>
                 <div className="space-y-6">
                    <MemoryBar label="Heap Used" value={systemStats?.memory?.heapUsed ?? 0} total={systemStats?.memory?.heapTotal ?? 1} color="bg-md-primary" />
                    <MemoryBar label="RSS Total" value={systemStats?.memory?.rss ?? 0} total={2048} color="bg-emerald-500" />
                 </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <section className="bg-md-surface2 border border-md-border rounded-3xl p-8">
                    <h4 className="text-xs font-bold text-md-text-muted uppercase tracking-widest mb-6 flex items-center gap-2">
                       <HardDrive className="w-4 h-4" />
                       Environment Info
                    </h4>
                    <div className="space-y-4 font-mono text-[11px]">
                       <EnvItem label="Node Version" value={nodeVersionDisplay} />
                       <EnvItem label="Platform" value={platformDisplay} />
                       <EnvItem label="CPU Models" value={cpuCountDisplay} />
                    </div>
                 </section>
                 <section className="bg-md-surface2 border border-md-border rounded-3xl p-8">
                    <h4 className="text-xs font-bold text-md-text-muted uppercase tracking-widest mb-6 flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4" />
                       Unreal Port Security
                    </h4>
                    <div className="space-y-4">
                       <EnvItem label="Target Host" value={safeConnection.url || '---'} />
                       <EnvItem label="RC API Port" value={safeConnection.port || '---'} />
                       <EnvItem label="Link Status" value={safeConnection.connected ? 'ESTABLISHED' : 'PENDING'} highlight={safeConnection.connected} />
                    </div>
                 </section>
              </div>
           </div>

           <div className="space-y-8">
               <div className="bg-gradient-to-br from-md-primary/20 to-transparent border border-md-primary/20 rounded-3xl p-8 relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                     <div className="w-12 h-12 bg-md-primary/20 rounded-2xl flex items-center justify-center text-md-primary">
                        <LayoutDashboard className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-bold text-md-text-strong">UE Architect Pro</h3>
                     <p className="text-xs text-md-text-muted leading-relaxed">Painel de automação industrial para assets em tempo real. Utilize as tabs laterais para configurar LODs e Materiais PBR.</p>
                  </div>
                  <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-md-primary/10 rounded-full blur-3xl" />
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, unit, icon }: { title: string; value: any; unit: string; icon: React.ReactNode }) => (
  <div className="bg-md-surface2 border border-md-border p-6 rounded-3xl shadow-xl hover:translate-y-[-4px] transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-black/20 rounded-xl">{icon}</div>
      <span className="text-[10px] font-bold text-md-text-muted uppercase tracking-widest">{title}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-black text-md-text-strong tracking-tighter">{value}</span>
      <span className="text-[10px] font-bold text-md-text-muted uppercase">{unit}</span>
    </div>
  </div>
);

const MemoryBar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
  const percent = Math.min(100, Math.round((value / total) * 100));
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
         <span className="text-md-text-muted">{label}</span>
         <span className="text-md-text-strong">{value} MB / {total} MB</span>
      </div>
      <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
         <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const EnvItem = ({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) => (
  <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
    <span className="text-md-text-muted">{label}</span>
    <span className={`font-mono ${highlight ? 'text-emerald-400 font-bold' : 'text-md-text-strong'}`}>{value}</span>
  </div>
);
