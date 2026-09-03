import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef, GridSortModel, GridActionsCellItem } from '@mui/x-data-grid';
import { AuctionService } from '../../services/auction.service';
import { AuctionEvent } from '../../types';
import { Box, Typography, Button } from '@mui/material';
import { AuctionForm } from './AuctionForm';
import { AuctionWorkspaceModal } from './AuctionWorkspaceModal';



interface AuctionListProps {
    filters: any;
    readOnly?: boolean;
    hideFilterSelector?: boolean;
    onSelectAuction?: (event: any) => void;
}

const AuctionList: React.FC<AuctionListProps> = ({ filters, readOnly = false, hideFilterSelector = false, onSelectAuction }) => {
    const [rows, setRows] = useState<AuctionEvent[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Modal State
    const [formOpen, setFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<AuctionEvent | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingEvent, setViewingEvent] = useState<any | null>(null);

    // Pagination State
    const [rowCount, setRowCount] = useState<number>(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 });

    // Favorites & Filtering State
    const [favorites, setFavorites] = useState<Set<number>>(new Set());

    const [filterMode, setFilterMode] = useState<'all' | 'favorites'>(() => {
        if (hideFilterSelector) return 'all';
        const saved = localStorage.getItem('goauct_favorites_filter_active');
        if (saved) return saved as 'all' | 'favorites';
        return 'all'; // Default to all by default
    });

    const handleSetFilterMode = (mode: 'all' | 'favorites') => {
        setFilterMode(mode);
        localStorage.setItem('goauct_favorites_filter_active', mode);
    };

    useEffect(() => {
        if (hideFilterSelector) {
            setFilterMode('all');
        }
    }, [hideFilterSelector]);

    // Initial favorites load
    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const favIds = await AuctionService.getFavorites();
                setFavorites(new Set(favIds));
            } catch (err) {
                console.error('Failed to load favorites:', err);
            }
        };
        loadFavorites();
    }, []);

    // Synchronize favorites across component instances
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

    const toggleFavorite = async (id: number) => {
        const next = new Set(favorites);
        const isRemoving = next.has(id);
        if (isRemoving) {
            next.delete(id);
        } else {
            next.add(id);
        }
        
        // Optimistic UI update
        setFavorites(next);
        window.dispatchEvent(new CustomEvent('auction-favorites-updated', { detail: Array.from(next) }));

        try {
            if (isRemoving) {
                await AuctionService.removeFavorite(id);
            } else {
                await AuctionService.addFavorite(id);
            }
        } catch (err) {
            console.error('Failed to update favorite on server:', err);
            // Rollback on failure
            const rollback = new Set(favorites);
            setFavorites(rollback);
            window.dispatchEvent(new CustomEvent('auction-favorites-updated', { detail: Array.from(rollback) }));
        }
    };

    const fetchAuctions = async () => {
        setLoading(true);
        try {
            const skip = paginationModel.page * paginationModel.pageSize;
            const limit = paginationModel.pageSize;

            if (filterMode === 'favorites') {
                // Pass exact IDs to the backend — 100% reliable, no pagination limit issues.
                const favIds = Array.from(favorites);
                if (favIds.length === 0) {
                    setRows([]);
                    setRowCount(0);
                    return;
                }
                const { items, total } = await AuctionService.getAuctionEvents({ ids: favIds });
                setRows(items);
                setRowCount(total);
            } else {
                // Normal paginated mode with whatever filters the parent passes.
                const isSingleDayQuery = filters?.startDate && filters?.startDate === filters?.endDate;
                const params = { 
                    ...filters,
                    sort_by_date: true, 
                    limit, 
                    skip
                };
                const { items, total } = await AuctionService.getAuctionEvents(params);
                setRows(items);
                setRowCount(total);
            }
        } catch (error) {
            console.error('Failed to fetch auctions for list', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuctions();
    // favorites needs to be in deps so switching to favorites mode with an already-loaded set triggers a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, paginationModel, filterMode, favorites]);

    const handleEditClick = (event: AuctionEvent) => {
        setEditingEvent(event);
        setFormOpen(true);
    };

    const handleDeleteClick = async (id: number) => {
        if (!window.confirm("Are you sure you want to permanently delete this auction?")) return;
        setLoading(true);
        try {
            await AuctionService.deleteAuctionEvent(id);
            alert("Auction deleted successfully!");
            fetchAuctions();
        } catch (error: any) {
            alert(`Delete failed: ${error.message}`);
            setLoading(false);
        }
    };

    const handleCreateClick = () => {
        setEditingEvent(null);
        setFormOpen(true);
    };

    const handleViewClick = (row: AuctionEvent) => {
        const eventData = {
            id: row.id,
            title: row.name,
            start: row.auction_date ? new Date(row.auction_date).toISOString() : '',
            extendedProps: {
                location: row.location,
                notes: row.notes,
                linked_properties: '',
                statuses: '',
                property_count: row.parcels_count || 0,
                available_count: row.live_available_count || 0,
                register_link: row.register_link,
                list_link: row.list_link,
                tax_status: row.tax_status,
                state: row.state,
                county: row.county
            }
        };

        if (onSelectAuction) {
            onSelectAuction(eventData);
        } else {
            setViewingEvent(eventData);
            setViewModalOpen(true);
        }
    };

    const baseColumns: GridColDef[] = [
        { field: 'name', headerName: 'Name', width: 250, flex: 1 },
        {
            field: 'auction_date', headerName: 'Date', width: 120, type: 'date',
            valueFormatter: (params: any) => {
                const val = (params && typeof params === 'object' && 'value' in params) ? params.value : params;
                if (!val) return '';
                let dateStr = val;
                if (typeof val === 'string' && !val.includes('T')) {
                    dateStr = val + 'T00:00:00';
                }
                const date = new Date(dateStr);
                return date.toLocaleDateString();
            }
        },
        { field: 'time', headerName: 'Time', width: 100 },
        { field: 'state', headerName: 'State', width: 90 },
        { field: 'county', headerName: 'County', width: 130 },
        { field: 'location', headerName: 'Location', width: 150 },
        { field: 'tax_status', headerName: 'Tax Status', width: 150, type: 'singleSelect', valueOptions: ['Tax Sale', 'Over the Counter', 'Sealed Bid', 'Public Outcry', 'Tax Deed', 'Tax Lien', 'Foreclosure'] },
        { field: 'parcels_count', headerName: 'Parcels', type: 'number', width: 90 },
        { 
            field: 'live_available_count', 
            headerName: 'Available', 
            type: 'number', 
            width: 100,
            renderCell: (params: any) => (
                <Box sx={{ fontWeight: 'bold', color: params.value > 0 ? 'success.main' : 'text.secondary' }}>
                    {params.value || 0}
                </Box>
            )
        },
    ];

    const actionColumn: GridColDef[] = [
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ id, row }) => {
                return [
                    <GridActionsCellItem
                        key={`view-${id}`}
                        icon={<span className="material-symbols-outlined text-green-600">visibility</span>}
                        label="View Details"
                        onClick={() => handleViewClick(row as AuctionEvent)}
                        color="inherit"
                    />,
                    <GridActionsCellItem
                        key={`edit-${id}`}
                        icon={<span className="material-symbols-outlined text-blue-600">edit</span>}
                        label="Edit"
                        onClick={() => handleEditClick(row as AuctionEvent)}
                        color="inherit"
                    />,
                    <GridActionsCellItem
                        key={`delete-${id}`}
                        icon={<span className="material-symbols-outlined text-red-600">delete</span>}
                        label="Delete"
                        onClick={() => handleDeleteClick(id as number)}
                        color="inherit"
                    />,
                ];
            },
        },
    ];

    const clientActionColumn: GridColDef[] = [
        {
            field: 'view',
            type: 'actions',
            headerName: 'View',
            width: 80,
            cellClassName: 'actions',
            getActions: ({ row }) => {
                return [
                    <GridActionsCellItem
                        key={`view-${row.id}`}
                        icon={<span className="material-symbols-outlined text-green-600">visibility</span>}
                        label="View Details"
                        onClick={() => handleViewClick(row as AuctionEvent)}
                        color="inherit"
                    />
                ];
            },
        },
    ];

    const favoriteColumn: GridColDef = {
        field: 'favorite',
        headerName: '',
        width: 50,
        sortable: false,
        renderCell: (params: any) => {
            const id = params.row.id;
            const isFav = favorites.has(id);
            return (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(id);
                    }}
                    className={`p-1 flex items-center justify-center transition-colors ${
                        isFav ? 'text-amber-500 hover:text-amber-600' : 'text-slate-350 hover:text-slate-400 dark:text-slate-655 dark:hover:text-slate-500'
                    }`}
                    title={isFav ? "Remove from Favorites" : "Mark as Favorite"}
                >
                    <span className="material-symbols-outlined text-[20px]">
                        {isFav ? 'star' : 'star_border'}
                    </span>
                </button>
            );
        }
    };

    const displayColumns = React.useMemo(() => [
        favoriteColumn,
        ...(readOnly ? [...baseColumns, ...clientActionColumn] : [...baseColumns, ...actionColumn])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [favorites, readOnly]);

    return (
        <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
            <Box p={2} display="flex" justifyContent="space-between" alignItems="center" borderBottom="1px solid #e2e8f0" gap={2} flexWrap="wrap">
                <Typography variant="h6" className="text-slate-800 dark:text-white font-semibold whitespace-nowrap">
                    Auction Events
                </Typography>

                {/* Segmented Button Group */}
                {!hideFilterSelector && (
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                        <button
                            onClick={() => handleSetFilterMode('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                filterMode === 'all'
                                    ? 'bg-white dark:bg-slate-700 text-indigo-650 dark:text-white shadow-xs border border-slate-200/50 dark:border-slate-600/50'
                                    : 'text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            All Auctions
                        </button>
                        <button
                            onClick={() => handleSetFilterMode('favorites')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                filterMode === 'favorites'
                                    ? 'bg-white dark:bg-slate-700 text-amber-500 dark:text-amber-400 shadow-xs border border-slate-200/50 dark:border-slate-600/50'
                                    : 'text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            ★ Favorites Only
                        </button>
                    </div>
                )}

                {!readOnly && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<span className="material-symbols-outlined">add</span>}
                        onClick={handleCreateClick}
                        sx={{ textTransform: 'none', borderRadius: 2, px: 3, fontWeight: 'bold' }}
                    >
                        Add Auction
                    </Button>
                )}
            </Box>

            <Box sx={{ height: 600, width: '100%' }}>
                {rows.length === 0 && !loading ? (
                    <Box p={3} textAlign="center">
                        <Typography color="textSecondary">No auctions found matching the filters.</Typography>
                    </Box>
                ) : (
                    <DataGrid
                        rows={rows}
                        columns={displayColumns}
                        loading={loading}
                        rowCount={rowCount}
                        paginationMode="server"
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        initialState={{
                            sorting: { sortModel: [{ field: 'auction_date', sort: 'desc' }] }
                        }}
                        pageSizeOptions={[20, 50, 100]}
                        disableRowSelectionOnClick
                        onRowClick={(params) => handleViewClick(params.row as AuctionEvent)}
                        density="compact"
                        getRowClassName={(params) => {
                            const isFav = favorites.has(params.row.id);
                            return isFav ? '!bg-amber-50/40 dark:!bg-amber-950/20 border-l-4 border-l-amber-500' : '';
                        }}
                        sx={{
                            '& .MuiDataGrid-row': { cursor: 'pointer' },
                            '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(59, 130, 246, 0.04)' }
                        }}
                    />
                )}
            </Box>

            <AuctionForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                onSuccess={fetchAuctions}
                editingEvent={editingEvent}
            />

            <AuctionWorkspaceModal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                eventData={viewingEvent}
            />
        </Box>
    );
};

export default AuctionList;
