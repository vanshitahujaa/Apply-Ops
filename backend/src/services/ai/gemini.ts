import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { AppError } from '../../middleware/errorHandler.js';

dotenv.config();

const getGenAI = () => {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// ---------- Email Analyzer ----------

export const analyzeEmailAI = async (
    emailBody: string,
    subject: string,
    sender: string
): Promise<{
    company: string;
    role: string;
    status: string; // APPLIED | INTERVIEW | REJECTED | OFFER
    round?: string; // e.g. "Technical Round", "Coding Assessment", "HR Round"
    confidence: number;
    interviewDate?: string | null;
    location?: string | null;
    salary?: string | null;
    platform?: string | null;
    notes?: string;
} | null> => {
    if (!process.env.GEMINI_API_KEY) return null;

    const quick = (subject + emailBody).toLowerCase();
    // Optimized Keywords for quick filter
    if (!quick.match(/application|interview|offer|unfortunately|assessment|moving forward|schedule|round|coding|technical|joining|feedback/))
        return null;

    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
Analyze this job-related email. Return JSON ONLY.

Context:
- Detect the Company and Role.
- Detect the Status: APPLIED, INTERVIEW, REJECTED, OFFER.
- Detect the Round: "Screening", "Technical Round", "Coding Assessment", "System Design", "Managerial", "HR", "Final Round", "Offer Letter", "Joining Letter".
- Extract EXACT Interview Date/Time (ISO format) if present.

Input:
Sender: ${sender}
Subject: ${subject}
Body: ${emailBody.substring(0, 3000)}

Output Structure:
{
  "isJobEmail": boolean,
  "company": "string",
  "role": "string",
  "status": "APPLIED | INTERVIEW | REJECTED | OFFER",
  "round": "string or null",
  "confidence": number (0.0-1.0),
  "interviewDate": "ISO date string or null",
  "location": "string or null",
  "salary": "string or null",
  "platform": "string or null",
  "summary": "Brief 1-sentence summary of the update"
}
`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().replace(/```json|```/g, '').trim();
        const data = JSON.parse(text);

        if (!data.isJobEmail) return null;

        return {
            company: data.company,
            role: data.role || 'Unknown Role',
            status: data.status,
            round: data.round || null,
            confidence: data.confidence || 0.8,
            interviewDate: data.interviewDate || null,
            location: data.location || null,
            salary: data.salary || null,
            platform: data.platform || null,
            notes: data.summary // Save summary as notes
        };

    } catch (e: any) {
        console.error('AI Email Analysis Failed', e);
        return null;
    }
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
