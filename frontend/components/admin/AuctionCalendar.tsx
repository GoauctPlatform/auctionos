import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { AuctionService } from '../../services/auction.service';
import type { AuctionEvent } from '../../types';
import { AuctionDetailsModal } from './AuctionDetailsModal';
import AuctionList from './AuctionList';
import { Dialog, DialogTitle, DialogContent, Typography, IconButton } from '@mui/material';
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
}

const AuctionCalendar: React.FC<AuctionCalendarProps> = ({ filters = { startDate: undefined }, onDateTypeSelect }) => {
    const [rawEvents, setRawEvents] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [groupedDialogOpen, setGroupedDialogOpen] = useState(false);
    const [groupedDateType, setGroupedDateType] = useState<{date: string, type: string} | null>(null);
    const navigate = useNavigate();

    // Favorites state and synchronization
    const [favorites, setFavorites] = useState<Set<number>>(new Set());

    useEffect(() => {
        const favs = localStorage.getItem('goauct_fav_auctions');
        if (favs) {
            try {
                setFavorites(new Set(JSON.parse(favs)));
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        const handleSync = (e: any) => {
            if (e.detail) {
                setFavorites(new Set(e.detail));
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

    // Memoize the heavy aggregation logic for smoother performance
    const processedEvents = React.useMemo(() => {
        const groups: Record<string, { date: string, type: string, auctionCount: number, propertyCount: number, hasFavorite: boolean }> = {};

        rawEvents.forEach((item: any) => {
            const taxStatus = item.tax_status || 'Other';
            const cleanDate = item.event_date ? item.event_date.split('T')[0] : '';
            if (!cleanDate) return;

            const groupKey = `${cleanDate}-${taxStatus}`;
            if (!groups[groupKey]) {
                groups[groupKey] = { date: cleanDate, type: taxStatus, auctionCount: 0, propertyCount: 0, hasFavorite: false };
            }
            groups[groupKey].auctionCount += 1;
            groups[groupKey].propertyCount += (item.property_count || 0);
            if (favorites.has(item.id)) {
                groups[groupKey].hasFavorite = true;
            }
        });

        return Object.values(groups).map(g => ({
            title: `${g.type} (${g.auctionCount})`,
            start: g.date,
            allDay: true,
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
            setSelectedEvent(normalizedEvent);
        }
    };

    const handleDateClick = (arg: any) => {
        if (onDateTypeSelect) {
            onDateTypeSelect(arg.dateStr, ''); 
        } else {
            const params = new URLSearchParams(window.location.search);
            params.set('startDate', arg.dateStr);
            params.set('endDate', arg.dateStr);
            params.delete('q');
            window.location.search = '?' + params.toString();
        }
    };

    const handleCloseModal = () => {
        setSelectedEvent(null);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm h-[600px] relative">
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
                eventClassNames={(arg) => {
                    const hasFavorite = arg.event.extendedProps.hasFavorite;
                    if (hasFavorite) {
                        return [
                            '!border-2', 
                            '!border-amber-500', 
                            'scale-[1.03]', 
                            'shadow-md', 
                            '!bg-amber-50', 
                            'dark:!bg-amber-950/40', 
                            '!text-amber-800', 
                            'dark:!text-amber-200', 
                            'font-black'
                        ];
                    }
                    return [];
                }}
                dayCellClassNames={(arg) => {
                    if (arg.isPast) {
                        return ['bg-slate-100', 'dark:bg-slate-800', 'opacity-60', 'grayscale'];
                    }
                    return [];
                }}
            />

            <AuctionDetailsModal
                open={!!selectedEvent}
                onClose={handleCloseModal}
                eventData={selectedEvent}
            />

            <Dialog 
                open={groupedDialogOpen} 
                onClose={() => setGroupedDialogOpen(false)} 
                maxWidth="lg" 
                fullWidth
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
                                startDate: groupedDateType.date, 
                                endDate: groupedDateType.date, 
                                tax_status: groupedDateType.type
                            }} 
                            readOnly={true} 
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AuctionCalendar;
