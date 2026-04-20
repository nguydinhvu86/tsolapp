'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingCategory } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { createCategory, updateCategory, deleteCategory } from './actions';
import { Plus, Edit, Trash2, Search, Target } from 'lucide-react';
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

    const filteredData = categories.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-6">
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 dark:bg-slate-800 dark:border-slate-700 dark:placeholder-gray-400 dark:text-white"
                        placeholder="Tìm kiếm phân loại..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {canCreate && (
                    <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
                        <Plus size={16} /> Thêm Phân Loại
                    </Button>
                )}
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <thead>
                        <tr>
                            <th>Tên Phân Loại</th>
                            <th>Mô tả</th>
                            <th>Ngày cập nhật</th>
                            <th className="text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? filteredData.map((category) => (
                            <tr key={category.id}>
                                <td className="font-medium text-slate-900 dark:text-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Target size={18} className="text-slate-500" />
                                        {category.name}
                                    </div>
                                </td>
                                <td className="text-slate-600 dark:text-slate-400 max-w-[300px] truncate">
                                    {category.description || '-'}
                                </td>
                                <td>{formatDate(category.updatedAt)}</td>
                                <td className="text-right space-x-2">
                                    {canEdit && (
                                        <Button size="sm" variant="outline" onClick={() => handleOpenModal(category)}>
                                            <Edit size={14} className="mr-1" /> Sửa
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button size="sm" variant="danger" onClick={() => handleDelete(category.id)}>
                                            <Trash2 size={14} className="mr-1" /> Xóa
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center py-8 text-slate-500">
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
                title={editingId ? 'Cập nhật phân loại' : 'Thêm mới phân loại'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Tên phân loại <span className="text-red-500">*</span></label>
                        <Input
                            required
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Nhập tên phân loại..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Mô tả</label>
                        <textarea
                            className="w-full flex min-h-[80px] rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/50 dark:focus:ring-slate-800"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Mô tả chi tiết phân loại..."
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            Hủy bỏ
                        </Button>
                        <Button type="submit" disabled={isLoading} variant="primary">
                            {isLoading ? 'Đang lưu...' : 'Lưu'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
}
