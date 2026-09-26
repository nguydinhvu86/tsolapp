import { formatDate } from '@/lib/utils/formatters';
import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/app/components/ui/PrintButton';
import { Watermark } from '@/app/components/ui/Watermark';
import { DocumentSignatureBlock } from '@/app/components/ui/DocumentSignatureBlock';
import PublicShareButton from '@/app/components/ui/PublicShareButton';

import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const payment = await prisma.salesPayment.findUnique({
        where: { id: params.id },
        include: { customer: true }
    });

    const docTitle = payment ? `Phiếu Thu #${payment.code || ''} | T-SOLUTION` : 'Phiếu Thu | T-SOLUTION';
    const desc = payment?.customer?.name 
        ? `Phiếu xác nhận thanh toán dành cho khách hàng ${payment.customer.name} - T-SOLUTION`
        : 'Chi tiết phiếu xác nhận thanh toán - T-SOLUTION';

    return {
        title: docTitle,
        description: desc,
        openGraph: {
            title: docTitle,
            description: desc,
        },
        twitter: {
            card: 'summary_large_image',
            title: docTitle,
            description: desc,
        },
    };
}

export default async function PublicSalesPaymentPage({ params }: { params: { id: string } }) {
    const payment = await prisma.salesPayment.findUnique({
        where: { id: params.id },
        include: {
            customer: true,
            creator: true,
            allocations: { include: { invoice: true } }
        }
    });

    if (!payment) {
        notFound();
    }

    const settings = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    'COMPANY_FULL_NAME', 'COMPANY_NAME', 'COMPANY_ADDRESS', 'COMPANY_LOGO', 'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_TAX', 'COMPANY_CITY',
                    'WATERMARK_ENABLED', 'WATERMARK_TYPE', 'WATERMARK_TEXT', 'WATERMARK_IMAGE_URL', 'WATERMARK_OPACITY', 'WATERMARK_ROTATION', 'WATERMARK_COLOR', 'WATERMARK_SIZE', 'WATERMARK_DOCUMENTS'
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

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(amount || 0));
    };


    return (
        <div className="print-wrapper bg-slate-100/90 min-h-screen py-8 px-3 sm:px-6 flex flex-col items-center justify-start">
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
                        top: auto !important;
                        left: auto !important;
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
                        width: 100% !important;
                        max-width: none !important;
                        min-height: auto !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
                    tr    { page-break-inside: auto; page-break-after: auto; }
                    td, th { page-break-inside: auto; }
                    thead { display: table-header-group; }
                    tfoot {
                        display: table-row-group;
                    }
                }
            `}} />
            
            {/* Top Toolbar */}
            <div className="no-print w-full max-w-[850px] mx-auto flex items-center justify-between gap-3 mb-4 bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Phiếu Thu #{payment.code}</span>
                </div>
                <div className="flex items-center gap-2">
                    <PublicShareButton title={`Phiếu Thu ${payment.code}`} />
                    <PrintButton label="In Phiếu Thu" inline={true} />
                </div>
            </div>

            <div className="a4-document relative w-full max-w-[850px] min-h-[297mm] mx-auto bg-white p-8 sm:p-12 shadow-xl rounded-2xl border border-slate-200/90 text-slate-900 font-sans flex flex-col justify-between">
                <div>
                    <Watermark settings={settingsMap} documentType="SALES_PAYMENT" />
                    {/* Header: Company Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', textTransform: 'uppercase', color: '#0f172a' }}>
                                {compName}
                            </h2>
                            <div style={{ fontSize: '0.875rem', lineHeight: '1.5', color: '#334155' }}>
                                {compAddress && <div><strong>Địa chỉ:</strong> {compAddress}</div>}
                                {settingsMap['COMPANY_PHONE'] && <div><strong>Điện thoại:</strong> {settingsMap['COMPANY_PHONE']}</div>}
                                {settingsMap['COMPANY_EMAIL'] && <div><strong>Email:</strong> {settingsMap['COMPANY_EMAIL']}</div>}
                                {settingsMap['COMPANY_TAX'] && <div><strong>Mã số thuế:</strong> {settingsMap['COMPANY_TAX']}</div>}
                            </div>
                        </div>
                        {compLogo && (
                            <div style={{ marginLeft: '2rem' }}>
                                <img src={compLogo} alt="Logo" style={{ maxHeight: '90px', maxWidth: '220px', objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>PHIẾU THU (RECEIPT VOUCHER)</h1>
                        <i style={{ fontSize: '0.95rem', color: '#475569' }}>Số: {payment.code} | Ngày: {formatDate(payment.date)}</i>
                    </div>

                    {/* Detail Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        <div style={{ flex: 1, paddingRight: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px dotted #ccc', display: 'inline-block', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>THÔNG TIN NGƯỜI NỘP TIỀN</h3>
                            <div><strong>Họ Tên / Đơn vị:</strong> {payment.customer?.name}</div>
                            {payment.customer?.address && <div><strong>Địa chỉ:</strong> {payment.customer?.address}</div>}
                            <div><strong>Lý do nộp:</strong> {payment.notes || 'Thanh toán công nợ mua hàng'}</div>
                        </div>
                        <div style={{ flex: 1, paddingLeft: '1rem', textAlign: 'right' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px dotted #ccc', display: 'inline-block', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>THÔNG TIN CHỨNG TỪ</h3>
                            <div><strong>Ngày lập phiếu:</strong> {formatDate(payment.date)}</div>
                            <div><strong>Hình thức:</strong> {payment.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển Khoản' : 'Tiền Mặt'}</div>
                            <div><strong>Tham chiếu:</strong> {payment.reference || '--'}</div>
                            <div><strong>Người lập phiếu:</strong> {payment.creator?.name || '--'}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Số Tiền Thu: <span style={{ color: '#10b981' }}>{formatMoney(payment.amount)}</span></h3>
                        <i style={{ margin: 0, color: '#475569', fontSize: '0.95rem' }}>Kèm theo chứng từ gốc: Mời xem đính kèm (nếu có).</i>
                    </div>

                    {payment.allocations && payment.allocations.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem', marginTop: '2rem', fontSize: '0.95rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'center', width: '60px' }}>STT</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'left' }}>Cấn Trừ Hóa Đơn Số</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', width: '200px' }}>Số Tiền Phân Bổ (VNĐ)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payment.allocations.map((alloc: any, index: number) => (
                                    <tr key={alloc.id}>
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{index + 1}</td>
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{alloc.invoice?.code}</td>
                                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(alloc.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>Tổng Phân Bổ Tiền:</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                                        {formatMoney(payment.allocations.reduce((acc: number, cur: any) => acc + cur.amount, 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>

                {/* Date line + Signatures */}
                <div className="mt-8 pt-4 border-t border-slate-200/60">
                    <div style={{ textAlign: 'right', fontSize: '0.95rem', fontStyle: 'italic', marginBottom: '1.5rem', color: '#334155' }}>
                        {cityName}, ngày {new Date(payment.date).getDate()} tháng {new Date(payment.date).getMonth() + 1} năm {new Date(payment.date).getFullYear()}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center items-start">
                        {/* 1. Thủ quỹ / Kế toán */}
                        <div className="min-w-0 flex flex-col items-center">
                            <div className="h-8 flex items-center justify-center">
                                <span className="font-bold text-xs uppercase text-slate-950 tracking-tight">THỦ QUỸ / KẾ TOÁN TRƯỞNG</span>
                            </div>
                            <div className="h-4 flex items-center justify-center">
                                <span className="text-[11px] text-slate-500 italic">(Ký và ghi rõ họ tên)</span>
                            </div>
                            <div className="min-h-[80px] sm:min-h-[90px] flex items-center justify-center w-full" />
                            <div className="min-h-[28px] flex items-center justify-center px-0.5" />
                        </div>

                        {/* 2. Người lập phiếu */}
                        <div className="min-w-0 flex flex-col items-center">
                            <div className="h-8 flex items-center justify-center">
                                <span className="font-bold text-xs uppercase text-slate-950 tracking-tight">NGƯỜI LẬP PHIẾU</span>
                            </div>
                            <div className="h-4 flex items-center justify-center">
                                <span className="text-[11px] text-slate-500 italic">(Ký và ghi rõ họ tên)</span>
                            </div>
                            <div className="min-h-[80px] sm:min-h-[90px] flex items-center justify-center w-full" />
                            <div className="min-h-[28px] flex items-center justify-center px-0.5 w-full">
                                <span className="font-bold text-slate-950 text-xs break-words leading-snug text-center block w-full">
                                    {payment.creator?.name || '—'}
                                </span>
                            </div>
                        </div>

                        {/* 3. Người nộp tiền */}
                        <div className="min-w-0 flex flex-col items-center">
                            <div className="h-8 flex items-center justify-center">
                                <span className="font-bold text-xs uppercase text-slate-950 tracking-tight">NGƯỜI NỘP TIỀN</span>
                            </div>
                            <div className="h-4 flex items-center justify-center">
                                <span className="text-[11px] text-slate-500 italic">(Ký và ghi rõ họ tên)</span>
                            </div>
                            <div className="min-h-[80px] sm:min-h-[90px] flex flex-col items-center justify-center w-full relative py-0.5">
                                <DocumentSignatureBlock
                                    entityType="SALES_PAYMENT"
                                    entityId={payment.id}
                                    role="CUSTOMER"
                                    initialSignature={payment.customerSignature}
                                    initialSignedAt={payment.customerSignedAt}
                                    title="NGƯỜI NỘP TIỀN"
                                    signerName={payment.customer?.name}
                                    canSign={true}
                                    variant="inline"
                                    metadata={{
                                        ip: payment.customerSignIP,
                                        device: payment.customerSignDevice,
                                        location: payment.customerSignLocation
                                    }}
                                />
                            </div>
                            <div className="min-h-[28px] flex items-center justify-center px-0.5 w-full">
                                <span className="font-bold text-slate-950 text-xs break-words leading-snug text-center block w-full">
                                    {payment.customer?.name || '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
