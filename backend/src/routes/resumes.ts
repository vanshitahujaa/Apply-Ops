import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdf from 'pdf-parse';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { analyzeResumeAI } from '../services/ai/gemini.js';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});

// All routes require authentication
router.use(authenticate);

// Get all resumes
router.get(
    '/',
    asyncHandler(async (req: AuthRequest, res) => {
        const resumes = await prisma.resume.findMany({
            where: { userId: req.user!.id },
            orderBy: { uploadedAt: 'desc' },
        });

        res.json({ success: true, data: resumes });
    })
);

// Upload resume
router.post(
    '/upload',
    upload.single('resume'),
    asyncHandler(async (req: AuthRequest, res) => {
        if (!req.file) {
            throw new AppError('No file uploaded', 400);
        }

        let content = '';
        try {
            const dataBuffer = fs.readFileSync(req.file.path);
            const data = await pdf(dataBuffer);
            content = data.text;
            
            if (!content || content.trim().length === 0) {
                 throw new Error('PDF content is empty (scanned image?)');
            }
        } catch (error: any) {
            console.error('Failed to parse PDF', error);
            throw new AppError('Failed to extract text from PDF. Please ensure it is a text-based PDF, not an image.', 400);
        }

        const resume = await prisma.resume.create({
            data: {
                userId: req.user!.id,
                name: req.body.name || path.parse(req.file.originalname).name,
                fileName: req.file.originalname,
                fileUrl: `/uploads/${req.file.filename}`,
                content,
            },
        });

        res.status(201).json({ success: true, data: resume });
    })
);

// Analyze resume against JD
router.post(
    '/analyze',
    asyncHandler(async (req: AuthRequest, res) => {
        const { resumeId, jobDescription } = req.body;

        if (!resumeId || !jobDescription) {
            throw new AppError('Resume ID and job description are required', 400);
        }

        // Check ownership
        const resume = await prisma.resume.findFirst({
            where: { id: resumeId, userId: req.user!.id },
        });

        if (!resume) {
            throw new AppError('Resume not found', 404);
        }

        // AI Analysis using Gemini
        if (!resume.content || resume.content.length < 50) {
            throw new AppError('Resume content is empty or too short. Please re-upload.', 400);
        }

        const result = await analyzeResumeAI(resume.content, jobDescription);

        // Update ATS score and feedback
        const updatedResume = await prisma.resume.update({
            where: { id: resumeId },
            data: {
                atsScore: result.score,
                feedback: result as any // Save the full result object
            },
        });

        res.json({
            success: true,
            data: result,
        });
    })
);

// Delete resume
router.delete(
    '/:id',
    asyncHandler(async (req: AuthRequest, res) => {
        const resume = await prisma.resume.findFirst({
            where: { id: req.params.id, userId: req.user!.id },
        });

        if (!resume) {
            throw new AppError('Resume not found', 404);
        }

        // Delete file
        const filePath = path.join(uploadDir, path.basename(resume.fileUrl));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await prisma.resume.delete({ where: { id: req.params.id } });

        res.json({ success: true, message: 'Resume deleted' });
    })
);

export default router;
