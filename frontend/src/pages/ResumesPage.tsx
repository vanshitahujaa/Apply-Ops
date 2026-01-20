import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    Zap,
    Briefcase,
    BarChart3,
    FileText,
    Settings,
    LogOut,
    Mail,
    Download,
    Trash2,
    Menu,
    X,
    CheckCircle,
    Clock,
    FileUp,
    PenTool,
    ScanLine,
    Loader2,
    AlertCircle,
    Wrench,
    Lightbulb
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store'
import type { User, Resume } from '@/lib/types'
import { resumeApi, authApi } from '@/services/api'
import { formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'

export default function ResumesPage() {
    const { user, logout } = useAuthStore()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [analyzingId, setAnalyzingId] = useState<string | null>(null)
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)
    const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
    const [jobDescription, setJobDescription] = useState('')

    const navItems = [
        { icon: Briefcase, label: 'Applications', href: '/dashboard' },
        { icon: BarChart3, label: 'Analytics', href: '/analytics' },
        { icon: FileText, label: 'Resumes', href: '/resumes', active: true },
        { icon: PenTool, label: 'Cover Letters', href: '/cover-letters' },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ]

    const [resumes, setResumes] = useState<Resume[]>([])

    const fetchResumes = async () => {
        try {
            const response = await resumeApi.getAll()
            setResumes(response.data.data)
        } catch (error) {
            console.error('Failed to fetch resumes', error)
        }
    }

    useEffect(() => {
        fetchResumes()
    }, [])

    const handleFileUpload = async (file: File) => {
        if (file.type !== 'application/pdf') {
            alert('Only PDF files are allowed')
            return
        }
        try {
            await resumeApi.upload(file)
            fetchResumes()
        } catch (error) {
            console.error('Upload failed', error)
            alert('Failed to upload resume')
        }
    }

    // START: Added handleAnalyze logic
    const openAnalysisModal = (resumeId: string) => {
        setSelectedResumeId(resumeId)
        setJobDescription('')
        setIsAnalysisModalOpen(true)
    }

    const handleAnalyze = async () => {
        if (!selectedResumeId || !jobDescription) {
            toast.error('Please enter a job description')
            return
        }

        setIsAnalysisModalOpen(false)
        setAnalyzingId(selectedResumeId)
        const toastId = toast.loading('Analyzing resume against JD...')

        try {
            await resumeApi.analyze(selectedResumeId, jobDescription)
            await fetchResumes()
            toast.success('Analysis complete! ATS score updated.', { id: toastId })
        } catch (error) {
            console.error('Analysis failed', error)
            toast.error('Failed to analyze resume', { id: toastId })
        } finally {
            setAnalyzingId(null)
            setSelectedResumeId(null)
        }
    }
    // END: handleAnalyze logic

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        // Handle file upload
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0])
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
                <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Resumes</h1>
                            <p className="text-zinc-400 text-sm mt-1">Upload and optimize your resumes</p>
                        </div>
                    </div>

                    {/* Upload Section */}
                    <div
                        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer mb-8 ${dragActive
                            ? 'border-violet-500 bg-violet-500/10'
                            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                        />
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <FileUp className="w-8 h-8 text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Upload your resume</h3>
                        <p className="text-zinc-400 text-sm mb-4">Drag and drop or click to browse</p>
                        <p className="text-zinc-500 text-xs">PDF files only, max 5MB</p>
                    </div>

                    {/* Resumes List */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white">Your Resumes</h2>

                        {resumes.map((resume) => (
                            <Card key={resume.id} className="group">
                                <CardContent className="p-4 sm:p-5">
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-6 h-6 text-violet-400" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-white">{resume.name}</h3>
                                                <Badge variant={(resume.atsScore || 0) >= 80 ? 'success' : (resume.atsScore || 0) >= 60 ? 'warning' : 'danger'}>
                                                    ATS: {resume.atsScore || 0}%
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-zinc-400">{decodeURIComponent(resume.fileUrl.split('/').pop() || 'resume.pdf')}</p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                                                <Clock className="w-3 h-3" />
                                                Uploaded {formatRelativeTime(resume.uploadedAt)}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                                                onClick={() => openAnalysisModal(resume.id)}
                                                disabled={analyzingId === resume.id}
                                            >
                                                {analyzingId === resume.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                ) : (
                                                    <ScanLine className="w-4 h-4 mr-2" />
                                                )}
                                                {analyzingId === resume.id ? 'Analyzing...' : 'Analyze'}
                                            </Button>

                                            <div className="w-px h-4 bg-zinc-800 mx-1" />

                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-zinc-500 hover:text-white"
                                                onClick={() => window.open(resume.fileUrl, '_blank')}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-zinc-500 hover:text-red-400"
                                                onClick={async () => {
                                                    if (confirm('Are you sure you want to delete this resume?')) {
                                                        try {
                                                            await resumeApi.delete(resume.id)
                                                            fetchResumes()
                                                        } catch (e) {
                                                            console.error(e)
                                                            alert('Failed to delete')
                                                        }
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* ATS Score Bar */}
                                    <div className="mt-4 pt-4 border-t border-zinc-800">
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <span className="text-zinc-400">ATS Compatibility</span>
                                            <span className={`font-medium ${(resume.atsScore || 0) >= 80 ? 'text-emerald-400' : (resume.atsScore || 0) >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                                {resume.atsScore || 0}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${(resume.atsScore || 0) >= 80 ? 'bg-emerald-500' : (resume.atsScore || 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${resume.atsScore || 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Scope of Improvements */}
                                    {resume.feedback && (
                                        <div className="mt-6 pt-6 border-t border-zinc-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                                <ScanLine className="w-4 h-4 text-violet-400" />
                                                Scope of Improvements
                                            </h4>

                                            <div className="grid sm:grid-cols-2 gap-4">
                                                {/* Hard Skills */}
                                                {resume.feedback.missingHardSkills && resume.feedback.missingHardSkills.length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                            <AlertCircle className="w-3 h-3 text-red-500" />
                                                            Missing Skills
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {resume.feedback.missingHardSkills.map((skill, i) => (
                                                                <Badge key={i} variant="outline" className="bg-red-500/5 text-red-400 border-red-500/10 text-[10px] py-0 px-2 font-normal">
                                                                    {skill}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Tools */}
                                                {resume.feedback.missingTools && resume.feedback.missingTools.length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                            <Wrench className="w-3 h-3 text-amber-500" />
                                                            Tools to Add
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {resume.feedback.missingTools.map((tool, i) => (
                                                                <Badge key={i} variant="outline" className="bg-amber-500/5 text-amber-400 border-amber-500/10 text-[10px] py-0 px-2 font-normal">
                                                                    {tool}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content Suggestions */}
                                            {((resume.feedback.sectionSuggestions && resume.feedback.sectionSuggestions.length > 0) || (resume.feedback.bulletImprovements && resume.feedback.bulletImprovements.length > 0)) && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                        <Lightbulb className="w-3 h-3 text-violet-500" />
                                                        Optimization Tips
                                                    </div>
                                                    <ul className="space-y-1.5">
                                                        {[...(resume.feedback.sectionSuggestions || []), ...(resume.feedback.bulletImprovements || [])].slice(0, 3).map((tip, i) => (
                                                            <li key={i} className="text-xs text-zinc-400 flex items-start gap-2 leading-relaxed">
                                                                <span className="w-1 h-1 rounded-full bg-violet-500/40 mt-1.5 flex-shrink-0" />
                                                                {tip}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Tips Section */}
                    <Card className="mt-8">
                        <CardHeader>
                            <CardTitle className="text-base">💡 Resume Tips</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {[
                                    'Use keywords from the job description',
                                    'Quantify achievements with numbers',
                                    'Keep it to 1-2 pages maximum',
                                    "Use a clean, ATS-friendly format",
                                    'Include relevant skills and technologies',
                                ].map((tip, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-zinc-300">{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Analysis Modal */}
            {isAnalysisModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setIsAnalysisModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold text-white mb-4">Analyze Resume</h2>
                        <p className="text-zinc-400 text-sm mb-4">Paste the job description below to calculate your ATS score and get tailored feedback.</p>

                        <Textarea
                            placeholder="Paste job description here..."
                            className="min-h-[200px] bg-zinc-800/50 border-zinc-700 text-zinc-200 mb-6 focus:ring-violet-500"
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                        />

                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setIsAnalysisModalOpen(false)}>Cancel</Button>
                            <Button variant="gradient" onClick={handleAnalyze}>
                                <ScanLine className="w-4 h-4 mr-2" />
                                Calculate Score
                            </Button>
                        </div>
                    </div>
                </div>
            )}
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

            {/* Gmail Status - FIXED */}
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
