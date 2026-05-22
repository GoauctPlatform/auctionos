/**
 * scores.service.ts
 * 
 * Frontend service for the ML Scoring Engine persistence layer.
 * Syncs locally-computed deal scores to the backend database,
 * enabling dashboard recommendations to be backed by real stored data
 * rather than ephemeral in-memory calculations.
 */
import { API_URL, getHeaders } from './httpClient';
import { DealScoreResult } from '../intelligence/scoringEngine';

export interface StoredScore {
    parcel_id: string;
    deal_score: number;
    rating: string;
    score_factors: string[];
    model_version: string;
    computed_at: string | null;
    updated_at: string | null;
}

export interface TopScoredProperty extends StoredScore {
    address: string | null;
    county: string | null;
    state: string | null;
    amount_due: number | null;
    assessed_value: number | null;
    availability_status: string | null;
    property_type: string | null;
    lot_acres: number | null;
    improvement_value: number | null;
    owner_address: string | null;
}

const SCORES_URL = `${API_URL}/scores`;

/**
 * Silently upserts a computed score to the backend.
 * Called automatically on property detail page load (non-blocking).
 * Errors are swallowed to ensure they never interrupt the user experience.
 */
export const submitScore = async (
    parcelId: string, 
    scoreResult: DealScoreResult,
    metadata?: { status?: string; state?: string; county?: string }
): Promise<void> => {
    try {
        await fetch(`${SCORES_URL}/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                parcel_id: parcelId,
                deal_score: scoreResult.score,
                rating: scoreResult.rating,
                status: metadata?.status,
                state: metadata?.state,
                county: metadata?.county,
                score_factors: scoreResult.factors,
                model_version: 'rule-based-v1',
            }),
        });
    } catch {
        // Silent fail — score sync is non-critical to UX
    }
};

/**
 * Retrieves the persisted score for a specific property.
 * Returns null if no score has been persisted yet.
 */
export const getScore = async (parcelId: string): Promise<StoredScore | null> => {
    try {
        const res = await fetch(`${SCORES_URL}/${parcelId}`, {
            headers: getHeaders(),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
};

/**
 * Fetches the top-N scored properties from the database.
 * This is the DB-backed replacement for the frontend-only recommendProperties().
 * Falls back gracefully (returns empty array) if the endpoint is unavailable.
 */
export const getTopScoredProperties = async (
    limit: number = 6,
    options: { state?: string; minScore?: number } = {}
): Promise<TopScoredProperty[]> => {
    try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (options.state) params.set('state', options.state);
        if (options.minScore !== undefined) params.set('min_score', String(options.minScore));

        const res = await fetch(`${SCORES_URL}/top?${params.toString()}`, {
            headers: getHeaders(),
        });
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
};

/**
 * Fetches pre-aggregated statistics categorized by state.
 * This handles the heavy lifting on the backend to avoid looping through
 * thousands of properties on the client.
 */
export interface StateStat {
    state_code: string;
    volume: number;
    average_score: number;
    distribution: {
        A: number;
        B: number;
        C: number;
        D: number;
        F: number;
    };
    deed_volume?: number;
    lien_volume?: number;
    foreclosure_volume?: number;
}

export const getStateStats = async (): Promise<StateStat[]> => {
    try {
        const res = await fetch(`${SCORES_URL}/stats/state`, {
            headers: getHeaders(),
        });
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
};

/**
 * Monthly historical counts of auction types per state (or all states).
 * X-axis: months (Jan–Dec). Y-axis: deed/lien/foreclosure counts.
 * Always returns 12 rows (months with no data return 0s).
 */
export interface MonthlyAuctionStat {
    month_num: number;
    month_label: string;   // "Jan", "Feb", …, "Dec"
    deed: number;
    lien: number;
    foreclosure: number;
}

export const getMonthlyStats = async (state?: string): Promise<MonthlyAuctionStat[]> => {
    try {
        const params = state ? `?state=${encodeURIComponent(state)}` : '';
        const res = await fetch(`${SCORES_URL}/stats/monthly${params}`, {
            headers: getHeaders(),
        });
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
};


/**
 * Fetches the paginated full score list (admin analytics).
 */
export const listScores = async (skip = 0, limit = 100): Promise<StoredScore[]> => {
    try {
        const res = await fetch(`${SCORES_URL}/?skip=${skip}&limit=${limit}`, {
            headers: getHeaders(),
        });
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
};
