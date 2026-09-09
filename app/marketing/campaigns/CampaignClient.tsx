'use client';

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
    Briefcase,
    DollarSign,
    CheckCircle2,
    Clock,
    XCircle,
    FileText
} from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/utils/formatters';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';

export type CampaignWithDetails = MarketingCampaign & {
    category: MarketingCategory;
    creator: { id: string, name: string | null, email: string | null };
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
        const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0);
        return { total, active, draft, totalBudget };
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
                    alert(res.error);
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
                    alert(res.error);
                }
            }
        } catch (error) {
            console.error(error);
            alert('Có lỗi xảy ra');
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
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Có lỗi xảy ra');
        }
    };

    const filteredData = campaigns.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter ? c.status === statusFilter : true;
        const matchCategory = categoryFilter === 'ALL' || c.categoryId === categoryFilter;
        return matchSearch && matchStatus && matchCategory;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE': 
                return {
                    label: 'Đang Diễn Ra',
                    style: 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                };
            case 'COMPLETED': 
                return {
                    label: 'Đã Kết Thúc',
                    style: 'bg-blue-50 text-blue-700 border-blue-200/60'
                };
            case 'CANCELLED': 
                return {
                    label: 'Đã Hủy',
                    style: 'bg-rose-50 text-rose-700 border-rose-200/60'
                };
            case 'DRAFT': 
            default: 
                return {
                    label: 'Bản Nháp',
                    style: 'bg-slate-100 text-slate-700 border-slate-200'
                };
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
                        <Megaphone className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">Chiến Dịch & Sự Kiện</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                                {campaigns.length} Chiến Dịch
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Quản lý các sự kiện offline, triển lãm, hội thảo và chiến dịch tiếp thị online</p>
                    </div>
                </div>

                {canCreate && (
                    <Button onClick={() => handleOpenModal()} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-xs">
                        <Plus className="w-4 h-4" /> Tạo Chiến Dịch Mới
                    </Button>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng chiến dịch</div>
                        <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats.total}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <Megaphone className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đang diễn ra</div>
                        <div className="text-2xl font-mono font-bold text-emerald-600 mt-1">{stats.active}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bản nháp</div>
                        <div className="text-2xl font-mono font-bold text-slate-500 mt-1">{stats.draft}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng ngân sách</div>
                        <div className="text-lg font-mono font-bold text-purple-600 mt-1 truncate max-w-[150px]">
                            {formatMoney(stats.totalBudget)}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <DollarSign className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter Ribbon */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo mã, tên chiến dịch..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <select
                        className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-700 font-medium"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="DRAFT">Bản nháp</option>
                        <option value="ACTIVE">Đang diễn ra</option>
                        <option value="COMPLETED">Đã kết thúc</option>
                        <option value="CANCELLED">Đã hủy</option>
                    </select>

                    <select
                        className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-700 font-medium"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="ALL">Tất cả phân loại</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <th className="py-3.5 px-4 font-semibold">Mã & Tên Chiến Dịch</th>
                                <th className="py-3.5 px-4 font-semibold">Phân Loại</th>
                                <th className="py-3.5 px-4 font-semibold">Thời Gian Diễn Ra</th>
                                <th className="py-3.5 px-4 font-semibold">Ngân Sách</th>
                                <th className="py-3.5 px-4 font-semibold text-center">Trạng Thái</th>
                                <th className="py-3.5 px-4 font-semibold text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                                                <Megaphone className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">Không tìm thấy chiến dịch nào</p>
                                            <p className="text-xs text-slate-400">Tạo chiến dịch mới để bắt đầu quản lý</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((campaign) => {
                                    const badge = getStatusBadge(campaign.status);
                                    return (
                                        <tr 
                                            key={campaign.id} 
                                            className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/marketing/campaigns/${campaign.id}`)}
                                        >
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-slate-900 hover:text-purple-600 transition-colors">
                                                    {campaign.name}
                                                </div>
                                                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                                    {campaign.code}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                    <Target className="w-3 h-3 text-slate-500" />
                                                    {campaign.category?.name || '---'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600">
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{campaign.startDate ? formatDate(campaign.startDate) : '--'} - {campaign.endDate ? formatDate(campaign.endDate) : '--'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                                                {formatMoney(campaign.budget)}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.style}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {canEdit && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleOpenModal(campaign); }}
                                                            title="Chỉnh sửa chiến dịch"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button 
                                                            onClick={(e) => handleDelete(campaign.id, e)}
                                                            title="Xóa chiến dịch"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                                placeholder="Triển lãm Vietbuild 2024..."
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
                            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
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
                        <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs">
                            {isLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
