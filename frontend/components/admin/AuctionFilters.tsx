import React, { useState, useEffect } from 'react';
import { TextField, Select, MenuItem, Button, FormControl, InputLabel } from '@mui/material';
import { useDebounce } from 'use-debounce';

export interface AuctionFilterParams {
    q?: string;
    name?: string;
    state?: string;
    county?: string;
    isPresencial?: boolean;
    startDate?: string;
    endDate?: string;
    minParcels?: number;
    maxParcels?: number;
    tax_statuses?: string[];
}

interface AuctionFiltersProps {
    onFilterChange: (filters: AuctionFilterParams) => void;
}

import { useSearchParams } from 'react-router-dom';

const AUCTION_TYPES = [
    { label: 'Tax Deed', value: 'Tax Deed' },
    { label: 'Tax Lien', value: 'Tax Lien' },
    { label: 'Foreclosure', value: 'Foreclosure' },
    { label: 'Tax Sale', value: 'Tax Sale' },
    { label: 'Over the Counter', value: 'Over the Counter' },
    { label: 'Sealed Bid', value: 'Sealed Bid' }
];

const AuctionFilters: React.FC<AuctionFiltersProps> = ({ onFilterChange }) => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Initialize state from URL
    const [filters, setFilters] = useState<AuctionFilterParams>(() => {
        const initial: any = {};
        if (searchParams.get('q')) initial.q = searchParams.get('q');
        if (searchParams.get('name')) initial.name = searchParams.get('name');
        if (searchParams.get('state')) initial.state = searchParams.get('state');
        if (searchParams.get('county')) initial.county = searchParams.get('county');
        if (searchParams.get('isPresencial')) initial.isPresencial = searchParams.get('isPresencial') === 'true';
        if (searchParams.get('startDate')) initial.startDate = searchParams.get('startDate');
        if (searchParams.get('endDate')) initial.endDate = searchParams.get('endDate');
        if (searchParams.get('minParcels')) initial.minParcels = Number(searchParams.get('minParcels'));
        if (searchParams.get('maxParcels')) initial.maxParcels = Number(searchParams.get('maxParcels'));
        if (searchParams.getAll('tax_statuses').length > 0) initial.tax_statuses = searchParams.getAll('tax_statuses');
        return initial;
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [debouncedFilters] = useDebounce(filters, 500);

    // Sync from URL to State (External Updates from Calendar)
    useEffect(() => {
        setFilters(prev => {
            let changed = false;
            const next = { ...prev };
            
            const checkAndSet = (key: keyof AuctionFilterParams, val: any) => {
                const isArray = Array.isArray(val);
                const currentVal = next[key];
                const isMatch = isArray 
                    ? JSON.stringify(currentVal) === JSON.stringify(val)
                    : currentVal === val;

                if (!isMatch) {
                    next[key] = val;
                    changed = true;
                }
            };

            checkAndSet('q', searchParams.get('q') || undefined);
            checkAndSet('name', searchParams.get('name') || undefined);
            checkAndSet('state', searchParams.get('state') || undefined);
            checkAndSet('county', searchParams.get('county') || undefined);
            
            const isPres = searchParams.get('isPresencial');
            checkAndSet('isPresencial', isPres ? isPres === 'true' : undefined);
            
            checkAndSet('startDate', searchParams.get('startDate') || undefined);
            checkAndSet('endDate', searchParams.get('endDate') || undefined);
            
            const minP = searchParams.get('minParcels');
            checkAndSet('minParcels', minP ? Number(minP) : undefined);
            
            const maxP = searchParams.get('maxParcels');
            checkAndSet('maxParcels', maxP ? Number(maxP) : undefined);
            
            const statuses = searchParams.getAll('tax_statuses');
            checkAndSet('tax_statuses', statuses.length > 0 ? statuses : undefined);

            return changed ? next : prev;
        });
    }, [searchParams]);

    // Sync state TO URL and emit parent callback
    useEffect(() => {
        const cleanParams = new URLSearchParams();
        Object.entries(debouncedFilters).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                if (key === 'tax_statuses' && Array.isArray(value)) {
                    value.forEach(v => cleanParams.append('tax_statuses', v));
                } else {
                    cleanParams.set(key, String(value));
                }
            }
        });
        
        setSearchParams(cleanParams, { replace: true });
        onFilterChange(debouncedFilters);
    }, [debouncedFilters, onFilterChange, setSearchParams]);

    const handleChange = (key: keyof AuctionFilterParams, value: any) => {
        const nextFilters = { ...filters, [key]: value || undefined };
        setFilters(nextFilters);
        // If it's a chip (tax_statuses), we update parent immediately for better responsiveness
        if (key === 'tax_statuses') {
            onFilterChange(nextFilters);
        }
    };

    const handleClear = () => {
        setFilters({});
    };

    return (
        <div className="flex flex-col gap-4 mb-6 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            {/* Quick Filters */}
            <div className="flex flex-col gap-4">
                {/* Auction Types Chip Selector */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    <button
                        onClick={() => handleChange('tax_statuses', undefined)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${
                            !filters.tax_statuses || filters.tax_statuses.length === 0
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                    >
                        All Types
                    </button>
                    {AUCTION_TYPES.map(type => {
                        const isSelected = filters.tax_statuses?.includes(type.value);
                        return (
                            <button
                                key={type.value}
                                onClick={() => {
                                    const current = filters.tax_statuses || [];
                                    const next = isSelected 
                                        ? current.filter(v => v !== type.value)
                                        : [...current, type.value];
                                    handleChange('tax_statuses', next.length > 0 ? next : undefined);
                                }}
                                className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${
                                    isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                }`}
                            >
                                {type.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    <TextField
                        label="Search Anywhere"
                    variant="outlined"
                    size="small"
                    value={filters.q || ''}
                    onChange={(e) => handleChange('q', e.target.value)}
                    placeholder="Search name, location, notes..."
                    className="bg-white dark:bg-slate-900 min-w-[280px]"
                    InputProps={{
                        startAdornment: <span className="material-symbols-outlined text-slate-400 mr-2 text-[20px]">search</span>
                    }}
                />

                <FormControl size="small" className="min-w-[150px] bg-white dark:bg-slate-900">
                    <InputLabel id="type-select-label">Auction Type</InputLabel>
                    <Select
                        labelId="type-select-label"
                        label="Auction Type"
                        value={filters.isPresencial === undefined ? '' : filters.isPresencial.toString()}
                        onChange={(e) => {
                            const val = e.target.value;
                            handleChange('isPresencial', val === '' ? undefined : val === 'true');
                        }}
                    >
                        <MenuItem value=""><em>All Types</em></MenuItem>
                        <MenuItem value="true">In-Person</MenuItem>
                        <MenuItem value="false">Online</MenuItem>
                    </Select>
                </FormControl>

                <Button
                    variant="text"
                    size="small"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-primary-600 dark:text-primary-400 font-semibold"
                >
                    {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </Button>


                <div className="ml-auto flex gap-2">
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleClear}
                        color="secondary"
                    >
                        Clear
                    </Button>
                </div>
            </div>
        </div>

            {/* Advanced Filters */}
            {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 mt-2 border-t border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-300">
                    <TextField
                        label="Specific Name"
                        variant="outlined"
                        size="small"
                        value={filters.name || ''}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Exact name match"
                        className="bg-white dark:bg-slate-900"
                    />
                    <TextField
                        label="State"
                        variant="outlined"
                        size="small"
                        value={filters.state || ''}
                        onChange={(e) => handleChange('state', e.target.value)}
                        placeholder="E.g. FL"
                        className="bg-white dark:bg-slate-900"
                        inputProps={{ maxLength: 2 }}
                    />
                    <TextField
                        label="County"
                        variant="outlined"
                        size="small"
                        value={filters.county || ''}
                        onChange={(e) => handleChange('county', e.target.value)}
                        placeholder="E.g. Miami-Dade"
                        className="bg-white dark:bg-slate-900"
                    />
                    <TextField
                        label="Start Date"
                        type="date"
                        size="small"
                        value={filters.startDate || ''}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="End Date"
                        type="date"
                        size="small"
                        value={filters.endDate || ''}
                        onChange={(e) => handleChange('endDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Min Parcels"
                        type="number"
                        size="small"
                        value={filters.minParcels || ''}
                        onChange={(e) => handleChange('minParcels', e.target.value)}
                    />
                    <TextField
                        label="Max Parcels"
                        type="number"
                        size="small"
                        value={filters.maxParcels || ''}
                        onChange={(e) => handleChange('maxParcels', e.target.value)}
                    />
                </div>
            )}
        </div>
    );
};

export default AuctionFilters;
