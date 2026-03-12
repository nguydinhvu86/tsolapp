'use client'
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { ContractAppendixTemplate } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { TemplateVariablesGuide } from '@/app/components/ui/TemplateVariablesGuide';
import { createAppendixTemplate, updateAppendixTemplate, deleteAppendixTemplate } from './actions';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AppendixTemplateClient({ initialData }: { initialData: ContractAppendixTemplate[] }) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', content: '' });

    const { paginatedItems, paginationProps } = usePagination(initialData, 25);

    const openModal = (template?: ContractAppendixTemplate) => {
        if (template) {
            setEditingId(template.id);
            setFormData({
                name: template.name,
                description: template.description || '',
                content: template.content,
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', description: '', content: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            await updateAppendixTemplate(editingId, formData);
        } else {
            await createAppendixTemplate(formData);
        }
        closeModal();
        router.refresh();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa mẫu phụ lục này?')) {
            await deleteAppendixTemplate(id);
            router.refresh();
        }
    };

    const handleCopy = async (template: ContractAppendixTemplate) => {
        if (confirm(`Bạn có muốn tạo bản sao của mẫu phụ lục "${template.name}"?`)) {
            await createAppendixTemplate({
                name: template.name + ' (Copy)',
                description: template.description || '',
                content: template.content,
            });
            router.refresh();
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Cấu hình Mẫu Phụ Lục Hợp Đồng</h2>
                <Button onClick={() => openModal()} className="gap-2">
                    <Plus size={18} /> Thêm mẫu phụ lục
                </Button>
            </div>

            <Table>
                <thead>
                    <tr>
                        <th>Tên Mẫu</th>
                        <th>Mô tả</th>
                        <th>Ngày tạo</th>
                        <th style={{ width: '100px' }}>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedItems.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có mẫu phụ lục nào</td></tr>
                    ) : paginatedItems.map(template => (
                        <tr key={template.id}>
                            <td style={{ fontWeight: 500 }}>{template.name}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{template.description || '-'}</td>
                            <td style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>{formatDate(new Date(template.createdAt))}</td>
                            <td>
                                <div className="flex gap-2">
                                    <button onClick={() => openModal(template)} style={{ color: 'var(--text-muted)' }} title="Sửa">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleCopy(template)} style={{ color: 'var(--success, #16a34a)' }} title="Sao chép">
                                        <Copy size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(template.id)} style={{ color: 'var(--danger)' }} title="Xóa">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <Pagination {...paginationProps} />

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Sửa mẫu phụ lục' : 'Thêm mẫu phụ lục'} maxWidth="1000px">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Input
                        label="Tên mẫu phụ lục *"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                        label="Mô tả ngắn gọn"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="flex flex-col gap-2">
                        <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Nội dung mẫu phụ lục *</label>
                        <TemplateVariablesGuide />
                        <RichTextEditor
                            value={formData.content}
                            onChange={val => setFormData({ ...formData, content: val })}
                            placeholder="CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM..."
                        />
                    </div>
                    <div className="flex gap-2" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="secondary" onClick={closeModal}>Hủy</Button>
                        <Button type="submit">Lưu lại</Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
}
