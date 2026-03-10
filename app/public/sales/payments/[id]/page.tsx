import { formatDate } from '@/lib/utils/formatters';
import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/app/components/ui/PrintButton';

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
        where: { key: { in: ['COMPANY_FULL_NAME', 'COMPANY_NAME', 'COMPANY_ADDRESS', 'COMPANY_LOGO', 'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_TAX'] } }
    });
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => settingsMap[s.key] = s.value);

    const compName = settingsMap['COMPANY_FULL_NAME'] || settingsMap['COMPANY_NAME'] || 'CÔNG TY CỔ PHẦN CÔNG NGHỆ DEMO';
    const compAddress = settingsMap['COMPANY_ADDRESS'] || 'Tầng 12, Tòa nhà Center, TP. Hà Nội';
    const compLogo = settingsMap['COMPANY_LOGO'] || null;

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };


    return (
        <div className="print-wrapper" style={{ minHeight: '100vh', backgroundColor: '#e2e8f0', padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        margin: 15mm;
                        size: A4;
                    }
                    body, html {
                        height: auto !important;
                        overflow: visible !important;
                        background-color: white !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print-wrapper {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
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
                        padding: 0 !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        max-width: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    tfoot {
                        display: table-row-group !important;
                    }
                }
            `}} />
            <PrintButton label="In Phiếu Thu" />

            <div className="a4-document" style={{
                width: '100%',
                maxWidth: '210mm',
                minHeight: '297mm',
                backgroundColor: 'white',
                padding: '20mm',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontFamily: '"Times New Roman", Times, serif',
                color: '#000'
            }}>
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

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 1rem', marginTop: '4rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '1rem' }}>NGƯỜI NỘP TIỀN</strong>
                        <i style={{ fontSize: '0.85rem', color: '#64748b' }}>(Ký và ghi rõ họ tên)</i>
                        <div style={{ height: '100px' }}></div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '1rem' }}>NGƯỜI LẬP PHIẾU</strong>
                        <i style={{ fontSize: '0.85rem', color: '#64748b' }}>(Ký và ghi rõ họ tên)</i>
                        <div style={{ height: '100px' }}></div>
                        <strong>{payment.creator?.name}</strong>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '1rem' }}>THỦ QUỸ / KẾ TOÁN TRƯỞNG</strong>
                        <i style={{ fontSize: '0.85rem', color: '#64748b' }}>(Ký và ghi rõ họ tên)</i>
                        <div style={{ height: '100px' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
