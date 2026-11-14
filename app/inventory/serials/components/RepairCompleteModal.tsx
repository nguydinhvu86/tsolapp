'use client'

import React, { useState } from 'react';
import { toast } from '@/app/components/providers/ToastProvider';
import { X, CheckCircle2, Wrench, User, Calendar, Package, FileText } from 'lucide-react';
import { completeWarrantyRepairAction } from '../actions';

interface RepairCompleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    serial: any | null;
    onSuccess: () => void;
    onOpenSlip?: (serial: any) => void;
}

export default function RepairCompleteModal({
    isOpen,
    onClose,
    serial,
    onSuccess,
    onOpenSlip
}: RepairCompleteModalProps) {
    const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 16));
    const [repairResult, setRepairResult] = useState('Đã thay linh kiện chính hãng, kiểm tra chạy thử 24h hoạt động ổn định, vệ sinh máy');
    const [accessoriesReturned, setAccessoriesReturned] = useState(serial?.latestAccessories || 'Đầy đủ thân máy + phụ kiện như lúc tiếp nhận');
    const [notes, setNotes] = useState('Đã bàn giao lại cho khách hàng kèm phiếu xác nhận kiểm tra và tem bảo hành niêm phong');
    const [autoOpenSlip, setAutoOpenSlip] = useState(true);
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
                notes,
                returnDate: returnDate || new Date().toISOString(),
                accessoriesReturned
            });

            if (res.success) {
                toast.success(res.message || 'Hoàn tất bảo hành và cập nhật trả máy thành công!');
                onSuccess();
                onClose();
                if (autoOpenSlip && onOpenSlip) {
                    onOpenSlip({ ...serial, lastReturnDate: returnDate, latestRepairResult: repairResult, latestStaffNotes: notes });
                }
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
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
                                Cập nhật kết quả sửa chữa, ngày hoàn trả và bàn giao thiết bị về cho khách hàng
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
                    <div className="flex justify-between">
                        <span>Mã Serial: <strong className="font-mono text-blue-600 dark:text-blue-400">{serial.serialNumber}</strong></span>
                        <span className="text-emerald-600 font-bold">Số lần bảo hành: {serial.warrantyCount ? serial.warrantyCount : 1}</span>
                    </div>
                    <div>Sản phẩm: <strong>{serial.product?.name}</strong></div>
                    <div>Khách hàng / Đại lý: <strong>{serial.customer?.name || 'Khách vãng lai'}</strong></div>
                    {serial.latestAccessories && (
                        <div className="text-amber-800 dark:text-amber-300 font-medium pt-1 border-t border-slate-200/60">
                            Phụ kiện nhận kèm ban đầu: <strong>{serial.latestAccessories}</strong>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    {/* Return Date */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            Ngày & Giờ hoàn trả bảo hành cho khách <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                            required
                        />
                    </div>

                    {/* Repair Result & Parts Replaced */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                            Kết quả xử lý / Linh kiện thay thế / Nội dung sửa chữa <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={repairResult}
                            onChange={(e) => setRepairResult(e.target.value)}
                            placeholder="Mô tả chi tiết linh kiện đã thay thế, kết quả kiểm tra test 24h..."
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                            required
                        />
                    </div>

                    {/* Accessories Returned */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-blue-600" />
                            Phụ kiện hoàn trả lại cho khách hàng
                        </label>
                        <input
                            type="text"
                            value={accessoriesReturned}
                            onChange={(e) => setAccessoriesReturned(e.target.value)}
                            placeholder="VD: Trả đủ thân máy + sạc cáp + hộp như lúc tiếp nhận"
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-purple-600" />
                            Ghi chú / Lưu ý của nhân viên khi bàn giao trả máy
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="VD: Khách đã ký biên bản bàn giao, kiểm tra hoạt động tốt tại chỗ..."
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                        />
                    </div>

                    {/* Checkbox: Tự động mở phiếu trả bảo hành */}
                    <div className="pt-1">
                        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={autoOpenSlip}
                                onChange={(e) => setAutoOpenSlip(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span>Tự động mở và in Phiếu Trả Bảo Hành / Biên Bản Bàn Giao ngay sau khi lưu</span>
                        </label>
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
