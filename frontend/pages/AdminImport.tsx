import React, { useState } from 'react';
import { UploadWizard } from '../components/UploadWizard';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Home as HomeIcon, Gavel as GavelIcon, Link as LinkIcon } from '@mui/icons-material';

export default function AdminImport() {
    const [tabIndex, setTabIndex] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Data Import Center</h1>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="import tabs">
                    <Tab icon={<HomeIcon />} iconPosition="start" label="Import Properties" id="import-tab-0" />
                    <Tab icon={<GavelIcon />} iconPosition="start" label="Import Auctions" id="import-tab-1" />
                    <Tab icon={<LinkIcon />} iconPosition="start" label="Property History" id="import-tab-2" />
                </Tabs>
            </Box>

            <div className="mb-8">
                {tabIndex === 0 && (
                    <div role="tabpanel" id="import-tabpanel-0" className="animate-fadeIn">
                        <UploadWizard
                            endpoint="/admin/import/properties"
                            title="Upload Property CSV"
                            onComplete={() => console.log("Properties Imported")}
                        />
                    </div>
                )}
                {tabIndex === 1 && (
                    <div role="tabpanel" id="import-tabpanel-1" className="animate-fadeIn">
                        <UploadWizard
                            endpoint="/admin/import/auctions"
                            title="Upload Auctions CSV"
                            onComplete={() => console.log("Auctions Imported")}
                        />
                    </div>
                )}
                {tabIndex === 2 && (
                    <div role="tabpanel" id="import-tabpanel-2" className="animate-fadeIn">
                        <UploadWizard
                            endpoint="/admin/import/history"
                            title="Upload Property History CSV (Mapping)"
                            onComplete={() => console.log("History Mapping Imported")}
                        />
                    </div>
                )}
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Instructions</h4>
                <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li><strong>Properties CSV:</strong> Must contain 'Parcel ID', 'Address', 'Opening Bid', etc.</li>
                    <li><strong>Auctions CSV:</strong> Must contain 'Auction Name', 'Date', etc. (Import this <strong>before</strong> history).</li>
                    <li><strong>History CSV:</strong> Maps 'property_id' to 'auction_eventId'. (Import this <strong>last</strong>).</li>
                    <li>Large files will be processed in the background. You can navigate away safely.</li>
                </ul>
            </div>
        </div>
    );
}
