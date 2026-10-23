'use client';

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingCampaign, MarketingCategory } from '@prisma/client';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { createCampaign, updateCampaign, deleteCampaign } from './actions';
import {
    Plus,
    Edit,
    Trash2,
    Search,
    Target,
    Megaphone,
    Calendar,
    Users,
    DollarSign,
    CheckCircle2,
    FileText,
    ChevronDown,
    X,
    RotateCcw,
    MapPin
} from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/utils/formatters';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import Link from 'next/link';

export type CampaignWithDetails = MarketingCampaign & {
    category: MarketingCategory;
    creator: { id: string; name: string | null; email: string | null };
    _count: { participants: number; tasks: number; forms: number };
};

export default function CampaignClient({
    initialData,
    categories,
    isAdmin,
    permissions,
}: {
    initialData: CampaignWithDetails[];
    categories: MarketingCategory[];
    isAdmin: boolean;
    permissions: string[];
}) {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<CampaignWithDetails[]>(initialData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState<{
        code: string;
        name: string;
        categoryId: string;
        description: string;
        eventTime: string;
        location: string;
        startDate: string;
        endDate: string;
        budget: string;
        status: string;
    }>({
        code: '',
        name: '',
        categoryId: '',
        description: '',
        eventTime: '',
        location: '',
        startDate: '',
        endDate: '',
        budget: '',
        status: 'DRAFT'
    });

    const canCreate = isAdmin || permissions.includes('MARKETING_CREATE');
    const canEdit = isAdmin || permissions.includes('MARKETING_EDIT');
    const canDelete = isAdmin || permissions.includes('MARKETING_DELETE');

    const stats = useMemo(() => {
        const total = campaigns.length;
        const active = campaigns.filter(c => c.status === 'ACTIVE').length;
        const draft = campaigns.filter(c => c.status === 'DRAFT').length;
        const completed = campaigns.filter(c => c.status === 'COMPLETED').length;
        const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
        return { total, active, draft, completed, totalBudget };
    }, [campaigns]);

    const handleOpenModal = (campaign?: CampaignWithDetails) => {
        if (campaign) {
            setEditingId(campaign.id);
            setFormData({
                code: campaign.code,
                name: campaign.name,
                categoryId: campaign.categoryId,
                description: campaign.description || '',
                eventTime: campaign.eventTime || '',
                location: campaign.location || '',
                startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : '',
                endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : '',
                budget: campaign.budget?.toString() || '',
                status: campaign.status,
            });
        } else {
            setEditingId(null);
            setFormData({
                code: `CMP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
                name: '',
                categoryId: categories.length > 0 ? categories[0].id : '',
                description: '',
                eventTime: '',
                location: '',
                startDate: '',
                endDate: '',
                budget: '',
                status: 'DRAFT'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const dataToSubmit = {
            ...formData,
            startDate: formData.startDate ? new Date(formData.startDate) : undefined,
            endDate: formData.endDate ? new Date(formData.endDate) : undefined,
            budget: formData.budget ? parseFloat(formData.budget) : 0,
        };

        try {
            if (editingId) {
                const res = await updateCampaign(editingId, dataToSubmit);
                if (res.success && res.data) {
                    setCampaigns(campaigns.map(c => c.id === editingId ? { ...c, ...res.data } : c));
                    router.refresh();
                    setIsModalOpen(false);
                } else {
                    toast.error(res.error);
                }
            } else {
                const res = await createCampaign(dataToSubmit);
                if (res.success && res.data) {
                    const newCampaignLocal = {
                        ...res.data,
                        category: categories.find(c => c.id === dataToSubmit.categoryId),
                        creator: { id: '', name: 'Bạn', email: '' },
                        _count: { participants: 0, tasks: 0, forms: 0 }
                    };
                    setCampaigns([newCampaignLocal as any, ...campaigns]);
                    router.refresh();
                    setIsModalOpen(false);
                } else {
                    toast.error(res.error);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Có lỗi xảy ra');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Bạn có chắc chắn muốn xóa chiến dịch này? Toàn bộ dữ liệu liên quan sẽ bị xóa.')) return;

        try {
            const res = await deleteCampaign(id);
            if (res.success) {
                setCampaigns(campaigns.filter(c => c.id !== id));
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            console.error(error);
            toast.error('Có lỗi xảy ra');
        }
    };

    const filteredData = campaigns.filter(c => {
        const matchSearch =
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter ? c.status === statusFilter : true;
        const matchCategory = categoryFilter === 'ALL' || c.categoryId === categoryFilter;
        return matchSearch && matchStatus && matchCategory;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return {
                    label: 'Đang diễn ra',
                    style: 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                };
            case 'COMPLETED':
                return {
                    label: 'Đã kết thúc',
                    style: 'bg-blue-50 text-blue-700 border-blue-200/70'
                };
            case 'CANCELLED':
                return {
                    label: 'Đã hủy',
                    style: 'bg-rose-50 text-rose-700 border-rose-200/70'
                };
            case 'DRAFT':
            default:
                return {
                    label: 'Bản nháp',
                    style: 'bg-slate-100 text-slate-700 border-slate-200'
                };
        }
    };

    const hasActiveFilters = searchTerm !== '' || statusFilter !== '' || categoryFilter !== 'ALL';

    return (
        <div className="w-full space-y-5 font-sans text-slate-800 pb-8">
            {/* 1. Standard ERP Header */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                            <Megaphone size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                    Tiếp Thị & Sự Kiện
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {stats.active} chiến dịch đang chạy
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-1">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight m-0">
                                    Quản Lý Chiến Dịch & Sự Kiện
                                </h1>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full tabular-nums">
                                    {campaigns.length} chiến dịch
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 m-0">
                                Quản lý các sự kiện offline, triển lãm, hội thảo, ngân sách và tiến độ chiến dịch tiếp thị online
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href="/marketing/categories"
                            className="inline-flex items-center gap-1.5 h-[36px] bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-3 rounded-lg text-xs font-semibold transition-all no-underline"
                        >
                            <Target size={14} className="text-slate-500" />
                            <span>Phân Loại</span>
                        </Link>
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => handleOpenModal()}
                                className="inline-flex items-center gap-1.5 h-[36px] bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border-none"
                            >
                                <Plus size={15} />
                                <span>Tạo Chiến Dịch Mới</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div
                    onClick={() => setStatusFilter('')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        statusFilter === ''
                            ? 'bg-indigo-50/40 border-indigo-400 ring-2 ring-indigo-500/15 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Tổng Chiến Dịch
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 tabular-nums mt-1 m-0">
                            {stats.total}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Toàn bộ chiến dịch trong hệ thống
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                        <Megaphone size={19} />
                    </div>
                </div>

                <div
                    onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? '' : 'ACTIVE')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        statusFilter === 'ACTIVE'
                            ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-500/15 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Đang Diễn Ra
                        </p>
                        <h3 className="text-2xl font-bold text-emerald-600 tabular-nums mt-1 m-0">
                            {stats.active}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Đang mở đăng ký & triển khai
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shrink-0">
                        <CheckCircle2 size={19} />
                    </div>
                </div>

                <div
                    onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? '' : 'DRAFT')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        statusFilter === 'DRAFT'
                            ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-500/15 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Bản Nháp / Chuẩn Bị
                        </p>
                        <h3 className="text-2xl font-bold text-slate-700 tabular-nums mt-1 m-0">
                            {stats.draft}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Đang lên kế hoạch ({stats.completed} đã kết thúc)
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200/70 shrink-0">
                        <FileText size={19} />
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Tổng Ngân Sách Dự Kiến
                        </p>
                        <h3 className="text-lg sm:text-xl font-bold text-indigo-600 tabular-nums truncate mt-1 m-0" title={formatMoney(stats.totalBudget)}>
                            {formatMoney(stats.totalBudget)}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Tổng hạn mức chi phí tiếp thị
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
                        <DollarSign size={19} />
                    </div>
                </div>
            </div>

            {/* 3. Filter Toolbar (No Double Borders, No Icon Overlap) */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex-1 flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-3 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                    <Search size={15} className="text-slate-400 shrink-0 mr-2" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo mã chiến dịch, tên sự kiện..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                        className="w-full h-full text-xs font-medium text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none p-0"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="text-slate-400 hover:text-slate-600 ml-1.5 bg-transparent border-none cursor-pointer p-0.5 flex items-center"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            className="appearance-none pr-5 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer h-full"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="DRAFT">Bản nháp</option>
                            <option value="ACTIVE">Đang diễn ra</option>
                            <option value="COMPLETED">Đã kết thúc</option>
                            <option value="CANCELLED">Đã hủy</option>
                        </select>
                        <ChevronDown size={13} className="text-slate-400 pointer-events-none absolute right-2" />
                    </div>

                    <div className="relative flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            className="appearance-none pr-5 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer h-full"
                        >
                            <option value="ALL">Tất cả phân loại</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="text-slate-400 pointer-events-none absolute right-2" />
                    </div>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('');
                                setCategoryFilter('ALL');
                            }}
                            className="inline-flex items-center gap-1 h-[36px] px-2.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 transition cursor-pointer"
                        >
                            <RotateCcw size={12} />
                            <span>Đặt lại</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 4. Data Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500">
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Mã & Tên Chiến Dịch</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Phân Loại</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Thời Gian Diễn Ra</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-center">Biểu Mẫu / Khách ĐK</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Ngân Sách</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-center">Trạng Thái</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-14 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400">
                                                <Megaphone size={20} />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-600 m-0">Không tìm thấy chiến dịch nào</p>
                                            <p className="text-[11px] text-slate-400 m-0">Tạo chiến dịch mới để bắt đầu quản lý sự kiện và thu thập khách hàng</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((campaign) => {
                                    const badge = getStatusBadge(campaign.status);
                                    return (
                                        <tr
                                            key={campaign.id}
                                            className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                                            onClick={() => router.push(`/marketing/campaigns/${campaign.id}`)}
                                        >
                                            <td className="py-3 px-3.5 align-middle">
                                                <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-xs">
                                                    {campaign.name}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                                                        {campaign.code}
                                                    </span>
                                                    {campaign.location && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[200px]">
                                                            <MapPin size={10} /> {campaign.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3.5 align-middle">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                                                    <Target size={11} className="text-indigo-500" />
                                                    {campaign.category?.name || '---'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3.5 text-slate-600 align-middle">
                                                <div className="flex items-center gap-1.5 text-xs tabular-nums">
                                                    <Calendar size={13} className="text-slate-400 shrink-0" />
                                                    <span>
                                                        {campaign.startDate ? formatDate(campaign.startDate) : '--'} → {campaign.endDate ? formatDate(campaign.endDate) : '--'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3.5 text-center align-middle">
                                                <div className="inline-flex items-center gap-2 text-xs tabular-nums">
                                                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200/60">
                                                        {campaign._count?.forms || 0} Form
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
                                                        {campaign._count?.participants || 0} Khách
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3.5 text-right font-bold text-slate-900 tabular-nums align-middle">
                                                {formatMoney(campaign.budget)}
                                            </td>
                                            <td className="py-3 px-3.5 text-center align-middle">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.style}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3.5 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleOpenModal(campaign); }}
                                                            title="Chỉnh sửa chiến dịch"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors bg-transparent border-none cursor-pointer"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDelete(campaign.id, e)}
                                                            title="Xóa chiến dịch"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors bg-transparent border-none cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Cập Nhật Chiến Dịch' : 'Tạo Chiến Dịch / Sự Kiện Mới'}
                maxWidth="800px"
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Mã Chiến Dịch <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                required
                                value={formData.code}
                                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                placeholder="CMP-..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Trạng Thái</label>
                            <select
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="DRAFT">Bản nháp</option>
                                <option value="ACTIVE">Đang diễn ra</option>
                                <option value="COMPLETED">Đã kết thúc</option>
                                <option value="CANCELLED">Đã hủy</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Tên Chiến Dịch / Sự Kiện <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Triển lãm Vietbuild..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Phân Loại <span className="text-rose-500">*</span>
                            </label>
                            <SearchableSelect
                                options={categories.map(c => ({ value: c.id, label: c.name }))}
                                value={formData.categoryId}
                                onChange={(val) => setFormData(prev => ({ ...prev, categoryId: val }))}
                                placeholder="Chọn phân loại..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Khung Giờ Diễn Ra</label>
                            <Input
                                value={formData.eventTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, eventTime: e.target.value }))}
                                placeholder="VD: 08:00 - 17:00 ngày..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Địa Điểm Tổ Chức</label>
                            <Input
                                value={formData.location}
                                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="Trung tâm Triển lãm SECC..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Ngày Bắt Đầu</label>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Ngày Kết Thúc</label>
                            <Input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Ngân Sách Dự Kiến (VNĐ)</label>
                        <Input
                            type="number"
                            value={formData.budget}
                            onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                            placeholder="0"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Mô Tả Chi Tiết</label>
                        <textarea
                            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Mục tiêu chiến dịch, tệp khách hàng hướng tới..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Hủy bỏ
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
                            {isLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
