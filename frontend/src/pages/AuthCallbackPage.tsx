import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/store'
import { RefreshCw } from 'lucide-react'

export default function AuthCallbackPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { setUser } = useAuthStore()

    useEffect(() => {
        const token = searchParams.get('token')
        const error = searchParams.get('error')

        if (token) {
            // 1. Immediately store the token
            localStorage.setItem('token', token)

            // 2. Fetch user details using the configured API (includes baseURL)
            // We pass the header explicitly just in case the interceptor hasn't picked it up yet
            authApi.me()
                .then(response => {
                    if (response.data.success) {
                        setUser(response.data.data)
                        navigate('/dashboard')
                    } else {
                        throw new Error('Failed to fetch user')
                    }
                })
                .catch((err) => {
                    console.error('Auth callback error:', err)
                    // Even if fetching user fails, we have the token.
                    // Let the Dashboard's initAuth handle the retry or failure.
                    navigate('/dashboard')
                })
        } else if (error) {
            navigate('/login?error=auth_failed')
        } else {
            // No token, no error? Redirect to login
            navigate('/login')
        }
    }, [searchParams, navigate, setUser])

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                <p className="text-zinc-400">Authenticating with Google...</p>
            </div>
        </div>
    )
}
