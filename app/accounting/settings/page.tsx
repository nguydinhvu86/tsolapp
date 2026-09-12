'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Server, Shield, Key, Settings, Save, CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { getInvoiceSettings, saveInvoiceSettings } from './actions';
import { useRouter } from 'next/navigation';

export default function InvoiceSettingsPage() {
    const router = useRouter();
    const [config, setConfig] = useState({
        INVOICE_SYNC_EMAIL: '',
        INVOICE_SYNC_PASSWORD: '',
        INVOICE_SYNC_HOST: '',
        INVOICE_SYNC_PORT: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        getInvoiceSettings().then(res => {
            if (res) {
                setConfig({
                    INVOICE_SYNC_EMAIL: res.INVOICE_SYNC_EMAIL || '',
                    INVOICE_SYNC_PASSWORD: res.INVOICE_SYNC_PASSWORD || '',
                    INVOICE_SYNC_HOST: res.INVOICE_SYNC_HOST || 'imap.gmail.com',
                    INVOICE_SYNC_PORT: res.INVOICE_SYNC_PORT || '993'
                });
            }
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccessMessage(null);
        setErrorMessage(null);
        try {
            await saveInvoiceSettings(config);
            setSuccessMessage('Đã lưu cấu hình đồng bộ hóa đơn thành công! Hệ thống sẽ áp dụng ngay.');
            router.refresh();
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (e: any) {
            setErrorMessage(e.message || 'Có lỗi xảy ra khi lưu cấu hình.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
                <p className="text-sm font-semibold">Đang tải cấu hình kết nối kế toán...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-white shadow-md shadow-slate-900/20">
                            <Settings className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Cấu Hình Hệ Thống Kế Toán & Hóa Đơn Tự Động
                            </h1>
                            <p className="text-xs text-slate-500">
                                Thiết lập kết nối hòm thư nhận hóa đơn điện tử (XML) và tham số đồng bộ tài chính
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Hệ Thống Trực Tuyến
                    </span>
                </div>
            </div>

            {/* Notification Alerts */}
            {successMessage && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-semibold shadow-xs animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {errorMessage && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-800 dark:text-rose-200 text-xs font-semibold shadow-xs animate-fadeIn">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Main Form Box */}
            <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Thông Số Hòm Thư Đồng Bộ Hóa Đơn Đầu Vào (IMAP Protocol)
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Robot kế toán sẽ tự động đăng nhập hòm thư để tải và bóc tách XML hóa đơn các nhà cung cấp
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Mail size={15} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Email Nhận Hóa Đơn (IMAP User)</span>
                                <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                type="email" 
                                required
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                                placeholder="ketoan@congty.com"
                                value={config.INVOICE_SYNC_EMAIL}
                                onChange={e => setConfig({...config, INVOICE_SYNC_EMAIL: e.target.value})}
                            />
                            <p className="text-[11px] text-slate-500">Email kế toán dùng để nhận thư điện tử hóa đơn từ NCC</p>
                        </div>
                        
                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Key size={15} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Mật Khẩu Ứng Dụng (App Password)</span>
                                <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                type="password" 
                                required
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                                placeholder="••••••••••••••••"
                                value={config.INVOICE_SYNC_PASSWORD}
                                onChange={e => setConfig({...config, INVOICE_SYNC_PASSWORD: e.target.value})}
                            />
                            <p className="text-[11px] text-slate-500">Nếu dùng Gmail / Google Workspace, sử dụng Mật khẩu ứng dụng 16 ký tự</p>
                        </div>

                        {/* Host */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Server size={15} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Máy Chủ IMAP (Host Server)</span>
                                <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                required
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                                placeholder="imap.gmail.com"
                                value={config.INVOICE_SYNC_HOST}
                                onChange={e => setConfig({...config, INVOICE_SYNC_HOST: e.target.value})}
                            />
                            <p className="text-[11px] text-slate-500">Mặc định: imap.gmail.com (Hoặc máy chủ mail riêng của cty)</p>
                        </div>

                        {/* Port */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Shield size={15} className="text-emerald-600 dark:text-emerald-400" />
                                <span>Cổng Kết Nối SSL/TLS (Port)</span>
                                <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                required
                                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                                placeholder="993"
                                value={config.INVOICE_SYNC_PORT}
                                onChange={e => setConfig({...config, INVOICE_SYNC_PORT: e.target.value})}
                            />
                            <p className="text-[11px] text-slate-500">Mặc định IMAP SSL: 993</p>
                        </div>
                    </div>
                </div>

                {/* Footer Toolbar */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Cấu hình có hiệu lực tức thì sau khi lưu thành công.</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Đang Lưu Cấu Hình...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Lưu & Kích Hoạt Cấu Hình</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
            
            {/* Guide Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-lg space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                    <Info className="w-5 h-5" />
                    <h3>Nguyên Lý Hoạt Động & Khuyến Nghị An Toàn</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-white mb-1.5">1. Đồng bộ tự động & thủ công</h4>
                        <p className="leading-relaxed text-slate-300">
                            Mỗi khi bạn nhấn <strong className="text-emerald-400">"Quét Hóa Đơn Mới"</strong> tại mục Hóa Đơn Đầu Vào, hệ thống sẽ kết nối đến hòm thư này, tự động trích xuất các tệp XML đính kèm, đối chiếu và nhập vào cơ sở dữ liệu.
                        </p>
                    </div>
                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-white mb-1.5">2. Bảo mật tài khoản</h4>
                        <p className="leading-relaxed text-slate-300">
                            Khuyến nghị nên tạo một tài khoản Gmail riêng (hoặc hộp thư phụ) chỉ để tiếp nhận hóa đơn đầu vào, và bật xác thực 2 bước kèm Mật khẩu ứng dụng chuyên biệt.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
