import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { numberToVietnameseWords } from '@/lib/vietnameseCurrency';
import { DocumentSignatureBlock } from '@/app/components/ui/DocumentSignatureBlock';
import { PrintButton } from '@/app/components/ui/PrintButton';
import { Watermark } from '@/app/components/ui/Watermark';
import { Share2, Check, FileText } from 'lucide-react';
import PublicShareButton from '@/app/components/ui/PublicShareButton';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const tx = await prisma.cashTransaction.findUnique({
        where: { id: params.id },
        include: { customer: true, supplier: true }
    });

    const isReceipt = tx?.type === 'RECEIPT';
    const docTitle = tx ? `${isReceipt ? 'Phiếu Thu' : 'Phiếu Chi'} #${tx.code} | T-SOLUTION` : 'Phiếu Thu / Chi | T-SOLUTION';
    const desc = tx ? `Chứng từ ${isReceipt ? 'thu tiền' : 'chi tiền'} dành cho ${tx.payerReceiver} - T-SOLUTION` : 'Chi tiết phiếu thu/chi - T-SOLUTION';

    return {
        title: docTitle,
        description: desc,
        openGraph: {
            title: docTitle,
            description: desc,
        },
    };
}

export default async function PublicCashTransactionPage({ params }: { params: { id: string } }) {
    const transaction = await prisma.cashTransaction.findUnique({
        where: { id: params.id },
        include: {
            customer: true,
            supplier: true,
            project: true,
            financeAccount: true,
            createdBy: true
        }
    });

    if (!transaction) {
        notFound();
    }

    const settings = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    'COMPANY_FULL_NAME', 'COMPANY_NAME', 'COMPANY_DISPLAY_NAME', 'COMPANY_ADDRESS', 'COMPANY_LOGO',
                    'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_TAX', 'COMPANY_TAX_CODE', 'COMPANY_CITY',
                    'WATERMARK_ENABLED', 'WATERMARK_TYPE', 'WATERMARK_TEXT', 'WATERMARK_IMAGE_URL',
                    'WATERMARK_OPACITY', 'WATERMARK_ROTATION', 'WATERMARK_COLOR', 'WATERMARK_SIZE', 'WATERMARK_DOCUMENTS'
                ]
            }
        }
    });
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => settingsMap[s.key] = s.value);

    const compName = settingsMap['COMPANY_FULL_NAME'] || settingsMap['COMPANY_NAME'] || 'CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ TSOL';
    const compAddress = settingsMap['COMPANY_ADDRESS'] || 'TP. Hồ Chí Minh, Việt Nam';
    const compLogo = settingsMap['COMPANY_LOGO'] || null;
    const cityName = settingsMap['COMPANY_CITY'] || 'TP. Hồ Chí Minh';

    const isReceipt = transaction.type === 'RECEIPT';
    const formCode = isReceipt ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT';
    const titleText = isReceipt ? 'PHIẾU THU' : 'PHIẾU CHI';

    const date = new Date(transaction.transactionDate);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const debitAccount = isReceipt 
        ? (transaction.paymentMethod === 'BANK_TRANSFER' ? '1121' : '1111') 
        : (transaction.supplierId ? '331' : transaction.customerId ? '131' : '642');
    
    const creditAccount = isReceipt 
        ? (transaction.customerId ? '131' : '511') 
        : (transaction.paymentMethod === 'BANK_TRANSFER' ? '1121' : '1111');

    const formatVND = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };

    return (
        <div className="print-wrapper bg-slate-100 min-h-screen py-6 px-3 sm:px-6 flex flex-col items-center">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        margin: 10mm 12mm;
                        size: A4 portrait;
                    }
                    body, html {
                        height: auto !important;
                        overflow: visible !important;
                        background-color: white !important;
                        display: block !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print-wrapper {
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        background-color: white !important;
                        padding: 0 !important;
                        display: block !important;
                    }
                    .print-wrapper, .print-wrapper * {
                        visibility: visible;
                    }
                    .a4-document {
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 1px !important;
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        max-width: none !important;
                        min-height: auto !important;
                    }
                    .no-print {
                        display: none !important;
                        visibility: hidden !important;
                    }
                }
            `}} />

            {/* Top Toolbar */}
            <div className="no-print w-full max-w-4xl mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <FileText size={18} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-800">
                            {titleText} #{transaction.code}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {transaction.payerSignature ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                    <Check size={12} strokeWidth={3} /> Đã ký xác nhận online
                                </span>
                            ) : (
                                <span className="text-amber-600 font-medium">Chờ ký xác nhận</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <PublicShareButton title={`Phiếu ${isReceipt ? 'Thu' : 'Chi'} ${transaction.code}`} />
                    <PrintButton label="In / Tải PDF" />
                </div>
            </div>

            {/* A4 Document Paper */}
            <div className="a4-document relative w-full max-w-4xl bg-white p-8 sm:p-12 shadow-xl border border-slate-200/90 rounded-2xl text-slate-900 font-sans">
                <Watermark settings={settingsMap} documentType={isReceipt ? 'SALES_PAYMENT' : 'PURCHASE_PAYMENT'} />

                {/* Header: Company Info + Form Code */}
                <div className="grid grid-cols-12 gap-4 items-start pb-4 border-b border-slate-300">
                    <div className="col-span-8 space-y-1">
                        <div className="font-black text-sm sm:text-base tracking-tight text-slate-950 uppercase leading-snug">
                            {compName}
                        </div>
                        {compAddress && (
                            <div className="text-xs text-slate-700">
                                <span className="font-semibold text-slate-800">Địa chỉ:</span> {compAddress}
                            </div>
                        )}
                        <div className="text-xs text-slate-700 flex flex-wrap gap-x-3 gap-y-0.5">
                            {(settingsMap['COMPANY_TAX'] || settingsMap['COMPANY_TAX_CODE']) && (
                                <span><span className="font-semibold text-slate-800">MST:</span> {settingsMap['COMPANY_TAX'] || settingsMap['COMPANY_TAX_CODE']}</span>
                            )}
                            {settingsMap['COMPANY_PHONE'] && (
                                <span>• <span className="font-semibold text-slate-800">Hotline:</span> {settingsMap['COMPANY_PHONE']}</span>
                            )}
                            {settingsMap['COMPANY_EMAIL'] && (
                                <span>• <span className="font-semibold text-slate-800">Email:</span> {settingsMap['COMPANY_EMAIL']}</span>
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
                    <h1 className={`text-2xl sm:text-3xl font-black tracking-wider uppercase ${isReceipt ? 'text-emerald-800' : 'text-rose-900'}`}>
                        {titleText}
                    </h1>
                    <div className="text-xs font-medium text-slate-700 italic mt-1.5">
                        Ngày {day < 10 ? `0${day}` : day} tháng {month < 10 ? `0${month}` : month} năm {year}
                    </div>
                    <div className="text-[11px] text-slate-500 italic mt-0.5 font-medium">
                        {isReceipt ? '(Liên 1: Lưu tại quỹ - Liên 2: Giao người nộp)' : '(Liên 1: Lưu tại quỹ - Liên 2: Giao người nhận)'}
                    </div>
                </div>

                {/* Content Lines */}
                <div className="space-y-3.5 text-sm text-slate-900 my-6 leading-relaxed">
                    <div className="flex items-end">
                        <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">
                            {isReceipt ? 'Họ và tên người nộp tiền:' : 'Họ và tên người nhận tiền:'}
                        </span>
                        <span className="flex-1 font-bold text-slate-950 text-base pb-0.5" style={{ borderBottom: '1px dotted #94a3b8' }}>
                            {transaction.payerReceiver || '—'}
                        </span>
                    </div>

                    <div className="flex items-end">
                        <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">Địa chỉ / Đơn vị:</span>
                        <span className="flex-1 text-slate-900 pb-0.5 font-medium" style={{ borderBottom: '1px dotted #94a3b8' }}>
                            {transaction.address || transaction.customer?.address || transaction.supplier?.address || '—'}
                        </span>
                    </div>

                    <div className="flex items-end">
                        <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">Số điện thoại liên hệ:</span>
                        <span className="flex-1 text-slate-900 pb-0.5 font-mono font-medium" style={{ borderBottom: '1px dotted #94a3b8' }}>
                            {transaction.phone || transaction.customer?.phone || transaction.supplier?.phone || '—'}
                        </span>
                    </div>

                    <div className="flex items-end">
                        <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">
                            {isReceipt ? 'Lý do thu tiền:' : 'Lý do chi tiền:'}
                        </span>
                        <span className="flex-1 font-medium text-slate-950 pb-0.5" style={{ borderBottom: '1px dotted #94a3b8' }}>
                            {transaction.reason || (isReceipt ? 'Thu tiền theo chứng từ' : 'Chi tiền theo chứng từ')}
                        </span>
                    </div>

                    <div className="flex items-end">
                        <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">Số tiền:</span>
                        <span className="flex-1 font-black text-lg text-slate-950 pb-0.5" style={{ borderBottom: '1px dotted #94a3b8' }}>
                            {formatVND(transaction.amount)}
                        </span>
                    </div>

                    <div className="flex items-end">
                        <span className="w-48 sm:w-56 font-semibold text-slate-800 shrink-0">Viết bằng chữ:</span>
                        <span className="flex-1 font-bold italic text-slate-900 pb-0.5" style={{ borderBottom: '1px dotted #94a3b8' }}>
                            {numberToVietnameseWords(transaction.amount)}
                        </span>
                    </div>

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

                {/* Signatures Section with Online Signing Pad */}
                <div className="mt-8 pt-2">
                    <div className="text-right text-xs italic text-slate-700 mb-4 font-medium">
                        {cityName}, ngày {day < 10 ? `0${day}` : day} tháng {month < 10 ? `0${month}` : month} năm {year}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                        <div className="space-y-1">
                            <div className="font-bold uppercase text-slate-950 tracking-tight">Giám Đốc</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, đóng dấu)</div>
                            <div className="h-20 flex items-center justify-center"></div>
                        </div>

                        <div className="space-y-1">
                            <div className="font-bold uppercase text-slate-950 tracking-tight">Kế Toán Trưởng</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, họ tên)</div>
                            <div className="h-20 flex items-center justify-center"></div>
                        </div>

                        <div className="space-y-1">
                            <div className="font-bold uppercase text-slate-950 tracking-tight">Thủ Quỹ</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, họ tên)</div>
                            <div className="h-20 flex items-center justify-center"></div>
                        </div>

                        <div className="space-y-1">
                            <div className="font-bold uppercase text-slate-950 tracking-tight">Người Lập Phiếu</div>
                            <div className="text-[10px] text-slate-500 italic">(Ký, họ tên)</div>
                            <div className="h-20 flex items-end justify-center">
                                <span className="font-bold text-slate-950 text-xs">{transaction.createdBy?.name || 'Sys Admin'}</span>
                            </div>
                        </div>

                        {/* Customer / Payer Signature Block (Online Interactive) */}
                        <div className="col-span-2 sm:col-span-1">
                            <DocumentSignatureBlock
                                entityType="CASH_TRANSACTION"
                                entityId={transaction.id}
                                role="PAYER_RECEIVER"
                                initialSignature={transaction.payerSignature}
                                initialSignedAt={transaction.payerSignedAt}
                                title={isReceipt ? 'Người Nộp Tiền' : 'Người Nhận Tiền'}
                                subtitle="(Ký, ghi rõ họ tên)"
                                signerName={transaction.payerReceiver}
                                canSign={true}
                                metadata={{
                                    ip: transaction.payerSignIP,
                                    device: transaction.payerSignDevice,
                                    location: transaction.payerSignLocation
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Receipt Acknowledgement Bottom Section */}
                <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-700 italic space-y-1">
                    <div>
                        Đã nhận đủ số tiền (viết bằng chữ): <span className="font-semibold not-italic text-slate-900">{numberToVietnameseWords(transaction.amount)}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-8 text-[11px] text-slate-500">
                        <span>+ Tỷ giá ngoại tệ (vàng bạc, đá quý): ............................................</span>
                        <span>+ Số tiền quy đổi: ................................................................</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
