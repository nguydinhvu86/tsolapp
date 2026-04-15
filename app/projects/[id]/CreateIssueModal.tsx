'use client'
import React, { useState } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { createProjectIssue, updateProjectIssue } from '@/app/projects/actions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function CreateIssueModal({ projectId, isOpen, onClose, initialData }: { projectId: string; isOpen: boolean; onClose: () => void, initialData?: any }) {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('AMBER');
    const [mitigationPlan, setMitigationPlan] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            setSeverity(initialData.severity || 'AMBER');
            setMitigationPlan(initialData.mitigationPlan || '');
        } else if (isOpen && !initialData) {
            setTitle('');
            setDescription('');
            setSeverity('AMBER');
            setMitigationPlan('');
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!title.trim()) return;
        setIsSaving(true);
        try {
            if (initialData) {
                await updateProjectIssue(initialData.id, projectId, title, description, severity, mitigationPlan);
            } else {
                await createProjectIssue(projectId, title, description, severity, mitigationPlan);
            }
            router.refresh();
            onClose();
        } catch (err: any) {
            alert(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Chỉnh sửa Sự Cố & Vấn Đề" : "Ghi Nhận Sự Cố & Vấn Đề"}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Tiêu đề vấn đề *</label>
                    <input 
                        type="text" 
                        required 
                        value={title} 
                        onChange={e => setTitle(e.target.value)}
                        placeholder="VD: Thiếu môi trường server deploy test"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Mô tả chi tiết</label>
                    <textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Mô tả cụ thể sự cố đang gặp phải..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.95rem', resize: 'vertical' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Mức độ nghiêm trọng RAG</label>
                    <select 
                        value={severity} 
                        onChange={e => setSeverity(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                    >
                        <option value="GREEN">Xanh - Chấp nhận được (Ít ảnh hưởng)</option>
                        <option value="AMBER">Vàng - Cảnh báo (Cần lưu ý xử lý)</option>
                        <option value="RED">Đỏ - Nghiêm trọng (Blocker lớn)</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Phương án khắc phục dự kiến</label>
                    <textarea 
                        value={mitigationPlan} 
                        onChange={e => setMitigationPlan(e.target.value)}
                        rows={2}
                        placeholder="Cách thức hoặc yêu cầu hỗ trợ để giải quyết..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.95rem', resize: 'vertical' }}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Hủy</Button>
                    <Button type="submit" variant="primary" disabled={isSaving || !title.trim()}>{isSaving ? 'Đang lưu...' : (initialData ? 'Lưu Thay Đổi' : 'Ghi Nhận Vấn Đề')}</Button>
                </div>
            </form>
        </Modal>
    );
}
