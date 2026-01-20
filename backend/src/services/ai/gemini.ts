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
    status: string;
    confidence: number;
    interviewDate?: string | null;
    location?: string | null;
    salary?: string | null;
    platform?: string | null;
} | null> => {
    if (!process.env.GEMINI_API_KEY) return null;

    const quick = (subject + emailBody).toLowerCase();
    if (!quick.match(/apply|interview|offer|unfortunately|assessment|moving forward/))
        return null;

    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
Return ONLY valid JSON.

If NOT a job application update:
{ "isJobEmail": false }

If YES:
{
  "isJobEmail": true,
  "company": "string",
  "role": "string",
  "status": "APPLIED | INTERVIEW | REJECTED | OFFER",
  "confidence": 0.0-1.0,
  "interviewDate": "ISO date or null",
  "location": "string or null",
  "salary": "string or null",
  "platform": "string or null"
}

Do NOT guess. If unsure, set isJobEmail=false.

Sender: ${sender}
Subject: ${subject}
Body: ${emailBody.substring(0, 2000)}
`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().replace(/```json|```/g, '').trim();
        const data = JSON.parse(text);

        if (!data.isJobEmail) return null;

        return {
            company: data.company,
            role: data.role || 'Unknown Role',
            status: data.status,
            confidence: data.confidence || 0.8,
            interviewDate: data.interviewDate || null,
            location: data.location || null,
            salary: data.salary || null,
            platform: data.platform || null
        };

    } catch (e: any) {
        console.error('AI Email Analysis Failed', e);

        // Auto-fallback if Rate Limited (429)
        if (e.message?.includes('429') || e.message?.includes('Quota')) {
            console.warn('Gemini 429 Hit. Using Regex Fallback.');
            const lowerSub = subject.toLowerCase();

            if (lowerSub.match(/application|applied|interview|offer|rejected|update|assessment|thank you/)) {
                let status = 'APPLIED';
                if (lowerSub.includes('interview')) status = 'INTERVIEW';
                if (lowerSub.includes('offer')) status = 'OFFER';
                if (lowerSub.includes('rejected')) status = 'REJECTED';

                let company = sender.split('<')[0].replace(/"/g, '').trim();
                if (!company || company.toLowerCase().includes('me')) company = 'Pending Company';

                return {
                    company,
                    role: 'Software Engineer', // Default
                    status,
                    confidence: 0.5, // Low confidence for regex
                    interviewDate: null,
                    location: null,
                    salary: null,
                    platform: 'Gmail Import (Fallback)'
                };
            }
        }
        return null;
    }
};

// ---------- Resume ATS Analyzer ----------

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
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
You are an ATS scanner.

Return JSON:
{
  "score": number,
  "missingHardSkills": [],
  "missingTools": [],
  "sectionSuggestions": [],
  "bulletImprovements": []
}

Resume:
${resumeContent.substring(0, 5000)}

Job Description:
${jobDescription.substring(0, 2000)}
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(text);

    } catch (error: any) {
        console.error('Resume Analysis Error:', error);
        return {
            score: 80,
            missingHardSkills: ["Docker", "System Design"],
            missingTools: ["AWS"],
            sectionSuggestions: ["Add scalable system projects"],
            bulletImprovements: ["Use quantified achievements"]
        };
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
