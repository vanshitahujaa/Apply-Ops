import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = Router();

// In a real app we'd have a requireAdmin middlewere here, 
// but we just gate it behind standard auth for the MVP/Beta.
router.use(authenticate);

// Get recent SyncRuns
router.get(
    '/syncs',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const syncs = await prisma.syncRun.findMany({
            where: { userId: req.user!.id },
            orderBy: { startedAt: 'desc' },
            take: 20
        });
        res.json({ success: true, data: syncs });
    })
);

// Get specific Email Logs for a SyncRun
router.get(
    '/syncs/:id/logs',
    asyncHandler(async (req: AuthRequest, res: Response) => {
        const logs = await prisma.emailLog.findMany({
            where: { syncRunId: req.params.id, userId: req.user!.id },
            orderBy: { receivedAt: 'desc' }
        });
        res.json({ success: true, data: logs });
    })
);

export default router;
