'use client';

import React, { useState } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createTask } from '@/app/tasks/actions';
import { Globe, Lock, Loader2 } from 'lucide-react';

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate: Date | null;
    onSuccess: () => void;
}

export function AddEventModal({ isOpen, onClose, initialDate, onSuccess }: AddEventModalProps) {
    const router = useRouter();
    const { data: session } = useSession();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!title.trim()) {
            setError("Vui lòng nhập tiêu đề sự kiện");
            return;
        }

        setIsSubmitting(true);
        try {
            const taskData = {
                title,
                description,
                isPublic,
                dueDate: initialDate ? new Date(initialDate.getTime() - initialDate.getTimezoneOffset() * 60000).toISOString() : new Date().toISOString(),
                priority: 'MEDIUM',
                status: 'TODO'
            };

            await createTask(taskData, session?.user?.id as string);

            // Reset and close
            setTitle('');
            setDescription('');
            setIsPublic(true);
            onSuccess();
            onClose();
            router.refresh();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Có lỗi xảy ra khi tạo sự kiện');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Thêm kế hoạch / Sự kiện mới" maxWidth="500px">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 cursor-pointer">
                        Quyền xem mặc định
                    </label>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setIsPublic(true)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${isPublic ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Globe className="w-4 h-4" />
                            Công khai
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsPublic(false)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${!isPublic ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Lock className="w-4 h-4" />
                            Chỉ mình tôi
                        </button>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">
                        {isPublic ? 'Tất cả mọi người đều có thể thấy sự kiện này trên lịch.' : 'Chỉ bạn (và những người được giao) mới thấy sự kiện này.'}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tiêu đề sự kiện <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="VD: Họp giao ban đầu tuần..."
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ghi chú thêm (Không bắt buộc)
                    </label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Thêm mô tả công việc..."
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow resize-none"
                    ></textarea>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        Hủy
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !title.trim()} className="min-w-[120px]">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Tạo sự kiện'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
