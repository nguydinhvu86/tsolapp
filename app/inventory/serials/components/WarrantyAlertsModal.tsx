'use client'

import React, { useState, useEffect } from 'react';
import { toast } from '@/app/components/providers/ToastProvider';
import { 
    X, 
    Bell, 
    BellRing, 
    Mail, 
    Send, 
    CheckCircle2, 
    AlertTriangle, 
    Clock, 
    Settings, 
    Eye, 
    RefreshCw, 
    User, 
    FileText, 
    SlidersHorizontal,
    CheckSquare,
    Square,
    Sparkles,
    ShieldAlert,
    ExternalLink
} from 'lucide-react';
import { 
    getWarrantyAlertSettings, 
    saveWarrantyAlertSettings, 
    getExpiringWarrantiesAction, 
    sendWarrantyAlertEmailAction, 
    triggerAutoWarrantyScanAction 
} from '../actions';

interface WarrantyAlertsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function WarrantyAlertsModal({
    isOpen,
    onClose,
    onSuccess
}: WarrantyAlertsModalProps) {
    const [activeTab, setActiveTab] = useState<'LIST' | 'SEND' | 'SETTINGS'>('LIST');

    // List State
    const [filterDays, setFilterDays] = useState<number | 'EXPIRED' | 'ALL'>(30);
    const [expiringList, setExpiringList] = useState<any[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [selectedSerialIds, setSelectedSerialIds] = useState<string[]>([]);

    // Settings State
    const [autoEnabled, setAutoEnabled] = useState(false);
    const [daysBefore, setDaysBefore] = useState(30);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
    const [savingSettings, setSavingSettings] = useState(false);
    const [triggeringScan, setTriggeringScan] = useState(false);

    // Email Send State
    const [customSubject, setCustomSubject] = useState('[CẢNH BÁO BẢO HÀNH] Thiết bị {product_name} (SN: {serial_number}) sắp hết hạn');
    const [customBody, setCustomBody] = useState('');
    const [sendingEmails, setSendingEmails] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Load Data
    const loadExpiringData = async () => {
        setLoadingList(true);
        try {
            const res = await getExpiringWarrantiesAction(filterDays);
            if (res.success) {
                setExpiringList(res.serials || []);
            }
        } catch (e) {
            console.error('Lỗi tải danh sách sắp hết hạn:', e);
        } finally {
            setLoadingList(false);
        }
    };

    const loadSettings = async () => {
        try {
            const res = await getWarrantyAlertSettings();
            if (res.success) {
                setAutoEnabled(res.settings.autoEnabled);
                setDaysBefore(res.settings.daysBefore);
                setSelectedTemplateId(res.settings.templateId);
                setCustomSubject(res.settings.customSubject);
                setCustomBody(res.settings.customBody);
                setEmailTemplates(res.emailTemplates || []);
            }
        } catch (e) {
            console.error('Lỗi tải cài đặt cảnh báo:', e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadExpiringData();
            loadSettings();
        }
    }, [isOpen, filterDays]);

    if (!isOpen) return null;

    // Toggle Select All
    const handleSelectAll = () => {
        const emailableSerials = expiringList.filter(s => s.hasEmail).map(s => s.id);
        if (selectedSerialIds.length === emailableSerials.length) {
            setSelectedSerialIds([]);
        } else {
            setSelectedSerialIds(emailableSerials);
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedSerialIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Save Settings
    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const res = await saveWarrantyAlertSettings({
                autoEnabled,
                daysBefore,
                templateId: selectedTemplateId,
                customSubject,
                customBody
            });
            if (res.success) {
                toast.success('Đã lưu cấu hình cảnh báo bảo hành thành công!');
            } else {
                toast.error(res.error || 'Lỗi khi lưu cài đặt');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi hệ thống');
        } finally {
            setSavingSettings(false);
        }
    };

    // Trigger Scan Now
    const handleTriggerScan = async () => {
        setTriggeringScan(true);
        try {
            const res = await triggerAutoWarrantyScanAction();
            if (res.success) {
                toast.success(res.message || 'Quét và gửi cảnh báo tự động hoàn tất!');
                loadExpiringData();
                onSuccess();
            } else {
                toast.error(res.error || 'Có lỗi xảy ra');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi hệ thống');
        } finally {
            setTriggeringScan(false);
        }
    };

    // Quick Send for single or multiple
    const handlePrepareSendSelected = () => {
        if (selectedSerialIds.length === 0) {
            toast.warning('Vui lòng chọn ít nhất một thiết bị có địa chỉ Email để gửi');
            return;
        }
        setActiveTab('SEND');
    };

    const handleSendForSingle = (serialId: string) => {
        setSelectedSerialIds([serialId]);
        setActiveTab('SEND');
    };

    // Template selection change
    const handleTemplateSelectChange = (templateId: string) => {
        setSelectedTemplateId(templateId);
        if (!templateId) {
            setCustomSubject('[CẢNH BÁO BẢO HÀNH] Thiết bị {product_name} (SN: {serial_number}) sắp hết hạn');
            setCustomBody('');
            return;
        }
        const found = emailTemplates.find(t => t.id === templateId);
        if (found) {
            setCustomSubject(found.subject || '');
            setCustomBody(found.body || '');
        }
    };

    // Send emails
    const handleConfirmSendEmails = async () => {
        if (selectedSerialIds.length === 0) {
            toast.warning('Chưa chọn thiết bị nào để gửi cảnh báo');
            return;
        }

        setSendingEmails(true);
        try {
            const res = await sendWarrantyAlertEmailAction({
                serialIds: selectedSerialIds,
                templateId: selectedTemplateId || undefined,
                customSubject,
                customBody
            });

            if (res.success) {
                toast.success(res.message || `Đã gửi thành công ${res.sentCount} email cảnh báo!`);
                if (res.errors && res.errors.length > 0) {
                    toast.warning(`Có ${res.errors.length} cảnh báo cần lưu ý (xem nhật ký)`);
                }
                setSelectedSerialIds([]);
                setActiveTab('LIST');
                loadExpiringData();
                onSuccess();
            } else {
                toast.error(res.error || 'Lỗi khi gửi email');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi hệ thống');
        } finally {
            setSendingEmails(false);
        }
    };

    // Quick Stats Calculation
    const count7Days = expiringList.filter(s => s.daysRemaining <= 7 && !s.isExpired).length;
    const count30Days = expiringList.filter(s => s.daysRemaining <= 30 && !s.isExpired).length;
    const countExpired = expiringList.filter(s => s.isExpired).length;

    // Selected items for preview
    const sampleSerial = expiringList.find(s => selectedSerialIds.includes(s.id)) || expiringList[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/50">
                            <BellRing className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                    Cảnh Báo Hết Hạn Bảo Hành & Gửi Email Cho Khách Hàng
                                </h3>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    autoEnabled 
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300' 
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                    Tự động: {autoEnabled ? 'BẬT' : 'TẮT'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Quản lý danh sách thiết bị sắp hết hạn, tự động gửi hoặc chọn mẫu email gửi thủ công bằng tay
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('LIST')}
                            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'LIST'
                                    ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <Clock className="w-4 h-4" />
                            Danh Sách Sắp Hết Hạn ({expiringList.length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('SEND')}
                            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'SEND'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <Send className="w-4 h-4" />
                            Soạn & Gửi Email {selectedSerialIds.length > 0 && `(${selectedSerialIds.length} đã chọn)`}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('SETTINGS')}
                            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeTab === 'SETTINGS'
                                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            Cấu Hình Bật / Tắt Tự Động
                        </button>
                    </div>

                    {activeTab === 'LIST' && selectedSerialIds.length > 0 && (
                        <button
                            type="button"
                            onClick={handlePrepareSendSelected}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer mb-1.5"
                        >
                            <Send className="w-3.5 h-3.5" />
                            Gửi Email ({selectedSerialIds.length})
                        </button>
                    )}
                </div>

                {/* TAB 1: LIST OF EXPIRING WARRANTIES */}
                {activeTab === 'LIST' && (
                    <div className="space-y-4">
                        {/* Filter Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500">Bộ lọc thời hạn:</span>
                                {[
                                    { label: 'Sắp hết hạn trong 7 ngày', value: 7, count: count7Days, color: 'text-rose-600' },
                                    { label: 'Sắp hết hạn trong 15 ngày', value: 15, color: 'text-amber-600' },
                                    { label: 'Sắp hết hạn trong 30 ngày', value: 30, count: count30Days, color: 'text-blue-600' },
                                    { label: 'Đã quá hạn bảo hành', value: 'EXPIRED', count: countExpired, color: 'text-slate-600' },
                                    { label: 'Tất cả thiết bị', value: 'ALL', color: 'text-slate-700' },
                                ].map((tab) => (
                                    <button
                                        key={String(tab.value)}
                                        type="button"
                                        onClick={() => setFilterDays(tab.value as any)}
                                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            filterDays === tab.value
                                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={loadExpiringData}
                                title="Tải lại danh sách"
                                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Expiring Table */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                            {loadingList ? (
                                <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                                    Đang tải danh sách thiết bị sắp hết hạn...
                                </div>
                            ) : expiringList.length === 0 ? (
                                <div className="p-10 text-center text-slate-500 text-xs">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                                    <span className="font-semibold text-sm block">Không có thiết bị nào sắp hết hạn trong mốc thời gian này</span>
                                    <span className="text-slate-400 mt-1 block">Tất cả thiết bị đều đang trong thời hạn bảo hành an toàn!</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold uppercase text-[10px]">
                                            <tr>
                                                <th className="py-2.5 px-3 w-8 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={handleSelectAll}
                                                        className="text-slate-400 hover:text-blue-600"
                                                        title="Chọn tất cả thiết bị có email"
                                                    >
                                                        {selectedSerialIds.length > 0 && selectedSerialIds.length === expiringList.filter(s => s.hasEmail).length ? (
                                                            <CheckSquare className="w-4 h-4 text-blue-600" />
                                                        ) : (
                                                            <Square className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </th>
                                                <th className="py-2.5 px-3">Khách Hàng Mua</th>
                                                <th className="py-2.5 px-3">Thiết Bị / Sản Phẩm</th>
                                                <th className="py-2.5 px-3">Số Serial / IMEI</th>
                                                <th className="py-2.5 px-3">Hạn Bảo Hành Chót</th>
                                                <th className="py-2.5 px-3">Trạng Thái Cảnh Báo</th>
                                                <th className="py-2.5 px-3 text-right">Thao Tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {expiringList.map((s) => {
                                                const isSelected = selectedSerialIds.includes(s.id);
                                                return (
                                                    <tr 
                                                        key={s.id}
                                                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                                                            isSelected ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                                                        }`}
                                                    >
                                                        <td className="py-2.5 px-3 text-center">
                                                            {s.hasEmail ? (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => handleToggleSelect(s.id)}
                                                                    className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                                                                />
                                                            ) : (
                                                                <span className="text-slate-300" title="Chưa có email">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {s.customerName}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400">
                                                                {s.customerEmail ? (
                                                                    <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                        <Mail className="w-3 h-3" /> {s.customerEmail}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-rose-500 italic">Chưa có email</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={s.productName}>
                                                                {s.productName}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-mono">
                                                                SKU: {s.sku}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                                                            {s.serialNumber}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-bold text-slate-900 dark:text-white">
                                                                {s.warrantyEndDate ? new Date(s.warrantyEndDate).toLocaleDateString('vi-VN') : 'N/A'}
                                                            </div>
                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                s.isExpired 
                                                                    ? 'bg-rose-100 text-rose-700' 
                                                                    : s.daysRemaining <= 7 
                                                                        ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                                                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                            }`}>
                                                                {s.badgeText}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {s.lastAlert ? (
                                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                                                                    ✓ {s.lastAlert.replace('[', '').replace(']', '')}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400 italic">
                                                                    Chưa gửi email
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            {s.hasEmail ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSendForSingle(s.id)}
                                                                    className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <Send className="w-3 h-3" /> Gửi Mail
                                                                </button>
                                                            ) : (
                                                                <span className="text-slate-400 text-[11px] italic">Thiếu email</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: SEND & CUSTOMIZE EMAIL TEMPLATE */}
                {activeTab === 'SEND' && (
                    <div className="space-y-4">
                        {/* Recipients Summary */}
                        <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-blue-600" />
                                <span>
                                    Đang chuẩn bị gửi cho <strong>{selectedSerialIds.length}</strong> thiết bị / khách hàng đã chọn.
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveTab('LIST')}
                                className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                            >
                                Thay đổi danh sách nhận
                            </button>
                        </div>

                        {/* Template Picker */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Chọn Mẫu Email (Email Template)
                                </label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={(e) => handleTemplateSelectChange(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                                >
                                    <option value="">-- Mẫu mặc định chuyên nghiệp hệ thống (Khuyên dùng) --</option>
                                    {emailTemplates.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.module || 'Chung'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Xem trước Email (Live Preview)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <Eye className="w-4 h-4" />
                                    {showPreview ? 'Ẩn xem trước' : 'Bật xem trước mẫu email thực tế'}
                                </button>
                            </div>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                Tiêu đề Email (Subject) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={customSubject}
                                onChange={(e) => setCustomSubject(e.target.value)}
                                placeholder="Tiêu đề email..."
                                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                                Hỗ trợ các biến tự động: <code className="text-blue-600 font-bold">{'{customer_name}'}</code>, <code className="text-blue-600 font-bold">{'{product_name}'}</code>, <code className="text-blue-600 font-bold">{'{serial_number}'}</code>, <code className="text-blue-600 font-bold">{'{warranty_end_date}'}</code>, <code className="text-blue-600 font-bold">{'{days_remaining}'}</code>
                            </span>
                        </div>

                        {/* Optional HTML Body Editor */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                Nội dung Email HTML (để trống nếu muốn dùng mẫu thiết kế mặc định)
                            </label>
                            <textarea
                                rows={4}
                                value={customBody}
                                onChange={(e) => setCustomBody(e.target.value)}
                                placeholder="Nhập mã HTML hoặc nội dung tùy chỉnh..."
                                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Live Preview Card */}
                        {showPreview && sampleSerial && (
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    Mô phỏng Email sẽ gửi tới khách hàng: {sampleSerial.customerName}
                                </span>
                                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-2">
                                    <div className="border-b pb-2">
                                        <strong className="text-slate-900 dark:text-white">Tiêu đề: </strong>
                                        <span className="text-blue-600 font-semibold">
                                            {customSubject
                                                .replace(/{customer_name}/g, sampleSerial.customerName)
                                                .replace(/{product_name}/g, sampleSerial.productName)
                                                .replace(/{serial_number}/g, sampleSerial.serialNumber)
                                                .replace(/{warranty_end_date}/g, sampleSerial.warrantyEndDate ? new Date(sampleSerial.warrantyEndDate).toLocaleDateString('vi-VN') : '')
                                                .replace(/{days_remaining}/g, String(sampleSerial.daysRemaining))}
                                        </span>
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                                        Kính gửi Quý khách hàng <strong>{sampleSerial.customerName}</strong>,<br />
                                        Thiết bị <strong>{sampleSerial.productName}</strong> (Số Serial: <code className="font-bold text-blue-600">{sampleSerial.serialNumber}</code>) của Quý khách sẽ hết hạn bảo hành vào ngày <strong>{sampleSerial.warrantyEndDate ? new Date(sampleSerial.warrantyEndDate).toLocaleDateString('vi-VN') : ''}</strong> (còn {sampleSerial.daysRemaining} ngày).<br />
                                        Vui lòng liên hệ với chúng tôi để kiểm tra bảo dưỡng miễn phí hoặc gia hạn bảo hành!
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Send Action */}
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setActiveTab('LIST')}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                                Quay lại danh sách
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSendEmails}
                                disabled={sendingEmails || selectedSerialIds.length === 0}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                {sendingEmails ? 'Đang gửi email...' : `Xác Nhận Gửi Email Cho ${selectedSerialIds.length} Thiết Bị`}
                            </button>
                        </div>
                    </div>
                )}

                {/* TAB 3: AUTOMATION SETTINGS */}
                {activeTab === 'SETTINGS' && (
                    <div className="space-y-5">
                        {/* Main Toggle Switch */}
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-emerald-600" />
                                    Tự Động Gửi Cảnh Báo Bảo Hành Khi Sắp Hết Hạn
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                                    Khi bật, hệ thống sẽ tự động gửi email cảnh báo bảo hành tới tất cả khách hàng sở hữu thiết bị khi thời hạn bảo hành còn lại chạm mốc quy định.
                                </p>
                            </div>

                            {/* Toggle Button */}
                            <button
                                type="button"
                                onClick={() => setAutoEnabled(!autoEnabled)}
                                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    autoEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        autoEnabled ? 'translate-x-7' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Settings Form */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Số ngày cảnh báo trước khi hết hạn
                                </label>
                                <select
                                    value={daysBefore}
                                    onChange={(e) => setDaysBefore(parseInt(e.target.value, 10))}
                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                                >
                                    <option value={7}>Báo trước 7 ngày (Khẩn cấp)</option>
                                    <option value={15}>Báo trước 15 ngày (Khuyên dùng)</option>
                                    <option value={30}>Báo trước 30 ngày (Chuẩn 1 tháng)</option>
                                    <option value={45}>Báo trước 45 ngày</option>
                                    <option value={60}>Báo trước 60 ngày (2 tháng)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                    Mẫu Email Mặc Định Cho Quét Tự Động
                                </label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                                >
                                    <option value="">-- Mẫu HTML mặc định chuyên nghiệp (Khuyên dùng) --</option>
                                    {emailTemplates.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={handleTriggerScan}
                                disabled={triggeringScan || !autoEnabled}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${triggeringScan ? 'animate-spin' : ''}`} />
                                {triggeringScan ? 'Đang quét & gửi...' : 'Chạy Quét & Gửi Tự Động Ngay (Run Now)'}
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveSettings}
                                disabled={savingSettings}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {savingSettings ? 'Đang lưu...' : 'Lưu Cài Đặt Cảnh Báo'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
