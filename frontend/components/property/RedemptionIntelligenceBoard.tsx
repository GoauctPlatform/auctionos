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
                                Official rules for State interest rates and periods
                            </Typography>
                        </Box>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <Box sx={{ p: 2, bgcolor: 'slate.50', borderTop: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ mb: 3, maxWidth: '400px' }}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="state-select-label">Choose a State to View Rules</InputLabel>
                                <Select
                                    labelId="state-select-label"
                                    value={selectedState}
                                    displayEmpty
                                    label="Choose a State to View Rules"
                                    onChange={(e) => setSelectedState(e.target.value)}
                                    sx={{ bgcolor: 'white', borderRadius: 2 }}
                                    startAdornment={<FilterIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />}
                                >
                                    <MenuItem value="" disabled>Select a State...</MenuItem>
                                    {uniqueStates.map(s => (
                                        <MenuItem key={s} value={s}>{s}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {stateDescription && (
                            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'primary.50', borderColor: 'primary.100', borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                    <InfoIcon color="primary" fontSize="small" sx={{ mt: 0.3 }} />
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 0.5 }}>
                                            {selectedState} Legal Overview
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                                            {stateDescription}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        )}
                        
                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={2} sx={{ maxHeight: '500px', overflowY: 'auto', p: 1 }}>
                            {filteredRules.map((item, idx) => (
                                <Grid item xs={12} md={6} lg={4} key={`${item.state}-${idx}`}>
                                    <Box sx={{ 
                                        p: 2, 
                                        borderRadius: 2, 
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'white',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                        }
                                    }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                {selectedState === 'all' ? item.state : item.auction}
                                            </Typography>
                                            <Chip 
                                                label={item.type} 
                                                size="small" 
                                                color={item.type === 'Deed' ? 'success' : (item.type === 'Lien' ? 'error' : 'secondary')} 
                                                variant="outlined"
                                                sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: '20px' }}
                                            />
                                        </Box>
                                        
                                        {selectedState === 'all' && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                                {item.auction}
                                            </Typography>
                                        )}
                                        
                                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <InterestIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                                    {item.max_interest !== '-' ? `Max Interest: ${item.max_interest}` : 'No Interest'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <TimerIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                                    {item.redemption_months !== '0' ? `Redemption: ${item.redemption_months} mo` : 'Final Sale (0 mo)'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
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
