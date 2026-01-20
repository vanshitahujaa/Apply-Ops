import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Application, AnalyticsData } from '@/lib/types'

interface AuthState {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    setUser: (user: User | null) => void
    logout: () => void
}

interface ApplicationState {
    applications: Application[]
    selectedApplication: Application | null
    isLoading: boolean
    setApplications: (applications: Application[]) => void
    addApplication: (application: Application) => void
    updateApplication: (id: string, updates: Partial<Application>) => void
    deleteApplication: (id: string) => void
    selectApplication: (application: Application | null) => void
}

interface AnalyticsState {
    data: AnalyticsData | null
    isLoading: boolean
    setAnalytics: (data: AnalyticsData) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: true,
            setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
            logout: () => {
                localStorage.removeItem('token')
                set({ user: null, isAuthenticated: false, isLoading: false })
            },
        }),
        {
            name: 'auth-storage',
        }
    )
)

export const useApplicationStore = create<ApplicationState>((set) => ({
    applications: [],
    selectedApplication: null,
    isLoading: false,
    setApplications: (applications) => set({ applications }),
    addApplication: (application) =>
        set((state) => ({ applications: [application, ...state.applications] })),
    updateApplication: (id, updates) =>
        set((state) => ({
            applications: state.applications.map((app) =>
                app.id === id ? { ...app, ...updates } : app
            ),
        })),
    deleteApplication: (id) =>
        set((state) => ({
            applications: state.applications.filter((app) => app.id !== id),
        })),
    selectApplication: (application) => set({ selectedApplication: application }),
}))

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
    data: null,
    isLoading: false,
    setAnalytics: (data) => set({ data }),
}))
