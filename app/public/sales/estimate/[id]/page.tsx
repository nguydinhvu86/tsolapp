import { formatDate, formatTaxRate } from '@/lib/utils/formatters';
import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/app/components/ui/PrintButton';
import { Watermark } from '@/app/components/ui/Watermark';
import { DocumentSignatureBlock } from '@/app/components/ui/DocumentSignatureBlock';

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

    // Lazy evaluate EXPIRED status
    const todayAtMidnight = new Date();
    todayAtMidnight.setHours(0, 0, 0, 0);

    if (estimate.status === 'SENT' && estimate.validUntil && new Date(estimate.validUntil).setHours(0, 0, 0, 0) < todayAtMidnight.getTime()) {
        await prisma.salesEstimate.update({
            where: { id: estimate.id },
            data: { status: 'EXPIRED' }
        });
        estimate.status = 'EXPIRED';
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

    const compName = settingsMap['COMPANY_FULL_NAME'] || settingsMap['COMPANY_NAME'] || 'CÔNG TY CHƯA CẬP NHẬT';
    const compAddress = settingsMap['COMPANY_ADDRESS'] || '';
    const compLogo = settingsMap['COMPANY_LOGO'] || null;

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };


    return (
        <div className="print-wrapper" style={{ minHeight: '100vh', backgroundColor: '#e2e8f0', padding: '2rem 1rem', margin: '0 auto', maxWidth: estimate.templateType === 'PROJECT_BREAKDOWN' ? '1122px' : '800px' }}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        margin: 15mm;
                        size: A4 ${estimate.templateType === 'PROJECT_BREAKDOWN' ? 'landscape' : 'portrait'};
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
            <PrintButton label="In Báo Giá / Lưu PDF" />

            <div className="a4-document" style={{
                position: 'relative',
                width: '100%',
                maxWidth: estimate.templateType === 'PROJECT_BREAKDOWN' ? '1122px' : '800px',
                minHeight: estimate.templateType === 'PROJECT_BREAKDOWN' ? '800px' : '1122px',
                backgroundColor: 'white',
                padding: '20mm',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontFamily: '"Times New Roman", Times, serif'
            }}>
                <Watermark settings={settingsMap} documentType="SALES_ESTIMATE" />
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
                                        estimate.status === 'REJECTED' ? 'Từ Chối' :
                                            estimate.status === 'EXPIRED' ? 'Hết Hiệu Lực' : estimate.status
                        }</div>
                    </div>
                </div>

                                {/* Items Table */}
                {estimate.templateType === 'PROJECT_BREAKDOWN' ? (() => {
                    let sumVatTu = 0;
                    let sumNhanCong = 0;
                    estimate.items?.forEach((item: any) => {
                        sumVatTu += item.quantity * item.unitPrice;
                        sumNhanCong += item.quantity * (item.laborPrice || 0);
                    });
                    
                    return (
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.95rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center' }}>S.Ảnh</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'left' }}>Sản Phẩm</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center' }}>Hãng SX</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center' }}>Bảo Hành</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'center' }}>SL</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>Đ.Giá V.Tư</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>Đ.Giá N.Công</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>Tiền V.Tư</th>
                                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>Tiền N.Công</th>
                                </tr>
                            </thead>
                            <tbody>
                                {estimate.items?.map((item: any) => {
                                    const tienVatTu = item.quantity * item.unitPrice;
                                    const tienNhanCong = item.quantity * (item.laborPrice || 0);
                                    return (
                                        <tr key={item.id} style={{ backgroundColor: item.isSubItem ? '#f8fafc' : 'transparent' }}>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'center' }}>
                                                {item.imageUrl ? <img src={item.imageUrl} alt="img" style={{ maxWidth: '40px', maxHeight: '40px', objectFit: 'contain' }} /> : '-'}
                                            </td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', paddingLeft: item.isSubItem ? '30px' : '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                    {item.isSubItem && <span style={{ color: '#94a3b8' }}>↳</span>}
                                                    <div>
                                                        <strong style={{ display: 'block', color: item.isSubItem ? '#475569' : '#0f172a' }}>{item.customName || item.product?.name || 'Sản phẩm tự do'}</strong>
                                                        {item.description && <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'pre-line', display: 'block', marginTop: '2px' }}>{item.description}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'center' }}>{item.manufacture || '-'}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'center' }}>{item.warranty || '-'}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'center' }}>{item.quantity} {item.unit || item.product?.unit || ''}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'right' }}>{formatMoney(item.laborPrice || 0)}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(tienVatTu)}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '8px 4px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(tienNhanCong)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng Cộng Vật Tư:</td>
                                    <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(sumVatTu)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng Cộng Nhân Công:</td>
                                    <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(sumNhanCong)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>VAT Tax:</td>
                                    <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(estimate.taxAmount || 0)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>TỔNG CỘNG:</td>
                                    <td colSpan={2} style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{formatMoney(estimate.totalAmount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    );
                })() : estimate.templateType === 'WITH_IMAGES' ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.95rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9' }}>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '7%' }}>S.Ảnh</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'left', width: '38%' }}>Sản Phẩm</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '10%' }}>Xuất Xứ</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '10%' }}>Bảo Hành</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '5%' }}>SL</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'right', width: '10%', whiteSpace: 'nowrap' }}>Đơn Giá</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '5%' }}>Thuế</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'right', width: '15%', whiteSpace: 'nowrap' }}>Thành Tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estimate.items?.map((item: any) => (
                                <tr key={item.id} style={{ backgroundColor: item.isSubItem ? '#f8fafc' : 'transparent' }}>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>
                                        {item.imageUrl ? <img src={item.imageUrl} alt="img" style={{ maxWidth: '40px', maxHeight: '40px', objectFit: 'contain' }} /> : '-'}
                                    </td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', paddingLeft: item.isSubItem ? '30px' : '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                            {item.isSubItem && <span style={{ color: '#94a3b8' }}>↳</span>}
                                            <div>
                                                <strong style={{ display: 'block', color: item.isSubItem ? '#475569' : '#0f172a' }}>{item.customName || item.product?.name || 'Sản phẩm tự do'}</strong>
                                                {item.product?.sku && <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '2px' }}>SKU: {item.product.sku}</span>}
                                                {item.manufacture && <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Hãng: {item.manufacture}</span>}
                                                {item.description && <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'pre-line', display: 'block', marginTop: '2px' }}>{item.description}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.origin || '-'}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.warranty || '-'}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.quantity} {item.unit || item.product?.unit || ''}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', fontWeight: item.taxRate === -1 ? 700 : 400 }}>{formatTaxRate(item.taxRate)}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.totalPrice)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền trước thuế:</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(estimate.subTotal || 0)}</td>
                            </tr>
                            <tr>
                                <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>Tổng tiền thuế:</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatMoney(estimate.taxAmount || 0)}</td>
                            </tr>
                            <tr>
                                <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>TỔNG CỘNG:</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '10px 8px', textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{formatMoney(estimate.totalAmount)}</td>
                            </tr>
                        </tfoot>
                    </table>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.95rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f5f9' }}>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '5%' }}>STT</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'left', width: '57%' }}>Sản Phẩm / Dịch Vụ</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '5%' }}>SL</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'right', width: '13%', whiteSpace: 'nowrap' }}>Đơn Giá</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'center', width: '8%' }}>Thuế</th>
                                <th style={{ border: '1px solid #cbd5e1', padding: '10px 6px', textAlign: 'right', width: '14%', whiteSpace: 'nowrap' }}>Thành Tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estimate.items?.map((item: any, index: number) => (
                                <tr key={item.id} style={{ backgroundColor: item.isSubItem ? '#f8fafc' : 'transparent' }}>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.isSubItem ? '-' : (index + 1)}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', paddingLeft: item.isSubItem ? '30px' : '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                            {item.isSubItem && <span style={{ color: '#94a3b8' }}>↳</span>}
                                            <div>
                                                <strong style={{ display: 'block', color: item.isSubItem ? '#475569' : '#0f172a' }}>{item.customName || item.product?.name || 'Sản phẩm tự do'}</strong>
                                                {item.product?.sku && <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '2px' }}>SKU: {item.product.sku}</span>}
                                                {item.description && <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'pre-line', display: 'block', marginTop: '2px' }}>{item.description}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>{item.quantity} {item.product?.unit || item.unit || ''}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>{formatMoney(item.unitPrice)}</td>
                                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', fontWeight: item.taxRate === -1 ? 700 : 400 }}>{formatTaxRate(item.taxRate)}</td>
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
                )}                {/* Notes */}
                {estimate.notes && (
                    <div style={{ marginBottom: '3rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Ghi chú:</h4>
                        <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', fontStyle: 'italic', padding: '10px 15px', backgroundColor: '#f8fafc', borderLeft: '4px solid #94a3b8' }}>
                            {estimate.notes}
                        </div>
                    </div>
                )}

                {/* Signatures */}
                <div className="no-break" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2rem', marginTop: '2rem', pageBreakInside: 'avoid' }}>
                    <DocumentSignatureBlock 
                        entityType="SALES_ESTIMATE" 
                        entityId={estimate.id} 
                        role="CUSTOMER" 
                        title="ĐẠI DIỆN KHÁCH HÀNG" 
                        subtitle="(Ký tên)" 
                        canSign={true} 
                        initialSignature={estimate.customerSignature} 
                        initialSignedAt={estimate.customerSignedAt}
                            metadata={{
                                ip: estimate.customerSignIP,
                                device: estimate.customerSignDevice,
                                location: estimate.customerSignLocation
                            }} 
                    />
                    <DocumentSignatureBlock 
                        entityType="SALES_ESTIMATE" 
                        entityId={estimate.id} 
                        role="COMPANY" 
                        title="NGƯỜI LẬP BÁO GIÁ" 
                        subtitle="(Ký tên)" 
                        canSign={false} 
                        initialSignature={estimate.companySignature} 
                        initialSignedAt={estimate.companySignedAt} 
                        signerName={estimate.creator?.name} 
                    />
                </div>

            </div>
        </div>
    );
}
