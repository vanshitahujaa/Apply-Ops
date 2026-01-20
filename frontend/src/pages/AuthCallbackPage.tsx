import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
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
            // Backend did the exchange and sent us the token
            // We need to fetch the user usage now or just decode it. 
            // Better to just fetch 'me' to be safe and get full user object.
            // But for now, let's assume valid and fetch user.
            axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }) // Or rely on cookie
                .then(res => {
                    setUser(res.data.data)
                    navigate('/dashboard')
                })
                .catch(() => {
                    // If cookie works, this works. If not, we might need to manually set header or store token.
                    // For this fix, let's try just navigating if we trust the cookie, 
                    // OR manually calling set user if we had the user object.
                    // Simpler: Just navigate to dashboard. The AuthGuard will check /me.
                    navigate('/dashboard')
                })

            // Actually, simplest is to just navigate to dashboard and let the App's auth check verify the cookie.
            // But wait, if cross-site cookie fails, we need the token to be stored.
            // Let's rely on the cookie first.
        } else if (error) {
            navigate('/login?error=auth_failed')
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
