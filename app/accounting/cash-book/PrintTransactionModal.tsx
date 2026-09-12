'use client'

import React, { useEffect, useState } from 'react';
import { X, Printer, ArrowLeft, FileText, Copy } from 'lucide-react';
import { numberToVietnameseWords } from '@/lib/vietnameseCurrency';

interface Props {
    transaction: any;
    companyInfo?: {
        name?: string;
        fullName?: string;
        displayName?: string;
        taxCode?: string;
        address?: string;
        phone?: string;
        email?: string;
        website?: string;
        logo?: string;
        city?: string;
    };
    onClose: () => void;
}

export default function PrintTransactionModal({ transaction, companyInfo, onClose }: Props) {
    const [printMode, setPrintMode] = useState<'A4_SINGLE' | 'A4_DOUBLE'>('A4_SINGLE');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!transaction) return null;

    const isReceipt = transaction.type === 'RECEIPT';
    const formCode = isReceipt ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT';
    const titleText = isReceipt ? 'PHIẾU THU' : 'PHIẾU CHI';

    const date = new Date(transaction.transactionDate);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const cityName = companyInfo?.city || 'Hà Nội';

    // Account debit / credit suggestions based on standard Vietnamese Chart of Accounts
    const debitAccount = isReceipt 
        ? (transaction.paymentMethod === 'BANK_TRANSFER' ? '1121' : '1111') 
        : (transaction.supplierId ? '331' : transaction.customerId ? '131' : '642');
    
    const creditAccount = isReceipt 
        ? (transaction.customerId ? '131' : '511') 
        : (transaction.paymentMethod === 'BANK_TRANSFER' ? '1121' : '1111');

    const formatVND = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };

    const handlePrint = () => {
        window.print();
    };

    // Sub-component: Single Voucher Body
    const renderVoucherContent = (copyLabel?: string) => (
        <div className="voucher-paper bg-white text-slate-900 p-8 sm:p-10 font-sans border border-slate-200 rounded-xl shadow-lg relative print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
            {/* Header: Company Info + Form Code */}
            <div className="grid grid-cols-12 gap-4 items-start pb-4 border-b border-slate-300">
                <div className="col-span-8 space-y-1">
                    <div className="font-extrabold text-sm sm:text-base tracking-tight text-slate-950 uppercase leading-snug">
                        {companyInfo?.fullName || companyInfo?.displayName || companyInfo?.name || 'CÔNG TY TNHH GIẢI PHÁP ĐÀO TẠO TRỊNH GIA'}
                    </div>
                    {companyInfo?.address && (
                        <div className="text-xs text-slate-700">
                            <span className="font-semibold text-slate-800">Địa chỉ:</span> {companyInfo.address}
                        </div>
                    )}
                    <div className="text-xs text-slate-700 flex flex-wrap gap-x-3 gap-y-0.5">
                        {companyInfo?.taxCode && (
                            <span><span className="font-semibold text-slate-800">MST:</span> {companyInfo.taxCode}</span>
                        )}
                        {companyInfo?.phone && (
                            <span>• <span className="font-semibold text-slate-800">Hotline:</span> {companyInfo.phone}</span>
                        )}
                        {companyInfo?.email && (
                            <span>• <span className="font-semibold text-slate-800">Email:</span> {companyInfo.email}</span>
                        )}
                    </div>
                </div>

                <div className="col-span-4 text-right space-y-0.5">
                    <div className="font-bold text-xs text-slate-900 uppercase">{formCode}</div>
                    <div className="text-[10px] text-slate-600 italic leading-tight">
                        (Ban hành theo TT số 200/2014/TT-BTC)
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900 pt-1">
                        Số: <span className="text-slate-950 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs">{transaction.code}</span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-700 pt-0.5 flex justify-end gap-3 font-mono">
                        <span>Nợ: <strong>{debitAccount}</strong></span>
                        <span>Có: <strong>{creditAccount}</strong></span>
                    </div>
                </div>
            </div>

            {/* Voucher Title */}
            <div className="text-center my-6">
                <h1 className={`text-2xl sm:text-3xl font-black tracking-wider uppercase ${isReceipt ? 'text-emerald-800' : 'text-rose-900'} print:text-black`}>
                    {titleText}
                </h1>
                <div className="text-xs font-medium text-slate-700 italic mt-1.5">
                    Ngày {day < 10 ? `0${day}` : day} tháng {month < 10 ? `0${month}` : month} năm {year}
                </div>
                <div className="text-[11px] text-slate-500 italic mt-0.5 font-medium">
                    {copyLabel || (isReceipt ? '(Liên 1: Lưu tại quỹ - Liên 2: Giao người nộp)' : '(Liên 1: Lưu tại quỹ - Liên 2: Giao người nhận)')}
                </div>
            </div>

            {/* Content Lines */}
            <div className="space-y-3.5 text-sm text-slate-900 my-6 leading-relaxed">
                {/* Line 1: Payer / Receiver */}
                <div className="flex items-end">
                    <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">
                        {isReceipt ? 'Họ và tên người nộp tiền:' : 'Họ và tên người nhận tiền:'}
                    </span>
                    <span className="flex-1 font-bold text-slate-950 text-base pb-0.5" style={{ borderBottom: '1px dotted #94a3b8' }}>
                        {transaction.payerReceiver || '—'}
                    </span>
                </div>

                {/* Line 2: Address */}
                <div className="flex items-end">
                    <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">Địa chỉ / Đơn vị:</span>
                    <span className="flex-1 text-slate-900 pb-0.5 font-medium" style={{ borderBottom: '1px dotted #94a3b8' }}>
                        {transaction.address || transaction.customer?.address || transaction.supplier?.address || '—'}
                    </span>
                </div>

                {/* Line 3: Phone */}
                <div className="flex items-end">
                    <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">Số điện thoại liên hệ:</span>
                    <span className="flex-1 text-slate-900 pb-0.5 font-mono font-medium" style={{ borderBottom: '1px dotted #94a3b8' }}>
                        {transaction.phone || transaction.customer?.phone || transaction.supplier?.phone || '—'}
                    </span>
                </div>

                {/* Line 4: Reason */}
                <div className="flex items-end">
                    <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">
                        {isReceipt ? 'Lý do thu tiền:' : 'Lý do chi tiền:'}
                    </span>
                    <span className="flex-1 font-medium text-slate-950 pb-0.5" style={{ borderBottom: '1px dotted #94a3b8' }}>
                        {transaction.reason || (isReceipt ? 'Thu tiền theo chứng từ' : 'Chi tiền theo chứng từ')}
                    </span>
                </div>

                {/* Line 5: Amount */}
                <div className="flex items-end">
                    <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">Số tiền:</span>
                    <span className="flex-1 font-black text-lg text-slate-950 pb-0.5" style={{ borderBottom: '1px dotted #94a3b8' }}>
                        {formatVND(transaction.amount)}
                    </span>
                </div>

                {/* Line 6: In words */}
                <div className="flex items-end">
                    <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">Viết bằng chữ:</span>
                    <span className="flex-1 font-bold italic text-slate-900 pb-0.5" style={{ borderBottom: '1px dotted #94a3b8' }}>
                        {numberToVietnameseWords(transaction.amount)}
                    </span>
                </div>

                {/* Line 7: Attached documents & Payment method */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-end">
                        <span className="w-28 font-semibold text-slate-800 shrink-0">Kèm theo:</span>
                        <span className="flex-1 text-slate-900 pb-0.5 italic" style={{ borderBottom: '1px dotted #94a3b8' }}>
                            01 chứng từ gốc
                        </span>
                    </div>
                    <div className="flex items-end">
                        <span className="w-36 font-semibold text-slate-800 shrink-0">Hình thức / Quỹ:</span>
                        <span className="flex-1 text-slate-950 font-semibold pb-0.5" style={{ borderBottom: '1px dotted #94a3b8' }}>
                            {transaction.paymentMethod === 'CASH' ? 'Tiền mặt' : transaction.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : transaction.paymentMethod}
                            {transaction.financeAccount ? ` (${transaction.financeAccount.name})` : ''}
                        </span>
                    </div>
                </div>
            </div>

            {/* Signatures Section (5 Standard Columns) */}
            <div className="mt-8 pt-2">
                <div className="text-right text-xs italic text-slate-700 mb-3 font-medium">
                    {cityName}, ngày {day < 10 ? `0${day}` : day} tháng {month < 10 ? `0${month}` : month} năm {year}
                </div>

                <div className="grid grid-cols-5 gap-1 text-center text-xs">
                    <div>
                        <div className="font-bold uppercase text-slate-950 tracking-tight">Giám Đốc</div>
                        <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, đóng dấu)</div>
                        <div className="h-20 sm:h-24"></div>
                    </div>

                    <div>
                        <div className="font-bold uppercase text-slate-950 tracking-tight">Kế Toán Trưởng</div>
                        <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, họ tên)</div>
                        <div className="h-20 sm:h-24"></div>
                    </div>

                    <div>
                        <div className="font-bold uppercase text-slate-950 tracking-tight">Thủ Quỹ</div>
                        <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, họ tên)</div>
                        <div className="h-20 sm:h-24"></div>
                    </div>

                    <div>
                        <div className="font-bold uppercase text-slate-950 tracking-tight">Người Lập Phiếu</div>
                        <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, họ tên)</div>
                        <div className="h-20 sm:h-24 flex items-end justify-center">
                            <span className="font-bold text-slate-950 text-[11px] sm:text-xs">{transaction.createdBy?.name || 'Sys Admin'}</span>
                        </div>
                    </div>

                    <div>
                        <div className="font-bold uppercase text-slate-950 tracking-tight">
                            {isReceipt ? 'Người Nộp Tiền' : 'Người Nhận Tiền'}
                        </div>
                        <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, họ tên)</div>
                        <div className="h-20 sm:h-24 flex items-end justify-center">
                            <span className="font-bold text-slate-950 text-[11px] sm:text-xs">{transaction.payerReceiver}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipt Acknowledgement Bottom Section (Circular 200 Requirement) */}
            <div className="mt-6 pt-3 border-t border-slate-200 text-xs text-slate-700 italic space-y-1">
                <div>
                    Đã nhận đủ số tiền (viết bằng chữ): <span className="font-semibold not-italic text-slate-900">{numberToVietnameseWords(transaction.amount)}</span>
                </div>
                <div className="flex flex-wrap gap-x-8 text-[11px] text-slate-500">
                    <span>+ Tỷ giá ngoại tệ (vàng bạc, đá quý): ............................................</span>
                    <span>+ Số tiền quy đổi: ................................................................</span>
                </div>
            </div>
        </div>
    );

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto print-voucher-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm 12mm;
                    }
                    html, body {
                        background: #fff !important;
                        color: #000 !important;
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                    }
                    /* Ẩn toàn bộ thành phần nền của web */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Chỉ hiển thị khu vực in */
                    .print-voucher-overlay,
                    .print-voucher-overlay * {
                        visibility: visible !important;
                    }
                    .print-voucher-overlay {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: transparent !important;
                        backdrop-filter: none !important;
                        display: block !important;
                        overflow: visible !important;
                        z-index: 999999 !important;
                    }
                    .print-container {
                        position: static !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: transparent !important;
                    }
                    .voucher-paper {
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .double-separator {
                        border-bottom: 2px dashed #94a3b8 !important;
                        margin: 20px 0 !important;
                        padding: 0 !important;
                    }
                    .no-print,
                    .print\\:hidden {
                        display: none !important;
                        visibility: hidden !important;
                    }
                }
            `}</style>

            {/* Top Action Control Bar */}
            <div className="fixed top-4 right-4 sm:right-8 z-50 flex items-center gap-2 print:hidden bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md">
                {/* Print Layout Switcher */}
                <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300">
                    <button
                        type="button"
                        onClick={() => setPrintMode('A4_SINGLE')}
                        className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                            printMode === 'A4_SINGLE' ? 'bg-emerald-600 text-white font-bold shadow' : 'hover:text-white'
                        }`}
                        title="In 1 liên trên trang A4 chuẩn"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Khổ A4 Chuẩn</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPrintMode('A4_DOUBLE')}
                        className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                            printMode === 'A4_DOUBLE' ? 'bg-emerald-600 text-white font-bold shadow' : 'hover:text-white'
                        }`}
                        title="In 2 liên (Liên 1 + Liên 2) trên cùng 1 trang A4 tiết kiệm giấy"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        <span>In 2 Liên / Trang</span>
                    </button>
                </div>

                {/* Print Action Button */}
                <button
                    onClick={handlePrint}
                    style={{ backgroundColor: '#059669', color: '#ffffff' }}
                    className="inline-flex items-center gap-2 px-5 py-2 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/40 transition transform hover:-translate-y-0.5 active:translate-y-0 hover:brightness-110 cursor-pointer"
                >
                    <Printer className="w-4 h-4 text-white" />
                    <span>In Phiếu Ngay</span>
                </button>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold shadow border border-slate-700 transition"
                    title="Đóng (ESC)"
                >
                    <X className="w-4 h-4 text-slate-300" />
                    <span>Đóng</span>
                </button>
            </div>

            {/* Document Printable Container */}
            <div className="w-full max-w-3xl my-12 print-container space-y-8">
                {printMode === 'A4_SINGLE' ? (
                    renderVoucherContent()
                ) : (
                    <>
                        {/* Copy 1 */}
                        {renderVoucherContent('(Liên 1: Lưu tại quỹ / kế toán)')}
                        
                        {/* Perforation Cut Line */}
                        <div className="double-separator text-center py-2 relative flex items-center justify-center">
                            <span className="px-3 py-0.5 bg-slate-800 text-slate-300 print:bg-white print:text-slate-500 text-[10px] font-mono uppercase tracking-widest border border-slate-700 print:border-slate-300 rounded-full">
                                ✂ Cắt theo đường này (Liên 1 / Liên 2)
                            </span>
                        </div>

                        {/* Copy 2 */}
                        {renderVoucherContent(isReceipt ? '(Liên 2: Giao cho người nộp tiền)' : '(Liên 2: Giao cho người nhận tiền)')}
                    </>
                )}

                {/* Bottom Bar for convenience */}
                <div className="mt-8 pt-4 flex items-center justify-between print:hidden">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition border border-slate-700"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Đóng Xem Lại</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        style={{ backgroundColor: '#059669', color: '#ffffff' }}
                        className="inline-flex items-center gap-1.5 px-6 py-2 text-white font-bold rounded-xl text-xs shadow-lg hover:brightness-110 transition"
                    >
                        <Printer className="w-4 h-4 text-white" />
                        <span>In Phiếu Ngay</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
