import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef, GridActionsCellItem, GridFilterModel } from '@mui/x-data-grid';
import { AdminService } from '../../services/admin.service';
import { Box, Typography, Button, Dialog, DialogContent, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PropertyForm from './PropertyForm';
import AvailabilityHistoryDashboard from './AvailabilityHistoryDashboard';
import { calculateDealScore } from '../../intelligence/scoringEngine';

interface PropertyListProps {
    filters?: any;
    readOnly?: boolean;
    onCreateCustom?: () => void;
}

const PropertyList: React.FC<PropertyListProps> = ({ filters, readOnly = false, onCreateCustom }) => {
    const navigate = useNavigate();
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editRow, setEditRow] = useState<any | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 50,
    });
    const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
    const [sortModel, setSortModel] = useState<any[]>([{ field: 'auction_date', sort: 'asc' }]);

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const skip = paginationModel.page * paginationModel.pageSize;
            const limit = paginationModel.pageSize;

            const params: any = { ...filters, limit, skip };
            
            if (sortModel.length > 0) {
                params.sort_field = sortModel[0].field;
                params.sort_order = sortModel[0].sort;
            }

            // Apply DataGrid server-side column filters
            filterModel.items.forEach(item => {
                if (item.value === undefined || item.value === null || item.value === '') return;

                const f = item.field;
                const v = item.value;
                const op = item.operator;

                if (f === 'availability_status') params.availability = v;
                else if (f === 'state_code') params.state = v;
                else if (f === 'owner_address') params.owner_location = v;
                else if (f === 'parcel_id' || f === 'address') params.keyword = params.keyword ? `${params.keyword} ${v}` : v;
                else if (['amount_due', 'assessed_value', 'improvement_value', 'lot_acres'].includes(f)) {
                    const prefixMap: Record<string, string> = {
                        'amount_due': 'amount_due',
                        'assessed_value': 'county_appraisal',
                        'improvement_value': 'improvements',
                        'lot_acres': 'acreage'
                    };
                    const p = prefixMap[f];
                    if (op === '>' || op === '>=' || op === '!=') params[`min_${p}`] = v;
                    else if (op === '<' || op === '<=') params[`max_${p}`] = v;
                    else {
                        params[`min_${p}`] = v;
                        params[`max_${p}`] = v; // Exact match
                    }
                } else if (f === 'tax_year' || f === 'county' || f === 'property_type' || f === 'auction_name' || f === 'occupancy') {
                    params[f] = v;
                }
            });

            const { items, total } = await AdminService.listProperties(params);

            // Map the data to have an `id` field required by DataGrid
            const mappedData = items.map((item: any) => ({
                ...item,
                id: item.parcel_id
            }));

            setRows(mappedData);
            setRowCount(total);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, [filters, paginationModel, filterModel, sortModel]);

    const handleEditClick = (row: any) => {
        setEditRow(row);
    };

    const handleDeleteClick = async (parcelId: string) => {
        if (window.confirm('Are you sure you want to delete this property (Parcel ID: ' + parcelId + ')? This action cannot be undone.')) {
            try {
                await AdminService.deleteProperty(parcelId);
                fetchProperties();
            } catch (err: any) {
                alert('Failed to delete property: ' + err.message);
            }
        }
    };

    const columns: GridColDef[] = [
        {
            field: 'deal_grade',
            headerName: 'Grade',
            width: 90,
            renderCell: (params) => {
                // Prefer persisted backend score, fall back to local engine
                const backendRating = params.row.deal_rating;
                const backendScore = params.row.deal_score;
                const local = calculateDealScore(params.row);
                const rating = backendRating || local.rating;
                const score = backendScore !== null && backendScore !== undefined ? Math.round(backendScore) : local.score;
                const colors: Record<string, string> = {
                    'A+': 'bg-emerald-600 text-white',
                    'A': 'bg-emerald-500 text-white',
                    'B': 'bg-blue-500 text-white',
                    'C': 'bg-amber-500 text-white',
                    'D': 'bg-orange-500 text-white',
                    'F': 'bg-red-500 text-white',
                };
                return (
                    <div className="flex items-center gap-1">
                        <div className={`px-2 py-0.5 rounded font-black text-[10px] ${colors[rating] || 'bg-slate-400 text-white'}`}>
                            {rating}
                        </div>
                        <span className="text-[10px] text-slate-400">{score}%</span>
                    </div>
                );
            }
        },
        { field: 'parcel_id', headerName: 'Parcel Number', width: 140 },
        { field: 'cs_number', headerName: 'C/S#', width: 90, valueGetter: (value, row) => row.cs_number || row.account_number || '-' },
        { field: 'account_number', headerName: 'PIN', width: 140, valueGetter: (value, row) => row.parcel_id || row.account_number || row.pin_ppin || '-' },
        { field: 'owner_address', headerName: 'Name', width: 160 },
        { field: 'county', headerName: 'County', width: 130 },
        { field: 'state_code', headerName: 'State', width: 70 },
        {
            field: 'availability_status', headerName: 'Status', width: 110,
            type: 'singleSelect',
            valueOptions: ['available', 'unavailable'],
            renderCell: (params) => {
                const status = (params.value || 'unknown').toLowerCase();
                const isAvail = status === 'available';
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isAvail ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isAvail ? 'AVAILABLE' : 'UNAVAILABLE'}
                    </span>
                );
            }
        },
        { field: 'tax_year', headerName: 'Sale Year', width: 100, type: 'number', valueFormatter: (value: any) => value ?? '-' },
        {
            field: 'amount_due', headerName: 'Opening Bid', width: 110, type: 'number',
            valueFormatter: (value: any) => {
                return (value !== null && value !== undefined) ? `$${Number(value).toLocaleString()}` : '-';
            }
        },
        { field: 'lot_acres', headerName: 'Acres', width: 80, type: 'number', valueFormatter: (value: any) => value != null ? `${Number(value).toFixed(2)} ac` : '-' },
        {
            field: 'assessed_value', headerName: 'Total Value', width: 110, type: 'number',
            valueFormatter: (value: any) => (value !== null && value !== undefined) ? `$${Number(value).toLocaleString()}` : '-'
        },
        {
            field: 'land_value', headerName: 'Land', width: 100, type: 'number',
            valueGetter: (value, row) => value || row.market_land_value || 0,
            valueFormatter: (value: any) => (value !== null && value !== undefined) ? `$${Number(value).toLocaleString()}` : '-'
        },
        {
            field: 'improvement_value', headerName: 'Building', width: 100, type: 'number',
            valueGetter: (value, row) => value || row.market_improvement_value || 0,
            valueFormatter: (value: any) => (value !== null && value !== undefined) ? `$${Number(value).toLocaleString()}` : '-'
        },
        { field: 'property_type', headerName: 'Parcel Type', width: 160, type: 'singleSelect', valueOptions: ['Land & Structures', 'Land Only', 'Improvements Only'] },
        {
            field: 'property_category',
            headerName: 'Category',
            width: 120,
            type: 'singleSelect',
            valueOptions: ['Lien', 'Deed', 'Foreclosure', 'Cert', 'Quit Claim'],
            renderCell: (params) => {
                const type = params.value || '';
                const typeColors: Record<string, string> = {
                    'Tax Lien': 'bg-blue-100 text-blue-700',
                    'Tax Deed': 'bg-purple-100 text-purple-700',
                    'Foreclosure': 'bg-red-100 text-red-700',
                    'Tax Sale': 'bg-amber-100 text-amber-700',
                    'Over the Counter': 'bg-emerald-100 text-emerald-700',
                    'Sealed Bid': 'bg-slate-100 text-slate-700',
                    'Lien': 'bg-blue-100 text-blue-700',
                    'Deed': 'bg-purple-100 text-purple-700',
                    'Cert': 'bg-amber-100 text-amber-700',
                    'Quit Claim': 'bg-slate-100 text-slate-600',
                };
                
                let matchedColor = 'bg-slate-100 text-slate-500';
                if (type) {
                    if (type.includes('Deed')) matchedColor = typeColors['Tax Deed'];
                    else if (type.includes('Lien')) matchedColor = typeColors['Tax Lien'];
                    else if (type.includes('Foreclosure')) matchedColor = typeColors['Foreclosure'];
                    else if (type.includes('Sale')) matchedColor = typeColors['Tax Sale'];
                    else if (type.includes('OTC') || type.includes('Counter')) matchedColor = typeColors['Over the Counter'];
                    else if (type.includes('Cert')) matchedColor = typeColors['Cert'];
                    else if (typeColors[type]) matchedColor = typeColors[type];
                }

                return type ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${matchedColor}`}>
                        {type}
                    </span>
                ) : <span className="text-slate-300">—</span>;
            }
        },
        { field: 'address', headerName: 'Address', width: 180 },
        { field: 'auction_name', headerName: 'Next Auction', width: 220, valueGetter: (value) => value || 'None Scheduled' },

        { 
            field: 'occupancy', 
            headerName: 'Occupancy', 
            width: 150, 
            type: 'singleSelect', 
            valueOptions: ['Occupied', 'Vacant', 'Unknown'], 
            valueGetter: (value, row) => {
                if (value) return value;
                if (row.owner_occupied === true) return 'Occupied';
                if (row.owner_occupied === false) return 'Vacant';
                return 'Unknown';
            } 
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 80,
            getActions: ({ id, row }) => {
                const actions = [
                    <GridActionsCellItem
                        key={`view-${id}`}
                        icon={<span className="material-symbols-outlined text-green-600">visibility</span>}
                        label="View Details"
                        onClick={() => navigate(readOnly ? `/client/properties/${id}` : `/admin/properties/${id}`)}
                    />
                ];

                if (!readOnly) {
                    actions.push(
                        <GridActionsCellItem
                            key={`edit-${id}`}
                            icon={<span className="material-symbols-outlined text-blue-600">edit</span>}
                            label="Edit"
                            onClick={() => handleEditClick(row)}
                        />,
                        <GridActionsCellItem
                            key={`delete-${id}`}
                            icon={<span className="material-symbols-outlined text-red-600">delete</span>}
                            label="Delete"
                            onClick={() => handleDeleteClick(id as string)}
                        />
                    );
                }
                return actions;
            },
        },
    ];

    return (
        <Box sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box p={2} display="flex" justifyContent="space-between" alignItems="center" sx={{ borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                <Typography variant="h6" className="text-slate-800 dark:text-white font-semibold flex-1">
                    Properties Database
                </Typography>
                {!readOnly && (
                    <Button
                        onClick={() => setShowHistory(true)}
                        startIcon={<span className="material-symbols-outlined">history</span>}
                        sx={{ textTransform: 'none', mr: 2 }}
                        color="secondary"
                        variant="outlined"
                    >
                        View Flow History
                    </Button>
                )}
                <Button
                    onClick={fetchProperties}
                    startIcon={<span className="material-symbols-outlined">refresh</span>}
                    sx={{ textTransform: 'none' }}
                >
                    Refresh
                </Button>
            </Box>

            <Box sx={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    loading={loading}
                    rowCount={rowCount}
                    paginationMode="server"
                    filterMode="server"
                    paginationModel={paginationModel}
                    onPaginationModelChange={setPaginationModel}
                    filterModel={filterModel}
                    onFilterModelChange={setFilterModel}
                    sortingMode="server"
                    sortModel={sortModel}
                    onSortModelChange={setSortModel}
                    pageSizeOptions={[20, 50, 100]}
                    disableRowSelectionOnClick
                    density="compact"
                    onRowClick={(params) => navigate(readOnly ? `/client/properties/${params.id}` : `/admin/properties/${params.id}`)}
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: 'rgba(248, 250, 252, 0.5)',
                        },
                        '& .MuiDataGrid-cell:focus': {
                            outline: 'none',
                        },
                    }}
                    slots={{
                        noRowsOverlay: () => (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 2 }}>
                                <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">search_off</span>
                                <Typography variant="h6" color="textSecondary">No properties found</Typography>
                                {filters?.keyword && onCreateCustom && (
                                    <Box mt={2} textAlign="center">
                                        <Typography variant="body2" color="textSecondary" mb={2}>
                                            Couldn't find a match for "<b>{filters.keyword}</b>"
                                        </Typography>
                                        <Button 
                                            variant="contained" 
                                            color="primary" 
                                            size="small" 
                                            onClick={onCreateCustom} 
                                            className="bg-blue-600 shadow-none hover:bg-blue-700"
                                            sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
                                            startIcon={<span className="material-symbols-outlined text-[18px]">bolt</span>}
                                        >
                                            Quick Create Property
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        )
                    }}
                />
            </Box>

            <Dialog
                open={!!editRow}
                onClose={() => setEditRow(null)}
                maxWidth="lg"
                fullWidth
            >
                <DialogContent className="bg-slate-50 dark:bg-slate-900 p-0">
                    {editRow && (
                        <div className="relative">
                            <IconButton
                                onClick={() => setEditRow(null)}
                                className="absolute right-4 top-4 z-10 bg-white shadow-sm hover:bg-slate-100"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </IconButton>
                            <PropertyForm
                                initialData={editRow}
                                onSuccess={() => {
                                    setEditRow(null);
                                    fetchProperties();
                                }}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={showHistory}
                onClose={() => setShowHistory(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogContent className="bg-slate-50 dark:bg-slate-900 p-0">
                    <div className="relative">
                        <IconButton
                            onClick={() => setShowHistory(false)}
                            className="absolute right-4 top-4 z-10 bg-white shadow-sm hover:bg-slate-100"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </IconButton>
                        <AvailabilityHistoryDashboard />
                    </div>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default PropertyList;
