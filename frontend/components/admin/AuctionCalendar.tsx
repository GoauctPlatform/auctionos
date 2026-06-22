import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { AuctionService } from '../../services/auction.service';
import type { AuctionEvent } from '../../types';
import { AuctionWorkspaceModal } from './AuctionWorkspaceModal';
import AuctionList from './AuctionList';
import { Box, Dialog, DialogTitle, DialogContent, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';

interface AuctionCalendarProps {
    filters?: {
        startDate?: string;
        endDate?: string;
        name?: string;
        [key: string]: any;
    };
    onDateTypeSelect?: (date: string, type: string) => void;
    onSelectAuction?: (event: any) => void;
}

const AuctionCalendar: React.FC<AuctionCalendarProps> = ({ filters = { startDate: undefined }, onDateTypeSelect, onSelectAuction }) => {
    const [rawEvents, setRawEvents] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [groupedDialogOpen, setGroupedDialogOpen] = useState(false);
    const [groupedDateType, setGroupedDateType] = useState<{date: string, type: string} | null>(null);
    const navigate = useNavigate();

    // Favorites state and synchronization
    const [favorites, setFavorites] = useState<Set<number>>(new Set());

    // Load initial favorites from server
    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const favIds = await AuctionService.getFavorites();
                setFavorites(new Set(favIds));
            } catch (err) {
                console.error("Failed to load favorites for calendar", err);
            }
        };
        loadFavorites();
    }, []);

    useEffect(() => {
        const handleSync = (e: any) => {
            if (e.detail) {
                setFavorites(new Set(e.detail));
            } else {
                AuctionService.getFavorites().then(favIds => {
                    setFavorites(new Set(favIds));
                }).catch(() => {});
            }
        };
        window.addEventListener('auction-favorites-updated', handleSync);
        return () => window.removeEventListener('auction-favorites-updated', handleSync);
    }, []);

    // Use a stable string for effect dependency to prevent redundant fetches
    const filterKey = JSON.stringify(filters);

    useEffect(() => {
        AuctionService.getCalendarEvents(filters)
            .then(data => setRawEvents(data))
            .catch(err => console.error("Failed to load calendar", err));
    }, [filterKey]);

    // FullCalendar with timeZone="UTC" passes midnight-UTC dates.
    // We MUST use UTC methods here or we get an off-by-one day in non-UTC timezones.
    const getUTCDateString = (date: Date) => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Memoize dates that contain favorite auctions.
    // The calendar endpoint aliases id as "auction_id", so we check both fields.
    const favoriteDates = React.useMemo(() => {
        const dates = new Set<string>();
        rawEvents.forEach((item: any) => {
            const itemId = item.id ?? item.auction_id;
            const cleanDate = item.event_date ? item.event_date.split('T')[0] : '';
            if (cleanDate && favorites.has(Number(itemId))) {
                dates.add(cleanDate);
            }
        });
        return dates;
    }, [rawEvents, favorites]);

    // Memoize the heavy aggregation logic for smoother performance.
    // The calendar endpoint aliases id as "auction_id", so we check both fields.
    const processedEvents = React.useMemo(() => {
        const groups: Record<string, { date: string, type: string, auctionCount: number, propertyCount: number, hasFavorite: boolean }> = {};

        rawEvents.forEach((item: any) => {
            const itemId = item.id ?? item.auction_id;
            const taxStatus = item.tax_status || 'Other';
            const cleanDate = item.event_date ? item.event_date.split('T')[0] : '';
            if (!cleanDate) return;

            const groupKey = `${cleanDate}-${taxStatus}`;
            if (!groups[groupKey]) {
                groups[groupKey] = { date: cleanDate, type: taxStatus, auctionCount: 0, propertyCount: 0, hasFavorite: false };
            }
            groups[groupKey].auctionCount += 1;
            groups[groupKey].propertyCount += (item.property_count || 0);
            if (favorites.has(Number(itemId))) {
                groups[groupKey].hasFavorite = true;
            }
        });

        return Object.values(groups).map(g => ({
            title: `${g.type} (${g.auctionCount})`,
            start: g.date,
            allDay: true,
            // FullCalendar's official per-event color API — overrides eventColor prop correctly.
            backgroundColor: g.hasFavorite ? '#f59e0b' : '#3b82f6',
            borderColor:     g.hasFavorite ? '#d97706' : '#3b82f6',
            textColor: '#ffffff',
            extendedProps: {
                isGrouped: true,
                type: g.type,
                date: g.date,
                auctionCount: g.auctionCount,
                propertyCount: g.propertyCount,
                hasFavorite: g.hasFavorite
            }
        }));
    }, [rawEvents, favorites]);

    const handleEventClick = (info: any) => {
        const props = info.event.extendedProps;
        if (props.isGrouped) {
            setGroupedDateType({ date: props.date, type: props.type });
            setGroupedDialogOpen(true);
        } else {
            // For single non-grouped events (though we group them all now)
            const normalizedEvent = {
                id: info.event.id,
                title: info.event.title,
                start: info.event.startStr || info.event.start,
                extendedProps: props
            };
            if (onSelectAuction) {
                onSelectAuction(normalizedEvent);
            } else {
                setSelectedEvent(normalizedEvent);
            }
        }
    };

    const handleDateClick = (arg: any) => {
        setGroupedDateType({ date: arg.dateStr, type: '' });
        setGroupedDialogOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedEvent(null);
        if (onSelectAuction) onSelectAuction(null);
    };

    return (
        <Box sx={{ height: 600, bgcolor: 'background.paper', p: 2, borderRadius: 2 }}>
            <style>
                {`
                    .fc-col-header-cell-cushion {
                        color: #1e293b;
                        text-decoration: none;
                        font-weight: 700;
                    }
                    .fc-daygrid-day-number {
                        color: #475569;
                        text-decoration: none;
                        font-weight: 600;
                    }
                `}
            </style>
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
                initialView="dayGridMonth"
                initialDate={filters.startDate}
                timeZone="UTC"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,listWeek'
                }}
                buttonText={{
                    month: 'Month',
                    listWeek: 'Week'
                }}
                events={processedEvents}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                height="100%"
                eventColor="#3b82f6"
                eventDidMount={(arg) => {
                    // Reinforce amber color in case FullCalendar re-applies eventColor after mount
                    if (arg.event.extendedProps.hasFavorite) {
                        const el = arg.el as HTMLElement;
                        el.style.setProperty('background-color', '#f59e0b', 'important');
                        el.style.setProperty('border-color', '#d97706', 'important');
                        el.style.fontWeight = '900';
                        el.style.boxShadow = '0 2px 8px rgba(245,158,11,0.5)';
                    }
                }}
                dayCellDidMount={(arg) => {
                    // Use UTC date string to match item.event_date (which is also UTC)
                    const cleanDate = getUTCDateString(arg.date);
                    if (favoriteDates.has(cleanDate)) {
                        // outline renders OUTSIDE the element box and is never clipped by overflow:hidden
                        arg.el.style.outline = '2.5px solid #f59e0b';
                        arg.el.style.outlineOffset = '-2px';
                        arg.el.style.backgroundColor = 'rgba(251, 191, 36, 0.08)';
                    } else {
                        arg.el.style.outline = '';
                        arg.el.style.outlineOffset = '';
                        arg.el.style.backgroundColor = '';
                    }
                    if (arg.isPast) {
                        arg.el.style.opacity = '0.6';
                        arg.el.style.filter = 'grayscale(1)';
                    }
                }}
            />

            <AuctionWorkspaceModal
                isOpen={!!selectedEvent}
                onClose={handleCloseModal}
                eventData={selectedEvent}
            />

            <Dialog 
                open={groupedDialogOpen} 
                onClose={() => setGroupedDialogOpen(false)} 
                maxWidth="lg" 
                fullWidth
                sx={{ zIndex: 9999998 }}
                PaperProps={{ sx: { borderRadius: 3, minHeight: '600px' } }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
                    <Typography variant="h6" className="font-bold text-slate-800">
                        {groupedDateType ? `${groupedDateType.type} Auctions on ${new Date(groupedDateType.date + 'T00:00:00').toLocaleDateString()}` : 'Auctions'}
                    </Typography>
                    <IconButton onClick={() => setGroupedDialogOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers className="p-0 bg-slate-50">
                    {groupedDateType && (
                        <AuctionList 
                            filters={{ 
                                ...filters,
                                startDate: groupedDateType.date, 
                                endDate: groupedDateType.date, 
                                tax_status: groupedDateType.type
                            }} 
                            readOnly={true} 
                            hideFilterSelector={true}
                            onSelectAuction={(evt) => {
                                if (onSelectAuction) {
                                    onSelectAuction(evt);
                                } else {
                                    setSelectedEvent(evt);
                                }
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default AuctionCalendar;
