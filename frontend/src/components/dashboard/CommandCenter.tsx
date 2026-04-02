import { useState, useEffect } from 'react'
import api from '@/services/api'
import { Activity, Clock, Ghost, ShieldAlert, Zap, Calendar } from 'lucide-react'

export function CommandCenter() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await api.get('/insights/action-queue')
        setData(res.data.data)
      } catch (err) {
        console.error('Failed to load action queue', err)
      } finally {
        setLoading(false)
      }
    }
    fetchQueue()
  }, [])

  if (loading) return <div className="h-24 rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse mb-8" />
  
  if (!data) return null

  const hasItems = 
    data.upcomingInterviews.length > 0 || 
    data.upcomingAssessments.length > 0 || 
    data.needsReview.length > 0 || 
    data.stale.length > 0 || 
    data.ghosted.length > 0

  if (!hasItems) return null

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-500" />
        Today's Action Queue
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {data.upcomingInterviews.length > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Calendar className="w-4 h-4" />
              {data.upcomingInterviews.length} Interviews
            </div>
            <p className="text-xs text-zinc-400">Occurring within 72 hours. Prep immediately.</p>
          </div>
        )}

        {data.upcomingAssessments.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Activity className="w-4 h-4" />
              {data.upcomingAssessments.length} Assessments
            </div>
            <p className="text-xs text-zinc-400">Due within 72 hours. Check deadlines.</p>
          </div>
        )}

        {data.needsReview.length > 0 && (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm">
              <ShieldAlert className="w-4 h-4" />
              {data.needsReview.length} Need Review
            </div>
            <p className="text-xs text-zinc-400">Medium confidence items needing your manual confirmation.</p>
          </div>
        )}

        {data.stale.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
              <Clock className="w-4 h-4" />
              {data.stale.length} Stale
            </div>
            <p className="text-xs text-zinc-400">No updates in 10+ days. Consider following up.</p>
          </div>
        )}

        {data.ghosted.length > 0 && (
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-zinc-400 font-semibold text-sm">
              <Ghost className="w-4 h-4" />
              {data.ghosted.length} Ghosted
            </div>
            <p className="text-xs text-zinc-500">21+ days without response. Functionally dead.</p>
          </div>
        )}
      </div>
    </div>
  )
}
