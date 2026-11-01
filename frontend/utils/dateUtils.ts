/**
 * Centralized Date and Time formatting utilities for GoAuct Platform (US Standard).
 * Ensures consistent MM/DD/YYYY dates and 12-hour AM/PM times without timezone drift.
 */

/**
 * Formats a date string (YYYY-MM-DD or ISO) or Date object to US format MM/DD/YYYY (e.g. "11/03/2026").
 */
export function formatDateUS(dateVal: string | Date | null | undefined): string {
    if (!dateVal) return '';

    try {
        if (typeof dateVal === 'string') {
            const trimmed = dateVal.trim();
            // Handle plain YYYY-MM-DD without timezone shifting
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                const [year, month, day] = trimmed.split('-');
                return `${month}/${day}/${year}`;
            }
            // Handle MM/DD/YYYY already
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
                const parts = trimmed.split('/');
                return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
            }
            // Full ISO string with T
            const d = new Date(trimmed);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('en-US', {
                    timeZone: 'UTC',
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric'
                });
            }
        } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
            return dateVal.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
        }
    } catch (e) {
        console.error('Error formatting date to US format:', e);
    }
    return String(dateVal);
}

/**
 * Formats a date string to US short readable format (e.g. "Nov 3, 2026").
 */
export function formatDateShortUS(dateVal: string | Date | null | undefined): string {
    if (!dateVal) return '';

    try {
        let dateStr = typeof dateVal === 'string' ? dateVal.trim() : dateVal.toISOString();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            dateStr = dateStr + 'T00:00:00Z';
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-US', {
                timeZone: 'UTC',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    } catch (e) {
        console.error('Error in formatDateShortUS:', e);
    }
    return formatDateUS(dateVal);
}

/**
 * Formats a date string to US long descriptive format (e.g. "Tuesday, November 3, 2026").
 */
export function formatDateLongUS(dateVal: string | Date | null | undefined): string {
    if (!dateVal) return '';

    try {
        let dateStr = typeof dateVal === 'string' ? dateVal.trim() : dateVal.toISOString();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            dateStr = dateStr + 'T00:00:00Z';
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-US', {
                timeZone: 'UTC',
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        }
    } catch (e) {
        console.error('Error in formatDateLongUS:', e);
    }
    return formatDateUS(dateVal);
}

/**
 * Normalizes time strings from 24h ("14:00", "14:30:00") or raw formats to US 12-hour AM/PM format (e.g. "02:00 PM").
 */
export function formatTimeUS(timeVal: string | null | undefined): string {
    if (!timeVal) return '';
    const trimmed = String(timeVal).trim();
    if (!trimmed || ['N/A', 'NONE', 'NULL', 'TBA', 'TBD', '-'].includes(trimmed.toUpperCase())) {
        return trimmed;
    }

    // If string is just a date like "2026-11-03", it has no time component
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return '';
    }

    const upper = trimmed.toUpperCase();

    // Check for "Noon"
    if (upper === 'NOON' || upper === '12:00 NOON' || upper === '12 NOON') {
        return '12:00 PM';
    }

    // Match patterns like "10:00 AM", "10:00AM", "10 AM", "10AM", "10:00:00 AM", "11:00 AM EST", "9:34 AM ED", "2 pm"
    const ampmMatch = upper.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(AM|PM)(?:\s+([A-Z]{1,4}))?$/);
    if (ampmMatch) {
        let hr = parseInt(ampmMatch[1], 10);
        const min = ampmMatch[2] || '00';
        const period = ampmMatch[3];
        const tz = ampmMatch[4] ? ` ${ampmMatch[4]}` : '';
        if (hr === 0) hr = 12;
        return `${String(hr).padStart(2, '0')}:${min} ${period}${tz}`;
    }

    // Handle 24-hour time HH:MM or HH:MM:SS
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match24) {
        let hours = parseInt(match24[1], 10);
        const minutes = match24[2];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 becomes 12
        return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }

    // Handle ISO strings with T: e.g. "2026-11-03T14:30:00"
    if (trimmed.includes('T')) {
        const parts = trimmed.split('T');
        if (parts[1] && parts[1] !== '00:00:00' && parts[1] !== '00:00:00Z') {
            const timePart = parts[1].split('.')[0].replace('Z', '');
            return formatTimeUS(timePart);
        }
        return '';
    }

    return trimmed;
}

/**
 * Formats a combined Date and optional Time string into US standard "MM/DD/YYYY at hh:mm AM/PM"
 */
export function formatDateTimeUS(dateVal: string | Date | null | undefined, timeVal?: string | null | undefined): string {
    const d = formatDateUS(dateVal);
    const t = formatTimeUS(timeVal);
    if (d && t) return `${d} at ${t}`;
    return d || t || '';
}
