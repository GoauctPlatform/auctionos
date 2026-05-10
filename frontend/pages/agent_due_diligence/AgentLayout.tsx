import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthService } from '../../services/auth.service';
import { PermissionGate } from '../../components/PermissionGate';

const AgentLayout: React.FC = () => {
    const navigate = useNavigate();
    const handleLogout = () => {
        AuthService.logout();
        navigate('/');
    };

    return (
        <PermissionGate allowedRoles={['agent_due_diligence']}>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
                <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">directions_car</span>
                            Field Agent
                        </h2>
                    </div>
                    <nav className="flex-1 px-4 space-y-2">
                        <NavLink to="/agent" end className={({isActive}) => `block p-3 rounded-xl transition-colors ${isActive ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Dashboard</NavLink>
                        <NavLink to="/agent/tasks" className={({isActive}) => `block p-3 rounded-xl transition-colors ${isActive ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Available Tasks</NavLink>
                        <NavLink to="/agent/withdraw" className={({isActive}) => `block p-3 rounded-xl transition-colors ${isActive ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Earnings</NavLink>
                    </nav>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={handleLogout} className="w-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            Logout
                        </button>
                    </div>
                </aside>
                <main className="flex-1 p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </PermissionGate>
    );
};
export default AgentLayout;
