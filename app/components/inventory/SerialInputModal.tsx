'use client'

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    QrCode, 
    Check, 
    AlertCircle, 
    AlertTriangle, 
    CheckCircle2, 
    Upload, 
    Trash2, 
    Barcode, 
    FileSpreadsheet,
    ClipboardCopy
} from 'lucide-react';
import { toast } from '@/app/components/providers/ToastProvider';

interface SerialInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    requiredQuantity: number;
    initialSerials?: string[];
    onSave: (serials: string[]) => void;
}

export default function SerialInputModal({
    isOpen,
    onClose,
    productName,
    requiredQuantity,
    initialSerials = [],
    onSave
}: SerialInputModalProps) {
    const [mounted, setMounted] = useState(false);
    const [serials, setSerials] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'scan' | 'paste' | 'file'>('scan');
    
    // Scan input
    const [scanInput, setScanInput] = useState('');
    const scanInputRef = useRef<HTMLInputElement>(null);

    // Paste input
    const [pasteText, setPasteText] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSerials(initialSerials || []);
            setScanInput('');
            setPasteText('');
            // Focus scanner input on open
            setTimeout(() => {
                scanInputRef.current?.focus();
            }, 150);
        }
    }, [isOpen, initialSerials]);

    if (!isOpen || !mounted) return null;

    const count = serials.length;
    const isExact = count === requiredQuantity;
    const isLess = count < requiredQuantity;
    const isMore = count > requiredQuantity;

    // Handle single barcode scan
    const handleScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = scanInput.trim();
        if (!trimmed) return;

        if (serials.includes(trimmed)) {
            toast.warning(`Mã serial "${trimmed}" đã có trong danh sách!`);
            setScanInput('');
            return;
        }

        if (count >= requiredQuantity) {
            toast.warning(`Đã đủ số lượng ${requiredQuantity} serial. Không thể thêm tiếp!`);
            setScanInput('');
            return;
        }

        setSerials(prev => [...prev, trimmed]);
        setScanInput('');
        scanInputRef.current?.focus();
    };

    // Handle paste batch
    const handleParsePaste = () => {
        if (!pasteText.trim()) {
            toast.info('Vui lòng dán danh sách số serial vào ô văn bản.');
            return;
        }

        const tokens = pasteText
            .split(/[\r\n,;\t]+/)
            .map(s => s.trim())
            .filter(Boolean);

        if (tokens.length === 0) {
            toast.warning('Không tìm thấy số serial hợp lệ nào.');
            return;
        }

        const uniqueTokens = Array.from(new Set(tokens));
        const combined = Array.from(new Set([...serials, ...uniqueTokens]));

        setSerials(combined);
        setPasteText('');
        toast.success(`Đã thêm ${combined.length - serials.length} mã serial mới.`);
    };

    // Handle file upload (txt, csv)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (!content) return;

            const tokens = content
                .split(/[\r\n,;\t]+/)
                .map(s => s.trim())
                .filter(Boolean);

            const uniqueTokens = Array.from(new Set(tokens));
            const combined = Array.from(new Set([...serials, ...uniqueTokens]));
            setSerials(combined);
            toast.success(`Đã trích xuất ${combined.length - serials.length} mã serial từ tệp!`);
        };
        reader.readAsText(file);
    };

    const handleRemoveSerial = (indexToRemove: number) => {
        setSerials(prev => prev.filter((_, i) => i !== indexToRemove));
    };

    const handleClearAll = () => {
        if (confirm('Bạn có chắc muốn xóa toàn bộ danh sách mã serial đã nhập?')) {
            setSerials([]);
        }
    };

    const handleConfirm = () => {
        if (!isExact) {
            toast.error(`Số lượng serial (${count}) không bằng số lượng mua (${requiredQuantity}). Vui lòng nhập đúng ${requiredQuantity} mã!`);
            return;
        }

        onSave(serials);
        onClose();
    };

    const modalContent = (
        <div 
            className="fixed inset-0 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
            style={{ zIndex: 999999 }}
        >
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                            <Barcode className="w-4 h-4" /> Nhập Số Serial / IMEI Nhà Cung Cấp
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
                        <span className="text-xs font-semibold text-slate-500">Tiến độ nhập số Serial:</span>
                        <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                            {count} / {requiredQuantity} chiếc
                        </span>
                    </div>

                    {isExact ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Đã khớp đủ chính xác {requiredQuantity}/{requiredQuantity} số Serial! Đạt yêu cầu lưu kho.</span>
                        </div>
                    ) : isLess ? (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-medium">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                                Còn thiếu <strong>{requiredQuantity - count}</strong> mã Serial nữa. (Yêu cầu phải đủ {requiredQuantity} mã).
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs font-medium">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                                Đang dư <strong>{count - requiredQuantity}</strong> mã Serial so với số lượng mua ({requiredQuantity}). Vui lòng xóa bớt!
                            </span>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 pt-2 gap-2 text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('scan');
                            setTimeout(() => scanInputRef.current?.focus(), 50);
                        }}
                        className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                            activeTab === 'scan'
                                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                    >
                        <Barcode className="w-4 h-4" /> Bắn Máy Quét (Scanner)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('paste')}
                        className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                            activeTab === 'paste'
                                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                    >
                        <ClipboardCopy className="w-4 h-4" /> Dán từ Excel / NCC
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('file')}
                        className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                            activeTab === 'file'
                                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Tải Tệp (CSV / TXT)
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-4 space-y-4 overflow-y-auto flex-1 text-sm">
                    {/* Tab 1: Scanner */}
                    {activeTab === 'scan' && (
                        <form onSubmit={handleScanSubmit} className="space-y-2">
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                Quét mã vạch trên vỏ hộp / thân máy (Bấm Enter hoặc máy quét tự gửi):
                            </label>
                            <div className="flex gap-2">
                                <input
                                    ref={scanInputRef}
                                    type="text"
                                    value={scanInput}
                                    onChange={(e) => setScanInput(e.target.value)}
                                    placeholder="Cầm máy quét bắn mã vạch vào đây..."
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                                >
                                    Thêm mã
                                </button>
                            </div>
                            <span className="text-[11px] text-slate-400 block">
                                💡 Chế độ quét liên tục: Bạn có thể quét liên tiếp từng sản phẩm, hệ thống tự động nhảy mã tiếp theo.
                            </span>
                        </form>
                    )}

                    {/* Tab 2: Paste from Excel */}
                    {activeTab === 'paste' && (
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                Dán danh sách số Serial (Mỗi số 1 dòng hoặc cách nhau bằng dấu phẩy):
                            </label>
                            <textarea
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                rows={4}
                                placeholder="Dán danh sách từ cột Excel hoặc email NCC vào đây...&#10;SN001&#10;SN002&#10;SN003"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                            />
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleParsePaste}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                                >
                                    Trích xuất danh sách Serial
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Upload file */}
                    {activeTab === 'file' && (
                        <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-2">
                            <Upload className="w-8 h-8 mx-auto text-slate-400" />
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                Chọn tệp .csv hoặc .txt chứa danh sách số serial
                            </p>
                            <input
                                type="file"
                                accept=".csv,.txt"
                                onChange={handleFileUpload}
                                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                            />
                        </div>
                    )}

                    {/* Preview of entered serials */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Danh sách {count} mã Serial đã nhận diện:
                            </span>
                            {count > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClearAll}
                                    className="text-[11px] text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Trash2 className="w-3 h-3" /> Xóa tất cả
                                </button>
                            )}
                        </div>

                        {count === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                Chưa có mã serial nào. Hãy quét bằng máy quét hoặc dán từ Excel.
                            </div>
                        ) : (
                            <div className="max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-wrap gap-1.5">
                                {serials.map((s, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 shadow-2xs"
                                    >
                                        <span className="text-[10px] text-slate-400 font-sans">#{idx + 1}</span>
                                        <span>{s}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSerial(idx)}
                                            className="text-slate-400 hover:text-rose-500 transition-colors ml-0.5 cursor-pointer"
                                            title="Xóa mã này"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
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
                            toast.info(`Đã gỡ bỏ serial cho "${productName}". Mặt hàng này sẽ nhập kho bình thường không theo dõi serial.`);
                        }}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-600 dark:hover:text-rose-300 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                        title="Không bắt buộc - Cho phép nhập kho sản phẩm mà không gán mã Serial"
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
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
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
