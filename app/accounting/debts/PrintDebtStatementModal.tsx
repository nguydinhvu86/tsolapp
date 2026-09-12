'use client'

import React from 'react';
import { X, Printer } from 'lucide-react';
import { numberToVietnameseWords } from '@/lib/vietnameseCurrency';

interface Props {
    partner: any;
    type: 'CUSTOMER' | 'SUPPLIER';
    onClose: () => void;
}

export default function PrintDebtStatementModal({ partner, type, onClose }: Props) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
            {/* Modal Controls */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden">
                <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg transition"
                >
                    <Printer className="w-4 h-4" />
                    In Biên Bản Đối Chiếu (A4)
                </button>
                <button
                    onClick={onClose}
                    className="p-2 bg-white dark:bg-slate-800 text-slate-600 hover:text-slate-900 rounded-xl shadow-lg transition"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Printable Paper A4 */}
            <div className="bg-white text-slate-900 w-full max-w-4xl p-8 sm:p-12 rounded-2xl shadow-2xl my-8 font-sans print:p-0 print:m-0 print:shadow-none print:max-w-none print:w-full print:rounded-none">
                {/* Header Unit Info */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-6">
                    <div>
                        <div className="font-bold text-sm tracking-tight text-slate-900 uppercase">
                            CÔNG TY CỔ PHẦN GIẢI PHÁP CÔNG NGHỆ TSOL
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                            Địa chỉ: Số 12, Ngõ 45, Đường Trần Thái Tông, Cầu Giấy, Hà Nội
                        </div>
                        <div className="text-xs text-slate-600">
                            Mã số thuế: 0109876543 • Điện thoại: 024.3999.8888
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-xs font-semibold text-slate-700">
                            Mã đối tác: <span className="font-bold text-slate-950 font-mono">{partner.code}</span>
                        </div>
                        <div className="text-xs text-slate-500 italic mt-0.5">
                            Thời điểm lập: {day < 10 ? `0${day}` : day}/{month < 10 ? `0${month}` : month}/{year}
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center my-6">
                    <h1 className="text-xl font-black tracking-wide uppercase text-slate-950">
                        {title}
                    </h1>
                    <div className="text-xs text-slate-600 italic mt-1">
                        (Tính đến ngày {day < 10 ? `0${day}` : day} tháng {month < 10 ? `0${month}` : month} năm {year})
                    </div>
                </div>

                {/* Parties Info */}
                <div className="grid grid-cols-2 gap-6 my-6 text-xs text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-transparent print:border-slate-300">
                    <div className="space-y-1.5">
                        <div className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">
                            BÊN A: CÔNG TY CP GIẢI PHÁP CÔNG NGHỆ TSOL
                        </div>
                        <div>Đại diện: Ông/Bà Giám Đốc</div>
                        <div>Mã số thuế: 0109876543</div>
                        <div>Điện thoại: 024.3999.8888</div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="font-bold text-slate-900 uppercase border-b border-slate-200 pb-1">
                            BÊN B: {partner.name}
                        </div>
                        <div>Địa chỉ: {partner.address || '—'}</div>
                        <div>Mã số thuế: {partner.taxCode || '—'}</div>
                        <div>Điện thoại: {partner.phone || '—'}</div>
                    </div>
                </div>

                {/* Statement Content */}
                <div className="text-xs text-slate-800 my-4 leading-relaxed">
                    Hôm nay, ngày {day} tháng {month} năm {year}, hai bên cùng nhau tiến hành đối chiếu tình hình công nợ {isCustomer ? 'mua bán hàng hóa / dịch vụ' : 'cung cấp hàng hóa / dịch vụ'} với các số liệu chi tiết như sau:
                </div>

                {/* Transactions Detail Table */}
                <div className="my-6">
                    <table className="w-full text-left text-xs border border-slate-300">
                        <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
                            <tr>
                                <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">STT</th>
                                <th className="py-2 px-3 border-r border-slate-300">Mã Chứng Từ / HĐ</th>
                                <th className="py-2 px-3 border-r border-slate-300">Ngày Hóa Đơn</th>
                                <th className="py-2 px-3 border-r border-slate-300">Hạn Thanh Toán</th>
                                <th className="py-2 px-3 border-r border-slate-300 text-right">Tổng Tiền HĐ</th>
                                <th className="py-2 px-3 border-r border-slate-300 text-right">Đã Thanh Toán</th>
                                <th className="py-2 px-3 text-right">Còn Phải Thu / Trả</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {records.map((rec: any, idx: number) => (
                                <tr key={rec.id}>
                                    <td className="py-2 px-3 border-r border-slate-200 text-center">{idx + 1}</td>
                                    <td className="py-2 px-3 border-r border-slate-200 font-mono font-semibold text-slate-900">
                                        {rec.code}
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-200">
                                        {new Date(rec.issueDate || rec.billDate).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-200">
                                        {rec.dueDate ? new Date(rec.dueDate).toLocaleDateString('vi-VN') : '—'}
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-200 text-right font-medium">
                                        {formatVND(rec.totalAmount)}
                                    </td>
                                    <td className="py-2 px-3 border-r border-slate-200 text-right text-emerald-700">
                                        {formatVND(rec.paidAmount)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-slate-950">
                                        {formatVND(rec.remainingAmount)}
                                    </td>
                                </tr>
                            ))}

                            {/* Totals Row */}
                            <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                                <td colSpan={4} className="py-2.5 px-3 border-r border-slate-300 text-right uppercase">
                                    Tổng Cộng:
                                </td>
                                <td className="py-2.5 px-3 border-r border-slate-300 text-right">
                                    {formatVND(isCustomer ? partner.totalInvoiced : partner.totalBilled)}
                                </td>
                                <td className="py-2.5 px-3 border-r border-slate-300 text-right text-emerald-700">
                                    {formatVND(partner.totalPaid)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-rose-700 text-sm font-black">
                                    {formatVND(partner.currentDebt)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Conclusion in Words */}
                <div className="space-y-2 text-xs text-slate-800 my-6 bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-transparent">
                    <div>
                        <span className="font-semibold">Kết luận: </span>
                        Tính đến ngày {day}/{month}/{year}, {isCustomer ? 'Bên B còn phải thanh toán cho Bên A' : 'Bên A còn phải thanh toán cho Bên B'} số tiền là: <span className="font-black text-sm text-slate-950">{formatVND(partner.currentDebt)}</span>
                    </div>
                    <div>
                        <span className="font-semibold">Bằng chữ: </span>
                        <span className="font-bold italic text-slate-900">{numberToVietnameseWords(partner.currentDebt)}</span>
                    </div>
                </div>

                {/* Signatures */}
                <div className="mt-12 pt-4">
                    <div className="grid grid-cols-2 gap-8 text-center text-xs">
                        <div>
                            <div className="font-bold uppercase text-slate-900">ĐẠI DIỆN BÊN A</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, ghi rõ họ tên và đóng dấu)</div>
                            <div className="h-28"></div>
                        </div>

                        <div>
                            <div className="font-bold uppercase text-slate-900">ĐẠI DIỆN BÊN B</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, ghi rõ họ tên và đóng dấu)</div>
                            <div className="h-28"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
