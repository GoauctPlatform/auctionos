import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AuctionList from './AuctionList';

interface ClientAuctionGroupListProps {
    date: string;
    type: string;
    filters: any;
    onClose: () => void;
}

export const ClientAuctionGroupList: React.FC<ClientAuctionGroupListProps> = ({ date, type, filters, onClose }) => {
    return (
        <div className="size-full flex flex-col bg-white dark:bg-slate-950 rounded-xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shrink-0">
                <div className="flex items-center gap-3">
                    <IconButton onClick={onClose} size="small" title="Back to Calendar" className="text-slate-500 hover:text-slate-800 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-lg">
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <div>
                        <Typography variant="h6" className="font-black text-slate-800 dark:text-white leading-tight">
                            {type} Auctions on {new Date(date + 'T00:00:00').toLocaleDateString()}
                        </Typography>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <IconButton onClick={onClose} size="small" title="Close" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                        <CloseIcon />
                    </IconButton>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4">
                <Box className="w-full bg-white dark:bg-slate-800 shadow-sm rounded-xl overflow-hidden h-full">
                    <AuctionList 
                        filters={{ 
                            ...filters,
                            startDate: date, 
                            endDate: date, 
                            tax_status: type
                        }} 
                        readOnly={true} 
                        hideFilterSelector={true}
                        onSelectAuction={(evt) => {
                            window.dispatchEvent(new CustomEvent('open-workbench-overlay', {
                                detail: {
                                    type: 'auction_details',
                                    title: `🔨 Auction: ${evt.title || 'Workspace'}`,
                                    data: { eventData: evt }
                                }
                            }));
                        }}
                    />
                </Box>
            </div>
        </div>
    );
};

export default ClientAuctionGroupList;
