'use client'

import React, { useState, useEffect } from 'react';
import { 
    MessageSquare, 
    Send, 
    CheckCircle2, 
    Clock, 
    Layers, 
    RefreshCw, 
    Phone, 
    User, 
    Hash, 
    X,
    ExternalLink
} from 'lucide-react';
import { fetchZnsData, sendTestZns } from './actions';

export default function ZnsTemplateClient() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'templates' | 'logs'>('templates');

    // Send Test Modal
    const [showSendModal, setShowSendModal] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [phone, setPhone] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [orderCode, setOrderCode] = useState('SO-2026-001');
    const [amount, setAmount] = useState('15,000,000');
    const [sending, setSending] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const res = await fetchZnsData();
        if (res.success) {
            setTemplates(res.templates || []);
            setLogs(res.logs || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenSend = (templateId: string) => {
        setSelectedTemplateId(templateId);
        setShowSendModal(true);
    };

    const handleSendSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone.trim() || !selectedTemplateId) {
            alert('Vui lòng nhập số điện thoại người nhận');
            return;
        }

        setSending(true);
        const res = await sendTestZns({
            recipientPhone: phone.trim(),
            recipientName: customerName || undefined,
            templateId: selectedTemplateId,
            dataPayload: {
                customer_name: customerName || 'Quý khách',
                order_code: orderCode,
                total_amount: amount,
                tracking_link: 'https://erp.tsol.vn/public/order-demo'
            }
        });
        setSending(false);

        if (res.success) {
            alert(`Gửi tin Zalo ZNS thành công! Mã theo dõi: ${res.result?.trackingId}`);
            setShowSendModal(false);
            setPhone('');
            setCustomerName('');
            loadData();
        } else {
            alert(res.error || 'Lỗi khi gửi tin');
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                        <MessageSquare className="w-5 h-5" /> Omni-Channel CRM & Zalo Notification Service
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Mẫu Tin Nhắn Zalo ZNS & Nhật Ký Gửi</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Gửi thông báo xác nhận đơn hàng, nhắc nợ, báo giá và mời ký số qua kênh tin Zalo ZNS chính thức của TSOL
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'templates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Layers className="w-4 h-4" /> Danh Mục Mẫu Tin ZNS ({templates.length})
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Clock className="w-4 h-4" /> Lịch Sử Gửi Tin ({logs.length})
                </button>
            </div>

            {/* Tab 1: Templates */}
            {activeTab === 'templates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((tmpl) => (
                        <div key={tmpl.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 flex flex-col justify-between shadow-sm">
                            <div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                                            {tmpl.templateId}
                                        </span>
                                        <h3 className="font-bold text-slate-900 dark:text-white mt-1.5">{tmpl.templateName}</h3>
                                    </div>
                                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                                        Đang hoạt động
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl leading-relaxed border border-slate-100 dark:border-slate-800">
                                    {tmpl.content}
                                </p>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                                <span className="text-slate-400">Chi phí: ~{tmpl.pricePerMessage} đ/tin</span>
                                <button
                                    onClick={() => handleOpenSend(tmpl.templateId)}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm"
                                >
                                    <Send className="w-3.5 h-3.5" /> Thử Gửi Tin
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab 2: Logs */}
            {activeTab === 'logs' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    {logs.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="font-semibold text-base">Chưa có nhật ký gửi tin ZNS nào</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold">
                                        <th className="py-3 px-4">Tracking ID</th>
                                        <th className="py-3 px-4">Người Nhận</th>
                                        <th className="py-3 px-4">Mẫu Tin</th>
                                        <th className="py-3 px-4">Trạng Thái</th>
                                        <th className="py-3 px-4">Thời Gian Gửi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                            <td className="py-3 px-4 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                                {log.trackingId || log.id}
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{log.recipientName || 'Khách hàng'}</p>
                                                <span className="text-xs text-slate-400 font-mono">{log.recipientPhone}</span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                                {log.template?.templateName || log.templateId}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-500">
                                                {new Date(log.sentAt).toLocaleString('vi-VN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Send Modal */}
            {showSendModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Thử Nghiệm Gửi Tin Zalo ZNS</h3>
                            <button onClick={() => setShowSendModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSendSubmit} className="space-y-4 text-sm">
                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Mã Template ZNS</label>
                                <input
                                    type="text"
                                    value={selectedTemplateId}
                                    disabled
                                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-blue-600"
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Số điện thoại người nhận <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="VD: 0901234567"
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Họ tên người nhận</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="VD: Nguyễn Văn A"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSendModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm flex items-center gap-2"
                                >
                                    {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Gửi Ngay
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
