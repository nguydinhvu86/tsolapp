'use client'

import React, { useState } from 'react';
import { ContractTemplate } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { TemplateVariablesGuide } from '@/app/components/ui/TemplateVariablesGuide';
import { TemplateBuilder } from '@/app/components/ui/TemplateBuilder';
import { createTemplate, updateTemplate, deleteTemplate } from './actions';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function TemplateClient({ initialData }: { initialData: ContractTemplate[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = isAdmin || permissions.includes('TEMPLATES_CREATE');
    const canEdit = isAdmin || permissions.includes('TEMPLATES_EDIT');
    const canDelete = isAdmin || permissions.includes('TEMPLATES_DELETE');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', content: '', editorType: 'RICH_TEXT' });

    const openModal = (template?: ContractTemplate) => {
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
            await updateTemplate(editingId, formData);
        } else {
            await createTemplate(formData);
        }
        closeModal();
        router.refresh();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa mẫu hợp đồng này?')) {
            await deleteTemplate(id);
            router.refresh();
        }
    };

    const handleCopy = async (template: ContractTemplate) => {
        const t = template as any;
        if (confirm(`Bạn có muốn tạo bản sao của mẫu "${template.name}"?`)) {
            await createTemplate({
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Cấu hình Mẫu</h2>
                {canCreate && (
                    <Button onClick={() => openModal()} className="gap-2">
                        <Plus size={18} /> Thêm mẫu mới
                    </Button>
                )}
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
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có mẫu hợp đồng nào</td></tr>
                    ) : initialData.map(template => (
                        <tr key={template.id}>
                            <td style={{ fontWeight: 500 }}>{template.name}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{template.description || '-'}</td>
                            <td style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>{new Date(template.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td>
                                <div className="flex gap-2">
                                    {canEdit && (
                                        <button onClick={() => openModal(template)} style={{ color: 'var(--text-muted)' }} title="Sửa">
                                            <Edit size={18} />
                                        </button>
                                    )}
                                    {canCreate && (
                                        <button onClick={() => handleCopy(template)} style={{ color: 'var(--success, #16a34a)' }} title="Sao chép (Nhân bản)">
                                            <Copy size={18} />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button onClick={() => handleDelete(template.id)} style={{ color: 'var(--danger)' }} title="Xóa">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Sửa mẫu hợp đồng' : 'Thêm mẫu mới'} maxWidth={formData.editorType === 'DRAG_DROP' ? '1400px' : '1000px'}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Input
                        label="Tên mẫu hợp đồng *"
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
                        <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Nội dung mẫu hợp đồng *</label>
                        <TemplateVariablesGuide />
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
