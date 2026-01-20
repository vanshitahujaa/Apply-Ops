import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getGoogleAuthURL, getGoogleUser } from '../services/google/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

// Helper to create JWT
const createToken = (userId: string): string => {
    return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
    });
};

// Helper to set cookie
const setTokenCookie = (res: Response, token: string) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

// Register
router.post(
    '/register',
    asyncHandler(async (req, res) => {
        const { email, password, name } = registerSchema.parse(req.body);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new AppError('Email already registered', 400);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: { email, passwordHash, name },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        // Create token
        const token = createToken(user.id);
        setTokenCookie(res, token);

        res.status(201).json({
            success: true,
            data: {
                user: { ...user, gmailConnected: false },
                token,
            },
        });
    })
);

// Login
router.post(
    '/login',
    asyncHandler(async (req, res) => {
        const { email, password } = loginSchema.parse(req.body);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: { gmailToken: { select: { id: true } } },
        });

        if (!user || !user.passwordHash) {
            throw new AppError('Invalid email or password', 401);
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            throw new AppError('Invalid email or password', 401);
        }

        // Create token
        const token = createToken(user.id);
        setTokenCookie(res, token);

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    gmailConnected: !!user.gmailToken,
                },
                token,
            },
        });
    })
);

// Logout
router.post('/logout', (_req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user
router.get(
    '/me',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            include: { gmailToken: { select: { id: true, filterActive: true } } },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                gmailConnected: !!user.gmailToken,
                createdAt: user.createdAt,
            },
        });
    })
);

// Google Auth URL
router.get('/google/url', (_req, res) => {
    const url = getGoogleAuthURL();
    res.json({ success: true, url });
});

// Google Auth Callback (Login or Link)
router.get(
    '/google/callback',
    asyncHandler(async (req, res) => {
        const code = req.query.code as string;
        if (!code) throw new AppError('Code is required', 400);

        const { user: googleUser, tokens } = await getGoogleUser(code);

        // Check for logged-in user (Link Account flow)
        let userId = null;
        const token = req.cookies.token;

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
                userId = decoded.userId;
            } catch (e) { }
        }

        if (userId) {
            // Link to existing user
            // Ensure we have a refresh token for Gmail
            if (!tokens.refresh_token && !tokens.access_token) {
                throw new AppError('Failed to retrieve tokens from Google', 400);
            }

            await prisma.gmailToken.upsert({
                where: { userId },
                create: {
                    userId,
                    accessToken: tokens.access_token!,
                    refreshToken: tokens.refresh_token || '', // Should be present with prompt=consent
                    expiresAt: new Date(tokens.expiry_date!),
                },
                update: {
                    accessToken: tokens.access_token!,
                    ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
                    expiresAt: new Date(tokens.expiry_date!),
                }
            });

            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings`);
        } else {
            // Login/Register flow
            const email = googleUser.email!;
            let user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
                // Register
                user = await prisma.user.create({
                    data: {
                        email,
                        name: googleUser.name,
                        googleId: googleUser.id,
                        avatarUrl: googleUser.picture,
                    }
                });
            } else {
                // Update googleId
                if (!user.googleId) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { googleId: googleUser.id, avatarUrl: googleUser.picture || user.avatarUrl }
                    });
                }
            }

            // Save Gmail tokens
            if (tokens.access_token) {
                await prisma.gmailToken.upsert({
                    where: { userId: user.id },
                    create: {
                        userId: user.id,
                        accessToken: tokens.access_token!,
                        refreshToken: tokens.refresh_token || '',
                        expiresAt: new Date(tokens.expiry_date!),
                    },
                    update: {
                        accessToken: tokens.access_token!,
                        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
                        expiresAt: new Date(tokens.expiry_date!),
                    }
                });
            }

            const appToken = createToken(user.id);
            setTokenCookie(res, appToken);

            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-callback?token=${appToken}`);
        }
    })
);

// Gmail disconnect
router.post(
    '/gmail/disconnect',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        await prisma.gmailToken.delete({
            where: { userId: req.user!.id },
        });

        res.json({ success: true, message: 'Gmail disconnected' });
    })
);

// Export data
router.get(
    '/export',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const userId = req.user!.id;

        const [user, applications, resumes, coverLetters] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, createdAt: true } }),
            prisma.application.findMany({ where: { userId } }),
            prisma.resume.findMany({ where: { userId } }),
            prisma.coverLetter.findMany({ where: { userId } })
        ]);

        const data = {
            user,
            applications,
            resumes,
            coverLetters,
            exportedAt: new Date().toISOString()
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=applyops-data.json');
        res.send(JSON.stringify(data, null, 2));
    })
);

// Delete account
router.delete(
    '/me',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        await prisma.user.delete({
            where: { id: req.user!.id }
        });
        res.clearCookie('token');
        res.json({ success: true, message: 'Account deleted' });
    })
);

export default router;
