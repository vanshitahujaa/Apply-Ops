import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '@/store'
import { RefreshCw } from 'lucide-react'

export default function AuthCallbackPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { setUser } = useAuthStore()
    const processedRef = useRef(false)

    useEffect(() => {
        const code = searchParams.get('code')

        if (code && !processedRef.current) {
            processedRef.current = true

            axios.post('/api/auth/google/callback', { code })
                .then(response => {
                    if (response.data.success) {
                        // If token returned, it means login/register. If message only, it means linked.
                        if (response.data.data?.user) {
                            setUser(response.data.data.user)
                        } else {
                            // If just linked, maybe refresh user to get 'gmailConnected: true' status
                            // For now we navigate to settings or dashboard
                        }
                        navigate('/dashboard')
                    }
                })
                .catch(error => {
                    console.error('Auth failed', error)
                    navigate('/login?error=auth_failed')
                })
        } else if (!code) {
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
