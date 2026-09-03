import re

with open('frontend/pages/Onboarding.tsx', 'r') as f:
    content = f.read()

# Add document_upload step
content = re.sub(
    r"useState<'role_selection' \| 'profile_setup' \| 'tour' \| 'done'>\('role_selection'\)",
    "useState<'role_selection' | 'profile_setup' | 'document_upload' | 'tour' | 'done'>('role_selection')",
    content
)

# Add state variables
state_add = """    const [profession, setProfession] = useState('');
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [uploadingDoc, setUploadingDoc] = useState(false);"""
content = re.sub(
    r"    const \[vehicleType, setVehicleType\] = useState\(''\);",
    "    const [vehicleType, setVehicleType] = useState('');\n" + state_add,
    content
)

# Add Contractor to endpoint mapping and payload
payload_add = """            } else if (selectedRole === 'contractor') {
                payload = { ...payload, social_security: ssn, profession, license_number: license, payment_account: paymentAccount };
            }"""
content = re.sub(
    r"            \} else if \(selectedRole === 'agent_due_diligence'\) \{\n                payload = \{ \.\.\.payload, social_security: ssn, coverage_area: coverageArea, vehicle_type: vehicleType, payment_account: paymentAccount \};\n            \}",
    "} else if (selectedRole === 'agent_due_diligence') {\n                payload = { ...payload, social_security: ssn, coverage_area: coverageArea, vehicle_type: vehicleType, payment_account: paymentAccount };\n" + payload_add,
    content
)

# Endpoint ternary
content = content.replace(
    "const endpoint = selectedRole === 'realtor' ? '/agent/profile' : selectedRole === 'agent_due_diligence' ? '/agent/profile' : '/users/me';",
    "const endpoint = selectedRole === 'realtor' ? '/agent/profile' : selectedRole === 'agent_due_diligence' ? '/agent/profile' : selectedRole === 'contractor' ? '/contractors/profile' : '/users/me';"
)

# Transition to document_upload
transition = """            if (selectedRole === 'contractor' || selectedRole === 'agent_due_diligence') {
                setStep('document_upload');
            } else {
                setStep('tour');
            }"""
content = re.sub(
    r"            setStep\('tour'\);",
    transition,
    content
)

# Complete routing
content = content.replace(
    "else if (finalUser.role === 'agent_due_diligence') navigate('/agent?welcome=true');",
    "else if (finalUser.role === 'agent_due_diligence') navigate('/agent?welcome=true');\n            else if (finalUser.role === 'contractor') navigate('/admin?welcome=true'); // Or a contractor specific portal"
)

# Add Contractor button in role_selection
button_add = """                            <button onClick={() => { setSelectedRole('contractor'); setStep('profile_setup'); }} className="p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-left font-semibold">
                                <div className="text-amber-600 text-lg">Maintenance Contractor</div>
                                <div className="text-xs text-slate-500 font-normal">I want to provide repair and maintenance services.</div>
                            </button>"""
content = re.sub(
    r"                            </button>\n                        </div>",
    "                            </button>\n" + button_add + "\n                        </div>",
    content
)

# Add Contractor form in profile_setup
form_add = """                            {selectedRole === 'contractor' && (
                                <>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">Social Security Number</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={ssn} onChange={e => setSsn(e.target.value)} placeholder="XXX-XX-XXXX" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">Profession</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={profession} onChange={e => setProfession(e.target.value)} placeholder="e.g. Plumber, Electrician" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">License Number (If applicable)</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={license} onChange={e => setLicense(e.target.value)} placeholder="License #" />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-sm font-semibold">Payment Account</span>
                                        <input type="text" className="rounded-lg border p-2 dark:bg-slate-700 dark:border-slate-600" value={paymentAccount} onChange={e => setPaymentAccount(e.target.value)} placeholder="Email or Routing/Account" />
                                    </label>
                                </>
                            )}"""
content = re.sub(
    r"                                </>\n                            \)}\n\n                            <button ",
    "                                </>\n                            )}\n\n" + form_add + "\n\n                            <button ",
    content
)

# Add Document Upload step JSX before tour
document_upload_jsx = """                {step === 'document_upload' && (
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Verify Your Identity</h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            {selectedRole === 'contractor' ? 'Please upload a copy of your Professional License or ID.' : 'Please upload a copy of your Work Permit or Driver\\'s License.'}
                        </p>
                        <div className="flex flex-col gap-4">
                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                <span className="material-symbols-outlined text-4xl text-primary mb-2">upload_file</span>
                                <span className="text-sm font-bold">{documentFile ? documentFile.name : 'Click to browse file'}</span>
                                <span className="text-xs text-slate-500 mt-1">PDF, JPG, PNG up to 15MB</span>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf,.jpg,.jpeg,.png" 
                                    onChange={e => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            setDocumentFile(e.target.files[0]);
                                        }
                                    }} 
                                />
                            </label>
                            
                            <button 
                                onClick={async () => {
                                    if (!documentFile) return alert('Please select a file first.');
                                    setUploadingDoc(true);
                                    try {
                                        const formData = new FormData();
                                        formData.append('file', documentFile);
                                        // Upload logic hitting our new endpoint
                                        const res = await fetch(`${api.defaults.baseURL}/upload/local`, {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                                            },
                                            body: formData
                                        });
                                        if (res.ok) {
                                            const data = await res.json();
                                            // Real implementation would save data.url to profile.
                                            // Transition to 'pending' state screen or tour
                                            setStep('tour');
                                        } else {
                                            const err = await res.json();
                                            alert(err.detail || 'Failed to upload document.');
                                        }
                                    } catch (e) {
                                        alert('Upload failed.');
                                    } finally {
                                        setUploadingDoc(false);
                                    }
                                }}
                                disabled={uploadingDoc || !documentFile}
                                className="bg-primary text-white p-3 rounded-xl hover:bg-primary/90 mt-2 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {uploadingDoc && <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>}
                                {uploadingDoc ? 'Uploading...' : 'Upload & Continue'}
                            </button>
                            <button onClick={() => setStep('tour')} className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                                Skip for now
                            </button>
                        </div>
                    </div>
                )}"""
content = re.sub(
    r"                \{step === 'tour' && \(\(\) => \{",
    document_upload_jsx + "\n\n                {step === 'tour' && (() => {",
    content
)

# Add Tour for Contractor
tour_add = """                        } else if (selectedRole === 'contractor') {
                            return [
                                {
                                    title: "Find Projects Instantly",
                                    description: "Get connected with investors who need renovations, maintenance, and estimates on distressed properties.",
                                    icon: "construction",
                                    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30"
                                },
                                {
                                    title: "Secure Fast Payouts",
                                    description: "Receive payments quickly after your work is verified. No more chasing invoices.",
                                    icon: "payments",
                                    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                                }
                            ];"""
content = re.sub(
    r"                        \} else \{\n                            return \[",
    tour_add + "\n                        } else {\n                            return [",
    content
)

with open('frontend/pages/Onboarding.tsx', 'w') as f:
    f.write(content)
