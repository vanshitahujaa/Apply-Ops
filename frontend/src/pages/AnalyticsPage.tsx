import { useState, useEffect } from 'react'
import api from '@/services/api'
import { RefreshCw, TrendingUp, Download, PieChart as PieChartIcon } from 'lucide-react'
import {
  Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area,
  ComposedChart
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const res = await api.get('/insights/pipeline')
        setData(res.data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPipeline()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-zinc-500 text-sm">Aggregating timeline logic...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  // 1. Funnel Math mapped to Recharts format
  const { funnel, statusCounts } = data
  
  const funnelData = [
    { name: 'Applied', value: funnel.totalApplications, fill: '#3b82f6' }, // blue
    { name: 'Assessments', value: funnel.totalAssessments, fill: '#f59e0b' }, // amber
    { name: 'Interviews', value: funnel.totalInterviews, fill: '#10b981' }, // emarald
    { name: 'Offers', value: funnel.totalOffers, fill: '#8b5cf6' } // violet
  ]

  // 2. Status Breakdown
  const statusData = Object.entries(statusCounts)
    .filter(([_, count]) => (count as number) > 0)
    .map(([status, count]) => ({
      name: status.replace('_', ' '),
      count: count
    }))

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-violet-400" />
            Conversion Analytics
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Mathematical reality of your pipeline</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Download className="w-4 h-4 mr-2" />
          Export Snapshot
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full">
            <div className="text-3xl font-bold text-white">{funnel.rates.assessmentRate.toFixed(1)}%</div>
            <p className="text-sm text-zinc-500 mt-2">Application → Assessment</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-[200px] text-center">Measures resume keyword success vs ATS parsers.</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full">
            <div className="text-3xl font-bold text-emerald-400">{funnel.rates.interviewRate.toFixed(1)}%</div>
            <p className="text-sm text-zinc-500 mt-2">Application → Interview</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-[200px] text-center">The ultimate signal of candidate market-fit.</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full">
            <div className="text-3xl font-bold text-violet-400">{funnel.rates.offerRate.toFixed(1)}%</div>
            <p className="text-sm text-zinc-500 mt-2">Interview → Offer</p>
            <p className="text-xs text-zinc-600 mt-1 max-w-[200px] text-center">Closing ability and hard technical skills.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Funnel Chart */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            The Conversion Funnel
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={funnelData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} 
                  itemStyle={{ color: '#fff' }} 
                />
                <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-zinc-500" />
            Current Pipeline Distribution
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={statusData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#71717a' }} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} 
                  itemStyle={{ color: '#fff' }} 
                />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
