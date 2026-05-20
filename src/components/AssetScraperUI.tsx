import React, { useState } from 'react';
import { Search, Database, Globe, Activity, CheckCircle, AlertCircle, RefreshCcw, Box, Download, Code2, Copy, FileText, Share2, Plus, Terminal } from 'lucide-react';
import axios from 'axios';

interface ScrapeResult {
  url: string;
  status: number;
  data: string;
  latencyMs: number;
  error?: string;
}

export const AssetScraperUI: React.FC<{ addLog: (t: any, m: string) => void }> = ({ addLog }) => {
  const [targetUrl, setTargetUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [liveWorkers, setLiveWorkers] = useState<number>(0);

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/scraper/status');
      setLiveWorkers(res.data.activeWorkers);
    } catch {}
  };

  React.useEffect(() => {
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleScrape = async () => {
    if (!targetUrl || isScraping) return;
    
    setIsScraping(true);
    addLog('ai', `[DATA_MINER]: Inicializando extração em ${targetUrl}`);
    
    try {
      const payload = {
        targets: [
          { url: targetUrl, timeoutMs: 15000, retries: 2 }
        ]
      };
      
      const res = await axios.post('/api/scraper/execute', payload);
      setResults(prev => [...res.data.data, ...prev]);
      addLog('ai', `[DATA_MINER]: Extração concluída com sucesso. Operação resolvida em ${res.data.data[0]?.latencyMs}ms`);
    } catch (err: any) {
      addLog('error', `[MINER_FAULT]: Falha durante a extração: ${err.message}`);
    } finally {
      setIsScraping(false);
      setTargetUrl('');
    }
  };

  return (
    <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-md-bg">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
            <Globe className="w-4 h-4" />
            <span>Industrial Web Miner</span>
          </div>
          <h2 className="text-3xl font-black text-md-text-strong uppercase tracking-tight">Asset Discovery System</h2>
          <p className="text-md-text-muted font-mono text-sm max-w-2xl">
            Mechanismo de orquestração hiper-concorrente para mineração de assets web e telemetria.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Control Panel */}
          <div className="col-span-1 lg:col-span-3 space-y-6">
            <div className="bg-md-surface1 p-6 rounded-2xl border border-md-border shadow-xl">
              <h3 className="text-sm font-bold text-md-text-strong uppercase tracking-widest mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-500" />
                Target Direct Input
              </h3>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="https://raw.githubusercontent.com/... ou Endpoint JSON"
                  className="flex-1 bg-md-surface2 border border-md-border p-4 rounded-2xl text-md-text-strong font-mono text-sm focus:border-emerald-500 transition-colors"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScrape()}
                />
                <button
                  onClick={handleScrape}
                  disabled={isScraping || !targetUrl}
                  className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/20 disabled:text-emerald-500/50 text-black font-black uppercase text-sm rounded-2xl transition-all flex items-center gap-2"
                >
                  {isScraping ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                  {isScraping ? 'Mining...' : 'Execute'}
                </button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-md-text-muted uppercase tracking-widest flex items-center gap-2">
                <Database className="w-3 h-3" /> Data Payloads ({results.length})
              </h3>
              <div className="space-y-4">
                {results.map((result, idx) => (
                  <div key={idx} className="bg-md-surface2 border border-md-border rounded-2xl overflow-hidden hover:border-md-border transition-all">
                    <div className="p-4 bg-[#1A1A1E] border-b border-md-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {result.status === 200 ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-xs font-mono text-md-text-strong max-w-[200px] md:max-w-md truncate">{result.url}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-md-text-muted">
                        <span>Latência: {result.latencyMs}ms</span>
                        <span>HTTP {result.status}</span>
                      </div>
                    </div>
                    <div className="p-4 font-mono text-[10px] text-blue-300 overflow-x-auto max-h-[300px] custom-scrollbar bg-black/50">
                      <pre>{result.data ? result.data.substring(0, 1000) + (result.data.length > 1000 ? '\n\n...[TRUNCATED_FOR_DISPLAY]' : '') : result.error}</pre>
                    </div>
                  </div>
                ))}
                {results.length === 0 && (
                  <div className="p-12 text-center border border-dashed border-md-border rounded-2xl flex flex-col items-center gap-4 text-md-text-muted">
                    <Box className="w-8 h-8 opacity-20" />
                    <p className="text-xs uppercase tracking-widest">Painel livre. Nenhuma operação de mineração em curso.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Stats */}
          <div className="col-span-1 space-y-6">
            <div className="bg-md-surface1 p-6 rounded-2xl border border-md-border space-y-6">
              <h3 className="text-xs font-bold text-md-text-muted uppercase tracking-widest border-b border-md-border pb-4 flex items-center gap-2">
                <Activity className="w-3 h-3 text-emerald-500" />
                Telemetry Stats
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-md-text-muted uppercase">Processos Ativos</span>
                  <span className="text-xs font-mono text-emerald-500 font-bold">{liveWorkers} / 10 Ocupadas</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-md-text-muted uppercase">Memory Limit</span>
                  <span className="text-xs font-mono text-md-text-strong">Isolation Safe</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-md-text-muted uppercase">Circuit Breaker</span>
                  <span className="text-xs font-mono text-emerald-500">CLOSED</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <p className="text-[10px] text-emerald-500 leading-relaxed uppercase tracking-wide">
                  Módulo projetado para lidar com requisições assíncronas isoladas, bypassando as travas de navegador (CORS) e mantendo escalabilidade para milhares de links.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
