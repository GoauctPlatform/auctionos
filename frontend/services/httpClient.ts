const isProd = import.meta.env.PROD;
const defaultProdApi = 'https://auctionos-production.up.railway.app/api/v1';

export const API_URL = isProd
    ? (import.meta.env.VITE_API_URL || defaultProdApi)
    : (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1');
export const API_BASE_URL = API_URL.replace('/api/v1', '');

console.log('API Config:', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    API_URL,
    isProd,
    STREET_VIEW_KEY_EXISTS: !!import.meta.env.VITE_GOOGLE_STREET_VIEW_KEY
});

export const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const getMultiPartHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

// Global Fetch Interceptor to handle 401 Unauthorized (Token Expiration)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
        const isApiRequest = url.includes(API_URL) || url.includes('/api/v1');
        const isLoginRequest = url.includes('/auth/login');

        if (isApiRequest && !isLoginRequest && (response.status === 401 || response.status === 403)) {
            const publicPages = ['/forgot-password', '/reset-password', '/login', '/signup', '/#/', '/'];
            const isPublicPage = publicPages.some(page => window.location.pathname.includes(page) || window.location.hash.includes(page));
            
            if (!isPublicPage) {
                let isSessionConflict = false;
                try {
                    const clone = response.clone();
                    const body = await clone.json();
                    if (body && body.detail === "session active in another device") {
                        isSessionConflict = true;
                    }
                } catch (e) {
                    // Ignore JSON parsing errors
                }

                console.warn('Authentication token expired or invalid. Redirecting to login.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                if (isSessionConflict) {
                    window.location.href = '/#/login?session_expired=true';
                } else {
                    window.location.href = '/#/';
                }
            }
        }
    } catch (e) {
        console.error('Error in fetch interceptor', e);
    }

    return response;
};
