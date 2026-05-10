import React from 'react';
import { AuthService } from '../services/auth.service';

interface PermissionGateProps {
    children: React.ReactNode;
    allowedRoles: string[];
    fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ children, allowedRoles, fallback = null }) => {
    const user = AuthService.getCurrentUser();
    
    if (!user) return <>{fallback}</>;
    
    if (allowedRoles.includes(user.role)) {
        return <>{children}</>;
    }
    
    return <>{fallback}</>;
};
