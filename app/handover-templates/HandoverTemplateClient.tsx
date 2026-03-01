'use client'

import React, { useState } from 'react';
import { HandoverTemplate } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { TemplateVariablesGuide } from '@/app/components/ui/TemplateVariablesGuide';
import { createHandoverTemplate, updateHandoverTemplate, deleteHandoverTemplate } from './actions';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function HandoverTemplateClient({ initialData }: { initialData: HandoverTemplate[] }) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', content: '' });

    const openModal = (template?: HandoverTemplate) => {
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
            await updateHandoverTemplate(editingId, formData);
        } else {
            await createHandoverTemplate(formData);
        }
        closeModal();
        router.refresh();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa mẫu biên bản này?')) {
            await deleteHandoverTemplate(id);
            router.refresh();
        }
    };

    const handleCopy = async (template: HandoverTemplate) => {
        if (confirm(`Bạn có muốn tạo bản sao của mẫu "${template.name}"?`)) {
            await createHandoverTemplate({
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Cấu hình Mẫu Biên Bản</h2>
                <Button onClick={() => openModal()} className="gap-2">
                    <Plus size={18} /> Thêm mẫu mới
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
                    {initialData.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có mẫu biên bản nào</td></tr>
                    ) : initialData.map(template => (
                        <tr key={template.id}>
                            <td style={{ fontWeight: 500 }}>{template.name}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{template.description || '-'}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{new Date(template.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td>
                                <div className="flex gap-2">
                                    <button onClick={() => openModal(template)} style={{ color: 'var(--text-muted)' }} title="Sửa">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleCopy(template)} style={{ color: 'var(--success, #16a34a)' }} title="Sao chép (Nhân bản)">
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

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Sửa mẫu biên bản' : 'Thêm mẫu mới'} maxWidth="1000px">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Input
                        label="Tên mẫu biên bản *"
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
                        <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Nội dung mẫu biên bản *</label>
                        <TemplateVariablesGuide />

                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                            <p style={{ margin: 0, color: '#166534' }}>
                                <strong>💡 Mẹo thiết kế Mẫu Biên Bản:</strong><br />
                                Hệ thống hỗ trợ tính năng <strong>Bảng tính Động (Mini-Excel)</strong>. Để chèn một bảng tính cho phép nhập liệu và tự động nhân <strong style={{ color: 'var(--danger)' }}>Số lượng × Đơn giá = Thành tiền</strong>, bạn chỉ cần gõ chính xác dòng chữ này vào vị trí mong muốn:
                            </p>
                            <code style={{ background: '#dcfce3', color: '#15803d', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', display: 'inline-block', marginTop: '0.5rem' }}>
                                {'{{TABLE_THIETBI}}'}
                            </code>
                            <p style={{ margin: '0.5rem 0 0 0', color: '#166534', fontSize: '0.8125rem' }}>
                                (Lưu ý: Bạn cũng có thể dùng các biến chữ đơn giản như <code>{'{{TEN_KHACH_HANG}}'}</code> để hệ thống tự điền tên người mua).
                            </p>
                        </div>

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
