'use client'
import React, { useState } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { createProjectRisk, updateProjectRisk } from '@/app/projects/actions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function CreateRiskModal({ projectId, isOpen, onClose, initialData }: { projectId: string; isOpen: boolean; onClose: () => void, initialData?: any }) {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [probability, setProbability] = useState(50);
    const [impact, setImpact] = useState('MEDIUM');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            setProbability(initialData.probability || 50);
            setImpact(initialData.impact || 'MEDIUM');
        } else if (isOpen && !initialData) {
            setTitle('');
            setDescription('');
            setProbability(50);
            setImpact('MEDIUM');
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!title.trim()) return;
        setIsSaving(true);
        try {
            if (initialData) {
                await updateProjectRisk(initialData.id, projectId, title, description, probability, impact);
            } else {
                await createProjectRisk(projectId, title, description, probability, impact);
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
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Chỉnh Sửa Rủi Ro" : "Nhận Diện Rủi Ro Mới"}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Tên rủi ro nhận diện *</label>
                    <input 
                        type="text" 
                        required 
                        value={title} 
                        onChange={e => setTitle(e.target.value)}
                        placeholder="VD: Khách hàng chậm thanh toán đợt 1"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Mô tả chi tiết</label>
                    <textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)}
                        rows={2}
                        placeholder="Giải thích rõ hoàn cảnh có thể gây rủi ro..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.95rem', resize: 'vertical' }}
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                            Xác suất xảy ra: {probability}%
                        </label>
                        <input 
                            type="range" 
                            min="1" 
                            max="100" 
                            value={probability}
                            onChange={e => setProbability(parseInt(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Mức độ tác động</label>
                        <select 
                            value={impact} 
                            onChange={e => setImpact(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                        >
                            <option value="LOW">Thấp (Low)</option>
                            <option value="MEDIUM">Trung bình (Medium)</option>
                            <option value="HIGH">Cao (High)</option>
                            <option value="CRITICAL">Nghiêm trọng (Critical)</option>
                        </select>
                    </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Hủy</Button>
                    <Button type="submit" variant="primary" disabled={isSaving || !title.trim()}>{isSaving ? 'Đang lưu...' : (initialData ? 'Lưu Thay Đổi' : 'Theo Dõi Rủi Ro')}</Button>
                </div>
            </form>
        </Modal>
    );
}
