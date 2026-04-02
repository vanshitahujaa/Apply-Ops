// ============================================================
// Keyword Engine — Stage 2 of the Smart Email Pipeline
// ============================================================
// 120+ keywords across 6 categories with weighted scoring.
// Scans both subject line and email body to determine if an
// email is job-related and what status it represents.
// ============================================================

export interface KeywordMatch {
    score: number;
    matchedCategory: EmailCategory;
    matchedKeywords: string[];
    suggestedStatus: 'APPLIED' | 'ACKNOWLEDGED' | 'UNDER_REVIEW' | 'ASSESSMENT' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED' | null;
    allMatches: CategoryMatch[];
}

export interface CategoryMatch {
    category: EmailCategory;
    keywords: string[];
    score: number;
}

export type EmailCategory =
    | 'APPLICATION_CONFIRMATION'
    | 'INTERVIEW_INVITE'
    | 'ASSESSMENT'
    | 'INTERVIEW_ROUNDS'
    | 'OFFER'
    | 'REJECTION'
    | 'NONE';

// ============================================================
// Keyword Definitions — 120+ phrases, 6 categories
// ============================================================

interface KeywordCategory {
    weight: number;
    status: 'APPLIED' | 'ACKNOWLEDGED' | 'UNDER_REVIEW' | 'ASSESSMENT' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED';
    keywords: string[];
}

const KEYWORD_CATEGORIES: Record<string, KeywordCategory> = {

    // ---- Category 1: Application Confirmations ----
    APPLICATION_CONFIRMATION: {
        weight: 3,
        status: 'ACKNOWLEDGED',
        keywords: [
            // Core phrases
            'thank you for applying',
            'thanks for applying',
            'application received',
            'we received your application',
            'your application has been submitted',
            'application submitted successfully',
            'successfully submitted your application',
            'thank you for your interest',
            'thanks for your interest',
            'application confirmation',
            'we have received your resume',
            'we have received your cv',
            'your resume has been received',
            'application for the position',
            'applied for the role',
            'candidate portal',
            'your application is under review',
            'application is being reviewed',
            'currently reviewing your application',
            'reviewing your profile',
            'reviewing applications',
            'reviewing candidates',
            'you applied to',
            'your job application',
            'application status update',
            'application update',
        ],
    },

    // ---- Category 2: Interview Invitations ----
    INTERVIEW_INVITE: {
        weight: 5,
        status: 'INTERVIEWING',
        keywords: [
            'interview scheduled',
            'schedule an interview',
            'schedule your interview',
            'invite you for an interview',
            'invited for an interview',
            'invitation to interview',
            'interview invitation',
            'phone screening',
            'phone screen',
            'video call interview',
            'video interview',
            'next round',
            'next steps in our hiring process',
            'next steps in the process',
            'next steps in the interview',
            'shortlisted',
            'you have been shortlisted',
            'screening call',
            'would like to speak with you',
            'would like to schedule a time',
            'would like to connect',
            'schedule a time to speak',
            'calendar invite',
            'interview availability',
            'share your availability',
            'available for an interview',
            'please select a time',
            'book your interview',
            'book a time slot',
            'please pick a slot',
            'calendly',
            'goodtime.io',
            'interview confirmation',
            'confirmed your interview',
            'your interview is scheduled',
            'your interview has been scheduled',
            'looking forward to speaking with you',
            'excited to meet you',
        ],
    },

    // ---- Category 3: Assessments / Coding Tests ----
    ASSESSMENT: {
        weight: 4,
        status: 'ASSESSMENT',
        keywords: [
            'coding assessment',
            'online assessment',
            'technical assessment',
            'coding challenge',
            'coding test',
            'technical test',
            'online test',
            'complete the assessment',
            'assessment link',
            'assessment invitation',
            'take-home assignment',
            'take-home project',
            'take home assignment',
            'take home project',
            'live coding',
            'pair programming',
            'pair programming session',
            'oa invitation',
            'proctored test',
            'proctored assessment',
            'algorithmic challenge',
            'hackerrank',
            'codesignal',
            'codility',
            'hirevue',
            'hackerearth',
            'coderbyte',
            'coderpad',
            'karat interview',
            'testgorilla',
            'mettl assessment',
            'amcat test',
            'cocubes test',
            'code submission',
            'complete the test',
            'test invitation',
            'pre-interview assessment',
            'skills assessment',
            'aptitude test',
        ],
    },

    // ---- Category 4: Interview Rounds ----
    INTERVIEW_ROUNDS: {
        weight: 5,
        status: 'INTERVIEWING',
        keywords: [
            'technical round',
            'tech round',
            'technical interview',
            'hr round',
            'hr interview',
            'managerial round',
            'manager round',
            'hiring manager round',
            'hiring manager interview',
            'system design round',
            'system design interview',
            'final round',
            'final interview',
            'culture fit',
            'culture fit round',
            'behavioral interview',
            'behavioral round',
            'case study round',
            'presentation round',
            'group discussion',
            'bar raiser',
            'bar raiser round',
            'team matching',
            'team matching round',
            'on-site round',
            'onsite interview',
            'on-site interview',
            'super day',
            'panel interview',
            'panel round',
            'leadership round',
            'vp round',
            'director round',
            'cto round',
            'founder round',
            'cross-functional round',
            'design round',
            'product round',
            'whiteboard interview',
            'whiteboard round',
            'machine coding round',
            'dsa round',
            'low level design',
            'high level design',
            'round 1',
            'round 2',
            'round 3',
            'round 4',
            'first round',
            'second round',
            'third round',
            'next round of interview',
            'advanced to the next round',
            'moved to the next round',
            'progressed to the next stage',
        ],
    },

    // ---- Category 5: Offers ----
    OFFER: {
        weight: 6,
        status: 'OFFERED',
        keywords: [
            'pleased to offer',
            'pleased to extend',
            'happy to offer',
            'delighted to offer',
            'we are delighted',
            'job offer',
            'offer letter',
            'offer of employment',
            'employment offer',
            'extend an offer',
            'extending an offer',
            'formal offer',
            'compensation package',
            'compensation details',
            'terms of employment',
            'welcome to the team',
            'welcome aboard',
            'joining date',
            'proposed start date',
            'your start date',
            'background check',
            'background verification',
            'reference check',
            'congratulations on your selection',
            'selected for the position',
            'you have been selected',
            'we are excited to have you',
            'offer acceptance',
            'accept this offer',
            'sign the offer',
            'ctc details',
            'annual compensation',
            'salary details',
        ],
    },

    // ---- Category 6: Rejections ----
    REJECTION: {
        weight: 4,
        status: 'REJECTED',
        keywords: [
            'unfortunately',
            'we regret',
            'regret to inform',
            'not moving forward',
            'not be moving forward',
            'decided to move forward with other candidates',
            'decided to pursue other candidates',
            'pursued other candidates',
            'other candidates whose',
            'position has been filled',
            'role has been filled',
            'not selected',
            'not been selected',
            'will not be proceeding',
            'unable to proceed',
            'unable to move forward',
            'will keep your resume on file',
            'keep your resume on file',
            'keep your profile on file',
            'wish you the best',
            'wish you all the best in your future',
            'take a different direction',
            'after careful consideration',
            'after much deliberation',
            'competitive applicant pool',
            'highly competitive',
            'strong pool of candidates',
            'closing this role',
            'closing the search',
            'no longer considering',
            'not a fit at this time',
            'not the right fit',
            'better suited candidates',
            'other applicants',
            'will not be offering',
            'not in a position to offer',
        ],
    },
};

// ============================================================
// Negative Keywords — Emails that look job-related but aren't
// ============================================================

const NEGATIVE_KEYWORDS: string[] = [
    'unsubscribe from job alerts',
    'job alert preferences',
    'job recommendations for you',
    'jobs you may be interested in',
    'similar jobs',
    'recommended jobs',
    'new jobs matching your',
    'weekly job digest',
    'daily job digest',
    'job search tips',
    'career advice article',
    'newsletter',
    'webinar invitation',
    'event invitation',
    'promotional offer',
    'upgrade your plan',
    'premium membership',
    'salary survey',
    'market insights',
    'blog post',
    'course recommendation',
    'skill assessment practice',  // practice vs real assessment
];

// ============================================================
// Main Export: scoreEmail()
// ============================================================

export function scoreEmail(subject: string, body: string): KeywordMatch {
    const subjectLower = subject.toLowerCase();
    // Only scan first 2000 chars of body for performance
    const bodyLower = body.substring(0, 2000).toLowerCase();
    const combinedText = subjectLower + ' ' + bodyLower;

    // --- Check negative keywords first (spam/promotional emails) ---
    const negativeCount = NEGATIVE_KEYWORDS.filter(kw => combinedText.includes(kw)).length;
    if (negativeCount >= 2) {
        return {
            score: 0,
            matchedCategory: 'NONE',
            matchedKeywords: [],
            suggestedStatus: null,
            allMatches: [],
        };
    }

    // --- Score against all categories ---
    const allMatches: CategoryMatch[] = [];
    let bestCategory: EmailCategory = 'NONE';
    let bestScore = 0;
    let bestStatus: 'APPLIED' | 'ACKNOWLEDGED' | 'UNDER_REVIEW' | 'ASSESSMENT' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED' | null = null;
    const allMatchedKeywords: string[] = [];

    for (const [categoryName, config] of Object.entries(KEYWORD_CATEGORIES)) {
        const matchedInCategory: string[] = [];
        let categoryScore = 0;

        for (const keyword of config.keywords) {
            const keywordLower = keyword.toLowerCase();

            // Check subject (2x weight — subject matches are stronger signal)
            if (subjectLower.includes(keywordLower)) {
                matchedInCategory.push(`[SUBJECT] ${keyword}`);
                categoryScore += config.weight * 2;
            }
            // Check body
            else if (bodyLower.includes(keywordLower)) {
                matchedInCategory.push(keyword);
                categoryScore += config.weight;
            }
        }

        if (matchedInCategory.length > 0) {
            allMatches.push({
                category: categoryName as EmailCategory,
                keywords: matchedInCategory,
                score: categoryScore,
            });

            allMatchedKeywords.push(...matchedInCategory);

            if (categoryScore > bestScore) {
                bestScore = categoryScore;
                bestCategory = categoryName as EmailCategory;
                bestStatus = config.status;
            }
        }
    }

    // --- Apply negative keyword penalty ---
    const finalScore = Math.max(0, bestScore - (negativeCount * 3));

    return {
        score: finalScore,
        matchedCategory: bestCategory,
        matchedKeywords: allMatchedKeywords,
        suggestedStatus: bestStatus,
        allMatches,
    };
}

// ============================================================
// Export: getKeywordStats() — For debugging/analytics
// ============================================================

export function getKeywordStats(): { totalKeywords: number; categories: number; negativeKeywords: number } {
    let totalKeywords = 0;
    for (const config of Object.values(KEYWORD_CATEGORIES)) {
        totalKeywords += config.keywords.length;
    }
    return {
        totalKeywords,
        categories: Object.keys(KEYWORD_CATEGORIES).length,
        negativeKeywords: NEGATIVE_KEYWORDS.length,
    };
}

// ============================================================
// Export: Threshold constant
// ============================================================

/** Minimum score required for an email to be sent to Gemini for verification */
export const SCORE_THRESHOLD = 5;
