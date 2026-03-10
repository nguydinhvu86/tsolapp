import { formatDate } from '@/lib/utils/formatters';
import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/app/components/ui/PrintButton';

export default async function PublicSalesEstimatePage({ params }: { params: { id: string } }) {
    const estimate = await prisma.salesEstimate.findUnique({
        where: { id: params.id },
        include: {
            customer: true,
            creator: true,
            items: { include: { product: true } }
        }
    });

    if (!estimate) {
        notFound();
    }

    const settings = await prisma.systemSetting.findMany({
        where: { key: { in: ['COMPANY_FULL_NAME', 'COMPANY_NAME', 'COMPANY_ADDRESS', 'COMPANY_LOGO', 'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_TAX'] } }
    });
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => settingsMap[s.key] = s.value);

    const compName = settingsMap['COMPANY_FULL_NAME'] || settingsMap['COMPANY_NAME'] || 'CÔNG TY CHƯA CẬP NHẬT';
    const compAddress = settingsMap['COMPANY_ADDRESS'] || '';
    const compLogo = settingsMap['COMPANY_LOGO'] || null;

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };


    return (
        <div className="print-wrapper" style={{ minHeight: '100vh', backgroundColor: '#e2e8f0', padding: '2rem 1rem', margin: '0 auto', maxWidth: '210mm' }}>
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
                        padding: 0 !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        max-width: none !important;
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
            <PrintButton label="In Báo Giá / Lưu PDF" />

            <div className="a4-document" style={{
                width: '100%',
                maxWidth: '210mm',
                minHeight: '297mm',
                backgroundColor: 'white',
                padding: '20mm',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontFamily: 'Arial, sans-serif'
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
                            <img src={compLogo} alt="Logo" style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }} />
                        </div>
                    )}
                </div>

                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>BẢNG BÁO GIÁ</h1>
                    <i style={{ fontSize: '0.95rem', color: '#475569' }}>Số: {estimate.code} | Ngày: {formatDate(estimate.date)}</i>
                </div>

                {/* Estimate Detail Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0', display: 'inline-block', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>THÔNG TIN KHÁCH HÀNG</h3>
                        <div><strong>Tên khách hàng:</strong> {estimate.customer?.name}</div>
                        {estimate.customer?.address && <div><strong>Địa chỉ:</strong> {estimate.customer?.address}</div>}
                        {estimate.customer?.phone && <div><strong>Điện thoại:</strong> {estimate.customer?.phone}</div>}
                    </div>
                    <div style={{ flex: 1, paddingLeft: '1rem', textAlign: 'right' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0', display: 'inline-block', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>ĐIỀU KIỆN BÁO GIÁ</h3>
                        <div><strong>Hiệu lực đến:</strong> {formatDate(estimate.validUntil) || '---'}</div>
                        <div><strong>Người lập:</strong> {estimate.creator?.name || '---'}</div>
                        <div><strong>Trạng thái:</strong> {
                            estimate.status === 'DRAFT' ? 'Bản Dự Thảo' :
                                estimate.status === 'SENT' ? 'Đã Gửi KH' :
                                    estimate.status === 'ACCEPTED' ? 'Đã Phê Duyệt' :
                                        estimate.status === 'REJECTED' ? 'Từ Chối' : estimate.status
                        }</div>
                    </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.95rem' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '5%' }}>STT</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'left', width: '57%' }}>Sản Phẩm / Dịch Vụ</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '5%' }}>SL</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'right', width: '13%', whiteSpace: 'nowrap' }}>Đơn Giá</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '6%' }}>Thuế (%)</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'right', width: '14%', whiteSpace: 'nowrap' }}>Thành Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {estimate.items?.map((item: any, index: number) => (
                            <tr key={item.id}>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{index + 1}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                                    <strong style={{ display: 'block' }}>{item.product?.name || item.customName || item.name || 'Sản phẩm tự do'}</strong>
                                    {item.product?.sku && <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>SKU: {item.product.sku}</span>}
                                    {item.description && <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'pre-line' }}>{item.description}</span>}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.quantity} {item.product?.unit || item.unit || ''}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.taxRate}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.totalPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền trước thuế:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(estimate.subTotal || 0)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền thuế:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(estimate.taxAmount || 0)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>TỔNG CỘNG:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{formatMoney(estimate.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Notes */}
                {estimate.notes && (
                    <div style={{ marginBottom: '3rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Ghi chú:</h4>
                        <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', fontStyle: 'italic', padding: '10px 15px', backgroundColor: '#f8fafc', borderLeft: '4px solid #94a3b8' }}>
                            {estimate.notes}
                        </div>
                    </div>
                )}

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2rem', marginTop: '4rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '1rem' }}>ĐẠI DIỆN KHÁCH HÀNG</strong>
                        <i style={{ fontSize: '0.85rem', color: '#64748b' }}>(Ký và ghi rõ họ tên)</i>
                        <div style={{ height: '80px' }}></div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '1rem' }}>NGƯỜI LẬP BÁO GIÁ</strong>
                        <i style={{ fontSize: '0.85rem', color: '#64748b' }}>(Ký và ghi rõ họ tên)</i>
                        <div style={{ height: '100px' }}></div>
                        <strong>{estimate.creator?.name}</strong>
                    </div>
                </div>

            </div>
        </div>
    );
}
