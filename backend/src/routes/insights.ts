import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { ApplicationStatus } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.use(authenticate);

// 1. Pipeline Metrics & Conversion Funnel
router.get(
    '/pipeline',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        
        // Group application counts by Status
        // Native groupBy doesn't guarantee all statuses exist in result if count is 0,
        // so we manually scaffold it.
        const apps = await prisma.application.findMany({
            where: { userId },
            select: { status: true, appliedAt: true }
        });

        const statusCounts: Record<string, number> = {
            'APPLIED': 0,
            'ACKNOWLEDGED': 0,
            'UNDER_REVIEW': 0,
            'ASSESSMENT': 0,
            'INTERVIEWING': 0,
            'OFFERED': 0,
            'REJECTED': 0,
            'WITHDRAWN': 0
        };

        apps.forEach(app => {
            if (statusCounts[app.status] !== undefined) {
                statusCounts[app.status]++;
            }
        });

        // Synthetic Pipeline Calculations (Conversion Funnel)
        // Definition of "Entered Funnel": Anything APPLIED or above.
        const total = apps.length;
        const reachedAssessmentOrHigher = statusCounts['ASSESSMENT'] + statusCounts['INTERVIEWING'] + statusCounts['OFFERED'] + statusCounts['REJECTED']; // assuming rejected later
        const reachedInterview = statusCounts['INTERVIEWING'] + statusCounts['OFFERED'];
        const totalOffers = statusCounts['OFFERED'];

        const funnel = {
            totalApplications: total,
            totalAssessments: reachedAssessmentOrHigher,
            totalInterviews: reachedInterview,
            totalOffers: totalOffers,
            rates: {
                assessmentRate: total > 0 ? (reachedAssessmentOrHigher / total) * 100 : 0,
                interviewRate: total > 0 ? (reachedInterview / total) * 100 : 0,
                offerRate: reachedInterview > 0 ? (totalOffers / reachedInterview) * 100 : 0, // Offer rate is usually % of interviews
            }
        };

        res.json({ success: true, data: { statusCounts, funnel } });
    })
);

// 2. The Action Queue (Stale, Ghosted, Upcomings)
router.get(
    '/action-queue',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const now = new Date();
        
        // Fetch active applications
        const activeStatuses: ApplicationStatus[] = ['APPLIED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'INTERVIEWING'];
        const activeApps = await prisma.application.findMany({
            where: {
                userId,
                status: { in: activeStatuses }
            },
            include: { rounds: true }
        });

        const needsReviewApps = await prisma.application.findMany({
            where: { userId, needsReview: true }
        });

        const stale: any[] = [];
        const ghosted: any[] = [];
        
        activeApps.forEach(app => {
            const thresholdTime = new Date(app.updatedAt || app.appliedAt).getTime();
            const daysSinceUpdate = (now.getTime() - thresholdTime) / (1000 * 3600 * 24);

            if (app.status === 'APPLIED' || app.status === 'ACKNOWLEDGED' || app.status === 'UNDER_REVIEW') {
                if (daysSinceUpdate >= 21) {
                    ghosted.push(app);
                } else if (daysSinceUpdate >= 10) {
                    stale.push(app);
                }
            } else if (app.status === 'INTERVIEWING') {
                // Technically we should check `last round timestamp` here, but for now updatedAt reflects the round update.
                if (daysSinceUpdate >= 14) {
                    ghosted.push(app);
                } else if (daysSinceUpdate >= 7) {
                    stale.push(app);
                }
            }
            // ASSESSMENT, OFFERED, REJECTED, WITHDRAWN are immune to Stale/Ghost records.
        });

        // Upcomings (Interviews < 3 days away)
        const threeDaysOut = new Date();
        threeDaysOut.setDate(now.getDate() + 3);

        const upcomingInterviews = await prisma.application.findMany({
            where: {
                userId,
                status: 'INTERVIEWING',
                interviewAt: {
                    gte: now,
                    lte: threeDaysOut
                }
            },
            include: { rounds: true },
            orderBy: { interviewAt: 'asc' }
        });

        const upcomingAssessments = await prisma.application.findMany({
            where: {
                userId,
                deadline: {
                    gte: now,
                    lte: threeDaysOut
                }
            },
            orderBy: { deadline: 'asc' }
        });

        res.json({
            success: true,
            data: {
                needsReview: needsReviewApps,
                upcomingInterviews,
                upcomingAssessments,
                stale,
                ghosted
            }
        });
    })
);

export default router;
