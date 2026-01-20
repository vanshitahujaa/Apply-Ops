import { PrismaClient } from '@prisma/client';
import { createCalendarClient } from './auth.js';

const prisma = new PrismaClient();

interface CreateEventParams {
    company: string;
    role: string;
    interviewAt: Date;
    notes?: string;
}

/**
 * Creates a Google Calendar event for an interview
 * Returns the event ID and HTML link
 */
export const createInterviewEvent = async (
    userId: string,
    params: CreateEventParams
): Promise<{ eventId: string; htmlLink: string } | null> => {
    console.log('📅 createInterviewEvent called for user:', userId);
    console.log('📅 Interview params:', JSON.stringify(params, null, 2));

    try {
        // Get user's Gmail token
        const gmailToken = await prisma.gmailToken.findUnique({
            where: { userId },
        });

        if (!gmailToken) {
            console.warn('⚠️ No Gmail token found for user:', userId);
            return null;
        }

        console.log('✅ Gmail token found, creating calendar client...');

        const calendar = createCalendarClient(gmailToken.accessToken, gmailToken.refreshToken);

        const startTime = new Date(params.interviewAt);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

        const event = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: `Interview: ${params.company} - ${params.role}`,
                description: `Job Interview at ${params.company} for the ${params.role} position.\n\nManaged by ApplyOps`,
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: 'Asia/Kolkata',
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: 'Asia/Kolkata',
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 60 },      // 1 hour before
                        { method: 'popup', minutes: 24 * 60 }, // 1 day before
                        { method: 'email', minutes: 24 * 60 }, // Email 1 day before
                    ],
                },
                colorId: '5', // Yellow/Gold color for interviews
            },
        });

        console.log(`✅ Google Calendar event created: ${event.data.htmlLink}`);

        return {
            eventId: event.data.id!,
            htmlLink: event.data.htmlLink!,
        };
    } catch (error: any) {
        console.error('❌ Failed to create Google Calendar event:');
        console.error('Error message:', error.message);
        console.error('Error details:', JSON.stringify(error.response?.data || error, null, 2));
        return null;
    }
};

/**
 * Updates an existing Google Calendar event
 */
export const updateInterviewEvent = async (
    userId: string,
    eventId: string,
    params: CreateEventParams
): Promise<boolean> => {
    try {
        const gmailToken = await prisma.gmailToken.findUnique({
            where: { userId },
        });

        if (!gmailToken) return false;

        const calendar = createCalendarClient(gmailToken.accessToken, gmailToken.refreshToken);

        const startTime = new Date(params.interviewAt);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        await calendar.events.update({
            calendarId: 'primary',
            eventId,
            requestBody: {
                summary: `Interview: ${params.company} - ${params.role}`,
                description: `Job Interview at ${params.company} for the ${params.role} position.\n\nManaged by ApplyOps`,
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: 'Asia/Kolkata',
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: 'Asia/Kolkata',
                },
            },
        });

        console.log(`✅ Google Calendar event updated: ${eventId}`);
        return true;
    } catch (error: any) {
        console.error('Failed to update Google Calendar event:', error.message);
        return false;
    }
};

/**
 * Deletes a Google Calendar event
 */
export const deleteInterviewEvent = async (
    userId: string,
    eventId: string
): Promise<boolean> => {
    try {
        const gmailToken = await prisma.gmailToken.findUnique({
            where: { userId },
        });

        if (!gmailToken) return false;

        const calendar = createCalendarClient(gmailToken.accessToken, gmailToken.refreshToken);

        await calendar.events.delete({
            calendarId: 'primary',
            eventId,
        });

        console.log(`✅ Google Calendar event deleted: ${eventId}`);
        return true;
    } catch (error: any) {
        console.error('Failed to delete Google Calendar event:', error.message);
        return false;
    }
};
