import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { createGmailClient } from '../google/auth.js';
import { createInterviewEvent } from '../google/calendar.js';
import { analyzeEmailAI } from '../ai/gemini.js';

const prisma = new PrismaClient();

// ---------- Helpers ----------

const decodeBase64 = (str: string) =>
  Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');

const extractBody = (payload: any): string => {
  if (payload.body?.data) return decodeBase64(payload.body.data);

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data)
        return decodeBase64(part.body.data);
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data)
        return decodeBase64(part.body.data);
    }
  }
  return '';
};

const extractHeader = (headers: any[], name: string) =>
  headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, '');

const statusPriority: Record<string, number> = {
  APPLIED: 1,
  VIEWED: 2,
  INTERVIEWING: 3,
  OFFERED: 4,
  REJECTED: 0,
  WITHDRAWN: 0
};

const platformFromSender = (from: string) => {
  const domain = from.match(/@([\w.-]+)/)?.[1] || '';
  const map: Record<string, string> = {
    'linkedin.com': 'LinkedIn',
    'naukri.com': 'Naukri',
    'indeed.com': 'Indeed',
    'amazon.jobs': 'Amazon Careers',
    'google.com': 'Google Careers'
  };
  return map[domain] || 'Company Portal';
};

// ---------- Main Processor ----------

export const fetchAndProcessEmails = async (userId: string) => {
  const token = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!token) throw new Error('Gmail not connected');

  const gmail = createGmailClient(token.accessToken, token.refreshToken);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const afterDate = threeMonthsAgo.toISOString().split('T')[0].replace(/-/g, '/');

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: `
      ("thank you for applying" OR "we received your application" OR interview OR offer OR unfortunately OR "moving forward" OR assessment)
      -label:SPAM -label:TRASH after:${afterDate}
    `,
    maxResults: 20
  });

  const messages = response.data.messages || [];
  let processedCount = 0;

  for (const msg of messages) {
    if (!msg.id) continue;

    const already = await prisma.emailLog.findUnique({ where: { gmailId: msg.id } });
    if (already?.processed) continue;

    await new Promise(r => setTimeout(r, 4000));

    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });

      const payload = detail.data.payload;
      if (!payload) continue;

      const subject = extractHeader(payload.headers || [], 'Subject');
      const from = extractHeader(payload.headers || [], 'From');
      const body = extractBody(payload);
      const dateStr = extractHeader(payload.headers || [], 'Date');
      const receivedAt = new Date(dateStr);

      // Log email
      await prisma.emailLog.upsert({
        where: { gmailId: msg.id },
        update: {},
        create: {
          userId,
          gmailId: msg.id,
          subject,
          from,
          receivedAt,
          processed: false
        }
      });

      const result = await analyzeEmailAI(body, subject, from);

      if (!result || result.confidence < 0.7) continue;

      const platform = result.platform || platformFromSender(from);
      const normalizedCompany = normalize(result.company);

      const newStatus =
        result.status === 'INTERVIEW' ? 'INTERVIEWING' :
          result.status === 'OFFER' ? 'OFFERED' :
            result.status === 'REJECTED' ? 'REJECTED' :
              'APPLIED';

      // Smart Upsert Logic
      const existing = await prisma.application.findFirst({
        where: { userId, company: { contains: result.company, mode: 'insensitive' } }
      });

      if (existing) {
        // ALWAYS update if we have new info, especially for Interviews/Offers or new "Rounds"
        const isStatusUpgrade = statusPriority[newStatus] >= statusPriority[existing.status];
        const hasClickableDate = !!result.interviewDate;

        // Append to notes for "Round History"
        const existingNotes = existing.notes || '';
        const newNote = result.notes ? `\n[${new Date().toLocaleDateString()}] ${result.round || 'Update'}: ${result.notes}` : '';

        let calendarEventId = existing.calendarEventId;

        // Auto-Schedule Interview
        if (newStatus === 'INTERVIEWING' && result.interviewDate && !existing.calendarEventId) {
          const event = await createInterviewEvent(userId, {
            company: existing.company,
            role: existing.role,
            interviewAt: new Date(result.interviewDate),
            notes: result.notes
          });
          if (event) calendarEventId = event.eventId;
        }

        if (isStatusUpgrade || hasClickableDate) {
          await prisma.application.update({
            where: { id: existing.id },
            data: {
              status: newStatus as any,
              interviewAt: result.interviewDate ? new Date(result.interviewDate) : existing.interviewAt,
              updatedAt: new Date(), // Bump to top
              notes: existingNotes + newNote,
              calendarEventId
            }
          });
          console.log(`✅ Updated Application: ${existing.company} (${newStatus})`);
        }
      } else {
        // Create New
        let calendarEventId: string | null = null;
        if (newStatus === 'INTERVIEWING' && result.interviewDate) {
          const event = await createInterviewEvent(userId, {
            company: result.company,
            role: result.role,
            interviewAt: new Date(result.interviewDate),
            notes: result.notes
          });
          if (event) calendarEventId = event.eventId;
        }

        await prisma.application.create({
          data: {
            userId,
            company: result.company,
            role: result.role || 'Unknown Role',
            status: newStatus as any,
            platform,
            appliedAt: receivedAt,
            interviewAt: result.interviewDate ? new Date(result.interviewDate) : null,
            salary: result.salary || null,
            location: result.location || null,
            url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
            emailId: msg.id,
            calendarEventId,
            notes: result.notes ? `[${new Date().toLocaleDateString()}] Initial: ${result.notes}` : null
          }
        });
        console.log(`✨ Created Application: ${result.company}`);
      }

      await prisma.emailLog.update({
        where: { gmailId: msg.id },
        data: { processed: true, parsedData: result as any }
      });

      processedCount++;
    } catch (err) {
      console.error(`Failed to process email ${msg.id}`, err);
    }
  }

  return processedCount;
};
