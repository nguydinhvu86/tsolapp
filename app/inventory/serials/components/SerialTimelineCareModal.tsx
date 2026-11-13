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
    Plus, 
    Send,
    Tag,
    AlertTriangle,
    RotateCcw
} from 'lucide-react';
import { addCustomerCareNoteAction } from '../actions';
import { calculateWarrantyRemaining } from '@/lib/warranty';

interface SerialTimelineCareModalProps {
    isOpen: boolean;
    onClose: () => void;
    serial: any | null;
    onSuccess: () => void;
}

export default function SerialTimelineCareModal({
    isOpen,
    onClose,
    serial,
    onSuccess
}: SerialTimelineCareModalProps) {
    const [noteContent, setNoteContent] = useState('');
    const [careType, setCareType] = useState('CALL');
    const [submittingNote, setSubmittingNote] = useState(false);

    if (!isOpen || !serial) return null;

    const wStat = calculateWarrantyRemaining(serial.warrantyEndDate, serial.product?.warrantyMonths ?? 12);

    // Phân tích lịch sử từ chuỗi notes
    const rawNotes = serial.notes || '';
    const noteLines = rawNotes.split('\n').filter((l: string) => l.trim().length > 0);

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim()) {
            toast.warning('Vui lòng nhập nội dung chăm sóc khách hàng');
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
                toast.success('Đã lưu ghi chú chăm sóc khách hàng!');
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 sm:p-7 space-y-6 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/50">
                            <History className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                                    Vòng Đời Thiết Bị & Chăm Sóc Khách Hàng (CRM)
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Serial: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{serial.serialNumber}</span> • {serial.product?.name}
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

                {/* Device & Customer Quick Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                        <span className="text-slate-400 block font-medium">Khách hàng sở hữu</span>
                        <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                            {serial.customer?.name || 'Chưa xuất bán'}
                        </div>
                        {serial.customer?.phone && (
                            <div className="flex items-center gap-1 text-slate-500">
                                <Phone className="w-3 h-3 text-emerald-500" /> {serial.customer.phone}
                            </div>
                        )}
                        {serial.customer?.email && (
                            <div className="flex items-center gap-1 text-slate-500 truncate">
                                <Mail className="w-3 h-3 text-blue-500" /> {serial.customer.email}
                            </div>
                        )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                        <span className="text-slate-400 block font-medium">Bảo hành điện tử</span>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {serial.product?.warrantyMonths === 0 ? 'Không bảo hành' : `${serial.product?.warrantyMonths || 12} Tháng`}
                        </div>
                        <div className="text-slate-500">
                            Hạn chót: <strong className="text-slate-800 dark:text-slate-200">
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
                        <span className="text-slate-400 block font-medium">Chứng từ liên quan</span>
                        <div>
                            {serial.salesInvoice ? (
                                <div className="text-blue-600 font-mono font-semibold">
                                    HĐ Bán: {serial.salesInvoice.code}
                                </div>
                            ) : (
                                <span className="text-slate-400 italic">Chưa có HĐ bán</span>
                            )}
                        </div>
                        <div>
                            {serial.purchaseBill ? (
                                <div className="text-emerald-600 font-mono font-semibold">
                                    HĐ Nhập: {serial.purchaseBill.code}
                                </div>
                            ) : (
                                <span className="text-slate-400 italic">Nhập thủ công</span>
                            )}
                        </div>
                        <div className="text-slate-500">
                            Kho: <strong>{serial.warehouse?.name || 'Kho chính'}</strong>
                        </div>
                    </div>
                </div>

                {/* Section 1: Customer Care Input Form */}
                <form onSubmit={handleAddNote} className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                            Thêm Ghi Chú Chăm Sóc Khách Hàng (CSKH)
                        </label>
                        <select
                            value={careType}
                            onChange={(e) => setCareType(e.target.value)}
                            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300"
                        >
                            <option value="CALL">📞 Gọi điện chăm sóc</option>
                            <option value="SUPPORT">🛠️ Hỗ trợ kỹ thuật</option>
                            <option value="FEEDBACK">⭐ Phản hồi khách hàng</option>
                            <option value="OTHER">📝 Ghi chú chung</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Nhập nội dung trao đổi, phản hồi của khách, hẹn bảo dưỡng định kỳ..."
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

                {/* Section 2: Full Lifecycle Timeline */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <History className="w-4 h-4 text-slate-500" />
                        Nhật Ký Vòng Đời & Lịch Sử Hoạt Động Của Thiết Bị
                    </h4>

                    {noteLines.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                            Chưa có sự kiện nào được ghi nhận cho mã định danh này.
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                            {noteLines.slice().reverse().map((line: string, idx: number) => {
                                const isAlert = line.includes('ĐÃ GỬI EMAIL CẢNH BÁO');
                                const isRma = line.includes('TIẾP NHẬN BẢO HÀNH') || line.includes('TIẾP NHẬN HÀNG LỖI');
                                const isSwap = line.includes('ĐỔI MỚI 1-1') || line.includes('MÁY ĐỔI MỚI');
                                const isComplete = line.includes('HOÀN TẤT BẢO HÀNH');
                                const isCare = line.includes('CSKH') || line.includes('CHĂM SÓC KHÁCH HÀNG') || line.includes('HỖ TRỢ KỸ THUẬT');

                                let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
                                if (isAlert) badgeColor = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300';
                                if (isRma) badgeColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
                                if (isSwap) badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300';
                                if (isComplete) badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
                                if (isCare) badgeColor = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300';

                                return (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-xl border text-xs leading-relaxed ${badgeColor}`}
                                    >
                                        <div className="font-mono text-[11px] whitespace-pre-wrap">
                                            {line}
                                        </div>
                                    </div>
                                );
                            })}
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
