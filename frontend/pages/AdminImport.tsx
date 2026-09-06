import React, { useState } from 'react';
import { UploadWizard } from '../components/UploadWizard';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { Home as HomeIcon, Gavel as GavelIcon, Link as LinkIcon } from '@mui/icons-material';
import { useLanguage } from "../context/LanguageContext";

export default function AdminImport() {
    const { t } = useLanguage();
    const [tabIndex, setTabIndex] = useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">{t('AdminImport.dataImportCenter')}</h1>

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
                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">{t('AdminImport.instructions')}</h4>
                <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li><strong>{t('AdminImport.propertiesCSV')}</strong> {t('AdminImport.mustContainParcelIDA')}</li>
                    <li><strong>{t('AdminImport.auctionsCSV')}</strong> {t('AdminImport.mustContainAuctionNa')}<strong>{t('AdminImport.before')}</strong> {t('AdminImport.history')}</li>
                    <li><strong>{t('AdminImport.historyCSV')}</strong> {t('AdminImport.mapsPropertyidToAuct')}<strong>{t('AdminImport.last')}</strong>).</li>
                    <li>{t('AdminImport.largeFilesWillBeProc')}</li>
                </ul>
            </div>
        </div>
    );
}
