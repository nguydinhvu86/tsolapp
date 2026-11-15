'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Save, X, Building2, User, Phone, Mail, DollarSign, 
    Calendar, Tag, FileText, Info, Activity, Target, Sparkles, Check, Plus,
    MapPin, Flame, Zap, Snowflake, CheckCircle2, Clock, ShieldCheck,
    Briefcase, HelpCircle, Layers, Compass, ArrowRight, PhoneCall, Loader2
} from 'lucide-react';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { formatMoney } from '@/lib/utils/formatters';
import { forceUnlockScroll } from '@/lib/utils/scrollLock';
import { useToast } from '@/app/components/providers/ToastProvider';
import { createLead } from './actions';

const STATUSES = [
    { id: 'NEW', label: 'Tiếp nhận mới' },
    { id: 'CONTACTED', label: 'Đã liên hệ' },
    { id: 'QUALIFIED', label: 'Đang tư vấn' },
    { id: 'PROPOSAL', label: 'Gửi báo giá' },
    { id: 'WON', label: 'Chốt thành công' },
    { id: 'LOST', label: 'Thất bại' }
];

const DEFAULT_SOURCES = [
    'Facebook Ads',
    'Google Ads / Search',
    'Website / Landing Page',
    'Zalo / Hotline công ty',
    'Khách hàng giới thiệu',
    'Khách hàng cũ liên hệ lại',
    'Triển lãm / Hội thảo',
    'Nhân viên tiếp cận trực tiếp (Direct)'
];

const POPULAR_SERVICES = [
    'Thi công Cơ Điện (M&E)',
    'Hệ thống Camera & An ninh',
    'Hạ tầng Mạng & Viễn thông',
    'Phần mềm Quản lý ERP',
    'Thiết bị & Vật tư công nghệ',
    'Bảo trì & Vận hành định kỳ',
    'Tư vấn & Thiết kế giải pháp'
];

const AMOUNT_PRESETS = [
    { label: '20 Tr', value: 20000000 },
    { label: '50 Tr', value: 50000000 },
    { label: '100 Tr', value: 100000000 },
    { label: '250 Tr', value: 250000000 },
    { label: '500 Tr', value: 500000000 },
    { label: '1 Tỷ', value: 1000000000 },
    { label: '2 Tỷ', value: 2000000000 }
];

interface CreateLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: any[];
    users: any[];
    sources?: string[];
    currentUserId?: string;
    initialCustomerId?: string;
    initialStatus?: string;
}

export function CreateLeadModal({
    isOpen,
    onClose,
    customers = [],
    users = [],
    sources = [],
    currentUserId,
    initialCustomerId,
    initialStatus = 'NEW'
}: CreateLeadModalProps) {
    const router = useRouter();
    const toast = useToast();

    const [isExistingCustomer, setIsExistingCustomer] = useState(!!initialCustomerId);
    const [customServiceInput, setCustomServiceInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        company: '',
        contactName: '',
        email: '',
        phone: '',
        position: '',
        address: '',
        taxCode: '',
        customerId: initialCustomerId || '',
        source: '',
        status: initialStatus,
        estimatedValue: 0,
        expectedCloseDate: '',
        priority: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
        selectedServices: [] as string[],
        requirements: '',
        nextAction: '',
        notes: '',
        assignedToId: currentUserId || ''
    });

    // Reset or initialize form when opened
    useEffect(() => {
        if (isOpen) {
            setIsExistingCustomer(!!initialCustomerId);
            setFormData({
                name: '',
                company: '',
                contactName: '',
                email: '',
                phone: '',
                position: '',
                address: '',
                taxCode: '',
                customerId: initialCustomerId || '',
                source: '',
                status: initialStatus || 'NEW',
                estimatedValue: 0,
                expectedCloseDate: '',
                priority: 'MEDIUM',
                selectedServices: [],
                requirements: '',
                nextAction: '',
                notes: '',
                assignedToId: currentUserId || ''
            });
            setError('');
            setCustomServiceInput('');
        }
    }, [isOpen, initialCustomerId, initialStatus, currentUserId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'estimatedValue' ? Number(value) : value }));
    };

    const handleQuickAmount = (val: number) => {
        setFormData(prev => ({ ...prev, estimatedValue: val }));
    };

    const handleQuickDate = (daysAhead: number) => {
        const d = new Date();
        d.setDate(d.getDate() + daysAhead);
        setFormData(prev => ({ ...prev, expectedCloseDate: d.toISOString().split('T')[0] }));
    };

    const handleToggleService = (service: string) => {
        setFormData(prev => {
            const exists = prev.selectedServices.includes(service);
            const updated = exists 
                ? prev.selectedServices.filter(s => s !== service)
                : [...prev.selectedServices, service];
            return { ...prev, selectedServices: updated };
        });
    };

    const handleAddCustomService = () => {
        const val = customServiceInput.trim();
        if (!val) return;
        if (!formData.selectedServices.includes(val)) {
            setFormData(prev => ({
                ...prev,
                selectedServices: [...prev.selectedServices, val]
            }));
        }
        setCustomServiceInput('');
    };

    const handleRemoveCustomService = (service: string) => {
        setFormData(prev => ({
            ...prev,
            selectedServices: prev.selectedServices.filter(s => s !== service)
        }));
    };

    const customerOptions = useMemo(() => {
        return customers.map(c => ({ 
            value: c.id, 
            label: `${c.code ? c.code + ' - ' : ''}${c.name} ${c.phone ? `(${c.phone})` : ''}` 
        }));
    }, [customers]);
    
    const userOptions = useMemo(() => {
        return users.map(u => ({ 
            value: u.id, 
            label: u.name || u.email 
        }));
    }, [users]);

    const selectedCustomerObj = useMemo(() => {
        if (!isExistingCustomer || !formData.customerId) return null;
        return customers.find(c => c.id === formData.customerId) || null;
    }, [isExistingCustomer, formData.customerId, customers]);

    const combinedSourceOptions = useMemo(() => {
        const set = new Set([...DEFAULT_SOURCES, ...sources]);
        return Array.from(set);
    }, [sources]);

    const handleClose = () => {
        if (isSubmitting) return;
        forceUnlockScroll();
        onClose();
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            const msg = 'Vui lòng nhập Tên cơ hội / Tên dự án!';
            setError(msg);
            toast.warning(msg);
            return;
        }

        if (isExistingCustomer) {
            if (!formData.customerId) {
                const msg = 'Vui lòng chọn Khách hàng từ hệ thống!';
                setError(msg);
                toast.warning(msg);
                return;
            }
        } else {
            if (!formData.company.trim() && !formData.contactName.trim()) {
                const msg = 'Vui lòng nhập Tên công ty hoặc Người liên hệ cho khách hàng mới!';
                setError(msg);
                toast.warning(msg);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // Build rich combined notes for compatibility with detail view & crm components
            let combinedNotes = formData.notes.trim();
            const extraSections = [];
            
            if (formData.selectedServices.length > 0) {
                extraSections.push(`📌 Dịch vụ quan tâm: ${formData.selectedServices.join(', ')}`);
            }
            if (formData.priority) {
                const priorityLabel = formData.priority === 'HIGH' ? '🔥 Rất tiềm năng' : formData.priority === 'LOW' ? '❄️ Ít tiềm năng' : '⚡ Tiềm năng vừa';
                extraSections.push(`⭐ Mức độ: ${priorityLabel}`);
            }
            if (formData.position && !isExistingCustomer) {
                extraSections.push(`👤 Chức vụ người liên hệ: ${formData.position}`);
            }
            if (formData.address && !isExistingCustomer) {
                extraSections.push(`📍 Địa chỉ: ${formData.address}`);
            }
            if (formData.taxCode && !isExistingCustomer) {
                extraSections.push(`🏢 MST: ${formData.taxCode}`);
            }
            if (formData.nextAction.trim()) {
                extraSections.push(`🎯 Hành động tiếp theo: ${formData.nextAction.trim()}`);
            }
            if (formData.requirements.trim()) {
                extraSections.push(`📝 Nhu cầu chi tiết:\n${formData.requirements.trim()}`);
            }

            if (extraSections.length > 0) {
                combinedNotes = combinedNotes 
                    ? `${combinedNotes}\n\n--- THÔNG TIN BỔ SUNG ---\n${extraSections.join('\n')}`
                    : extraSections.join('\n');
            }

            const payload = {
                name: formData.name.trim(),
                company: !isExistingCustomer ? (formData.company.trim() || null) : null,
                contactName: !isExistingCustomer ? (formData.contactName.trim() || null) : null,
                email: !isExistingCustomer ? (formData.email.trim() || null) : null,
                phone: !isExistingCustomer ? (formData.phone.trim() || null) : null,
                customerId: isExistingCustomer ? formData.customerId : null,
                source: formData.source.trim() || null,
                status: formData.status || 'NEW',
                estimatedValue: Number(formData.estimatedValue) || 0,
                expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : null,
                notes: combinedNotes || null,
                assignedToId: formData.assignedToId || null
            };

            const newLead = await createLead(payload);
            toast.success(`Đã tạo cơ hội "${newLead.name}" thành công!`);
            forceUnlockScroll();
            onClose();

            // Navigate directly to the newly created lead detail page to start working
            router.push(`/sales/leads/${newLead.id}`);
            router.refresh();
        } catch (err: any) {
            console.error('Error creating lead:', err);
            const errMsg = err.message || 'Đã xảy ra lỗi khi tạo Cơ hội bán hàng';
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title="Tạo Cơ Hội Bán Hàng Mới (Lead)" 
            maxWidth="950px"
        >
            <div className="flex flex-col gap-4 py-1 text-slate-800">
                {/* Alert error */}
                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <Info size={15} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* 1. Opportunity Details */}
                <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Tag size={14} className="text-emerald-600" />
                        <span>1. Thông Tin Cơ Hội Kinh Doanh</span>
                    </h3>
                    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
                        {/* Deal Name */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tên cơ hội / Tên dự án <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="VD: Cung cấp & lắp đặt hệ thống Camera an ninh - Tòa nhà Minh Khang"
                                className="w-full h-9 px-3 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
                            />
                        </div>

                        {/* Estimated Value & Close Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-bold text-slate-700">
                                        Giá trị ước tính (VNĐ)
                                    </label>
                                    {formData.estimatedValue > 0 && (
                                        <span className="text-[11px] font-mono font-bold text-emerald-600">
                                            {formatMoney(formData.estimatedValue)}
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="number"
                                        name="estimatedValue"
                                        value={formData.estimatedValue || ''}
                                        onChange={handleChange}
                                        placeholder="0"
                                        className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono font-bold"
                                    />
                                </div>
                                {/* Preset Chips */}
                                <div className="flex flex-wrap gap-1 pt-1.5">
                                    {AMOUNT_PRESETS.map(p => (
                                        <button
                                            key={p.value}
                                            type="button"
                                            onClick={() => handleQuickAmount(p.value)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                                formData.estimatedValue === p.value
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Ngày chốt dự kiến
                                </label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        name="expectedCloseDate"
                                        value={formData.expectedCloseDate}
                                        onChange={handleChange}
                                        className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium cursor-pointer"
                                    />
                                </div>
                                {/* Quick Date Chips */}
                                <div className="flex flex-wrap gap-1 pt-1.5">
                                    {[
                                        { label: '+7 ngày', days: 7 },
                                        { label: '+15 ngày', days: 15 },
                                        { label: '+30 ngày', days: 30 },
                                        { label: '+60 ngày', days: 60 },
                                    ].map(b => (
                                        <button
                                            key={b.days}
                                            type="button"
                                            onClick={() => handleQuickDate(b.days)}
                                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all cursor-pointer"
                                        >
                                            {b.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Priority Level */}
                        <div className="pt-2 border-t border-slate-100">
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Mức độ tiềm năng & Ưu tiên
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'HIGH', label: 'Rất tiềm năng', icon: Flame, color: 'border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100/60', active: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-100 text-rose-800 font-extrabold' },
                                    { id: 'MEDIUM', label: 'Tiềm năng vừa', icon: Zap, color: 'border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100/60', active: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-100 text-amber-800 font-extrabold' },
                                    { id: 'LOW', label: 'Ít tiềm năng', icon: Snowflake, color: 'border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/60', active: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-100 text-blue-800 font-extrabold' }
                                ].map(p => {
                                    const Icon = p.icon;
                                    const isSelected = formData.priority === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, priority: p.id as any }))}
                                            className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                                isSelected ? p.active : p.color
                                            }`}
                                        >
                                            <Icon size={13} className="shrink-0" />
                                            <span>{p.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Services of interest */}
                        <div className="pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Hạng mục / Dịch vụ khách hàng quan tâm
                                </label>
                                <span className="text-[10px] text-slate-400 font-normal">
                                    Chọn hoặc nhập thêm bên dưới
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {POPULAR_SERVICES.map(service => {
                                    const isChecked = formData.selectedServices.includes(service);
                                    return (
                                        <button
                                            key={service}
                                            type="button"
                                            onClick={() => handleToggleService(service)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 cursor-pointer ${
                                                isChecked 
                                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold ring-1 ring-emerald-500/20 shadow-2xs' 
                                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                            }`}
                                        >
                                            {isChecked ? <Check size={11} className="text-emerald-600 stroke-[3]" /> : <Plus size={11} className="text-slate-400" />}
                                            <span>{service}</span>
                                        </button>
                                    );
                                })}

                                {formData.selectedServices.filter(s => !POPULAR_SERVICES.includes(s)).map(customServ => (
                                    <span
                                        key={customServ}
                                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 border border-teal-400 text-teal-800 shadow-2xs flex items-center gap-1"
                                    >
                                        <Check size={11} className="text-teal-600 stroke-[3]" />
                                        <span>{customServ}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCustomService(customServ)}
                                            className="text-teal-600 hover:text-rose-600 ml-1 p-0.5 rounded transition-colors cursor-pointer"
                                            title="Xóa"
                                        >
                                            <X size={11} />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center gap-1.5 mt-2">
                                <input
                                    type="text"
                                    value={customServiceInput}
                                    onChange={(e) => setCustomServiceInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCustomService();
                                        }
                                    }}
                                    placeholder="Thêm hạng mục khác (ấn Thêm hoặc Enter)..."
                                    className="flex-1 max-w-sm h-8 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCustomService}
                                    disabled={!customServiceInput.trim()}
                                    className="h-8 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                >
                                    <Plus size={12} className="text-emerald-600" />
                                    <span>Thêm</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Customer Information */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 size={14} className="text-emerald-600" />
                            <span>2. Thông Tin Khách Hàng</span>
                        </h3>
                        {/* Switcher Tab */}
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setIsExistingCustomer(false)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                    !isExistingCustomer ? 'bg-white shadow-2xs text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Khách Mới
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsExistingCustomer(true)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                    isExistingCustomer ? 'bg-white shadow-2xs text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Khách Đã Có Trong Hệ Thống
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        {isExistingCustomer ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Chọn Khách Hàng từ Hệ Thống <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={customerOptions}
                                        value={formData.customerId}
                                        onChange={(val) => setFormData(prev => ({ ...prev, customerId: val }))}
                                        placeholder="Tìm theo Mã KH, Tên hoặc SĐT..."
                                    />
                                    {!formData.customerId && (
                                        <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1 font-medium">
                                            <Info size={12} /> Vui lòng chọn khách hàng
                                        </p>
                                    )}
                                </div>

                                {selectedCustomerObj && (
                                    <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs space-y-1.5">
                                        <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                                            <Building2 size={13} className="text-emerald-700" />
                                            <span>{selectedCustomerObj.name}</span>
                                            {selectedCustomerObj.code && (
                                                <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                                                    {selectedCustomerObj.code}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-600 text-[11px]">
                                            {selectedCustomerObj.contactName && (
                                                <div className="flex items-center gap-1">
                                                    <User size={12} className="text-slate-400" />
                                                    <span>Người liên hệ: <strong>{selectedCustomerObj.contactName}</strong></span>
                                                </div>
                                            )}
                                            {selectedCustomerObj.phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone size={12} className="text-slate-400" />
                                                    <span>SĐT: <strong className="font-mono">{selectedCustomerObj.phone}</strong></span>
                                                </div>
                                            )}
                                            {selectedCustomerObj.email && (
                                                <div className="flex items-center gap-1 truncate sm:col-span-2">
                                                    <Mail size={12} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{selectedCustomerObj.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Company */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Tên Công Ty / Tên Khách Hàng Mới <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            name="company"
                                            required={!isExistingCustomer}
                                            value={formData.company}
                                            onChange={handleChange}
                                            placeholder="VD: Công ty TNHH Thương Mại Minh Phát"
                                            className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
                                        />
                                    </div>
                                </div>

                                {/* Contact Person */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Người liên hệ chính
                                    </label>
                                    <div className="relative">
                                        <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            name="contactName"
                                            value={formData.contactName}
                                            onChange={handleChange}
                                            placeholder="VD: Anh Tuấn / Chị Lan"
                                            className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Position */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Chức vụ / Bộ phận
                                    </label>
                                    <div className="relative">
                                        <Briefcase size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            name="position"
                                            value={formData.position}
                                            onChange={handleChange}
                                            placeholder="VD: Giám đốc, Quản lý..."
                                            className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Số điện thoại
                                    </label>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="09xx xxx xxx"
                                            className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="contact@company.com"
                                            className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Địa chỉ / Khu vực
                                    </label>
                                    <div className="relative">
                                        <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder="VD: Quận 1, TP. Hồ Chí Minh"
                                            className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Tax Code */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Mã số thuế (MST)
                                    </label>
                                    <input
                                        type="text"
                                        name="taxCode"
                                        value={formData.taxCode}
                                        onChange={handleChange}
                                        placeholder="VD: 0312345678"
                                        className="w-full h-9 px-3 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono font-medium"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Pipeline & Assignment */}
                <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Activity size={14} className="text-emerald-600" />
                        <span>3. Giai Đoạn & Phân Công Phụ Trách</span>
                    </h3>
                    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {/* Status */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Giai đoạn khởi tạo (Pipeline)
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full h-9 px-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                            >
                                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>

                        {/* Assignee */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Người phụ trách chính
                            </label>
                            <SearchableSelect
                                options={userOptions}
                                value={formData.assignedToId}
                                onChange={(val) => setFormData(prev => ({ ...prev, assignedToId: val }))}
                                placeholder="Chọn nhân viên..."
                            />
                        </div>

                        {/* Source */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nguồn cơ hội (Lead Source)
                            </label>
                            <div className="relative">
                                <Compass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    name="source"
                                    list="create-lead-source-list"
                                    value={formData.source}
                                    onChange={handleChange}
                                    placeholder="Chọn hoặc nhập nguồn..."
                                    className="w-full h-9 pl-8 pr-3 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                                />
                                <datalist id="create-lead-source-list">
                                    {combinedSourceOptions.map(s => <option key={s} value={s} />)}
                                </datalist>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Requirements & Action Plan */}
                <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText size={14} className="text-emerald-600" />
                        <span>4. Yêu Cầu & Kế Hoạch Xử Lý</span>
                    </h3>
                    <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        {/* Requirements */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Mô tả chi tiết nhu cầu của khách hàng
                            </label>
                            <textarea
                                name="requirements"
                                value={formData.requirements}
                                onChange={handleChange}
                                rows={2}
                                placeholder="VD: Khách hàng cần báo giá gói lắp 16 mắt camera IP, lưu trữ 30 ngày, dự kiến thi công trong tháng tới..."
                                className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium leading-relaxed resize-y"
                            />
                        </div>

                        {/* Next Action */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                <span>Hành động tiếp theo (Next Action)</span>
                                <span className="text-[10px] text-slate-400 font-normal">Nhiệm vụ cần thực hiện ngay</span>
                            </label>
                            <div className="relative">
                                <ArrowRight size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                                <input
                                    type="text"
                                    name="nextAction"
                                    value={formData.nextAction}
                                    onChange={handleChange}
                                    placeholder="VD: Gửi bảng chào giá sơ bộ trước 17h ngày mai; Gọi điện xác nhận"
                                    className="w-full h-9 pl-8 pr-3 text-xs bg-emerald-50/30 border border-emerald-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
                                />
                            </div>
                        </div>

                        {/* Internal Notes */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Ghi chú nội bộ cho Sales Team
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={2}
                                placeholder="Ghi chú thêm về tính cách khách hàng, người quyết định chính, lưu ý giá cả..."
                                className="w-full p-2.5 text-xs bg-slate-50/70 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium leading-relaxed resize-y"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row justify-end items-center gap-2 pt-3 border-t border-slate-200 mt-2">
                    <Button
                        type="button"
                        onClick={handleClose}
                        variant="secondary"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto h-[36px] px-4 text-xs font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs rounded-lg cursor-pointer"
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto flex justify-center items-center gap-1.5 h-[36px] px-5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border-emerald-600 shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Đang tạo & chuyển trang...</span>
                            </>
                        ) : (
                            <>
                                <Save size={14} />
                                <span>Lưu & Vào Chi Tiết Lead</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
