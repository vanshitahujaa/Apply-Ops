// ============================================================
// Platform Registry — Stage 1 of the Smart Email Pipeline
// ============================================================
// Comprehensive registry of 60+ career/recruitment platform
// email domains. Used to filter emails by source BEFORE any
// AI processing, saving ~80-90% of Gemini API tokens.
// ============================================================

export interface SourceMatch {
    trusted: boolean;
    platform: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    category: 'JOB_PORTAL' | 'ATS' | 'ASSESSMENT' | 'ENTERPRISE' | 'RECRUITER_PATTERN' | 'UNKNOWN';
}

// ---------- Job Portal Domains ----------
// Direct job listing platforms where candidates apply

const JOB_PORTALS: Record<string, string> = {
    // Global Platforms
    'linkedin.com': 'LinkedIn',
    'licdn.com': 'LinkedIn',
    'indeed.com': 'Indeed',
    'indeedemail.com': 'Indeed',
    'glassdoor.com': 'Glassdoor',
    'glassdoor.co.in': 'Glassdoor',
    'ziprecruiter.com': 'ZipRecruiter',
    'monster.com': 'Monster',
    'careerbuilder.com': 'CareerBuilder',
    'dice.com': 'Dice',
    'wellfound.com': 'Wellfound',
    'angel.co': 'AngelList',
    'hired.com': 'Hired',
    'simplyhired.com': 'SimplyHired',
    'theladders.com': 'Ladders',
    'flexjobs.com': 'FlexJobs',
    'remoteok.com': 'RemoteOK',
    'weworkremotely.com': 'WeWorkRemotely',
    'turing.com': 'Turing',
    'toptal.com': 'Toptal',
    'triplebyte.com': 'Triplebyte',
    'levels.fyi': 'Levels.fyi',
    'builtin.com': 'BuiltIn',
    'themuse.com': 'The Muse',
    'hubstaff.com': 'Hubstaff Talent',
    'remote.co': 'Remote.co',
    'remotive.com': 'Remotive',
    'nodesk.co': 'Nodesk',
    'justremote.co': 'JustRemote',
    'powertofly.com': 'PowerToFly',
    'diversityintech.co.uk': 'Diversity in Tech',

    // India-Specific Platforms
    'naukri.com': 'Naukri',
    'foundit.in': 'Foundit (Monster India)',
    'shine.com': 'Shine',
    'timesjobs.com': 'TimesJobs',
    'instahyre.com': 'Instahyre',
    'cutshort.io': 'CutShort',
    'hirist.com': 'Hirist',
    'hirect.in': 'Hirect',
    'apna.co': 'Apna',
    'iimjobs.com': 'IIMJobs',
    'updazz.com': 'Updazz',
    'freshersworld.com': 'FreshersWorld',
    'placement.freshersworld.com': 'FreshersWorld',

    // Startup/Tech-Specific
    'ycombinator.com': 'Y Combinator',
    'workatastartup.com': 'Work at a Startup (YC)',
    'techinasia.com': 'Tech in Asia',
    'f6s.com': 'F6S',
};

// ---------- ATS (Applicant Tracking System) Domains ----------
// Used by companies to manage hiring — emails from these are job-related

const ATS_PLATFORMS: Record<string, string> = {
    // Major ATS Providers
    'greenhouse.io': 'Greenhouse',
    'greenhouse-mail.io': 'Greenhouse',
    'us.greenhouse-mail.io': 'Greenhouse',
    'eu.greenhouse-mail.io': 'Greenhouse',
    'anz.greenhouse.io': 'Greenhouse',
    'hire.lever.co': 'Lever',
    'lever.co': 'Lever',
    'ashbyhq.com': 'Ashby',
    'myworkdayjobs.com': 'Workday',
    'myworkday.com': 'Workday',
    'wd5.myworkdayjobs.com': 'Workday',
    'icims.com': 'iCIMS',
    'taleo.net': 'Taleo',
    'oraclecloud.com': 'Oracle (Taleo)',
    'bamboohr.com': 'BambooHR',
    'smartrecruiters.com': 'SmartRecruiters',
    'jobvite.com': 'Jobvite',
    'rippling.com': 'Rippling',
    'workable.com': 'Workable',
    'workablemail.com': 'Workable',
    'candidates.workablemail.com': 'Workable',
    'jazzhr.com': 'JazzHR',
    'breezy.hr': 'Breezy HR',
    'recruitee.com': 'Recruitee',
    'zohorecruit.com': 'Zoho Recruit',
    'freshteam.com': 'Freshteam',
    'pinpointhq.com': 'Pinpoint',
    'teamtailor.com': 'Teamtailor',
    'personio.de': 'Personio',
    'personio.com': 'Personio',
    'applicantpro.com': 'ApplicantPro',
    'hirebridge.com': 'Hirebridge',
    'paylocity.com': 'Paylocity',
    'ultipro.com': 'UKG (UltiPro)',
    'successfactors.com': 'SAP SuccessFactors',
    'successfactors.eu': 'SAP SuccessFactors',
    'sap.com': 'SAP SuccessFactors',
    'applytojob.com': 'ApplyToJob',
    'clearcompany.com': 'ClearCompany',
    'paycomonline.com': 'Paycom',
    'adp.com': 'ADP',
};

// ---------- Assessment Platform Domains ----------
// Coding tests, technical assessments, video interviews

const ASSESSMENT_PLATFORMS: Record<string, string> = {
    'hackerrank.com': 'HackerRank',
    'hr.hackerrank.com': 'HackerRank',
    'codesignal.com': 'CodeSignal',
    'codility.com': 'Codility',
    'hackerearth.com': 'HackerEarth',
    'coderbyte.com': 'Coderbyte',
    'hirevue.com': 'HireVue',
    'coderpad.io': 'CoderPad',
    'karat.com': 'Karat',
    'karat.io': 'Karat',
    'testgorilla.com': 'TestGorilla',
    'mettl.com': 'Mercer Mettl',
    'qualified.io': 'Qualified',
    'leetcode.com': 'LeetCode',
    'interviewbit.com': 'InterviewBit',
    'interviewkickstart.com': 'Interview Kickstart',
    'talently.ai': 'Talently',
    'byteboard.dev': 'Byteboard',
    'searchlight.ai': 'Searchlight',
    'vervoe.com': 'Vervoe',
    'pymetrics.com': 'Pymetrics',
    'criteria.com': 'Criteria Corp',
    'xobin.com': 'Xobin',
    'devskiller.com': 'DevSkiller',
    'eskill.com': 'eSkill',
    'imocha.io': 'iMocha',
    'amcat.com': 'AMCAT',
    'cocubes.com': 'CoCubes',
    'elitmus.com': 'eLitmus',
};

// ---------- Recruiter Email Patterns ----------
// Local-part patterns that indicate recruiting/talent emails
// These catch company-specific domains (e.g., recruiting@stripe.com)

const RECRUITER_LOCAL_PATTERNS: string[] = [
    'talent',
    'recruiting',
    'recruitment',
    'careers',
    'career',
    'hr',
    'hiring',
    'jobs',
    'staffing',
    'people',
    'peopleops',
    'talent-acquisition',
    'talentacquisition',
    'campus',
    'university-recruiting',
    'early-careers',
    'noreply',
    'no-reply',
    'donotreply',
    'do-not-reply',
    'notifications',
    'apply',
];

// Patterns in the domain that suggest job-related infrastructure
const RECRUITER_DOMAIN_PATTERNS: string[] = [
    'careers',
    'jobs',
    'hire',
    'hiring',
    'recruit',
    'talent',
    'apply',
    'applicant',
    'candidate',
];

// ---------- Big Tech / FAANG Career Domains ----------
// These companies have well-known career-specific subdomains

const BIG_TECH_CAREER_DOMAINS: Record<string, string> = {
    'amazon.jobs': 'Amazon',
    'amazon.com': 'Amazon',
    'google.com': 'Google',
    'meta.com': 'Meta',
    'apple.com': 'Apple',
    'microsoft.com': 'Microsoft',
    'netflix.com': 'Netflix',
    'salesforce.com': 'Salesforce',
    'oracle.com': 'Oracle',
    'adobe.com': 'Adobe',
    'uber.com': 'Uber',
    'stripe.com': 'Stripe',
    'airbnb.com': 'Airbnb',
    'spotify.com': 'Spotify',
    'twitter.com': 'Twitter/X',
    'x.com': 'X',
    'snap.com': 'Snap',
    'nvidia.com': 'NVIDIA',
    'intel.com': 'Intel',
    'ibm.com': 'IBM',
};

// ============================================================
// Main Export: isKnownSource()
// ============================================================

export function isKnownSource(senderEmail: string): SourceMatch {
    const email = senderEmail.toLowerCase().trim();

    // Extract parts
    const atIndex = email.lastIndexOf('@');
    if (atIndex === -1) {
        return { trusted: false, platform: 'Unknown', confidence: 'LOW', category: 'UNKNOWN' };
    }

    const localPart = email.substring(0, atIndex);
    const domain = email.substring(atIndex + 1);

    // --- Check 1: Exact domain match against all registries ---

    // Job Portals (HIGH confidence)
    for (const [portalDomain, name] of Object.entries(JOB_PORTALS)) {
        if (domain === portalDomain || domain.endsWith('.' + portalDomain)) {
            return { trusted: true, platform: name, confidence: 'HIGH', category: 'JOB_PORTAL' };
        }
    }

    // ATS Platforms (HIGH confidence)
    for (const [atsDomain, name] of Object.entries(ATS_PLATFORMS)) {
        if (domain === atsDomain || domain.endsWith('.' + atsDomain)) {
            return { trusted: true, platform: name, confidence: 'HIGH', category: 'ATS' };
        }
    }

    // Assessment Platforms (HIGH confidence)
    for (const [assessDomain, name] of Object.entries(ASSESSMENT_PLATFORMS)) {
        if (domain === assessDomain || domain.endsWith('.' + assessDomain)) {
            return { trusted: true, platform: name, confidence: 'HIGH', category: 'ASSESSMENT' };
        }
    }

    // Big Tech (MEDIUM confidence — could be marketing, not just careers)
    for (const [techDomain, name] of Object.entries(BIG_TECH_CAREER_DOMAINS)) {
        if (domain === techDomain || domain.endsWith('.' + techDomain)) {
            // Boost to HIGH if local part also matches recruiter patterns
            const isRecruiterLocal = RECRUITER_LOCAL_PATTERNS.some(
                pattern => localPart.includes(pattern)
            );
            return {
                trusted: true,
                platform: name,
                confidence: isRecruiterLocal ? 'HIGH' : 'MEDIUM',
                category: isRecruiterLocal ? 'RECRUITER_PATTERN' : 'ENTERPRISE',
            };
        }
    }

    // --- Check 2: Recruiter local-part patterns (any domain) ---
    const matchedLocal = RECRUITER_LOCAL_PATTERNS.some(
        pattern => localPart === pattern || localPart.startsWith(pattern + '+') || localPart.startsWith(pattern + '-') || localPart.startsWith(pattern + '_') || localPart.startsWith(pattern + '.')
    );

    if (matchedLocal) {
        // Extract company name from domain
        const companyName = extractCompanyFromDomain(domain);
        return {
            trusted: true,
            platform: companyName,
            confidence: 'MEDIUM',
            category: 'RECRUITER_PATTERN',
        };
    }

    // --- Check 3: Domain contains recruiter-related keywords ---
    const matchedDomainPattern = RECRUITER_DOMAIN_PATTERNS.some(
        pattern => domain.includes(pattern)
    );

    if (matchedDomainPattern) {
        const companyName = extractCompanyFromDomain(domain);
        return {
            trusted: true,
            platform: companyName,
            confidence: 'MEDIUM',
            category: 'RECRUITER_PATTERN',
        };
    }

    // --- No match ---
    return { trusted: false, platform: 'Unknown', confidence: 'LOW', category: 'UNKNOWN' };
}

// ============================================================
// Helper: Extract company name from domain
// ============================================================

export function extractCompanyFromDomain(domain: string): string {
    // Remove common TLDs and subdomains
    const parts = domain.split('.');
    if (parts.length === 0) return domain;

    // Find the main company part (usually the second-to-last or the primary part)
    let companyPart: string;
    if (parts.length >= 2) {
        // Skip known subdomains
        const skipPrefixes = ['mail', 'email', 'smtp', 'noreply', 'no-reply', 'notifications', 'careers', 'jobs', 'hire', 'apply', 'www'];
        const filtered = parts.filter(p => !skipPrefixes.includes(p));
        // Take the main domain name (usually first meaningful part)
        companyPart = filtered.length >= 2 ? filtered[filtered.length - 2] : filtered[0];
    } else {
        companyPart = parts[0];
    }

    // Capitalize
    return companyPart.charAt(0).toUpperCase() + companyPart.slice(1);
}

// ============================================================
// Export: Get Gmail search query for known platform domains
// ============================================================
// Returns a Gmail-compatible query string to pre-filter by source
// Used as part of the Gmail API `q` parameter

export function buildPlatformSearchQuery(): string {
    // We combine the top platforms into a Gmail OR query
    // Gmail has practical query length limits, so we pick the most common ones
    const topDomains = [
        // Job Portals (most common)
        'linkedin.com', 'indeed.com', 'indeedemail.com', 'glassdoor.com',
        'naukri.com', 'ziprecruiter.com', 'monster.com', 'dice.com',
        'wellfound.com', 'instahyre.com', 'cutshort.io', 'hirist.com',
        'foundit.in', 'hirect.in',
        // ATS Platforms
        'greenhouse.io', 'greenhouse-mail.io', 'lever.co', 'ashbyhq.com',
        'myworkdayjobs.com', 'icims.com', 'smartrecruiters.com',
        'workable.com', 'workablemail.com', 'bamboohr.com', 'jobvite.com',
        'teamtailor.com', 'personio.de',
        // Assessment
        'hackerrank.com', 'codesignal.com', 'codility.com',
        'hackerearth.com', 'hirevue.com', 'mettl.com',
        'amcat.com', 'cocubes.com',
    ];

    const fromClauses = topDomains.map(d => `from:${d}`).join(' OR ');

    // Also add recruiter-pattern queries
    const recruiterClauses = [
        'from:talent@', 'from:recruiting@', 'from:careers@',
        'from:hiring@', 'from:hr@', 'from:recruitment@',
        'from:noreply@*careers*', 'from:noreply@*jobs*',
    ].join(' OR ');

    // Combine: emails from platforms OR emails with recruiter patterns OR keyword matches
    // The keyword part catches emails from company domains that aren't in our registry
    const keywordFallback = '("thank you for applying" OR "application received" OR "interview scheduled" OR "we received your application" OR "coding assessment" OR "offer letter" OR "next round")';

    return `(${fromClauses} OR ${recruiterClauses} OR ${keywordFallback}) -label:SPAM -label:TRASH`;
}

// ============================================================
// Export: All platforms as a flat map for lookups
// ============================================================

export function getAllPlatforms(): Record<string, string> {
    return {
        ...JOB_PORTALS,
        ...ATS_PLATFORMS,
        ...ASSESSMENT_PLATFORMS,
        ...BIG_TECH_CAREER_DOMAINS,
    };
}
