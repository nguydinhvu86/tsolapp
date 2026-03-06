'use client'
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { PaymentRequestTemplate } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { TemplateVariablesGuide } from '@/app/components/ui/TemplateVariablesGuide';
import { TemplateBuilder } from '@/app/components/ui/TemplateBuilder';
import { createPaymentRequestTemplate, updatePaymentRequestTemplate, deletePaymentRequestTemplate } from './actions';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function PaymentRequestTemplateClient({ initialData }: { initialData: PaymentRequestTemplate[] }) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', content: '', editorType: 'RICH_TEXT' });

    const openModal = (template?: PaymentRequestTemplate) => {
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
        try {
            if (editingId) {
                await updatePaymentRequestTemplate(editingId, formData);
            } else {
                await createPaymentRequestTemplate(formData);
            }
            closeModal();
            router.refresh();
        } catch (error: any) {
            console.error('Lỗi lưu mẫu:', error);
            alert('Lưu mẫu thất bại! Lỗi này thường do phần mềm diệt virus (ví dụ: Kaspersky Protection) hoặc tiện ích trình duyệt chặn gửi dữ liệu văn bản lớn. Vui lòng tắt tạm thời tiện ích diệt virus trên trình duyệt web này và thử lại.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a máº«u Ä‘á» nghá»‹ nÃ y?')) {
            await deletePaymentRequestTemplate(id);
            router.refresh();
        }
    };

    const handleCopy = async (template: PaymentRequestTemplate) => {
        const t = template as any;
        if (confirm(`Báº¡n cÃ³ muá»‘n táº¡o báº£n sao cá»§a máº«u "${template.name}"?`)) {
            await createPaymentRequestTemplate({
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Cáº¥u hÃ¬nh Máº«u Äá» Nghá»‹</h2>
                <Button onClick={() => openModal()} className="gap-2">
                    <Plus size={18} /> ThÃªm máº«u má»›i
                </Button>
            </div>

            <Table>
                <thead>
                    <tr>
                        <th>TÃªn Máº«u</th>
                        <th>MÃ´ táº£</th>
                        <th>NgÃ y táº¡o</th>
                        <th style={{ width: '100px' }}>Thao tÃ¡c</th>
                    </tr>
                </thead>
                <tbody>
                    {initialData.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>ChÆ°a cÃ³ máº«u Ä‘á» nghá»‹ nÃ o</td></tr>
                    ) : initialData.map(template => (
                        <tr key={template.id}>
                            <td style={{ fontWeight: 500 }}>{template.name}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{template.description || '-'}</td>
                            <td style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>{formatDate(new Date(template.createdAt))}</td>
                            <td>
                                <div className="flex gap-2">
                                    <button onClick={() => openModal(template)} style={{ color: 'var(--text-muted)' }} title="Sá»­a">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleCopy(template)} style={{ color: 'var(--success, #16a34a)' }} title="Sao chÃ©p (NhÃ¢n báº£n)">
                                        <Copy size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(template.id)} style={{ color: 'var(--danger)' }} title="XÃ³a">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Sá»­a máº«u Ä‘á» nghá»‹' : 'ThÃªm máº«u má»›i'} maxWidth={formData.editorType === 'DRAG_DROP' ? '1400px' : '1000px'}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <Input
                        label="TÃªn máº«u Ä‘á» nghá»‹ *"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                        label="MÃ´ táº£ ngáº¯n gá»n"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="flex flex-col gap-2">
                        <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Ná»™i dung máº«u Ä‘á» nghá»‹ *</label>
                        <TemplateVariablesGuide />

                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '4px', fontSize: '0.875rem' }}>
                            <p style={{ margin: 0, color: '#166534' }}>
                                <strong>ðŸ’¡ Máº¹o thiáº¿t káº¿ Máº«u Äá» Nghá»‹:</strong><br />
                                Há»‡ thá»‘ng há»— trá»£ tÃ­nh nÄƒng <strong>Báº£ng tÃ­nh Äá»™ng (Mini-Excel)</strong>. Äá»ƒ chÃ¨n má»™t báº£ng tÃ­nh cho phÃ©p nháº­p liá»‡u vÃ  tá»± Ä‘á»™ng nhÃ¢n <strong style={{ color: 'var(--danger)' }}>Sá»‘ lÆ°á»£ng Ã— ÄÆ¡n giÃ¡ = ThÃ nh tiá»n</strong>, báº¡n chá»‰ cáº§n gÃµ chÃ­nh xÃ¡c dÃ²ng chá»¯ nÃ y vÃ o vá»‹ trÃ­ mong muá»‘n:
                            </p>
                            <code style={{ background: '#dcfce3', color: '#15803d', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', display: 'inline-block', marginTop: '0.5rem' }}>
                                {'{{TABLE_THIETBI}}'}
                            </code>
                            <p style={{ margin: '0.5rem 0 0 0', color: '#166534', fontSize: '0.8125rem' }}>
                                (LÆ°u Ã½: Báº¡n cÅ©ng cÃ³ thá»ƒ dÃ¹ng cÃ¡c biáº¿n chá»¯ Ä‘Æ¡n giáº£n nhÆ° <code>{'{{TEN_KHACH_HANG}}'}</code> Ä‘á»ƒ há»‡ thá»‘ng tá»± Ä‘iá»n tÃªn ngÆ°á»i mua).
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
                                TrÃ¬nh soáº¡n tháº£o cÆ¡ báº£n (Rich Text)
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
                                âš¡ Thiáº¿t káº¿ máº«u KÃ©o & Tháº£ (Pro)
                            </button>
                        </div>

                        {formData.editorType === 'RICH_TEXT' ? (
                            <RichTextEditor
                                value={formData.content}
                                onChange={val => setFormData({ ...formData, content: val })}
                                placeholder="Cá»˜NG HOÃ€ XÃƒ Há»˜I CHá»¦ NGHÄ¨A VIá»†T NAM..."
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
                        <Button type="button" variant="secondary" onClick={closeModal}>Há»§y</Button>
                        <Button type="submit">LÆ°u láº¡i</Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
}
