'use client';

import React, { useState } from 'react';
import { updateEmailSettings, testEmailConnection } from './actions';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Save, Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function EmailConfigClient({ initialSettings }: { initialSettings: Record<string, string> }) {
    const router = useRouter();
    const [settings, setSettings] = useState({
        SMTP_HOST: initialSettings.SMTP_HOST || '',
        SMTP_PORT: initialSettings.SMTP_PORT || '587',
        SMTP_SECURE: initialSettings.SMTP_SECURE || 'false',
        SMTP_IGNORE_TLS: initialSettings.SMTP_IGNORE_TLS || 'false',
        SMTP_USER: initialSettings.SMTP_USER || '',
        SMTP_PASS: initialSettings.SMTP_PASS || '',
        SMTP_FROM_NAME: initialSettings.SMTP_FROM_NAME || '',
        SMTP_FROM_EMAIL: initialSettings.SMTP_FROM_EMAIL || ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setTestResult(null); // Clear test result on change
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateEmailSettings(settings);
            alert('Lưu cấu hình Email thành công!');
            router.refresh();
        } catch (error) {
            alert('Có lỗi xảy ra khi lưu cấu hình');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        if (!settings.SMTP_HOST || !settings.SMTP_PORT || !settings.SMTP_USER || !settings.SMTP_PASS) {
            alert('Vui lòng điền đầy đủ Host, Port, Username và Password để kiểm tra kết nối.');
            return;
        }

        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await testEmailConnection(settings) as { success: boolean, message?: string, error?: string };
            setTestResult({ success: result.success, message: result.message || result.error || 'Lỗi hệ thống' });
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || 'Lỗi hệ thống' });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div style={{ padding: '0', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0', letterSpacing: '-0.025em' }}>Cấu Hình Máy Chủ Email (SMTP)</h1>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Các thông số này được sử dụng để hệ thống tự động gửi email báo giá, hóa đơn tới khách hàng.</p>
                </div>
            </div>

            <Card style={{ padding: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>

                    {/* Máy chủ */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Cài đặt Máy chủ (SMTP Server)</h3>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>SMTP Host <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="SMTP_HOST"
                            value={settings.SMTP_HOST}
                            onChange={handleChange}
                            required
                            placeholder="vd: smtp.gmail.com"
                            style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.15s ease-in-out', fontSize: '0.875rem' }}
                            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>SMTP Port <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="text"
                                name="SMTP_PORT"
                                value={settings.SMTP_PORT}
                                onChange={handleChange}
                                required
                                placeholder="vd: 587 hoặc 465"
                                style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.15s ease-in-out', fontSize: '0.875rem' }}
                                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Secure (SSL/TLS)</label>
                            <select
                                name="SMTP_SECURE"
                                value={settings.SMTP_SECURE}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', transition: 'border-color 0.15s ease-in-out', fontSize: '0.875rem' }}
                                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                            >
                                <option value="false">False (Thường dùng Port 587 / TLS)</option>
                                <option value="true">True (Thường dùng Port 465 / SSL)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Bỏ qua lỗi Chứng chỉ (Ignore SSL/TLS)</label>
                            <select
                                name="SMTP_IGNORE_TLS"
                                value={settings.SMTP_IGNORE_TLS}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', transition: 'border-color 0.15s ease-in-out', fontSize: '0.875rem' }}
                                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                            >
                                <option value="false">Không (Khuyên dùng)</option>
                                <option value="true">Có (Bỏ qua lỗi tự cấp chứng chỉ)</option>
                            </select>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>Chọn "Có" nếu dùng máy chủ riêng bị lỗi chứng chỉ.</p>
                        </div>
                    </div>

                    {/* Xác thực */}
                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Xác thực (Authentication)</h3>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Tên đăng nhập (Username / Email) <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            name="SMTP_USER"
                            value={settings.SMTP_USER}
                            onChange={handleChange}
                            required
                            placeholder="vd: contact@company.com"
                            style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.15s ease-in-out', fontSize: '0.875rem' }}
                            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Mật khẩu (App Password) <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="password"
                            name="SMTP_PASS"
                            value={settings.SMTP_PASS}
                            onChange={handleChange}
                            required
                            placeholder="Mật khẩu ứng dụng"
                            style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.15s ease-in-out', fontSize: '0.875rem' }}
                            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>* Đối với Gmail, hãy sử dụng Mật khẩu ứng dụng (App Password) thay vì mật khẩu thông thường.</p>
                    </div>

                    {/* Định dạng Gửi */}
                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Tùy chỉnh Người Gửi (Sender Info)</h3>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Tên người gửi (From Name)</label>
                        <input
                            type="text"
                            name="SMTP_FROM_NAME"
                            value={settings.SMTP_FROM_NAME}
                            onChange={handleChange}
                            placeholder="vd: Công ty TNHH ContractMgr"
                            style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.15s ease-in-out', fontSize: '0.875rem' }}
                            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.5rem' }}>Email người gửi (From Email) - Tùy chọn</label>
                        <input
                            type="email"
                            name="SMTP_FROM_EMAIL"
                            value={settings.SMTP_FROM_EMAIL}
                            onChange={handleChange}
                            placeholder="Để trống sẽ mặc định dùng Tên đăng nhập"
                            style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none', transition: 'border-color 0.15s ease-in-out', fontSize: '0.875rem' }}
                            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                    </div>

                    {testResult && (
                        <div style={{ gridColumn: '1 / -1', marginTop: '1rem', padding: '1rem', borderRadius: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', backgroundColor: testResult.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`, color: testResult.success ? '#166534' : '#991b1b' }}>
                            {testResult.success ? <CheckCircle size={20} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />}
                            <div>
                                <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.875rem' }}>{testResult.success ? 'Kết nối thành công!' : 'Lỗi kết nối / Đăng nhập thất bại'}</h4>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>{testResult.message}</p>
                            </div>
                        </div>
                    )}

                    <div style={{ gridColumn: '1 / -1', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-start', gap: '1rem' }}>
                        <Button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={isTesting || isSaving}
                            className="btn-secondary"
                            style={{ padding: '0.625rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#334155' }}
                        >
                            {isTesting ? <RefreshCw size={18} className="animate-spin" /> : <Mail size={18} />}
                            {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving || isTesting}
                            style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                            {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                        </Button>
                    </div>

                </form>
            </Card>
        </div>
    );
}
