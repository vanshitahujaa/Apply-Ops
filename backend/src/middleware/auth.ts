import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from './errorHandler.js';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name?: string;
    };
}

export const authenticate = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) => {
    try {
        // Get token from cookie or Authorization header
        let token = req.cookies?.token;

        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new AppError('Authentication required', 401);
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            userId: string;
        };

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true },
        });

        if (!user) {
            throw new AppError('User not found', 401);
        }

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name || undefined
        };
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new AppError('Invalid token', 401));
        } else {
            next(error);
        }
    }
};

export const optionalAuth = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) => {
    try {
        let token = req.cookies?.token;

        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
                userId: string;
            };

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, name: true },
            });

            if (user) {
                req.user = {
                    id: user.id,
                    email: user.email,
                    name: user.name || undefined
                };
            }
        }

        next();
    } catch {
        // Token invalid, continue without user
        next();
    }
};

export const authenticateSocket = async (socket: any, next: (err?: any) => void) => {
    try {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) {
            return next(new Error('Authentication error'));
        }

        const tokenStart = cookieHeader.indexOf('token=');
        if (tokenStart === -1) {
            return next(new Error('Authentication error'));
        }

        const tokenEnd = cookieHeader.indexOf(';', tokenStart);
        const token = cookieHeader.substring(tokenStart + 6, tokenEnd === -1 ? undefined : tokenEnd);

        if (!token) {
            return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true },
        });

        if (!user) {
            return next(new Error('Authentication error'));
        }

        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
};
