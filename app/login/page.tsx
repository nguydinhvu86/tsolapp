'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { ShieldAlert } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await signIn('credentials', {
                redirect: false,
                email,
                password,
                token: token || undefined,
            });

            if (res?.error) {
                if (res.error === '2FA_REQUIRED') {
                    setShowTwoFactor(true);
                    setError('Tài khoản đã bật xác thực 2 yếu tố, vui lòng nhập mã.');
                } else {
                    setError(res.error);
                }
                setLoading(false);
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError('Đã xảy ra lỗi hệ thống.');
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', minHeight: '100vh', width: '100%',
            backgroundColor: '#f8fafc', fontFamily: '"Inter", sans-serif'
        }}>
            {/* Left Side - Branding/Decoration */}
            <div style={{
                flex: 1,
                backgroundColor: '#0f172a',
                position: 'relative',
                display: 'none',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '4rem',
                color: 'white',
                overflow: 'hidden'
            }} className="md-flex tech-bg">
                {/* Tech Grid Background */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                    backgroundSize: '24px 24px', opacity: 0.2, zIndex: 0
                }} />

                {/* Animated Glowing Orbs */}
                <div className="orb-1" style={{
                    position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(99,102,241,0) 70%)',
                    borderRadius: '50%', zIndex: 1, filter: 'blur(40px)'
                }} />
                <div className="orb-2" style={{
                    position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px',
                    background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(168,85,247,0) 70%)',
                    borderRadius: '50%', zIndex: 1, filter: 'blur(50px)'
                }} />

                <div style={{ position: 'relative', zIndex: 10, maxWidth: '600px', animation: 'fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '64px', height: '64px', borderRadius: '16px',
                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)', marginBottom: '2rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                        fontSize: '2rem', fontWeight: 900, color: 'white',
                        animation: 'pulse 3s infinite alternate'
                    }}>
                        ERP
                    </div>
                    <h1 className="glow-text" style={{
                        fontSize: '4rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.5rem',
                        letterSpacing: '-0.02em', fontFamily: '"Inter", sans-serif',
                        color: '#ffffff'
                    }}>
                        Quản Lý <br /> <span style={{ color: '#818cf8' }}>& Vận Hành Doanh Nghiệp</span>
                    </h1>
                    <p style={{
                        fontSize: '1.25rem', color: '#94a3b8', lineHeight: 1.6, fontWeight: 400,
                        fontFamily: '"Inter", sans-serif', maxWidth: '90%'
                    }}>
                        Hệ thống điều hành doanh nghiệp toàn diện. Tối ưu hóa quy trình nghiệp vụ, số hóa tài liệu, và kết nối với khách hàng.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '2rem', position: 'relative', background: '#ffffff'
            }}>
                <div style={{
                    width: '100%', maxWidth: '440px',
                    padding: '3rem', borderRadius: '24px',
                    background: 'white',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    position: 'relative', zIndex: 10
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#1e293b', letterSpacing: '-0.01em' }}>
                            Chào mừng trở lại!
                        </h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9375rem', fontWeight: 500 }}>
                            Vui lòng đăng nhập để truy cập hệ thống
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem',
                            background: '#fef2f2', color: '#b91c1c', borderRadius: '12px', marginBottom: '2rem',
                            fontSize: '0.875rem', fontWeight: 500, border: '1px solid #fecaca'
                        }}>
                            <ShieldAlert size={20} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                                Email truy cập
                            </label>
                            <Input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{
                                    width: '100%', padding: '0.875rem 1rem', borderRadius: '12px',
                                    border: '1px solid #cbd5e1', fontSize: '1rem',
                                    transition: 'all 0.2s', outline: 'none', backgroundColor: '#f8fafc'
                                }}
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                                    Mật khẩu
                                </label>
                                <Link href="/forgot-password" style={{ fontSize: '0.875rem', color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>
                                    Quên mật khẩu?
                                </Link>
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%', padding: '0.875rem 1rem', borderRadius: '12px',
                                    border: '1px solid #cbd5e1', fontSize: '1rem',
                                    transition: 'all 0.2s', outline: 'none', backgroundColor: '#f8fafc'
                                }}
                            />
                        </div>

                        {showTwoFactor && (
                            <div style={{ animation: 'fadeUp 0.3s ease-out forwards' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                                    Mã xác thực (2FA)
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Ví dụ: 123456"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    maxLength={6}
                                    required={showTwoFactor}
                                    style={{
                                        width: '100%', padding: '0.875rem 1rem', borderRadius: '12px',
                                        border: '1px solid #6366f1', fontSize: '1rem', // Nổi bật viền
                                        transition: 'all 0.2s', outline: 'none', backgroundColor: '#f8fafc',
                                        letterSpacing: '0.2rem', textAlign: 'center', fontWeight: 'bold'
                                    }}
                                />
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', textAlign: 'center' }}>
                                    Lấy mã 6 chữ số từ ứng dụng Authenticator của bạn
                                </p>
                            </div>
                        )}

                        <Button type="submit" disabled={loading} style={{
                            marginTop: '1rem', padding: '1rem', fontSize: '1rem', fontWeight: 600,
                            borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                            color: 'white', border: 'none', cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.2s',
                            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                            transform: loading ? 'scale(0.98)' : 'scale(1)'
                        }}>
                            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                        </Button>
                    </form>

                    <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
                        &copy; 2026 ERP System
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap');
                
                @media (min-width: 768px) {
                    .md-flex { display: flex !important; }
                }
                
                .tech-bg {
                    background: radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%);
                }
                
                .glow-text {
                    text-shadow: 0 0 40px rgba(129, 140, 248, 0.4);
                }
                
                input:focus {
                    border-color: #6366f1 !important;
                    background-color: white !important;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1) !important;
                }
                
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes pulse {
                    from { transform: scale(1); box-shadow: 0 8px 32px rgba(99,102,241,0.2); }
                    to { transform: scale(1.1); box-shadow: 0 12px 40px rgba(168,85,247,0.4); border-color: rgba(255,255,255,0.4); }
                }
                
                .orb-1 {
                    animation: float 20s infinite ease-in-out alternate;
                }
                
                .orb-2 {
                    animation: float 25s infinite ease-in-out alternate-reverse;
                }
                
                @keyframes float {
                    0% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(50px, -50px) scale(1.1); }
                    66% { transform: translate(-30px, 40px) scale(0.9); }
                    100% { transform: translate(0, 0) scale(1); }
                }
            `}} />
        </div>
    );
}
