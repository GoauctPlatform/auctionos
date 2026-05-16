import React, { useEffect, useState } from 'react';
import { 
    Box, 
    Typography, 
    Accordion, 
    AccordionSummary, 
    AccordionDetails, 
    Grid, 
    Chip, 
    TextField, 
    InputAdornment 
} from '@mui/material';
import { 
    ExpandMore as ExpandMoreIcon, 
    Search as SearchIcon, 
    Gavel as GavelIcon, 
    Timer as TimerIcon, 
    TrendingUp as InterestIcon 
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetching without state parameter returns full database
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

    const filteredData = data.filter(item => 
        item.state.toLowerCase().includes(search.toLowerCase()) ||
        item.auction.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return null;

    return (
        <Box sx={{ mb: 4 }}>
            <Accordion sx={{ 
                borderRadius: 3, 
                overflow: 'hidden', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                '&:before': { display: 'none' },
                bgcolor: 'background.paper'
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
                    <Box sx={{ p: 2, bgcolor: 'slate.50' }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by state (e.g. Florida, Texas...)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{ mb: 2, bgcolor: 'white', borderRadius: 2 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        
                        <Grid container spacing={2} sx={{ maxHeight: '400px', overflowY: 'auto', p: 1 }}>
                            {filteredData.map((item, idx) => (
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
                                                {item.state}
                                            </Typography>
                                            <Chip 
                                                label={item.type} 
                                                size="small" 
                                                color={item.type === 'Deed' ? 'success' : 'error'} 
                                                variant="outlined"
                                                sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: '20px' }}
                                            />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, height: '32px', overflow: 'hidden' }}>
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
                                </Grid>
                            ))}
                        </Grid>
                        
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', fontStyle: 'italic', px: 1 }}>
                            * Disclaimer: Rules are general state guidelines. Always verify with specific county officials.
                        </Typography>
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};
