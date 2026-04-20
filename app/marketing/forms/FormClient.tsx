'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingForm } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { createForm, updateForm, deleteForm } from './actions';
import { Plus, Edit, Trash2, Search, Link as LinkIcon, FileText, CheckCircle, XCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';
import Link from 'next/link';

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
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        campaignId: '',
        title: '',
        description: '',
        isPublished: false
    });

    const canCreate = isAdmin || permissions.includes('MARKETING_CREATE');
    const canEdit = isAdmin || permissions.includes('MARKETING_EDIT');
    const canDelete = isAdmin || permissions.includes('MARKETING_DELETE');

    const handleOpenModal = (form?: FormListType) => {
        if (form) {
            setEditingId(form.id);
            setFormData({
                campaignId: form.campaignId,
                title: form.title,
                description: form.description || '',
                isPublished: form.isPublished
            });
        } else {
            setEditingId(null);
            setFormData({
                campaignId: campaigns.length > 0 ? campaigns[0].id : '',
                title: '',
                description: '',
                isPublished: false
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
                    isPublished: formData.isPublished
                });
                if (res.success && res.data) {
                    router.refresh(); // Because we might not get _count back properly in pessimistic return
                    setIsModalOpen(false);
                } else {
                    alert(res.error);
                }
            } else {
                const res = await createForm({
                    campaignId: formData.campaignId,
                    title: formData.title,
                    description: formData.description,
                    fields: [ // Standard default fields
                        { id: '1', name: 'Nhập họ và tên', type: 'text', required: true },
                        { id: '2', name: 'Số điện thoại', type: 'text', required: true },
                        { id: '3', name: 'Email liên hệ', type: 'email', required: false }
                    ],
                    isPublished: formData.isPublished
                });
                if (res.success && res.data) {
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
        if (!confirm('Bạn có chắc chắn muốn xóa form đăng ký này?')) return;
        
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

    const filteredData = forms.filter(f => 
        f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
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
                        placeholder="Tìm theo tên form, chiến dịch..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {canCreate && (
                    <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
                        <Plus size={16} /> Tạo Form Đăng Ký
                    </Button>
                )}
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <thead>
                        <tr>
                            <th>Tên Form</th>
                            <th>Thuộc chiến dịch</th>
                            <th>Trạng thái</th>
                            <th>Lượt đăng ký</th>
                            <th>Public Link</th>
                            <th className="text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? filteredData.map((form) => (
                            <tr key={form.id}>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <FileText size={16} className="text-indigo-500" />
                                        <span className="font-medium text-slate-900 dark:text-slate-100">{form.title}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className="text-sm font-medium">{form.campaign.name}</span>
                                    <div className="text-xs text-slate-500">{form.campaign.code}</div>
                                </td>
                                <td>
                                    {form.isPublished ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">
                                            <CheckCircle size={14} /> Hoạt động
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                                            <XCircle size={14} /> Tạm dừng
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <span className="font-bold text-lg">{form._count?.participants || 0}</span>
                                </td>
                                <td>
                                    {form.isPublished ? (
                                        <a target="_blank" href={`/public/marketing/register/${form.slug}`} className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
                                            <LinkIcon size={14}/> Mở link
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-400">Chưa public</span>
                                    )}
                                </td>
                                <td className="text-right space-x-2">
                                    {canEdit && (
                                        <Button size="sm" variant="outline" onClick={() => handleOpenModal(form)}>
                                            <Edit size={14} /> Sửa
                                        </Button>
                                    )}
                                    {canEdit && (
                                        <Link href={`/marketing/forms/${form.id}`}>
                                            <Button size="sm" variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300">
                                                Thiết kế form
                                            </Button>
                                        </Link>
                                    )}
                                    {canDelete && (
                                        <Button size="sm" variant="danger" onClick={() => handleDelete(form.id)}>
                                            <Trash2 size={14} /> Xóa
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
                title={editingId ? 'Cập nhật form' : 'Tạo form đăng ký mới'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Chiến dịch / Sự kiện <span className="text-red-500">*</span></label>
                            <select
                                required
                                disabled={!!editingId}
                                className="w-full flex h-10 rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/50 dark:focus:ring-slate-800"
                                value={formData.campaignId}
                                onChange={(e) => setFormData(prev => ({ ...prev, campaignId: e.target.value }))}
                            >
                                <option value="" disabled>--- Chọn chiến dịch ---</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                            {!!editingId && <small className="text-amber-600 block mt-1">Không thể thay đổi chiến dịch sau khi form đã tạo.</small>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Tiêu đề Form hiển thị <span className="text-red-500">*</span></label>
                            <Input
                                required
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Đăng ký tham gia..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Mô tả (tùy chọn)</label>
                            <textarea
                                className="w-full flex min-h-[80px] rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/50 dark:focus:ring-slate-800"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Mô tả sự kiện, thời gian địa điểm..."
                            />
                        </div>
                        <div className="flex items-center gap-2 mt-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                            <input
                                type="checkbox"
                                id="isPublished"
                                checked={formData.isPublished}
                                onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label htmlFor="isPublished" className="text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                                Cho phép đăng ký (Publish form)
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 mt-6">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            Hủy
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
