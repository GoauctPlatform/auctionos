import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Box,
    Button,
    Typography,
    Paper,
    LinearProgress,
    Alert,
    Stepper,
    Step,
    StepLabel
} from '@mui/material';
import { CloudUpload as UploadIcon, InsertDriveFile as FileIcon } from '@mui/icons-material';
import axios from 'axios';
import { API_URL, getHeaders } from '../services/httpClient';
import { useLanguage } from "../context/LanguageContext";

interface UploadWizardProps {
    endpoint: string; // e.g., '/admin/import-properties'
    onComplete?: () => void;
    title?: string;
}

const steps = ['Select File', 'Upload & Process', 'Complete'];

export const UploadWizard: React.FC<UploadWizardProps> = ({ endpoint, onComplete, title = "Upload CSV" }) => {
    const { t } = useLanguage();
    const [activeStep, setActiveStep] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [jobId, setJobId] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [importErrors, setImportErrors] = useState<string[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            setError(null);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv']
        },
        maxFiles: 1
    });

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setActiveStep(1);
        setProgress(10); // Started

        const formData = new FormData();
        formData.append('file', file);

        try {
            // 1. Initiate Upload
            const response = await axios.post(`${API_URL}${endpoint}`, formData, {
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'multipart/form-data'
                }
            });

            const { job_id } = response.data;
            setJobId(job_id);
            setStatusMessage('File uploaded. Processing...');
            setProgress(30);

            // 2. Poll Status
            pollStatus(job_id);

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Upload failed');
            setUploading(false);
            setActiveStep(0);
        }
    };

    const pollStatus = async (id: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_URL}/admin/import/status/${id}`, {
                    headers: getHeaders()
                });

                const { status, errors } = res.data;
                const statusStr = String(status).toLowerCase();

                if (statusStr.includes('success')) {
                    clearInterval(interval);
                    setProgress(100);
                    setStatusMessage(status);
                    if (errors) setImportErrors(errors);
                    setActiveStep(2);
                    setUploading(false);
                    if (onComplete) onComplete();
                } else if (statusStr.includes('error') && !statusStr.includes('errors: 0')) {
                    // Check if it's a critical error or just partial error (caught in success block usually if formatted right)
                    // If existing logic returns "error: ..." for critical failures:
                    clearInterval(interval);
                    setError(status);
                    setUploading(false);
                } else {
                    // Still processing
                    setStatusMessage(`Processing... (${status})`);
                    // Fake progress increment
                    setProgress(prev => Math.min(prev + 5, 90));
                }

            } catch (e) {
                // If 404, maybe job not ready yet? or lost?
                console.warn("Polling error", e);
            }
        }, 1000);
    }

    const handleReset = () => {
        setFile(null);
        setActiveStep(0);
        setError(null);
        setStatusMessage('');
        setImportErrors([]);
        setProgress(0);
    };

    return (
        <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
            <Typography variant="h5" gutterBottom>{title}</Typography>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {/* Step 0: Selection */}
            {activeStep === 0 && (
                <Box>
                    <div
                        {...getRootProps()}
                        style={{
                            border: '2px dashed #ccc',
                            borderRadius: '8px',
                            padding: '40px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: isDragActive ? '#f0f8ff' : '#fafafa'
                        }}
                    >
                        <input {...getInputProps()} />
                        <UploadIcon sx={{ fontSize: 48, color: '#999', mb: 2 }} />
                        {file ? (
                            <Typography variant="h6" color="primary">
                                Selected: {file.name}
                            </Typography>
                        ) : (
                            <Typography color="textSecondary">
                                Drag & drop your CSV file here, or click to select
                            </Typography>
                        )}
                    </div>

                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            disabled={!file}
                            onClick={handleUpload}
                        >
                            Upload & Process
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Step 1: Processing */}
            {activeStep === 1 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                    <LinearProgress variant="determinate" value={progress} sx={{ mb: 2, height: 10, borderRadius: 5 }} />
                    <Typography variant="body1">{statusMessage}</Typography>
                </Box>
            )}

            {/* Step 2: Confirmation */}
            {activeStep === 2 && (
                <Box>
                    <Alert severity={importErrors.length > 0 ? "warning" : "success"} sx={{ mb: 2 }}>
                        {statusMessage}
                    </Alert>

                    {importErrors.length > 0 && (
                        <Box sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', p: 1, borderRadius: 1 }}>
                            <Typography variant="caption" color="error">Errors encountered:</Typography>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {importErrors.map((e, i) => (
                                    <li key={i}><Typography variant="caption" color="textSecondary">{e}</Typography></li>
                                ))}
                            </ul>
                        </Box>
                    )}

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                        <Button variant="outlined" onClick={handleReset}>
                            Upload Another File
                        </Button>
                    </Box>
                </Box>
            )}
        </Paper>
    );
};
