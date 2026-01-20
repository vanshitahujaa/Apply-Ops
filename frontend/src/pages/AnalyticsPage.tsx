import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Zap,
    Briefcase,
    BarChart3,
    FileText,
    Settings,
    LogOut,
    Mail,
    TrendingUp,
    Target,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Menu,
    X,
    PenTool,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { analyticsApi, authApi } from '@/services/api'
import { useAuthStore } from '@/store'
import type { User } from '@/lib/types'

export default function AnalyticsPage() {
    const { user, logout } = useAuthStore()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const navItems = [
        { icon: Briefcase, label: 'Applications', href: '/dashboard' },
        { icon: BarChart3, label: 'Analytics', href: '/analytics', active: true },
        { icon: FileText, label: 'Resumes', href: '/resumes' },
        { icon: PenTool, label: 'Cover Letters', href: '/cover-letters' },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ]

    const [overviewData, setOverviewData] = useState<any>({ totalApplications: 0, responseRate: 0, interviewRate: 0, offerRate: 0 })
    const [weeklyData, setWeeklyData] = useState<any[]>([])
    const [platformData, setPlatformData] = useState<any[]>([])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const overviewRes = await analyticsApi.getOverview()
                setOverviewData(overviewRes.data.data)
                setWeeklyData(overviewRes.data.data.weeklyApplications)

                const platformRes = await analyticsApi.getPlatformStats()
                const pStats = platformRes.data.data
                const platformArr = Object.keys(pStats).map(key => ({
                    name: key,
                    applications: pStats[key].applications,
                    responses: pStats[key].responses,
                    rate: pStats[key].applications ? Math.round(pStats[key].responses / pStats[key].applications * 100) + '%' : '0%'
                })).sort((a, b) => b.applications - a.applications)
                setPlatformData(platformArr)
            } catch (e) {
                console.error(e)
            }
        }
        fetchData()
    }, [])

    const overviewStats = [
        { label: 'Total Applications', value: overviewData.totalApplications, change: '', trend: 'up', icon: Briefcase },
        { label: 'Response Rate', value: overviewData.responseRate + '%', change: '', trend: 'up', icon: TrendingUp },
        { label: 'Interview Rate', value: overviewData.interviewRate + '%', change: '', trend: 'up', icon: Calendar },
        { label: 'Offer Rate', value: overviewData.offerRate + '%', change: '', trend: 'up', icon: Target },
    ]

    const maxApps = Math.max(...weeklyData.map(w => w.count || 0), 1)

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800">
                <div className="flex items-center justify-between px-4 h-14">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-zinc-400 hover:text-white">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-white">ApplyOps</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                </div>
            </header>

            {/* Mobile Sidebar */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <aside className="absolute left-0 top-0 bottom-0 w-72 bg-zinc-900 border-r border-zinc-800 animate-slide-in-left">
                        <SidebarContent user={user} logout={logout} navItems={navItems} onClose={() => setSidebarOpen(false)} />
                    </aside>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-zinc-900/80 backdrop-blur-xl border-r border-zinc-800 flex-col">
                <SidebarContent user={user} logout={logout} navItems={navItems} />
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
                <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-white">Analytics</h1>
                        <p className="text-zinc-400 text-sm mt-1">Track your job search performance</p>
                    </div>

                    {/* Overview Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {overviewStats.map((stat) => (
                            <Card key={stat.label}>
                                <CardContent className="p-4 sm:p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`w-10 h-10 rounded-xl ${stat.trend === 'up' ? 'bg-emerald-500/10' : 'bg-red-500/10'} flex items-center justify-center`}>
                                            <stat.icon className={`w-5 h-5 ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`} />
                                        </div>
                                        <div className={`flex items-center gap-1 text-xs font-medium ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                            {stat.change}
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                                    <p className="text-zinc-500 text-xs mt-1">{stat.label}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* Weekly Applications Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Weekly Applications</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end justify-between gap-2 h-40">
                                    {weeklyData.map((week) => (
                                        <div key={week.week} className="flex-1 flex flex-col items-center gap-2">
                                            <div
                                                className="w-full bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-lg transition-all hover:from-violet-500 hover:to-violet-300"
                                                style={{ height: `${(week.count / maxApps) * 100}%`, minHeight: '8px' }}
                                            />
                                            <span className="text-xs text-zinc-500 truncate">{week.week}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Platform Performance */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Platform Performance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {platformData.map((platform) => (
                                        <div key={platform.name} className="flex items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm text-zinc-200 truncate">{platform.name}</span>
                                                    <span className="text-xs text-zinc-500">{platform.applications} apps</span>
                                                </div>
                                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all"
                                                        style={{ width: platform.rate }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium text-zinc-300 w-12 text-right">{platform.rate}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Insights */}
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="text-base">💡 Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Top Performer Insight */}
                                {platformData.length > 0 && (() => {
                                    const topPlatform = [...platformData].sort((a, b) => {
                                        const rateA = parseInt(a.rate) || 0
                                        const rateB = parseInt(b.rate) || 0
                                        return rateB - rateA
                                    })[0]
                                    const topRate = parseInt(topPlatform?.rate) || 0

                                    return topRate > 0 ? (
                                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <p className="text-sm text-emerald-400 font-medium mb-1">🏆 Top Performer</p>
                                            <p className="text-zinc-300 text-sm">
                                                <strong>{topPlatform.name}</strong> has {topPlatform.rate} response rate - keep focusing here!
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <p className="text-sm text-emerald-400 font-medium mb-1">🚀 Getting Started</p>
                                            <p className="text-zinc-300 text-sm">Apply to more jobs to see which platforms work best for you!</p>
                                        </div>
                                    )
                                })()}

                                {/* Low Performer Insight */}
                                {platformData.length > 1 && (() => {
                                    const lowPlatform = [...platformData]
                                        .filter(p => p.applications >= 3)
                                        .sort((a, b) => {
                                            const rateA = parseInt(a.rate) || 0
                                            const rateB = parseInt(b.rate) || 0
                                            return rateA - rateB
                                        })[0]

                                    return lowPlatform && parseInt(lowPlatform.rate) < 20 ? (
                                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                            <p className="text-sm text-amber-400 font-medium mb-1">⚠️ Low Performer</p>
                                            <p className="text-zinc-300 text-sm">
                                                <strong>{lowPlatform.name}</strong> has only {lowPlatform.rate} response rate - consider focusing elsewhere.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                            <p className="text-sm text-amber-400 font-medium mb-1">📊 Analysis</p>
                                            <p className="text-zinc-300 text-sm">
                                                {overviewData.responseRate > 30
                                                    ? `Great job! ${overviewData.responseRate}% response rate is above average.`
                                                    : overviewData.responseRate > 0
                                                        ? 'Try customizing your resume for each application to boost responses.'
                                                        : 'Keep applying! Most responses come after 1-2 weeks.'}
                                            </p>
                                        </div>
                                    )
                                })()}

                                {/* Trend Insight */}
                                {(() => {
                                    const recentWeeks = weeklyData.slice(-4)
                                    const firstHalf = recentWeeks.slice(0, 2).reduce((sum, w) => sum + (w.count || 0), 0)
                                    const secondHalf = recentWeeks.slice(2).reduce((sum, w) => sum + (w.count || 0), 0)
                                    const trend = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0

                                    return (
                                        <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                            <p className="text-sm text-violet-400 font-medium mb-1">📈 Trend</p>
                                            <p className="text-zinc-300 text-sm">
                                                {trend > 20
                                                    ? `Your application volume increased ${trend}% recently! Keep up the momentum.`
                                                    : trend < -20
                                                        ? `Application volume dropped ${Math.abs(trend)}%. Try setting daily application goals.`
                                                        : overviewData.totalApplications > 0
                                                            ? `You've submitted ${overviewData.totalApplications} applications. Consistency is key!`
                                                            : 'Start applying to build your analytics data!'}
                                            </p>
                                        </div>
                                    )
                                })()}

                                {/* Interview Rate Insight */}
                                {overviewData.interviewRate > 0 && (
                                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                        <p className="text-sm text-cyan-400 font-medium mb-1">🎯 Interview Rate</p>
                                        <p className="text-zinc-300 text-sm">
                                            {overviewData.interviewRate >= 20
                                                ? `Excellent! ${overviewData.interviewRate}% interview rate is outstanding.`
                                                : overviewData.interviewRate >= 10
                                                    ? `Good progress! ${overviewData.interviewRate}% interview rate is solid.`
                                                    : `${overviewData.interviewRate}% interview rate. Focus on tailoring resumes to job descriptions.`}
                                        </p>
                                    </div>
                                )}

                                {/* Offer Rate Insight */}
                                {overviewData.offerRate > 0 && (
                                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                        <p className="text-sm text-green-400 font-medium mb-1">🎉 Offers</p>
                                        <p className="text-zinc-300 text-sm">
                                            You have a {overviewData.offerRate}% offer rate!
                                            {overviewData.offerRate >= 5 ? ' That\'s great performance!' : ' Keep interviewing to improve.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}

// Sidebar Component
function SidebarContent({
    user,
    logout,
    navItems,
    onClose
}: {
    user: User | null
    logout: () => void
    navItems: { icon: typeof Briefcase; label: string; href: string; active?: boolean }[]
    onClose?: () => void
}) {
    return (
        <div className="flex flex-col h-full p-4">
            <div className="flex items-center justify-between mb-8">
                <Link to="/" className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-semibold text-white">ApplyOps</span>
                </Link>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden p-2 text-zinc-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <nav className="flex-1 space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        to={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${item.active
                            ? 'bg-violet-500/10 text-violet-400'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                            }`}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="mb-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-300">Gmail Sync</span>
                </div>
                {user?.gmailConnected ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Connected & tracking
                    </div>
                ) : (
                    <Button size="sm" variant="outline" className="w-full text-xs h-8" onClick={() => authApi.connectGmail()}>
                        Connect Gmail
                    </Button>
                )}
            </div>

            <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center gap-3 mb-3 px-1">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-zinc-500 truncate">{user?.email || 'user@example.com'}</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="w-full justify-start text-zinc-500 h-9" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                </Button>
            </div>
        </div>
    )
}
