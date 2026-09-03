import React, { useState } from 'react';
import { API_URL } from '../services/httpClient';

interface SupportPageProps {
    standalone?: boolean;
}

const SupportPage: React.FC<SupportPageProps> = ({ standalone = true }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        try {
            const res = await fetch(`${API_URL}/auth/contact-support`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, phone, message }),
            });
            if (!res.ok) throw new Error('Failed to send message');
            setStatus('success');
            setName('');
            setEmail('');
            setPhone('');
            setMessage('');
            setTimeout(() => setStatus('idle'), 4000);
        } catch (error) {
            console.error(error);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 4000);
        }
    };

    const content = (
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-12">
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Support
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 mb-3">
                    Contact Us
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                    Have a question or need help with GoAuct? Fill out the form below and
                    our team will get back to you as soon as possible.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your full name"
                                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Phone
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="(555) 000-0000"
                                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            placeholder="Describe your question or issue in detail..."
                            className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors resize-none"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {status === 'submitting' ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                                Sending...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">send</span>
                                Send Message
                            </>
                        )}
                    </button>

                    {status === 'success' && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl border border-green-200 dark:border-green-800">
                            <span className="material-symbols-outlined">check_circle</span>
                            <span>Thank you! We'll be in touch within 1–2 business days.</span>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-800">
                            <span className="material-symbols-outlined">error</span>
                            <span>Failed to send message. Please try again.</span>
                        </div>
                    )}
                </form>

                <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                        Other ways to reach us
                    </h2>
                    <ul className="space-y-3 text-slate-600 dark:text-slate-300">
                        <li className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">email</span>
                            <a href="mailto:support@goauct.com" className="hover:text-primary transition-colors">
                                support@goauct.com
                            </a>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">language</span>
                            <span>goauct.com</span>
                        </li>
                    </ul>
                </div>
            </div>
        </main>
    );

    if (!standalone) {
        return <div className="bg-slate-50 dark:bg-slate-900">{content}</div>;
    }

    return (
        <div className="min-h-screen flex flex-col font-sans pt-24 pb-12">
            <div className="w-full max-w-4xl mx-auto px-4">
                {content}
            </div>
        </div>
    );
};

export default SupportPage;
