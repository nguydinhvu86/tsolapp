'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Server, Shield, Key } from 'lucide-react';
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

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveInvoiceSettings(config);
            alert("Đã lưu cấu hình thành công!");
            router.refresh();
        } catch (e: any) {
            alert(e.message || "Có lỗi xảy ra khi lưu.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Đang tải cấu hình...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Cấu Hình Hóa Đơn Điện Tử Tự Động</h1>
                <p className="text-gray-500 mt-1">Thiết lập tài khoản Email để phần mềm tự động đọc và xử lý hóa đơn (XML) đầu vào.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Mail size={16} className="text-indigo-500" /> Email Kế Toán (IMAP)
                        </label>
                        <input 
                            type="email" 
                            className="w-full p-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="ketoan@congty.com"
                            value={config.INVOICE_SYNC_EMAIL}
                            onChange={e => setConfig({...config, INVOICE_SYNC_EMAIL: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Key size={16} className="text-indigo-500" /> Mật khẩu ứng dụng (App Password)
                        </label>
                        <input 
                            type="password" 
                            className="w-full p-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="Nhập mật khẩu IMAP"
                            value={config.INVOICE_SYNC_PASSWORD}
                            onChange={e => setConfig({...config, INVOICE_SYNC_PASSWORD: e.target.value})}
                        />
                        <p className="text-xs text-gray-500">Nếu dùng Gmail, vui lòng tạo App Password (16 ký tự).</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Server size={16} className="text-indigo-500" /> Máy chủ IMAP (Host)
                        </label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="imap.gmail.com"
                            value={config.INVOICE_SYNC_HOST}
                            onChange={e => setConfig({...config, INVOICE_SYNC_HOST: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Shield size={16} className="text-indigo-500" /> Cổng (Port)
                        </label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            placeholder="993"
                            value={config.INVOICE_SYNC_PORT}
                            onChange={e => setConfig({...config, INVOICE_SYNC_PORT: e.target.value})}
                        />
                    </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition disabled:bg-indigo-400"
                    >
                        {saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                    </button>
                </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
                <h4 className="font-semibold mb-1 flex items-center gap-2">
                    💡 Hướng dẫn hoạt động
                </h4>
                <p>Hệ thống tự động sử dụng cấu hình này mỗi lần nút <strong>"Quét Hóa Đơn Mới"</strong> tại trang Kế Toán Hóa Đơn được kích hoạt. Không cần phải khởi động lại máy chủ (Restart Server) khi thay đổi ở đây.</p>
            </div>
        </div>
    );
}
