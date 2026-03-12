'use client'
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { QuoteTemplate } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { TemplateVariablesGuide } from '@/app/components/ui/TemplateVariablesGuide';
import { TemplateBuilder } from '@/app/components/ui/TemplateBuilder';
import { createQuoteTemplate, updateQuoteTemplate, deleteQuoteTemplate } from './actions';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function QuoteTemplateClient({ initialData }: { initialData: QuoteTemplate[] }) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', content: '', editorType: 'RICH_TEXT' });

    const { paginatedItems, paginationProps } = usePagination(initialData, 25);

    const openModal = (template?: QuoteTemplate) => {
        if (template) {
            setEditingId(template.id);
            const t = template as any;
            setFormData({
                name: template.name,
                description: template.description || '',
                content: template.content,
                editorType: t.editorType || 'RICH_TEXT'
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', description: '', content: '', editorType: 'RICH_TEXT' });
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
            await updateQuoteTemplate(editingId, formData);
        } else {
            await createQuoteTemplate(formData);
        }
        closeModal();
        router.refresh();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa mẫu báo giá này?')) {
            await deleteQuoteTemplate(id);
            router.refresh();
        }
    };

    const handleCopy = async (template: QuoteTemplate) => {
        const t = template as any;
        if (confirm(`Bạn có muốn tạo bản sao của mẫu "${template.name}"?`)) {
            await createQuoteTemplate({
                name: template.name + ' (Copy)',
                description: template.description || '',
                content: template.content,
                editorType: t.editorType || 'RICH_TEXT'
            });
            router.refresh();
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Cấu hình Mẫu Báo Giá</h2>
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
                    {paginatedItems.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có mẫu báo giá nào</td></tr>
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
            <Pagination {...paginationProps} />

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Sửa mẫu báo giá' : 'Thêm mẫu mới'} maxWidth={formData.editorType === 'DRAG_DROP' ? '1400px' : '1000px'}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Input
                        label="Tên mẫu báo giá *"
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
                        <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Nội dung mẫu báo giá *</label>
                        <TemplateVariablesGuide />

                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                            <p style={{ margin: 0, color: '#166534' }}>
                                <strong>💡 Mẹo thiết kế Mẫu Báo Giá:</strong><br />
                                Hệ thống hỗ trợ tính năng <strong>Bảng tính Động (Mini-Excel)</strong>. Để chèn một bảng tính cho phép nhập liệu và tự động nhân <strong style={{ color: 'var(--danger)' }}>Số lượng × Đơn giá = Thành tiền</strong>, bạn chỉ cần gõ chính xác dòng chữ này vào vị trí mong muốn:
                            </p>
                            <code style={{ background: '#dcfce3', color: '#15803d', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', display: 'inline-block', marginTop: '0.5rem' }}>
                                {'{{TABLE_THIETBI}}'}
                            </code>
                            <p style={{ margin: '0.5rem 0 0 0', color: '#166534', fontSize: '0.8125rem' }}>
                                (Lưu ý: Bạn cũng có thể dùng các biến chữ đơn giản như <code>{'{{TEN_KHACH_HANG}}'}</code> để hệ thống tự điền tên người mua).
                            </p>
                        </div>

                        <div className="flex gap-4 mb-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, editorType: 'RICH_TEXT' })}
                                style={{
                                    flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid',
                                    borderColor: formData.editorType === 'RICH_TEXT' ? 'var(--primary)' : 'var(--border)',
                                    background: formData.editorType === 'RICH_TEXT' ? 'rgba(79, 70, 229, 0.05)' : '#fff',
                                    color: formData.editorType === 'RICH_TEXT' ? 'var(--primary)' : 'var(--text-main)',
                                    fontWeight: formData.editorType === 'RICH_TEXT' ? 600 : 400,
                                    transition: 'all 0.2s'
                                }}
                            >
                                Trình soạn thảo cơ bản (Rich Text)
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, editorType: 'DRAG_DROP' })}
                                style={{
                                    flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid',
                                    borderColor: formData.editorType === 'DRAG_DROP' ? 'var(--primary)' : 'var(--border)',
                                    background: formData.editorType === 'DRAG_DROP' ? 'rgba(79, 70, 229, 0.05)' : '#fff',
                                    color: formData.editorType === 'DRAG_DROP' ? 'var(--primary)' : 'var(--text-main)',
                                    fontWeight: formData.editorType === 'DRAG_DROP' ? 600 : 400,
                                    transition: 'all 0.2s'
                                }}
                            >
                                ⚡ Thiết kế mẫu Kéo & Thả (Pro)
                            </button>
                        </div>

                        {formData.editorType === 'RICH_TEXT' ? (
                            <RichTextEditor
                                value={formData.content}
                                onChange={val => setFormData({ ...formData, content: val })}
                                placeholder="CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM..."
                            />
                        ) : (
                            <TemplateBuilder
                                initialHtml={formData.content}
                                onChange={(html, css) => {
                                    // Combine HTML and CSS into one string for storage
                                    const combined = `<style>${css}</style>${html}`;
                                    setFormData(prev => ({ ...prev, content: combined }));
                                }}
                            />
                        )}
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
