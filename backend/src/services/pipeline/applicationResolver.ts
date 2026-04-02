// ============================================================
// Application Identity Resolver
// ============================================================
// Links multiple emails about the SAME job to ONE application
// card. A user may receive 5+ emails for one application:
// confirmation → OA → interview → reminder → result.
//
// Uses a stable "application key" generated from:
//   company + role + userId
// Plus fuzzy matching fallbacks when role is unknown.
// ============================================================

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// ============================================================
// Types
// ============================================================

export interface ResolvedApplication {
    found: boolean;
    applicationId: string | null;
    applicationKey: string;
    matchMethod: 'EXACT_KEY' | 'THREAD_ID' | 'FUZZY_COMPANY' | 'NEW';
}

export interface ApplicationIdentity {
    company: string;
    role: string;
    userId: string;
    threadId?: string | null;
    senderDomain?: string | null;
    location?: string | null;
}

// ============================================================
// Generate a stable application key
// ============================================================
// Normalizes company + role names to create a consistent hash
// "Google" + "SDE 2" and "GOOGLE" + "sde 2" → same key

function normalizeForKey(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')  // Remove special chars
        .replace(/\s+/g, ' ')          // Collapse spaces
        .trim();
}

export function generateApplicationKey(userId: string, company: string, role: string): string {
    const normalizedCompany = normalizeForKey(company);
    const normalizedRole = normalizeForKey(role || 'unknown role');
    const raw = `${userId}:${normalizedCompany}:${normalizedRole}`;
    return createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

// Company-only key (fallback when role is unknown)
export function generateCompanyKey(userId: string, company: string): string {
    const normalizedCompany = normalizeForKey(company);
    const raw = `${userId}:${normalizedCompany}`;
    return createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

// ============================================================
// Main Export: resolveApplication()
// ============================================================
// Finds or prepares to create an application card for this email.
// Match priority:
//   1. Exact applicationKey match (company + role + userId)
//   2. Gmail threadId match (same email conversation)
//   3. Fuzzy company name match (fallback for unknown roles)
//   4. No match → NEW application

export async function resolveApplication(identity: ApplicationIdentity): Promise<ResolvedApplication> {
    const { company, role, userId, threadId } = identity;

    // Generate application key
    const applicationKey = generateApplicationKey(userId, company, role);
    const companyOnlyKey = generateCompanyKey(userId, company);

    // --- Strategy 1: Exact applicationKey match ---
    const exactMatch = await prisma.application.findFirst({
        where: {
            userId,
            applicationKey,
        },
    });

    if (exactMatch) {
        return {
            found: true,
            applicationId: exactMatch.id,
            applicationKey,
            matchMethod: 'EXACT_KEY',
        };
    }

    // --- Strategy 2: Gmail Thread ID match ---
    // If multiple emails are in the same Gmail thread, they're about the same application
    if (threadId) {
        const threadMatch = await prisma.application.findFirst({
            where: {
                userId,
                threadId,
            },
        });

        if (threadMatch) {
            return {
                found: true,
                applicationId: threadMatch.id,
                applicationKey: threadMatch.applicationKey || applicationKey,
                matchMethod: 'THREAD_ID',
            };
        }

        // Also check if any processed email in this thread was linked to an application
        const emailInThread = await prisma.emailLog.findFirst({
            where: {
                userId,
                threadId,
                applicationId: { not: null },
            },
            select: { applicationId: true },
        });

        if (emailInThread?.applicationId) {
            return {
                found: true,
                applicationId: emailInThread.applicationId,
                applicationKey,
                matchMethod: 'THREAD_ID',
            };
        }
    }

    // --- Strategy 3: Fuzzy company match ---
    // When role is "Unknown Role" or missing, match by company name
    const fuzzyMatch = await prisma.application.findFirst({
        where: {
            userId,
            company: {
                contains: normalizeForKey(company).split(' ')[0], // First word of company
                mode: 'insensitive',
            },
        },
        orderBy: { updatedAt: 'desc' }, // Most recently updated first
    });

    if (fuzzyMatch) {
        // Only match if the role is unknown or matches
        const roleMatches =
            !role ||
            role === 'Unknown Role' ||
            normalizeForKey(fuzzyMatch.role).includes(normalizeForKey(role)) ||
            normalizeForKey(role).includes(normalizeForKey(fuzzyMatch.role));

        if (roleMatches) {
            return {
                found: true,
                applicationId: fuzzyMatch.id,
                applicationKey: fuzzyMatch.applicationKey || applicationKey,
                matchMethod: 'FUZZY_COMPANY',
            };
        }
    }

    // --- No match → NEW ---
    return {
        found: false,
        applicationId: null,
        applicationKey,
        matchMethod: 'NEW',
    };
}

// ============================================================
// Export: linkEmailToApplication()
// ============================================================
// After resolving, link the email log entry to the application

export async function linkEmailToApplication(
    gmailId: string,
    applicationId: string,
    threadId?: string | null
): Promise<void> {
    await prisma.emailLog.update({
        where: { gmailId },
        data: {
            applicationId,
            threadId,
        },
    });
}

// ============================================================
// Export: updateApplicationKey()
// ============================================================
// Set the application key on an existing application (migration helper)

export async function setApplicationKey(
    applicationId: string,
    applicationKey: string,
    threadId?: string | null
): Promise<void> {
    await prisma.application.update({
        where: { id: applicationId },
        data: {
            applicationKey,
            ...(threadId ? { threadId } : {}),
        },
    });
}
