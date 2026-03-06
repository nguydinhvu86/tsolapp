'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { ShieldAlert, CheckCircle2, ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '../auth/actions';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('LOADING');
        setMessage('');

        const res = await requestPasswordReset(email);

        if (res.success) {
            setStatus('SUCCESS');
            setMessage(res.message || 'Thành công.');
        } else {
            setStatus('ERROR');
            setMessage(res.error || 'Đã xảy ra lỗi.');
        }
    };

    return (
        <div style={{
            display: 'flex', minHeight: '100vh', width: '100%',
            backgroundColor: '#f8fafc', fontFamily: '"Inter", sans-serif',
            alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div style={{
                width: '100%', maxWidth: '440px',
                padding: '3rem', borderRadius: '24px',
                background: 'white',
                boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
                border: '1px solid rgba(0,0,0,0.05)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '56px', height: '56px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                        color: 'white', marginBottom: '1.5rem',
                        boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)',
                    }}>
                        <ShieldAlert size={28} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#1e293b', letterSpacing: '-0.01em' }}>
                        Khôi phục mật khẩu
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9375rem', fontWeight: 500 }}>
                        Nhập email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
                    </p>
                </div>

                {status === 'SUCCESS' ? (
                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem',
                            background: '#f0fdf4', color: '#166534', borderRadius: '12px', marginBottom: '2rem',
                            fontSize: '0.9375rem', fontWeight: 500, border: '1px solid #bbf7d0', textAlign: 'left'
                        }}>
                            <CheckCircle2 size={24} className="min-w-[24px]" />
                            <p style={{ margin: 0 }}>{message}</p>
                        </div>
                        <Link href="/login" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            color: '#4f46e5', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s'
                        }}>
                            <ArrowLeft size={16} /> Quay lại trang đăng nhập
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
                        {status === 'ERROR' && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem',
                                background: '#fef2f2', color: '#b91c1c', borderRadius: '12px',
                                fontSize: '0.875rem', fontWeight: 500, border: '1px solid #fecaca'
                            }}>
                                <ShieldAlert size={20} />
                                {message}
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                                Email đã đăng ký
                            </label>
                            <Input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={status === 'LOADING'}
                                style={{
                                    width: '100%', padding: '0.875rem 1rem', borderRadius: '12px',
                                    border: '1px solid #cbd5e1', fontSize: '1rem',
                                    transition: 'all 0.2s', outline: 'none', backgroundColor: '#f8fafc'
                                }}
                            />
                        </div>

                        <Button type="submit" disabled={status === 'LOADING'} style={{
                            marginTop: '0.5rem', padding: '1rem', fontSize: '1rem', fontWeight: 600,
                            borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                            color: 'white', border: 'none', cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.2s',
                            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                            transform: status === 'LOADING' ? 'scale(0.98)' : 'scale(1)'
                        }}>
                            {status === 'LOADING' ? 'Đang gửi yêu cầu...' : 'Gửi link khôi phục'}
                        </Button>

                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <Link href="/login" style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                                color: '#64748b', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none'
                            }}>
                                <ArrowLeft size={16} /> Quay về Đăng nhập
                            </Link>
                        </div>
                    </form>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                input:focus { border-color: #6366f1 !important; background-color: white !important; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1) !important; }
            `}} />
        </div>
    );
}
