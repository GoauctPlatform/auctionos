import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import api from '../services/api';

export const Onboarding: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [step, setStep] = useState<'role_selection' | 'profile_setup' | 'tour' | 'done'>('role_selection');
    const [selectedRole, setSelectedRole] = useState('');
    const [currentSlide, setCurrentSlide] = useState(0);
    
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

                {step === 'tour' && (() => {
                    const getTourSlides = () => {
                        if (selectedRole === 'realtor') {
                            return [
                                {
                                    title: "Partner with Active Investors",
                                    description: "Receive high-value property lists exported directly to you by real estate investors looking for local seller outreach, representation, and listings.",
                                    icon: "handshake",
                                    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                                },
                                {
                                    title: "Browse & Claim Local Tasks",
                                    description: "Explore on-demand BPO and due diligence research tasks available in your area. Claim them to secure exclusive execution rights.",
                                    icon: "explore",
                                    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30"
                                },
                                {
                                    title: "Execute Research Missions",
                                    description: "Visit properties to submit certified photo evidence, fill out condition checklists, and upload secure GPS-stamped data right from your device.",
                                    icon: "photo_camera",
                                    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30"
                                },
                                {
                                    title: "Earn Commission Payouts",
                                    description: "Earn cash-backed points for every approved task. Request fast, direct-to-bank or PayPal withdrawals straight from your balance wallet.",
                                    icon: "payments",
                                    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30"
                                }
                            ];
                        } else if (selectedRole === 'agent_due_diligence') {
                            return [
                                {
                                    title: "Local Mission Board",
                                    description: "Discover verified property inspection opportunities posted nearby. Accept tasks that align with your daily schedule and coverage area.",
                                    icon: "explore",
                                    color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30"
                                },
                                {
                                    title: "On-Site Inspections",
                                    description: "Visit distress listings to document property statuses, complete investor-requested questionnaires, and capture high-resolution pictures.",
                                    icon: "publish",
                                    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30"
                                },
                                {
                                    title: "GPS-Stamp Verification",
                                    description: "Submit geolocated evidence on-site. Our system automatically validates your coordinates against target listings to trigger auto-approvals.",
                                    icon: "location_on",
                                    color: "text-red-500 bg-red-50 dark:bg-red-950/30"
                                },
                                {
                                    title: "Secure Payout Wallet",
                                    description: "Accumulate points for every verified field task. Liquidate your earnings instantly to your preferred payout account with one click.",
                                    icon: "account_balance_wallet",
                                    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                                }
                            ];
                        } else {
                            return [
                                {
                                    title: "Welcome to GoAuct Mission Control",
                                    description: "The ultimate distress real estate intelligence platform. Discover tax liens, deeds, and foreclosures, and coordinate field agents on one screen.",
                                    icon: "rocket_launch",
                                    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30"
                                },
                                {
                                    title: "National Yield Heatmap",
                                    description: "Get immediate macro visibility into yield performance. Tap on any state to instantly isolate the highest-yield deeds and foreclosures.",
                                    icon: "public",
                                    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                                },
                                {
                                    title: "Smart AI Scoring Engine",
                                    description: "Identify high-value equity plays. Our algorithms calculate target safety margins and score properties from A+ down to C.",
                                    icon: "auto_awesome",
                                    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                                },
                                {
                                    title: "Global Property Search Engine",
                                    description: "Filter through over 500,000 delinquent and distressed assets instantly. Search by county, zip code, opening tax bids, or physical features.",
                                    icon: "search",
                                    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30"
                                },
                                {
                                    title: "Custom Off-Market Assets",
                                    description: "Found an off-market deal? Create custom property cards with tax history, spatial logs, and custom private tags to track them with your team.",
                                    icon: "add_home",
                                    color: "text-teal-500 bg-teal-50 dark:bg-teal-950/30"
                                },
                                {
                                    title: "Live Auctions & Calendar",
                                    description: "Track upcoming tax deed, lien, and foreclosure sales day-by-day. Use the interactive calendar to map out auctions across multiple counties.",
                                    icon: "calendar_month",
                                    color: "text-rose-500 bg-rose-50 dark:bg-rose-950/30"
                                },
                                {
                                    title: "Redemption Risk Intelligence",
                                    description: "Evaluate bidding risk instantly. Our Redemption Intelligence gauges historical county payout rates to predict if homeowners will redeem their debt.",
                                    icon: "analytics",
                                    color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30"
                                },
                                {
                                    title: "Auto-Enrichment & Custom Views",
                                    description: "Auto-enrich missing details instantly via ATTOM APIs. Override physical attributes and tax assessments to personalize property folders for your team.",
                                    icon: "auto_fix_high",
                                    color: "text-teal-500 bg-teal-50 dark:bg-teal-950/30"
                                },
                                {
                                    title: "BPO Secondary Media Marketplace",
                                    description: "Buy visual inspection logs completed by other agents. Instantly unlock S3 high-res photo packs, GPS validation markers, and hazard checklists.",
                                    icon: "shopping_bag",
                                    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                                },
                                {
                                    title: "Watchlist Folder Silos",
                                    description: "Organize distress assets by US state and county automatically. Access official municipal registers, write private notes, and view state silhouettes.",
                                    icon: "folder_open",
                                    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30"
                                },
                                {
                                    title: "Broker & Field Team Workflows",
                                    description: "Coordinate your acquisitions pipeline. Assign occupancy inspections to local agents on-site, and export property packages to broker partners to initiate bids.",
                                    icon: "groups",
                                    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                                },
                                {
                                    title: "Field Missions Control Center",
                                    description: "Track on-site property inspections in real-time. Verify occupant status, hazard risks, and structural damage directly from our interactive checklist dashboards.",
                                    icon: "assignment",
                                    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30"
                                },
                                {
                                    title: "GPS Verification & Escalation",
                                    description: "Validate the field agent's physical coordinates against the property. Rejections are sent back for revision; continuous disputes trigger support mediation.",
                                    icon: "verified",
                                    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                                },
                                {
                                    title: "Workspace & Team Isolation",
                                    description: "Register multiple company holdings and switch workspace context instantly. Assign managers and field agents while enforcing trial gates safely.",
                                    icon: "domain",
                                    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                                },
                                {
                                    title: "Billing Telemetry & Stripe Escrow",
                                    description: "Monitor monthly property detail views and active team limits in real-time. Upgrade securely via Stripe checkout links to unlock unlimited research scopes.",
                                    icon: "account_balance_wallet",
                                    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30"
                                }
                            ];
                        }
                    };

                    const slides = getTourSlides();

                    return (
                        <div className="flex flex-col h-full justify-between animate-in fade-in duration-300">
                            {/* Progress Bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-6">
                                <div 
                                    className="bg-blue-600 h-full transition-all duration-300"
                                    style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                                />
                            </div>

                            {/* Slide Content */}
                            <div className="text-center flex-1 py-4 flex flex-col items-center justify-center min-h-[300px]">
                                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-sm ${slides[currentSlide].color}`}>
                                    <span className="material-symbols-outlined text-4xl">{slides[currentSlide].icon}</span>
                                </div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white mb-3">
                                    {slides[currentSlide].title}
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed mx-auto">
                                    {slides[currentSlide].description}
                                </p>
                            </div>

                            {/* Navigation Footer */}
                            <div className="mt-8 border-t border-slate-100 dark:border-slate-700/60 pt-6 flex flex-col gap-4">
                                {/* Slide Indicator Dots */}
                                <div className="flex justify-center gap-2">
                                    {slides.map((_, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setCurrentSlide(idx)}
                                            className={`h-2 rounded-full transition-all ${idx === currentSlide ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`}
                                        />
                                    ))}
                                </div>

                                {/* Buttons */}
                                <div className="flex items-center justify-between gap-3 mt-2">
                                    <button
                                        onClick={() => currentSlide > 0 && setCurrentSlide(prev => prev - 1)}
                                        disabled={currentSlide === 0}
                                        className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white uppercase tracking-wider disabled:opacity-30 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    
                                    {currentSlide < slides.length - 1 ? (
                                        <button
                                            onClick={() => setCurrentSlide(prev => prev + 1)}
                                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-md shadow-blue-500/10 transition-colors"
                                        >
                                            Next Step
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleComplete}
                                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md shadow-emerald-500/10 transition-all active:scale-[0.98]"
                                        >
                                            Enter Platform 🚀
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};
