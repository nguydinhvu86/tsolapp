'use client'

import React, { useState } from 'react';
import { toast } from '@/app/components/providers/ToastProvider';
import { 
    X, 
    RotateCcw, 
    Wrench, 
    AlertTriangle, 
    ShieldAlert, 
    Package, 
    User, 
    Calendar, 
    Warehouse as WarehouseIcon,
    FileText,
    Clock,
    Tag
} from 'lucide-react';
import { receiveDefectiveSerialAction } from '../actions';

interface ReceiveDefectiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    serial: any | null;
    warehouses: any[];
    onSuccess: () => void;
}

const COMMON_ACCESSORIES = [
    'Thân máy',
    'Củ sạc / Adapter',
    'Dây nguồn / Cáp sạc',
    'Vỏ hộp zin',
    'Sách HDSD',
    'Remote / Điều khiển',
    'Tai nghe / Mic',
    'Ăng-ten / Phụ kiện phụ'
];

export default function ReceiveDefectiveModal({
    isOpen,
    onClose,
    serial,
    warehouses,
    onSuccess
}: ReceiveDefectiveModalProps) {
    const [actionType, setActionType] = useState<'UNDER_WARRANTY' | 'DEFECTIVE'>('UNDER_WARRANTY');
    const [defectReason, setDefectReason] = useState('');
    const [appearanceCondition, setAppearanceCondition] = useState('Mới 98-99%, xước dăm nhẹ viền máy, tem bảo hành còn nguyên');
    const [accessoriesIncluded, setAccessoriesIncluded] = useState('Thân máy + Củ sạc + Dây cáp nguồn');
    const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().slice(0, 16));
    const [warehouseId, setWarehouseId] = useState(serial?.warehouseId || '');
    const [receiverNotes, setReceiverNotes] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !serial) return null;

    const toggleAccessory = (acc: string) => {
        let current = accessoriesIncluded.split('+').map(s => s.trim()).filter(Boolean);
        if (current.includes(acc)) {
            current = current.filter(item => item !== acc);
        } else {
            current.push(acc);
        }
        setAccessoriesIncluded(current.join(' + '));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!defectReason.trim()) {
            toast.warning('Vui lòng nhập hiện tượng lỗi / lý do thiết bị bị trả về');
            return;
        }

        setLoading(true);
        try {
            const res = await receiveDefectiveSerialAction({
                serialId: serial.id,
                serialNumber: serial.serialNumber,
                actionType,
                defectReason,
                appearanceCondition,
                accessoriesIncluded,
                receiverNotes,
                warehouseId: warehouseId || undefined,
                receivedDate: receivedDate || new Date().toISOString()
            });

            if (res.success) {
                toast.success(res.message || 'Tiếp nhận hàng bảo hành/lỗi thành công!');
                onSuccess();
                onClose();
            } else {
                toast.error(res.error || 'Có lỗi xảy ra khi tiếp nhận');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi hệ thống');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/50">
                            <Wrench className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                Tiếp Nhận Hàng Lỗi / Yêu Cầu Bảo Hành (RMA)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Ghi nhận thiết bị khách hàng gửi trả bảo hành hoặc đổi trả sản phẩm lỗi - Giám sát chi tiết vòng đời
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

                {/* Device Info Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                        <span className="text-slate-400 block">Số Serial / IMEI:</span>
                        <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">{serial.serialNumber}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block">Sản phẩm:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{serial.product?.name}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block">Khách hàng sở hữu / Đại lý:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{serial.customer?.name || 'Khách vãng lai'} ({serial.customer?.phone || 'N/A'})</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block">Hạn bảo hành chót:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {serial.warrantyEndDate ? new Date(serial.warrantyEndDate).toLocaleDateString('vi-VN') : 'Không xác định'}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    {/* Action Type Selection */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                            Hình thức tiếp nhận xử lý <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                actionType === 'UNDER_WARRANTY'
                                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}>
                                <input
                                    type="radio"
                                    name="actionType"
                                    value="UNDER_WARRANTY"
                                    checked={actionType === 'UNDER_WARRANTY'}
                                    onChange={() => setActionType('UNDER_WARRANTY')}
                                    className="mt-1 text-amber-600"
                                />
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white block text-xs">
                                        🛠️ Tiếp Nhận Bảo Hành / Sửa Chữa
                                    </span>
                                    <span className="text-[11px] text-slate-500 block mt-0.5">
                                        Chuyển sang trạng thái "Đang bảo hành", kỹ thuật viên tiếp nhận & giám sát
                                    </span>
                                </div>
                            </label>

                            <label className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                actionType === 'DEFECTIVE'
                                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}>
                                <input
                                    type="radio"
                                    name="actionType"
                                    value="DEFECTIVE"
                                    checked={actionType === 'DEFECTIVE'}
                                    onChange={() => setActionType('DEFECTIVE')}
                                    className="mt-1 text-rose-600"
                                />
                                <div>
                                    <span className="font-bold text-slate-900 dark:text-white block text-xs">
                                        ⚠️ Hàng Lỗi Nặng / Chờ Đổi Mới
                                    </span>
                                    <span className="text-[11px] text-slate-500 block mt-0.5">
                                        Chuyển sang "Lỗi / Hỏng", chờ đổi máy mới thay thế hoặc hoàn trả nhà cung cấp
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Reception Date & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                Ngày & Giờ tiếp nhận bảo hành <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={receivedDate}
                                onChange={(e) => setReceivedDate(e.target.value)}
                                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-semibold"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                                <WarehouseIcon className="w-3.5 h-3.5 text-slate-500" />
                                Kho lưu giữ thiết bị
                            </label>
                            <select
                                value={warehouseId}
                                onChange={(e) => setWarehouseId(e.target.value)}
                                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                            >
                                <option value="">-- Kho hiện tại ({serial.warehouse?.name || 'Tổng kho'}) --</option>
                                {warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Defect Description */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                            Mô tả hiện tượng lỗi / Lý do gửi bảo hành <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={2}
                            value={defectReason}
                            onChange={(e) => setDefectReason(e.target.value)}
                            placeholder="Ví dụ: Thiết bị không lên nguồn, quạt kêu to, mất kết nối mạng..."
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                            required
                        />
                    </div>

                    {/* Appearance */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                            Tình trạng ngoại quan thiết bị khi nhận
                        </label>
                        <input
                            type="text"
                            value={appearanceCondition}
                            onChange={(e) => setAppearanceCondition(e.target.value)}
                            placeholder="VD: Máy mới 99%, có xước nhẹ viền máy, tem bảo hành còn nguyên..."
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>

                    {/* Accessories Included with Quick Pick Pills */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-emerald-600" />
                                Phụ kiện đi kèm khi nhận (Rất quan trọng khi đối soát & hoàn trả)
                            </label>
                        </div>
                        <input
                            type="text"
                            value={accessoriesIncluded}
                            onChange={(e) => setAccessoriesIncluded(e.target.value)}
                            placeholder="VD: Thân máy + Củ sạc + Dây nguồn + Hộp zin..."
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                        />
                        {/* Quick pick chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {COMMON_ACCESSORIES.map(acc => {
                                const isSelected = accessoriesIncluded.includes(acc);
                                return (
                                    <button
                                        key={acc}
                                        type="button"
                                        onClick={() => toggleAccessory(acc)}
                                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'bg-emerald-600 text-white shadow-2xs' 
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        {isSelected ? '✓ ' : '+ '} {acc}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Receiver Staff Notes */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                            Lưu ý / Ghi chú của nhân viên khi tiếp nhận & kiểm tra bước đầu
                        </label>
                        <textarea
                            rows={2}
                            value={receiverNotes}
                            onChange={(e) => setReceiverNotes(e.target.value)}
                            placeholder="Ghi nhận lưu ý đặc biệt, hẹn ngày trả khách, lưu ý phụ kiện nhận kèm..."
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>

                    {/* Footer Actions */}
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
                            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Wrench className="w-4 h-4" />
                            {loading ? 'Đang lưu...' : 'Xác Nhận Tiếp Nhận'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
