import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store'
import {
    Briefcase,
    BarChart3,
    FileText,
    Settings,
    LogOut,
    Mail,
    X,
} from 'lucide-react'

const navItems = [
    { icon: Briefcase, label: 'Applications', href: '/dashboard' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: FileText, label: 'Resumes', href: '/resumes' },
    { icon: Settings, label: 'Settings', href: '/settings' },
]

interface SidebarProps {
    onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
    const { user, logout } = useAuthStore()
    const location = useLocation()

    const isActive = (href: string) => location.pathname === href

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
                    <Link
                        key={item.label}
                        to={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive(item.href)
                            ? 'bg-violet-500/10 text-violet-400'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                            }`}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </Link>
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
                    <Button size="sm" variant="outline" className="w-full text-xs h-8">
                        Connect Gmail
                    </Button>
                )}
            </div>

            {/* User */}
            <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center gap-3 mb-3 px-1">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-zinc-500 truncate">{user?.email || 'user@example.com'}</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-zinc-500 h-9"
                    onClick={logout}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                </Button>
            </div>
        </div>
    )
}
