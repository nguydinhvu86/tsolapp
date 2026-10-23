'use client';

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useMemo } from 'react';
import { MarketingCategory } from '@prisma/client';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { createCategory, updateCategory, deleteCategory } from './actions';
import {
    Plus,
    Edit,
    Trash2,
    Search,
    Target,
    Tag,
    Layers,
    FileText,
    X,
    Megaphone
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';
import Link from 'next/link';

export default function CategoryClient({
    initialData,
    isAdmin,
    permissions,
}: {
    initialData: MarketingCategory[];
    isAdmin: boolean;
    permissions: string[];
}) {
    const [categories, setCategories] = useState<MarketingCategory[]>(initialData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    const canCreate = isAdmin || permissions.includes('MARKETING_CREATE');
    const canEdit = isAdmin || permissions.includes('MARKETING_EDIT');
    const canDelete = isAdmin || permissions.includes('MARKETING_DELETE');

    const filteredData = useMemo(() => {
        return categories.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [categories, searchTerm]);

    const handleOpenModal = (category?: MarketingCategory) => {
        if (category) {
            setEditingId(category.id);
            setFormData({
                name: category.name,
                description: category.description || '',
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                description: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (editingId) {
                const res = await updateCategory(editingId, formData);
                if (res.success && res.data) {
                    setCategories(categories.map(c => c.id === editingId ? res.data : c));
                    setIsModalOpen(false);
                } else {
                    toast.error(res.error);
                }
            } else {
                const res = await createCategory(formData);
                if (res.success && res.data) {
                    setCategories([res.data, ...categories]);
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
        if (!confirm('Bạn có chắc chắn muốn xóa phân loại này?')) return;

        try {
            const res = await deleteCategory(id);
            if (res.success) {
                setCategories(categories.filter(c => c.id !== id));
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            console.error(error);
            toast.error('Có lỗi xảy ra');
        }
    };

    return (
        <div className="w-full space-y-5 font-sans text-slate-800 pb-8">
            {/* 1. Standard ERP Header */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                            <Target size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                    Tiếp Thị & Sự Kiện
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Danh Mục Hệ Thống
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-1">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight m-0">
                                    Phân Loại Sự Kiện & Chiến Dịch
                                </h1>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full tabular-nums">
                                    {categories.length} phân loại
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 m-0">
                                Quản lý danh mục phân loại sự kiện (Hội thảo, Triển lãm, Quảng cáo trực tuyến...)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href="/marketing/campaigns"
                            className="inline-flex items-center gap-1.5 h-[36px] bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-3 rounded-lg text-xs font-semibold transition-all no-underline"
                        >
                            <Megaphone size={14} className="text-slate-500" />
                            <span>Danh Sách Chiến Dịch</span>
                        </Link>
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => handleOpenModal()}
                                className="inline-flex items-center gap-1.5 h-[36px] bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border-none"
                            >
                                <Plus size={15} />
                                <span>Thêm Phân Loại Mới</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Tổng Phân Loại
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 tabular-nums mt-1 m-0">
                            {categories.length}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Nhóm chiến dịch tiếp thị & sự kiện
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/70 shrink-0">
                        <Layers size={19} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Có Mô Tả Chi Tiết
                        </p>
                        <h3 className="text-2xl font-bold text-indigo-600 tabular-nums mt-1 m-0">
                            {categories.filter(c => c.description).length}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Đã chuẩn hóa nội dung danh mục
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                        <FileText size={19} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Trạng Thái Danh Mục
                        </p>
                        <h3 className="text-base font-bold text-emerald-600 mt-1.5 m-0">
                            Đang kích hoạt
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Sẵn sàng gắn cho chiến dịch mới
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200/60 shrink-0">
                        <Tag size={19} />
                    </div>
                </div>
            </div>

            {/* 3. Search Toolbar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
                <div className="flex-1 flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-3 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                    <Search size={15} className="text-slate-400 shrink-0 mr-2" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm phân loại theo tên hoặc mô tả..."
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

                <div className="text-xs text-slate-500 tabular-nums shrink-0 hidden sm:block">
                    Hiển thị <strong className="text-slate-900">{filteredData.length}</strong> / {categories.length} phân loại
                </div>
            </div>

            {/* 4. Data Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500">
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Tên Phân Loại</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Mô Tả Danh Mục</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">Ngày Cập Nhật</th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-14 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400">
                                                <Target size={20} />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-600 m-0">Chưa có phân loại nào</p>
                                            <p className="text-[11px] text-slate-400 m-0">Thêm phân loại mới để gắn cho các chiến dịch sự kiện</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((category) => (
                                    <tr key={category.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-3.5 align-middle">
                                            <div className="flex items-center gap-2.5 font-bold text-slate-900">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                                    <Target size={14} />
                                                </div>
                                                <span>{category.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3.5 text-slate-600 max-w-md truncate align-middle">
                                            {category.description || <span className="text-slate-400 italic">Chưa có mô tả</span>}
                                        </td>
                                        <td className="py-3 px-3.5 text-slate-500 tabular-nums align-middle">
                                            {formatDate(category.updatedAt)}
                                        </td>
                                        <td className="py-3 px-3.5 text-right align-middle">
                                            <div className="flex items-center justify-end gap-1">
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenModal(category)}
                                                        title="Chỉnh sửa"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors bg-transparent border-none cursor-pointer"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(category.id)}
                                                        title="Xóa"
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
                title={editingId ? 'Cập Nhật Phân Loại' : 'Thêm Phân Loại Sự Kiện Mới'}
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Tên Phân Loại <span className="text-rose-500">*</span>
                        </label>
                        <Input
                            required
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Nhập tên phân loại..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Mô Tả Chi Tiết
                        </label>
                        <textarea
                            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Mô tả chi tiết phân loại sự kiện..."
                        />
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
