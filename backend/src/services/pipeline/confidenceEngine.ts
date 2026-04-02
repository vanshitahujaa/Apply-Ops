// ============================================================
// Confidence Engine
// ============================================================
// Combines signals from ALL pipeline stages into a single
// confidence score that determines what action to take:
//
//   HIGH   (≥ 0.85) → Auto-create/update card + calendar
//   MEDIUM (0.60-0.84) → Create card but mark "needs review"
//   LOW    (< 0.60) → Ignore / suppress
//
// Signals:
//   - Source trust (platform registry)
//   - Keyword score (keyword engine)
//   - Date extraction success
//   - Round detection success
//   - Thread consistency (same thread = same app)
//   - AI verification confidence
// ============================================================

import type { SourceMatch } from './platformRegistry.js';
import type { KeywordMatch } from './keywordEngine.js';

// ============================================================
// Types
// ============================================================

export interface ConfidenceResult {
    score: number;           // 0.0 - 1.0
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    action: 'AUTO_UPDATE' | 'NEEDS_REVIEW' | 'IGNORE';
    breakdown: ConfidenceBreakdown;
}

export interface ConfidenceBreakdown {
    sourceScore: number;     // 0.0 - 1.0 (weight: 25%)
    keywordScore: number;    // 0.0 - 1.0 (weight: 25%)
    extractionScore: number; // 0.0 - 1.0 (weight: 15%)
    threadScore: number;     // 0.0 - 1.0 (weight: 10%)
    aiScore: number;         // 0.0 - 1.0 (weight: 25%)
}

export interface ConfidenceInput {
    // Stage 1 signal
    source: SourceMatch;

    // Stage 2 signal
    keywords: KeywordMatch;

    // Stage 3 signal (pre-extraction)
    hasCompany: boolean;
    hasDate: boolean;
    hasRound: boolean;
    hasMeetingLink: boolean;

    // Thread signal
    existingApplicationFound: boolean;
    matchMethod: 'EXACT_KEY' | 'THREAD_ID' | 'FUZZY_COMPANY' | 'NEW';

    // Stage 4 signal (AI — may be null if AI was skipped)
    aiConfidence: number | null;
}

// ============================================================
// Weights
// ============================================================

const WEIGHTS = {
    source: 0.25,
    keywords: 0.25,
    extraction: 0.15,
    thread: 0.10,
    ai: 0.25,
} as const;

// ============================================================
// Main Export: calculateConfidence()
// ============================================================

export function calculateConfidence(input: ConfidenceInput): ConfidenceResult {
    // --- Source Score (0.0 - 1.0) ---
    let sourceScore = 0;
    if (input.source.trusted) {
        switch (input.source.confidence) {
            case 'HIGH': sourceScore = 1.0; break;
            case 'MEDIUM': sourceScore = 0.7; break;
            default: sourceScore = 0.5; break;
        }
    }
    // Boost for specific categories
    if (input.source.category === 'ATS') sourceScore = Math.min(1.0, sourceScore + 0.1);
    if (input.source.category === 'ASSESSMENT') sourceScore = Math.min(1.0, sourceScore + 0.1);

    // --- Keyword Score (0.0 - 1.0) ---
    // Normalize keyword score (raw scores range from 0 to ~30+)
    const rawKwScore = input.keywords.score;
    let keywordScore = 0;
    if (rawKwScore >= 15) keywordScore = 1.0;
    else if (rawKwScore >= 10) keywordScore = 0.85;
    else if (rawKwScore >= 7) keywordScore = 0.7;
    else if (rawKwScore >= 5) keywordScore = 0.55;
    else if (rawKwScore >= 3) keywordScore = 0.35;
    else keywordScore = rawKwScore * 0.1;

    // Boost for high-value categories
    if (input.keywords.matchedCategory === 'OFFER') keywordScore = Math.min(1.0, keywordScore + 0.15);
    if (input.keywords.matchedCategory === 'INTERVIEW_ROUNDS') keywordScore = Math.min(1.0, keywordScore + 0.1);

    // --- Extraction Score (0.0 - 1.0) ---
    let extractionScore = 0;
    if (input.hasCompany) extractionScore += 0.4;
    if (input.hasDate) extractionScore += 0.3;
    if (input.hasRound) extractionScore += 0.2;
    if (input.hasMeetingLink) extractionScore += 0.1;

    // --- Thread Score (0.0 - 1.0) ---
    let threadScore = 0;
    if (input.existingApplicationFound) {
        switch (input.matchMethod) {
            case 'EXACT_KEY': threadScore = 1.0; break;
            case 'THREAD_ID': threadScore = 0.95; break;
            case 'FUZZY_COMPANY': threadScore = 0.6; break;
            default: threadScore = 0; break;
        }
    }
    // New applications get a neutral score (doesn't penalize)
    if (input.matchMethod === 'NEW') threadScore = 0.5;

    // --- AI Score (0.0 - 1.0) ---
    let aiScore = 0;
    if (input.aiConfidence !== null) {
        aiScore = input.aiConfidence;
    } else {
        // AI was skipped — redistribute weight
        // When AI is unavailable, trust the script more
        aiScore = (sourceScore + keywordScore) / 2; // Average of other signals
    }

    // --- Calculate weighted total ---
    const totalScore =
        sourceScore * WEIGHTS.source +
        keywordScore * WEIGHTS.keywords +
        extractionScore * WEIGHTS.extraction +
        threadScore * WEIGHTS.thread +
        aiScore * WEIGHTS.ai;

    // Clamp to [0, 1]
    const finalScore = Math.max(0, Math.min(1, totalScore));

    // --- Determine level and action ---
    let level: 'HIGH' | 'MEDIUM' | 'LOW';
    let action: 'AUTO_UPDATE' | 'NEEDS_REVIEW' | 'IGNORE';

    if (finalScore >= 0.85) {
        level = 'HIGH';
        action = 'AUTO_UPDATE';
    } else if (finalScore >= 0.60) {
        level = 'MEDIUM';
        action = 'NEEDS_REVIEW';
    } else {
        level = 'LOW';
        action = 'IGNORE';
    }

    return {
        score: Math.round(finalScore * 100) / 100, // 2 decimal places
        level,
        action,
        breakdown: {
            sourceScore: Math.round(sourceScore * 100) / 100,
            keywordScore: Math.round(keywordScore * 100) / 100,
            extractionScore: Math.round(extractionScore * 100) / 100,
            threadScore: Math.round(threadScore * 100) / 100,
            aiScore: Math.round(aiScore * 100) / 100,
        },
    };
}

// ============================================================
// Export: Thresholds as constants
// ============================================================

export const CONFIDENCE_THRESHOLDS = {
    HIGH: 0.85,
    MEDIUM: 0.60,
    LOW: 0,
} as const;
