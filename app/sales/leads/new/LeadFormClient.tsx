'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Save, X, ArrowLeft, Building2, User, Phone, Mail, DollarSign, 
    Calendar, Tag, FileText, Info, Activity, Target, Sparkles, Check, Plus,
    MapPin, Flame, Zap, Snowflake, CheckCircle2, Clock, ShieldCheck,
    Briefcase, HelpCircle, Layers, Compass, ArrowRight, PhoneCall
} from 'lucide-react';
import Link from 'next/link';
import { createLead, updateLead } from '../actions';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { formatMoney } from '@/lib/utils/formatters';

const STATUSES = [
    { id: 'NEW', label: 'Tiếp nhận mới', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'CONTACTED', label: 'Đã liên hệ', color: 'bg-sky-50 text-sky-700 border-sky-200' },
    { id: 'QUALIFIED', label: 'Đang tư vấn', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'PROPOSAL', label: 'Gửi báo giá', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'WON', label: 'Chốt thành công', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'LOST', label: 'Thất bại', color: 'bg-rose-50 text-rose-700 border-rose-200' }
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

export function LeadFormClient({ 
    customers, 
    users, 
    sources = [], 
    initialData, 
    currentUserId 
}: { 
    customers: any[], 
    users: any[], 
    sources?: string[], 
    initialData?: any, 
    currentUserId?: string 
}) {
    const router = useRouter();
    const isEdit = !!initialData;

    const [isExistingCustomer, setIsExistingCustomer] = useState(isEdit ? !!initialData.customerId : false);
    
    // Parse extra info from notes if exists
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        company: initialData?.company || '',
        contactName: initialData?.contactName || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        position: '',
        address: '',
        taxCode: '',
        customerId: initialData?.customerId || '',
        source: initialData?.source || '',
        status: initialData?.status || 'NEW',
        estimatedValue: initialData?.estimatedValue || 0,
        expectedCloseDate: initialData?.expectedCloseDate ? new Date(initialData.expectedCloseDate).toISOString().split('T')[0] : '',
        priority: 'MEDIUM', // HIGH, MEDIUM, LOW
        selectedServices: [] as string[],
        requirements: '',
        nextAction: '',
        notes: initialData?.notes || '',
        assignedToId: initialData?.assignedToId || currentUserId || ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (!isEdit && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const customerIdParam = params.get('customerId');
            if (customerIdParam) {
                setIsExistingCustomer(true);
                setFormData(prev => ({ ...prev, customerId: customerIdParam }));
            }
        }
    }, [isEdit]);

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

    // Combine notes and extra requirements into lead notes field
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Build rich combined notes
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
                name: formData.name,
                company: !isExistingCustomer ? formData.company : null,
                contactName: !isExistingCustomer ? formData.contactName : null,
                email: !isExistingCustomer ? formData.email : null,
                phone: !isExistingCustomer ? formData.phone : null,
                customerId: isExistingCustomer ? formData.customerId : null,
                source: formData.source || null,
                status: formData.status || 'NEW',
                estimatedValue: Number(formData.estimatedValue) || 0,
                expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : null,
                notes: combinedNotes || null,
                assignedToId: formData.assignedToId || null
            };

            if (isEdit) {
                await updateLead(initialData.id, payload);
                router.push(`/sales/leads/${initialData.id}`);
            } else {
                const newLead = await createLead(payload);
                router.push(`/sales/leads/${newLead.id}`);
            }
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi khi lưu Cơ hội bán hàng');
        } finally {
            setLoading(false);
        }
    };

    const customerOptions = customers.map(c => ({ 
        value: c.id, 
        label: `${c.code ? c.code + ' - ' : ''}${c.name} ${c.phone ? `(${c.phone})` : ''}` 
    }));
    
    const userOptions = users.map(u => ({ 
        value: u.id, 
        label: u.name || u.email 
    }));

    const selectedCustomerObj = useMemo(() => {
        if (!isExistingCustomer || !formData.customerId) return null;
        return customers.find(c => c.id === formData.customerId) || null;
    }, [isExistingCustomer, formData.customerId, customers]);

    const combinedSourceOptions = useMemo(() => {
        const set = new Set([...DEFAULT_SOURCES, ...sources]);
        return Array.from(set);
    }, [sources]);

    return (
        <div className="w-full max-w-full space-y-6 p-4 md:p-6 lg:p-8 pb-32">
            {/* Top Navigation Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 md:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3.5">
                    <Link
                        href={isEdit ? `/sales/leads/${initialData.id}` : "/sales/leads"}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                        title="Quay lại"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                                {isEdit ? 'Chỉnh Sửa Cơ Hội Bán Hàng' : 'Thêm Cơ Hội Bán Hàng Mới'}
                            </h1>
                            {isEdit && (
                                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
                                    {initialData.code}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            {isEdit ? 'Cập nhật tiến trình và thông tin cơ hội kinh doanh' : 'Khởi tạo cơ hội mới để đưa vào quy trình chăm sóc & chốt hợp đồng'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <Link
                        href={isEdit ? `/sales/leads/${initialData.id}` : "/sales/leads"}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-2xs"
                    >
                        Hủy bỏ
                    </Link>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold shadow-xs flex items-center gap-2">
                    <Info size={16} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ================= LEFT 8-COLUMNS: DEAL INFO & REQUIREMENTS ================= */}
                <div className="lg:col-span-8 space-y-6">
                    {/* 1. Opportunity Overview Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 space-y-5">
                        <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100">
                            <Tag size={18} className="text-emerald-600" />
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                1. Thông Tin Cơ Hội Kinh Doanh
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {/* Deal Title */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Tên cơ hội / Tên dự án <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="VD: Cung cấp & lắp đặt hệ thống Camera an ninh - Tòa nhà Minh Khang"
                                    className="w-full h-10 px-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
                                />
                            </div>

                            {/* Estimated Value & Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Value Input */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
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
                                        <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="number"
                                            name="estimatedValue"
                                            value={formData.estimatedValue || ''}
                                            onChange={handleChange}
                                            placeholder="0"
                                            className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono font-bold"
                                        />
                                    </div>

                                    {/* Quick Amount Chips */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {AMOUNT_PRESETS.map(p => (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() => handleQuickAmount(p.value)}
                                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
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

                                {/* Expected Close Date */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700">
                                        Ngày chốt dự kiến
                                    </label>
                                    <div className="relative">
                                        <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="date"
                                            name="expectedCloseDate"
                                            value={formData.expectedCloseDate}
                                            onChange={handleChange}
                                            className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium cursor-pointer"
                                        />
                                    </div>

                                    {/* Quick Date Buttons */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
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
                                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all cursor-pointer"
                                            >
                                                {b.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Priority Level */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                <label className="block text-xs font-bold text-slate-700">
                                    Mức độ tiềm năng & Ưu tiên
                                </label>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {[
                                        { id: 'HIGH', label: 'Rất tiềm năng', icon: Flame, color: 'border-rose-300 text-rose-700 bg-rose-50/70 hover:bg-rose-100/70', active: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-100 text-rose-800 font-extrabold' },
                                        { id: 'MEDIUM', label: 'Tiềm năng vừa', icon: Zap, color: 'border-amber-300 text-amber-700 bg-amber-50/70 hover:bg-amber-100/70', active: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-100 text-amber-800 font-extrabold' },
                                        { id: 'LOW', label: 'Ít tiềm năng', icon: Snowflake, color: 'border-blue-300 text-blue-700 bg-blue-50/70 hover:bg-blue-100/70', active: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-100 text-blue-800 font-extrabold' }
                                    ].map(p => {
                                        const Icon = p.icon;
                                        const isSelected = formData.priority === p.id;
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, priority: p.id }))}
                                                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                    isSelected ? p.active : p.color
                                                }`}
                                            >
                                                <Icon size={14} className="shrink-0" />
                                                <span>{p.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Services / Categories of Interest */}
                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                <label className="block text-xs font-bold text-slate-700">
                                    Hạng mục / Dịch vụ khách hàng quan tâm
                                </label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {POPULAR_SERVICES.map(service => {
                                        const isChecked = formData.selectedServices.includes(service);
                                        return (
                                            <button
                                                key={service}
                                                type="button"
                                                onClick={() => handleToggleService(service)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    isChecked 
                                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold shadow-2xs' 
                                                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                                }`}
                                            >
                                                {isChecked ? <Check size={12} className="text-emerald-600 stroke-[3]" /> : <Plus size={12} className="text-slate-400" />}
                                                <span>{service}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Customer Requirements & Action Plan Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 space-y-5">
                        <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100">
                            <FileText size={18} className="text-emerald-600" />
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                2. Yêu Cầu & Kế Hoạch Xử Lý
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {/* Requirements Description */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Mô tả chi tiết nhu cầu của khách hàng
                                </label>
                                <textarea
                                    name="requirements"
                                    value={formData.requirements}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="VD: Khách hàng cần báo giá gói lắp 16 mắt camera IP, lưu trữ 30 ngày, dự kiến thi công trong tháng tới..."
                                    className="w-full p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium leading-relaxed resize-y"
                                />
                            </div>

                            {/* Next Action Plan */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Hành động tiếp theo (Next Action)</span>
                                    <span className="text-[10px] text-slate-400 font-normal">Nhiệm vụ cần thực hiện ngay</span>
                                </label>
                                <div className="relative">
                                    <ArrowRight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                                    <input
                                        type="text"
                                        name="nextAction"
                                        value={formData.nextAction}
                                        onChange={handleChange}
                                        placeholder="VD: Gửi bản vẽ & bảng chào giá trước 17h ngày 15/09; Gọi lại xác nhận"
                                        className="w-full h-10 pl-9 pr-3.5 text-xs bg-emerald-50/40 border border-emerald-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
                                    />
                                </div>
                            </div>

                            {/* Internal Notes */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Ghi chú nội bộ cho Sales Team
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={2}
                                    placeholder="Ghi chú thêm về tính cách khách hàng, người quyết định chính, các lưu ý giá cả..."
                                    className="w-full p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium leading-relaxed resize-y"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= RIGHT 4-COLUMNS: CUSTOMER & PIPELINE ================= */}
                <div className="lg:col-span-4 space-y-6">
                    {/* 3. Customer Information Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-5">
                        <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100">
                            <Building2 size={18} className="text-emerald-600" />
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                3. Thông Tin Khách Hàng
                            </h2>
                        </div>

                        {/* Customer Mode Switcher */}
                        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                            <button
                                type="button"
                                onClick={() => setIsExistingCustomer(false)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    !isExistingCustomer ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Khách Mới
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsExistingCustomer(true)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    isExistingCustomer ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Khách Đã Có
                            </button>
                        </div>

                        <div className="space-y-3.5">
                            {isExistingCustomer ? (
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Chọn Khách Hàng từ Hệ Thống <span className="text-rose-500">*</span>
                                        </label>
                                        <SearchableSelect
                                            options={customerOptions}
                                            value={formData.customerId}
                                            onChange={(val) => setFormData(prev => ({ ...prev, customerId: val }))}
                                            placeholder="Tìm theo Mã, Tên hoặc SĐT..."
                                        />
                                        {!formData.customerId && (
                                            <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1 font-medium">
                                                <Info size={13} /> Vui lòng chọn khách hàng
                                            </p>
                                        )}
                                    </div>

                                    {/* Preview selected customer box */}
                                    {selectedCustomerObj && (
                                        <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-2">
                                            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                                                <Building2 size={14} className="text-emerald-700" />
                                                <span>{selectedCustomerObj.name}</span>
                                            </div>
                                            {selectedCustomerObj.code && (
                                                <div className="text-[11px] text-emerald-800">
                                                    Mã KH: <strong className="font-mono">{selectedCustomerObj.code}</strong>
                                                </div>
                                            )}
                                            {selectedCustomerObj.contactName && (
                                                <div className="text-[11px] text-slate-700 flex items-center gap-1">
                                                    <User size={12} className="text-slate-400" />
                                                    <span>{selectedCustomerObj.contactName}</span>
                                                </div>
                                            )}
                                            {selectedCustomerObj.phone && (
                                                <div className="text-[11px] text-slate-700 flex items-center gap-1">
                                                    <Phone size={12} className="text-slate-400" />
                                                    <span>{selectedCustomerObj.phone}</span>
                                                </div>
                                            )}
                                            {selectedCustomerObj.email && (
                                                <div className="text-[11px] text-slate-700 flex items-center gap-1 truncate">
                                                    <Mail size={12} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{selectedCustomerObj.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Company / Org Name */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Tên Công Ty / Cá Nhân <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                name="company"
                                                required={!isExistingCustomer}
                                                value={formData.company}
                                                onChange={handleChange}
                                                placeholder="VD: Công ty TNHH Thương Mại Minh Phát"
                                                className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
                                            />
                                        </div>
                                    </div>

                                    {/* Contact Person */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Người liên hệ chính
                                        </label>
                                        <div className="relative">
                                            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                name="contactName"
                                                value={formData.contactName}
                                                onChange={handleChange}
                                                placeholder="VD: Anh Tuấn / Chị Lan"
                                                className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Position / Role */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Chức vụ / Bộ phận
                                        </label>
                                        <div className="relative">
                                            <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                name="position"
                                                value={formData.position}
                                                onChange={handleChange}
                                                placeholder="VD: Giám đốc, Kế toán trưởng, Quản lý..."
                                                className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Số điện thoại
                                        </label>
                                        <div className="relative">
                                            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="09xx xxx xxx"
                                                className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Email
                                        </label>
                                        <div className="relative">
                                            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="contact@company.com"
                                                className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Address / Location */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-slate-700">
                                            Địa chỉ / Khu vực
                                        </label>
                                        <div className="relative">
                                            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                placeholder="VD: Quận 1, TP. Hồ Chí Minh"
                                                className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 4. Pipeline & Team Assignment Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-5">
                        <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100">
                            <Activity size={18} className="text-emerald-600" />
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                4. Trạng Thái & Nguồn Gốc
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {/* Pipeline Status Select */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Giai đoạn khởi tạo (Pipeline Stage)
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                                >
                                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </div>

                            {/* Assignee */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Người phụ trách chính
                                </label>
                                <SearchableSelect
                                    options={userOptions}
                                    value={formData.assignedToId}
                                    onChange={(val) => setFormData(prev => ({ ...prev, assignedToId: val }))}
                                    placeholder="Chọn nhân viên phụ trách..."
                                />
                            </div>

                            {/* Lead Source */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Nguồn cơ hội (Lead Source)
                                </label>
                                <div className="relative">
                                    <Compass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        name="source"
                                        list="source-list"
                                        value={formData.source}
                                        onChange={handleChange}
                                        placeholder="Chọn hoặc nhập nguồn..."
                                        className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium"
                                    />
                                    <datalist id="source-list">
                                        {combinedSourceOptions.map(s => <option key={s} value={s} />)}
                                    </datalist>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* Sticky Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg z-40 flex justify-end items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                    disabled={loading}
                >
                    <X size={15} /> Hủy bỏ
                </button>
                <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={loading || (isExistingCustomer && !formData.customerId)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-98 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                    <Save size={15} /> {loading ? 'Đang lưu...' : (isEdit ? 'Cập Nhật Cơ Hội' : 'Tạo Cơ Hội Mới')}
                </button>
            </div>
        </div>
    );
}
