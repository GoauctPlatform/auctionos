import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../services/httpClient';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    searchParams.get('error') ? decodeURIComponent(searchParams.get('error')!.replace(/\+/g, ' ')) : ''
  );
  const [isLoading, setIsLoading] = useState(false);

  // ── Handle OAuth Token returned from backend callback ──────────────────────
  useEffect(() => {
    const handleOAuth = async () => {
      // HashRouter: window.location.hash = '#/login?token=XYZ&mode=realtor'
      const hash = window.location.hash; // e.g. '#/login?token=abc123&mode=realtor'
      if (!hash.includes('?')) return;

      // Parse query params from the hash fragment
      const queryString = hash.split('?')[1] || '';
      const params = new URLSearchParams(queryString);
      const token = params.get('token');
      const isNew = params.get('is_new');
      if (!token) return;

      // Clean up the URL so the token doesn't persist on refresh
      window.history.replaceState(null, '', window.location.pathname);

      setIsLoading(true);
      try {
        localStorage.setItem('token', token);
        const user = await AuthService.getMe();
        authLogin(token, user);
        
        if (isNew === 'true') {
          navigate('/onboarding');
        } else {
          // routeAfterLogin is defined below — call inline to avoid hoisting issues
          if (user.role === 'realtor') {
            navigate('/realtor');
          } else if (['client', 'manager', 'agent'].includes(user.role)) {
            navigate('/client');
          } else {
            navigate('/dashboard');
          }
        }
      } catch {
        setError('Falha ao autenticar com Google. Tente novamente.');
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };
    handleOAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const routeAfterLogin = (user: any) => {
    if (user.role === 'realtor') {
      navigate('/realtor');
    } else if (['client', 'manager', 'agent'].includes(user.role)) {
      navigate('/client');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { access_token } = await AuthService.login(email, password);
      localStorage.setItem('token', access_token);
      const user = await AuthService.getMe();
      authLogin(access_token, user);
      routeAfterLogin(user);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to backend OAuth endpoint — backend handles Google redirect and returns token
    const googleAuthUrl = `${API_BASE_URL}/api/v1/auth/login/google?role=client`;
    console.log('>>> Google OAuth redirect to:', googleAuthUrl);
    window.location.href = googleAuthUrl;
  };

  const accentClass = 'from-blue-600 to-indigo-600';
  const accentLight = 'bg-primary hover:bg-blue-700';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#070d1a] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-3xl opacity-30 bg-blue-100 dark:bg-blue-900/20`} />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-slate-200 dark:bg-slate-800/30 blur-3xl opacity-40" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">

          {/* Header */}
          <div className={`px-8 pt-10 pb-6 bg-gradient-to-br ${accentClass} text-center`}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="material-symbols-outlined text-white text-[32px]">
                login
              </span>
              <span className="text-white font-extrabold text-2xl tracking-tight">GoAuct</span>
            </div>
            <h1 className="text-white font-bold text-lg">
              Sign In to Your Account
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Welcome back — access your dashboard
            </p>
          </div>

          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 p-3 rounded-xl">
                  {error}
                </div>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Email Address</span>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white h-12 px-4 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary transition-shadow"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Password</span>
                <input
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white h-12 px-4 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary transition-shadow"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </label>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 text-primary" />
                  <span className="text-slate-600 dark:text-slate-400 text-sm">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-primary text-sm font-bold hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full h-12 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 ${accentLight}`}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">Or continue with</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center justify-center w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors gap-3 shadow-sm"
            >
              {/* Google SVG Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-slate-700 dark:text-slate-200 text-sm font-semibold">Continue with Google</span>
            </button>

            {/* Footer links */}
            <div className="mt-6 text-center">
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary font-bold hover:underline">Sign up free</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};