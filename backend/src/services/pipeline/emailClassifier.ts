// ============================================================
// Email Classifier v2 — Full Pre-Processor
// ============================================================
// Combines Platform Registry + Keyword Engine + chrono-node
// date parsing + meeting link extraction + deadline detection
// + reschedule/cancel detection — all BEFORE any AI call.
// ============================================================

import * as chrono from 'chrono-node';
import { isKnownSource, extractCompanyFromDomain, type SourceMatch } from './platformRegistry.js';
import { scoreEmail, SCORE_THRESHOLD, type KeywordMatch, type EmailCategory } from './keywordEngine.js';

// ============================================================
// Types
// ============================================================

export interface ClassifiedEmail {
    source: SourceMatch;
    keywords: KeywordMatch;
    shouldSendToAI: boolean;
    reason: string;

    extractedData: {
        company: string | null;
        role: string | null;
        interviewDate: string | null;
        deadline: string | null;
        timezone: string | null;
        suggestedStatus: string | null;
        detectedRound: string | null;
        meetingLink: string | null;
        platform: string;
        isReschedule: boolean;
        isCancellation: boolean;
    };

    cleanSubject: string;
    cleanBody: string;
}

export interface RawEmailInput {
    subject: string;
    from: string;
    body: string;
    date?: string;
    threadId?: string;
}

// ============================================================
// HTML Stripping
// ============================================================

function stripHtml(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&rsquo;/gi, "'")
        .replace(/&lsquo;/gi, "'")
        .replace(/&rdquo;/gi, '"')
        .replace(/&ldquo;/gi, '"')
        .replace(/&mdash;/gi, '—')
        .replace(/&ndash;/gi, '–')
        .replace(/&#\d+;/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
}

// ============================================================
// Email Address / Name Extraction
// ============================================================

function extractEmailAddress(fromHeader: string): string {
    const match = fromHeader.match(/<([^>]+)>/);
    if (match) return match[1].toLowerCase().trim();
    return fromHeader.toLowerCase().trim();
}

function extractSenderName(fromHeader: string): string {
    const match = fromHeader.match(/^"?([^"<]+)"?\s*</);
    if (match) return match[1].trim();
    return '';
}

// ============================================================
// Date/Time Extraction with chrono-node
// ============================================================

const DATE_CONTEXT_KEYWORDS = [
    'interview', 'call', 'meeting', 'round', 'assessment',
    'test', 'screening', 'schedule', 'slot', 'session',
    'discuss', 'connect', 'speak', 'zoom', 'teams', 'meet',
    'invite', 'join', 'attend', 'available',
];

const DEADLINE_KEYWORDS = [
    'deadline', 'expires', 'expire', 'complete by', 'submit by',
    'due by', 'due date', 'last date', 'before', 'within',
    'hours to complete', 'days to complete', 'valid for',
    'valid until', 'attempt before',
];

interface ExtractedDates {
    interviewDate: string | null;
    deadline: string | null;
    timezone: string | null;
}

function extractDates(text: string, emailDate?: string): ExtractedDates {
    const refDate = emailDate ? new Date(emailDate) : new Date();
    let interviewDate: string | null = null;
    let deadline: string | null = null;
    let timezone: string | null = null;

    // Parse all dates from the text using chrono-node
    const results = chrono.parse(text, refDate, { forwardDate: true });

    for (const result of results) {
        const parsed = result.start.date();
        if (isNaN(parsed.getTime())) continue;

        // Check surrounding context (100 chars each way)
        const contextStart = Math.max(0, result.index - 120);
        const contextEnd = Math.min(text.length, result.index + result.text.length + 120);
        const context = text.substring(contextStart, contextEnd).toLowerCase();

        // Extract timezone if present
        if (result.start.get('timezoneOffset') !== undefined) {
            const offset = result.start.get('timezoneOffset')!;
            const hours = Math.floor(Math.abs(offset) / 60);
            const mins = Math.abs(offset) % 60;
            const sign = offset >= 0 ? '+' : '-';
            timezone = `UTC${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        }

        // Check if timezone abbreviation is mentioned
        const tzMatch = context.match(/\b(IST|EST|PST|CST|MST|GMT|UTC|PT|ET|CT|MT|CET|AEST|JST|KST|SGT)\b/i);
        if (tzMatch && !timezone) {
            timezone = tzMatch[1].toUpperCase();
        }

        // Is this a deadline?
        const isDeadline = DEADLINE_KEYWORDS.some(kw => context.includes(kw));
        if (isDeadline && !deadline) {
            deadline = parsed.toISOString();
            continue;
        }

        // Is this an interview/meeting date?
        const isInterview = DATE_CONTEXT_KEYWORDS.some(kw => context.includes(kw));
        if (isInterview && !interviewDate) {
            // Sanity check: should be in the future (or within last day)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (parsed >= oneDayAgo) {
                interviewDate = parsed.toISOString();
            }
        }
    }

    return { interviewDate, deadline, timezone };
}

// ============================================================
// Meeting Link Extraction
// ============================================================

const MEETING_LINK_PATTERNS: RegExp[] = [
    // Zoom
    /https?:\/\/[\w.-]*zoom\.us\/[jw]\/[\w?&=\-%.]+/gi,
    // Google Meet
    /https?:\/\/meet\.google\.com\/[\w-]+/gi,
    // Microsoft Teams
    /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[\w%\-/.?&=]+/gi,
    // Webex
    /https?:\/\/[\w.-]*\.webex\.com\/[\w\-/.?&=]+/gi,
    // GoTo Meeting
    /https?:\/\/[\w.-]*gotomeeting\.com\/[\w\-/.?&=]+/gi,
    // Calendly (scheduling links)
    /https?:\/\/calendly\.com\/[\w\-/.?&=]+/gi,
    // Generic meet/call links from career platforms
    /https?:\/\/[\w.-]*\.chime\.aws\/[\w]+/gi,
    // CoderPad (live coding)
    /https?:\/\/[\w.-]*coderpad\.io\/[\w\-/.?&=]+/gi,
    // HackerRank interview links
    /https?:\/\/[\w.-]*hackerrank\.com\/[\w\-/.?&=]*interview[\w\-/.?&=]*/gi,
];

function extractMeetingLink(text: string): string | null {
    for (const pattern of MEETING_LINK_PATTERNS) {
        pattern.lastIndex = 0;
        const match = text.match(pattern);
        if (match) return match[0];
    }
    return null;
}

// ============================================================
// Reschedule / Cancellation Detection
// ============================================================

const RESCHEDULE_KEYWORDS = [
    'rescheduled', 'reschedule', 'new time', 'updated time',
    'change in schedule', 'moved to', 'postponed', 'shifted to',
    'new date', 'updated date', 'revised schedule',
];

const CANCEL_KEYWORDS = [
    'cancelled', 'canceled', 'interview has been cancelled',
    'no longer scheduled', 'withdrawn', 'position closed',
    'position has been closed', 'no longer available',
    'put on hold', 'hiring freeze', 'role has been put on hold',
];

function detectReschedule(text: string): boolean {
    const lower = text.toLowerCase();
    return RESCHEDULE_KEYWORDS.some(kw => lower.includes(kw));
}

function detectCancellation(text: string): boolean {
    const lower = text.toLowerCase();
    return CANCEL_KEYWORDS.some(kw => lower.includes(kw));
}

// ============================================================
// Round Detection (30+ patterns)
// ============================================================

const ROUND_PATTERNS: { pattern: RegExp; round: string }[] = [
    { pattern: /coding\s*(assessment|test|challenge|round)/i, round: 'Coding Assessment' },
    { pattern: /online\s*(assessment|test)/i, round: 'Online Assessment' },
    { pattern: /hackerrank|codesignal|codility|hackerearth/i, round: 'Coding Assessment' },
    { pattern: /technical\s*(round|interview)/i, round: 'Technical Round' },
    { pattern: /system\s*design\s*(round|interview)?/i, round: 'System Design Round' },
    { pattern: /machine\s*coding\s*(round)?/i, round: 'Machine Coding Round' },
    { pattern: /dsa\s*(round)?/i, round: 'DSA Round' },
    { pattern: /low\s*level\s*design/i, round: 'Low Level Design Round' },
    { pattern: /high\s*level\s*design/i, round: 'High Level Design Round' },
    { pattern: /hr\s*(round|interview)/i, round: 'HR Round' },
    { pattern: /managerial\s*(round|interview)/i, round: 'Managerial Round' },
    { pattern: /manager\s*(round|interview)/i, round: 'Manager Round' },
    { pattern: /hiring\s*manager\s*(round|interview)?/i, round: 'Hiring Manager Round' },
    { pattern: /bar\s*raiser/i, round: 'Bar Raiser Round' },
    { pattern: /final\s*(round|interview)/i, round: 'Final Round' },
    { pattern: /culture\s*fit/i, round: 'Culture Fit Round' },
    { pattern: /behavioral\s*(round|interview)/i, round: 'Behavioral Round' },
    { pattern: /phone\s*(screen|screening|interview)/i, round: 'Phone Screening' },
    { pattern: /screening\s*(call|round|interview)/i, round: 'Screening Call' },
    { pattern: /panel\s*(round|interview)/i, round: 'Panel Interview' },
    { pattern: /on-?site\s*(round|interview)?/i, round: 'On-Site Interview' },
    { pattern: /take-?\s*home\s*(assignment|project|test)/i, round: 'Take-Home Assignment' },
    { pattern: /pair\s*programming/i, round: 'Pair Programming' },
    { pattern: /live\s*coding/i, round: 'Live Coding' },
    { pattern: /presentation\s*round/i, round: 'Presentation Round' },
    { pattern: /case\s*study/i, round: 'Case Study Round' },
    { pattern: /group\s*discussion/i, round: 'Group Discussion' },
    { pattern: /whiteboard\s*(round|interview|session)?/i, round: 'Whiteboard Interview' },
    { pattern: /offer\s*letter/i, round: 'Offer Letter' },
    { pattern: /joining\s*letter/i, round: 'Joining Letter' },
    { pattern: /round\s*(\d)/i, round: 'Round $1' },
    { pattern: /first\s*round/i, round: 'Round 1' },
    { pattern: /second\s*round/i, round: 'Round 2' },
    { pattern: /third\s*round/i, round: 'Round 3' },
    { pattern: /fourth\s*round/i, round: 'Round 4' },
];

function detectRound(text: string): string | null {
    for (const { pattern, round } of ROUND_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            if (round.includes('$1') && match[1]) {
                return round.replace('$1', match[1]);
            }
            return round;
        }
    }
    return null;
}

// ============================================================
// Company / Role Extraction
// ============================================================

function extractCompanyName(subject: string, senderName: string, senderEmail: string): string | null {
    // Strategy 1: Extract from subject line patterns (most reliable)
    const subjectPatterns = [
        /(?:application|applied)\s+(?:at|to|for|with)\s+(.+?)(?:\s*[-–|]\s*|\s*for\s+|\s*$)/i,
        /(?:interview|offer)\s+(?:at|with|from)\s+(.+?)(?:\s*[-–|]\s*|\s*for\s+|\s*$)/i,
        /^(.+?)\s*[-–|]\s*(?:application|interview|offer|update)/i,
        /(?:from|at|with)\s+(.+?)(?:\s*[-–|:]\s*|\s*$)/i,
    ];
    for (const pattern of subjectPatterns) {
        const match = subject.match(pattern);
        if (match?.[1]) {
            const company = match[1].trim();
            if (company.length > 1 && company.length < 50) return company;
        }
    }

    // Strategy 2: Extract from sender display name
    if (senderName) {
        const cleaned = senderName
            .replace(/\b(careers|jobs|hiring|talent|recruiting|recruitment|hr|notifications?|no-?reply|team|invitations?)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        // Ignore generic ATS names
        const lowercaseCleaned = cleaned.toLowerCase();
        if (!['greenhouse', 'workday', 'lever', 'hackerrank', 'codesignal'].includes(lowercaseCleaned)) {
            if (cleaned.length > 1 && cleaned.length < 50) return cleaned;
        }
    }

    // Strategy 3: Extract from sender domain
    const domain = senderEmail.split('@')[1];
    if (domain) return extractCompanyFromDomain(domain);
    return null;
}

function extractRole(subject: string, body: string): string | null {
    const combined = subject + ' ' + body.substring(0, 1000);
    const rolePatterns = [
        /(?:position|role|opening)\s*(?:of|for|:)\s*(.+?)(?:\s*at\s|\s*[-–|,]\s*|\s*$)/i,
        /(?:applied for|application for)\s+(?:the\s+)?(.+?)(?:\s*at\s|\s*[-–|,]\s*|\s*position|\s*role|\s*$)/i,
        /(?:interview for|interviewing for)\s+(?:the\s+)?(.+?)(?:\s*at\s|\s*[-–|,]\s*|\s*position|\s*role|\s*$)/i,
        /(?:for the)\s+(.+?)\s+(?:position|role|opening)/i,
    ];
    for (const pattern of rolePatterns) {
        const match = combined.match(pattern);
        if (match?.[1]) {
            const role = match[1].trim();
            if (role.length > 2 && role.length < 80) return role;
        }
    }
    return null;
}

// ============================================================
// Main Export: classifyEmail()
// ============================================================

export function classifyEmail(input: RawEmailInput): ClassifiedEmail {
    const senderEmail = extractEmailAddress(input.from);
    const senderName = extractSenderName(input.from);
    const cleanBody = stripHtml(input.body);
    const cleanSubject = input.subject.trim();

    // --- Stage 1: Source Filter ---
    const source = isKnownSource(senderEmail);

    // --- Stage 2: Keyword Engine ---
    const keywords = scoreEmail(cleanSubject, cleanBody);

    // --- Data Extraction ---
    const company = extractCompanyName(cleanSubject, senderName, senderEmail);
    const role = extractRole(cleanSubject, cleanBody);
    const dates = extractDates(cleanSubject + ' ' + cleanBody.substring(0, 3000), input.date);
    const detectedRound = detectRound(cleanSubject + ' ' + cleanBody.substring(0, 2000));
    const meetingLink = extractMeetingLink(input.body); // Search raw HTML for links
    const isReschedule = detectReschedule(cleanSubject + ' ' + cleanBody.substring(0, 1000));
    const isCancellation = detectCancellation(cleanSubject + ' ' + cleanBody.substring(0, 1000));

    // --- Decision Logic ---
    let shouldSendToAI = false;
    let reason = '';

    if (source.trusted && keywords.score >= SCORE_THRESHOLD) {
        shouldSendToAI = true;
        reason = `Trusted source (${source.platform}, ${source.confidence}) + keyword match (score: ${keywords.score}, category: ${keywords.matchedCategory})`;
    } else if (source.trusted && source.confidence === 'HIGH' && keywords.score >= 3) {
        shouldSendToAI = true;
        reason = `HIGH confidence source (${source.platform}) with partial keyword match (score: ${keywords.score})`;
    } else if (!source.trusted && keywords.score >= SCORE_THRESHOLD * 2) {
        shouldSendToAI = true;
        reason = `Unknown source but very strong keyword match (score: ${keywords.score}, category: ${keywords.matchedCategory})`;
    } else if (source.trusted && keywords.score < 3) {
        reason = `Trusted source (${source.platform}) but no meaningful keyword matches — likely promotional`;
    } else {
        reason = `Source not trusted (${source.platform}) and keyword score too low (${keywords.score})`;
    }

    return {
        source,
        keywords,
        shouldSendToAI,
        reason,
        extractedData: {
            company,
            role,
            interviewDate: dates.interviewDate,
            deadline: dates.deadline,
            timezone: dates.timezone,
            suggestedStatus: keywords.suggestedStatus,
            detectedRound,
            meetingLink,
            platform: source.trusted ? source.platform : (company || 'Unknown'),
            isReschedule,
            isCancellation,
        },
        cleanSubject,
        cleanBody: cleanBody.substring(0, 1500),
    };
}
