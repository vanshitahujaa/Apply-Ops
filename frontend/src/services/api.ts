import axios from 'axios'
import type {
    Application,
    User,
    Resume,
    CoverLetter,
    AnalyticsData,
    ApiResponse,
    PaginatedResponse
} from '@/lib/types'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
})

// Add request interceptor to inject token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', { email, password }),

    register: (email: string, password: string, name?: string) =>
        api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', { email, password, name }),

    logout: () => api.post('/auth/logout'),

    me: () => api.get<ApiResponse<User>>('/auth/me'),

    googleAuth: async () => {
        const { data } = await api.get('/auth/google/url')
        if (data.success) {
            window.location.href = data.url
        }
    },

    connectGmail: async () => {
        const { data } = await api.get('/auth/google/url')
        if (data.success) {
            window.location.href = data.url
        }
    },

    disconnectGmail: () => api.post('/auth/gmail/disconnect'),
}

// Applications API
export const applicationsApi = {
    getAll: (page = 1, limit = 20) =>
        api.get<PaginatedResponse<Application>>('/applications', { params: { page, limit } }),

    getById: (id: string) =>
        api.get<ApiResponse<Application>>(`/applications/${id}`),

    create: (data: Partial<Application>) =>
        api.post<ApiResponse<Application>>('/applications', data),

    update: (id: string, data: Partial<Application>) =>
        api.patch<ApiResponse<Application>>(`/applications/${id}`, data),

    delete: (id: string) =>
        api.delete(`/applications/${id}`),
}

// Resume API
export const resumeApi = {
    getAll: () => api.get<ApiResponse<Resume[]>>('/resumes'),

    upload: (file: File) => {
        const formData = new FormData()
        formData.append('resume', file)
        return api.post<ApiResponse<Resume>>('/resumes/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },

    analyze: (resumeId: string, jobDescription: string) =>
        api.post<ApiResponse<{ score: number; suggestions: string[]; keywords: string[] }>>(
            '/resumes/analyze',
            { resumeId, jobDescription }
        ),

    optimize: (resumeId: string, jobDescription: string) =>
        api.post<ApiResponse<{ optimizedContent: string; improvements: string[] }>>(
            '/resumes/optimize',
            { resumeId, jobDescription }
        ),

    delete: (id: string) => api.delete(`/resumes/${id}`),
}

// Cover Letter API
export const coverLetterApi = {
    getAll: () => api.get<ApiResponse<CoverLetter[]>>('/cover-letters'),

    generate: (data: {
        company: string
        role: string
        jobDescription: string
        resumeId?: string
        tone: 'formal' | 'casual' | 'startup' | 'corporate'
    }) => api.post<ApiResponse<CoverLetter>>('/cover-letters/generate', data),

    update: (id: string, content: string) =>
        api.patch<ApiResponse<CoverLetter>>(`/cover-letters/${id}`, { content }),

    delete: (id: string) => api.delete(`/cover-letters/${id}`),
}

// Analytics API
export const analyticsApi = {
    getOverview: () => api.get<ApiResponse<AnalyticsData>>('/analytics/overview'),

    getPlatformStats: () =>
        api.get<ApiResponse<Record<string, { applications: number; responses: number }>>>(
            '/analytics/platforms'
        ),

    getResumePerformance: () =>
        api.get<ApiResponse<{ resumeId: string; name: string; responseRate: number }[]>>(
            '/analytics/resumes'
        ),
}

export default api
