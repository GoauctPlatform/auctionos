import React, { useEffect, useState } from 'react';
import { DataGrid, GridColDef, GridFilterModel } from '@mui/x-data-grid';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { Box, Typography, Button, IconButton } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface AuctionPropertiesListProps {
    auctionName: string;
    auctionDate?: string;
    auctionId?: number;
    onClose?: () => void;
    embedded?: boolean;
}

const AuctionPropertiesList: React.FC<AuctionPropertiesListProps> = ({ auctionName, auctionDate, auctionId, onClose, embedded = false }) => {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });
    const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });

    // Determine Base Path depending on User Role
    const currentUser = AuthService.getCurrentUser();
    const isTeamMember = currentUser && ['client', 'manager', 'agent'].includes(currentUser.role);
    const basePath = isTeamMember ? '#/client/properties' : '#/admin/properties';

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const skip = paginationModel.page * paginationModel.pageSize;
            const limit = paginationModel.pageSize;

            // Fetch properties specifically for this auction
            const params: any = { limit, skip };
            if (auctionId) {
                params.auction_id = auctionId;
            } else {
                params.auction_name = auctionName;
                if (auctionDate) {
                    params.auction_date = auctionDate;
                }
            }

            filterModel.items.forEach(item => {
                if (item.value === undefined || item.value === null || item.value === '') return;

                const f = item.field;
                const v = item.value;
                const op = item.operator;

                if (f === 'parcel_id' || f === 'address') params.keyword = params.keyword ? `${params.keyword} ${v}` : v;
                else if (f === 'amount_due') {
                    if (op === '>' || op === '>=' || op === '!=') params.min_amount_due = v;
                    else if (op === '<' || op === '<=') params.max_amount_due = v;
                    else {
                        params.min_amount_due = v;
                        params.max_amount_due = v;
                    }
                } else {
                    params[f] = v;
                }
            });

            const { items, total } = await AdminService.listProperties(params);

            const mappedData = items.map((item: any) => ({
                ...item,
                id: item.parcel_id
            }));

            setRows(mappedData);
            setRowCount(total);
        } catch (err) {
            console.error('Failed to fetch auction properties', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (auctionId || auctionName) {
            fetchProperties();
        }
    }, [auctionId, auctionName, paginationModel, filterModel]);

    const columns: GridColDef[] = [
        { field: 'parcel_id', headerName: 'Parcel Number', width: 140 },
        { field: 'address', headerName: 'Address', width: 200 },
        { field: 'county', headerName: 'County', width: 120 },
        {
            field: 'amount_due', headerName: 'Opening Bid', width: 110, type: 'number',
            valueFormatter: (params: any) => {
                const val = typeof params === 'object' ? params?.value : params;
                return (val !== null && val !== undefined) ? `$${Number(val).toLocaleString()}` : '-';
            }
        },
        { field: 'property_type', headerName: 'Type', width: 130, type: 'singleSelect', valueOptions: ['Vacant Land', 'Single Family', 'Multi-Family', 'Commercial', 'Agricultural', 'Industrial', 'Tax Sale', 'Over the Counter', 'Sealed Bid', 'Public Outcry', 'Tax Deed', 'Tax Lien', 'Foreclosure', 'Other'] },
        {
            field: 'actions',
            headerName: '',
            width: 60,
            sortable: false,
            renderCell: (params) => (
                <IconButton
                    size="small"
                    title="Open Details"
                    onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('open-workbench-overlay', {
                            detail: {
                                type: 'property_details',
                                title: `🔍 Property: ${params.row.parcel_id || params.row.id}`,
                                data: { propertyId: params.row.id, parcelId: params.row.parcel_id }
                            }
                        }));
                        // if (onClose) onClose();
                    }}
                >
                    <OpenInNewIcon fontSize="small" className="text-blue-500" />
                </IconButton>
            )
        }
    ];

    return (
        <Box sx={{ width: '100%', height: embedded ? '100%' : 400, bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', borderRadius: embedded ? 2 : 0, overflow: 'hidden', border: embedded ? 'none' : 'none' }}>
            {!embedded && (
                <Box p={1} display="flex" justifyContent="space-between" alignItems="center" sx={{ borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                    <Typography variant="subtitle1" className="text-slate-800 dark:text-white font-semibold">
                        Properties for: {auctionName}
                    </Typography>
                    <div className="flex gap-2">
                        <Button
                            size="small"
                            onClick={fetchProperties}
                            startIcon={<span className="material-symbols-outlined text-sm">refresh</span>}
                        >
                            Refresh
                        </Button>
                        {onClose && (
                            <Button size="small" onClick={onClose} color="inherit">
                                Back
                            </Button>
                        )}
                    </div>
                </Box>
            )}

            <Box sx={{ flexGrow: 1, width: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
                    pageSizeOptions={[10, 25, 50, 100]}
                    disableRowSelectionOnClick
                    density="compact"
                    onRowClick={(params) => {
                        window.dispatchEvent(new CustomEvent('open-workbench-overlay', {
                            detail: {
                                type: 'property_details',
                                title: `🔍 Property: ${params.row.parcel_id || params.row.id}`,
                                data: { propertyId: params.row.id, parcelId: params.row.parcel_id }
                            }
                        }));
                        // if (onClose) onClose();
                    }}
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: '#f8fafc',
                        },
                        '& .MuiDataGrid-row': { cursor: 'pointer' },
                        '& .MuiDataGrid-row:hover': { backgroundColor: 'rgba(59, 130, 246, 0.04)' }
                    }}
                />
            </Box>
        </Box>
    );
};

export default AuctionPropertiesList;
