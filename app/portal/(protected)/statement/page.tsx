import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import PrintButtonClient from "./PrintButtonClient";

export const metadata = {
    title: "Sao kê công nợ - Customer Portal",
};

export default async function PortalStatementPage({ searchParams }: { searchParams: { from?: string, to?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "CUSTOMER") redirect("/portal/login");

    const todayString = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    
    // Default to 'This Month' if no dates provided
    const from = searchParams.from || firstDayOfMonth;
    const to = searchParams.to || lastDayOfMonth;

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Calculate Opening Balance (Số dư đầu kỳ: before `from` date)
    // Debt = Invoices - Payments
    const [openingInvoices, openingPayments] = await Promise.all([
        prisma.salesInvoice.aggregate({
            where: { customerId: session.user.id, date: { lt: fromDate }, status: { notIn: ['DRAFT', 'CANCELLED'] } },
            _sum: { totalAmount: true }
        }),
        prisma.salesPayment.aggregate({
            where: { customerId: session.user.id, date: { lt: fromDate }, status: { notIn: ['CANCELLED', 'FAILED'] } }, // Assuming 'CANCELLED' is the only bad status, standard uses 'COMPLETED'
            _sum: { amount: true }
        })
    ]);

    const openingBalance = (openingInvoices._sum.totalAmount || 0) - (openingPayments._sum.amount || 0);

    // Fetch transactions in period
    const [invoices, payments] = await Promise.all([
        prisma.salesInvoice.findMany({
            where: { customerId: session.user.id, date: { gte: fromDate, lte: toDate }, status: { notIn: ['DRAFT', 'CANCELLED'] } },
            orderBy: { date: 'asc' }
        }),
        prisma.salesPayment.findMany({
            where: { customerId: session.user.id, date: { gte: fromDate, lte: toDate }, status: { notIn: ['CANCELLED', 'FAILED'] } },
            orderBy: { date: 'asc' }
        })
    ]);

    // Format Transactions
    type Transaction = {
        id: string;
        date: Date;
        code: string;
        description: string;
        incurred: number;
        paid: number;
        url?: string;
        badge?: string;
        badgeColor?: string;
    };

    let transactions: Transaction[] = [
        ...invoices.map(i => ({
            id: i.id,
            date: i.date,
            code: i.code,
            description: `Ghi nhận hóa đơn xuất bán ${i.code}`,
            incurred: i.totalAmount,
            paid: 0,
            url: `/public/sales/invoice/${i.id}`,
            badge: 'HĐ',
            badgeColor: 'bg-rose-100 text-rose-700'
        })),
        ...payments.map(p => ({
            id: p.id,
            date: p.date,
            code: p.code || 'TT',
            description: p.reference ? `Thanh toán: ${p.reference}` : `Thanh toán ${p.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}`,
            incurred: 0,
            paid: p.amount,
            url: `/public/sales/payments/${p.id}`,
            badge: 'TT',
            badgeColor: 'bg-emerald-100 text-emerald-700'
        }))
    ];

    // Sort ascending by date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Compute running balance
    let currentBalance = openingBalance;
    const ledger = transactions.map(tx => {
        currentBalance = currentBalance + tx.incurred - tx.paid;
        return { ...tx, balance: currentBalance };
    });

    const totalIncurred = transactions.reduce((sum, tx) => sum + tx.incurred, 0);
    const totalPaid = transactions.reduce((sum, tx) => sum + tx.paid, 0);
    const closingBalance = openingBalance + totalIncurred - totalPaid;

    // Quick filters
    const firstDayLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDayLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];
    const firstDayThisYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

    return (
        <div className="space-y-6 pb-12 print:space-y-8 print:pb-0 print:font-serif print-classic-table">
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body, .print-classic-table, .print-classic-table * {
                        font-family: "Times New Roman", Times, serif !important;
                    }
                    .print-classic-table table {
                        border-collapse: collapse !important;
                        width: 100% !important;
                    }
                    .print-classic-table th, .print-classic-table td {
                        border: 1px solid #000 !important;
                    }
                    .print-classic-table .text-rose-600 { color: #dc2626 !important; }
                    .print-classic-table .text-emerald-600 { color: #059669 !important; }
                    .print-classic-table .text-blue-700, .print-classic-table .text-slate-900 { color: #0f172a !important; }
                }
            `}} />
            {/* Print Only Header (Classic Sổ Phụ) */}
            <div className="hidden print:block text-center mb-8">
                <h1 className="font-bold uppercase tracking-wide text-slate-900 mb-3" style={{ fontSize: '24pt', color: '#0f172a' }}>SAO KÊ CÔNG NỢ KHÁCH HÀNG</h1>
                <p className="font-bold text-slate-900 mb-1" style={{ fontSize: '14pt' }}>Tên khách hàng: {session.user.name?.toUpperCase()}</p>
                <p className="italic text-slate-600" style={{ fontSize: '11pt' }}>Từ {new Date(fromDate).toLocaleDateString('vi-VN')} đến {new Date(toDate).toLocaleDateString('vi-VN')}</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Sao Kê Công Nợ</h1>
                </div>
                <div>
                    <PrintButtonClient />
                </div>
            </div>

            {/* Filter Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 print:hidden">
                <form className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Từ ngày</label>
                            <input type="date" name="from" defaultValue={from} className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Đến ngày</label>
                            <input type="date" name="to" defaultValue={to} className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                        </div>
                    </div>
                    <div className="flex items-end gap-2 shrink-0 pt-5">
                        <Link href={`?from=${firstDayOfMonth}&to=${lastDayOfMonth}`} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">Tháng này</Link>
                        <Link href={`?from=${firstDayLastMonth}&to=${lastDayLastMonth}`} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">Tháng trước</Link>
                        <Link href={`?from=${firstDayThisYear}&to=${todayString}`} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">Năm nay</Link>
                        <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md ml-2 flex items-center gap-2">
                            <FileSpreadsheet size={16} />
                            Xem báo cáo
                        </button>
                    </div>
                </form>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div className="bg-white p-5 rounded-xl border-l-[4px] border-l-slate-400 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">SỐ DƯ ĐẦU KỲ</p>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(openingBalance)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border-l-[4px] border-l-rose-500 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-1">PHÁT SINH NỢ (HÓA ĐƠN)</p>
                    <p className="text-xl font-bold text-rose-600">+{formatCurrency(totalIncurred)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border-l-[4px] border-l-emerald-500 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-1">THANH TOÁN (CÓ)</p>
                    <p className="text-xl font-bold text-emerald-600">-{formatCurrency(totalPaid)}</p>
                </div>
                <div className="bg-blue-50 p-5 rounded-xl border-l-[4px] border-l-blue-600 border border-blue-200 shadow-sm flex flex-col justify-center">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">DƯ NỢ CUỐI KỲ</p>
                    <p className="text-2xl font-black text-blue-700">{formatCurrency(closingBalance)}</p>
                </div>
            </div>

            {/* Classic Summary Table (Print Only) */}
            <table className="hidden print:table w-full border-collapse border border-slate-800 text-sm mb-8" style={{ fontSize: '11pt' }}>
                <thead>
                    <tr className="bg-slate-50">
                        <th className="border border-slate-800 p-4 text-left uppercase font-bold w-1/4">Số dư đầu kỳ</th>
                        <th className="border border-slate-800 p-4 text-left uppercase font-bold w-1/4">Phát sinh nợ (hóa đơn)</th>
                        <th className="border border-slate-800 p-4 text-left uppercase font-bold w-1/4">Thanh toán (có)</th>
                        <th className="border border-slate-800 p-4 text-left uppercase font-bold w-1/4 bg-[#f8fafc]">Dư nợ cuối kỳ</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-slate-800 p-4 font-bold text-slate-900" style={{ fontSize: '14pt' }}>{formatCurrency(openingBalance)}</td>
                        <td className="border border-slate-800 p-4 font-bold text-slate-900" style={{ fontSize: '14pt' }}>+{formatCurrency(totalIncurred)}</td>
                        <td className="border border-slate-800 p-4 font-bold text-slate-900" style={{ fontSize: '14pt' }}>-{formatCurrency(totalPaid)}</td>
                        <td className="border border-slate-800 p-4 font-bold text-slate-900 bg-[#f8fafc]" style={{ fontSize: '14pt' }}>{formatCurrency(closingBalance)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Ledger Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:rounded-none">
                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-left border-collapse min-w-[800px] print:min-w-0 print:w-full print:border print:border-slate-800" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 print:text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                                <th className="px-6 py-4 w-32 print:border print:border-slate-800 print:p-3 print:text-center print:font-bold">Ngày CT</th>
                                <th className="px-6 py-4 w-40 print:border print:border-slate-800 print:p-3 print:text-center print:font-bold">Số CT</th>
                                <th className="px-6 py-4 print:border print:border-slate-800 print:p-3 print:text-center print:font-bold">Diễn giải</th>
                                <th className="px-6 py-4 text-right w-40 print:border print:border-slate-800 print:p-3 print:text-center print:font-bold">Phát sinh (Nợ)</th>
                                <th className="px-6 py-4 text-right w-40 print:border print:border-slate-800 print:p-3 print:text-center print:font-bold">Thanh toán (Có)</th>
                                <th className="px-6 py-4 text-right w-48 print:border print:border-slate-800 print:p-3 print:text-center print:font-bold">Số dư nợ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm print:divide-y-0">
                            {/* Opening Row */}
                            <tr className="bg-slate-50/50 print:bg-white">
                                <td colSpan={3} className="px-6 py-4 text-center font-bold text-slate-700 uppercase text-xs print:border print:border-slate-800 print:p-3 print:text-right print:text-[11pt]">
                                    SỐ DƯ ĐẦU KỲ:
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-slate-400 print:border print:border-slate-800 print:p-3 print:text-center">-</td>
                                <td className="px-6 py-4 text-right font-medium text-slate-400 print:border print:border-slate-800 print:p-3 print:text-center">-</td>
                                <td className="px-6 py-4 text-right font-bold text-slate-800 print:border print:border-slate-800 print:p-3 print:text-[11pt]">{formatCurrency(openingBalance)}</td>
                            </tr>

                            {/* Transaction Rows */}
                            {ledger.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic print:border print:border-slate-800">
                                        Không có giao dịch phát sinh trong kỳ báo cáo
                                    </td>
                                </tr>
                            ) : (
                                ledger.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-700 font-medium print:border print:border-slate-800 print:p-3 print:text-center">
                                            {new Date(tx.date).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4 print:border print:border-slate-800 print:p-3 print:text-center">
                                            <div className="flex items-center gap-2 print:hidden">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tx.badgeColor}`}>
                                                    {tx.badge}
                                                </span>
                                                {tx.url ? (
                                                    <a href={tx.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                                                        {tx.code}
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    </a>
                                                ) : (
                                                    <span className="font-semibold text-slate-700">{tx.code}</span>
                                                )}
                                            </div>
                                            <div className="hidden print:block font-bold">
                                                [{tx.badge}] {tx.code}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 print:border print:border-slate-800 print:p-3">{tx.description}</td>
                                        <td className="px-6 py-4 text-right text-rose-600 font-semibold print:border print:border-slate-800 print:p-3">{tx.incurred > 0 ? formatCurrency(tx.incurred) : '-'}</td>
                                        <td className="px-6 py-4 text-right text-emerald-600 font-semibold print:border print:border-slate-800 print:p-3">{tx.paid > 0 ? formatCurrency(tx.paid) : '-'}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800 print:border print:border-slate-800 print:p-3">{formatCurrency(tx.balance)}</td>
                                    </tr>
                                ))
                            )}

                            {/* Closing Row */}
                            <tr className="bg-slate-50/80 border-t-2 border-slate-200 print:bg-white">
                                <td colSpan={3} className="px-6 py-5 text-center font-bold text-slate-800 uppercase text-xs print:border print:border-slate-800 print:p-3 print:text-right print:text-[11pt]">
                                    TỔNG CỘNG PHÁT SINH TRONG KỲ:
                                </td>
                                <td className="px-6 py-5 text-right font-bold text-rose-600 print:border print:border-slate-800 print:p-3">{formatCurrency(totalIncurred)}</td>
                                <td className="px-6 py-5 text-right font-bold text-emerald-600 print:border print:border-slate-800 print:p-3">{formatCurrency(totalPaid)}</td>
                                <td className="px-6 py-5 text-right font-black text-blue-700 text-lg print:border print:border-slate-800 print:p-3 print:text-[11pt]">{formatCurrency(closingBalance)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Print Signatures */}
            <div className="hidden print:flex justify-between items-start mt-16 px-16">
                <div className="text-center font-serif">
                    <h3 className="font-bold text-[12pt] uppercase mb-1">XÁC NHẬN CỦA KHÁCH HÀNG</h3>
                    <p className="italic text-[10pt] text-slate-800">(Ký, đóng dấu và ghi rõ họ tên)</p>
                </div>
                <div className="text-center font-serif">
                    <h3 className="font-bold text-[12pt] uppercase mb-1">NGƯỜI LẬP SAO KÊ</h3>
                    <p className="italic text-[10pt] text-slate-800">(Ký và ghi rõ họ tên)</p>
                </div>
            </div>
        </div>
    );
}
