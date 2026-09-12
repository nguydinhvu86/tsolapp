'use client'

import React, { useEffect } from 'react';
import { X, Printer, ArrowLeft } from 'lucide-react';
import { numberToVietnameseWords } from '@/lib/vietnameseCurrency';

interface Props {
    partner: any;
    type: 'CUSTOMER' | 'SUPPLIER';
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

export default function PrintDebtStatementModal({ partner, type, companyInfo, onClose }: Props) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!partner) return null;

    const isCustomer = type === 'CUSTOMER';
    const title = isCustomer 
        ? 'BIÊN BẢN ĐỐI CHIẾU CÔNG NỢ KHÁCH HÀNG' 
        : 'BIÊN BẢN ĐỐI CHIẾU CÔNG NỢ NHÀ CUNG CẤP';

    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const formatVND = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    const handlePrint = () => {
        window.print();
    };

    const records = isCustomer ? (partner.invoices || []) : (partner.bills || []);

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
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Printer className="w-4 h-4" />
                    <span>In Biên Bản Đối Chiếu (A4)</span>
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

            {/* Printable Paper A4 */}
            <div className="bg-white text-slate-900 w-full max-w-4xl p-8 sm:p-12 rounded-2xl shadow-2xl my-8 font-sans border border-slate-200 print:p-0 print:m-0 print:shadow-none print:max-w-none print:w-full print:rounded-none print:border-none">
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
                                <span>• Hotline/SĐT: <strong className="font-bold">{companyInfo.phone}</strong></span>
                            )}
                            {companyInfo?.email && (
                                <span>• Email: {companyInfo.email}</span>
                            )}
                        </div>
                    </div>

                    <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-slate-700">
                            Mã đối tác: <span className="font-bold text-slate-950 font-mono px-1 py-0.5 bg-slate-100 rounded">{partner.code}</span>
                        </div>
                        <div className="text-xs text-slate-500 italic mt-1">
                            Thời điểm lập: {day < 10 ? `0${day}` : day}/{month < 10 ? `0${month}` : month}/{year}
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center my-6">
                    <h1 className="text-xl sm:text-2xl font-black tracking-wide uppercase text-slate-950">
                        {title}
                    </h1>
                    <div className="text-xs font-medium text-slate-700 italic mt-1">
                        (Tính đến ngày {day < 10 ? `0${day}` : day} tháng {month < 10 ? `0${month}` : month} năm {year})
                    </div>
                </div>

                {/* Parties Info */}
                <div className="grid grid-cols-2 gap-6 my-6 text-xs text-slate-900 bg-slate-50 p-4 rounded-xl border border-slate-300 print:bg-transparent print:border-slate-400">
                    <div className="space-y-1.5">
                        <div className="font-black text-slate-950 uppercase border-b border-slate-300 pb-1">
                            BÊN A: {companyInfo?.fullName || companyInfo?.name || 'CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ TSOL'}
                        </div>
                        <div><span className="font-semibold text-slate-700">Địa chỉ:</span> {companyInfo?.address || '—'}</div>
                        <div><span className="font-semibold text-slate-700">Mã số thuế:</span> {companyInfo?.taxCode || '—'}</div>
                        <div><span className="font-semibold text-slate-700">Điện thoại:</span> {companyInfo?.phone || '—'}</div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="font-black text-slate-950 uppercase border-b border-slate-300 pb-1">
                            BÊN B: {partner.name}
                        </div>
                        <div><span className="font-semibold text-slate-700">Địa chỉ:</span> {partner.address || '—'}</div>
                        <div><span className="font-semibold text-slate-700">Mã số thuế:</span> {partner.taxCode || '—'}</div>
                        <div><span className="font-semibold text-slate-700">Điện thoại:</span> {partner.phone || '—'}</div>
                    </div>
                </div>

                {/* Statement Content */}
                <div className="text-xs text-slate-800 my-4 leading-relaxed font-medium">
                    Hôm nay, ngày {day} tháng {month} năm {year}, hai bên cùng nhau tiến hành đối chiếu tình hình công nợ {isCustomer ? 'mua bán hàng hóa / dịch vụ' : 'cung cấp hàng hóa / dịch vụ'} với các số liệu chi tiết như sau:
                </div>

                {/* Transactions Detail Table */}
                <div className="my-6">
                    <table className="w-full text-left text-xs border border-slate-400">
                        <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
                            <tr>
                                <th className="py-2.5 px-3 border-r border-slate-300 w-10 text-center">STT</th>
                                <th className="py-2.5 px-3 border-r border-slate-300">Mã Chứng Từ / HĐ</th>
                                <th className="py-2.5 px-3 border-r border-slate-300">Ngày Hóa Đơn</th>
                                <th className="py-2.5 px-3 border-r border-slate-300">Hạn Thanh Toán</th>
                                <th className="py-2.5 px-3 border-r border-slate-300 text-right">Tổng Tiền HĐ</th>
                                <th className="py-2.5 px-3 border-r border-slate-300 text-right">Đã Thanh Toán</th>
                                <th className="py-2.5 px-3 text-right">Còn Phải Thu / Trả</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                            {records.map((rec: any, idx: number) => (
                                <tr key={rec.id}>
                                    <td className="py-2 px-3 border-r border-slate-300 text-center font-medium">{idx + 1}</td>
                                    <td className="py-2 px-3 border-r border-slate-300 font-mono font-bold text-slate-950">
                                        {rec.code}
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-300 text-slate-800">
                                        {new Date(rec.issueDate || rec.billDate).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-300 text-slate-800">
                                        {rec.dueDate ? new Date(rec.dueDate).toLocaleDateString('vi-VN') : '—'}
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-300 text-right font-semibold text-slate-900">
                                        {formatVND(rec.totalAmount)}
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-300 text-right text-emerald-700 font-semibold">
                                        {formatVND(rec.paidAmount)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-black text-slate-950">
                                        {formatVND(rec.remainingAmount)}
                                    </td>
                                </tr>
                            ))}

                            {/* Totals Row */}
                            <tr className="bg-slate-100 font-black border-t-2 border-slate-800 text-slate-950">
                                <td colSpan={4} className="py-3 px-3 border-r border-slate-400 text-right uppercase">
                                    Tổng Cộng:
                                </td>
                                <td className="py-3 px-3 border-r border-slate-400 text-right text-sm">
                                    {formatVND(isCustomer ? partner.totalInvoiced : partner.totalBilled)}
                                </td>
                                <td className="py-3 px-3 border-r border-slate-400 text-right text-emerald-700 text-sm">
                                    {formatVND(partner.totalPaid)}
                                </td>
                                <td className="py-3 px-3 text-right text-rose-700 text-base font-black">
                                    {formatVND(partner.currentDebt)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Conclusion in Words */}
                <div className="space-y-2 text-xs text-slate-900 my-6 bg-slate-50 p-4 rounded-xl border border-slate-300 print:bg-transparent print:border-slate-400">
                    <div>
                        <span className="font-bold">Kết luận: </span>
                        Tính đến ngày {day}/{month}/{year}, {isCustomer ? 'Bên B còn phải thanh toán cho Bên A' : 'Bên A còn phải thanh toán cho Bên B'} số tiền là: <span className="font-black text-sm text-slate-950">{formatVND(partner.currentDebt)}</span>
                    </div>
                    <div>
                        <span className="font-bold">Bằng chữ: </span>
                        <span className="font-bold italic text-slate-900">{numberToVietnameseWords(partner.currentDebt)}</span>
                    </div>
                </div>

                {/* Signatures */}
                <div className="mt-12 pt-4">
                    <div className="grid grid-cols-2 gap-8 text-center text-xs">
                        <div>
                            <div className="font-bold uppercase text-slate-950">ĐẠI DIỆN BÊN A</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, ghi rõ họ tên và đóng dấu)</div>
                            <div className="h-28"></div>
                        </div>

                        <div>
                            <div className="font-bold uppercase text-slate-950">ĐẠI DIỆN BÊN B</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, ghi rõ họ tên và đóng dấu)</div>
                            <div className="h-28"></div>
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
                        className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                    >
                        <Printer className="w-4 h-4" />
                        <span>In Biên Bản</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
