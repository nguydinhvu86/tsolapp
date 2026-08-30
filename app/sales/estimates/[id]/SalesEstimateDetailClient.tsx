'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, ShoppingCart, CheckSquare, Building, FileDown, Plus, ExternalLink, Copy, User, ArrowRightLeft, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { updateSalesEstimateStatus, convertEstimateToInvoice, convertEstimateToOrder } from '../actions';
import { formatMoney, formatDate, formatTaxRate } from '@/lib/utils/formatters';
import { TaxBadge } from '@/app/components/ui/TaxRateSelect';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { Modal } from '@/app/components/ui/Modal';
import { SalesEstimateActivityLog } from '@/app/components/sales/SalesEstimateActivityLog';
import { SendEmailModal } from '@/app/components/ui/modals/SendEmailModal';
import { sendEstimateEmail, assignSalesEstimateManagers, removeSalesEstimateManager, cloneSalesEstimate } from '../actions';
import { Mail, UserCheck } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { DocumentManagersPanel } from '@/app/components/shared/DocumentManagersPanel';
import { EmailLogTable } from '@/app/components/ui/EmailLogTable';
import { DocumentSignatureBlock } from '@/app/components/ui/DocumentSignatureBlock';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
export default function SalesEstimateDetailClient({ initialData, customers, products, users, emailTemplates, settings }: any) {
    const router = useRouter();
    const { data: session } = useSession();
    const [estimate, setEstimate] = useState(initialData);
    const [activeTab, setActiveTab] = useState<'items' | 'emailLogs' | 'managers'>('items');
    const [copied, setCopied] = useState(false);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

    const [isConvertOrderModalOpen, setIsConvertOrderModalOpen] = useState(false);
    const [isConvertingOrder, setIsConvertingOrder] = useState(false);

    // Email Modal State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // Generic Action Modal State
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, title: string, message: React.ReactNode, action: () => Promise<void> } | null>(null);
    const [isActioning, setIsActioning] = useState(false);

    useEffect(() => {
        setEstimate(initialData);
    }, [initialData]);

    const handleCopyPublicLink = () => {
        const publicUrl = `${window.location.origin}/public/sales/estimate/${estimate.id}`;
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('BaoGia');

        // Common layout
        ws.columns = [
            { key: 'col1', width: 5 },
            { key: 'col2', width: 40 },
            { key: 'col3', width: 15 },
            { key: 'col4', width: 10 },
            { key: 'col5', width: 10 },
            { key: 'col6', width: 15 },
            { key: 'col7', width: 15 },
            { key: 'col8', width: 15 },
            { key: 'col9', width: 15 },
            { key: 'col10', width: 20 }
        ];

        let headers = ['STT', 'Sản Phẩm / Dịch Vụ', 'SL', 'ĐVT', 'Đơn Giá', 'Thuế (%)', 'Thành Tiền'];
        let colCount = 7;
        
        if (estimate.templateType === 'PROJECT_BREAKDOWN') {
            headers = ['STT', 'Sản Phẩm / Dịch Vụ', 'Hãng SX', 'Bảo Hành', 'SL', 'ĐVT', 'Đ.Giá Vật Tư', 'Đ.Giá N.Công', 'Tiền Vật Tư', 'Tiền N.Công'];
            colCount = 10;
        } else if (estimate.templateType === 'WITH_IMAGES') {
            headers = ['STT', 'Sản Phẩm / Dịch Vụ', 'Xuất Xứ', 'Bảo Hành', 'SL', 'ĐVT', 'Đơn Giá', 'Thuế (%)', 'Thành Tiền'];
            colCount = 9;
        }

        // Header Rows - Company Info
        ws.mergeCells(1, 1, 1, colCount);
        ws.getCell('A1').value = (settings?.COMPANY_FULL_NAME || settings?.COMPANY_NAME || 'TÊN CÔNG TY').toUpperCase();
        ws.getCell('A1').font = { bold: true, size: 12 };
        
        ws.mergeCells(2, 1, 2, colCount);
        ws.getCell('A2').value = `Địa chỉ: ${settings?.COMPANY_ADDRESS || ''}`;
        
        ws.mergeCells(3, 1, 3, colCount);
        ws.getCell('A3').value = `Điện thoại: ${settings?.COMPANY_PHONE || ''} - Email: ${settings?.COMPANY_EMAIL || ''}`;
        
        ws.mergeCells(4, 1, 4, colCount);
        ws.getCell('A4').value = `Mã số thuế: ${settings?.COMPANY_TAX || ''}`;

        ws.addRow([]);

        // Main Title
        const titleRowNumber = 6;
        ws.mergeCells(titleRowNumber, 1, titleRowNumber, colCount);
        ws.getCell(`A${titleRowNumber}`).value = 'BẢNG BÁO GIÁ';
        ws.getCell(`A${titleRowNumber}`).font = { size: 16, bold: true, name: 'Times New Roman' };
        ws.getCell(`A${titleRowNumber}`).alignment = { vertical: 'middle', horizontal: 'center' };
        ws.getRow(titleRowNumber).height = 30;

        const codeRow = ws.addRow([`Số: ${estimate.code}   |   Ngày: ${formatDate(estimate.date)}`]);
        ws.mergeCells(codeRow.number, 1, codeRow.number, colCount);
        codeRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        codeRow.getCell(1).font = { italic: true };

        ws.addRow([]);
        
        const infoTitleRow = ws.addRow(['THÔNG TIN KHÁCH HÀNG', '', '', `ĐIỀU KIỆN BÁO GIÁ`]);
        ws.mergeCells(infoTitleRow.number, 1, infoTitleRow.number, 3);
        infoTitleRow.getCell(1).font = { bold: true };
        infoTitleRow.getCell(4).font = { bold: true };
        
        const infoRow1 = ws.addRow([`Khách hàng: ${estimate.customer?.name || ''}`, '', '', `Hiệu lực đến: ${estimate.validUntil ? formatDate(estimate.validUntil) : '---'}`]);
        ws.mergeCells(infoRow1.number, 1, infoRow1.number, 3);
        
        const infoRow2 = ws.addRow([`Người liên hệ: ${estimate.customer?.phone || ''}`, '', '', `Người lập: ${estimate.creator?.name || ''}`]);
        ws.mergeCells(infoRow2.number, 1, infoRow2.number, 3);
        
        ws.addRow([]);

        const headerRow = ws.addRow(headers);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF05A613' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });

        let currentIndex = 1;
        estimate.items?.forEach((item: any) => {
            const row: any[] = [];
            row.push(item.isSubItem ? '-' : currentIndex++);
            
            let name = item.customName || item.product?.name || '';
            if (item.description) name += `\r\n${item.description}`;
            if (item.product?.sku) name += `\r\nSKU: ${item.product.sku}`;
            if (estimate.templateType === 'WITH_IMAGES' && item.manufacture) name += `\r\nHãng: ${item.manufacture}`;

            row.push(item.isSubItem ? `  ↳ ${name}` : name);
            
            if (estimate.templateType === 'PROJECT_BREAKDOWN') {
                row.push(item.manufacture || '');
                row.push(item.warranty || '');
                row.push(item.quantity);
                row.push(item.unit || item.product?.unit || '');
                row.push(item.unitPrice);
                row.push(item.laborPrice || 0);
                row.push(item.quantity * item.unitPrice);
                row.push(item.quantity * (item.laborPrice || 0));
            } else if (estimate.templateType === 'WITH_IMAGES') {
                row.push(item.origin || '');
                row.push(item.warranty || '');
                row.push(item.quantity);
                row.push(item.unit || item.product?.unit || '');
                row.push(item.unitPrice);
                row.push(formatTaxRate(item.taxRate));
                row.push(item.totalPrice);
            } else {
                row.push(item.quantity);
                row.push(item.unit || item.product?.unit || '');
                row.push(item.unitPrice);
                row.push(formatTaxRate(item.taxRate));
                row.push(item.totalPrice);
            }
            
            const addedRow = ws.addRow(row);
            addedRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= colCount) {
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    
                    const headerValue = headers[colNumber - 1];
                    const isCenterCol = ['STT', 'SL', 'Thuế (%)', 'ĐVT', 'Xuất Xứ', 'Hãng SX', 'Bảo Hành'].includes(headerValue);

                    if (isCenterCol) {
                        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    } else {
                        cell.alignment = { vertical: 'middle', wrapText: true };
                    }
                    
                    if (typeof cell.value === 'number' && colNumber > 1) {
                         cell.numFmt = '#,##0';
                    }
                }
            });
        });

        ws.addRow([]);
        
        const addSummary = (label: string, val: any, bold: boolean = false) => {
            const rowData = Array(colCount).fill('');
            rowData[0] = label;
            rowData[colCount - 1] = val;
            
            const r = ws.addRow(rowData);
            ws.mergeCells(r.number, 1, r.number, colCount - 1);
            
            const labelCell = r.getCell(1);
            labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
            
            const valCell = r.getCell(colCount);
            valCell.alignment = { horizontal: 'right', vertical: 'middle' };
            valCell.numFmt = '#,##0';
            
            if (bold) {
                r.font = { bold: true, size: 12 };
            }
            
            for (let i = 1; i <= colCount; i++) {
                r.getCell(i).border = { 
                    top: {style:'thin'}, 
                    left: {style:'thin'}, 
                    bottom: {style:'thin'}, 
                    right: {style:'thin'} 
                };
            }
            return r;
        };

        if (estimate.templateType === 'PROJECT_BREAKDOWN') {
            let sumVatTu = 0;
            let sumNhanCong = 0;
            estimate.items?.forEach((i: any) => { sumVatTu += i.quantity * i.unitPrice; sumNhanCong += i.quantity * (i.laborPrice || 0); });
            
            addSummary('Tổng Cộng Vật Tư:', sumVatTu);
            addSummary('Tổng Cộng Nhân Công:', sumNhanCong);
            addSummary('Tổng Cộng Chưa Thuế:', sumVatTu + sumNhanCong);
            addSummary('VAT Tax:', estimate.taxAmount);
            const lastRow = addSummary('TỔNG CỘNG (GỒM VAT):', estimate.totalAmount, true);
            lastRow.getCell(colCount).font = { bold: true, color: { argb: 'FF05A613' }, size: 12 };
        } else if (estimate.templateType === 'WITH_IMAGES') {
            addSummary('Tổng Tiền Trước Thuế:', estimate.subTotal);
            addSummary('Tổng Tiền Thuế:', estimate.taxAmount);
            const lastRow = addSummary('TỔNG CỘNG:', estimate.totalAmount, true);
            lastRow.getCell(colCount).font = { bold: true, color: { argb: 'FF10B981' }, size: 12 };
        } else {
            addSummary('Tổng Tiền Trước Thuế:', estimate.subTotal);
            addSummary('Tổng Tiền Thuế:', estimate.taxAmount);
            const lastRow = addSummary('TỔNG CỘNG:', estimate.totalAmount, true);
            lastRow.getCell(colCount).font = { bold: true, color: { argb: 'FF10B981' }, size: 12 };
        }

        ws.addRow([]);
        ws.addRow([]);

        // Payment Info
        ws.addRow(['THÔNG TIN THANH TOÁN / CHUYỂN KHOẢN:']);
        ws.getCell(`A${ws.rowCount}`).font = { bold: true, underline: true };
        
        if (settings?.BANK_INFO_CONTENT) {
            const contentLines = settings.BANK_INFO_CONTENT.split('\n');
            contentLines.forEach((line: string) => {
                if (line.trim()) {
                    ws.addRow([line.trim()]);
                }
            });
        } else {
            ws.addRow(['- Vui lòng chuyển khoản theo thông tin đính kèm hoặc liên hệ kế toán để lấy thông tin chi tiết.']);
        }

        ws.addRow([]);
        ws.addRow([]);

        // Signatures
        const sigRow = ws.addRow([]);
        const mid = Math.floor(colCount / 2);
        
        ws.mergeCells(sigRow.number, 1, sigRow.number, mid);
        const custCell = sigRow.getCell(1);
        custCell.value = 'XÁC NHẬN CỦA KHÁCH HÀNG';
        custCell.font = { bold: true };
        custCell.alignment = { horizontal: 'center' };
        
        ws.mergeCells(sigRow.number, mid + 1, sigRow.number, colCount);
        const compCell = sigRow.getCell(mid + 1);
        compCell.value = 'ĐẠI DIỆN CÔNG TY';
        compCell.font = { bold: true };
        compCell.alignment = { horizontal: 'center' };
        
        const subSigRow = ws.addRow([]);
        ws.mergeCells(subSigRow.number, 1, subSigRow.number, mid);
        const subCustCell = subSigRow.getCell(1);
        subCustCell.value = '(Ký, ghi rõ họ tên)';
        subCustCell.font = { italic: true };
        subCustCell.alignment = { horizontal: 'center' };
        
        ws.mergeCells(subSigRow.number, mid + 1, subSigRow.number, colCount);
        const subCompCell = subSigRow.getCell(mid + 1);
        subCompCell.value = '(Ký, ghi rõ họ tên)';
        subCompCell.font = { italic: true };
        subCompCell.alignment = { horizontal: 'center' };
        
        ws.addRow([]);
        ws.addRow([]);
        ws.addRow([]);
        ws.addRow([]);

        const buffer = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Bao_Gia_${estimate.code}.xlsx`);
    };


    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">Bản Dự Thảo</span>;
            case 'SENT': return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Đã Gửi KH</span>;
            case 'ACCEPTED': return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Khách Chốt</span>;
            case 'ORDERED': return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">Đã Lên Đơn</span>;
            case 'INVOICED': return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Đã Lên Hóa Đơn</span>;
            case 'REJECTED': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Từ Chối</span>;
            default: return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">{status}</span>;
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        setActionModal({
            isOpen: true,
            title: 'Khẳng định thay đổi',
            message: `Xác nhận đổi trạng thái báo giá thành: ${newStatus}?`,
            action: async () => {
                const res = await updateSalesEstimateStatus(estimate.id, newStatus);
                if (res.success) {
                    setEstimate({ ...estimate, status: newStatus });
                    router.refresh();
                } else {
                    alert(res.error);
                }
            }
        });
    };

    const handleClone = async () => {
        setActionModal({
            isOpen: true,
            title: 'Khẳng định sao chép',
            message: `Hệ thống sẽ tạo ra một Báo Giá Nháp mới với toàn bộ dữ liệu từ báo giá này. Tiếp tục?`,
            action: async () => {
                const res = await cloneSalesEstimate(estimate.id);
                if (res.success && res.data) {
                    router.push('/sales/estimates/' + res.data.id);
                } else {
                    alert(res.error || 'Đã có lỗi xảy ra');
                }
            }
        });
    };

    const handleConfirmConvert = async () => {
        setIsConverting(true);
        const res = await convertEstimateToInvoice(estimate.id);
        if (res.success) {
            alert("Đã tạo Hóa Đơn thành công, đang chuyển hướng...");
            router.push('/sales/invoices');
        } else {
            alert(res.error);
            setIsConverting(false);
            setIsConvertModalOpen(false);
        }
    };

    const handleConfirmConvertOrder = async () => {
        setIsConvertingOrder(true);
        const res = await convertEstimateToOrder(estimate.id);
        if (res.success) {
            alert("Đã tạo Đơn Đặt Hàng thành công, đang chuyển hướng...");
            router.push('/sales/orders');
        } else {
            alert(res.error);
            setIsConvertingOrder(false);
            setIsConvertOrderModalOpen(false);
        }
    };

    const tabs = [
        { id: 'items', label: 'Chi tiết sản phẩm', icon: <ShoppingCart size={18} />, count: estimate.items?.length || 0 }
    ] as const;

    return (
        <div style={{ padding: '0', maxWidth: '100%', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #e2e8f0',
                            backgroundColor: 'white', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = '#64748b'; }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
                                Báo Giá {estimate.code}
                            </h1>
                            {getStatusBadge(estimate.status)}
                        </div>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Quản lý chi tiết báo giá và các công việc liên quan.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button
                        onClick={handleCopyPublicLink}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <Copy size={16} /> {copied ? 'Đã sao chép' : 'Copy Link Gửi KH'}
                    </button>
                    <Link
                        href={`/print/sales/estimate/${estimate.id}`}
                        target="_blank"
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#f1f5f9', color: '#3b82f6', border: '1px solid #bfdbfe', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <ExternalLink size={16} /> Xem Bản In
                    </Link>
                    <button
                        onClick={handleExportExcel}
                        className="btn btn-secondary hover:bg-emerald-50 transition-colors"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <FileDown size={16} /> Xuất Excel
                    </button>
                    <button
                        onClick={() => router.push(`/sales/estimates?edit=${estimate.id}`)}
                        className="btn btn-secondary hover:bg-slate-100 transition-colors"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <Edit2 size={16} /> Chỉnh Sửa
                    </button>
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <Mail size={16} /> Gửi Email
                    </button>
                    {(estimate.status === 'EXPIRED' || estimate.status === 'REJECTED') && (
                        <button
                            onClick={handleClone}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                        >
                            <Copy size={16} /> Tạo Bản Sao Mới
                        </button>
                    )}
                    {(estimate.status === 'DRAFT' || estimate.status === 'SENT' || estimate.status === 'ACCEPTED') && (
                        <>
                            <button
                                onClick={() => setIsConvertOrderModalOpen(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                <ArrowRightLeft size={16} /> Lên Đơn Hàng
                            </button>
                            <button
                                onClick={() => setIsConvertModalOpen(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                <ArrowRightLeft size={16} /> Lên Hóa Đơn
                            </button>
                        </>
                    )}

                    {estimate.status === 'DRAFT' && (
                        <button
                            onClick={() => handleStatusChange('SENT')}
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                        >
                            Ghi Nhận Đã Gửi Khách
                        </button>
                    )}
                    {estimate.status === 'SENT' && (
                        <>
                            <button
                                onClick={() => handleStatusChange('ACCEPTED')}
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                Khách Chốt
                            </button>
                            <button
                                onClick={() => handleStatusChange('REJECTED')}
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                Từ Chối
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mt-6">
                {/* Left Column: Details & Tabs */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Summary Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#6366f1" /> Thông tin chung
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>KHÁCH HÀNG</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building size={16} color="#64748b" />
                                    <Link href={`/customers/${estimate.customerId}`} style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none', fontSize: '1rem' }} className="hover:underline">
                                        {estimate.customer?.name}
                                    </Link>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>NGÀY BÁO GIÁ</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                                    <Calendar size={16} color="#64748b" />
                                    {formatDate(estimate.date)}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>NHÂN VIÊN LẬP</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                                    <User size={16} color="#64748b" />
                                    {estimate.creator?.name || '---'}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>NGƯỜI BÁO GIÁ</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                                    <User size={16} color="#10b981" />
                                    {estimate.salesperson?.name || estimate.creator?.name || '---'}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>TỔNG GIÁ TRỊ</p>
                                <p style={{ margin: 0, fontWeight: 700, color: '#10b981', fontSize: '1.125rem' }}>{formatMoney(estimate.totalAmount)}</p>
                            </div>
                            {estimate.notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>GHI CHÚ</p>
                                    <p style={{ margin: 0, color: '#475569', fontSize: '0.875rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>{estimate.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs area */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                        <div className="flex overflow-x-auto whitespace-nowrap border-b border-gray-200 px-2 pb-1 sm:pb-0 scrollbar-hide">
                            <button
                                onClick={() => setActiveTab('items')}
                                style={{
                                    flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    backgroundColor: 'transparent', border: 'none', borderBottom: activeTab === 'items' ? '2px solid #6366f1' : '2px solid transparent',
                                    color: activeTab === 'items' ? '#4f46e5' : '#64748b', fontWeight: activeTab === 'items' ? 600 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <ShoppingCart size={16} /> Chi Tiết
                                <span style={{ backgroundColor: activeTab === 'items' ? '#e0e7ff' : '#f1f5f9', color: activeTab === 'items' ? '#4f46e5' : '#64748b', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {estimate.items?.length || 0}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('emailLogs')}
                                style={{
                                    flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    backgroundColor: 'transparent', border: 'none', borderBottom: activeTab === 'emailLogs' ? '2px solid #6366f1' : '2px solid transparent',
                                    color: activeTab === 'emailLogs' ? '#4f46e5' : '#64748b', fontWeight: activeTab === 'emailLogs' ? 600 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <Mail size={16} /> Lịch Sử Email
                                <span style={{ backgroundColor: activeTab === 'emailLogs' ? '#e0e7ff' : '#f1f5f9', color: activeTab === 'emailLogs' ? '#4f46e5' : '#64748b', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {estimate.emailLogs?.length || 0}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('managers')}
                                style={{
                                    flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    backgroundColor: 'transparent', border: 'none', borderBottom: activeTab === 'managers' ? '2px solid #6366f1' : '2px solid transparent',
                                    color: activeTab === 'managers' ? '#4f46e5' : '#64748b', fontWeight: activeTab === 'managers' ? 600 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <UserCheck size={16} /> Người Phụ Trách
                                <span style={{ backgroundColor: activeTab === 'managers' ? '#e0e7ff' : '#f1f5f9', color: activeTab === 'managers' ? '#4f46e5' : '#64748b', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {estimate.managers?.length || 0}
                                </span>
                            </button>
                        </div>

                        <div className="p-4 sm:p-6">
                            {activeTab === 'items' && (
                                <div className="overflow-x-auto w-full">
                                    {estimate.templateType === 'WITH_IMAGES' ? (
                                        <table className="w-full min-w-[1000px] text-left text-sm border-collapse">
                                            <thead>
                                                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>S.Ảnh</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Sản Phẩm</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Xuất Xứ</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Bảo Hành</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Số Lượng</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Đơn Giá</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Thuế</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Thành Tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {estimate.items?.length === 0 ? (
                                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Chưa có sản phẩm nào.</td></tr>
                                                ) : (
                                                    estimate.items?.map((item: any) => (
                                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: item.isSubItem ? '#f8fafc' : 'transparent' }}>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                {item.imageUrl ? <img src={item.imageUrl} alt="img" style={{ maxWidth: '40px', maxHeight: '40px', objectFit: 'contain' }} /> : '-'}
                                                            </td>
                                                            <td style={{ padding: '1rem', paddingLeft: item.isSubItem ? '3rem' : '1rem', fontWeight: 500, color: item.isSubItem ? '#64748b' : '#1e293b' }}>
                                                                <div className="flex items-center gap-2">
                                                                    {item.isSubItem && <span className="text-gray-400">↳</span>}
                                                                    <span>{item.customName || item.product?.name || 'Sản phẩm tự do'}</span>
                                                                </div>
                                                                {item.product?.sku && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>SKU: {item.product.sku}</div>}
                                                                {item.manufacture && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Hãng: {item.manufacture}</div>}
                                                                {item.description && <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem', whiteSpace: 'pre-wrap', fontWeight: 400 }}>{item.description}</div>}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>{item.origin || '-'}</td>
                                                            <td style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>{item.warranty || '-'}</td>
                                                            <td style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>{item.quantity} {item.unit || item.product?.unit || ''}</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', color: '#475569' }}>{formatMoney(item.unitPrice)}</td>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                <TaxBadge rate={item.taxRate} />
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{formatMoney(item.totalPrice)}</td>
                                                        </tr>
                                                    ))
                                                )}
                                                {estimate.items?.length > 0 && (
                                                    <>
                                                        <tr style={{ backgroundColor: '#f8fafc' }}>
                                                            <td colSpan={7} style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>Tổng tiền trước thuế:</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500, color: '#1e293b' }}>{formatMoney(estimate.subTotal || 0)}</td>
                                                        </tr>
                                                        <tr style={{ backgroundColor: '#f8fafc' }}>
                                                            <td colSpan={7} style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>Tổng tiền thuế:</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500, color: '#1e293b' }}>{formatMoney(estimate.taxAmount || 0)}</td>
                                                        </tr>
                                                        <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                            <td colSpan={7} style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>Tổng Cộng:</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>{formatMoney(estimate.totalAmount)}</td>
                                                        </tr>
                                                    </>
                                                )}
                                            </tbody>
                                        </table>
                                    ) : estimate.templateType === 'PROJECT_BREAKDOWN' ? (() => {
                                        let sumVatTu = 0;
                                        let sumNhanCong = 0;
                                        estimate.items?.forEach((item: any) => {
                                            sumVatTu += item.quantity * item.unitPrice;
                                            sumNhanCong += item.quantity * (item.laborPrice || 0);
                                        });

                                        return (
                                            <table className="w-full min-w-[1100px] text-left text-sm border-collapse">
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>S.Ảnh</th>
                                                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Sản Phẩm</th>
                                                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Hãng SX</th>
                                                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Bảo Hành</th>
                                                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>SL</th>
                                                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Đ.Giá V.Tư</th>
                                                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Đ.Giá N.Công</th>
                                                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Tiền V.Tư</th>
                                                        <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Tiền N.Công</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {estimate.items?.length === 0 ? (
                                                        <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Chưa có sản phẩm nào.</td></tr>
                                                    ) : (
                                                        estimate.items?.map((item: any) => {
                                                            const tienVatTu = item.quantity * item.unitPrice;
                                                            const tienNhanCong = item.quantity * (item.laborPrice || 0);
                                                            return (
                                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: item.isSubItem ? '#f8fafc' : 'transparent' }}>
                                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                                                        {item.imageUrl ? <img src={item.imageUrl} alt="img" style={{ maxWidth: '40px', maxHeight: '40px', objectFit: 'contain' }} /> : '-'}
                                                                    </td>
                                                                    <td style={{ padding: '1rem 0.5rem', paddingLeft: item.isSubItem ? '3rem' : '0.5rem', fontWeight: 500, color: item.isSubItem ? '#64748b' : '#1e293b' }}>
                                                                        <div className="flex items-center gap-2">
                                                                            {item.isSubItem && <span className="text-gray-400">↳</span>}
                                                                            <span>{item.customName || item.product?.name || 'Sản phẩm tự do'}</span>
                                                                        </div>
                                                                        {item.description && <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem', whiteSpace: 'pre-wrap', fontWeight: 400 }}>{item.description}</div>}
                                                                    </td>
                                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#475569' }}>{item.manufacture || '-'}</td>
                                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#475569' }}>{item.warranty || '-'}</td>
                                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#475569' }}>{item.quantity} {item.unit || item.product?.unit || ''}</td>
                                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#475569' }}>{formatMoney(item.unitPrice)}</td>
                                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#475569' }}>{formatMoney(item.laborPrice || 0)}</td>
                                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 500, color: '#475569' }}>{formatMoney(tienVatTu)}</td>
                                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 500, color: '#475569' }}>{formatMoney(tienNhanCong)}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                    {estimate.items?.length > 0 && (
                                                        <>
                                                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                                                <td colSpan={8} style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#64748b' }}>Tổng Cộng Vật Tư:</td>
                                                                <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 500, color: '#1e293b' }}>{formatMoney(sumVatTu)}</td>
                                                            </tr>
                                                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                                                <td colSpan={8} style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#64748b' }}>Tổng Cộng Nhân Công:</td>
                                                                <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 500, color: '#1e293b' }}>{formatMoney(sumNhanCong)}</td>
                                                            </tr>
                                                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                                                <td colSpan={8} style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#64748b' }}>VAT Tax:</td>
                                                                <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 500, color: '#1e293b' }}>{formatMoney(estimate.taxAmount || 0)}</td>
                                                            </tr>
                                                            <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                                <td colSpan={8} style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>Tổng Cộng (Gồm VAT):</td>
                                                                <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>{formatMoney(estimate.totalAmount)}</td>
                                                            </tr>
                                                        </>
                                                    )}
                                                </tbody>
                                            </table>
                                        );
                                    })() : (
                                        <table className="w-full min-w-[700px] text-left text-sm border-collapse">
                                            <thead>
                                                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Sản Phẩm</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Số Lượng</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Đơn Giá</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Thuế</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Thành Tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {estimate.items?.length === 0 ? (
                                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Chưa có sản phẩm nào.</td></tr>
                                                ) : (
                                                    estimate.items?.map((item: any) => (
                                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: item.isSubItem ? '#f8fafc' : 'transparent' }}>
                                                            <td style={{ padding: '1rem', paddingLeft: item.isSubItem ? '3rem' : '1rem', fontWeight: 500, color: item.isSubItem ? '#64748b' : '#1e293b' }}>
                                                                <div className="flex items-center gap-2">
                                                                    {item.isSubItem && <span className="text-gray-400">↳</span>}
                                                                    <span>{item.customName || item.product?.name || 'Sản phẩm tự do'}</span>
                                                                </div>
                                                                {item.product?.sku && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>SKU: {item.product.sku}</div>}
                                                                {item.description && <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem', whiteSpace: 'pre-wrap', fontWeight: 400 }}>{item.description}</div>}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>{item.quantity} {item.unit || item.product?.unit || ''}</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', color: '#475569' }}>{formatMoney(item.unitPrice)}</td>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                <TaxBadge rate={item.taxRate} />
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{formatMoney(item.totalPrice)}</td>
                                                        </tr>
                                                    ))
                                                )}
                                                {estimate.items?.length > 0 && (
                                                    <>
                                                        <tr style={{ backgroundColor: '#f8fafc' }}>
                                                            <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>Tổng tiền trước thuế:</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500, color: '#1e293b' }}>{formatMoney(estimate.subTotal || 0)}</td>
                                                        </tr>
                                                        <tr style={{ backgroundColor: '#f8fafc' }}>
                                                            <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>Tổng tiền thuế:</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500, color: '#1e293b' }}>{formatMoney(estimate.taxAmount || 0)}</td>
                                                        </tr>
                                                        <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                            <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>Tổng Cộng:</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>{formatMoney(estimate.totalAmount)}</td>
                                                        </tr>
                                                    </>
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {activeTab === 'emailLogs' && (
                                <EmailLogTable emailLogs={estimate.emailLogs || []} />
                            )}

                            {activeTab === 'managers' && (
                                <DocumentManagersPanel
                                    documentId={estimate.id}
                                    managers={estimate.managers || []}
                                    users={users || []}
                                    currentUserRole={session?.user?.role || 'USER'}
                                    onAssign={assignSalesEstimateManagers}
                                    onRemove={removeSalesEstimateManager}
                                />
                            )}

                        </div>
                    </div>
                    {/* Bank Info Card */}
                    {settings?.BANK_INFO_ENABLED === 'true' && settings?.BANK_INFO_CONTENT && (
                        <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building size={20} color="#3b82f6" /> Thông tin thanh toán (Chuyển khoản)
                                </h2>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(settings.BANK_INFO_CONTENT || '');
                                        alert('Đã copy thông tin thanh toán');
                                    }}
                                    className="btn btn-secondary hover:bg-slate-200"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 500, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <Copy size={14} /> Copy thông tin
                                </button>
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: '0.9rem', lineHeight: 1.6, padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', borderLeft: '4px solid #3b82f6' }}>
                                {settings.BANK_INFO_CONTENT}
                            </div>
                        </div>
                    )}

                    {/* Signatures Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#10b981" /> Chữ ký xác nhận
                        </h2>
                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'nowrap', gap: '2rem' }}>
                            <DocumentSignatureBlock 
                                entityType="SALES_ESTIMATE" 
                                entityId={estimate.id} 
                                role="CUSTOMER" 
                                title="ĐẠI DIỆN KHÁCH HÀNG" 
                                subtitle="(Khách hàng ký qua link public)" 
                                canSign={false} 
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
                                subtitle="(Ký xác nhận nội bộ)" 
                                canSign={true} 
                                initialSignature={estimate.companySignature} 
                                initialSignedAt={estimate.companySignedAt} 
                                signerName={estimate.creator?.name} 
                                companySignerId={session?.user?.id}
                            />
                        </div>
                    </div>
                </div>

                {/* Column 2: TaskPanel and Timeline */}
                <div className="lg:col-span-1 flex flex-col gap-6">

                    <TaskPanel
                        initialTasks={estimate.tasks || []}
                        users={users || []}
                        entityType="SALES_ESTIMATE"
                        entityId={estimate.id}
                    />

                    <SalesEstimateActivityLog logs={estimate.activityLogs || []} />

                </div>
            </div>
            {/* Convert Modal */}
            <Modal isOpen={isConvertModalOpen} onClose={() => !isConverting && setIsConvertModalOpen(false)} title="Xác nhận Lên Hóa Đơn">
                <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <p className="text-gray-700 text-[15px] mb-6 leading-relaxed">
                        Bạn có chắc chắn muốn chuyển dữ liệu từ Báo Giá này thành <strong>Hóa Đơn</strong> không? Các thông tin chi tiết sẽ được tự động sao chép sang Hóa Đơn mới.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', padding: '1rem', borderRadius: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '9999px', color: '#3b82f6', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <ArrowRightLeft size={20} />
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: 1.625, marginTop: '0.125rem' }}>
                            <strong style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Cập nhật tự động</strong>
                            Báo giá này sẽ tự động chuyển thành trạng thái <strong style={{ backgroundColor: '#dbeafe', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', color: '#1d4ed8', fontWeight: 700 }}>"Đã Chốt"</strong> sau quá trình khởi tạo thành công.
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6' }}>
                        <button
                            onClick={() => setIsConvertModalOpen(false)}
                            className="btn btn-secondary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px' }}
                            disabled={isConverting}
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            onClick={handleConfirmConvert}
                            className="btn btn-primary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px', minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            disabled={isConverting}
                        >
                            {isConverting ? (
                                <>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>Xác Nhận Lên Hóa Đơn</>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Convert to Order Modal */}
            <Modal isOpen={isConvertOrderModalOpen} onClose={() => !isConvertingOrder && setIsConvertOrderModalOpen(false)} title="Xác nhận Lên Đơn Đặt Hàng">
                <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <p className="text-gray-700 text-[15px] mb-6 leading-relaxed">
                        Bạn có chắc chắn muốn chuyển dữ liệu từ Báo Giá này thành <strong>Đơn Đặt Hàng</strong> không? Các thông tin chi tiết sẽ được tự động sao chép sang Đơn Đặt Hàng mới.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', padding: '1rem', borderRadius: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '9999px', color: '#3b82f6', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <ArrowRightLeft size={20} />
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: 1.625, marginTop: '0.125rem' }}>
                            <strong style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Cập nhật tự động</strong>
                            Báo giá này sẽ tự động chuyển thành trạng thái <strong style={{ backgroundColor: '#e0e7ff', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', color: '#4338ca', fontWeight: 700 }}>"Đã Lên Đơn"</strong> sau quá trình khởi tạo thành công.
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6' }}>
                        <button
                            onClick={() => setIsConvertOrderModalOpen(false)}
                            className="btn btn-secondary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px' }}
                            disabled={isConvertingOrder}
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            onClick={handleConfirmConvertOrder}
                            className="btn btn-primary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px', minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            disabled={isConvertingOrder}
                        >
                            {isConvertingOrder ? (
                                <>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>Xác Nhận Lên Đơn Hàng</>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Generic Action Modal */}
            <Modal isOpen={!!actionModal?.isOpen} onClose={() => !isActioning && setActionModal(null)} title={actionModal?.title || 'Xác nhận'}>
                <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <div className="text-gray-700 text-[15px] mb-6 leading-relaxed">
                        {actionModal?.message}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6' }}>
                        <button
                            onClick={() => setActionModal(null)}
                            className="btn btn-secondary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px' }}
                            disabled={isActioning}
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            onClick={async () => {
                                if (!actionModal) return;
                                setIsActioning(true);
                                try {
                                    await actionModal.action();
                                    setActionModal(null);
                                } finally {
                                    setIsActioning(false);
                                }
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            disabled={isActioning}
                        >
                            {isActioning ? (
                                <>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>Xác Nhận</>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                moduleType="ESTIMATE"
                defaultToEmail={estimate.customer?.email || ''}
                variablesData={{
                    customerName: estimate.customer?.name || '',
                    customerEmail: estimate.customer?.email || '',
                    senderName: estimate.salesperson?.name || estimate.creator?.name || '',
                    today: new Date().toLocaleDateString('vi-VN'),
                    code: estimate.code,
                    totalAmount: formatMoney(estimate.totalAmount),
                    link: `${window.location.origin}/public/sales/estimate/${estimate.id}`
                }}
                templates={emailTemplates || []}
                printUrl={`${window.location.origin}/public/sales/estimate/${estimate.id}`}
                documentName={`BaoGia_${estimate.code}.pdf`}
                onSend={async (data) => {
                    const res = await sendEstimateEmail(estimate.id, data.to, data.subject, data.htmlBody, data.attachmentName, data.attachmentBase64);
                    if (res.success) {
                        alert('Đã gửi email thành công!');
                        router.refresh();
                    } else {
                        throw new Error(res.error);
                    }
                }}
            />
        </div>
    );
}
