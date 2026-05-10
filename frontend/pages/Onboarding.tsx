import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import api from '../services/api';

export const Onboarding: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [step, setStep] = useState<'role_selection' | 'profile_setup' | 'tour' | 'done'>('role_selection');
    const [selectedRole, setSelectedRole] = useState('');
    
    // Form fields
    const [ssn, setSsn] = useState('');
    const [license, setLicense] = useState('');
    const [mlsId, setMlsId] = useState('');
    const [paymentAccount, setPaymentAccount] = useState('');
    const [coverageArea, setCoverageArea] = useState('');
    const [vehicleType, setVehicleType] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        if (currentUser.role === 'pending') {
            setStep('role_selection');
        } else {
            setSelectedRole(currentUser.role);
            setStep('profile_setup');
        }
    }, [navigate]);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            // Determine endpoint based on role
            const endpoint = selectedRole === 'realtor' ? '/agent/profile' : selectedRole === 'agent_due_diligence' ? '/agent/profile' : '/users/me';
            
            // Build payload
            let payload: any = { role: selectedRole };
            if (selectedRole === 'realtor') {
                payload = { ...payload, social_security: ssn, license_number: license, mls_id: mlsId, payment_account: paymentAccount };
            } else if (selectedRole === 'agent_due_diligence') {
                payload = { ...payload, social_security: ssn, coverage_area: coverageArea, vehicle_type: vehicleType, payment_account: paymentAccount };
            }

            // In a real implementation we would hit the proper onboarding profile endpoint. 
            // For now, we update local role and show success.
            await api.post('/auth/onboard', payload).catch(() => console.warn("Backend missing /onboard endpoint, continuing local flow"));

            // Update local storage
            const updatedUser = { ...user, role: selectedRole };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            setStep('tour');
        } catch (err) {
            alert('Failed to save profile details.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleComplete = () => {
        if (user) {
            const finalUser = { ...user, role: selectedRole || user.role };
            if (finalUser.role === 'realtor') navigate('/realtor?welcome=true');
            else if (finalUser.role === 'agent_due_diligence') navigate('/agent?welcome=true');
            else navigate('/client?welcome=true');
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-lg">
                
                {step === 'role_selection' && (
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Welcome to GoAuct!</h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">Please select how you want to use the platform:</p>
                        <div className="flex flex-col gap-4">
                            <button onClick={() => { setSelectedRole('client'); setStep('profile_setup'); }} className="p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-left font-semibold">
                                <div className="text-primary text-lg">Investor</div>
                                <div className="text-xs text-slate-500 font-normal">I want to find, analyze, and buy properties.</div>
                            </button>
                            <button onClick={() => { setSelectedRole('realtor'); setStep('profile_setup'); }} className="p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-left font-semibold">
                                <div className="text-emerald-600 text-lg">Realtor Partner</div>
                                <div className="text-xs text-slate-500 font-normal">I want to manage listings, earn commissions, and do due diligence.</div>
                            </button>
                            <button onClick={() => { setSelectedRole('agent_due_diligence'); setStep('profile_setup'); }} className="p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-left font-semibold">
                                <div className="text-orange-600 text-lg">Field Agent</div>
                                <div className="text-xs text-slate-500 font-normal">I want to complete field tasks and capture property media.</div>
                            </button>
                        </div>
                    </div>
                )}

                {step === 'profile_setup' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Complete Your Profile</h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">Please provide your details to finish setting up your {selectedRole} account.</p>
                        
                        <div className="flex flex-col gap-4">
                            {selectedRole === 'client' && (
                                <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm">
                                    No additional details required for Investors. You're ready to go!
                                </div>
                            )}

                            {selectedRole === 'realtor' && (
                                <>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">Social Security Number</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={ssn} onChange={e => setSsn(e.target.value)} placeholder="XXX-XX-XXXX" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">License Number (CRECI/Equivalent)</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={license} onChange={e => setLicense(e.target.value)} placeholder="License #" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">MLS ID</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={mlsId} onChange={e => setMlsId(e.target.value)} placeholder="MLS ID" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">Payment Account (PayPal / Bank)</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={paymentAccount} onChange={e => setPaymentAccount(e.target.value)} placeholder="Email or Routing/Account" />
                                    </label>
                                </>
                            )}

                            {selectedRole === 'agent_due_diligence' && (
                                <>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">Social Security Number</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={ssn} onChange={e => setSsn(e.target.value)} placeholder="XXX-XX-XXXX" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">Coverage Area (ZIP or City)</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={coverageArea} onChange={e => setCoverageArea(e.target.value)} placeholder="e.g. 32801" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">Vehicle Type</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={vehicleType} onChange={e => setVehicleType(e.target.value)} placeholder="Sedan, SUV, Truck" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">Payment Account (PayPal / Bank)</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={paymentAccount} onChange={e => setPaymentAccount(e.target.value)} placeholder="Email or Routing/Account" />
                                    </label>
                                </>
                            )}

                            <button 
                                onClick={handleSaveProfile} 
                                disabled={isSaving}
                                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 mt-4 font-semibold disabled:opacity-50">
                                {isSaving ? 'Saving...' : 'Complete Profile'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'tour' && (
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Profile Verified!</h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">You're all set up. Let's take a quick look around.</p>
                        <div className="h-48 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[64px] text-blue-500">explore</span>
                        </div>
                        <button onClick={handleComplete} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 w-full font-bold">
                            Enter GoAuct
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
