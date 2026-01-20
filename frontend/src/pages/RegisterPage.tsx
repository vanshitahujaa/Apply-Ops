import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, User, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const setUser = useAuthStore((state) => state.setUser)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await authApi.register(email, password, name)
            setUser(response.data.data.user)
            window.location.href = '/dashboard'
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } }
            setError(error.response?.data?.message || 'Registration failed. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleSignup = () => {
        authApi.googleAuth()
    }

    const benefits = [
        'Auto-track all job applications',
        'AI-powered resume optimization',
        'Smart cover letter generator',
    ]

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-radial from-violet-500/20 via-transparent to-transparent rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
            </div>

            {/* Back Link */}
            <div className="relative z-10 p-4 sm:p-6">
                <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to home
                </Link>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-4 pb-8">
                <div className="w-full max-w-sm relative z-10">
                    <div className="flex items-center justify-center mb-8">
                        <div className="relative h-10 w-48 overflow-hidden">
                            <img
                                src="/logo.png"
                                alt="ApplyOps"
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-auto max-w-none object-contain"
                            />
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Create your account</h1>
                        <p className="text-zinc-400">Start optimizing your job search today</p>
                    </div>

                    {/* Form Card */}
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 sm:p-8">
                        {/* Benefits */}
                        <div className="mb-6 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                            <ul className="space-y-2.5">
                                {benefits.map((benefit, index) => (
                                    <li key={index} className="flex items-center gap-2.5 text-sm">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                                        </div>
                                        <span className="text-zinc-300">{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Google Sign Up */}
                        <Button variant="outline" className="w-full h-11 mb-6" onClick={handleGoogleSignup}>
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </Button>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-3 text-xs text-zinc-500 bg-zinc-900">or continue with email</span>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                        minLength={8}
                                    />
                                </div>
                                <p className="text-xs text-zinc-500">Must be at least 8 characters</p>
                            </div>

                            <Button type="submit" variant="gradient" className="w-full h-11" disabled={isLoading}>
                                {isLoading ? 'Creating account...' : 'Create Account'}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-sm text-zinc-400 mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
