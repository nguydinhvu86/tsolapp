'use client';

import React, { useState } from 'react';
import { updateEmailSettings, testEmailConnection } from './actions';
import { Button } from '@/app/components/ui/Button';
import { 
    Save, 
    Mail, 
    CheckCircle2, 
    AlertCircle, 
    RefreshCw, 
    Server, 
    KeyRound, 
    UserCheck,
    Send,
    ShieldCheck
} from 'lucide-react';
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
        setTestResult(null);
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

    const isConfigured = Boolean(settings.SMTP_HOST && settings.SMTP_USER);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">Cấu Hình Máy Chủ Email (SMTP)</h1>
                            {isConfigured ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Đã cấu hình
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                    Chưa hoàn tất
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Thiết lập kết nối máy chủ gửi email tự động cho báo giá, hóa đơn và thông báo</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting || isSaving}
                        variant="secondary"
                        className="gap-2 border-slate-200"
                    >
                        {isTesting ? <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> : <Send className="w-4 h-4 text-blue-600" />}
                        {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                    </Button>
                    <Button
                        type="submit"
                        form="smtp-form"
                        disabled={isSaving || isTesting}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                    </Button>
                </div>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Máy chủ SMTP</div>
                        <div className="text-sm font-mono font-bold text-slate-900 mt-1 truncate max-w-[180px]">
                            {settings.SMTP_HOST || 'Chưa thiết lập'}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Server className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tài khoản gửi</div>
                        <div className="text-sm font-mono font-bold text-indigo-600 mt-1 truncate max-w-[180px]">
                            {settings.SMTP_USER || 'Chưa thiết lập'}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <UserCheck className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cổng & Bảo mật</div>
                        <div className="text-sm font-mono font-bold text-emerald-600 mt-1">
                            Port {settings.SMTP_PORT} • {settings.SMTP_SECURE === 'true' ? 'SSL' : 'TLS'}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Test Result Alert */}
            {testResult && (
                <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-xs animate-fade-in ${
                    testResult.success 
                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' 
                        : 'bg-rose-50/90 border-rose-200 text-rose-800'
                }`}>
                    {testResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                        <h4 className="text-sm font-bold">
                            {testResult.success ? 'Kết nối máy chủ SMTP thành công!' : 'Lỗi kết nối / Đăng nhập SMTP thất bại'}
                        </h4>
                        <p className="text-xs mt-0.5 opacity-90">{testResult.message}</p>
                    </div>
                </div>
            )}

            {/* Main Config Form */}
            <form id="smtp-form" onSubmit={handleSave} className="space-y-6">
                {/* 1. Máy chủ */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Server className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">1. Thông Tin Máy Chủ (SMTP Server)</h3>
                            <p className="text-xs text-slate-500">Địa chỉ máy chủ SMTP và cổng kết nối giao thức</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                SMTP Host <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="SMTP_HOST"
                                value={settings.SMTP_HOST}
                                onChange={handleChange}
                                required
                                placeholder="vd: smtp.gmail.com hoặc mail.company.com"
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    SMTP Port <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="SMTP_PORT"
                                    value={settings.SMTP_PORT}
                                    onChange={handleChange}
                                    required
                                    placeholder="587 hoặc 465"
                                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Bảo Mật (SSL)
                                </label>
                                <select
                                    name="SMTP_SECURE"
                                    value={settings.SMTP_SECURE}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                >
                                    <option value="false">False (Port 587 / TLS)</option>
                                    <option value="true">True (Port 465 / SSL)</option>
                                </select>
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Bỏ Qua Lỗi Chứng Chỉ Tự Cấp (Ignore TLS Errors)
                            </label>
                            <select
                                name="SMTP_IGNORE_TLS"
                                value={settings.SMTP_IGNORE_TLS}
                                onChange={handleChange}
                                className="w-full sm:w-1/2 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            >
                                <option value="false">Không - Bắt buộc SSL hợp lệ (Khuyên dùng)</option>
                                <option value="true">Có - Chấp nhận Self-signed Certificate</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Xác thực */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">2. Xác Thực Đăng Nhập (Authentication)</h3>
                            <p className="text-xs text-slate-500">Tài khoản và mật khẩu ứng dụng để xác thực với máy chủ SMTP</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Tên Đăng Nhập (Email / Username) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="SMTP_USER"
                                value={settings.SMTP_USER}
                                onChange={handleChange}
                                required
                                placeholder="vd: contact@company.com"
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Mật Khẩu Ứng Dụng (App Password) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="password"
                                name="SMTP_PASS"
                                value={settings.SMTP_PASS}
                                onChange={handleChange}
                                required
                                placeholder="••••••••••••••••"
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                                Với Gmail/Google Workspace, bạn cần dùng Mật khẩu ứng dụng (App Password) từ Tài khoản Google.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. Người gửi */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Send className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">3. Thông Tin Người Gửi Hiển Thị (Sender Profile)</h3>
                            <p className="text-xs text-slate-500">Tên hiển thị và địa chỉ email gửi đi trong hộp thư khách hàng</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Tên Người Gửi (From Name)
                            </label>
                            <input
                                type="text"
                                name="SMTP_FROM_NAME"
                                value={settings.SMTP_FROM_NAME}
                                onChange={handleChange}
                                placeholder="vd: Công ty TNHH Giải Pháp Công Nghệ T-Sol"
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Email Gửi Đi (From Email - Tùy chọn)
                            </label>
                            <input
                                type="email"
                                name="SMTP_FROM_EMAIL"
                                value={settings.SMTP_FROM_EMAIL}
                                onChange={handleChange}
                                placeholder="Để trống sẽ mặc định dùng Tên đăng nhập"
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting || isSaving}
                        variant="secondary"
                        className="gap-2 border-slate-200"
                    >
                        {isTesting ? <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> : <Send className="w-4 h-4 text-blue-600" />}
                        {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSaving || isTesting}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
