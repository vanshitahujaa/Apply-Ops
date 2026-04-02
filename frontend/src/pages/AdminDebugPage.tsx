import { useState, useEffect } from 'react'
import api from '@/services/api'
import { Activity, ShieldCheck, RefreshCw, XCircle, Search } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export default function AdminDebugPage() {
  const [syncs, setSyncs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSyncId, setSelectedSyncId] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const fetchSyncs = async () => {
    try {
      const { data } = await api.get('/admin/syncs')
      setSyncs(data.data)
      if (data.data.length > 0 && !selectedSyncId) {
        setSelectedSyncId(data.data[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async (syncId: string) => {
    setLoadingLogs(true)
    try {
      const { data } = await api.get(`/admin/syncs/${syncId}/logs`)
      setLogs(data.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    fetchSyncs()
  }, [])

  useEffect(() => {
    if (selectedSyncId) fetchLogs(selectedSyncId)
  }, [selectedSyncId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin text-violet-500"><RefreshCw /></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex gap-6 overflow-hidden">
      {/* Left Panel: SyncRuns */}
      <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-violet-400" />
          Execution Batches
        </h2>
        {syncs.map(sync => (
          <div 
            key={sync.id} 
            onClick={() => setSelectedSyncId(sync.id)}
            className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedSyncId === sync.id ? 'bg-violet-500/10 border-violet-500' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-white">ID: {sync.id.slice(-6)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${sync.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : sync.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {sync.status}
              </span>
            </div>
            <div className="text-xs text-zinc-400 mb-3">{formatRelativeTime(sync.startedAt)}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-800/50 p-2 rounded">Scanned: <span className="text-white ml-1">{sync.totalScanned}</span></div>
              <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2 rounded">Processed: <span className="font-bold ml-1">{sync.totalCreated + sync.totalUpdated}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Right Panel: EmailLogs */}
      <div className="w-2/3 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-zinc-400" />
            Decision Audit Trail
          </h2>
          <span className="text-xs text-zinc-500">{logs.length} logs recorded</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {loadingLogs ? (
             <div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin text-violet-500" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center text-zinc-500 mt-20">No emails logged in this batch</div>
          ) : logs.map(log => (
            <div key={log.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-3">
              {/* Header */}
              <div className="flex gap-3 justify-between">
                 <div className="flex-1 min-w-0">
                   <h4 className="text-sm font-semibold text-white truncate">{log.subject}</h4>
                   <p className="text-xs text-zinc-500 truncate mt-0.5">{log.from}</p>
                 </div>
                 <div className="flex flex-col items-end shrink-0 gap-1">
                   <span className="text-xs text-zinc-400">{new Date(log.receivedAt).toLocaleString()}</span>
                   <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      log.pipelineStage === 'AI_VERIFIED' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 
                      log.pipelineStage === 'SCRIPT_ONLY' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      log.pipelineStage === 'SKIPPED' ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                   }`}>
                     {log.pipelineStage}
                   </span>
                 </div>
              </div>

              {/* Action / Reason */}
              <div className="flex flex-col gap-1 p-3 rounded-lg overflow-x-auto bg-zinc-950/50 border border-zinc-800/50">
                 <div className="flex items-center gap-2 mb-1">
                   {log.actionTaken === 'IGNORED' ? <XCircle className="w-4 h-4 text-zinc-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                   <span className="text-xs font-semibold uppercase tracking-wider text-white">
                     {log.actionTaken || 'UNKNOWN'}
                   </span>
                   {log.confidence !== null && (
                     <span className="text-xs text-zinc-500 font-mono ml-auto">CONFIDENCE: {(log.confidence * 100).toFixed(1)}%</span>
                   )}
                 </div>
                 <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                   {log.reason || 'No internal reason recorded.'}
                 </p>
                 
                 {log.parsedData && Object.keys(log.parsedData).length > 0 && (
                   <details className="mt-2 group">
                     <summary className="text-[10px] text-violet-400 uppercase tracking-widest cursor-pointer select-none">View AI / Script Payload</summary>
                     <pre className="mt-2 text-[10px] text-zinc-500 bg-black/40 p-2 rounded overflow-x-auto">
                       {JSON.stringify(log.parsedData, null, 2)}
                     </pre>
                   </details>
                 )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
