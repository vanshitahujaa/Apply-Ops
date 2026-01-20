// Application Types

export type ApplicationStatus =
    | 'applied'
    | 'viewed'
    | 'interviewing'
    | 'offered'
    | 'rejected'
    | 'withdrawn'

export interface Application {
    id: string
    company: string
    role: string
    status: ApplicationStatus
    platform?: string
    appliedAt: string
    updatedAt: string
    interviewAt?: string
    notes?: string
    salary?: string
    location?: string
    url?: string
}

export interface User {
    id: string
    email: string
    name?: string
    avatarUrl?: string
    gmailConnected: boolean
    createdAt: string
}

export interface Resume {
    id: string
    name: string
    uploadedAt: string
    atsScore?: number
    feedback?: {
        missingHardSkills: string[]
        missingTools: string[]
        sectionSuggestions: string[]
        bulletImprovements: string[]
    }
    fileUrl: string
}

export interface CoverLetter {
    id: string
    applicationId?: string
    company: string
    role: string
    content: string
    tone: 'formal' | 'casual' | 'startup' | 'corporate'
    createdAt: string
}

export interface AnalyticsData {
    totalApplications: number
    responseRate: number
    interviewRate: number
    offerRate: number
    applicationsByPlatform: Record<string, number>
    applicationsByStatus: Record<ApplicationStatus, number>
    weeklyApplications: { week: string; count: number }[]
}

// API Response Types
export interface ApiResponse<T> {
    data: T
    success: boolean
    message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    page: number
    limit: number
    total: number
    totalPages: number
}
