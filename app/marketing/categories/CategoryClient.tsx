'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
    Clock, 
    Layers,
    FileText
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export default function CategoryClient({
    initialData,
    isAdmin,
    permissions,
}: {
    initialData: MarketingCategory[];
    isAdmin: boolean;
    permissions: string[];
}) {
    const router = useRouter();
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
                    alert(res.error);
                }
            } else {
                const res = await createCategory(formData);
                if (res.success && res.data) {
                    setCategories([res.data, ...categories]);
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
        if (!confirm('Bạn có chắc chắn muốn xóa phân loại này?')) return;
        
        try {
            const res = await deleteCategory(id);
            if (res.success) {
                setCategories(categories.filter(c => c.id !== id));
            } else {
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Có lỗi xảy ra');
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">Phân Loại Sự Kiện & Chiến Dịch</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                {categories.length} Phân Loại
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Quản lý danh mục phân loại sự kiện (Hội thảo, Triển lãm, Quảng cáo trực tuyến...)</p>
                    </div>
                </div>

                {canCreate && (
                    <Button onClick={() => handleOpenModal()} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
                        <Plus className="w-4 h-4" /> Thêm Phân Loại Mới
                    </Button>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng phân loại</div>
                        <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{categories.length}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <Layers className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Có mô tả chi tiết</div>
                        <div className="text-2xl font-mono font-bold text-indigo-600 mt-1">
                            {categories.filter(c => c.description).length}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Trạng thái</div>
                        <div className="text-sm font-semibold text-emerald-600 mt-1">Đang kích hoạt</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Tag className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Search Ribbon */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm phân loại theo tên hoặc mô tả..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <th className="py-3.5 px-4 font-semibold">Tên Phân Loại</th>
                                <th className="py-3.5 px-4 font-semibold">Mô Tả Danh Mục</th>
                                <th className="py-3.5 px-4 font-semibold">Ngày Cập Nhật</th>
                                <th className="py-3.5 px-4 font-semibold text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <Target className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">Chưa có phân loại nào</p>
                                            <p className="text-xs text-slate-400">Thêm phân loại mới để gắn cho các chiến dịch</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((category) => (
                                    <tr key={category.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2.5 font-bold text-slate-900">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                                    <Target className="w-4 h-4" />
                                                </div>
                                                <span>{category.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 max-w-md truncate">
                                            {category.description || <span className="text-slate-400 italic">Chưa có mô tả</span>}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                                            {formatDate(category.updatedAt)}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {canEdit && (
                                                    <button 
                                                        onClick={() => handleOpenModal(category)}
                                                        title="Chỉnh sửa"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button 
                                                        onClick={() => handleDelete(category.id)}
                                                        title="Xóa"
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
