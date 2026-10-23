'use client';

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingForm } from '@prisma/client';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { createForm, updateForm, deleteForm } from './actions';
import {
    Search,
    FileText,
    CheckCircle2,
    XCircle,
    Plus,
    Edit,
    Trash2,
    Sliders,
    ExternalLink,
    Sparkles,
    ChevronDown,
    X,
    RotateCcw,
    Users
} from 'lucide-react';
import Link from 'next/link';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';

export type FormListType = MarketingForm & {
    campaign: { id: string; name: string; code: string };
    _count: { participants: number };
};

export default function FormClient({
    initialData,
    campaigns,
    isAdmin,
    permissions,
}: {
    initialData: FormListType[];
    campaigns: { id: string; name: string; code: string }[];
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
                    toast.error(res.error);
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

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa form đăng ký này? Toàn bộ danh sách đăng ký theo form sẽ bị xóa.')) return;

        try {
            const res = await deleteForm(id);
            if (res.success) {
                setForms(forms.filter(f => f.id !== id));
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            console.error(error);
            toast.error('Có lỗi xảy ra');
        }
    };

    const filteredData = useMemo(() => {
        return forms.filter(f => {
            const matchSearch =
                f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                f.campaign?.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? f.isActive : !f.isActive);
            return matchSearch && matchStatus;
        });
    }, [forms, searchTerm, statusFilter]);

    const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ALL';

    return (
        <div className="w-full space-y-5 font-sans text-slate-800 pb-8">
            {/* 1. Standard ERP Header */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                            <FileText size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                    Tiếp Thị & Sự Kiện
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {stats.active} form đang nhận đăng ký
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-1">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight m-0">
                                    Thiết Kế Biểu Mẫu (Marketing Forms)
                                </h1>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full tabular-nums">
                                    {forms.length} biểu mẫu
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 m-0">
                                Tạo trang Landing Page và biểu mẫu đăng ký thu thập thông tin khách hàng tiềm năng (Lead)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href="/marketing/participants"
                            className="inline-flex items-center gap-1.5 h-[36px] bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-3 rounded-lg text-xs font-semibold transition-all no-underline"
                        >
                            <Users size={14} className="text-emerald-600" />
                            <span>Danh Sách Khách ĐK ({stats.totalSubmissions})</span>
                        </Link>
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => handleOpenModal()}
                                className="inline-flex items-center gap-1.5 h-[36px] bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border-none"
                            >
                                <Plus size={15} />
                                <span>Tạo Biểu Mẫu Mới</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div
                    onClick={() => setStatusFilter('ALL')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        statusFilter === 'ALL'
                            ? 'bg-indigo-50/40 border-indigo-400 ring-2 ring-indigo-500/15 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Tổng Biểu Mẫu
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 tabular-nums mt-1 m-0">
                            {stats.total}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Biểu mẫu thu thập thông tin
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/70 shrink-0">
                        <FileText size={19} />
                    </div>
                </div>

                <div
                    onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        statusFilter === 'ACTIVE'
                            ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-500/15 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Đang Nhận Đăng Ký
                        </p>
                        <h3 className="text-2xl font-bold text-emerald-600 tabular-nums mt-1 m-0">
                            {stats.active}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Landing page đang mở công khai
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200/60 shrink-0">
                        <CheckCircle2 size={19} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Tổng Lượt Đăng Ký
                        </p>
                        <h3 className="text-2xl font-bold text-indigo-600 tabular-nums mt-1 m-0">
                            {stats.totalSubmissions}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Tổng số khách hàng đã gửi form
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                        <Sparkles size={19} />
                    </div>
                </div>
            </div>

            {/* 3. Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex-1 flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-3 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                    <Search size={15} className="text-slate-400 shrink-0 mr-2" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên biểu mẫu hoặc chiến dịch..."
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
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ACTIVE">Đang hoạt động</option>
                            <option value="INACTIVE">Đã tạm dừng</option>
                        </select>
                        <ChevronDown size={13} className="text-slate-400 pointer-events-none absolute right-2" />
                    </div>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('ALL');
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
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Tên Biểu Mẫu</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Chiến Dịch / Sự Kiện</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-center">Trạng Thái</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-center">Lượt Đăng Ký</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Liên Kết Public</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-14 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400">
                                                <FileText size={20} />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-600 m-0">Chưa có biểu mẫu nào</p>
                                            <p className="text-[11px] text-slate-400 m-0">Tạo biểu mẫu mới để bắt đầu thu thập dữ liệu khách hàng đăng ký</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((form) => (
                                    <tr key={form.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-3.5 align-middle">
                                            <div className="flex items-center gap-2.5 font-bold text-slate-900">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                                    <FileText size={14} />
                                                </div>
                                                <span>{form.title}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3.5 text-slate-600 align-middle">
                                            <div className="font-semibold text-slate-800">{form.campaign?.name}</div>
                                            <div className="text-[11px] text-slate-400 tabular-nums">{form.campaign?.code}</div>
                                        </td>
                                        <td className="py-3 px-3.5 text-center align-middle">
                                            {form.isActive ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                                    <CheckCircle2 size={11} /> Hoạt động
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                    <XCircle size={11} /> Tạm dừng
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3.5 text-center font-bold text-sm text-slate-900 tabular-nums align-middle">
                                            {form._count?.participants || 0}
                                        </td>
                                        <td className="py-3 px-3.5 align-middle">
                                            {form.isActive ? (
                                                <a
                                                    target="_blank"
                                                    href={`/public/marketing/register/${form.id}`}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline no-underline"
                                                >
                                                    <ExternalLink size={13} /> Mở Landing Page
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Chưa công khai</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3.5 text-right align-middle">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {canEdit && (
                                                    <Link
                                                        href={`/marketing/forms/${form.id}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60 transition-colors no-underline"
                                                    >
                                                        <Sliders size={12} /> Thiết kế
                                                    </Link>
                                                )}
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenModal(form)}
                                                        title="Sửa thông tin"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors bg-transparent border-none cursor-pointer"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(form.id)}
                                                        title="Xóa form"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors bg-transparent border-none cursor-pointer"
                                                    >
                                                        <Trash2 size={14} />
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
                            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                            placeholder="Đăng ký tham gia hội thảo..."
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
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>Công khai biểu mẫu này (Cho phép khách hàng mở link đăng ký)</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
