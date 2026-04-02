import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { AppError } from '../../middleware/errorHandler.js';

dotenv.config();

const getGenAI = () => {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// ---------- Email Verifier (v2.1 — Structured Verifier) ----------
// Receives pre-classified hints and asks Gemini to CONFIRM/CORRECT.
// Uses strict JSON schema, validates response before returning.

export interface PreClassificationHints {
    company: string | null;
    role: string | null;
    interviewDate: string | null;
    deadline: string | null;
    suggestedStatus: string | null;
    detectedRound: string | null;
    meetingLink: string | null;
    platform: string;
    isReschedule: boolean;
    isCancellation: boolean;
}

export interface VerifiedEmailResult {
    company: string;
    role: string;
    status: 'APPLIED' | 'ACKNOWLEDGED' | 'UNDER_REVIEW' | 'ASSESSMENT' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED';
    round: string | null;
    confidence: number;
    interviewDate: string | null;
    deadline: string | null;
    location: string | null;
    salary: string | null;
    notes: string;
    needsCalendar: boolean;
}

// Valid statuses for validation
const VALID_STATUSES = ['APPLIED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ASSESSMENT', 'INTERVIEWING', 'OFFERED', 'REJECTED'];

export const verifyEmailAI = async (
    subject: string,
    cleanBody: string,
    sender: string,
    hints: PreClassificationHints
): Promise<VerifiedEmailResult | null> => {
    if (!process.env.GEMINI_API_KEY) return null;

    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { temperature: 0.1 }
        });

        const prompt = `You are a job email verifier. Our script pre-screened this email and extracted:
- Company: "${hints.company || '?'}"
- Role: "${hints.role || '?'}"  
- Status: "${hints.suggestedStatus || '?'}"
- Round: "${hints.detectedRound || 'none'}"
- Interview Date: "${hints.interviewDate || 'none'}"
- Deadline: "${hints.deadline || 'none'}"
- Reschedule: ${hints.isReschedule}
- Cancellation: ${hints.isCancellation}

CONFIRM or CORRECT these values. Return STRICT JSON ONLY:
{
  "isJobEmail": boolean,
  "company": "exact company name",
  "role": "exact job title",
  "status": "APPLIED|ACKNOWLEDGED|UNDER_REVIEW|ASSESSMENT|INTERVIEWING|OFFERED|REJECTED",
  "round": "round name or null",
  "confidence": 0.0 to 1.0,
  "interviewDate": "ISO datetime or null",
  "deadline": "ISO datetime or null",
  "location": "city/remote or null",
  "salary": "compensation or null",
  "summary": "1-sentence update summary",
  "needsCalendar": boolean
}

Status meanings:
- APPLIED: User applied, no acknowledgement yet
- ACKNOWLEDGED: Company confirmed receipt of application
- UNDER_REVIEW: Application is being evaluated
- ASSESSMENT: Coding test / OA / take-home pending
- INTERVIEWING: Interview scheduled or in progress
- OFFERED: Job offer extended
- REJECTED: Application rejected

Sender: ${sender}
Subject: ${subject}
Body: ${cleanBody}`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().replace(/```json|```/g, '').trim();
        const data = JSON.parse(text);

        // --- Backend validation of AI response ---
        if (!data.isJobEmail) return null;
        if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
            data.confidence = 0.5; // Default if invalid
        }

        // Validate status
        let status = data.status?.toUpperCase();
        if (!VALID_STATUSES.includes(status)) {
            // Map legacy statuses
            if (status === 'INTERVIEW') status = 'INTERVIEWING';
            else if (status === 'OFFER') status = 'OFFERED';
            else status = hints.suggestedStatus || 'APPLIED';
        }

        return {
            company: data.company || hints.company || 'Unknown',
            role: data.role || hints.role || 'Unknown Role',
            status: status as VerifiedEmailResult['status'],
            round: data.round || hints.detectedRound || null,
            confidence: data.confidence,
            interviewDate: data.interviewDate || hints.interviewDate || null,
            deadline: data.deadline || hints.deadline || null,
            location: data.location || null,
            salary: data.salary || null,
            notes: data.summary || '',
            needsCalendar: data.needsCalendar ?? (status === 'INTERVIEWING' && !!(data.interviewDate || hints.interviewDate)),
        };

    } catch (e: any) {
        console.error('AI Email Verification Failed:', e);
        throw e;
    }
};

// ---------- Legacy Email Analyzer (v1 — Deprecated) ----------
// Kept for backward compatibility. New code should use verifyEmailAI().

export const analyzeEmailAI = async (
    emailBody: string,
    subject: string,
    sender: string
): Promise<VerifiedEmailResult | null> => {
    return verifyEmailAI(subject, emailBody.substring(0, 1500), sender, {
        company: null,
        role: null,
        interviewDate: null,
        deadline: null,
        suggestedStatus: null,
        detectedRound: null,
        meetingLink: null,
        platform: 'Unknown',
        isReschedule: false,
        isCancellation: false,
    });
};

// ---------- Resume ATS Analyzer ----------

// Utility to clean text and save tokens
const cleanText = (text: string): string => {
    return text
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/[^\w\s.,@%-]/g, '') // Remove weird chars
        .trim();
};

export const analyzeResumeAI = async (
    resumeContent: string,
    jobDescription: string
): Promise<{
    score: number;
    missingHardSkills: string[];
    missingTools: string[];
    sectionSuggestions: string[];
    bulletImprovements: string[];
}> => {
    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash",
            generationConfig: { temperature: 0.2 } // Low temp for consistent scoring
        });

        const cleanResume = cleanText(resumeContent);
        const cleanJD = cleanText(jobDescription);

        const prompt = `
You are an advanced ATS (Applicant Tracking System) & Expert Career Coach. 
Your goal is to parse the Resume and Job Description (JD) to calculate a match score and provide actionable optimization feedback.

### Scoring Logic (0-100):
1. **Hard Skills Match (40%)**: Do they have the required programming languages/frameworks?
2. **Experience Relevance (30%)**: Do they have similar titles/responsibilities?
3. **Impact/Metrics (20%)**: Do they use numbers (%, $, +) to quantify achievements?
4. **Soft Skills/Culture (10%)**: Do they mention key soft skills?

### Task:
Analyze the text below. Be STRICT. If a critical hard skill (like "React" or "AWS") is in the JD but missing in the Resume, DEDUCT POINTS heavily.

### Input Data
**Job Description:**
${cleanJD.substring(0, 10000)}

**Resume Content:**
${cleanResume.substring(0, 20000)}

### Output Format (JSON ONLY):
{
  "score": number, // Calculated based on logic above
  "missingHardSkills": ["List ONLY technical skills found in JD but completely missing in Resume"],
  "missingTools": ["List ONLY tools/platforms (Jira, AWS, Docker) found in JD but missing"],
  "sectionSuggestions": [
     "Specific advice 1 (e.g., 'Add a Summary section focusing on X')",
     "Specific advice 2 (e.g., 'Move Education below Experience')"
  ],
  "bulletImprovements": [
     "Original: [Quote weak bullet]",
     "Improved: [Rewrite using Action Verb + Task + Result/Metric]"
  ]
}

Return ONLY valid JSON.
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse AI JSON:', text);
            throw new Error('Invalid AI Response Format');
        }

    } catch (error: any) {
        console.error('Resume Analysis Error:', error);
        throw new AppError('AI Analysis Failed: ' + (error.message || 'Unknown error'), 500);
    }
};

// ---------- Cover Letter Generator ----------

export const generateCoverLetterAI = async (
    company: string,
    role: string,
    jobDescription: string,
    tone: string,
    userName: string,
    resumeContent?: string
): Promise<string> => {
    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
Write a ${tone.toLowerCase()} cover letter.

Structure:
- 1 intro sentence
- 2 skill-to-job matches
- 1 company-specific line
- 1 closing

No buzzwords. No fluff.

Candidate: ${userName}
Company: ${company}
Role: ${role}

Resume:
${resumeContent?.substring(0, 3000)}

Job Description:
${jobDescription.substring(0, 2000)}
`;

        const result = await model.generateContent(prompt);
        return result.response.text();

    } catch (error: any) {
        console.error('Cover Letter Error:', error);
        return `Dear Hiring Manager,

I am applying for the ${role} role at ${company}. My background in full-stack development and real-world project delivery aligns well with your requirements.

I have hands-on experience building scalable applications using modern frameworks and cloud tools. My ability to quickly adapt and solve complex problems makes me a strong fit for this role.

I am particularly excited about ${company}'s work and would welcome the opportunity to contribute.

Sincerely,  
${userName}`;
    }
};
