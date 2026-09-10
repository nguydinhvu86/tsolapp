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
import { StatusBadge } from '@/app/components/ui/StatusBadge';
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
        wb.creator = 'TSOL ERP';
        wb.lastModifiedBy = 'TSOL ERP';
        wb.created = new Date();
        wb.modified = new Date();

        const ws = wb.addWorksheet('BaoGia', {
            views: [{ showGridLines: true }],
            pageSetup: {
                paperSize: 9, // A4
                orientation: estimate.templateType === 'PROJECT_BREAKDOWN' ? 'landscape' : 'portrait',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            }
        });

        // Determine columns, headers and widths
        let headers: string[] = [];
        let colCount = 7;
        let columnsConfig: any[] = [];

        if (estimate.templateType === 'PROJECT_BREAKDOWN') {
            headers = ['STT', 'Sản Phẩm / Dịch Vụ', 'Hãng SX', 'Bảo Hành', 'SL', 'ĐVT', 'Đ.Giá Vật Tư', 'Đ.Giá N.Công', 'Tiền Vật Tư', 'Tiền N.Công'];
            colCount = 10;
            columnsConfig = [
                { key: 'col1', width: 6 },
                { key: 'col2', width: 38 },
                { key: 'col3', width: 14 },
                { key: 'col4', width: 12 },
                { key: 'col5', width: 10 },
                { key: 'col6', width: 10 },
                { key: 'col7', width: 16 },
                { key: 'col8', width: 16 },
                { key: 'col9', width: 18 },
                { key: 'col10', width: 18 }
            ];
        } else if (estimate.templateType === 'WITH_IMAGES') {
            headers = ['STT', 'Sản Phẩm / Dịch Vụ', 'Xuất Xứ', 'Bảo Hành', 'SL', 'ĐVT', 'Đơn Giá (VNĐ)', 'Thuế', 'Thành Tiền (VNĐ)'];
            colCount = 9;
            columnsConfig = [
                { key: 'col1', width: 6 },
                { key: 'col2', width: 36 },
                { key: 'col3', width: 14 },
                { key: 'col4', width: 14 },
                { key: 'col5', width: 10 },
                { key: 'col6', width: 10 },
                { key: 'col7', width: 16 },
                { key: 'col8', width: 12 },
                { key: 'col9', width: 18 }
            ];
        } else {
            headers = ['STT', 'Sản Phẩm / Dịch Vụ', 'SL', 'ĐVT', 'Đơn Giá (VNĐ)', 'Thuế', 'Thành Tiền (VNĐ)'];
            colCount = 7;
            columnsConfig = [
                { key: 'col1', width: 6 },
                { key: 'col2', width: 42 },
                { key: 'col3', width: 10 },
                { key: 'col4', width: 10 },
                { key: 'col5', width: 16 },
                { key: 'col6', width: 12 },
                { key: 'col7', width: 18 }
            ];
        }

        ws.columns = columnsConfig;

        // Border styles helper
        const thinBorder = {
            top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } }
        };

        // 1. Company Information Header
        const companyName = (settings?.COMPANY_FULL_NAME || settings?.COMPANY_NAME || settings?.COMPANY_DISPLAY_NAME || 'CÔNG TY TNHH GIẢI PHÁP ĐÀO TẠO TRỊNH GIA').toUpperCase();
        const companyAddress = settings?.COMPANY_ADDRESS || '';
        const companyPhone = settings?.COMPANY_PHONE || '';
        const companyEmail = settings?.COMPANY_EMAIL || '';
        const companyTax = settings?.COMPANY_TAX || settings?.COMPANY_TAX_CODE || '';
        const companyWebsite = settings?.COMPANY_WEBSITE || '';

        // Row 1: Company Name
        ws.mergeCells(1, 1, 1, colCount);
        const cellA1 = ws.getCell('A1');
        cellA1.value = companyName;
        cellA1.font = { bold: true, size: 12, color: { argb: 'FF0F172A' }, name: 'Arial' };
        cellA1.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        ws.getRow(1).height = 24;

        // Row 2: Company Address
        ws.mergeCells(2, 1, 2, colCount);
        const cellA2 = ws.getCell('A2');
        cellA2.value = companyAddress ? `Địa chỉ: ${companyAddress}` : '';
        cellA2.font = { size: 10, color: { argb: 'FF334155' }, name: 'Arial' };
        cellA2.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        ws.getRow(2).height = 20;

        // Row 3: Phone / Email / Website
        ws.mergeCells(3, 1, 3, colCount);
        const cellA3 = ws.getCell('A3');
        const contactLine = [
            companyPhone ? `Điện thoại: ${companyPhone}` : '',
            companyEmail ? `Email: ${companyEmail}` : '',
            companyWebsite ? `Website: ${companyWebsite}` : ''
        ].filter(Boolean).join('    |    ');
        cellA3.value = contactLine;
        cellA3.font = { size: 10, color: { argb: 'FF334155' }, name: 'Arial' };
        cellA3.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        ws.getRow(3).height = 18;

        // Row 4: Tax Code
        ws.mergeCells(4, 1, 4, colCount);
        const cellA4 = ws.getCell('A4');
        cellA4.value = companyTax ? `Mã số thuế: ${companyTax}` : '';
        cellA4.font = { size: 10, color: { argb: 'FF334155' }, name: 'Arial' };
        cellA4.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        ws.getRow(4).height = 18;

        // Row 5: Empty space
        ws.addRow([]);
        ws.getRow(5).height = 12;

        // Row 6: Title
        const titleRowNumber = 6;
        ws.mergeCells(titleRowNumber, 1, titleRowNumber, colCount);
        const titleCell = ws.getCell(`A${titleRowNumber}`);
        titleCell.value = 'BẢNG BÁO GIÁ';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF0F172A' }, name: 'Arial' };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(titleRowNumber).height = 28;

        // Row 7: Subtitle
        const subTitleRowNumber = 7;
        ws.mergeCells(subTitleRowNumber, 1, subTitleRowNumber, colCount);
        const subTitleCell = ws.getCell(`A${subTitleRowNumber}`);
        subTitleCell.value = `Số báo giá: ${estimate.code}    |    Ngày lập: ${formatDate(estimate.date)}${estimate.validUntil ? `    |    Hiệu lực đến: ${formatDate(estimate.validUntil)}` : ''}`;
        subTitleCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' }, name: 'Arial' };
        subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(subTitleRowNumber).height = 20;

        // Row 8: Empty space
        ws.addRow([]);
        ws.getRow(8).height = 12;

        // Customer & Contact Info Block (Using helper to merge columns 1-2 for label and 3-colCount for value)
        const addInfoRow = (label: string, value: string, isBold: boolean = false) => {
            const row = ws.addRow([]);
            const rowNum = row.number;
            row.height = 22;

            // Merge cols 1..2 for label
            ws.mergeCells(rowNum, 1, rowNum, 2);
            const labelCell = row.getCell(1);
            labelCell.value = label;
            labelCell.font = { bold: true, size: 10, color: { argb: 'FF334155' }, name: 'Arial' };
            labelCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

            // Merge cols 3..colCount for value
            ws.mergeCells(rowNum, 3, rowNum, colCount);
            const valCell = row.getCell(3);
            valCell.value = value;
            valCell.font = { bold: isBold, size: 10, color: { argb: 'FF0F172A' }, name: 'Arial' };
            valCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

            return row;
        };

        // Customer name
        addInfoRow('Kính gửi (Khách hàng):', estimate.customer?.name || '', true);

        // Address
        const customerAddress = estimate.customer?.address || estimate.customer?.billingAddress;
        if (customerAddress) {
            addInfoRow('Địa chỉ:', customerAddress);
        }

        // Tax code
        if (estimate.customer?.taxCode) {
            addInfoRow('Mã số thuế:', estimate.customer.taxCode);
        }

        // Contact info (Khách hàng)
        const contactName = estimate.customer?.contactName || estimate.customer?.contacts?.[0]?.name;
        const contactPhone = estimate.customer?.phone || estimate.customer?.contacts?.[0]?.phone;
        const contactEmail = estimate.customer?.email || estimate.customer?.contacts?.[0]?.email;
        const contactDetails = [
            contactName ? `Họ tên: ${contactName}` : '',
            contactPhone ? `Điện thoại: ${contactPhone}` : '',
            contactEmail ? `Email: ${contactEmail}` : ''
        ].filter(Boolean).join('    |    ');
        
        if (contactDetails) {
            addInfoRow('Người liên hệ (KH):', contactDetails);
        }

        // Salesperson info (Người báo giá)
        const salespersonName = estimate.salesperson?.name || estimate.creator?.name;
        const salespersonEmail = estimate.salesperson?.email || estimate.creator?.email;
        const salespersonPhone = (estimate.salesperson as any)?.phone || (estimate.creator as any)?.phone;
        const salesDetails = [
            salespersonName ? `Họ tên: ${salespersonName}` : '',
            salespersonPhone ? `Điện thoại: ${salespersonPhone}` : '',
            salespersonEmail ? `Email: ${salespersonEmail}` : ''
        ].filter(Boolean).join('    |    ');

        if (salesDetails) {
            addInfoRow('Người báo giá:', salesDetails);
        }

        // Notes if any
        if (estimate.notes) {
            addInfoRow('Ghi chú / Điều khoản:', estimate.notes);
        }

        // Row before Table
        const emptyBeforeTable = ws.addRow([]);
        emptyBeforeTable.height = 10;

        // Table Header
        const headerRow = ws.addRow(headers);
        headerRow.height = 26;
        headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Arial' };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        for (let i = 1; i <= colCount; i++) {
            const cell = headerRow.getCell(i);
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF0F766E' } // Deep teal / Professional brand header
            };
            cell.border = thinBorder;
        }

        // Table Body
        estimate.items?.forEach((item: any, index: number) => {
            let rowData: any[] = [];
            const itemName = item.customName || item.product?.name || 'Sản phẩm / Dịch vụ';
            const desc = item.description ? `\n${item.description}` : '';
            const fullTitle = item.isSubItem ? `   ↳ ${itemName}${desc}` : `${itemName}${desc}`;
            const taxDisplay = formatTaxRate(item.taxRate);

            if (estimate.templateType === 'PROJECT_BREAKDOWN') {
                const totalVatTu = (item.quantity || 0) * (item.unitPrice || 0);
                const totalNhanCong = (item.quantity || 0) * (item.laborPrice || 0);
                rowData = [
                    item.isSubItem ? '-' : index + 1,
                    fullTitle,
                    item.manufacture || item.product?.brand || '',
                    item.warranty || item.product?.warranty || '',
                    item.quantity || 0,
                    item.unit || item.product?.unit || '',
                    item.unitPrice || 0,
                    item.laborPrice || 0,
                    totalVatTu,
                    totalNhanCong
                ];
            } else if (estimate.templateType === 'WITH_IMAGES') {
                rowData = [
                    item.isSubItem ? '-' : index + 1,
                    fullTitle,
                    item.origin || '',
                    item.warranty || item.product?.warranty || '',
                    item.quantity || 0,
                    item.unit || item.product?.unit || '',
                    item.unitPrice || 0,
                    taxDisplay,
                    item.totalPrice || 0
                ];
            } else {
                rowData = [
                    item.isSubItem ? '-' : index + 1,
                    fullTitle,
                    item.quantity || 0,
                    item.unit || item.product?.unit || '',
                    item.unitPrice || 0,
                    taxDisplay,
                    item.totalPrice || 0
                ];
            }

            const row = ws.addRow(rowData);
            row.font = { size: 10, name: 'Arial', color: item.isSubItem ? { argb: 'FF475569' } : { argb: 'FF0F172A' } };
            row.alignment = { vertical: 'middle', wrapText: true };
            
            // Format numbers and cell alignments
            for (let i = 1; i <= colCount; i++) {
                const cell = row.getCell(i);
                cell.border = thinBorder;
            }

            if (estimate.templateType === 'PROJECT_BREAKDOWN') {
                row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(5).numFmt = '#,##0.##';
                row.getCell(7).numFmt = '#,##0';
                row.getCell(8).numFmt = '#,##0';
                row.getCell(9).numFmt = '#,##0';
                row.getCell(10).numFmt = '#,##0';
            } else if (estimate.templateType === 'WITH_IMAGES') {
                row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(5).numFmt = '#,##0.##';
                row.getCell(7).numFmt = '#,##0';
                row.getCell(9).numFmt = '#,##0';
            } else {
                row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell(3).numFmt = '#,##0.##';
                row.getCell(5).numFmt = '#,##0';
                row.getCell(7).numFmt = '#,##0';
            }
        });

        // Summary Rows
        const addSummary = (label: string, value: number, bold: boolean = false) => {
            const r = ws.addRow([]);
            r.height = 24;
            ws.mergeCells(r.number, 1, r.number, colCount - 1);
            r.getCell(1).value = label;
            r.getCell(colCount).value = value;
            
            const labelCell = r.getCell(1);
            labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
            labelCell.font = { bold: bold, size: bold ? 11 : 10, name: 'Arial', color: bold ? { argb: 'FF0F172A' } : { argb: 'FF334155' } };
            
            const valCell = r.getCell(colCount);
            valCell.numFmt = '#,##0';
            valCell.alignment = { horizontal: 'right', vertical: 'middle' };
            valCell.font = { bold: bold, size: bold ? 11 : 10, name: 'Arial', color: bold ? { argb: 'FF0F172A' } : { argb: 'FF334155' } };
            
            if (bold) {
                for (let i = 1; i <= colCount; i++) {
                    r.getCell(i).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF1F5F9' }
                    };
                }
            }
            
            for (let i = 1; i <= colCount; i++) {
                r.getCell(i).border = thinBorder;
            }
            return r;
        };

        if (estimate.templateType === 'PROJECT_BREAKDOWN') {
            let sumVatTu = 0;
            let sumNhanCong = 0;
            estimate.items?.forEach((i: any) => { 
                sumVatTu += (i.quantity || 0) * (i.unitPrice || 0); 
                sumNhanCong += (i.quantity || 0) * (i.laborPrice || 0); 
            });
            addSummary('Tổng Cộng Tiền Vật Tư:', sumVatTu);
            addSummary('Tổng Cộng Tiền Nhân Công:', sumNhanCong);
            addSummary('Tổng Cộng Trước Thuế:', sumVatTu + sumNhanCong);
            addSummary('Tiền Thuế (VAT):', estimate.taxAmount);
            addSummary('TỔNG CỘNG THANH TOÁN:', estimate.totalAmount, true);
        } else {
            addSummary('Tổng Tiền Trước Thuế:', estimate.subTotal);
            addSummary('Tiền Thuế (VAT):', estimate.taxAmount);
            addSummary('TỔNG CỘNG THANH TOÁN:', estimate.totalAmount, true);
        }

        ws.addRow([]);
        ws.addRow([]);

        // Payment Info Block
        const payHeaderRow = ws.addRow(['THÔNG TIN THANH TOÁN / CHUYỂN KHOẢN:']);
        ws.mergeCells(payHeaderRow.number, 1, payHeaderRow.number, colCount);
        payHeaderRow.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF0F172A' }, name: 'Arial' };
        payHeaderRow.height = 20;
        
        if (settings?.BANK_INFO_CONTENT) {
            settings.BANK_INFO_CONTENT.split('\n').forEach((line: string) => { 
                if (line.trim()) {
                    const r = ws.addRow([line.trim()]);
                    ws.mergeCells(r.number, 1, r.number, colCount);
                    r.getCell(1).font = { size: 10, color: { argb: 'FF334155' }, name: 'Arial' };
                    r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                }
            });
        } else {
            const r = ws.addRow(['Vui lòng chuyển khoản theo thông tin hợp đồng hoặc liên hệ bộ phận kế toán để được hỗ trợ.']);
            ws.mergeCells(r.number, 1, r.number, colCount);
            r.getCell(1).font = { size: 10, color: { argb: 'FF334155' }, name: 'Arial', italic: true };
        }

        ws.addRow([]);
        ws.addRow([]);

        // Signatures Block
        const sigRow = ws.addRow([]);
        sigRow.height = 22;
        const mid = Math.floor(colCount / 2);
        
        ws.mergeCells(sigRow.number, 1, sigRow.number, mid);
        const khCell = sigRow.getCell(1);
        khCell.value = 'XÁC NHẬN CỦA KHÁCH HÀNG';
        khCell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF0F172A' } };
        khCell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        ws.mergeCells(sigRow.number, mid + 1, sigRow.number, colCount);
        const ctCell = sigRow.getCell(mid + 1);
        ctCell.value = 'ĐẠI DIỆN CÔNG TY';
        ctCell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF0F172A' } };
        ctCell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        const subSigRow = ws.addRow([]);
        subSigRow.height = 18;
        ws.mergeCells(subSigRow.number, 1, subSigRow.number, mid);
        const subKh = subSigRow.getCell(1);
        subKh.value = '(Ký, ghi rõ họ tên)';
        subKh.font = { italic: true, size: 9, name: 'Arial', color: { argb: 'FF64748B' } };
        subKh.alignment = { horizontal: 'center', vertical: 'middle' };
        
        ws.mergeCells(subSigRow.number, mid + 1, subSigRow.number, colCount);
        const subCt = subSigRow.getCell(mid + 1);
        subCt.value = '(Ký, đóng dấu, ghi rõ họ tên)';
        subCt.font = { italic: true, size: 9, name: 'Arial', color: { argb: 'FF64748B' } };
        subCt.alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Empty space for signatures
        const spaceRow = ws.addRow([]);
        spaceRow.height = 40;

        const buffer = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Bao_Gia_${estimate.code}.xlsx`);
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

    return (
        <div style={{ padding: '0', maxWidth: '100%', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-xs cursor-pointer"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5 mb-0.5">
                            <h1 className="text-lg font-bold text-slate-900 m-0 tracking-tight">
                                Báo Giá {estimate.code}
                            </h1>
                            <StatusBadge status={estimate.status} />
                        </div>
                        <p className="text-slate-500 m-0 text-xs">Quản lý chi tiết báo giá và các công việc liên quan.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <button
                        onClick={handleCopyPublicLink}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer h-[34px]"
                    >
                        <Copy size={14} /> {copied ? 'Đã sao chép' : 'Copy Link Gửi KH'}
                    </button>
                    <Link
                        href={`/print/sales/estimate/${estimate.id}`}
                        target="_blank"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors shadow-xs cursor-pointer no-underline h-[34px]"
                    >
                        <ExternalLink size={14} /> Xem Bản In
                    </Link>
                    <button
                        onClick={handleExportExcel}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer h-[34px]"
                    >
                        <FileDown size={14} /> Xuất Excel
                    </button>
                    <button
                        onClick={() => router.push(`/sales/estimates?edit=${estimate.id}`)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer h-[34px]"
                    >
                        <Edit2 size={14} /> Chỉnh Sửa
                    </button>
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer h-[34px]"
                    >
                        <Mail size={14} /> Gửi Email
                    </button>
                    {(estimate.status === 'EXPIRED' || estimate.status === 'REJECTED') && (
                        <button
                            onClick={handleClone}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer h-[34px]"
                        >
                            <Copy size={14} /> Tạo Bản Sao Mới
                        </button>
                    )}
                    {(estimate.status === 'DRAFT' || estimate.status === 'SENT' || estimate.status === 'ACCEPTED') && (
                        <>
                            <button
                                onClick={() => setIsConvertOrderModalOpen(true)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-xs cursor-pointer h-[34px]"
                            >
                                <ArrowRightLeft size={14} /> Lên Đơn Hàng
                            </button>
                            <button
                                onClick={() => setIsConvertModalOpen(true)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors shadow-xs cursor-pointer h-[34px]"
                            >
                                <ArrowRightLeft size={14} /> Lên Hóa Đơn
                            </button>
                        </>
                    )}

                    {estimate.status === 'DRAFT' && (
                        <button
                            onClick={() => handleStatusChange('SENT')}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer h-[34px]"
                        >
                            Ghi Nhận Đã Gửi Khách
                        </button>
                    )}
                    {estimate.status === 'SENT' && (
                        <>
                            <button
                                onClick={() => handleStatusChange('ACCEPTED')}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer h-[34px]"
                            >
                                Khách Chốt
                            </button>
                            <button
                                onClick={() => handleStatusChange('REJECTED')}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer h-[34px]"
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
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="flex overflow-x-auto whitespace-nowrap border-b border-slate-200 px-2 bg-slate-50/50 hide-scrollbar">
                            <button
                                onClick={() => setActiveTab('items')}
                                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 bg-transparent border-none cursor-pointer text-xs sm:text-sm font-medium transition-all relative
                                    ${activeTab === 'items' ? 'font-semibold text-emerald-700 border-b-2 border-emerald-600 bg-white' : 'text-slate-600 border-b-2 border-transparent hover:text-slate-900'}`}
                            >
                                <ShoppingCart size={15} /> Chi Tiết
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                                    ${activeTab === 'items' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {estimate.items?.length || 0}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('emailLogs')}
                                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 bg-transparent border-none cursor-pointer text-xs sm:text-sm font-medium transition-all relative
                                    ${activeTab === 'emailLogs' ? 'font-semibold text-emerald-700 border-b-2 border-emerald-600 bg-white' : 'text-slate-600 border-b-2 border-transparent hover:text-slate-900'}`}
                            >
                                <Mail size={15} /> Lịch Sử Email
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                                    ${activeTab === 'emailLogs' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {estimate.emailLogs?.length || 0}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('managers')}
                                className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 bg-transparent border-none cursor-pointer text-xs sm:text-sm font-medium transition-all relative
                                    ${activeTab === 'managers' ? 'font-semibold text-emerald-700 border-b-2 border-emerald-600 bg-white' : 'text-slate-600 border-b-2 border-transparent hover:text-slate-900'}`}
                            >
                                <UserCheck size={15} /> Người Phụ Trách
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                                    ${activeTab === 'managers' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
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
                    link: typeof window !== 'undefined' ? `${window.location.origin}/public/sales/estimate/${estimate.id}` : ''
                }}
                templates={emailTemplates || []}
                printUrl={typeof window !== 'undefined' ? `${window.location.origin}/public/sales/estimate/${estimate.id}` : ''}
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
