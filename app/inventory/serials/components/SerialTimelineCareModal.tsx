'use client'

import React, { useState } from 'react';
import { toast } from '@/app/components/providers/ToastProvider';
import { 
    X, 
    History, 
    Calendar, 
    Clock, 
    User, 
    Package, 
    Phone, 
    Mail, 
    Warehouse as WarehouseIcon, 
    FileText, 
    ShieldCheck, 
    MessageSquare, 
    Send,
    Tag,
    AlertTriangle,
    RotateCcw,
    Wrench,
    CheckCircle2,
    ArrowRightLeft,
    Check,
    FileSpreadsheet
} from 'lucide-react';
import { addCustomerCareNoteAction } from '../actions';
import { calculateWarrantyRemaining } from '@/lib/warranty';
import { parseFullSerialHistory } from '@/lib/inventory-serial';

interface SerialTimelineCareModalProps {
    isOpen: boolean;
    onClose: () => void;
    serial: any | null;
    onSuccess: () => void;
    onOpenSlip?: (serial: any) => void;
    canManageWarranty?: boolean;
}

export default function SerialTimelineCareModal({
    isOpen,
    onClose,
    serial,
    onSuccess,
    onOpenSlip,
    canManageWarranty = true
}: SerialTimelineCareModalProps) {
    const [noteContent, setNoteContent] = useState('');
    const [careType, setCareType] = useState('SUPPORT');
    const [submittingNote, setSubmittingNote] = useState(false);

    if (!isOpen || !serial) return null;

    const wStat = calculateWarrantyRemaining(serial.warrantyEndDate, serial.product?.warrantyMonths ?? 12);
    const analysis = parseFullSerialHistory(serial);

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim()) {
            toast.warning('Vui lòng nhập nội dung ghi chú / lưu ý kiểm tra');
            return;
        }

        setSubmittingNote(true);
        try {
            const res = await addCustomerCareNoteAction({
                serialId: serial.id,
                noteContent,
                careType
            });

            if (res.success) {
                toast.success('Đã lưu ghi chú / lưu ý nhân viên!');
                setNoteContent('');
                onSuccess();
            } else {
                toast.error(res.error || 'Có lỗi xảy ra');
            }
        } catch (err: any) {
            toast.error(err.message || 'Lỗi hệ thống');
        } finally {
            setSubmittingNote(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full p-6 sm:p-7 space-y-6 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/50">
                            <History className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                    Giám Sát Vòng Đời & Lịch Sử Bảo Hành - Đổi Trả
                                </h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${analysis.serviceBadgeClass}`}>
                                    {analysis.serviceStateLabel}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Serial: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{serial.serialNumber}</span> • {serial.product?.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onOpenSlip && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenSlip(serial);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                title="Xem và in Phiếu trả bảo hành & biên bản bàn giao"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                                <span>Phiếu Trả BH (A4/PDF/Excel)</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Device & Warranty Lifecycle Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                        <span className="text-slate-400 block font-medium">Khách hàng / Đại lý</span>
                        <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                            {serial.customer?.name || 'Chưa xuất bán'}
                        </div>
                        {serial.customer?.phone && (
                            <div className="flex items-center gap-1 text-slate-500">
                                <Phone className="w-3 h-3 text-emerald-500" /> {serial.customer.phone}
                            </div>
                        )}
                        <div className="text-slate-400 text-[11px] truncate">
                            Kho: {serial.warehouse?.name || 'Kho chính'}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                        <span className="text-slate-400 block font-medium">Bảo hành điện tử</span>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {serial.product?.warrantyMonths === 0 ? 'Không bảo hành' : `${serial.product?.warrantyMonths || 12} Tháng`}
                        </div>
                        <div className="text-slate-500">
                            Hạn chót: <strong className="text-slate-800 dark:text-slate-200 font-mono">
                                {serial.warrantyEndDate ? new Date(serial.warrantyEndDate).toLocaleDateString('vi-VN') : 'Chưa kích hoạt'}
                            </strong>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <span className={`w-2 h-2 rounded-full ${wStat.isValid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className={`font-semibold ${wStat.isValid ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {wStat.badgeText}
                            </span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                        <span className="text-slate-400 block font-medium">Tần suất bảo hành</span>
                        <div className="font-black text-slate-900 dark:text-white text-base text-amber-600">
                            {analysis.warrantyCount} lần bảo hành
                        </div>
                        <div className="text-slate-500 text-[11px]">
                            Tiếp nhận gần nhất: <strong className="text-slate-700 dark:text-slate-300">
                                {analysis.lastReceivedDate ? new Date(analysis.lastReceivedDate).toLocaleDateString('vi-VN') : ((analysis.warrantyCount || 0) > 0 ? 'Theo phiếu tiếp nhận' : 'Chưa phát sinh')}
                            </strong>
                        </div>
                        <div className="text-slate-500 text-[11px]">
                            Ngày trả gần nhất: <strong className="text-slate-700 dark:text-slate-300">
                                {analysis.lastReturnDate ? new Date(analysis.lastReturnDate).toLocaleDateString('vi-VN') : (analysis.currentServiceState === 'UNDER_WARRANTY' ? 'Đang xử lý' : (analysis.currentServiceState === 'REPLACED' ? 'Đã đổi mới 1-1' : 'Chưa phát sinh'))}
                            </strong>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                        <span className="text-slate-400 block font-medium">Phụ kiện & Thay thế</span>
                        <div className="text-slate-700 dark:text-slate-300 text-[11px] line-clamp-2">
                            Phụ kiện kèm: <strong className="font-medium text-slate-900 dark:text-white">{analysis.latestAccessories || 'Thân máy'}</strong>
                        </div>
                        {analysis.replacementInfo && (
                            <div className="text-purple-600 dark:text-purple-400 text-[11px] font-semibold pt-1 border-t border-slate-200/60">
                                🔄 Đổi máy: {analysis.replacementInfo.replacementSerialNumber}
                            </div>
                        )}
                        {serial.salesInvoice && (
                            <div className="text-blue-600 font-mono text-[11px]">
                                HĐ: {serial.salesInvoice.code}
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 1: Staff Note & Inspection Input Form (Chỉ nhân viên có quyền bảo hành/kho mới được thêm) */}
                {canManageWarranty && (
                    <form onSubmit={handleAddNote} className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                                <MessageSquare className="w-4 h-4 text-blue-600" />
                                Ghi Nhận Lưu Ý Kiểm Tra / Ghi Chú Nhân Viên (Giám sát vòng đời)
                            </label>
                            <select
                                value={careType}
                                onChange={(e) => setCareType(e.target.value)}
                                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300"
                            >
                                <option value="SUPPORT">🛠️ Kiểm tra kỹ thuật / Test máy</option>
                                <option value="CALL">📞 Liên hệ khách / Hẹn trả máy</option>
                                <option value="FEEDBACK">⭐ Phản hồi sau sửa chữa</option>
                                <option value="OTHER">📝 Ghi chú lưu ý khác</option>
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                placeholder="Nhập lưu ý của nhân viên: kiểm tra linh kiện, hẹn ngày trả máy, tình trạng phụ kiện..."
                                className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                disabled={submittingNote}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                            >
                                <Send className="w-3.5 h-3.5" />
                                {submittingNote ? 'Đang lưu...' : 'Lưu Ghi Chú'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Section 2: Full Lifecycle Timeline */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <History className="w-4 h-4 text-slate-500" />
                            Nhật Ký Chi Tiết Toàn Bộ Vòng Đời, Bảo Hành & Đổi Trả Sản Phẩm ({analysis.historyItems.length})
                        </h4>
                        <span className="text-[11px] text-slate-400 font-medium">Sắp xếp theo thứ tự mới nhất</span>
                    </div>

                    {analysis.historyItems.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                            <History className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                            <p className="font-semibold text-slate-600 dark:text-slate-400">Chưa có lịch sử bảo hành hoặc đổi trả nào.</p>
                            <p className="text-[11px]">Thiết bị đang hoạt động bình thường theo chế độ bảo hành gốc.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                            {analysis.historyItems.map((item, idx) => (
                                <div
                                    key={item.id || idx}
                                    className={`p-4 rounded-2xl border text-xs space-y-2.5 transition-all shadow-2xs ${item.badgeColor || 'bg-white border-slate-200 dark:bg-slate-800/60 dark:border-slate-700'}`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-black/5 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                                                {item.title}
                                            </span>
                                            {item.technicianName && (
                                                <span className="px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 text-[10px] font-semibold border border-black/5">
                                                    Phụ trách: {item.technicianName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{new Date(item.date).toLocaleString('vi-VN')}</span>
                                        </div>
                                    </div>

                                    {/* Detailed Event Fields */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                        {item.receivedDate && (
                                            <div>
                                                <span className="text-slate-500 font-medium">Ngày tiếp nhận: </span>
                                                <strong className="text-slate-800 dark:text-slate-200 font-mono">{new Date(item.receivedDate).toLocaleString('vi-VN')}</strong>
                                            </div>
                                        )}
                                        {item.returnDate && (
                                            <div>
                                                <span className="text-slate-500 font-medium">Ngày trả máy / hoàn tất: </span>
                                                <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{new Date(item.returnDate).toLocaleString('vi-VN')}</strong>
                                            </div>
                                        )}
                                        {item.defectReason && (
                                            <div className="sm:col-span-2">
                                                <span className="text-rose-600 font-semibold">Hiện tượng lỗi / Yêu cầu: </span>
                                                <span className="text-slate-800 dark:text-slate-200">{item.defectReason}</span>
                                            </div>
                                        )}
                                        {item.appearanceCondition && (
                                            <div>
                                                <span className="text-slate-500 font-medium">Ngoại quan: </span>
                                                <span className="text-slate-800 dark:text-slate-200">{item.appearanceCondition}</span>
                                            </div>
                                        )}
                                        {item.accessoriesIncluded && (
                                            <div>
                                                <span className="text-slate-500 font-medium">Phụ kiện kèm theo: </span>
                                                <strong className="text-slate-800 dark:text-slate-200">{item.accessoriesIncluded}</strong>
                                            </div>
                                        )}
                                        {item.repairResult && (
                                            <div className="sm:col-span-2 p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-black/5">
                                                <span className="text-emerald-700 dark:text-emerald-400 font-bold block mb-0.5">Kết quả sửa chữa & thay thế:</span>
                                                <p className="text-slate-800 dark:text-slate-200">{item.repairResult}</p>
                                            </div>
                                        )}
                                        {item.replacementSerialNumber && (
                                            <div className="sm:col-span-2 p-2 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                                                <span className="text-purple-800 dark:text-purple-300 font-bold block">
                                                    {item.swapType === 'SWAP_OUT_OLD' ? 'Thu hồi thiết bị cũ đổi sang Serial mới:' : 'Thiết bị thay thế đổi mới cho Serial cũ:'}
                                                </span>
                                                <span className="font-mono font-black text-sm text-purple-700 dark:text-purple-300">
                                                    {item.replacementSerialNumber}
                                                </span>
                                            </div>
                                        )}
                                        {item.staffNotes && (
                                            <div className="sm:col-span-2 text-slate-600 dark:text-slate-400 italic pt-1 border-t border-black/5 dark:border-white/5">
                                                <span className="not-italic font-semibold text-slate-700 dark:text-slate-300">Lưu ý / Ghi chú nhân viên: </span>
                                                {item.staffNotes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                        Đóng cửa sổ
                    </button>
                </div>
            </div>
        </div>
    );
}
