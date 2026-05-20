import React, { useState, useEffect } from 'react';
import { TextField, Select, MenuItem, Button, FormControl, InputLabel, Divider, Checkbox, FormControlLabel, Tooltip, Autocomplete, CircularProgress } from '@mui/material';
import { useDebounce } from 'use-debounce';
import SearchIcon from '@mui/icons-material/Search';
import { PropertyService } from '../../services/property.service';
import { useNavigate } from 'react-router-dom';

export interface PropertyFilterParams {
    county?: string;
    state?: string;
    keyword?: string;
    min_score?: number;

    // Optional Filters
    auction_name?: string;
    inventory?: string;
    min_improvements?: number;
    max_improvements?: number;
    availability?: string;
    min_county_appraisal?: number;
    max_county_appraisal?: number;
    min_amount_due?: number;
    max_amount_due?: number;
    min_acreage?: number;
    max_acreage?: number;
    occupancy?: string;
    owner_location?: string;

    // Advanced Filters
    added_since?: string;
    is_unavailable?: boolean;
    located_within?: string;
    max_results?: number;
    property_category?: string;
    property_type?: string;
    tax_year?: number;
}

interface PropertyFiltersProps {
    onFilterChange: (filters: PropertyFilterParams) => void;
    readOnly?: boolean;
    initialFilters?: PropertyFilterParams;
}

const PropertyFilters: React.FC<PropertyFiltersProps> = ({ onFilterChange, readOnly = false, initialFilters }) => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState<PropertyFilterParams>(initialFilters || {});
    const [showFilters, setShowFilters] = useState(false);
    const [debouncedFilters] = useDebounce(filters, 500);

    const isInternalUpdate = React.useRef(false);

    // Sync external initialFilters changes only if they differ
    useEffect(() => {
        if (initialFilters && Object.keys(initialFilters).length > 0) {
            // Check if values are actually different to prevent unnecessary updates
            const hasChanged = JSON.stringify(filters) !== JSON.stringify(initialFilters);
            if (hasChanged) {
                isInternalUpdate.current = true;
                setFilters(initialFilters);
            }
        }
    }, [initialFilters]);

    // Autocomplete state
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState(filters.keyword || '');

    useEffect(() => {
        let active = true;
        if (inputValue === '') {
            setOptions(open ? [] : options);
            return undefined;
        }

        setLoading(true);
        const timeout = setTimeout(async () => {
            try {
                // Fetch up to 10 predictive search options
                const res: any = await PropertyService.getProperties({ keyword: inputValue, limit: 10 });
                if (active) {
                    setOptions(res.items || res || []);
                }
            } catch (e) {
                console.error("Autocomplete fetch error", e);
            } finally {
                setLoading(false);
            }
        }, 400); // 400ms debounce on API call

        return () => {
            active = false;
            clearTimeout(timeout);
        };
    }, [inputValue]);

    useEffect(() => {
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }
        onFilterChange(debouncedFilters);
    }, [debouncedFilters, onFilterChange]);

    const handleChange = (key: keyof PropertyFilterParams, value: any) => {
        isInternalUpdate.current = false;
        setFilters(prev => ({ ...prev, [key]: value || undefined }));
    };

    const handleClear = () => {
        isInternalUpdate.current = false;
        setFilters({});
        setInputValue('');
    };

    return (
        <div className="flex flex-col gap-4 mb-6 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 w-full transition-all dark:[&_input]:text-white dark:[&_label]:text-slate-400 dark:[&_.MuiSelect-select]:text-white dark:[&_fieldset]:border-slate-600">
            {/* Primary Search Row */}
            <div className="flex flex-wrap gap-4 items-center w-full">
                <Autocomplete
                    freeSolo
                    id="keyword-search-autocomplete"
                    sx={{ minWidth: 250, flexGrow: 1 }}
                    open={open}
                    onOpen={() => setOpen(true)}
                    onClose={() => setOpen(false)}
                    inputValue={inputValue}
                    onInputChange={(event, newInputValue) => {
                        setInputValue(newInputValue);
                        handleChange('keyword', newInputValue);
                    }}
                    onChange={(event, newValue: any) => {
                        if (typeof newValue === 'string') {
                            handleChange('keyword', newValue);
                        } else if (newValue && newValue.parcel_id) {
                            navigate(readOnly ? `/client/properties/${newValue.parcel_id}` : `/admin/properties/${newValue.parcel_id}`);
                        }
                    }}
                    options={options}
                    getOptionLabel={(option: any) => typeof option === 'string' ? option : `${option.parcel_id || 'Unknown'} - ${option.address || option.county || ''}`}
                    renderOption={(props, option: any) => (
                        <li {...props} key={option.parcel_id}>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm">{option.parcel_id}</span>
                                <span className="text-xs text-slate-500">{option.address} • {option.county} County</span>
                            </div>
                        </li>
                    )}
                    filterOptions={(x) => x} // Disable built-in filtering, server-side taking over
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Keyword Search"
                            variant="outlined"
                            size="small"
                            placeholder="Parcel ID, Zip, Address..."
                            className="bg-white dark:bg-slate-900"
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                    <React.Fragment>
                                        <SearchIcon className="text-slate-400 ml-2" fontSize="small" />
                                        {params.InputProps.startAdornment}
                                    </React.Fragment>
                                ),
                                endAdornment: (
                                    <React.Fragment>
                                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </React.Fragment>
                                ),
                            }}
                        />
                    )}
                />
                <TextField
                    label="County"
                    variant="outlined"
                    size="small"
                    value={filters.county || ''}
                    onChange={(e) => handleChange('county', e.target.value)}
                    className="bg-white dark:bg-slate-900 w-[150px]"
                />
                <TextField
                    label="State"
                    variant="outlined"
                    size="small"
                    value={filters.state || ''}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="bg-white dark:bg-slate-900 w-[150px]"
                />

                <Button
                    variant={showFilters ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setShowFilters(!showFilters)}
                    className="ml-auto"
                >
                    {showFilters ? 'Hide Filters' : 'Refine Filters'}
                </Button>

                <Button
                    variant="text"
                    size="small"
                    onClick={handleClear}
                    color="secondary"
                >
                    Clear All
                </Button>
            </div>

            {/* Expanded Filters Section */}
            {showFilters && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <Divider className="my-6" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Optional Filters */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Optional Filters</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Availability</InputLabel>
                                    <Select
                                        label="Availability"
                                        value={filters.availability || ''}
                                        onChange={(e) => handleChange('availability', e.target.value)}
                                    >
                                        <MenuItem value=""><em>Any</em></MenuItem>
                                        <MenuItem value="available">Available</MenuItem>
                                        <MenuItem value="unavailable">Not Available</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl size="small" fullWidth>
                                    <InputLabel>Occupancy</InputLabel>
                                    <Select
                                        label="Occupancy"
                                        value={filters.occupancy || ''}
                                        onChange={(e) => handleChange('occupancy', e.target.value)}
                                    >
                                        <MenuItem value=""><em>Any</em></MenuItem>
                                        <MenuItem value="Occupied">Occupied</MenuItem>
                                        <MenuItem value="Vacant">Vacant</MenuItem>
                                    </Select>
                                </FormControl>

                                <FormControl size="small" fullWidth>
                                    <InputLabel>Parcel Type</InputLabel>
                                    <Select
                                        label="Parcel Type"
                                        value={filters.property_type || ''}
                                        onChange={(e) => handleChange('property_type', e.target.value)}
                                    >
                                        <MenuItem value=""><em>Any</em></MenuItem>
                                        <MenuItem value="Land & Structures">Land &amp; Structures</MenuItem>
                                        <MenuItem value="Land Only">Land Only</MenuItem>
                                        <MenuItem value="Improvements Only">Improvements Only</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    label="Owner Location"
                                    size="small"
                                    value={filters.owner_location || ''}
                                    onChange={(e) => handleChange('owner_location', e.target.value)}
                                    className="col-span-2"
                                    placeholder="Search owner address..."
                                />

                                <div className="col-span-2 flex gap-2">
                                    <TextField label="Min Opening Bid ($)" type="number" size="small" fullWidth value={filters.min_amount_due || ''} onChange={(e) => handleChange('min_amount_due', e.target.value)} />
                                    <TextField label="Max Opening Bid ($)" type="number" size="small" fullWidth value={filters.max_amount_due || ''} onChange={(e) => handleChange('max_amount_due', e.target.value)} />
                                </div>

                                <div className="col-span-2 flex gap-2">
                                    <TextField label="Min County Appr ($)" type="number" size="small" fullWidth value={filters.min_county_appraisal || ''} onChange={(e) => handleChange('min_county_appraisal', e.target.value)} />
                                    <TextField label="Max County Appr ($)" type="number" size="small" fullWidth value={filters.max_county_appraisal || ''} onChange={(e) => handleChange('max_county_appraisal', e.target.value)} />
                                </div>

                                <div className="col-span-2 flex gap-2">
                                    <TextField label="Min Acreage" type="number" size="small" fullWidth value={filters.min_acreage || ''} onChange={(e) => handleChange('min_acreage', e.target.value)} />
                                    <TextField label="Max Acreage" type="number" size="small" fullWidth value={filters.max_acreage || ''} onChange={(e) => handleChange('max_acreage', e.target.value)} />
                                </div>

                                <div className="col-span-2 flex gap-2">
                                    <TextField label="Min Improvements ($)" type="number" size="small" fullWidth value={filters.min_improvements || ''} onChange={(e) => handleChange('min_improvements', e.target.value)} />
                                    <TextField label="Max Improvements ($)" type="number" size="small" fullWidth value={filters.max_improvements || ''} onChange={(e) => handleChange('max_improvements', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Advanced Filters */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Advanced Filters</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormControl size="small" fullWidth>
                                    <InputLabel>Inventory Status</InputLabel>
                                    <Select
                                        label="Inventory Status"
                                        value={filters.inventory || ''}
                                        onChange={(e) => handleChange('inventory', e.target.value)}
                                    >
                                        <MenuItem value=""><em>Any</em></MenuItem>
                                        <MenuItem value="State Inventory">State Inventory</MenuItem>
                                        <MenuItem value="OTC">OTC (Over the Counter)</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField
                                    label="Auction Name"
                                    size="small"
                                    fullWidth
                                    value={filters.auction_name || ''}
                                    onChange={(e) => handleChange('auction_name', e.target.value)}
                                />

                                {/* 
                                    TODO: Re-enable once backend API supports these filters
                                    <TextField label="Added Since (Date)" ... />
                                    <TextField label="Located Within (Miles)" ... /> 
                                */}

                                <FormControlLabel
                                    className="col-span-2"
                                    control={
                                        <Checkbox
                                            checked={filters.is_unavailable || false}
                                            onChange={(e) => handleChange('is_unavailable', e.target.checked)}
                                        />
                                    }
                                    label="Show Unavailable Properties Only"
                                />

                                <FormControl size="small" fullWidth>
                                    <InputLabel>Category</InputLabel>
                                    <Select label="Category" value={filters.property_category || ''} onChange={(e) => handleChange('property_category', e.target.value)}>
                                        <MenuItem value=""><em>Any</em></MenuItem>
                                        <MenuItem value="Tax Lien">Tax Lien</MenuItem>
                                        <MenuItem value="Tax Deed">Tax Deed</MenuItem>
                                        <MenuItem value="Foreclosure">Foreclosure</MenuItem>
                                        <MenuItem value="Cert">Certificate</MenuItem>
                                        <MenuItem value="Quit Claim">Quit Claim</MenuItem>
                                    </Select>
                                </FormControl>

                                <TextField label="Tax Year" type="number" size="small" fullWidth value={filters.tax_year || ''} onChange={(e) => handleChange('tax_year', e.target.value)} />

                                <FormControl size="small" fullWidth className="col-span-2">
                                    <InputLabel>Min Grade</InputLabel>
                                    <Select
                                        label="Min Grade"
                                        value={filters.min_score !== undefined ? String(filters.min_score) : ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            handleChange('min_score', val !== '' ? Number(val) : undefined);
                                        }}
                                    >
                                        <MenuItem value=""><em>Any Grade</em></MenuItem>
                                        <MenuItem value="90">A+ (≥ 90%)</MenuItem>
                                        <MenuItem value="80">A (≥ 80%)</MenuItem>
                                        <MenuItem value="70">B (≥ 70%)</MenuItem>
                                        <MenuItem value="60">C (≥ 60%)</MenuItem>
                                        <MenuItem value="50">D (≥ 50%)</MenuItem>
                                        <MenuItem value="0">F (All)</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyFilters;

