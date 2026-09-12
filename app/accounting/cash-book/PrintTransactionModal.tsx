'use client'

import React, { useEffect } from 'react';
import { X, Printer, Check, ArrowLeft } from 'lucide-react';
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
    };
    onClose: () => void;
}

export default function PrintTransactionModal({ transaction, companyInfo, onClose }: Props) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!transaction) return null;

    const isReceipt = transaction.type === 'RECEIPT';
    const title = isReceipt ? 'PHIẾU THU' : 'PHIẾU CHI';
    const formCode = isReceipt ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT';
    const subTitle = isReceipt ? '(Liên 1: Lưu - Liên 2: Giao người nộp)' : '(Liên 1: Lưu - Liên 2: Giao người nhận)';

    const date = new Date(transaction.transactionDate);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const formatVND = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Top Action Bar (Fixed on Screen, Hidden during Print) */}
            <div className="fixed top-4 right-4 sm:right-8 z-50 flex items-center gap-2.5 print:hidden">
                <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Printer className="w-4 h-4" />
                    <span>In Phiếu (A4 / A5)</span>
                </button>
                <button
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold shadow-lg border border-slate-700 transition"
                    title="Đóng cửa sổ xem (ESC)"
                >
                    <X className="w-4 h-4 text-slate-300" />
                    <span>Đóng</span>
                </button>
            </div>

            {/* Printable Paper */}
            <div className="bg-white text-slate-900 w-full max-w-3xl p-8 sm:p-12 rounded-2xl shadow-2xl my-8 font-sans border border-slate-200 print:p-0 print:m-0 print:shadow-none print:max-w-none print:w-full print:rounded-none print:border-none">
                {/* Header Unit Info */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
                    <div className="space-y-1 max-w-lg">
                        <div className="font-black text-sm tracking-tight text-slate-950 uppercase">
                            {companyInfo?.fullName || companyInfo?.name || 'CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ TSOL'}
                        </div>
                        {companyInfo?.address && (
                            <div className="text-xs text-slate-700 font-medium">
                                Địa chỉ: {companyInfo.address}
                            </div>
                        )}
                        <div className="text-xs text-slate-700 flex flex-wrap gap-x-2">
                            {companyInfo?.taxCode && (
                                <span>Mã số thuế: <strong className="font-bold">{companyInfo.taxCode}</strong></span>
                            )}
                            {companyInfo?.phone && (
                                <span>• Hotline: <strong className="font-bold">{companyInfo.phone}</strong></span>
                            )}
                            {companyInfo?.email && (
                                <span>• Email: {companyInfo.email}</span>
                            )}
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="font-black text-xs text-slate-900">{formCode}</div>
                        <div className="text-[10px] text-slate-600 italic">
                            (Ban hành theo Thông tư 200/2014/TT-BTC)
                        </div>
                        <div className="text-xs font-mono font-semibold text-slate-800 mt-1">
                            Số: <span className="font-bold text-slate-950 px-1 py-0.5 bg-slate-100 rounded">{transaction.code}</span>
                        </div>
                    </div>
                </div>

                {/* Voucher Title */}
                <div className="text-center my-6">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-wide uppercase text-slate-950">
                        {title}
                    </h1>
                    <div className="text-xs font-medium text-slate-700 italic mt-1">
                        Ngày {day < 10 ? `0${day}` : day} tháng {month < 10 ? `0${month}` : month} năm {year}
                    </div>
                    <div className="text-[11px] text-slate-500 italic mt-0.5">{subTitle}</div>
                </div>

                {/* Details Section */}
                <div className="space-y-4 text-sm text-slate-900 my-8">
                    <div className="flex items-baseline">
                        <span className="w-52 font-semibold text-slate-700">
                            {isReceipt ? 'Họ và tên người nộp tiền:' : 'Họ và tên người nhận tiền:'}
                        </span>
                        <span className="flex-1 font-bold text-base text-slate-950 border-b border-dotted border-slate-400 pb-0.5">
                            {transaction.payerReceiver}
                        </span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="w-52 font-semibold text-slate-700">Địa chỉ / Đơn vị:</span>
                        <span className="flex-1 text-slate-900 border-b border-dotted border-slate-400 pb-0.5 font-medium">
                            {transaction.address || transaction.customer?.address || transaction.supplier?.address || '—'}
                        </span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="w-52 font-semibold text-slate-700">Số điện thoại:</span>
                        <span className="flex-1 text-slate-900 border-b border-dotted border-slate-400 pb-0.5 font-mono">
                            {transaction.phone || transaction.customer?.phone || transaction.supplier?.phone || '—'}
                        </span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="w-52 font-semibold text-slate-700">Lý do {isReceipt ? 'nộp tiền' : 'chi tiền'}:</span>
                        <span className="flex-1 font-medium text-slate-950 border-b border-dotted border-slate-400 pb-0.5">
                            {transaction.reason || (isReceipt ? 'Thu tiền theo chứng từ' : 'Chi tiền theo chứng từ')}
                        </span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="w-52 font-semibold text-slate-700">Số tiền:</span>
                        <span className="flex-1 font-black text-xl text-slate-950 border-b border-dotted border-slate-400 pb-0.5">
                            {formatVND(transaction.amount)}
                        </span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="w-52 font-semibold text-slate-700">Bằng chữ:</span>
                        <span className="flex-1 font-bold italic text-slate-900 border-b border-dotted border-slate-400 pb-0.5">
                            {numberToVietnameseWords(transaction.amount)}
                        </span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="w-52 font-semibold text-slate-700">Hình thức thanh toán:</span>
                        <span className="flex-1 text-slate-950 font-semibold border-b border-dotted border-slate-400 pb-0.5">
                            {transaction.paymentMethod === 'CASH' ? 'Tiền mặt' : transaction.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng' : transaction.paymentMethod}
                            {transaction.financeAccount ? ` (${transaction.financeAccount.name})` : ''}
                        </span>
                    </div>
                </div>

                {/* Signatures Section */}
                <div className="mt-12 pt-4">
                    <div className="text-right text-xs italic text-slate-700 mb-3 font-medium">
                        Hà Nội, ngày {day < 10 ? `0${day}` : day} tháng {month < 10 ? `0${month}` : month} năm {year}
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center text-xs">
                        <div>
                            <div className="font-bold uppercase text-slate-950">Giám Đốc</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, đóng dấu)</div>
                            <div className="h-24"></div>
                        </div>

                        <div>
                            <div className="font-bold uppercase text-slate-950">Kế Toán Trưởng</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, họ tên)</div>
                            <div className="h-24"></div>
                        </div>

                        <div>
                            <div className="font-bold uppercase text-slate-950">Thủ Quỹ</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, họ tên)</div>
                            <div className="h-24"></div>
                        </div>

                        <div>
                            <div className="font-bold uppercase text-slate-950">Người Lập Phiếu</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, họ tên)</div>
                            <div className="h-24 flex items-end justify-center">
                                <span className="font-bold text-slate-950">{transaction.createdBy?.name || ''}</span>
                            </div>
                        </div>

                        <div>
                            <div className="font-bold uppercase text-slate-950">
                                {isReceipt ? 'Người Nộp Tiền' : 'Người Nhận Tiền'}
                            </div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, họ tên)</div>
                            <div className="h-24 flex items-end justify-center">
                                <span className="font-bold text-slate-950">{transaction.payerReceiver}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Modal Close Button (Screen only) */}
                <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between print:hidden">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Đóng Xem Lại</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                    >
                        <Printer className="w-4 h-4" />
                        <span>In Ngay</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
