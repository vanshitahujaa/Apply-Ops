import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPANIES = ['Google', 'Stripe', 'Meta', 'Netflix', 'Spotify', 'Discord', 'Airbnb', 'Notion'];
const ROLES = ['Software Engineer', 'Frontend Developer', 'Backend Engineer', 'Product Manager'];
const ATS_DOMAINS = ['greenhouse.io', 'jobs.lever.co', 'myworkday.com', 'ashbyhq.com'];

// Scenarios matrix
const SCENARIOS = [
    { type: 'apply', subjectTemplate: 'Thank you for applying to {Company}', bodyTemplate: 'Hi,\n\nThanks for applying for the {Role} position at {Company}. Our team will review your application soon.', expectedStatus: 'ACKNOWLEDGED' },
    { type: 'invite', subjectTemplate: 'Interview Invitation: {Role} @ {Company}', bodyTemplate: 'We would love to schedule a screening call. Are you free tomorrow at 2PM? Meet securely: https://meet.google.com/abc-xyz', expectedStatus: 'INTERVIEWING', hasMeeting: true },
    { type: 'reject', subjectTemplate: 'Update on your {Company} application', bodyTemplate: 'While your background is impressive, we will not be moving forward with your application for the {Role} role.', expectedStatus: 'REJECTED' },
    { type: 'offer', subjectTemplate: 'Offer from {Company}', bodyTemplate: 'We are thrilled to offer you the {Role} position! Attached is your compensation package.', expectedStatus: 'OFFERED' },
    { type: 'assessment', subjectTemplate: '{Company} Online Assessment', bodyTemplate: 'Please complete the coding assessment for the {Role} within 48 hours.', expectedStatus: 'ASSESSMENT' }
];

const SPAM_SCENARIOS = [
    { from: 'jobalerts@linkedin.com', subject: '15 new jobs matching your profile', body: 'Checkout these roles:' },
    { from: 'recruiter@randomagency.com', subject: 'Great opportunity for you!', body: 'I saw your LinkedIn. Are you looking for new roles?' },
    { from: 'newsletter@hired.com', subject: 'Top skills for 2026', body: 'Read our latest blog post on what engineers need to know.' },
    { from: 'careers@resume.io', subject: 'Fix your resume', body: 'Buy our template to pass ATS.' }
];

const EDGE_CASES = [
    { from: 'recruiting@stripe.com', subject: 'Next steps for Frontend Engineer', body: 'We are moving you to the System Design Round. Let me know when you are free.', expectedStatus: 'INTERVIEWING', company: 'Stripe', expectedShouldSend: true },
    { from: 'no-reply@greenhouse.io', subject: 'Your schedule for tomorrow', body: 'Interview reminder for your Meta loop at 10 AM. Link: https://zoom.us/j/12345', expectedStatus: 'INTERVIEWING', company: 'Meta', hasMeeting: true, expectedShouldSend: true },
    { from: 'recruiting@google.com', subject: 'Re: Interview Invitation', body: 'Sorry, I need to reschedule our chat to Thursday at 4 PM.', expectedStatus: 'INTERVIEWING', company: 'Google', isReschedule: true, expectedShouldSend: true },
    { from: 'system@myworkday.com', subject: 'Task deadline passed', body: 'This is an automated notification that the deadline for your Spotify assessment has passed.', expectedStatus: 'REJECTED', company: 'Spotify', expectedShouldSend: true },
];

const dataset: any[] = [];
let idCounter = 1;

// 1. Generate standard flow cases
COMPANIES.forEach(company => {
    ROLES.forEach(role => {
        // Normal Flow
        SCENARIOS.forEach(scenario => {
            const isAts = Math.random() > 0.5;
            const fromDomain = isAts ? ATS_DOMAINS[Math.floor(Math.random() * ATS_DOMAINS.length)] : `${company.toLowerCase()}.com`;
            const fromName = isAts ? (Math.random() > 0.5 ? company : 'Recruiting Team') : company;

            dataset.push({
                id: `gen_${idCounter++}`,
                threadId: `thread_${company}_${role}`.replace(/\s+/g, '_').toLowerCase(),
                date: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
                from: `${fromName} <no-reply@${fromDomain}>`,
                subject: scenario.subjectTemplate.replace('{Company}', company).replace('{Role}', role),
                body: scenario.bodyTemplate.replace('{Company}', company).replace('{Role}', role),
                expected: {
                    shouldSendToAI: true,
                    isSpam: false,
                    status: scenario.expectedStatus,
                    company: company,
                    role: role,
                    hasDate: scenario.expectedStatus === 'INTERVIEWING',
                    hasMeeting: scenario.hasMeeting || false
                }
            });
        });
    });
});

// 2. Generate Spam cases (noise)
for (let i = 0; i < 40; i++) {
    const spam = SPAM_SCENARIOS[i % SPAM_SCENARIOS.length];
    dataset.push({
        id: `gen_spam_${idCounter++}`,
        threadId: `thread_spam_${i}`,
        date: new Date().toISOString(),
        from: `Spammer <${spam.from}>`,
        subject: spam.subject,
        body: spam.body,
        expected: { shouldSendToAI: false, isSpam: true }
    });
}

// 3. Generate Edge cases
for (let i = 0; i < 30; i++) {
    const edge = EDGE_CASES[i % EDGE_CASES.length];
    dataset.push({
        id: `gen_edge_${idCounter++}`,
        threadId: `thread_edge_${i}`,
        date: new Date().toISOString(),
        from: `Internal Recruiter <${edge.from}>`,
        subject: edge.subject,
        body: edge.body,
        expected: {
            shouldSendToAI: edge.expectedShouldSend,
            isSpam: false,
            status: edge.expectedStatus,
            company: edge.company,
            hasMeeting: edge.hasMeeting || false,
            isReschedule: edge.isReschedule || false
        }
    });
}

// We built (8 * 4 * 5) = 160 normal records + 40 spam + 30 edge = 230 records.
fs.writeFileSync(path.join(__dirname, 'golden_dataset_large.json'), JSON.stringify(dataset, null, 2));
console.log(`✅ Generated ${dataset.length} systematic test records into golden_dataset_large.json`);
