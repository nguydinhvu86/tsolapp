'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { createProjectRisk, updateProjectRisk } from '@/app/projects/actions';
import { useRouter } from 'next/navigation';

export function CreateRiskModal({
    projectId,
    isOpen,
    onClose,
    initialData
}: {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    initialData?: any;
}) {
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
        if (!title.trim()) return;

        setIsSaving(true);
        try {
            if (initialData) {
                await updateProjectRisk(initialData.id, projectId, title.trim(), description.trim(), probability, impact);
            } else {
                await createProjectRisk(projectId, title.trim(), description.trim(), probability, impact);
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Chỉnh Sửa Rủi Ro" : "Nhận Diện Rủi Ro Mới"}
            maxWidth="620px"
        >
            <form onSubmit={handleSubmit} className="space-y-4 p-2">
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Tên rủi ro nhận diện <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="VD: Khách hàng chậm thanh toán đợt 1"
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Mô tả chi tiết rủi ro & Nguy cơ
                    </label>
                    <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Giải thích hoàn cảnh hoặc nguyên nhân có thể gây rủi ro..."
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Xác suất xảy ra
                            </label>
                            <span className="text-xs font-bold text-indigo-600 px-2 py-0.5 rounded bg-indigo-50">
                                {probability}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={probability}
                            onChange={(e) => setProbability(parseInt(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Mức độ tác động
                        </label>
                        <select
                            value={impact}
                            onChange={(e) => setImpact(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                            <option value="LOW">Thấp (Low)</option>
                            <option value="MEDIUM">Trung bình (Medium)</option>
                            <option value="HIGH">Cao (High)</option>
                            <option value="CRITICAL">Nghiêm trọng (Critical)</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSaving || !title.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                        {isSaving ? 'Đang lưu...' : (initialData ? 'Lưu Thay Đổi' : 'Ghi Nhận Rủi Ro')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
