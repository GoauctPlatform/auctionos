import React, { useEffect, useState, useMemo } from 'react';
import { 
    Box, 
    Typography, 
    Accordion, 
    AccordionSummary, 
    AccordionDetails, 
    Grid, 
    Chip, 
    TextField, 
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Tooltip
} from '@mui/material';
import { 
    ExpandMore as ExpandMoreIcon, 
    Search as SearchIcon, 
    Gavel as GavelIcon, 
    Timer as TimerIcon, 
    TrendingUp as InterestIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';
import api from '../../services/api';

interface RedemptionEntry {
    state: string;
    auction: string;
    type: string;
    max_interest: string;
    redemption_months: number;
}

export const RedemptionIntelligenceBoard: React.FC = () => {
    const [data, setData] = useState<RedemptionEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedState, setSelectedState] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/properties/redemption-info');
                setData(res.data.results || []);
            } catch (err) {
                console.error('Failed to load global redemption intelligence:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const uniqueStates = useMemo(() => {
        const states = Array.from(new Set(data.map(d => d.state))).sort();
        return states;
    }, [data]);

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchesSearch = item.state.toLowerCase().includes(search.toLowerCase()) ||
                                item.auction.toLowerCase().includes(search.toLowerCase());
            const matchesState = selectedState === 'all' || item.state === selectedState;
            return matchesSearch && matchesState;
        });
    }, [data, search, selectedState]);

    if (loading && data.length === 0) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} />
        </Box>
    );

    return (
        <Box sx={{ mb: 4 }}>
            <Accordion defaultExpanded sx={{ 
                borderRadius: 3, 
                overflow: 'hidden', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                '&:before': { display: 'none' },
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider'
            }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                            p: 1, 
                            borderRadius: 2, 
                            bgcolor: 'primary.main', 
                            color: 'white', 
                            display: 'flex' 
                        }}>
                            <GavelIcon fontSize="small" />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                Legal Redemption Intelligence
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Quick reference for State interest rates and periods
                            </Typography>
                        </Box>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <Box sx={{ p: 2, bgcolor: 'slate.50', borderTop: '1px solid', borderColor: 'divider' }}>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={8}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Search by keywords (e.g. Upset, Adjudicated...)"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    sx={{ bgcolor: 'white', borderRadius: 2 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="state-select-label">Select State</InputLabel>
                                    <Select
                                        labelId="state-select-label"
                                        value={selectedState}
                                        label="Select State"
                                        onChange={(e) => setSelectedState(e.target.value)}
                                        sx={{ bgcolor: 'white', borderRadius: 2 }}
                                        startAdornment={
                                            <InputAdornment position="start">
                                                <FilterIcon fontSize="small" color="action" />
                                            </InputAdornment>
                                        }
                                    >
                                        <MenuItem value="all">All States</MenuItem>
                                        {uniqueStates.map(s => (
                                            <MenuItem key={s} value={s}>{s}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                        
                        <Grid container spacing={2} sx={{ maxHeight: '500px', overflowY: 'auto', p: 1 }}>
                            {filteredData.length === 0 ? (
                                <Grid item xs={12}>
                                    <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'white', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                                        <Typography color="text.secondary">No legal data found for this selection.</Typography>
                                    </Box>
                                </Grid>
                            ) : filteredData.map((item, idx) => (
                                <Grid item xs={12} md={6} lg={4} key={`${item.state}-${idx}`}>
                                    <Tooltip title={`Click to filter by ${item.state}`} placement="top">
                                        <Box 
                                            onClick={() => setSelectedState(item.state)}
                                            sx={{ 
                                                p: 2, 
                                                borderRadius: 2, 
                                                border: '1px solid',
                                                borderColor: selectedState === item.state ? 'primary.main' : 'divider',
                                                bgcolor: selectedState === item.state ? 'primary.50' : 'white',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                    bgcolor: 'primary.50'
                                                }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                    {item.state}
                                                </Typography>
                                                <Chip 
                                                    label={item.type} 
                                                    size="small" 
                                                    color={item.type === 'Deed' ? 'success' : 'error'} 
                                                    variant={selectedState === item.state ? 'filled' : 'outlined'}
                                                    sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: '20px' }}
                                                />
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, height: '32px', overflow: 'hidden', lineHeight: 1.2 }}>
                                                {item.auction}
                                            </Typography>
                                            
                                            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <InterestIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                                        {item.max_interest}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <TimerIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                                        {item.redemption_months > 0 ? `${item.redemption_months}mo` : '0mo (Final)'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Tooltip>
                                </Grid>
                            ))}
                        </Grid>
                        
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block', fontStyle: 'italic', px: 1, textAlign: 'center' }}>
                            * Disclaimer: Rules are general state guidelines. Verification with specific county officials is required.
                        </Typography>
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};
