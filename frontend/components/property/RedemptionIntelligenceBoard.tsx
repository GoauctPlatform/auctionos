import React, { useEffect, useState, useMemo } from 'react';
import { 
    Box, 
    Typography, 
    Accordion, 
    AccordionSummary, 
    AccordionDetails, 
    Grid, 
    Chip, 
    FormControl, 
    InputLabel, 
    Select, 
    MenuItem, 
    CircularProgress, 
    Divider,
    Paper
} from '@mui/material';
import { 
    ExpandMore as ExpandMoreIcon, 
    Gavel as GavelIcon, 
    Timer as TimerIcon, 
    TrendingUp as InterestIcon,
    FilterList as FilterIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import api from '../../services/api';

interface RedemptionEntry {
    state: string;
    auction?: string;
    type?: string;
    max_interest?: string;
    redemption_months?: string;
    description?: string;
}

export const RedemptionIntelligenceBoard: React.FC = () => {
    const [data, setData] = useState<RedemptionEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedState, setSelectedState] = useState<string>('');

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
        const states = Array.from(new Set(data.map(d => d.state).filter(Boolean))).sort();
        return states;
    }, [data]);

    const stateDescription = useMemo(() => {
        if (!selectedState || selectedState === 'all') return null;
        const entry = data.find(d => d.state === selectedState && d.description);
        return entry ? entry.description : null;
    }, [data, selectedState]);

    const filteredRules = useMemo(() => {
        if (!selectedState || selectedState === 'all') return []; // Start empty until state is selected
        return data.filter(item => item.state === selectedState && item.auction);
    }, [data, selectedState]);

    if (loading && data.length === 0) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} />
        </Box>
    );

    return (
        <Box sx={{ mb: 4 }} className="animate-in fade-in slide-in-from-top-4 duration-700">
            <Accordion 
                defaultExpanded 
                className="glass-card"
                sx={{ 
                    borderRadius: '16px !important', 
                    overflow: 'hidden', 
                    '&:before': { display: 'none' },
                    background: 'transparent',
                    boxShadow: 'none'
                }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                            p: 1, 
                            borderRadius: '12px', 
                            background: 'linear-gradient(135deg, var(--brand-blue) 0%, #00c6ff 100%)', 
                            color: 'white', 
                            display: 'flex',
                            boxShadow: '0 4px 12px rgba(10, 132, 255, 0.3)'
                        }}>
                            <GavelIcon fontSize="small" />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }} className="text-slate-800 dark:text-white">
                                Legal Redemption Intelligence
                            </Typography>
                            <Typography variant="caption" className="text-slate-500 dark:text-slate-400">
                                Official rules for State interest rates and periods
                            </Typography>
                        </Box>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }} className="bg-white/40 dark:bg-slate-900/20">
                        <Box sx={{ mb: 4, maxWidth: '450px' }}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="state-select-label" sx={{ fontWeight: 500 }}>Choose a State to View Rules</InputLabel>
                                <Select
                                    labelId="state-select-label"
                                    value={selectedState}
                                    displayEmpty
                                    label="Choose a State to View Rules"
                                    onChange={(e) => setSelectedState(e.target.value)}
                                    className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md"
                                    sx={{ borderRadius: '12px' }}
                                    startAdornment={<FilterIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />}
                                >
                                    <MenuItem value="" disabled>Select a State...</MenuItem>
                                    {uniqueStates.map(s => (
                                        <MenuItem key={s} value={s}>{s}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {stateDescription && (
                            <Paper 
                                elevation={0}
                                className="glass-card"
                                sx={{ 
                                    p: 2.5, 
                                    mb: 4, 
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.05) 0%, rgba(18, 179, 182, 0.05) 100%)',
                                    border: '1px solid',
                                    borderColor: 'primary.100'
                                }}
                            >
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Box sx={{ color: 'primary.main', mt: 0.5 }}>
                                        <InfoIcon fontSize="small" />
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                            {selectedState} Legal Overview
                                        </Typography>
                                        <Typography variant="body2" className="text-slate-600 dark:text-slate-300" sx={{ lineHeight: 1.6, fontSize: '0.9rem' }}>
                                            {stateDescription}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        )}
                        
                        <Divider sx={{ mb: 4, opacity: 0.5 }} />

                        <Grid container spacing={3} sx={{ maxHeight: '600px', overflowY: 'auto', p: 0.5 }}>
                            {filteredRules.map((item, idx) => (
                                <Grid item xs={12} md={6} lg={4} key={`${item.state}-${idx}`}>
                                    <Box 
                                        className="glass-card hover:border-primary-400/50 transition-all duration-300"
                                        sx={{ 
                                            p: 2.5, 
                                            borderRadius: '16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1.5,
                                            height: '100%',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)'
                                            }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} className="text-slate-800 dark:text-white">
                                                {selectedState === 'all' ? item.state : item.auction}
                                            </Typography>
                                            <Chip 
                                                label={item.type} 
                                                size="small" 
                                                sx={{ 
                                                    fontWeight: 800, 
                                                    fontSize: '0.6rem', 
                                                    height: '20px',
                                                    borderRadius: '6px',
                                                    bgcolor: item.type === 'Deed' ? 'success.50' : (item.type === 'Lien' ? 'error.50' : 'secondary.50'),
                                                    color: item.type === 'Deed' ? 'success.main' : (item.type === 'Lien' ? 'error.main' : 'secondary.main'),
                                                    border: 'none'
                                                }}
                                            />
                                        </Box>
                                        
                                        {selectedState === 'all' && (
                                            <Typography variant="caption" className="text-slate-500">
                                                {item.auction}
                                            </Typography>
                                        )}
                                        
                                        <Box sx={{ mt: 'auto', pt: 1.5, display: 'flex', gap: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <InterestIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 600 }}>Interest</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                                        {item.max_interest !== '-' ? item.max_interest : '0%'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <TimerIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 600 }}>Period</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                                        {item.redemption_months !== '0' ? `${item.redemption_months} mo` : 'Final'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                        
                        <Typography variant="caption" sx={{ mt: 4, display: 'block', fontStyle: 'italic', px: 1, textAlign: 'center', opacity: 0.6 }}>
                            * Disclaimer: Rules are general state guidelines. Verification with specific county officials is required.
                        </Typography>
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};
