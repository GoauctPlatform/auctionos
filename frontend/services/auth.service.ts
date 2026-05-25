import { API_URL, getHeaders } from './httpClient';

export const AuthService = {
    login: async (email: string, password: string) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${API_URL}/auth/login/access-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.detail || 'Login failed');
        }
        return response.json();
    },



    getMe: async () => {
        const response = await fetch(`${API_URL}/users/me`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch user profile');
        return response.json();
    },

    changePassword: async (current_password: string, new_password: string) => {
        const res = await fetch(`${API_URL}/users/me/password`, {
            method: 'PUT',
            headers: {
                ...getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ current_password, new_password })
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.detail || "Failed to change password");
        }
        return res.json();
    },

    getCurrentUser: () => {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
    },

    isTrialExpired: () => {
        return localStorage.getItem('trial_expired') === 'true';
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('trial_expired');
        window.location.href = '/#/';
    }
};

