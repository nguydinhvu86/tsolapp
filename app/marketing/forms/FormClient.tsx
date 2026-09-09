'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingForm } from '@prisma/client';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { createForm, updateForm, deleteForm } from './actions';
import { 
    Search, 
    Link as LinkIcon, 
    FileText, 
    CheckCircle2, 
    XCircle, 
    Plus, 
    Edit, 
    Trash2, 
    Sliders,
    Layers,
    ExternalLink,
    Copy,
    Sparkles
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';
import Link from 'next/link';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';

export type FormListType = MarketingForm & {
    campaign: { id: string, name: string, code: string };
    _count: { participants: number };
};

export default function FormClient({
    initialData,
    campaigns,
    isAdmin,
    permissions,
}: {
    initialData: FormListType[];
    campaigns: { id: string, name: string, code: string }[];
    isAdmin: boolean;
    permissions: string[];
}) {
    const router = useRouter();
    const [forms, setForms] = useState<FormListType[]>(initialData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        campaignId: '',
        title: '',
        description: '',
        isActive: false
    });

    const canCreate = isAdmin || permissions.includes('MARKETING_CREATE');
    const canEdit = isAdmin || permissions.includes('MARKETING_EDIT');
    const canDelete = isAdmin || permissions.includes('MARKETING_DELETE');

    const stats = useMemo(() => {
        const total = forms.length;
        const active = forms.filter(f => f.isActive).length;
        const totalSubmissions = forms.reduce((acc, f) => acc + (f._count?.participants || 0), 0);
        return { total, active, totalSubmissions };
    }, [forms]);

    const handleOpenModal = (form?: FormListType) => {
        if (form) {
            setEditingId(form.id);
            setFormData({
                campaignId: form.campaignId,
                title: form.title,
                description: form.description || '',
                isActive: form.isActive
            });
        } else {
            setEditingId(null);
            setFormData({
                campaignId: campaigns.length > 0 ? campaigns[0].id : '',
                title: '',
                description: '',
                isActive: false
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (editingId) {
                const res = await updateForm(editingId, {
                    campaignId: formData.campaignId,
                    title: formData.title,
                    description: formData.description,
                    isActive: formData.isActive
                });
                if (res.success && res.data) {
                    setForms(forms.map(f => f.id === editingId ? { ...f, ...res.data } : f));
                    router.refresh();
                    setIsModalOpen(false);
                } else {
                    alert(res.error);
                }
            } else {
                const res = await createForm({
                    campaignId: formData.campaignId,
                    title: formData.title,
                    description: formData.description,
                    fields: [
                        { id: '1', name: 'Nhập họ và tên', type: 'text', required: true },
                        { id: '2', name: 'Số điện thoại', type: 'text', required: true },
                        { id: '3', name: 'Email liên hệ', type: 'email', required: false }
                    ],
                    isActive: formData.isActive
                });
                if (res.success && res.data) {
                    const newFormLocal = {
                        ...res.data,
                        campaign: campaigns.find(c => c.id === formData.campaignId),
                        _count: { participants: 0 }
                    };
                    setForms([newFormLocal as FormListType, ...forms]);
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

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa form đăng ký này? Toàn bộ danh sách đăng ký theo form sẽ bị xóa.')) return;
        
        try {
            const res = await deleteForm(id);
            if (res.success) {
                setForms(forms.filter(f => f.id !== id));
            } else {
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Có lỗi xảy ra');
        }
    };

    const filteredData = useMemo(() => {
        return forms.filter(f => {
            const matchSearch = 
                f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                f.campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? f.isActive : !f.isActive);
            return matchSearch && matchStatus;
        });
    }, [forms, searchTerm, statusFilter]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">Thiết Kế Biểu Mẫu (Marketing Forms)</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                                {forms.length} Biểu Mẫu
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Tạo trang Landing Page và form đăng ký thu thập thông tin khách hàng tiềm năng</p>
                    </div>
                </div>

                {canCreate && (
                    <Button onClick={() => handleOpenModal()} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-xs">
                        <Plus className="w-4 h-4" /> Tạo Biểu Mẫu Mới
                    </Button>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng biểu mẫu</div>
                        <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats.total}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đang nhận đăng ký</div>
                        <div className="text-2xl font-mono font-bold text-emerald-600 mt-1">{stats.active}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng lượt đăng ký</div>
                        <div className="text-2xl font-mono font-bold text-purple-600 mt-1">{stats.totalSubmissions}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <Sparkles className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên form hoặc chiến dịch..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                        className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-700 font-medium"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="ACTIVE">Đang hoạt động</option>
                        <option value="INACTIVE">Đã tạm dừng</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <th className="py-3.5 px-4 font-semibold">Tên Biểu Mẫu</th>
                                <th className="py-3.5 px-4 font-semibold">Chiến Dịch / Sự Kiện</th>
                                <th className="py-3.5 px-4 font-semibold text-center">Trạng Thái</th>
                                <th className="py-3.5 px-4 font-semibold text-center">Lượt Đăng Ký</th>
                                <th className="py-3.5 px-4 font-semibold">Liên Kết Public</th>
                                <th className="py-3.5 px-4 font-semibold text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">Chưa có biểu mẫu nào</p>
                                            <p className="text-xs text-slate-400">Tạo form mới để bắt đầu thu thập lead đăng ký</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((form) => (
                                    <tr key={form.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2.5 font-bold text-slate-900">
                                                <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <span>{form.title}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600">
                                            <div className="font-medium text-slate-800">{form.campaign.name}</div>
                                            <div className="text-[11px] font-mono text-slate-400">{form.campaign.code}</div>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            {form.isActive ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                    <CheckCircle2 className="w-3 h-3" /> Hoạt động
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                    <XCircle className="w-3 h-3" /> Tạm dừng
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-center font-mono font-bold text-base text-slate-900">
                                            {form._count?.participants || 0}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {form.isActive ? (
                                                <a 
                                                    target="_blank" 
                                                    href={`/public/marketing/register/${form.id}`} 
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" /> Mở Landing Page
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Chưa công khai</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {canEdit && (
                                                    <Link 
                                                        href={`/marketing/forms/${form.id}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60 transition-colors"
                                                    >
                                                        <Sliders className="w-3 h-3" /> Thiết kế
                                                    </Link>
                                                )}
                                                {canEdit && (
                                                    <button 
                                                        onClick={() => handleOpenModal(form)}
                                                        title="Sửa thông tin"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button 
                                                        onClick={() => handleDelete(form.id)}
                                                        title="Xóa form"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Cập Nhật Form Đăng Ký' : 'Tạo Form Đăng Ký Mới'}
                maxWidth="900px"
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Chiến Dịch / Sự Kiện <span className="text-rose-500">*</span>
                        </label>
                        <select
                            required
                            disabled={!!editingId}
                            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            value={formData.campaignId}
                            onChange={(e) => setFormData(prev => ({ ...prev, campaignId: e.target.value }))}
                        >
                            <option value="" disabled>--- Chọn chiến dịch ---</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                            ))}
                        </select>
                        {!!editingId && <small className="text-amber-600 block text-xs mt-1">Không thể thay đổi chiến dịch sau khi form đã tạo.</small>}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Tiêu Đề Form Hiển Thị <span className="text-rose-500">*</span>
                        </label>
                        <Input
                            required
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Đăng ký tham gia hội thảo Vietbuild 2024..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Mô Tả & Nội Dung Landing Page
                        </label>
                        <RichTextEditor
                            value={formData.description}
                            onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
                            placeholder="Giới thiệu chương trình, diễn giả, quyền lợi tham gia..."
                        />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 font-medium">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                            />
                            <span>Công khai biểu mẫu này (Cho phép khách hàng mở link đăng ký)</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
