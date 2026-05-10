import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';

export const Onboarding: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [step, setStep] = useState<'role_selection' | 'profile_setup' | 'tour' | 'done'>('role_selection');
    const [selectedRole, setSelectedRole] = useState('');

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        // Scaffolding: In a real implementation, we'd fetch the onboarding state from backend
        // For now, if role is 'pending', go to role selection, else profile_setup
        if (currentUser.role === 'pending') {
            setStep('role_selection');
        } else {
            setStep('profile_setup');
        }
    }, [navigate]);

    const handleComplete = async () => {
        // Scaffolding: update backend to mark onboarding as complete
        // For now, we update local storage and navigate based on role
        if (user) {
            const updatedUser = { ...user, role: selectedRole || user.role };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            if (updatedUser.role === 'realtor') navigate('/realtor');
            else if (updatedUser.role === 'agent_due_diligence') navigate('/agent'); // Module 7 placeholder
            else navigate('/client');
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-lg text-center">
                <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">Welcome to GoAuct!</h1>
                
                {step === 'role_selection' && (
                    <div className="flex flex-col gap-4">
                        <p className="text-slate-600 dark:text-slate-400">Please select how you want to use the platform:</p>
                        <button onClick={() => { setSelectedRole('client'); setStep('profile_setup'); }} className="p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">Investor</button>
                        <button onClick={() => { setSelectedRole('realtor'); setStep('profile_setup'); }} className="p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">Realtor Partner</button>
                        <button onClick={() => { setSelectedRole('agent_due_diligence'); setStep('profile_setup'); }} className="p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">Field Agent</button>
                    </div>
                )}

                {step === 'profile_setup' && (
                    <div className="flex flex-col gap-4">
                        <p className="text-slate-600 dark:text-slate-400">Let's set up your profile.</p>
                        {/* Profile Setup Form placeholder */}
                        <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm">
                            Profile options for {selectedRole || user.role}...
                        </div>
                        <button onClick={() => setStep('tour')} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 mt-4">Continue</button>
                    </div>
                )}

                {step === 'tour' && (
                    <div className="flex flex-col gap-4">
                        <p className="text-slate-600 dark:text-slate-400">Quick Tour.</p>
                        <div className="h-32 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                            [ Tour Carousel ]
                        </div>
                        <button onClick={handleComplete} className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 mt-4">Let's Go!</button>
                    </div>
                )}
            </div>
        </div>
    );
};
