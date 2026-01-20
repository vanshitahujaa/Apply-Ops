import { Link } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Zap,
    Briefcase,
    BarChart3,
    FileText,
    Settings,
    LogOut,
    Mail,
    User as UserIcon,
    Bell,
    Shield,
    Trash2,
    Menu,
    X,
    Download,
    AlertTriangle,
    PenTool,
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store'
import type { User } from '@/lib/types'

export default function SettingsPage() {
    const { user, logout } = useAuthStore()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [name, setName] = useState(user?.name || '')
    const [email, setEmail] = useState(user?.email || '')

    const handleConnectGmail = async () => {
        try {
            const response = await axios.get('/api/auth/google/url')
            if (response.data.success) {
                window.location.href = response.data.url
            }
        } catch (error) {
            console.error('Failed to get Google Auth URL', error)
        }
    }

    const handleDisconnectGmail = async () => {
        try {
            await axios.post('/api/auth/gmail/disconnect')
            window.location.reload()
        } catch (error) {
            console.error('Failed to disconnect Gmail', error)
        }
    }

    const handleExportData = async () => {
        try {
            const response = await axios.get('/api/auth/export', { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'applyops-data.json')
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error('Export failed', error)
        }
    }

    const handleDeleteAccount = async () => {
        if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return
        try {
            await axios.delete('/api/auth/me')
            logout()
            window.location.href = '/'
        } catch (error) {
            console.error('Delete failed', error)
        }
    }

    const navItems = [
        { icon: Briefcase, label: 'Applications', href: '/dashboard' },
        { icon: BarChart3, label: 'Analytics', href: '/analytics' },
        { icon: FileText, label: 'Resumes', href: '/resumes' },
        { icon: PenTool, label: 'Cover Letters', href: '/cover-letters' },
        { icon: Settings, label: 'Settings', href: '/settings', active: true },
    ]

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
                <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-white">Settings</h1>
                        <p className="text-zinc-400 text-sm mt-1">Manage your account and preferences</p>
                    </div>

                    <div className="space-y-6">
                        {/* Profile Settings */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                        <UserIcon className="w-5 h-5 text-violet-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Profile</CardTitle>
                                        <CardDescription>Your personal information</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>
                                <Button variant="gradient" className="mt-4">
                                    Save Changes
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Gmail Integration */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-cyan-400" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-base">Gmail Integration</CardTitle>
                                        <CardDescription>Auto-track applications from your email</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {user?.gmailConnected ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-emerald-400 text-sm font-medium">Connected & Tracking</span>
                                        </div>
                                        <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={handleDisconnectGmail}>
                                            Disconnect
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                        <div>
                                            <p className="text-zinc-300 text-sm font-medium">Not connected</p>
                                            <p className="text-zinc-500 text-xs mt-1">Connect to auto-track job applications</p>
                                        </div>
                                        <Button variant="gradient" size="sm" onClick={handleConnectGmail}>
                                            Connect Gmail
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Notifications */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Notifications</CardTitle>
                                        <CardDescription>How you receive updates</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Application status updates', description: 'When a company views your application' },
                                        { label: 'Interview reminders', description: '24 hours before scheduled interviews' },
                                        { label: 'Weekly summary', description: 'Your job search performance report' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm text-zinc-200">{item.label}</p>
                                                <p className="text-xs text-zinc-500">{item.description}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Data & Privacy */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Data & Privacy</CardTitle>
                                        <CardDescription>Manage your data</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                        <div>
                                            <p className="text-zinc-300 text-sm font-medium">Export your data</p>
                                            <p className="text-zinc-500 text-xs mt-1">Download all your applications and analytics</p>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={handleExportData}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Export
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Danger Zone */}
                        <Card className="border-red-500/20">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base text-red-400">Danger Zone</CardTitle>
                                        <CardDescription>Irreversible actions</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                                    <div>
                                        <p className="text-zinc-300 text-sm font-medium">Delete Account</p>
                                        <p className="text-zinc-500 text-xs mt-1">Permanently delete all your data</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={handleDeleteAccount}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
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
