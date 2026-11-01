'use client'

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    Check, 
    AlertCircle, 
    AlertTriangle, 
    CheckCircle2, 
    Barcode, 
    Search,
    RefreshCw,
    CheckSquare,
    Square,
    PackageCheck,
    Layers
} from 'lucide-react';
import { toast } from '@/app/components/providers/ToastProvider';
import { getAvailableSerialsForProduct } from '@/app/inventory/serials/actions';

interface SerialSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    requiredQuantity: number;
    initialSelectedSerials?: string[];
    alreadySelectedSerials?: string[];
    onSave: (selectedSerials: string[]) => void;
}

export default function SerialSelectModal({
    isOpen,
    onClose,
    productId,
    productName,
    requiredQuantity,
    initialSelectedSerials = [],
    alreadySelectedSerials = [],
    onSave
}: SerialSelectModalProps) {
    const [mounted, setMounted] = useState(false);
    const [availableSerials, setAvailableSerials] = useState<any[]>([]);
    const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    
    // Scanner input
    const [scanInput, setScanInput] = useState('');
    const scanInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const loadAvailable = async () => {
        if (!productId || productId === 'EXTERNAL') return;
        setLoading(true);
        const res = await getAvailableSerialsForProduct(productId);
        if (res.success) {
            setAvailableSerials(res.serials || []);
        } else {
            toast.error(res.error || 'Lỗi khi tải danh sách Serial tồn kho');
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            setSelectedSerials(initialSelectedSerials || []);
            setScanInput('');
            setSearchFilter('');
            if (productId && productId !== 'EXTERNAL') {
                loadAvailable();
            } else {
                setAvailableSerials([]);
            }
            setTimeout(() => {
                scanInputRef.current?.focus();
            }, 150);
        }
    }, [isOpen, productId, JSON.stringify(initialSelectedSerials)]);

    if (!isOpen || !mounted) return null;

    const count = selectedSerials.length;
    const isExact = count === requiredQuantity;
    const isLess = count < requiredQuantity;
    const isMore = count > requiredQuantity;

    // Handle single barcode scan
    const handleScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = scanInput.trim();
        if (!trimmed) return;

        // Check if serial is already assigned to another item in this invoice
        if (alreadySelectedSerials.includes(trimmed)) {
            toast.error(`Mã Serial "${trimmed}" đã được gán cho dòng sản phẩm khác trong hóa đơn này!`);
            setScanInput('');
            return;
        }

        // Check if serial exists in available list
        const match = availableSerials.find(s => s.serialNumber.toLowerCase() === trimmed.toLowerCase());
        if (!match) {
            toast.error(`Số Serial "${trimmed}" không tồn tại hoặc không ở trạng thái tồn kho của sản phẩm "${productName}"!`);
            setScanInput('');
            return;
        }

        const actualSerial = match.serialNumber;
        if (alreadySelectedSerials.includes(actualSerial)) {
            toast.error(`Mã Serial "${actualSerial}" đã được gán cho dòng sản phẩm khác trong hóa đơn này!`);
            setScanInput('');
            return;
        }

        if (selectedSerials.includes(actualSerial)) {
            toast.warning(`Số Serial "${actualSerial}" đã được chọn rồi!`);
            setScanInput('');
            return;
        }

        if (count >= requiredQuantity) {
            toast.warning(`Đã chọn đủ ${requiredQuantity} số serial. Không thể chọn thêm!`);
            setScanInput('');
            return;
        }

        setSelectedSerials(prev => [...prev, actualSerial]);
        toast.success(`Đã chọn: ${actualSerial}`);
        setScanInput('');
        scanInputRef.current?.focus();
    };

    const handleToggleSerial = (serialNumber: string) => {
        if (alreadySelectedSerials.includes(serialNumber)) {
            toast.warning(`Mã Serial "${serialNumber}" đã được gán cho dòng sản phẩm khác trong hóa đơn này!`);
            return;
        }

        if (selectedSerials.includes(serialNumber)) {
            setSelectedSerials(prev => prev.filter(s => s !== serialNumber));
        } else {
            if (count >= requiredQuantity) {
                toast.warning(`Đã chọn đủ ${requiredQuantity} mã Serial xuất bán. Vui lòng bỏ chọn bớt nếu muốn đổi mã khác!`);
                return;
            }
            setSelectedSerials(prev => [...prev, serialNumber]);
        }
    };

    // Auto pick first N available serials (excluding those used in other rows)
    const handleAutoPickFirst = () => {
        const needed = requiredQuantity;
        const availableList = availableSerials
            .map(s => s.serialNumber)
            .filter(sn => !alreadySelectedSerials.includes(sn));

        if (availableList.length < needed) {
            toast.warning(`Kho chỉ còn ${availableList.length} serial khả dụng, không đủ ${needed} chiếc!`);
            setSelectedSerials(availableList);
            return;
        }
        setSelectedSerials(availableList.slice(0, needed));
        toast.success(`Đã tự động chọn ${needed} mã Serial đầu tiên trong kho.`);
    };

    const handleConfirm = () => {
        if (!isExact) {
            toast.error(`Số lượng serial (${count}) không bằng số lượng xuất bán (${requiredQuantity}). Vui lòng chọn đúng ${requiredQuantity} mã!`);
            return;
        }

        onSave(selectedSerials);
        onClose();
    };

    const filteredSerials = availableSerials.filter(s => 
        s.serialNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (s.warehouse?.name && s.warehouse.name.toLowerCase().includes(searchFilter.toLowerCase()))
    );

    const modalContent = (
        <div 
            className="fixed inset-0 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
            style={{ zIndex: 999999 }}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                            <PackageCheck className="w-4 h-4" /> Chọn & Quét Serial Xuất Bán Cho Khách Hàng
                        </div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                            {productName}
                        </h3>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Counter & Status Alert */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Số lượng Serial xuất bán:</span>
                        <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                            {count} / {requiredQuantity} chiếc
                        </span>
                    </div>

                    {isExact ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>Đã chọn đủ chính xác {requiredQuantity}/{requiredQuantity} số Serial xuất bán!</span>
                        </div>
                    ) : isLess ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-medium">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                                Cần chọn thêm <strong>{requiredQuantity - count}</strong> mã Serial nữa để khớp đơn bán ({requiredQuantity} chiếc).
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs font-medium">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                                Đang chọn thừa <strong>{count - requiredQuantity}</strong> mã Serial so với số lượng bán ({requiredQuantity}). Vui lòng bỏ chọn bớt!
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 overflow-y-auto flex-1 text-sm">
                    {/* Scanner Input */}
                    <form onSubmit={handleScanSubmit} className="space-y-1.5 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-200/60 dark:border-blue-800/40">
                        <label className="block text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                            <Barcode className="w-4 h-4 text-blue-600" /> Bắn máy quét trực tiếp vào thiết bị cầm trên tay:
                        </label>
                        <div className="flex gap-2">
                            <input
                                ref={scanInputRef}
                                type="text"
                                value={scanInput}
                                onChange={(e) => setScanInput(e.target.value)}
                                placeholder="Quét mã vạch Serial / IMEI thiết bị..."
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                            >
                                Kiểm tra & Chọn
                            </button>
                        </div>
                    </form>

                    {/* Filter & Auto Pick Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="relative flex-1 w-full sm:w-auto">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                placeholder="Tìm nhanh trong kho..."
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={handleAutoPickFirst}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Tự động chọn nhanh theo số lượng bán"
                            >
                                <Layers className="w-3.5 h-3.5 text-blue-600" /> Chọn nhanh {requiredQuantity} mã đầu
                            </button>
                            <button
                                type="button"
                                onClick={loadAvailable}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                                title="Làm mới tồn kho"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Available Serials List */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs text-slate-500 font-semibold px-1">
                            <span>Mã Serial có sẵn trong kho ({availableSerials.length}):</span>
                            <span>Đã chọn: {count}/{requiredQuantity}</span>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                                Đang kiểm tra tồn kho Serial...
                            </div>
                        ) : availableSerials.length === 0 ? (
                            <div className="p-8 text-center text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50">
                                <strong>Không có số Serial nào đang tồn kho cho sản phẩm này!</strong>
                                <p className="text-slate-500 mt-1">
                                    Vui lòng nhập kho sản phẩm và số serial trước khi xuất bán.
                                </p>
                            </div>
                        ) : filteredSerials.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                Không tìm thấy số Serial nào khớp với từ khóa tìm kiếm.
                            </div>
                        ) : (
                            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                {filteredSerials.map((s) => {
                                    const isChecked = selectedSerials.includes(s.serialNumber);
                                    const isUsedOther = alreadySelectedSerials.includes(s.serialNumber);

                                    return (
                                        <div
                                            key={s.id}
                                            onClick={() => !isUsedOther && handleToggleSerial(s.serialNumber)}
                                            className={`p-2.5 flex items-center justify-between transition-colors text-xs ${
                                                isUsedOther
                                                    ? 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 cursor-not-allowed opacity-60'
                                                    : isChecked
                                                        ? 'bg-blue-50/70 dark:bg-blue-900/20 font-semibold cursor-pointer'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {isChecked ? (
                                                    <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                                                ) : isUsedOther ? (
                                                    <Square className="w-4 h-4 text-slate-300 dark:text-slate-700 shrink-0" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                                                )}
                                                <div>
                                                    <span className={`font-mono font-bold ${isUsedOther ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                                                        {s.serialNumber}
                                                    </span>
                                                    {s.warehouse?.name && (
                                                        <span className="ml-2 text-[11px] text-slate-400">
                                                            ({s.warehouse.name})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {isUsedOther ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                                    Đã gán ở dòng khác
                                                </span>
                                            ) : isChecked ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                                    Đã chọn xuất
                                                </span>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2.5">
                    <button
                        type="button"
                        onClick={() => {
                            onSave([]);
                            onClose();
                            toast.info(`Đã gỡ bỏ serial cho "${productName}". Mặt hàng này sẽ xuất bán thông thường không theo dõi serial.`);
                        }}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-600 dark:hover:text-rose-300 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                        title="Không bắt buộc - Cho phép bán sản phẩm mà không gán mã Serial"
                    >
                        <X className="w-3.5 h-3.5" />
                        <span>Không Dùng Serial</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                        >
                            Đóng
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!isExact}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                            <Check className="w-4 h-4" />
                            Xác Nhận & Gán Serial ({count}/{requiredQuantity})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
