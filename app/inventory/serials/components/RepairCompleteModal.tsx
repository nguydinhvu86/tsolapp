'use client'

import React, { useState } from 'react';
import { toast } from '@/app/components/providers/ToastProvider';
import { X, CheckCircle2, Wrench, User, Calendar } from 'lucide-react';
import { completeWarrantyRepairAction } from '../actions';

interface RepairCompleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    serial: any | null;
    onSuccess: () => void;
}

export default function RepairCompleteModal({
    isOpen,
    onClose,
    serial,
    onSuccess
}: RepairCompleteModalProps) {
    const [repairResult, setRepairResult] = useState('Đã thay linh kiện chính hãng, kiểm tra chạy thử 24h hoạt động ổn định, vệ sinh máy');
    const [notes, setNotes] = useState('Đã bàn giao lại cho khách hàng kèm phiếu xác nhận kiểm tra');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !serial) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repairResult.trim()) {
            toast.warning('Vui lòng nhập kết quả xử lý sửa chữa');
            return;
        }

        setLoading(true);
        try {
            const res = await completeWarrantyRepairAction({
                serialId: serial.id,
                repairResult,
                notes
            });

            if (res.success) {
                toast.success(res.message || 'Hoàn tất bảo hành và cập nhật trả máy thành công!');
                onSuccess();
                onClose();
            } else {
                toast.error(res.error || 'Có lỗi xảy ra');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi hệ thống');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5">
                <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/50">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                Hoàn Tất Bảo Hành & Trả Thiết Bị
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Cập nhật kết quả sửa chữa và trả thiết bị về cho khách hàng
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1">
                    <div>Mã Serial: <strong className="font-mono text-blue-600 dark:text-blue-400">{serial.serialNumber}</strong></div>
                    <div>Sản phẩm: <strong>{serial.product?.name}</strong></div>
                    <div>Khách hàng: <strong>{serial.customer?.name || 'Khách vãng lai'}</strong></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Kết quả xử lý / Nội dung sửa chữa <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={repairResult}
                            onChange={(e) => setRepairResult(e.target.value)}
                            placeholder="Mô tả các linh kiện đã thay thế, kết quả kiểm tra test..."
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Ghi chú khi bàn giao lại cho khách
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {loading ? 'Đang lưu...' : 'Xác Nhận Hoàn Tất & Trả Máy'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
