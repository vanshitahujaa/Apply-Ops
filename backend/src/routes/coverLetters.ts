import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { generateCoverLetterAI } from '../services/ai/gemini.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

const generateSchema = z.object({
    company: z.string().min(1),
    role: z.string().min(1),
    jobDescription: z.string().optional(),
    resumeId: z.string().optional(),
    tone: z.enum(['FORMAL', 'CASUAL', 'STARTUP', 'CORPORATE']).default('FORMAL'),
});

// Get all cover letters
router.get(
    '/',
    asyncHandler(async (req: AuthRequest, res) => {
        const coverLetters = await prisma.coverLetter.findMany({
            where: { userId: req.user!.id },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: coverLetters });
    })
);

// Generate cover letter
router.post(
    '/generate',
    asyncHandler(async (req: AuthRequest, res) => {
        const { company, role, jobDescription, tone, resumeId } = generateSchema.parse(req.body);

        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Get resume content if provided
        let resumeContent = undefined;
        if (resumeId) {
            const resume = await prisma.resume.findUnique({
                where: { id: resumeId },
            });
            if (resume && resume.userId === req.user!.id) {
                resumeContent = resume.content || undefined;
            }
        }

        // Generate cover letter content
        const content = await generateCoverLetterAI(
            company,
            role,
            jobDescription,
            tone,
            user.name || 'Candidate',
            resumeContent
        );

        const coverLetter = await prisma.coverLetter.create({
            data: {
                userId: req.user!.id,
                company,
                role,
                content,
                tone: tone as any, // Cast to match enum if needed, though Zod validation should align
            },
        });

        res.status(201).json({ success: true, data: coverLetter });
    })
);

// Update cover letter
router.patch(
    '/:id',
    asyncHandler(async (req: AuthRequest, res) => {
        const { content } = req.body;

        const existing = await prisma.coverLetter.findFirst({
            where: { id: req.params.id, userId: req.user!.id },
        });

        if (!existing) {
            throw new AppError('Cover letter not found', 404);
        }

        const coverLetter = await prisma.coverLetter.update({
            where: { id: req.params.id },
            data: { content },
        });

        res.json({ success: true, data: coverLetter });
    })
);

// Delete cover letter
router.delete(
    '/:id',
    asyncHandler(async (req: AuthRequest, res) => {
        const existing = await prisma.coverLetter.findFirst({
            where: { id: req.params.id, userId: req.user!.id },
        });

        if (!existing) {
            throw new AppError('Cover letter not found', 404);
        }

        await prisma.coverLetter.delete({ where: { id: req.params.id } });

        res.json({ success: true, message: 'Cover letter deleted' });
    })
);

export default router;
