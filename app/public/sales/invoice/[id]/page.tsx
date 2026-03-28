import { formatDate } from '@/lib/utils/formatters';
import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/app/components/ui/PrintButton';
import { Watermark } from '@/app/components/ui/Watermark';
import { DocumentSignatureBlock } from '@/app/components/ui/DocumentSignatureBlock';

export default async function PublicSalesInvoicePage({ params }: { params: { id: string } }) {
    const invoice = await prisma.salesInvoice.findUnique({
        where: { id: params.id },
        include: {
            customer: true,
            creator: true,
            items: { include: { product: true } }
        }
    });

    if (!invoice) {
        notFound();
    }

    const settings = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    'COMPANY_FULL_NAME', 'COMPANY_NAME', 'COMPANY_ADDRESS', 'COMPANY_LOGO', 'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_TAX_CODE',
                    'WATERMARK_ENABLED', 'WATERMARK_TYPE', 'WATERMARK_TEXT', 'WATERMARK_IMAGE_URL', 'WATERMARK_OPACITY', 'WATERMARK_ROTATION', 'WATERMARK_COLOR', 'WATERMARK_SIZE', 'WATERMARK_DOCUMENTS'
                ]
            }
        }
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
            <PrintButton label="In Hóa Đơn / PDF" />

            <div className="a4-document" style={{
                position: 'relative',
                width: '100%',
                maxWidth: '210mm',
                minHeight: '297mm',
                backgroundColor: 'white',
                padding: '20mm',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontFamily: 'Arial, sans-serif'
            }}>
                <Watermark settings={settingsMap} documentType="SALES_INVOICE" />
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
                            {settingsMap['COMPANY_TAX_CODE'] && <div><strong>Mã số thuế:</strong> {settingsMap['COMPANY_TAX_CODE']}</div>}
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
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>HÓA ĐƠN BÁN HÀNG</h1>
                    <i style={{ fontSize: '0.95rem', color: '#475569' }}>Số: {invoice.code} | Ngày lập: {formatDate(invoice.date)}</i>
                </div>

                {/* Invoice Detail Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0', display: 'inline-block', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>THÔNG TIN KHÁCH HÀNG</h3>
                        <div><strong>Tên khách hàng:</strong> {invoice.customer?.name}</div>
                        {invoice.customer?.address && <div><strong>Địa chỉ:</strong> {invoice.customer?.address}</div>}
                        {invoice.customer?.phone && <div><strong>Điện thoại:</strong> {invoice.customer?.phone}</div>}
                    </div>
                    <div style={{ flex: 1, paddingLeft: '1rem', textAlign: 'right' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0', display: 'inline-block', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>ĐIỀU KIỆN & THANH TOÁN</h3>
                        <div><strong>Hạn thanh toán:</strong> {formatDate(invoice.dueDate) || '---'}</div>
                        <div><strong>Người lập:</strong> {invoice.creator?.name || '---'}</div>
                        <div><strong>Trạng thái:</strong> {
                            invoice.status === 'DRAFT' ? 'Bản Dự Thảo' :
                                invoice.status === 'ISSUED' ? 'Đã Giao / Ghi Nợ' :
                                    invoice.status === 'PARTIAL_PAID' ? 'Đã Thu Một Phần' :
                                        invoice.status === 'PAID' ? 'Đã Thu Đủ Tiền' : invoice.status
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
                        {invoice.items?.map((item: any, index: number) => (
                            <tr key={item.id}>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{index + 1}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                                    <strong style={{ display: 'block' }}>{item.product?.name || item.customName || 'Sản phẩm tự do'}</strong>
                                    {item.product?.sku && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: {item.product.sku}</span>}
                                </td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.quantity} {item.product?.unit || ''}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.taxRate}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.totalPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền trước thuế:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(invoice.subTotal || 0)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền thuế:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(invoice.taxAmount || 0)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>TỔNG CỘNG:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{formatMoney(invoice.totalAmount)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Notes */}
                {invoice.notes && (
                    <div style={{ marginBottom: '3rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Ghi chú:</h4>
                        <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', fontStyle: 'italic', padding: '10px 15px', backgroundColor: '#f8fafc', borderLeft: '4px solid #94a3b8' }}>
                            {invoice.notes}
                        </div>
                    </div>
                )}

                {/* Signatures */}
                <div className="no-break" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2rem', marginTop: '4rem', pageBreakInside: 'avoid' }}>
                    <DocumentSignatureBlock 
                        entityType="SALES_INVOICE" 
                        entityId={invoice.id} 
                        role="CUSTOMER" 
                        title="NGƯỜI MUA HÀNG" 
                        subtitle="(Ký tên)" 
                        canSign={true} 
                        initialSignature={invoice.customerSignature} 
                        initialSignedAt={invoice.customerSignedAt}
                            metadata={{
                                ip: invoice.customerSignIP,
                                device: invoice.customerSignDevice,
                                location: invoice.customerSignLocation
                            }} 
                    />
                    <DocumentSignatureBlock 
                        entityType="SALES_INVOICE" 
                        entityId={invoice.id} 
                        role="COMPANY" 
                        title="NGƯỜI LẬP BIỂU" 
                        subtitle="(Ký tên)" 
                        canSign={false} 
                        initialSignature={invoice.companySignature} 
                        initialSignedAt={invoice.companySignedAt} 
                        signerName={invoice.creator?.name} 
                    />
                </div>

            </div>
        </div>
    );
}
