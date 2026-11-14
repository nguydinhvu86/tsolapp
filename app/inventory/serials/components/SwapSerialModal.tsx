'use client'

import React, { useState, useEffect } from 'react';
import { toast } from '@/app/components/providers/ToastProvider';
import { 
    X, 
    ArrowRightLeft, 
    Package, 
    User, 
    Calendar, 
    Warehouse as WarehouseIcon, 
    ShieldCheck, 
    Search,
    RefreshCw,
    CheckCircle2
} from 'lucide-react';
import { swapAndReplaceSerialAction, getAvailableSerialsForProduct } from '../actions';

interface SwapSerialModalProps {
    isOpen: boolean;
    onClose: () => void;
    serial: any | null;
    warehouses: any[];
    onSuccess: () => void;
}

export default function SwapSerialModal({
    isOpen,
    onClose,
    serial,
    warehouses,
    onSuccess
}: SwapSerialModalProps) {
    const [availableSerials, setAvailableSerials] = useState<any[]>([]);
    const [loadingSerials, setLoadingSerials] = useState(false);
    const [selectedNewSerialId, setSelectedNewSerialId] = useState('');
    const [serialSearch, setSerialSearch] = useState('');
    const [warrantyPolicy, setWarrantyPolicy] = useState<'INHERIT' | 'RENEW_FULL' | 'CUSTOM'>('INHERIT');
    const [customMonths, setCustomMonths] = useState(12);
    const [reason, setReason] = useState('Chính sách 1 đổi 1 - Lỗi phần cứng không khắc phục được');
    const [warehouseIdForOld, setWarehouseIdForOld] = useState(serial?.warehouseId || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && serial?.productId) {
            setLoadingSerials(true);
            getAvailableSerialsForProduct(serial.productId)
                .then(res => {
                    if (res.success && res.serials) {
                        setAvailableSerials(res.serials);
                        if (res.serials.length > 0) {
                            setSelectedNewSerialId(res.serials[0].id);
                        }
                    } else {
                        setAvailableSerials([]);
                    }
                })
                .catch(err => {
                    console.error('Lỗi lấy serial khả dụng:', err);
                    setAvailableSerials([]);
                })
                .finally(() => setLoadingSerials(false));
        }
    }, [isOpen, serial]);

    if (!isOpen || !serial) return null;

    const filteredAvailableSerials = availableSerials.filter(s => 
        s.serialNumber.toLowerCase().includes(serialSearch.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNewSerialId) {
            toast.warning('Vui lòng chọn một mã Serial mới trong kho để thay thế');
            return;
        }
        if (!reason.trim()) {
            toast.warning('Vui lòng nhập lý do đổi mới thiết bị');
            return;
        }

        const selectedNew = availableSerials.find(s => s.id === selectedNewSerialId);
        const confirmMsg = `Xác nhận đổi mới thiết bị 1-1:\n- Thu hồi máy cũ: ${serial.serialNumber}\n- Cấp máy mới: ${selectedNew?.serialNumber || selectedNewSerialId}\n- Khách hàng: ${serial.customer?.name || 'Vãng lai'}\n\nBạn có chắc chắn muốn tiến hành?`;
        
        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const res = await swapAndReplaceSerialAction({
                oldSerialId: serial.id,
                newSerialId: selectedNewSerialId,
                warrantyPolicy,
                customWarrantyMonths: warrantyPolicy === 'CUSTOM' ? customMonths : undefined,
                reason,
                oldSerialStatus: 'REPLACED',
                warehouseIdForOld: warehouseIdForOld || undefined
            });

            if (res.success) {
                toast.success(res.message || 'Đổi mới thiết bị 1-1 thành công!');
                onSuccess();
                onClose();
            } else {
                toast.error(res.error || 'Có lỗi xảy ra khi đổi mới thiết bị');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi hệ thống');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50">
                            <ArrowRightLeft className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                Xử Lý Đổi Mới Thiết Bị (1 Đổi 1 / Serial Swap)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Thu hồi thiết bị lỗi/cũ và cấp phát một mã Serial mới từ kho khả dụng cho khách hàng
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

                <form onSubmit={handleSubmit} className="space-y-5 text-sm">
                    {/* Comparison Box: Old vs New */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Old Serial Info */}
                        <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                    <X className="w-3.5 h-3.5" /> 1. Thiết Bị Cũ Thu Hồi
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold">
                                    {serial.status}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400">Số Serial / IMEI cũ:</span>
                                <span className="font-mono font-bold text-base text-rose-700 dark:text-rose-400 block">
                                    {serial.serialNumber}
                                </span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                                <div>Sản phẩm: <strong>{serial.product?.name}</strong></div>
                                <div>Khách hàng: <strong>{serial.customer?.name || 'Vãng lai'}</strong></div>
                                <div>
                                    Hạn BH hiện tại: <strong className="text-emerald-600">
                                        {serial.warrantyEndDate ? new Date(serial.warrantyEndDate).toLocaleDateString('vi-VN') : 'KBH'}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {/* New Serial Picker */}
                        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> 2. Chọn Serial Mới Cấp Khách
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold">
                                    Kho còn: {availableSerials.length} mã
                                </span>
                            </div>

                            {loadingSerials ? (
                                <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin" /> Đang tìm số Serial trong kho...
                                </div>
                            ) : availableSerials.length === 0 ? (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                                    ⚠️ Hiện không còn số Serial nào ở trạng thái "Tồn kho" cho sản phẩm này. Vui lòng nhập thêm Serial vào kho trước khi thực hiện đổi máy mới.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Lọc mã serial..."
                                            value={serialSearch}
                                            onChange={(e) => setSerialSearch(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                        />
                                    </div>
                                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                                        {filteredAvailableSerials.map((s) => (
                                            <label
                                                key={s.id}
                                                className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                                    selectedNewSerialId === s.id
                                                        ? 'border-emerald-500 bg-white dark:bg-slate-900 shadow-xs ring-1 ring-emerald-500'
                                                        : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="newSerial"
                                                        value={s.id}
                                                        checked={selectedNewSerialId === s.id}
                                                        onChange={() => setSelectedNewSerialId(s.id)}
                                                        className="text-emerald-600"
                                                    />
                                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                                        {s.serialNumber}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400">
                                                    {s.warehouse?.name || 'Kho chính'}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Warranty Policy for New Device */}
                    <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Chính sách thời hạn bảo hành cho thiết bị mới <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className={`p-3 rounded-2xl border cursor-pointer text-xs transition-all ${
                                warrantyPolicy === 'INHERIT'
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-800'
                            }`}>
                                <input
                                    type="radio"
                                    name="policy"
                                    value="INHERIT"
                                    checked={warrantyPolicy === 'INHERIT'}
                                    onChange={() => setWarrantyPolicy('INHERIT')}
                                    className="sr-only"
                                />
                                <span className="font-bold text-slate-900 dark:text-white block">
                                    🔄 Kế thừa hạn bảo hành cũ
                                </span>
                                <span className="text-[11px] text-slate-500 block mt-1">
                                    Hạn chót giữ nguyên như máy cũ ({serial.warrantyEndDate ? new Date(serial.warrantyEndDate).toLocaleDateString('vi-VN') : 'N/A'})
                                </span>
                            </label>

                            <label className={`p-3 rounded-2xl border cursor-pointer text-xs transition-all ${
                                warrantyPolicy === 'RENEW_FULL'
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-800'
                            }`}>
                                <input
                                    type="radio"
                                    name="policy"
                                    value="RENEW_FULL"
                                    checked={warrantyPolicy === 'RENEW_FULL'}
                                    onChange={() => setWarrantyPolicy('RENEW_FULL')}
                                    className="sr-only"
                                />
                                <span className="font-bold text-slate-900 dark:text-white block">
                                    ✨ Cấp chu kỳ mới 100%
                                </span>
                                <span className="text-[11px] text-slate-500 block mt-1">
                                    Tính lại từ hôm nay theo thời hạn chuẩn của sản phẩm ({serial.product?.warrantyMonths || 12} tháng)
                                </span>
                            </label>

                            <label className={`p-3 rounded-2xl border cursor-pointer text-xs transition-all ${
                                warrantyPolicy === 'CUSTOM'
                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-800'
                            }`}>
                                <input
                                    type="radio"
                                    name="policy"
                                    value="CUSTOM"
                                    checked={warrantyPolicy === 'CUSTOM'}
                                    onChange={() => setWarrantyPolicy('CUSTOM')}
                                    className="sr-only"
                                />
                                <span className="font-bold text-slate-900 dark:text-white block">
                                    ⚙️ Thời hạn tùy chỉnh
                                </span>
                                <div className="mt-1 flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={customMonths}
                                        onChange={(e) => setCustomMonths(parseInt(e.target.value, 10) || 12)}
                                        disabled={warrantyPolicy !== 'CUSTOM'}
                                        className="w-16 px-2 py-0.5 border rounded text-xs bg-white dark:bg-slate-900"
                                    />
                                    <span className="text-[11px] text-slate-500">tháng</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Reason & Old Warehouse Storage */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                Lý do đổi mới thiết bị <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="VD: Lỗi mainboard nhà sản xuất, đổi theo chính sách 30 ngày..."
                                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                Kho lưu giữ máy cũ thu hồi
                            </label>
                            <select
                                value={warehouseIdForOld}
                                onChange={(e) => setWarehouseIdForOld(e.target.value)}
                                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                            >
                                <option value="">-- Kho hiện tại ({serial.warehouse?.name || 'Tổng kho'}) --</option>
                                {warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
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
                            disabled={loading || availableSerials.length === 0}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        >
                            <ArrowRightLeft className="w-4 h-4" />
                            {loading ? 'Đang thực hiện đổi máy...' : 'Xác Nhận Đổi Mới 1-1'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
