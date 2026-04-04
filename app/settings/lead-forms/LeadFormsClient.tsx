'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Plus, Edit3, Trash2, Link as LinkIcon, CheckCircle2, XCircle, Code } from 'lucide-react';
import { createLeadForm, updateLeadForm, deleteLeadForm } from './actions';
import { formatDate } from '@/lib/utils/formatters';

export function LeadFormsClient({ initialForms, users }: { initialForms: any[], users: any[] }) {
    const [forms, setForms] = useState(initialForms);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingFormId, setEditingFormId] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [source, setSource] = useState('Website');
    const [assigneeId, setAssigneeId] = useState('');
    const [successMessage, setSuccessMessage] = useState('Cảm ơn bạn đã để lại thông tin. Chúng tôi sẽ liên hệ lại trong thời gian sớm nhất.');
    const [isActive, setIsActive] = useState(true);

    const openCreateModal = () => {
        setEditingFormId(null);
        setTitle('');
        setSource('Website');
        setAssigneeId('');
        setSuccessMessage('Cảm ơn bạn đã để lại thông tin. Chúng tôi sẽ liên hệ lại trong thời gian sớm nhất.');
        setIsActive(true);
        setIsModalOpen(true);
    };

    const openEditModal = (form: any) => {
        setEditingFormId(form.id);
        setTitle(form.title);
        setSource(form.source);
        setAssigneeId(form.assigneeId || '');
        setSuccessMessage(form.successMessage || '');
        setIsActive(form.isActive);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Vui lòng nhập tên Form.');
            return;
        }

        setIsSaving(true);
        try {
            const data = {
                title,
                source,
                assigneeId: assigneeId || undefined,
                successMessage,
                isActive
            };

            let updatedForms = [...forms];

            if (editingFormId) {
                const res = await updateLeadForm(editingFormId, data);
                if (!res.success) throw new Error(res.error);
                const index = updatedForms.findIndex(f => f.id === editingFormId);
                if (index !== -1) {
                    updatedForms[index] = { ...updatedForms[index], ...res.leadForm, assignee: users.find(u => u.id === data.assigneeId) };
                }
            } else {
                const res = await createLeadForm(data);
                if (!res.success) throw new Error(res.error);
                updatedForms.unshift({ ...res.leadForm, assignee: users.find(u => u.id === data.assigneeId) });
            }

            setForms(updatedForms);
            setIsModalOpen(false);
        } catch (error: any) {
            alert('Lỗi: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa form cấu hình này? Các Lead đã tạo từ form sẽ KHÔNG bị ảnh hưởng.')) {
            const res = await deleteLeadForm(id);
            if (res.success) {
                setForms(forms.filter(f => f.id !== id));
            } else {
                alert('Lỗi: ' + res.error);
            }
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Đã copy đường dẫn iframe!');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>Cấu Hình Lead Form</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Quản lý các biểu mẫu thu thập dữ liệu Cơ hội bán hàng (Lead) từ Website/Landing Page.</p>
                </div>
                <Button onClick={openCreateModal} className="gap-2">
                    <Plus size={16} /> Tạo Form Mới
                </Button>
            </div>

            <Card style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Tên Form</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Nguồn (Source)</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Người Nhận (Assignee)</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Trạng thái</th>
                            <th style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {forms.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>Chưa có cấu hình form nào.</td>
                            </tr>
                        ) : (
                            forms.map((form) => {
                                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                const publicUrl = `${origin}/f/${form.id}`;
                                const iframeCode = `<iframe src="${publicUrl}" width="100%" height="600px" frameborder="0"></iframe>`;

                                return (
                                    <tr key={form.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50">
                                        <td style={{ padding: '1rem', fontSize: '0.9375rem', fontWeight: 500, color: '#0f172a' }}>
                                            {form.title}
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>ID: {form.id}</div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#475569' }}>{form.source}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#475569' }}>
                                            {form.assignee ? form.assignee.name : <em style={{ color: '#94a3b8' }}>Chưa gán</em>}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {form.isActive ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    <CheckCircle2 size={12} /> Đang Bật
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    <XCircle size={12} /> Đã Tắt
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button onClick={() => copyToClipboard(iframeCode)} style={{ padding: '0.4rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b', borderRadius: '4px' }} title="Copy mã nhúng Iframe" className="hover:bg-slate-100 hover:text-blue-600">
                                                    <Code size={15} />
                                                </button>
                                                <button onClick={() => window.open(publicUrl, '_blank')} style={{ padding: '0.4rem', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b', borderRadius: '4px' }} title="Xem trang Public Form" className="hover:bg-slate-100 hover:text-blue-600">
                                                    <LinkIcon size={15} />
                                                </button>
                                                <button onClick={() => openEditModal(form)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', borderRadius: '4px' }} className="hover:bg-slate-100 hover:text-blue-600">
                                                    <Edit3 size={15} />
                                                </button>
                                                <button onClick={() => handleDelete(form.id)} style={{ padding: '0.4rem', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', borderRadius: '4px' }} className="hover:bg-red-50 hover:text-red-600">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingFormId ? "Sửa Cấu hình Form" : "Tạo Cấu hình Form Mới"}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#334155' }}>Tên Form Cấu hình <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none' }} className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="VD: Form Landing Page Tháng 10..." />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#334155' }}>Nguồn Lead (Source)</label>
                            <input type="text" value={source} onChange={e => setSource(e.target.value)} style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none' }} className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Website, Facebook, Zalo, LandingPage..." />
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: '#64748b' }}>Sẽ lưu vào trường Nguồn của Cơ hội bán hàng.</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#334155' }}>Người Nhận (Tự động gán)</label>
                            <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none', backgroundColor: '#fff' }} className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                <option value="">-- Không tự động gán --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#334155' }}>Thông báo thành công</label>
                        <textarea value={successMessage} onChange={e => setSuccessMessage(e.target.value)} rows={3} style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none', resize: 'vertical' }} className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Cảm ơn bạn..." />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                        <label htmlFor="isActive" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>Kích hoạt Form (Cho phép nhận dữ liệu)</label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
                            {isSaving ? 'Đang lưu...' : (editingFormId ? 'Cập nhật' : 'Hoàn tất')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
