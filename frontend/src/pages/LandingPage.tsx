import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
    Mail,
    FileText,
    BarChart3,
    Zap,
    Shield,
    ArrowRight,
    CheckCircle,
    Sparkles,
    Menu,
    X,
    Space
} from 'lucide-react'
import { useState } from 'react'

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const features = [
        {
            icon: Mail,
            title: 'Auto Email Tracking',
            description: 'Connect Gmail once. We handle everything else. Every application tracked automatically.',
            gradient: 'from-violet-500 to-purple-600',
        },
        {
            icon: FileText,
            title: 'Smart Resume Builder',
            description: 'ATS-optimized resumes tailored for each job. Beat the bots, land interviews.',
            gradient: 'from-cyan-500 to-blue-600',
        },
        {
            icon: Sparkles,
            title: 'AI Cover Letters',
            description: 'Personalized cover letters in seconds. Choose your tone, we craft the words.',
            gradient: 'from-pink-500 to-rose-600',
        },
        {
            icon: BarChart3,
            title: 'Analytics Dashboard',
            description: 'See what works. Track response rates, compare platforms, optimize your search.',
            gradient: 'from-amber-500 to-orange-600',
        },
    ]

    const stats = [
        { value: '10x', label: 'Faster Tracking' },
        { value: '3x', label: 'More Interviews' },
        { value: '85%', label: 'Time Saved' },
    ]

    const privacyPoints = [
        'Read-only Gmail access',
        'Only job emails processed',
        'Disconnect anytime, instantly',
        'Download or delete all data',
        'No third-party sharing, ever',
    ]

    return (
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-violet-500/20 via-transparent to-transparent rounded-full blur-3xl" />
                <div className="absolute top-40 right-0 w-[500px] h-[400px] bg-gradient-radial from-cyan-500/10 via-transparent to-transparent rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl px-4 sm:px-6 py-2">
                        <div className="flex items-center justify-between">
                            {/* Logo */}
                            <Link to="/" className="flex items-center gap-2.5 group relative h-10 w-48 overflow-hidden">
                                <img
                                    src="/logo.png"
                                    alt="ApplyOps"
                                    className="absolute top-1/2 left-0 -translate-y-1/2 h-24 w-auto max-w-none object-contain"
                                />
                            </Link>

                            {/* Desktop Nav */}
                            <div className="hidden md:flex items-center gap-3">
                                <Link to="/login">
                                    <Button variant="ghost">Sign In</Button>
                                </Link>
                                <Link to="/register">
                                    <Button variant="gradient">
                                        Get Started Free
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </Link>
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Mobile Menu */}
                        {mobileMenuOpen && (
                            <div className="md:hidden pt-4 pb-2 border-t border-zinc-800 mt-3 animate-fade-in-down">
                                <div className="flex flex-col gap-2">
                                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-center">Sign In</Button>
                                    </Link>
                                    <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                                        <Button variant="gradient" className="w-full justify-center">Get Started Free</Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 sm:pt-40 lg:pt-48 pb-16 sm:pb-24 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 mb-8 animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                        </span>
                        <span className="text-sm text-zinc-400">Job search automation that works</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up leading-[1.1] tracking-tight">
                        <span className="text-white">Stop Tracking.</span>
                        <br />
                        <span className="gradient-text">Start Landing.</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 animate-fade-in-up animate-delay-100 px-4">
                        One platform to auto-track applications, generate tailored resumes,
                        and turn data into job offers.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animate-delay-200 px-4">
                        <Link to="/register" className="w-full sm:w-auto">
                            <Button size="lg" variant="gradient" className="w-full sm:w-auto text-base px-8 h-12">
                                Start Free - No Credit Card
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                        <Link to="/dashboard" className="w-full sm:w-auto">
                            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 h-12">
                                View Demo
                            </Button>
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap justify-center gap-8 sm:gap-16 mt-16 animate-fade-in-up animate-delay-300">
                        {stats.map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-3xl sm:text-4xl font-bold gradient-text">{stat.value}</div>
                                <div className="text-sm text-zinc-500 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="relative py-20 sm:py-32 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Everything You Need to <span className="gradient-text">Win</span>
                        </h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">
                            No scrapers. No bots. No chaos. Just clean automation that respects your privacy.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                        {features.map((feature, index) => (
                            <div
                                key={feature.title}
                                className="group relative p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Icon */}
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className="w-6 h-6 text-white" />
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                                <p className="text-zinc-400 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Privacy Section */}
            <section className="relative py-20 sm:py-32 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        {/* Left Content */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-6 border border-emerald-500/20">
                                <Shield className="w-4 h-4" />
                                Privacy First
                            </div>

                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">
                                Your Data Stays <span className="gradient-text">Yours</span>
                            </h2>

                            <p className="text-zinc-400 mb-8 text-base sm:text-lg">
                                We only read job-related emails, with your explicit consent.
                                No creepy behavior. No shady storage. Complete transparency.
                            </p>

                            <ul className="space-y-4">
                                {privacyPoints.map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <span className="text-zinc-200">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Right Visual */}
                        <div className="relative">
                            {/* Glow */}
                            <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 blur-3xl rounded-3xl" />

                            {/* Card */}
                            <div className="relative bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 sm:p-8">
                                <div className="space-y-4">
                                    {['New job alert: Senior Developer at Google', 'Application received: Meta', 'Interview scheduled: Stripe'].map((email, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                                                <Mail className="w-5 h-5 text-violet-400" />
                                            </div>
                                            <span className="text-sm text-zinc-200 truncate">{email}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 pt-6 border-t border-zinc-800">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Status</span>
                                        <span className="text-emerald-400 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
                                            Tracking Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative py-20 sm:py-32 px-4">
                <div className="max-w-3xl mx-auto">
                    <div className="relative rounded-3xl overflow-hidden">
                        {/* Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-purple-700" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />

                        {/* Content */}
                        <div className="relative z-10 text-center py-16 sm:py-20 px-6 sm:px-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                                Ready to Land Your Dream Job?
                            </h2>
                            <p className="text-white/70 mb-8 max-w-lg mx-auto text-base sm:text-lg">
                                Join thousands of job seekers who stopped drowning in spreadsheets
                                and started getting interviews.
                            </p>
                            <Link to="/register">
                                <Button size="lg" className="bg-white text-violet-600 hover:bg-zinc-100 text-base px-8 h-12 shadow-xl font-semibold">
                                    Get Started Free
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-800 py-8 px-4">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 relative h-10 w-40 overflow-hidden">
                        <img
                            src="/logo.png"
                            alt="ApplyOps"
                            className="absolute top-1/2 left-0 -translate-y-1/2 h-24 w-auto max-w-none object-contain"
                        />
                    </div>
                    <p className="text-zinc-500 text-sm">
                        © 2026 ApplyOps. Built with ♥ for job seekers.
                    </p>
                </div>
            </footer>
        </div>
    )
}
