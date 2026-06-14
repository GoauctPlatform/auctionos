import { Property } from '../types';

export interface ARVEstimate {
    value: number;
    confidence: 'High' | 'Medium' | 'Low' | 'Insufficient Data';
    calculationMethod: string;
}

const STATE_MULTIPLIERS: Record<string, number> = {
    'CA': 1.6, 'NY': 1.4, 'FL': 1.2, 'TX': 1.1, 'IL': 1.1, 'WA': 1.3
};

export const estimateARV = (property: Property): ARVEstimate => {
    // RVN (Real Value Number) Engine using Internal Data ONLY

    const details = property.details as any || {};
    const assessed = Number(property.assessed_value || details.assessed_value || details.county_appraisal || 0);
    const landValue = Number(property.land_value || details.land_value || 0);
    const improvements = Number(property.improvement_value || details.improvement_value || 0);
    const sqft = Number(property.sqft || details.sqft || details.building_area_sqft || (property as any).building_area_sqft || 0);
    const type = (property.property_type || details.property_type || '').toLowerCase();
    
    // Retrieve State Multiplier
    const state = (property as any).state || (property as any).state_code || '';
    const regionalModifier = STATE_MULTIPLIERS[state] || 1.0;

    let baseValue = 0;
    let confidence: ARVEstimate['confidence'] = 'Insufficient Data';
    let method = 'Need more data to calculate RVN';

    // 1. High Confidence: We have sqft and property structural details
    if (sqft > 0 && assessed > 0) {
        // Base value combines assessed and market average per sqft
        const impliedPpsf = (assessed / sqft) * 1.0; // Estimated market PPSF
        const adjustedPpsf = impliedPpsf * regionalModifier;
        baseValue = sqft * adjustedPpsf;
        
        // Property type adjustments
        if (type.includes('commercial')) baseValue *= 1.2;
        if (type.includes('multi')) baseValue *= 1.1;
        
        confidence = 'High';
        method = 'RVN: Hybrid Area & Assessment Model';
    } 
    // 2. Medium Confidence: Rely on structural improvements vs land value split
    else if (assessed > 0 && improvements > 0) {
        // Improvements are typically undervalued more than land
        baseValue = (landValue * 1.2) + (improvements * 1.8);
        baseValue *= regionalModifier;
        confidence = 'Medium';
        method = 'RVN: Improvement Multiplier Model';
    } 
    // 3. Low Confidence: Only basic assessed value available
    else if (assessed > 0) {
        // Generic historical multiplier
        baseValue = assessed * 1.0 * regionalModifier;
        confidence = 'Low';
        method = 'RVN: Assessed Proxy x1.0';
    }

    // Safety fallback: if previous external fields are requested, they serve only as reference, RVN rules.
    if (baseValue === 0 && (property.redfin_estimate || (property.details as any)?.zillow_estimate)) {
        baseValue = property.redfin_estimate || (property.details as any)?.zillow_estimate;
        confidence = 'Low';
        method = 'External Fallback (Low Accuracy)';
    }

    let finalValue = Math.round(baseValue);
    
    // Safety cutoffs (CRITICAL: prevent ridiculously low valuations)
    if (finalValue > 0 && finalValue < 1000) {
        return { value: 0, confidence: 'Insufficient Data', calculationMethod: 'Value below threshold ($1000)' };
    }

    return {
        value: finalValue,
        confidence,
        calculationMethod: method
    };
};
