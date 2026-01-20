import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { fetchAndProcessEmails } from '../services/gmail/fetcher.js';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createApplicationSchema = z.object({
    company: z.string().min(1),
    role: z.string().min(1),
    status: z.enum(['APPLIED', 'VIEWED', 'INTERVIEWING', 'OFFERED', 'REJECTED', 'WITHDRAWN']).optional(),
    platform: z.string().optional(),
    interviewAt: z.string().optional(), // Accept any date string format
    notes: z.string().optional(),
    salary: z.string().optional(),
    location: z.string().optional(),
    url: z.string().url().optional().or(z.literal('')),
});

const updateApplicationSchema = createApplicationSchema.partial();

// Get all applications
router.get(
    '/',
    asyncHandler(async (req: AuthRequest, res) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [applications, total] = await Promise.all([
            prisma.application.findMany({
                where: { userId: req.user!.id },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.application.count({ where: { userId: req.user!.id } }),
        ]);

        res.json({
            success: true,
            data: applications.map(app => ({
                ...app,
                status: app.status.toLowerCase(),
            })),
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
    })
);

// Get single application
router.get(
    '/:id',
    asyncHandler(async (req: AuthRequest, res) => {
        const application = await prisma.application.findFirst({
            where: {
                id: req.params.id,
                userId: req.user!.id,
            },
            include: {
                coverLetters: true,
            },
        });

        if (!application) {
            throw new AppError('Application not found', 404);
        }

        res.json({
            success: true,
            data: {
                ...application,
                status: application.status.toLowerCase(),
            },
        });
    })
);

// Create application
router.post(
    '/',
    asyncHandler(async (req: AuthRequest, res) => {
        const data = createApplicationSchema.parse(req.body);

        const application = await prisma.application.create({
            data: {
                ...data,
                status: data.status || 'APPLIED',
                interviewAt: data.interviewAt ? new Date(data.interviewAt) : undefined,
                userId: req.user!.id,
            },
        });

        // Emit real-time update
        const io = req.app.get('io');
        // Check if io exists before emitting
        if (io) {
            io.to(`user:${req.user!.id}`).emit('application:created', application);
        }

        res.status(201).json({
            success: true,
            data: {
                ...application,
                status: application.status.toLowerCase(),
            },
        });
    })
);

// Sync with Gmail
router.post(
    '/sync',
    asyncHandler(async (req: AuthRequest, res) => {
        try {
            const count = await fetchAndProcessEmails(req.user!.id);
            res.json({ success: true, count, message: `Processed ${count} updates from Gmail` });
        } catch (error: any) {
            if (error.message === 'Gmail not connected' || error.message.includes('Gmail permissions missing')) {
                throw new AppError(error.message, 400);
            }
            throw error;
        }
    })
);

// Update application
router.patch(
    '/:id',
    asyncHandler(async (req: AuthRequest, res) => {
        const data = updateApplicationSchema.parse(req.body);

        // Check ownership
        const existing = await prisma.application.findFirst({
            where: { id: req.params.id, userId: req.user!.id },
        });

        if (!existing) {
            throw new AppError('Application not found', 404);
        }

        let calendarEventId = existing.calendarEventId;

        // Handle Google Calendar sync for interview dates (non-blocking)
        if (data.interviewAt) {
            try {
                const { createInterviewEvent, updateInterviewEvent } = await import('../services/google/calendar.js');

                const interviewDate = new Date(data.interviewAt);

                if (existing.calendarEventId) {
                    // Update existing event
                    await updateInterviewEvent(req.user!.id, existing.calendarEventId, {
                        company: existing.company,
                        role: existing.role,
                        interviewAt: interviewDate,
                    });
                } else {
                    // Create new event
                    const eventResult = await createInterviewEvent(req.user!.id, {
                        company: existing.company,
                        role: existing.role,
                        interviewAt: interviewDate,
                    });
                    if (eventResult) {
                        calendarEventId = eventResult.eventId;
                    }
                }
            } catch (calendarError: any) {
                console.error('Calendar sync failed (non-blocking):', calendarError.message);
                // Continue with the update even if calendar sync fails
            }
        }

        const application = await prisma.application.update({
            where: { id: req.params.id },
            data: {
                ...data,
                interviewAt: data.interviewAt ? new Date(data.interviewAt) : undefined,
                calendarEventId,
                // Auto-update status to INTERVIEWING when interview date is set
                ...(data.interviewAt && existing.status !== 'OFFERED' && existing.status !== 'REJECTED'
                    ? { status: 'INTERVIEWING' }
                    : {}),
            },
        });

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${req.user!.id}`).emit('application:updated', application);
        }

        res.json({
            success: true,
            data: {
                ...application,
                status: application.status.toLowerCase(),
            },
        });
    })
);

// Delete application
router.delete(
    '/:id',
    asyncHandler(async (req: AuthRequest, res) => {
        // Check ownership
        const existing = await prisma.application.findFirst({
            where: { id: req.params.id, userId: req.user!.id },
        });

        if (!existing) {
            throw new AppError('Application not found', 404);
        }

        await prisma.application.delete({
            where: { id: req.params.id },
        });

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${req.user!.id}`).emit('application:deleted', req.params.id);
        }

        res.json({ success: true, message: 'Application deleted' });
    })
);

export default router;
