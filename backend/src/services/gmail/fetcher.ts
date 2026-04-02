// ============================================================
// Gmail Email Fetcher v2.1 — Complete Pipeline
// ============================================================
// Stage 1: Source Filter      → platformRegistry
// Stage 2: Keyword Engine     → keywordEngine  
// Stage 3: Pre-Extraction     → emailClassifier (chrono-node dates, meeting links, rounds)
// Stage 4: Identity Resolution → applicationResolver (link to existing app)
// Stage 5: Confidence Engine   → confidenceEngine (combined score)
// Stage 6: AI Verification     → Gemini (only pre-qualified, structured verifier)
// Stage 7: Auto-Actions        → Create/update app, calendar, rounds
// ============================================================

import { PrismaClient } from '@prisma/client';
import { createGmailClient } from '../google/auth.js';
import { createInterviewEvent } from '../google/calendar.js';
import { verifyEmailAI, type VerifiedEmailResult } from '../ai/gemini.js';
import { classifyEmail } from '../pipeline/emailClassifier.js';
import { buildPlatformSearchQuery } from '../pipeline/platformRegistry.js';
import { resolveApplication, linkEmailToApplication, setApplicationKey, generateApplicationKey } from '../pipeline/applicationResolver.js';
import { calculateConfidence, type ConfidenceResult } from '../pipeline/confidenceEngine.js';

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
        for (const part of payload.parts) {
            if (part.parts) {
                const nested = extractBody(part);
                if (nested) return nested;
            }
        }
    }
    return '';
};

const extractHeader = (headers: any[], name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

// Status priority — expanded for new lifecycle
const STATUS_PRIORITY: Record<string, number> = {
    APPLIED: 1,
    ACKNOWLEDGED: 2,
    UNDER_REVIEW: 3,
    ASSESSMENT: 4,
    INTERVIEWING: 5,
    OFFERED: 6,
    REJECTED: 0,
    WITHDRAWN: 0,
};

// ============================================================
// Pipeline Metrics
// ============================================================

interface PipelineMetrics {
    totalFetched: number;
    alreadyProcessed: number;
    passedSourceFilter: number;
    passedKeywordEngine: number;
    sentToAI: number;
    aiConfirmed: number;
    aiFailed: number;
    scriptOnlyCreated: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    applicationsCreated: number;
    applicationsUpdated: number;
    roundsCreated: number;
    calendarEventsCreated: number;
    identityResolved: number;
    errors: number;
}

// ============================================================
// Main Export: fetchAndProcessEmails()
// ============================================================

// ============================================================
// Sync Locks (Idempotency)
// ============================================================
// Prevent concurrent syncs for the same user from causing duplicates
const activeSyncLocks = new Map<string, boolean>();

export const fetchAndProcessEmails = async (userId: string) => {
    if (activeSyncLocks.get(userId)) {
        console.log(`⏳ Sync already in progress for user ${userId}. Skipping.`);
        throw new Error('Sync already in progress. Please wait.');
    }
    
    // Acquire lock
    activeSyncLocks.set(userId, true);

    try {
        const metrics: PipelineMetrics = {
            totalFetched: 0, alreadyProcessed: 0,
            passedSourceFilter: 0, passedKeywordEngine: 0,
            sentToAI: 0, aiConfirmed: 0, aiFailed: 0, scriptOnlyCreated: 0,
            highConfidence: 0, mediumConfidence: 0, lowConfidence: 0,
            applicationsCreated: 0, applicationsUpdated: 0,
            roundsCreated: 0, calendarEventsCreated: 0,
            identityResolved: 0, errors: 0,
        };

        const token = await prisma.gmailToken.findUnique({ where: { userId } });
        if (!token) throw new Error('Gmail not connected');

        // Fetch User Memory (Corrections & Trust)
        const userPrefs = await prisma.user.findUnique({ where: { id: userId } });
        const ignoredSenders = userPrefs?.ignoredSenders || [];
        const companyAliases = (userPrefs?.companyAliases as Record<string, string>) || {};

        // Create the Audit Logging Context
        const syncRun = await prisma.syncRun.create({
            data: { userId, status: 'IN_PROGRESS' }
        });

    const gmail = createGmailClient(token.accessToken, token.refreshToken);

    // --- Build search query ---
    const searchQuery = buildPlatformSearchQuery();
    const previousEmailCount = await prisma.emailLog.count({ where: { userId } });
    const isFirstSync = previousEmailCount === 0;
    const lookbackMonths = isFirstSync ? 6 : 3;
    const lookbackDate = new Date();
    lookbackDate.setMonth(lookbackDate.getMonth() - lookbackMonths);
    const afterDate = lookbackDate.toISOString().split('T')[0].replace(/-/g, '/');
    const fullQuery = `${searchQuery} after:${afterDate}`;

    console.log(`\n🔄 Starting email sync for user ${userId}`);
    console.log(`📧 ${isFirstSync ? 'First sync (6mo)' : 'Regular sync (3mo)'}`);

    // --- Fetch emails ---
    const response = await gmail.users.messages.list({
        userId: 'me',
        q: fullQuery,
        maxResults: 50,
    });

    const messages = response.data.messages || [];
    metrics.totalFetched = messages.length;
    console.log(`📬 Fetched ${messages.length} messages`);

    // --- Process each email ---
    for (const msg of messages) {
        if (!msg.id) continue;

        const already = await prisma.emailLog.findUnique({ where: { gmailId: msg.id } });
        if (already?.processed) {
            metrics.alreadyProcessed++;
            continue;
        }

        try {
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'full',
            });

            const payload = detail.data.payload;
            if (!payload) continue;

            const subject = extractHeader(payload.headers || [], 'Subject');
            const from = extractHeader(payload.headers || [], 'From');
            const body = extractBody(payload);
            const dateStr = extractHeader(payload.headers || [], 'Date');
            const receivedAt = new Date(dateStr);
            const threadId = detail.data.threadId || null;

            // Log email
            await prisma.emailLog.upsert({
                where: { gmailId: msg.id },
                update: {},
                create: {
                    userId,
                    gmailId: msg.id,
                    threadId,
                    subject,
                    from,
                    receivedAt,
                    processed: false,
                    syncRunId: syncRun.id,
                },
            });

            // --------------------------------------------------
            // ZERO STAGE: Personal Learning Memory Override
            // --------------------------------------------------
            // If the user previously flagged 'Ignore Sender' for this, skip it immediately.
            const rawEmailDomain = from.match(/@([\w.-]+)/)?.[1]?.toLowerCase() || '';
            const rawEmailAddress = from.match(/<([^>]+)>/)?.[1]?.toLowerCase() || '';
            if (ignoredSenders.some(ign => rawEmailDomain.includes(ign) || rawEmailAddress.includes(ign))) {
                await prisma.emailLog.update({
                    where: { gmailId: msg.id },
                    data: {
                        processed: true,
                        pipelineStage: 'SKIPPED',
                        reason: 'User explicitly ignored this sender previously',
                        actionTaken: 'IGNORED'
                    }
                });
                metrics.alreadyProcessed++;
                continue;
            }

            // ==================================================
            // STAGES 1-3: Classify email (script-only)
            // ==================================================
            const classification = classifyEmail({ subject, from, body, date: dateStr, threadId: threadId || undefined });

            if (classification.source.trusted) metrics.passedSourceFilter++;
            if (classification.keywords.score > 0) metrics.passedKeywordEngine++;

            if (!classification.shouldSendToAI) {
                await prisma.emailLog.update({
                    where: { gmailId: msg.id },
                    data: {
                        processed: true,
                        pipelineStage: 'SKIPPED',
                        parsedData: {
                            reason: classification.reason,
                            source: classification.source.platform,
                            keywordScore: classification.keywords.score,
                        } as any,
                    },
                });
                continue;
            }

            // ==================================================
            // STAGE 4: AI Verification (Gemini)
            // ==================================================
            metrics.sentToAI++;
            await new Promise(r => setTimeout(r, 2000));

            let aiResult: VerifiedEmailResult | null = null;
            let aiSucceeded = false;

            try {
                aiResult = await verifyEmailAI(
                    classification.cleanSubject,
                    classification.cleanBody,
                    from,
                    {
                        company: companyAliases[classification.extractedData.company || ''] || classification.extractedData.company,
                        role: classification.extractedData.role,
                        interviewDate: classification.extractedData.interviewDate,
                        deadline: classification.extractedData.deadline,
                        suggestedStatus: classification.extractedData.suggestedStatus,
                        detectedRound: classification.extractedData.detectedRound,
                        meetingLink: classification.extractedData.meetingLink,
                        platform: classification.extractedData.platform,
                        isReschedule: classification.extractedData.isReschedule,
                        isCancellation: classification.extractedData.isCancellation,
                    }
                );
                if (aiResult) {
                    aiSucceeded = true;
                    metrics.aiConfirmed++;
                }
            } catch (aiError) {
                console.error(`⚠️ AI failed for ${msg.id}:`, aiError);
                metrics.aiFailed++;
            }

            // --- Fallback: Script-only classification ---
            if (!aiSucceeded && classification.keywords.score >= 10 && classification.extractedData.company) {
                aiResult = {
                    company: classification.extractedData.company,
                    role: classification.extractedData.role || 'Unknown Role',
                    status: (classification.extractedData.suggestedStatus || 'APPLIED') as VerifiedEmailResult['status'],
                    round: classification.extractedData.detectedRound,
                    confidence: 0.6,
                    interviewDate: classification.extractedData.interviewDate,
                    deadline: classification.extractedData.deadline,
                    location: null,
                    salary: null,
                    notes: `[Script-only] Keywords: ${classification.keywords.matchedKeywords.slice(0, 3).join(', ')}`,
                    needsCalendar: false,
                };
                metrics.scriptOnlyCreated++;
                console.log(`📝 Script-only: ${aiResult.company}`);
            }

            if (!aiResult) {
                await prisma.emailLog.update({
                    where: { gmailId: msg.id },
                    data: { processed: true, pipelineStage: 'SKIPPED', actionTaken: 'IGNORED', reason: 'AI Verification strictly rejected or failed to parse.', parsedData: { reason: 'AI rejected or failed' } as any },
                });
                continue;
            }

            // ==================================================
            // STAGE 5: Identity Resolution
            // ==================================================
            const resolved = await resolveApplication({
                company: aiResult.company,
                role: aiResult.role,
                userId,
                threadId,
                senderDomain: from.match(/@([\w.-]+)/)?.[1] || null,
                location: aiResult.location,
            });

            if (resolved.found) metrics.identityResolved++;

            // ==================================================
            // STAGE 6: Confidence Engine
            // ==================================================
            const confidence = calculateConfidence({
                source: classification.source,
                keywords: classification.keywords,
                hasCompany: !!aiResult.company,
                hasDate: !!(aiResult.interviewDate || aiResult.deadline),
                hasRound: !!aiResult.round,
                hasMeetingLink: !!classification.extractedData.meetingLink,
                existingApplicationFound: resolved.found,
                matchMethod: resolved.matchMethod,
                aiConfidence: aiResult.confidence,
            });

            if (confidence.level === 'HIGH') metrics.highConfidence++;
            else if (confidence.level === 'MEDIUM') metrics.mediumConfidence++;
            else metrics.lowConfidence++;

            // LOW confidence → skip
            if (confidence.action === 'IGNORE') {
                await prisma.emailLog.update({
                    where: { gmailId: msg.id },
                    data: {
                        processed: true,
                        pipelineStage: 'SKIPPED',
                        confidence: confidence.score,
                        reason: 'Calculated Pipeline confidence too low to merge/create.',
                        actionTaken: 'IGNORED',
                        parsedData: { reason: 'Low confidence', breakdown: confidence.breakdown } as any,
                    },
                });
                continue;
            }

            // ==================================================
            // STAGE 7: Create / Update Application
            // ==================================================
            const needsReview = confidence.action === 'NEEDS_REVIEW';
            const status = aiResult.status;
            const meetingLink = classification.extractedData.meetingLink;

            if (resolved.found && resolved.applicationId) {
                // --- UPDATE existing application ---
                const existing = await prisma.application.findUnique({ where: { id: resolved.applicationId } });
                if (!existing) continue;

                const isStatusUpgrade = STATUS_PRIORITY[status] >= STATUS_PRIORITY[existing.status];
                const hasNewDate = !!(aiResult.interviewDate || aiResult.deadline);
                const existingNotes = existing.notes || '';
                const newNote = aiResult.notes
                    ? `\n[${new Date().toLocaleDateString()}] ${aiResult.round || 'Update'}: ${aiResult.notes}`
                    : '';

                let calendarEventId = existing.calendarEventId;

                // --------------------------------------------------
                // SAFE CALENDAR CREATION RULE
                // --------------------------------------------------
                const isFutureDate = aiResult.interviewDate && new Date(aiResult.interviewDate).getTime() > Date.now();
                const calendarSafeToSync = confidence.score >= 0.85 && isFutureDate && !classification.extractedData.isCancellation;

                if (aiResult.needsCalendar && calendarSafeToSync && !existing.calendarEventId) {
                    try {
                        const event = await createInterviewEvent(userId, {
                            company: existing.company,
                            role: existing.role,
                            interviewAt: new Date(aiResult.interviewDate!),
                            notes: aiResult.notes,
                        });
                        if (event) {
                            calendarEventId = event.eventId;
                            metrics.calendarEventsCreated++;
                            console.log(`📅 Calendar: ${existing.company}`);
                        }
                    } catch (calError) {
                        console.error(`Calendar failed for ${existing.company}:`, calError);
                    }
                }

                // Handle reschedule
                if (classification.extractedData.isReschedule && aiResult.interviewDate) {
                    // TODO: Update existing calendar event
                    console.log(`🔄 Reschedule detected for ${existing.company}`);
                }

                // Handle cancellation
                if (classification.extractedData.isCancellation) {
                    console.log(`❌ Cancellation detected for ${existing.company}`);
                }

                if (isStatusUpgrade || hasNewDate || classification.extractedData.isReschedule) {
                    await prisma.application.update({
                        where: { id: existing.id },
                        data: {
                            status: status as any,
                            interviewAt: aiResult.interviewDate ? new Date(aiResult.interviewDate) : existing.interviewAt,
                            deadline: aiResult.deadline ? new Date(aiResult.deadline) : existing.deadline,
                            meetingLink: meetingLink || existing.meetingLink,
                            updatedAt: new Date(),
                            notes: existingNotes + newNote,
                            calendarEventId,
                            confidence: confidence.score,
                            needsReview,
                            threadId: threadId || existing.threadId,
                            applicationKey: resolved.applicationKey || existing.applicationKey,
                        },
                    });
                    metrics.applicationsUpdated++;
                    console.log(`✅ Updated: ${existing.company} → ${status}${aiResult.round ? ` (${aiResult.round})` : ''} [${confidence.level}]`);
                }

                // Create InterviewRound record if round detected
                if (aiResult.round && aiResult.interviewDate) {
                    await prisma.interviewRound.create({
                        data: {
                            applicationId: existing.id,
                            roundName: aiResult.round,
                            scheduledAt: new Date(aiResult.interviewDate),
                            meetingLink: meetingLink || null,
                            deadline: aiResult.deadline ? new Date(aiResult.deadline) : null,
                            notes: aiResult.notes || null,
                        },
                    });
                    metrics.roundsCreated++;
                }

                // Link email to application
                await linkEmailToApplication(msg.id, existing.id, threadId);

                // --- FINAL LOG OVERRIDE ---
                await prisma.emailLog.update({
                    where: { gmailId: msg.id },
                    data: {
                        processed: true,
                        confidence: confidence.score,
                        pipelineStage: aiSucceeded ? 'AI_VERIFIED' : 'SCRIPT_ONLY',
                        actionTaken: 'UPDATED',
                        reason: `Merged into existing application: ${existing.company}`,
                        parsedData: { ...aiResult, confidenceBreakdown: confidence.breakdown } as any,
                    },
                });

            } else {
                // --- CREATE new application ---
                // --------------------------------------------------
                // SAFE CALENDAR CREATION RULE
                // --------------------------------------------------
                const isFutureDate = aiResult.interviewDate && new Date(aiResult.interviewDate).getTime() > Date.now();
                const calendarSafeToSync = confidence.score >= 0.85 && isFutureDate && !classification.extractedData.isCancellation;

                let calendarEventId: string | null = null;
                if (aiResult.needsCalendar && calendarSafeToSync) {
                    try {
                        const event = await createInterviewEvent(userId, {
                            company: aiResult.company,
                            role: aiResult.role,
                            interviewAt: new Date(aiResult.interviewDate!),
                            notes: aiResult.notes,
                        });
                        if (event) {
                            calendarEventId = event.eventId;
                            metrics.calendarEventsCreated++;
                            console.log(`📅 Calendar: ${aiResult.company}`);
                        }
                    } catch (calError) {
                        console.error(`Calendar failed for ${aiResult.company}:`, calError);
                    }
                }

                const applicationKey = generateApplicationKey(userId, aiResult.company, aiResult.role);

                const newApp = await prisma.application.create({
                    data: {
                        userId,
                        company: aiResult.company,
                        role: aiResult.role,
                        status: status as any,
                        platform: classification.extractedData.platform,
                        appliedAt: receivedAt,
                        interviewAt: aiResult.interviewDate ? new Date(aiResult.interviewDate) : null,
                        deadline: aiResult.deadline ? new Date(aiResult.deadline) : null,
                        meetingLink: meetingLink || null,
                        salary: aiResult.salary || null,
                        location: aiResult.location || null,
                        url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
                        emailId: msg.id,
                        calendarEventId,
                        applicationKey,
                        threadId,
                        confidence: confidence.score,
                        needsReview,
                        notes: aiResult.notes
                            ? `[${new Date().toLocaleDateString()}] Initial: ${aiResult.notes}`
                            : null,
                    },
                });
                metrics.applicationsCreated++;
                console.log(`✨ Created: ${aiResult.company} — ${aiResult.role} (${status}) [${confidence.level}]`);

                // Create round record if applicable
                if (aiResult.round && aiResult.interviewDate) {
                    await prisma.interviewRound.create({
                        data: {
                            applicationId: newApp.id,
                            roundName: aiResult.round,
                            scheduledAt: new Date(aiResult.interviewDate),
                            meetingLink: meetingLink || null,
                            deadline: aiResult.deadline ? new Date(aiResult.deadline) : null,
                            notes: aiResult.notes || null,
                        },
                    });
                    metrics.roundsCreated++;
                }

                // Link email
                await linkEmailToApplication(msg.id, newApp.id, threadId);

                // Mark email as processed
                await prisma.emailLog.update({
                    where: { gmailId: msg.id },
                    data: {
                        processed: true,
                        confidence: confidence.score,
                        pipelineStage: aiSucceeded ? 'AI_VERIFIED' : 'SCRIPT_ONLY',
                        actionTaken: 'CREATED',
                        reason: `Created entirely new application tracking card.`,
                        parsedData: { ...aiResult, confidenceBreakdown: confidence.breakdown } as any,
                    },
                });
            }

        } catch (error: any) {
            console.error(`❌ Failed to process msg ${msg.id}:`, error);
            metrics.errors++;
            
            // Log error
            await prisma.emailLog.update({
                where: { gmailId: msg.id },
                data: {
                    processed: true,
                    pipelineStage: 'ERROR',
                    reason: error.message,
                    actionTaken: 'FAILED'
                }
            });
        }
    }

    // --- Log metrics ---
    console.log('\n📊 Pipeline Metrics:');
    console.log(`   Fetched:              ${metrics.totalFetched}`);
    console.log(`   Already processed:    ${metrics.alreadyProcessed}`);
    console.log(`   Source filter passed:  ${metrics.passedSourceFilter}`);
    console.log(`   Keyword engine passed: ${metrics.passedKeywordEngine}`);
    console.log(`   Sent to AI:           ${metrics.sentToAI} (${metrics.totalFetched > 0 ? Math.round((metrics.sentToAI / metrics.totalFetched) * 100) : 0}%)`);
    console.log(`   AI confirmed:         ${metrics.aiConfirmed}`);
    console.log(`   Script-only fallback:  ${metrics.scriptOnlyCreated}`);
    console.log(`   Confidence:            HIGH=${metrics.highConfidence} MED=${metrics.mediumConfidence} LOW=${metrics.lowConfidence}`);
    console.log(`   Identity resolved:     ${metrics.identityResolved}`);
    console.log(`   Apps created:          ${metrics.applicationsCreated}`);
    console.log(`   Apps updated:          ${metrics.applicationsUpdated}`);
    console.log(`   Rounds created:        ${metrics.roundsCreated}`);
    console.log(`   Calendar events:       ${metrics.calendarEventsCreated}`);
    console.log(`   Errors:                ${metrics.errors}`);
    console.log(`   Token savings:         ~${metrics.totalFetched > 0 ? Math.round(((metrics.totalFetched - metrics.sentToAI) / metrics.totalFetched) * 100) : 0}%\n`);

    // --- Finalize SyncRun Audit Log ---
    await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
            status: metrics.errors > 0 ? (metrics.totalFetched === 0 ? 'FAILED' : 'COMPLETED') : 'COMPLETED',
            completedAt: new Date(),
            totalScanned: metrics.totalFetched,
            totalIgnored: metrics.alreadyProcessed,
            totalSentToAI: metrics.sentToAI,
            totalMerged: metrics.identityResolved,
            totalCreated: metrics.applicationsCreated,
            totalUpdated: metrics.applicationsUpdated,
            totalFlagged: metrics.mediumConfidence,
            totalErrors: metrics.errors
        }
    });

    return {
        processedCount: metrics.applicationsCreated + metrics.applicationsUpdated,
        metrics,
    };
    } finally {
        activeSyncLocks.delete(userId);
    }
};
