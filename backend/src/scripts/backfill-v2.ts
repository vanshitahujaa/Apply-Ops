import { PrismaClient } from '@prisma/client';
import { generateApplicationKey } from '../services/pipeline/applicationResolver.js';

const prisma = new PrismaClient();

async function backfillV2() {
    console.log('🚀 Starting v2.1 Database Backfill...');

    // 1. Backfill Applications
    const apps = await prisma.application.findMany();
    console.log(`Found ${apps.length} applications to process.`);

    let updatedApps = 0;
    for (const app of apps) {
        // Only update if missing new v2 fields
        if (!app.applicationKey || app.confidence === null) {
            const appKey = generateApplicationKey(app.userId, app.company, app.role);
            
            await prisma.application.update({
                where: { id: app.id },
                data: {
                    applicationKey: appKey,
                    confidence: 1.0, // Legacy apps are considered verified
                    needsReview: false,
                }
            });
            updatedApps++;
        }
    }
    console.log(`✅ Updated ${updatedApps} legacy applications with v2 fields.`);

    // 2. We don't need to manually map VIEWED to ACKNOWLEDGED here if
    // we use prisma migrate because Prisma will recreate the enum and
    // potentially drop data if not handled properly. However, for
    // this script to work safely with "db push", Prisma handles it.
    // If raw SQL is needed for ENUMs in Postgres:
    try {
        await prisma.$executeRaw`ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';`;
        await prisma.$executeRaw`ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';`;
        await prisma.$executeRaw`ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'ASSESSMENT';`;
        await prisma.$executeRaw`UPDATE "Application" SET status = 'ACKNOWLEDGED' WHERE status = 'VIEWED';`;
        // Now it's safe to run Prisma migrate to drop VIEWED.
        console.log(`✅ Enum status mappings completed successfully.`);
    } catch (e: any) {
        console.log(`[Note] Enum raw SQL update skipped or already applied: ${e.message}`);
    }

    console.log('🎉 Backfill complete!');
}

backfillV2()
    .catch(e => {
        console.error('❌ Backfill failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
