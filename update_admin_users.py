import re

with open('frontend/pages/admin/AdminUsers.tsx', 'r') as f:
    content = f.read()

# Add contractor to tab type
content = re.sub(
    r"useState<'users' \| 'logs' \| 'realtors' \| 'agents'>\('users'\)",
    "useState<'users' | 'logs' | 'realtors' | 'agents' | 'contractors'>('users')",
    content
)

# Add state
state_to_add = """    const [contractors, setContractors] = useState<any[]>([]);
    const [pendingContractorsCount, setPendingContractorsCount] = useState(0);"""
content = re.sub(
    r"    const \[pendingAgentsCount, setPendingAgentsCount\] = useState\(0\);",
    "    const [pendingAgentsCount, setPendingAgentsCount] = useState(0);\n" + state_to_add,
    content
)

# Add pending count
count_code = """            const [rRes, aRes, cRes] = await Promise.all([
                fetch(`${API_URL}/admin/realtors?status=pending&limit=1`, { headers: getHeaders() }),
                fetch(`${API_URL}/admin/agents?status=pending&limit=1`, { headers: getHeaders() }),
                fetch(`${API_URL}/admin/verifications/pending`, { headers: getHeaders() })
            ]);"""
content = re.sub(
    r"            const \[rRes, aRes\] = await Promise\.all\(\[\n.*?fetch\(`\$\{API_URL\}/admin/realtors\?status=pending&limit=1`.*?\n.*?fetch\(`\$\{API_URL\}/admin/agents\?status=pending&limit=1`.*?\n            \]\);",
    count_code,
    content,
    flags=re.DOTALL
)

count_update = """            if (aRes.ok) {
                const aData = await aRes.json();
                setPendingAgentsCount(aData.total || 0);
            }
            if (cRes.ok) {
                const cData = await cRes.json();
                setPendingContractorsCount(cData.contractors?.length || 0);
            }"""
content = re.sub(
    r"            if \(aRes\.ok\) \{\n                const aData = await aRes\.json\(\);\n                setPendingAgentsCount\(aData\.total \|\| 0\);\n            \}",
    count_update,
    content
)

# Add to loadData
load_data_add = """            } else if (tab === 'contractors') {
                const res = await fetch(`${API_URL}/admin/verifications/pending`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setContractors(data.contractors || []);
                }"""
content = re.sub(
    r"            \} else if \(tab === 'agents'\) \{.*?\n                    setAgents\(data\.items \|\| \[\]\);\n                \}",
    "} else if (tab === 'agents') {\n                const res = await fetch(`${API_URL}/admin/agents?status=${consultantFilter}&limit=100`, { headers: getHeaders() });\n                if (res.ok) {\n                    const data = await res.json();\n                    setAgents(data.items || []);\n                }\n" + load_data_add,
    content,
    flags=re.DOTALL
)

# Add to handleVerify
verify_url = """            let url = '';
            let method = 'PUT';
            if (role === 'contractor') {
                url = `${API_URL}/admin/verifications/contractor/${id}/${status === 'verified' ? 'approve' : 'reject'}`;
                method = 'POST';
            } else {
                url = role === 'realtor' 
                    ? `${API_URL}/admin/realtors/${id}/verify` 
                    : `${API_URL}/admin/agents/${id}/verify`;
            }"""
content = re.sub(
    r"            const url = role === 'realtor' \n                \? `\$\{API_URL\}/admin/realtors/\$\{id\}/verify` \n                : `\$\{API_URL\}/admin/agents/\$\{id\}/verify`;",
    verify_url,
    content
)
content = re.sub(
    r"                method: 'PUT',",
    "                method,",
    content
)

# Replace handleDeleteConsultant signature
content = content.replace(
    "const handleDeleteConsultant = async (id: number, role: 'realtor' | 'agent')",
    "const handleDeleteConsultant = async (id: number, role: 'realtor' | 'agent' | 'contractor')"
)
content = content.replace(
    "handleVerify = async (id: number, role: 'realtor' | 'agent', status: 'verified' | 'rejected', reason?: string)",
    "handleVerify = async (id: number, role: 'realtor' | 'agent' | 'contractor', status: 'verified' | 'rejected', reason?: string)"
)

# Add Tab Button
tab_buttons = """                    { key: 'realtors', icon: 'handshake', label: 'Realtor Apps', badge: pendingRealtorsCount },
                    { key: 'agents', icon: 'directions_car', label: 'Agent Apps', badge: pendingAgentsCount },
                    { key: 'contractors', icon: 'construction', label: 'Contractors', badge: pendingContractorsCount },"""
content = re.sub(
    r"                    \{ key: 'realtors'.*?\n                    \{ key: 'agents'.*?\n",
    tab_buttons + '\n',
    content
)

with open('frontend/pages/admin/AdminUsers.tsx', 'w') as f:
    f.write(content)
