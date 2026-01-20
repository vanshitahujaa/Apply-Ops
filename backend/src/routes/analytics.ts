import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Get analytics overview
router.get(
    '/overview',
    asyncHandler(async (req: AuthRequest, res) => {
        const userId = req.user!.id;

        // Get all applications
        const applications = await prisma.application.findMany({
            where: { userId },
        });

        const total = applications.length;
        const byStatus = applications.reduce((acc, app) => {
            const status = app.status; // ApplicationStatus is Enum (e.g., APPLIED, INTERVIEWING)
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const byPlatform = applications.reduce((acc, app) => {
            const platform = app.platform || 'Other';
            acc[platform] = (acc[platform] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Calculate rates
        const responded = (byStatus.INTERVIEWING || 0) + (byStatus.OFFERED || 0) + (byStatus.REJECTED || 0);
        const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
        const interviewRate = total > 0 ? Math.round(((byStatus.INTERVIEWING || 0) + (byStatus.OFFERED || 0)) / total * 100) : 0;
        const offerRate = total > 0 ? Math.round((byStatus.OFFERED || 0) / total * 100) : 0;

        // Weekly applications (last 8 weeks)
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const weeklyData = [];
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today

        for (let i = 7; i >= 0; i--) {
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() - (i * 7));

            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekEnd.getDate() - 6);
            weekStart.setHours(0, 0, 0, 0); // Start of the day

            const count = applications.filter(app => {
                const date = new Date(app.appliedAt);
                return date >= weekStart && date <= weekEnd;
            }).length;

            weeklyData.push({
                week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count,
            });
        }

        res.json({
            success: true,
            data: {
                totalApplications: total,
                responseRate,
                interviewRate,
                offerRate,
                applicationsByStatus: byStatus,
                applicationsByPlatform: byPlatform,
                weeklyApplications: weeklyData,
            },
        });
    })
);

// Get platform stats
router.get(
    '/platforms',
    asyncHandler(async (req: AuthRequest, res) => {
        const applications = await prisma.application.findMany({
            where: { userId: req.user!.id },
        });

        const platformStats = applications.reduce((acc, app) => {
            const platform = app.platform || 'Other';
            if (!acc[platform]) {
                acc[platform] = { applications: 0, responses: 0 };
            }
            acc[platform].applications++;
            if (['INTERVIEWING', 'OFFERED', 'REJECTED'].includes(app.status)) {
                acc[platform].responses++;
            }
            return acc;
        }, {} as Record<string, { applications: number; responses: number }>);

        res.json({ success: true, data: platformStats });
    })
);

// Get resume performance
router.get(
    '/resumes',
    asyncHandler(async (req: AuthRequest, res) => {
        const resumes = await prisma.resume.findMany({
            where: { userId: req.user!.id },
            select: { id: true, name: true, atsScore: true },
        });

        res.json({
            success: true,
            data: resumes.map(r => ({
                resumeId: r.id,
                name: r.name,
                responseRate: r.atsScore || 0,
            })),
        });
    })
);

export default router;
