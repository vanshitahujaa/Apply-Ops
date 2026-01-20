import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useApplicationStore, useAuthStore } from '@/store'
import type { Application, ApplicationStatus, User } from '@/lib/types'
import { formatRelativeTime } from '@/lib/utils'
import { applicationsApi, authApi } from '@/services/api'
import axios from 'axios'
import { toast } from 'sonner'
import {
  Zap,
  Plus,
  Search,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Mail,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Building2,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  Target,
  PenTool,
  RefreshCw,
  ExternalLink,
  Clock as ClockIcon,
  Edit3,
  Trash2
} from 'lucide-react'

const statusConfig: Record<ApplicationStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'danger'; icon: typeof Briefcase }> = {
  applied: { label: 'Applied', variant: 'default', icon: Briefcase },
  viewed: { label: 'Viewed', variant: 'secondary', icon: Clock },
  interviewing: { label: 'Interviewing', variant: 'warning', icon: Calendar },
  offered: { label: 'Offered', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'danger', icon: XCircle },
  withdrawn: { label: 'Withdrawn', variant: 'secondary', icon: XCircle },
}

// Mock data
const mockApplications: Application[] = [
  {
    id: '1',
    company: 'Google',
    role: 'Senior Software Engineer',
    status: 'interviewing',
    platform: 'LinkedIn',
    appliedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    interviewAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    company: 'Meta',
    role: 'Full Stack Developer',
    status: 'applied',
    platform: 'Company Website',
    appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    company: 'Stripe',
    role: 'Backend Engineer',
    status: 'offered',
    platform: 'Referral',
    appliedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    salary: '₹35L - ₹45L',
  },
  {
    id: '4',
    company: 'Notion',
    role: 'Frontend Engineer',
    status: 'rejected',
    platform: 'AngelList',
    appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    company: 'Vercel',
    role: 'Software Engineer',
    status: 'viewed',
    platform: 'LinkedIn',
    appliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const { applications, setApplications } = useApplicationStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)

  const [isSyncing, setIsSyncing] = useState(false)
  const [isEditingInterview, setIsEditingInterview] = useState(false)
  const [editInterviewDate, setEditInterviewDate] = useState('')

  // Add Application Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAddingApp, setIsAddingApp] = useState(false)
  const [newApp, setNewApp] = useState({
    company: '',
    role: '',
    url: '',
    platform: 'LinkedIn',
  })

  const fetchApplications = async () => {
    try {
      const response = await applicationsApi.getAll()
      setApplications(response.data.data)
    } catch (error) {
      console.error('Failed to fetch applications', error)
    }
  }

  useEffect(() => {
    fetchApplications()

    // Connect to socket
    import('@/services/socket').then(({ socketService }) => {
      socketService.connect()

      // Listen for updates
      socketService.on('application:created', (newApp) => {
        toast.info(`New application found: ${newApp.company}`)
        fetchApplications()
      })

      socketService.on('application:updated', (updatedApp) => {
        // Only show toast if we aren't the ones editing it right now
        // But since socket is simple, we'll just fetch regardless
        // toast.info(`Application updated: ${updatedApp.company}`)
        fetchApplications()

        // Update selected app if it's open
        if (selectedApplication?.id === updatedApp.id) {
          setSelectedApplication(prev => ({ ...prev, ...updatedApp }))
        }
      })

      socketService.on('application:deleted', (deletedId) => {
        // toast.info('Application deleted')
        fetchApplications()
        if (selectedApplication?.id === deletedId) {
          setSelectedApplication(null)
        }
      })
    })

    return () => {
      import('@/services/socket').then(({ socketService }) => {
        socketService.disconnect()
      })
    }
  }, [setApplications, selectedApplication])

  const handleSync = async () => {
    setIsSyncing(true)
    const toastId = toast.loading('Syncing with Gmail...')
    try {
      const { data } = await axios.post('/api/applications/sync')
      await fetchApplications()
      if (data.count === 0) {
        toast.info('Sync complete: No new applications found', { id: toastId })
      } else {
        toast.success(`Sync complete: Found ${data.count} new updates`, { id: toastId })
      }
    } catch (error: any) {
      console.error('Sync failed', error)
      const message = error.response?.data?.message || 'Failed to sync with Gmail'
      toast.error(message, { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.role.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = [
    { label: 'Total', value: applications.length, icon: Briefcase, color: 'bg-violet-500/10 text-violet-400' },
    { label: 'Interviewing', value: applications.filter((a) => a.status === 'interviewing').length, icon: Calendar, color: 'bg-amber-500/10 text-amber-400' },
    { label: 'Offers', value: applications.filter((a) => a.status === 'offered').length, icon: Target, color: 'bg-emerald-500/10 text-emerald-400' },
    { label: 'Response Rate', value: `${Math.round((applications.filter((a) => ['interviewing', 'offered', 'rejected'].includes(a.status)).length / applications.length) * 100) || 0}%`, icon: TrendingUp, color: 'bg-cyan-500/10 text-cyan-400' },
  ]

  const navItems = [
    { icon: Briefcase, label: 'Applications', href: '/dashboard', active: true },
    { icon: Calendar, label: 'Google Calendar', href: 'https://calendar.google.com', external: true },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: FileText, label: 'Resumes', href: '/resumes' },
    { icon: PenTool, label: 'Cover Letters', href: '/cover-letters' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ]

  // Get upcoming interviews
  const upcomingInterviews = applications
    .filter(app => app.interviewAt && new Date(app.interviewAt) > new Date())
    .sort((a, b) => new Date(a.interviewAt!).getTime() - new Date(b.interviewAt!).getTime())
    .slice(0, 5)

  const handleSaveInterview = async () => {
    if (!selectedApplication || !editInterviewDate) return
    try {
      await applicationsApi.update(selectedApplication.id, { interviewAt: editInterviewDate })
      toast.success('Interview scheduled! 📅 Added to Google Calendar with reminders.')
      setIsEditingInterview(false)
      await fetchApplications()
      setSelectedApplication(prev => prev ? { ...prev, interviewAt: editInterviewDate } : null)
    } catch (error) {
      toast.error('Failed to update interview date')
    }
  }

  const handleDeleteApplication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return
    try {
      await applicationsApi.delete(id)
      toast.success('Application deleted')
      setSelectedApplication(null)
      await fetchApplications()
    } catch (error) {
      toast.error('Failed to delete application')
    }
  }

  const handleAddApplication = async () => {
    if (!newApp.company || !newApp.role) {
      toast.error('Company and Role are required')
      return
    }
    setIsAddingApp(true)
    try {
      await applicationsApi.create({
        company: newApp.company,
        role: newApp.role,
        url: newApp.url || undefined,
        platform: newApp.platform,
      })
      toast.success('Application added!')
      setShowAddModal(false)
      setNewApp({ company: '', role: '', url: '', platform: 'LinkedIn' })
      await fetchApplications()
    } catch (error) {
      toast.error('Failed to add application')
    } finally {
      setIsAddingApp(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-zinc-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 relative h-10 w-40 overflow-hidden">
            <img
              src="/logo.png"
              alt="ApplyOps"
              className="absolute top-1/2 left-0 -translate-y-1/2 h-24 w-auto max-w-none object-contain"
            />
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Applications</h1>
              <p className="text-zinc-400 text-sm mt-1">Track and manage your job hunt</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Gmail'}
              </Button>
              <Button variant="gradient" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Application
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-zinc-500 text-xs sm:text-sm">{stat.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Upcoming Interviews Widget */}
          {upcomingInterviews.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-white">Upcoming Interviews</h3>
                  </div>
                  <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                    Open Google Calendar
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="space-y-3">
                  {upcomingInterviews.map(app => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 cursor-pointer hover:bg-amber-500/10 transition-colors"
                      onClick={() => setSelectedApplication(app)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{app.company}</p>
                          <p className="text-xs text-zinc-400">{app.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-amber-400">
                          {new Date(app.interviewAt!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(app.interviewAt!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search by company or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'all')}
              className="h-11 px-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="all">All Status</option>
              <option value="applied">Applied</option>
              <option value="viewed">Viewed</option>
              <option value="interviewing">Interviewing</option>
              <option value="offered">Offered</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Applications List */}
          <div className="space-y-3">
            {filteredApplications.map((application) => {
              const status = statusConfig[application.status]
              const StatusIcon = status.icon

              return (
                <Card
                  key={application.id}
                  className="group cursor-pointer hover:bg-zinc-800/30 transition-colors"
                  onClick={() => setSelectedApplication(application)}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      {/* Company Icon */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-500" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{application.company}</h3>
                          <Badge variant={status.variant}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-400 truncate">{application.role}</p>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500">
                          <span>{formatRelativeTime(application.updatedAt)}</span>
                          {application.platform && <span>via {application.platform}</span>}
                        </div>

                        {/* Interview Badge */}
                        {application.interviewAt && application.status === 'interviewing' && (
                          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                            <Calendar className="w-3.5 h-3.5" />
                            Interview: {new Date(application.interviewAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                        )}

                        {/* Salary */}
                        {application.salary && (
                          <div className="inline-flex items-center gap-1.5 mt-3 ml-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                            💰 {application.salary}
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all flex-shrink-0 hidden sm:block" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Empty State */}
            {filteredApplications.length === 0 && (
              <div className="text-center py-20 px-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="font-semibold text-white mb-2">No applications found</h3>
                <p className="text-zinc-500 text-sm mb-6">
                  {searchQuery ? 'Try a different search term' : 'Connect Gmail or add your first application'}
                </p>
                <Button variant="gradient">
                  <Plus className="w-4 h-4" />
                  Add Application
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Application Details Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 p-6" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedApplication(null)}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl font-bold text-zinc-500">
                {selectedApplication.company.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedApplication.company}</h2>
                <p className="text-zinc-400">{selectedApplication.role}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                  <p className="text-xs text-zinc-500 mb-1">Status</p>
                  <select
                    value={selectedApplication.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value as any
                      try {
                        await applicationsApi.update(selectedApplication.id, { status: newStatus.toUpperCase() })
                        toast.success(`Status updated to ${statusConfig[newStatus].label}`)
                        setSelectedApplication(prev => prev ? { ...prev, status: newStatus } : null)
                        await fetchApplications()
                      } catch (error) {
                        toast.error('Failed to update status')
                      }
                    }}
                    className="w-full h-8 px-2 rounded-lg bg-zinc-700 border border-zinc-600 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                  >
                    <option value="applied">Applied</option>
                    <option value="viewed">Viewed</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offered">Offered</option>
                    <option value="rejected">Rejected</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>
                <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                  <p className="text-xs text-zinc-500 mb-1">Applied On</p>
                  <p className="text-sm font-medium text-white">
                    {new Date(selectedApplication.appliedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedApplication.interviewAt && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-500 mb-1">Interview Scheduled</p>
                  <p className="text-sm font-medium text-amber-400">
                    {new Date(selectedApplication.interviewAt).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedApplication.salary && (
                <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Salary Range</span>
                  <span className="text-sm font-medium text-white">{selectedApplication.salary}</span>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-800 space-y-3">
                {/* Edit Interview Date */}
                {isEditingInterview ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Interview Date & Time</label>
                      <input
                        type="datetime-local"
                        value={editInterviewDate}
                        onChange={(e) => setEditInterviewDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => setIsEditingInterview(false)}>
                        Cancel
                      </Button>
                      <Button variant="gradient" size="sm" className="flex-1" onClick={handleSaveInterview}>
                        Save Interview
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setEditInterviewDate(selectedApplication?.interviewAt ? new Date(selectedApplication.interviewAt).toISOString().slice(0, 16) : '')
                      setIsEditingInterview(true)
                    }}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {selectedApplication?.interviewAt ? 'Edit Interview Date' : 'Add Interview Date'}
                  </Button>
                )}

                <a
                  href={selectedApplication.url || `https://mail.google.com/mail/u/0/#search/${selectedApplication.company}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center w-full gap-2 p-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  View Original Email
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>

                <Button
                  variant="ghost"
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => handleDeleteApplication(selectedApplication.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Application
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Application Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-white">Add Application</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Google"
                  value={newApp.company}
                  onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Role / Position <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Engineer"
                  value={newApp.role}
                  onChange={(e) => setNewApp({ ...newApp, role: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Job URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://linkedin.com/jobs/..."
                  value={newApp.url}
                  onChange={(e) => setNewApp({ ...newApp, url: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Platform
                </label>
                <select
                  value={newApp.platform}
                  onChange={(e) => setNewApp({ ...newApp, platform: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Indeed">Indeed</option>
                  <option value="Glassdoor">Glassdoor</option>
                  <option value="Wellfound">Wellfound</option>
                  <option value="Company Website">Company Website</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1"
                  onClick={handleAddApplication}
                  disabled={isAddingApp}
                >
                  {isAddingApp ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add App
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarContent({
  user,
  logout,
  navItems,
  onClose
}: {
  user: User | null
  logout: () => void
  navItems: { icon: typeof Briefcase; label: string; href: string; active?: boolean; external?: boolean }[]
  onClose?: () => void
}) {
  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/" className="flex items-center gap-2.5 relative h-10 w-40 overflow-hidden shrink-0">
          <img 
            src="/logo.png" 
            alt="ApplyOps" 
            className="absolute top-1/2 left-0 -translate-y-1/2 h-24 w-auto max-w-none object-contain" 
          />
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          item.external ? (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </a>
          ) : (
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
          )
        ))}
      </nav>

      {/* Gmail Status */}
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

      {/* User */}
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
