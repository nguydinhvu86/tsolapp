'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingCampaign, MarketingCategory } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { createCampaign, updateCampaign, deleteCampaign } from './actions';
import { Plus, Edit, Trash2, Search, Target, Megaphone, Calendar, Users, Briefcase } from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/utils/formatters';
import Link from 'next/link';
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
                        creator: { id: '', name: 'Bạn', email: '' }, // Optimistic minimal data
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
        if (!confirm('Bạn có chắc chắn muốn xóa chiến dịch này triệt để? Dữ liệu người tham gia, form sẽ bị xóa theo.')) return;
        
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
        return matchSearch && matchStatus;
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800';
            case 'COMPLETED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800';
            case 'DRAFT': default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
        }
    };

    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Đang diễn ra';
            case 'COMPLETED': return 'Đã kết thúc';
            case 'CANCELLED': return 'Đã hủy';
            case 'DRAFT': default: return 'Bản nháp';
        }
    };

    return (
        <Card className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-6 gap-4">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 dark:bg-slate-900 dark:border-slate-700 dark:placeholder-gray-400 dark:text-white"
                            placeholder="Tìm kiếm chiến dịch, mã..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-slate-900 dark:border-slate-700 dark:placeholder-gray-400 dark:text-white"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="DRAFT">Bản nháp</option>
                        <option value="ACTIVE">Đang diễn ra</option>
                        <option value="COMPLETED">Đã kết thúc</option>
                        <option value="CANCELLED">Đã hủy</option>
                    </select>
                </div>
                {canCreate && (
                    <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
                        <Plus size={16} /> Tạo Chiến Dịch
                    </Button>
                )}
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <thead>
                        <tr>
                            <th>Mã / Tên</th>
                            <th>Phân loại</th>
                            <th>Thời gian</th>
                            <th>Ngân sách</th>
                            <th>Trạng thái</th>
                            <th className="text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? filteredData.map((campaign) => (
                            <tr key={campaign.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => router.push(`/marketing/campaigns/${campaign.id}`)}>
                                <td>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-900 dark:text-slate-100">{campaign.name}</span>
                                        <span className="text-xs text-slate-500">{campaign.code}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                        {campaign.category?.name}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex gap-1 items-center text-sm text-slate-600 dark:text-slate-400">
                                        <Calendar size={14} />
                                        {campaign.startDate ? formatDate(campaign.startDate) : '--'}
                                        {' - '}
                                        {campaign.endDate ? formatDate(campaign.endDate) : '--'}
                                    </div>
                                </td>
                                <td>
                                    <span className="font-medium">{formatMoney(campaign.budget)}</span>
                                </td>
                                <td>
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusStyle(campaign.status)}`}>
                                        {getStatusDisplay(campaign.status)}
                                    </span>
                                </td>
                                <td className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                    {canEdit && (
                                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleOpenModal(campaign); }}>
                                            <Edit size={14} />
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button size="sm" variant="danger" onClick={(e) => handleDelete(campaign.id, e)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-500">
                                    Không tìm thấy dữ liệu.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Cập nhật Chiến Dịch' : 'Tạo mới Chiến Dịch'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium mb-1">Mã chiến dịch <span className="text-red-500">*</span></label>
                            <Input
                                required
                                value={formData.code}
                                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                placeholder="CMP-..."
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium mb-1">Trạng thái</label>
                            <select
                                className="w-full flex h-10 rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/50 dark:focus:ring-slate-800"
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="DRAFT">Bản nháp</option>
                                <option value="ACTIVE">Đang diễn ra</option>
                                <option value="COMPLETED">Đã kết thúc</option>
                                <option value="CANCELLED">Đã hủy</option>
                            </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium mb-1">Tên chiến dịch/Sự kiện <span className="text-red-500">*</span></label>
                            <Input
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Triển lãm Vietbuild 2024..."
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium mb-1">Phân loại <span className="text-red-500">*</span></label>
                            <SearchableSelect
                                options={categories.map(c => ({ value: c.id, label: c.name }))}
                                value={formData.categoryId}
                                onChange={(val) => setFormData(prev => ({ ...prev, categoryId: val }))}
                                placeholder="Chọn phân loại..."
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium mb-1">Giờ diễn ra</label>
                            <Input
                                value={formData.eventTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, eventTime: e.target.value }))}
                                placeholder="VD: 08:00 - 17:00 ngày..."
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium mb-1">Địa điểm tổ chức</label>
                            <Input
                                value={formData.location}
                                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="Trung tâm Triển lãm SECC..."
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                            <Input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
                            <Input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Ngân sách dự kiến</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-slate-500">VNĐ</span>
                                </div>
                                <Input
                                    type="number"
                                    className="pl-12"
                                    value={formData.budget}
                                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Mô tả chi tiết</label>
                            <textarea
                                className="w-full flex min-h-[100px] rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/50 dark:focus:ring-slate-800"
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Mục tiêu chiến dịch, tệp khách hàng hướng tới..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            Hủy bỏ
                        </Button>
                        <Button type="submit" disabled={isLoading} variant="primary">
                            {isLoading ? 'Đang lưu...' : 'Lưu lại'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
}
