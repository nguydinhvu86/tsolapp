'use client';

import React, { useState } from 'react';
import { toast } from '@/app/components/providers/ToastProvider';
import { FileText, Download, Printer, X, ShieldCheck, UserCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

interface SerialsHandoverPdfModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
    settings?: any;
}

export function SerialsHandoverPdfModal({
    isOpen,
    onClose,
    invoice,
    settings
}: SerialsHandoverPdfModalProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    if (!isOpen || !invoice) return null;

    // Corporate Brand Colors
    const brandColor = settings?.COMPANY_PRIMARY_COLOR || settings?.PRIMARY_COLOR || '#0f766e'; // Deep Emerald
    const companyName = (settings?.COMPANY_FULL_NAME || settings?.COMPANY_NAME || settings?.COMPANY_DISPLAY_NAME || 'CÔNG TY TNHH GIẢI PHÁP ĐÀO TẠO TRỊNH GIA').toUpperCase();
    const companyAddress = settings?.COMPANY_ADDRESS || '';
    const companyPhone = settings?.COMPANY_PHONE || '';
    const companyEmail = settings?.COMPANY_EMAIL || '';
    const companyWebsite = settings?.COMPANY_WEBSITE || '';
    const companyTax = settings?.COMPANY_TAX || settings?.COMPANY_TAX_CODE || '';

    // Filter items with serials
    const serialItems = (invoice.items || []).filter((item: any) => {
        if (!item.serials) return false;
        try {
            const parsed = typeof item.serials === 'string' ? JSON.parse(item.serials) : item.serials;
            if (Array.isArray(parsed) && parsed.length > 0) return true;
        } catch {}
        if (typeof item.serials === 'string' && item.serials.trim()) return true;
        return false;
    });

    // Helper parse serials
    const getSerialsList = (item: any): string[] => {
        if (!item.serials) return [];
        try {
            const parsed = typeof item.serials === 'string' ? JSON.parse(item.serials) : item.serials;
            if (Array.isArray(parsed)) return parsed.filter(Boolean);
            if (typeof parsed === 'string') return [parsed];
        } catch {}
        if (typeof item.serials === 'string') {
            return item.serials.split(/[\r\n,;\t]+/).map((s: string) => s.trim()).filter(Boolean);
        }
        return [];
    };

    // Calculate totals
    const totalQty = serialItems.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 1), 0);
    const totalSerialsCount = serialItems.reduce((acc: number, it: any) => acc + getSerialsList(it).length, 0);

    const docRefCode = `BBBG-${invoice.code || 'SER'}`;
    const invoiceDateStr = formatDate(invoice.issueDate || invoice.date || invoice.createdAt);
    const handoverDateStr = formatDate(new Date());

    const customerName = invoice.customer?.name || 'Khách hàng cá nhân';
    const customerPhone = invoice.customer?.phone || invoice.customer?.contacts?.[0]?.phone || '';
    const contactPerson = invoice.customer?.contactName || invoice.customer?.contacts?.[0]?.name || customerName;
    const deliveryAddress = invoice.customer?.shippingAddress || invoice.customer?.address || invoice.customer?.billingAddress || 'Theo thỏa thuận đơn hàng';
    const creatorName = invoice.creator?.name || '';

    const handleDownloadPdf = async () => {
        const element = document.getElementById('serials-handover-pdf-content');
        if (!element) {
            toast.info('Không tìm thấy nội dung tài liệu để xuất PDF.');
            return;
        }

        try {
            setIsDownloading(true);
            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;

            const opt = {
                margin: [8, 10, 8, 10] as [number, number, number, number],
                filename: `Bien_Ban_Ban_Giao_Serial_${invoice.code || 'DonHang'}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: {
                    scale: 2.5,
                    useCORS: true,
                    letterRendering: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                },
                jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await html2pdf().set(opt).from(element).save();
            toast.success('Đã tải xuống file PDF Biên bản bàn giao!');
        } catch (error) {
            console.error('Lỗi khi xuất PDF:', error);
            toast.error('Đã xảy ra lỗi khi tạo file PDF.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePrint = () => {
        const element = document.getElementById('serials-handover-pdf-content');
        if (!element) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }
        printWindow.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8" />
    <title>Biên Bản Bàn Giao Thiết Bị & Bảng Kê Serial - ${invoice.code}</title>
</head>
<body style="margin: 0; padding: 0; background: #ffffff;">
    ${element.innerHTML}
    <script>
        window.onload = function() {
            window.focus();
            window.print();
            window.onafterprint = function() {
                window.close();
            };
        };
    </script>
</body>
</html>`);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Header Toolbar */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold shrink-0">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                Biên Bản Bàn Giao Thiết Bị & Bảng Kê Serial
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-100 text-teal-800">
                                    A4 Chuẩn Quốc Tế
                                </span>
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Mẫu văn bản bàn giao trang trọng, sắc nét, bảng kê Serial/IMEI chuyên nghiệp
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                            title="Tải tệp PDF về máy tính"
                        >
                            {isDownloading ? (
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Download size={14} />
                            )}
                            <span>{isDownloading ? 'Đang tạo PDF...' : 'Tải File PDF'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-slate-300 shadow-2xs"
                            title="In trực tiếp ra máy in A4"
                        >
                            <Printer size={14} />
                            <span>In A4 Ngay</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Đóng cửa sổ"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Printable Document Preview Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/50 flex justify-center">
                    <div 
                        id="serials-handover-pdf-content"
                        className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-md w-full max-w-[760px] text-xs leading-relaxed border border-slate-200"
                    >
                        {/* Self-contained Embedded Stylesheet for Both Screen & Print */}
                        <style dangerouslySetInnerHTML={{ __html: `
                            @page {
                                size: A4 portrait;
                                margin: 8mm 12mm 8mm 12mm;
                            }
                            * {
                                box-sizing: border-box;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            #serials-handover-pdf-content, .handover-root {
                                font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                                font-size: 10.5px;
                                line-height: 1.45;
                                color: #0f172a;
                                background-color: #ffffff;
                            }
                            .ho-header-table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-bottom: 10px;
                                border-bottom: 2px solid ${brandColor};
                                padding-bottom: 6px;
                            }
                            .ho-header-table td {
                                vertical-align: top;
                                border: none;
                                padding: 0 0 6px 0;
                            }
                            .ho-company-title {
                                font-size: 13.5px;
                                font-weight: 800;
                                color: ${brandColor};
                                letter-spacing: 0.3px;
                                margin: 0 0 4px 0;
                                line-height: 1.3;
                            }
                            .ho-company-meta {
                                font-size: 10px;
                                color: #475569;
                                margin: 2px 0;
                                line-height: 1.4;
                            }
                            .ho-ref-card {
                                display: inline-block;
                                text-align: left;
                                background-color: #f8fafc;
                                border: 1px solid #cbd5e1;
                                border-radius: 6px;
                                padding: 5px 8px;
                                font-size: 9.5px;
                                line-height: 1.35;
                                white-space: nowrap;
                            }
                            .ho-doc-title-box {
                                text-align: center;
                                margin: 10px 0 12px 0;
                            }
                            .ho-doc-title {
                                font-size: 15px;
                                font-weight: 900;
                                color: ${brandColor};
                                text-transform: uppercase;
                                letter-spacing: 0.6px;
                                margin: 0 0 2px 0;
                            }
                            .ho-doc-subtitle {
                                font-size: 10px;
                                font-style: italic;
                                color: #64748b;
                                margin: 0;
                            }
                            .ho-parties-table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-bottom: 12px;
                                background-color: #f8fafc;
                                border: 1px solid #cbd5e1;
                                border-radius: 6px;
                            }
                            .ho-parties-table td {
                                vertical-align: top;
                                padding: 8px 10px;
                                font-size: 10px;
                                border: none;
                                width: 50%;
                            }
                            .ho-parties-divider {
                                border-left: 1px solid #e2e8f0 !important;
                            }
                            .ho-party-header {
                                font-size: 10px;
                                font-weight: 800;
                                color: ${brandColor};
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                                padding-bottom: 3px;
                                margin-bottom: 4px;
                                border-bottom: 1px solid #e2e8f0;
                            }
                            .ho-party-line {
                                margin: 2px 0;
                                color: #334155;
                            }
                            .ho-party-label {
                                color: #64748b;
                                display: inline-block;
                                min-width: 78px;
                            }
                            .ho-main-table {
                                width: 100%;
                                border-collapse: collapse;
                                table-layout: fixed;
                                margin-bottom: 10px;
                            }
                            .ho-main-table th {
                                background-color: ${brandColor} !important;
                                color: #ffffff !important;
                                font-size: 9.5px;
                                font-weight: 800;
                                text-transform: uppercase;
                                letter-spacing: 0.4px;
                                padding: 6px 5px;
                                border: 1px solid #0f766e;
                                text-align: center;
                                vertical-align: middle;
                            }
                            .ho-main-table td {
                                border: 1px solid #cbd5e1;
                                padding: 6px 6px;
                                font-size: 10px;
                                vertical-align: middle;
                                line-height: 1.35;
                            }
                            .ho-main-table tbody tr:nth-child(even) {
                                background-color: #fafbfd;
                            }
                            .ho-main-table tfoot td {
                                background-color: #f0fdfa !important;
                                border: 1px solid #cbd5e1;
                                font-weight: 800;
                                padding: 6px 6px;
                                font-size: 10px;
                            }
                            .ho-prod-title {
                                font-weight: 700;
                                color: #0f172a;
                                font-size: 10.5px;
                                word-break: break-word;
                            }
                            .ho-serial-tag {
                                display: inline-block !important;
                                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace !important;
                                font-size: 9px !important;
                                font-weight: 700 !important;
                                color: #0f172a !important;
                                background-color: #ffffff !important;
                                border: 1px solid #94a3b8 !important;
                                border-radius: 3px !important;
                                padding: 1px 5px !important;
                                margin: 1.5px 2px !important;
                                letter-spacing: 0.3px !important;
                                white-space: nowrap !important;
                            }
                            .ho-commitments {
                                padding: 6px 10px;
                                background-color: #fafaf9;
                                border: 1px dashed #cbd5e1;
                                border-radius: 5px;
                                font-size: 9.5px;
                                color: #334155;
                                line-height: 1.4;
                                margin-bottom: 12px;
                                page-break-inside: avoid;
                            }
                            .ho-commitments-title {
                                font-weight: 800;
                                color: ${brandColor};
                                text-transform: uppercase;
                                margin: 0 0 3px 0;
                                font-size: 9.5px;
                                letter-spacing: 0.3px;
                            }
                            .ho-signatures {
                                width: 100%;
                                border-collapse: collapse;
                                text-align: center;
                                page-break-inside: avoid;
                                break-inside: avoid;
                            }
                            .ho-signatures td {
                                width: 50%;
                                vertical-align: top;
                                padding: 0 8px;
                                border: none;
                            }
                            .ho-sig-date {
                                font-size: 9.5px;
                                font-style: italic;
                                color: #64748b;
                                margin-bottom: 2px;
                            }
                            .ho-sig-role {
                                font-size: 10px;
                                font-weight: 800;
                                color: #0f172a;
                                text-transform: uppercase;
                                letter-spacing: 0.3px;
                                margin: 0 0 2px 0;
                            }
                            .ho-sig-hint {
                                font-size: 9px;
                                font-style: italic;
                                color: #64748b;
                                margin: 0;
                            }
                            .ho-sig-blank {
                                height: 58px;
                            }
                            .ho-sig-name {
                                font-size: 10.5px;
                                font-weight: 700;
                                color: #0f172a;
                                margin: 0;
                            }
                            @media print {
                                body, html {
                                    width: 100% !important;
                                    height: auto !important;
                                    background: #ffffff !important;
                                }
                                #serials-handover-pdf-content {
                                    max-width: 100% !important;
                                    padding: 0 !important;
                                    border: none !important;
                                    box-shadow: none !important;
                                }
                            }
                        ` }} />

                        {/* Company Header */}
                        <table className="ho-header-table">
                            <tbody>
                                <tr>
                                    <td style={{ textAlign: 'left', paddingRight: '12px' }}>
                                        <div className="ho-company-title">
                                            {companyName}
                                        </div>
                                        {companyAddress && (
                                            <div className="ho-company-meta">
                                                Địa chỉ: {companyAddress}
                                            </div>
                                        )}
                                        <div className="ho-company-meta">
                                            {companyPhone && <span>Hotline: <strong>{companyPhone}</strong></span>}
                                            {companyPhone && companyEmail && <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>}
                                            {companyEmail && <span>Email: <strong>{companyEmail}</strong></span>}
                                            {companyEmail && companyWebsite && <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>}
                                            {companyWebsite && <span>Website: <strong>{companyWebsite}</strong></span>}
                                        </div>
                                        {companyTax && (
                                            <div className="ho-company-meta">
                                                Mã số thuế: <strong>{companyTax}</strong>
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right', width: '190px' }}>
                                        <div className="ho-ref-card">
                                            <div style={{ color: '#64748b', fontSize: '9px' }}>MÃ CHỨNG TỪ:</div>
                                            <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: '10.5px', marginBottom: '3px' }}>
                                                {docRefCode}
                                            </div>
                                            <div style={{ color: '#64748b', fontSize: '9px' }}>HÓA ĐƠN LIÊN KẾT:</div>
                                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                                                {invoice.code}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Title Block */}
                        <div className="ho-doc-title-box">
                            <h2 className="ho-doc-title">
                                BIÊN BẢN BÀN GIAO THIẾT BỊ & BẢNG KÊ SERIAL / IMEI
                            </h2>
                            <p className="ho-doc-subtitle">
                                (Kèm theo Hóa đơn bán hàng số: <strong>{invoice.code}</strong> • Ngày bàn giao: {handoverDateStr})
                            </p>
                        </div>

                        {/* Parties Metadata Table */}
                        <table className="ho-parties-table">
                            <tbody>
                                <tr>
                                    <td>
                                        <div className="ho-party-header">
                                            ĐƠN VỊ BÀN GIAO (BÊN BÁN)
                                        </div>
                                        <div className="ho-party-line">
                                            <span className="ho-party-label">Công ty:</span>
                                            <strong>{companyName}</strong>
                                        </div>
                                        <div className="ho-party-line">
                                            <span className="ho-party-label">Người giao:</span>
                                            <strong style={{ color: '#0f172a' }}>{creatorName || 'Bộ phận Kỹ thuật / Kho'}</strong>
                                            {companyPhone && ` (${companyPhone})`}
                                        </div>
                                        <div className="ho-party-line">
                                            <span className="ho-party-label">Chứng từ gốc:</span>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>HĐ {invoice.code}</span>
                                        </div>
                                    </td>
                                    <td className="ho-parties-divider">
                                        <div className="ho-party-header">
                                            ĐƠN VỊ TIẾP NHẬN (KHÁCH HÀNG)
                                        </div>
                                        <div className="ho-party-line">
                                            <span className="ho-party-label">Khách hàng:</span>
                                            <strong style={{ color: '#0f172a' }}>{customerName}</strong>
                                        </div>
                                        <div className="ho-party-line">
                                            <span className="ho-party-label">Người nhận:</span>
                                            <strong style={{ color: '#0f172a' }}>{contactPerson}</strong>
                                            {customerPhone && ` (${customerPhone})`}
                                        </div>
                                        <div className="ho-party-line">
                                            <span className="ho-party-label">Địa chỉ nhận:</span>
                                            <span>{deliveryAddress}</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Main Table */}
                        <table className="ho-main-table">
                            <colgroup>
                                <col style={{ width: '5%' }} />
                                <col style={{ width: '35%' }} />
                                <col style={{ width: '7%' }} />
                                <col style={{ width: '8%' }} />
                                <col style={{ width: '32%' }} />
                                <col style={{ width: '13%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Tên Thiết Bị / Hàng Hóa</th>
                                    <th>ĐVT</th>
                                    <th>Số Lượng</th>
                                    <th>Danh Sách Số Serial / IMEI Bàn Giao</th>
                                    <th>Bảo Hành</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serialItems.map((item: any, idx: number) => {
                                    const snList = getSerialsList(item);
                                    // Chỉ lấy tên sản phẩm ngắn gọn, không lấy chi tiết thông số
                                    const productName = item.productName || item.customName || item.product?.name || 'Sản phẩm';
                                    const warrantyMonths = item.product?.warrantyMonths || item.warrantyMonths || 12;

                                    return (
                                        <tr key={item.id || idx}>
                                            <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#64748b' }}>
                                                {idx + 1}
                                            </td>
                                            <td style={{ textAlign: 'left' }}>
                                                <div className="ho-prod-title">{productName}</div>
                                            </td>
                                            <td style={{ textAlign: 'center', color: '#475569' }}>
                                                {item.unit || item.product?.unit || 'Cái'}
                                            </td>
                                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                                                {Number(item.quantity) || snList.length || 1}
                                            </td>
                                            <td style={{ textAlign: 'left' }}>
                                                {snList.length > 0 ? (
                                                    <div>
                                                        {snList.map((sn: string, sIdx: number) => (
                                                            <span key={sIdx} className="ho-serial-tag">
                                                                {sn}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có mã Serial</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ fontWeight: 800, color: brandColor, display: 'block', fontSize: '9.5px' }}>
                                                    {warrantyMonths} tháng
                                                </span>
                                                <span style={{ color: '#64748b', fontSize: '8.5px', display: 'block' }}>BH điện tử</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', textTransform: 'uppercase', color: '#334155' }}>
                                        Tổng cộng thiết bị bàn giao:
                                    </td>
                                    <td style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '11px', color: brandColor }}>
                                        {totalQty}
                                    </td>
                                    <td colSpan={2} style={{ textAlign: 'left', color: brandColor }}>
                                        Tổng số: <strong>{totalSerialsCount}</strong> mã Serial / IMEI đã kiểm tra & bàn giao
                                    </td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Commitments & Technical Verification Box */}
                        <div className="ho-commitments">
                            <div className="ho-commitments-title">
                                XÁC NHẬN BÀN GIAO & CAM KẾT BẢO HÀNH:
                            </div>
                            <div style={{ margin: '1px 0' }}>1. Hai bên cùng tiến hành nghiệm thu, kiểm tra số lượng và số Serial/IMEI thực tế của toàn bộ thiết bị nêu trên.</div>
                            <div style={{ margin: '1px 0' }}>2. Bên nhận xác nhận toàn bộ thiết bị nguyên vẹn, mới 100%, đúng chủng loại, đúng mã Serial/IMEI và hoạt động bình thường theo tiêu chuẩn kỹ thuật của nhà sản xuất.</div>
                            <div style={{ margin: '1px 0' }}>3. Thiết bị được áp dụng chính sách bảo hành chính hãng / bảo hành điện tử theo quy định kể từ ngày bàn giao.</div>
                            <div style={{ margin: '1px 0' }}>4. Biên bản này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để làm căn cứ bảo hành và quyết toán.</div>
                        </div>

                        {/* Signatures Section */}
                        <table className="ho-signatures">
                            <tbody>
                                <tr>
                                    <td>
                                        <div className="ho-sig-date">
                                            Ngày ..... tháng ..... năm {new Date().getFullYear()}
                                        </div>
                                        <div className="ho-sig-role">
                                            ĐẠI DIỆN BÊN TIẾP NHẬN (KHÁCH HÀNG)
                                        </div>
                                        <div className="ho-sig-hint">
                                            (Ký, ghi rõ họ tên & đóng dấu)
                                        </div>
                                        <div className="ho-sig-blank"></div>
                                        <div className="ho-sig-name">
                                            {contactPerson}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="ho-sig-date">
                                            Ngày ..... tháng ..... năm {new Date().getFullYear()}
                                        </div>
                                        <div className="ho-sig-role">
                                            ĐẠI DIỆN BÊN BÀN GIAO (KỸ THUẬT / GIAO HÀNG)
                                        </div>
                                        <div className="ho-sig-hint">
                                            (Ký, ghi rõ họ tên)
                                        </div>
                                        <div className="ho-sig-blank"></div>
                                        <div className="ho-sig-name">
                                            {creatorName || 'Bộ phận Kỹ thuật'}
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
