'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { createProjectIssue, updateProjectIssue } from '@/app/projects/actions';
import { useRouter } from 'next/navigation';

export function CreateIssueModal({
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
        if (!title.trim()) return;

        setIsSaving(true);
        try {
            if (initialData) {
                await updateProjectIssue(initialData.id, projectId, title.trim(), description.trim(), severity, mitigationPlan.trim());
            } else {
                await createProjectIssue(projectId, title.trim(), description.trim(), severity, mitigationPlan.trim());
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
            title={initialData ? "Chỉnh Sửa Sự Cố & Vấn Đề" : "Ghi Nhận Sự Cố & Vấn Đề"}
            maxWidth="620px"
        >
            <form onSubmit={handleSubmit} className="space-y-4 p-2">
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Tiêu đề sự cố / vấn đề <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="VD: Thiếu môi trường server deploy test"
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Mức độ nghiêm trọng (RAG)
                    </label>
                    <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                        <option value="GREEN">Xanh - Chấp nhận được (Ít ảnh hưởng)</option>
                        <option value="AMBER">Vàng - Cảnh báo (Cần lưu ý xử lý)</option>
                        <option value="RED">Đỏ - Nghiêm trọng (Blocker lớn)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Mô tả chi tiết sự cố
                    </label>
                    <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mô tả cụ thể sự cố đang gặp phải..."
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Phương án giải quyết dự kiến
                    </label>
                    <textarea
                        rows={2}
                        value={mitigationPlan}
                        onChange={(e) => setMitigationPlan(e.target.value)}
                        placeholder="Cách thức hoặc yêu cầu hỗ trợ để giải quyết sự cố..."
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
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
                        {isSaving ? 'Đang lưu...' : (initialData ? 'Lưu Thay Đổi' : 'Ghi Nhận Vấn Đề')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
