import React, { useEffect, useState } from 'react';
import { UserService } from '../../services/user.service';
import { User } from '../../types';
import { 
    Button, IconButton, Chip, Typography, Box, CircularProgress, 
    Paper
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useLanguage } from "../../context/LanguageContext";

const UserList: React.FC = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await UserService.list();
            setUsers(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleDelete = async (userId: number) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await UserService.delete(userId);
            setUsers(users.filter(u => u.id !== userId));
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
    if (error) return <Typography color="error" p={4}>{error}</Typography>;

    return (
        <Box className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" className="font-black text-slate-800 dark:text-white uppercase tracking-tight">User Base Management</Typography>
                <Button 
                    variant="contained" 
                    startIcon={<PersonAddIcon />}
                    onClick={() => alert('New User feature coming soon')}
                    className="bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 rounded-xl px-6 py-2.5 font-bold text-xs uppercase tracking-widest shadow-lg"
                >
                    Add Partner User
                </Button>
            </Box>

            <Paper elevation={0} className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Identity</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Connectivity</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Permission Level</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Lifecycle</th>
                                <th className="px-6 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest text-right">Operational</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 dark:text-slate-100">{user.full_name || user.name || 'Anonymous User'}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">#{user.id} Database Identifier</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs text-blue-500 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">
                                            {user.email}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Chip 
                                            label={user.role} 
                                            size="small" 
                                            className={`font-black uppercase text-[9px] tracking-widest border-2 ${
                                                user.role === 'admin' 
                                                ? 'border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300' 
                                                : 'border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                                            }`}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <div className={`size-2 rounded-full ${user.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`}></div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${user.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <IconButton size="small" className="text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all" onClick={() => handleDelete(user.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Paper>
        </Box>
    );
};

export default UserList;
