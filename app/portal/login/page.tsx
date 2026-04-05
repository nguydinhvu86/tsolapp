'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, AlertCircle, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function PortalLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await signIn('credentials', {
                redirect: false,
                email,
                password,
            });

            if (res?.error) {
                setError(res.error);
            } else {
                router.push('/portal/dashboard');
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi khi đăng nhập');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 w-full min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[#0a0f1e] overflow-hidden">
            {/* Dynamic Animated Mesh Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }}></div>
                <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-cyan-400/10 rounded-full blur-[120px] mix-blend-screen"></div>
            </div>

            {/* Premium Glass Card */}
            <div className="relative z-10 w-full max-w-[420px] bg-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 sm:p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-all duration-300 hover:shadow-[0_8px_40px_0_rgba(0,0,0,0.45)]">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/30 transform transition-transform duration-500 hover:scale-105 hover:rotate-3">
                        <Building2 className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Customer Portal</h1>
                    <p className="text-slate-400 mt-2 text-center text-[15px] leading-relaxed">
                        Chạm để xem thông tin dự án, đơn hàng và lịch sử thanh toán của bạn.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-start text-sm backdrop-blur-md">
                        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-[13px] font-semibold text-slate-300 mb-2 uppercase tracking-wide">Tài khoản Email</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-indigo-400 text-slate-500">
                                <Mail className="h-5 w-5" />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200 placeholder-slate-600 outline-none transition-all duration-300 shadow-inner group-hover:border-slate-500"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[13px] font-semibold text-slate-300 mb-2 uppercase tracking-wide">Mật khẩu</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-indigo-400 text-slate-500">
                                <Lock className="h-5 w-5" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-200 placeholder-slate-600 outline-none transition-all duration-300 shadow-inner group-hover:border-slate-500"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full relative mt-3 flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-[15px] font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
                    >
                        {isLoading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <LogIn className="mr-2 h-5 w-5" />
                        )}
                        {isLoading ? 'Đang Đăng Nhập...' : 'Truy Cập Hệ Thống'}
                    </button>
                    
                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <Link href="/login" className="text-[13px] text-slate-500 hover:text-indigo-400 transition-colors duration-200 font-medium">
                            Truy cập khu vực Nhân sự (Internal)
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
