import { formatDate } from '@/lib/utils/formatters';
import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/app/components/ui/PrintButton';
import { Watermark } from '@/app/components/ui/Watermark';

export default async function PublicPurchaseBillPage({ params }: { params: { id: string } }) {
    const bill = await prisma.purchaseBill.findUnique({
        where: { id: params.id },
        include: {
            supplier: true,
            creator: true,
            order: true,
            items: { include: { product: true } }
        }
    });

    if (!bill) {
        notFound();
    }

    const settings = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    'COMPANY_FULL_NAME', 'COMPANY_NAME', 'COMPANY_ADDRESS', 'COMPANY_LOGO', 'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_TAX',
                    'WATERMARK_ENABLED', 'WATERMARK_TYPE', 'WATERMARK_TEXT', 'WATERMARK_IMAGE_URL', 'WATERMARK_OPACITY', 'WATERMARK_ROTATION', 'WATERMARK_COLOR', 'WATERMARK_SIZE', 'WATERMARK_DOCUMENTS'
                ]
            }
        }
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
            <PrintButton label="In Hóa Đơn Nhập Kho" />

            <div className="a4-document" style={{
                width: '100%',
                maxWidth: '210mm',
                minHeight: '297mm',
                backgroundColor: 'white',
                padding: '20mm',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontFamily: '"Times New Roman", Times, serif',
                color: '#000',
                position: 'relative'
            }}>
                <Watermark settings={settingsMap} documentType="PURCHASE_BILL" />
                <div style={{ position: 'absolute', top: '25mm', right: '15mm', border: '3px solid #ef4444', color: '#ef4444', padding: '0.5rem 1rem', fontWeight: 'bold', fontSize: '1.25rem', transform: 'rotate(-5deg)', opacity: 0.8, borderRadius: '0.25rem', zIndex: 10 }}>
                    {bill.status === 'PAID' ? <span style={{ color: '#10b981', borderColor: '#10b981' }}>ĐÃ THANH TOÁN</span> : bill.status === 'APPROVED' ? 'ĐÃ CHỐT SỔ' : 'BẢN NHÁP'}
                </div>

                {/* Header: Company Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ flex: 1, zIndex: 11 }}>
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
                        <div style={{ marginLeft: '2rem', zIndex: 11 }}>
                            <img src={compLogo} alt="Logo" style={{ maxHeight: '90px', maxWidth: '220px', objectFit: 'contain' }} />
                        </div>
                    )}
                </div>

                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>HÓA ĐƠN NHẬP KHO (BILL)</h1>
                    <i style={{ fontSize: '0.95rem', color: '#475569' }}>Số: {bill.code} | Ngày: {formatDate(bill.date)}</i>
                </div>

                {/* Detail Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px dotted #ccc', display: 'inline-block', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>THÔNG TIN NHÀ CUNG CẤP</h3>
                        <div><strong>Tên:</strong> {bill.supplier?.name}</div>
                        {bill.supplier?.address && <div><strong>Địa chỉ:</strong> {bill.supplier?.address}</div>}
                        {bill.supplier?.phone && <div><strong>Điện thoại:</strong> {bill.supplier?.phone}</div>}
                    </div>
                    <div style={{ flex: 1, paddingLeft: '1rem', textAlign: 'right' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px dotted #ccc', display: 'inline-block', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>THÔNG TIN GIAO DỊCH</h3>
                        <div><strong>Ngày lập:</strong> {formatDate(bill.date)}</div>
                        <div><strong>Tham chiếu PO:</strong> {bill.order?.code || 'Không có'}</div>
                        <div><strong>Số HĐ (Của NCC):</strong> {bill.supplierInvoice || 'Không có'}</div>
                        <div><strong>Người lập:</strong> {bill.creator?.name || '---'}</div>
                    </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.95rem' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'center', width: '50px' }}>STT</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'left' }}>Sản Phẩm Nhập</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'center', width: '70px' }}>SL</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', width: '120px' }}>Đơn Giá (VNĐ)</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'center', width: '80px' }}>Thuế (%)</th>
                            <th style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', width: '140px' }}>Thành Tiền (VNĐ)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bill.items?.map((item: any, index: number) => (
                            <tr key={item.id}>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{index + 1}</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                                    <strong style={{ display: 'block' }}>{item.product?.name || item.productName}</strong>
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
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(bill.subTotal || 0)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền thuế:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(bill.taxAmount || 0)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>TỔNG CỘNG HÓA ĐƠN:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{formatMoney(bill.totalAmount)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>Đã Thanh Toán:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{formatMoney(bill.paidAmount)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>Dư Nợ Còn Lại:</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{formatMoney(bill.totalAmount - bill.paidAmount)}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Notes */}
                {bill.notes && (
                    <div style={{ marginBottom: '3rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Ghi chú:</h4>
                        <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', fontStyle: 'italic', padding: '10px 15px', backgroundColor: '#f8fafc', borderLeft: '4px solid #94a3b8' }}>
                            {bill.notes}
                        </div>
                    </div>
                )}

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2rem', marginTop: '4rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '1rem' }}>NGƯỜI GIAO HÀNG / BÊN BÁN</strong>
                        <i style={{ fontSize: '0.85rem', color: '#64748b' }}>(Ký và ghi rõ họ tên)</i>
                        <div style={{ height: '100px' }}></div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '1rem' }}>NGƯỜI NHẬN / KẾ TOÁN</strong>
                        <i style={{ fontSize: '0.85rem', color: '#64748b' }}>(Ký và ghi rõ họ tên)</i>
                        <div style={{ height: '100px' }}></div>
                        <strong>{bill.creator?.name}</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}
