'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, ExternalLink, Copy, CheckCircle2, User, FileText, ShoppingCart, 
    Info, CheckSquare, XCircle, Undo2, History, ArrowRight, Clock, AlertTriangle, 
    PackageCheck, Activity, Edit2, Edit, Building, Building2, Mail, UserCheck, Calendar,
    CreditCard, DollarSign, Sparkles, Check, Phone, MapPin, Receipt, ShieldAlert,
    ChevronRight, CornerDownRight, Percent, Eye, FileDown, CalendarClock, BellRing
} from 'lucide-react';
import Link from 'next/link';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
    approveSalesInvoice, updateSalesInvoiceStatus, cancelSalesInvoice, 
    restoreSalesInvoice, paySalesInvoice, sendInvoiceEmail, 
    assignSalesInvoiceManagers, removeSalesInvoiceManager 
} from '../actions';
import { formatMoney, formatDate, formatDateTime, formatTaxRate } from '@/lib/utils/formatters';
import { TaxBadge } from '@/app/components/ui/TaxRateSelect';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { Modal } from '@/app/components/ui/Modal';
import { SalesInvoiceNotes } from '@/app/components/sales/SalesInvoiceNotes';
import { SendEmailModal } from '@/app/components/ui/modals/SendEmailModal';
import { InvoiceRenewalReminderModal } from '@/app/components/sales/InvoiceRenewalReminderModal';
import { useSession } from 'next-auth/react';
import { DocumentManagersPanel } from '@/app/components/shared/DocumentManagersPanel';
import { EmailLogTable } from '@/app/components/ui/EmailLogTable';
import { DocumentSignatureBlock } from '@/app/components/ui/DocumentSignatureBlock';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';

function getInitials(name: string) {
    if (!name) return 'U';
    const clean = name.trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SalesInvoiceDetailClient({ 
    initialData, 
    customers, 
    products, 
    users, 
    emailTemplates, 
    settings 
}: any) {
    const router = useRouter();
    const { data: session } = useSession();
    const [invoice, setInvoice] = useState(initialData);
    const [activeTab, setActiveTab] = useState<'items' | 'emailLogs' | 'managers'>('items');
    const [copied, setCopied] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentData, setPaymentData] = useState({ amount: 0, method: 'BANK_TRANSFER', notes: '' });
    const [diffModal, setDiffModal] = useState<{ isOpen: boolean, changes: string[] }>({ isOpen: false, changes: [] });

    // Email Modal State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // Renewal Reminder Modal State
    const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);

    // Action Modal State
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean,
        title: string,
        message: React.ReactNode,
        action: () => Promise<void>,
        icon?: React.ReactNode,
        confirmLabel?: string,
        cancelLabel?: string,
        confirmVariant?: 'primary' | 'danger' | 'warning' | 'success'
    } | null>(null);
    const [isActioning, setIsActioning] = useState(false);

    // Calculate remaining amount
    const remainingAmount = Math.max(0, invoice.totalAmount - (invoice.paidAmount || 0));
    const paidPercentage = invoice.totalAmount > 0 
        ? Math.min(100, Math.round(((invoice.paidAmount || 0) / invoice.totalAmount) * 100))
        : 0;

    // Calculate if overdue
    const isOverdue = invoice.dueDate && new Date(invoice.dueDate).getTime() < new Date().getTime() && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && remainingAmount > 0;

    useEffect(() => {
        setInvoice(initialData);
    }, [initialData]);

    const handleCopyPublicLink = () => {
        const publicUrl = `${window.location.origin}/public/sales/invoice/${invoice.id}`;
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

        const ws = wb.addWorksheet('HoaDonBanHang', {
            views: [{ showGridLines: true }],
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'portrait',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            }
        });

        const headers = ['STT', 'Sản Phẩm / Dịch Vụ', 'SL', 'ĐVT', 'Đơn Giá (VNĐ)', 'Thuế', 'Thành Tiền (VNĐ)'];
        const colCount = 7;
        const columnsConfig = [
            { key: 'col1', width: 6 },
            { key: 'col2', width: 42 },
            { key: 'col3', width: 10 },
            { key: 'col4', width: 10 },
            { key: 'col5', width: 16 },
            { key: 'col6', width: 12 },
            { key: 'col7', width: 18 }
        ];

        ws.columns = columnsConfig;

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
        titleCell.value = 'HÓA ĐƠN BÁN HÀNG';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF0F172A' }, name: 'Arial' };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(titleRowNumber).height = 28;

        // Row 7: Subtitle
        const subTitleRowNumber = 7;
        ws.mergeCells(subTitleRowNumber, 1, subTitleRowNumber, colCount);
        const subTitleCell = ws.getCell(`A${subTitleRowNumber}`);
        subTitleCell.value = `Số hóa đơn: ${invoice.code}    |    Ngày lập: ${formatDate(invoice.issueDate || invoice.createdAt)}${invoice.dueDate ? `    |    Hạn thanh toán: ${formatDate(invoice.dueDate)}` : ''}`;
        subTitleCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' }, name: 'Arial' };
        subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(subTitleRowNumber).height = 20;

        // Row 8: Empty space
        ws.addRow([]);
        ws.getRow(8).height = 12;

        // Helper to add customer / invoice info rows
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

        // Customer Info
        addInfoRow('Khách hàng / Đơn vị:', invoice.customer?.name || '', true);

        const customerAddress = invoice.customer?.address || invoice.customer?.billingAddress;
        if (customerAddress) {
            addInfoRow('Địa chỉ:', customerAddress);
        }

        if (invoice.customer?.taxCode) {
            addInfoRow('Mã số thuế:', invoice.customer.taxCode);
        }

        const contactName = invoice.customer?.contactName || invoice.customer?.contacts?.[0]?.name;
        const contactPhone = invoice.customer?.phone || invoice.customer?.contacts?.[0]?.phone;
        const contactEmail = invoice.customer?.email || invoice.customer?.contacts?.[0]?.email;
        const contactDetails = [
            contactName ? `Họ tên: ${contactName}` : '',
            contactPhone ? `Điện thoại: ${contactPhone}` : '',
            contactEmail ? `Email: ${contactEmail}` : ''
        ].filter(Boolean).join('    |    ');
        
        if (contactDetails) {
            addInfoRow('Người liên hệ (KH):', contactDetails);
        }

        if (invoice.order?.code) {
            addInfoRow('Đơn hàng tham chiếu:', invoice.order.code);
        }

        const creatorName = invoice.creator?.name || invoice.creator?.email;
        if (creatorName) {
            addInfoRow('Người lập hóa đơn:', creatorName);
        }

        if (invoice.notes) {
            addInfoRow('Ghi chú hóa đơn:', invoice.notes);
        }

        // Empty row before Table
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
        invoice.items?.forEach((item: any, index: number) => {
            const itemName = item.customName || item.product?.name || 'Sản phẩm / Dịch vụ';
            const desc = item.description ? `\n${item.description}` : '';
            const fullTitle = item.isSubItem ? `   ↳ ${itemName}${desc}` : `${itemName}${desc}`;
            const taxDisplay = formatTaxRate(item.taxRate);

            const rowData = [
                item.isSubItem ? '-' : index + 1,
                fullTitle,
                item.quantity || 0,
                item.unit || item.product?.unit || '',
                item.unitPrice || 0,
                taxDisplay,
                item.totalPrice || 0
            ];

            const row = ws.addRow(rowData);
            row.font = { size: 10, name: 'Arial', color: item.isSubItem ? { argb: 'FF475569' } : { argb: 'FF0F172A' } };
            row.alignment = { vertical: 'middle', wrapText: true };
            
            for (let i = 1; i <= colCount; i++) {
                const cell = row.getCell(i);
                cell.border = thinBorder;
            }

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

        addSummary('Tổng Tiền Trước Thuế:', invoice.subTotal || 0);
        addSummary('Tiền Thuế (VAT):', invoice.taxAmount || 0);
        addSummary('TỔNG CỘNG HÓA ĐƠN:', invoice.totalAmount || 0, true);
        if ((invoice.paidAmount || 0) > 0) {
            addSummary('Đã Thanh Toán:', invoice.paidAmount || 0);
            addSummary('CÒN PHẢI THANH TOÁN:', Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0)), true);
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
            const r = ws.addRow(['Vui lòng chuyển khoản theo thông tin tài khoản công ty hoặc liên hệ bộ phận kế toán để được hỗ trợ.']);
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
        khCell.value = 'NGƯỜI MUA HÀNG';
        khCell.font = { bold: true, size: 10, name: 'Arial', color: { argb: 'FF0F172A' } };
        khCell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        ws.mergeCells(sigRow.number, mid + 1, sigRow.number, colCount);
        const ctCell = sigRow.getCell(mid + 1);
        ctCell.value = 'NGƯỜI LẬP / ĐẠI DIỆN CÔNG TY';
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
        saveAs(new Blob([buffer]), `Hoa_Don_${invoice.code}.xlsx`);
    };

    const handleApprove = async () => {
        setActionModal({
            isOpen: true,
            title: 'Khởi Tạo & Duyệt Hóa Đơn',
            icon: <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={24} /></div>,
            message: (
                <div className="space-y-3 text-xs text-slate-600">
                    <h4 className="text-sm font-bold text-slate-900">Bạn đã kiểm tra kỹ thông tin hóa đơn?</h4>
                    <p>Sau khi tiến hành duyệt, hệ thống sẽ tự động thực thi các nghiệp vụ sau:</p>
                    <ul className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <li className="flex items-start gap-2">
                            <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Ghi nhận công nợ</strong> khách hàng vào sổ kế toán.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <PackageCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Tự động xuất kho</strong> trừ số lượng tồn kho các sản phẩm trên hóa đơn.</span>
                        </li>
                    </ul>
                </div>
            ),
            confirmLabel: 'Đồng Ý Duyệt & Xuất Kho',
            confirmVariant: 'success',
            action: async () => {
                const res = await approveSalesInvoice(invoice.id, 'system');
                if (res.success) {
                    alert('Đã duyệt hóa đơn, xuất kho và ghi nhận nợ thành công!');
                    router.refresh();
                } else alert(res.error);
            }
        });
    };

    const handleStatusChange = async (newStatus: string) => {
        setActionModal({
            isOpen: true,
            title: 'Chuyển trạng thái hóa đơn',
            icon: <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Info size={24} /></div>,
            message: (
                <p className="text-xs text-slate-600">
                    Xác nhận đổi trạng thái Hóa đơn thành <strong>{newStatus === 'PAID' ? 'Hoàn Tất Thu' : newStatus}</strong>?
                </p>
            ),
            confirmLabel: 'Chuyển Đổi',
            confirmVariant: 'primary',
            action: async () => {
                const res = await updateSalesInvoiceStatus(invoice.id, newStatus);
                if (res.success) {
                    setInvoice({ ...invoice, status: newStatus });
                    router.refresh();
                } else alert(res.error);
            }
        });
    };

    const openPartialPaymentModal = () => {
        setPaymentData({ 
            amount: remainingAmount, 
            method: 'BANK_TRANSFER', 
            notes: `Thu tiền hóa đơn ${invoice.code}` 
        });
        setIsPaymentModalOpen(true);
    };

    const handleSubmitPayment = async () => {
        if (paymentData.amount <= 0 || paymentData.amount > remainingAmount + 0.001) {
            alert('Số tiền không hợp lệ. Phải lớn hơn 0 và không vượt quá số còn nợ.');
            return;
        }
        const res = await paySalesInvoice(invoice.id, paymentData.amount, paymentData.method, '', paymentData.notes);
        if (res.success) {
            alert('Đã thu tiền và tạo Phiếu Thu thành công!');
            setIsPaymentModalOpen(false);
            router.refresh();
        } else alert('Lỗi: ' + res.error);
    };

    const handleFullPayment = async () => {
        setActionModal({
            isOpen: true,
            title: 'Thu Toàn Bộ Phần Còn Lại',
            icon: <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={24} /></div>,
            message: (
                <div className="space-y-3 text-xs text-slate-600">
                    <h4 className="text-sm font-bold text-slate-900">Xác nhận thu đủ tiền cho hóa đơn này?</h4>
                    <p className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 leading-relaxed">
                        Hệ thống sẽ tự động tạo Phiếu Thu cho phần nợ còn lại <strong>({formatMoney(remainingAmount)})</strong> và hoàn tất trạng thái thanh toán.
                    </p>
                </div>
            ),
            confirmLabel: 'Xác Nhận & Tạo Phiếu Thu',
            confirmVariant: 'success',
            action: async () => {
                const res = await paySalesInvoice(invoice.id, remainingAmount, 'BANK_TRANSFER', '', `Thu toàn bộ phần còn lại hóa đơn ${invoice.code}`);
                if (res.success) {
                    alert('Đã thu đủ Hóa Đơn thành công!');
                    router.refresh();
                } else alert('Lỗi: ' + res.error);
            }
        });
    };

    const handleCancel = async () => {
        setActionModal({
            isOpen: true,
            title: 'Hủy Hóa Đơn Bán Hàng',
            icon: <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center"><AlertTriangle size={24} /></div>,
            message: (
                <div className="space-y-3 text-xs text-slate-600">
                    <h4 className="text-sm font-bold text-slate-900">Bạn có chắc chắn muốn hủy hóa đơn này?</h4>
                    <p className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 leading-relaxed">
                        Các chứng từ xuất kho và công nợ liên quan sẽ được hệ thống <strong>tự động hoàn tác</strong>. Bạn có chắc chắn?
                    </p>
                </div>
            ),
            confirmLabel: 'Xác Nhận Hủy',
            confirmVariant: 'danger',
            action: async () => {
                const res = await cancelSalesInvoice(invoice.id);
                if (res.success) {
                    alert('Hủy Hóa Đơn và hoàn tác dữ liệu thành công!');
                    setInvoice({ ...invoice, status: 'CANCELLED' });
                    router.refresh();
                } else alert(res.error);
            }
        });
    };

    const handleRestore = async () => {
        setActionModal({
            isOpen: true,
            title: 'Khôi phục Hóa Đơn',
            icon: <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><Undo2 size={24} /></div>,
            message: (
                <div className="space-y-3 text-xs text-slate-600">
                    <h4 className="text-sm font-bold text-slate-900">Tiến hành khôi phục chứng từ?</h4>
                    <p className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 leading-relaxed">
                        Hệ thống sẽ tự động <strong>ghi nhận lại công nợ</strong> và <strong>xuất lại kho tự động</strong> đối với các vật tư có trên hóa đơn này.
                    </p>
                </div>
            ),
            confirmLabel: 'Đồng Ý Khôi Phục',
            confirmVariant: 'success',
            action: async () => {
                const res = await restoreSalesInvoice(invoice.id);
                if (res.success) {
                    alert('Đã khôi phục hóa đơn thành công!');
                    setInvoice({ ...invoice, status: 'ISSUED' });
                    router.refresh();
                } else alert(res.error);
            }
        });
    };

    return (
        <div className="w-full max-w-full space-y-6 p-4 md:p-6 lg:p-8">
            {/* Top Navigation & Action Header */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 md:p-5 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                    <button
                        onClick={() => router.push('/sales/invoices')}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                        title="Quay lại danh sách"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                                {invoice.code}
                            </span>
                            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                                Hóa Đơn Bán Hàng
                            </h1>
                            <StatusBadge status={invoice.status} />
                            {invoice.order && (
                                <Link
                                    href={`/sales/orders/${invoice.order.id}`}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors shadow-2xs font-mono"
                                >
                                    <ShoppingCart size={11} />
                                    <span>Đơn: {invoice.order.code}</span>
                                </Link>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                            <span>Ngày lập: <strong className="text-slate-700 font-mono">{formatDate(invoice.date)}</strong></span>
                            <span>•</span>
                            <span>Hạn TT: <strong className={`font-mono ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>{formatDate(invoice.dueDate)}</strong></span>
                            {invoice.creator && (
                                <>
                                    <span>•</span>
                                    <span>Lập bởi: <strong className="text-slate-700">{invoice.creator.name}</strong></span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                        onClick={handleCopyPublicLink}
                        className="inline-flex items-center gap-1.5 h-[34px] px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                        <Copy size={14} className="text-slate-500" />
                        <span>{copied ? 'Đã sao chép' : 'Copy Link Gửi KH'}</span>
                    </button>

                    <Link
                        href={`/print/sales/invoice/${invoice.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 h-[34px] px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                        <ExternalLink size={14} />
                        <span>Xem Bản In</span>
                    </Link>

                    <button
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 h-[34px] px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                        <FileDown size={14} />
                        <span>Xuất Excel</span>
                    </button>

                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="inline-flex items-center gap-1.5 h-[34px] px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                        <Mail size={14} />
                        <span>Gửi Email</span>
                    </button>

                    <button
                        onClick={() => setIsRenewalModalOpen(true)}
                        className="inline-flex items-center gap-1.5 h-[34px] px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
                        title="Tạo công việc nhắc gia hạn dịch vụ định kỳ cho khách hàng"
                    >
                        <CalendarClock size={14} className="text-purple-600" />
                        <span>Nhắc Gia Hạn</span>
                    </button>

                    <button
                        onClick={() => router.push(`/sales/invoices?edit=${invoice.id}`)}
                        className="inline-flex items-center gap-1.5 h-[34px] px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                        <Edit2 size={14} />
                        <span>Sửa</span>
                    </button>

                    {/* Stage Approval & Payment Buttons */}
                    {invoice.status === 'DRAFT' && (
                        <button
                            onClick={handleApprove}
                            className="inline-flex items-center gap-1.5 h-[34px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 active:scale-98 cursor-pointer"
                        >
                            <CheckCircle2 size={15} />
                            <span>Ghi Nhận & Xuất Kho</span>
                        </button>
                    )}

                    {(invoice.status === 'ISSUED' || invoice.status === 'PARTIAL_PAID') && (
                        <>
                            <button
                                onClick={openPartialPaymentModal}
                                className="inline-flex items-center gap-1.5 h-[34px] px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            >
                                <DollarSign size={14} />
                                <span>{invoice.status === 'PARTIAL_PAID' ? 'Tiếp Tục Thu' : 'Thu Một Phần'}</span>
                            </button>
                            <button
                                onClick={handleFullPayment}
                                className="inline-flex items-center gap-1.5 h-[34px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 active:scale-98 cursor-pointer"
                            >
                                <CheckCircle2 size={15} />
                                <span>Đã Thu Đủ Tiền</span>
                            </button>
                        </>
                    )}

                    {invoice.status !== 'CANCELLED' && (
                        <button
                            onClick={handleCancel}
                            className="inline-flex items-center justify-center h-[34px] w-[34px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                            title="Hủy Hóa Đơn"
                        >
                            <XCircle size={15} />
                        </button>
                    )}

                    {invoice.status === 'CANCELLED' && (
                        <button
                            onClick={handleRestore}
                            className="inline-flex items-center gap-1.5 h-[34px] px-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                            <Undo2 size={14} />
                            <span>Khôi Phục</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Overdue Warning Alert */}
            {isOverdue && (
                <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 text-rose-900">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                            <AlertTriangle size={18} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                                Hóa Đơn Quá Hạn Thanh Toán
                            </h3>
                            <p className="text-xs text-rose-700 mt-0.5 font-medium">
                                Hạn thanh toán là <strong className="font-mono">{formatDate(invoice.dueDate)}</strong>. Số tiền còn nợ: <strong className="font-mono">{formatMoney(remainingAmount)}</strong>.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={openPartialPaymentModal}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                    >
                        Thu tiền ngay
                    </button>
                </div>
            )}

            {/* Main 12-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ================= LEFT 8-COLUMNS: INVOICE INFO & ITEMS ================= */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Customer & General Info Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 space-y-5">
                        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Building2 size={18} className="text-emerald-600" />
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                    Thông Tin Khách Hàng & Giao Dịch
                                </h2>
                            </div>
                            {invoice.customer && (
                                <Link
                                    href={`/customers/${invoice.customerId}`}
                                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                >
                                    <span>Hồ sơ khách hàng</span>
                                    <ChevronRight size={14} />
                                </Link>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                            {/* Customer Name */}
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Khách Hàng / Đơn Vị
                                </span>
                                <div className="text-xs font-bold text-slate-900">
                                    {invoice.customer?.name || '—'}
                                </div>
                                {invoice.customer?.code && (
                                    <span className="text-[10px] font-mono text-slate-400 block">
                                        Mã: {invoice.customer.code}
                                    </span>
                                )}
                            </div>

                            {/* Contact & Phone */}
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Người liên hệ & SĐT
                                </span>
                                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                    <User size={13} className="text-slate-400" />
                                    <span>{invoice.customer?.contactName || '—'}</span>
                                </div>
                                <div className="text-xs font-mono text-slate-600 flex items-center gap-1 mt-0.5">
                                    <Phone size={12} className="text-slate-400" />
                                    <span>{invoice.customer?.phone || '—'}</span>
                                    {invoice.customer?.phone && (
                                        <ClickToCallButton phoneNumber={invoice.customer.phone} className="ml-1 scale-75 origin-left" />
                                    )}
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Email nhận hóa đơn
                                </span>
                                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1 truncate">
                                    <Mail size={13} className="text-slate-400 shrink-0" />
                                    <span className="truncate">{invoice.customer?.email || '—'}</span>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Ngày lập hóa đơn
                                </span>
                                <div className="text-xs font-mono font-semibold text-slate-800 flex items-center gap-1.5">
                                    <Calendar size={13} className="text-slate-400" />
                                    <span>{formatDate(invoice.date)}</span>
                                </div>
                            </div>

                            {/* Due Date */}
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Hạn thanh toán
                                </span>
                                <div className={`text-xs font-mono font-semibold flex items-center gap-1.5 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                                    <Clock size={13} className={isOverdue ? 'text-rose-600' : 'text-slate-400'} />
                                    <span>{formatDate(invoice.dueDate)}</span>
                                </div>
                            </div>

                            {/* Tax Code */}
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Mã số thuế
                                </span>
                                <div className="text-xs font-mono font-semibold text-slate-800">
                                    {invoice.customer?.taxCode || '—'}
                                </div>
                            </div>
                        </div>

                        {/* Customer Address */}
                        {invoice.customer?.address && (
                            <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
                                <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                <span>Địa chỉ: <strong className="text-slate-800">{invoice.customer.address}</strong></span>
                            </div>
                        )}

                        {/* Invoice Notes */}
                        {invoice.notes && (
                            <div className="pt-3 border-t border-slate-100 space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Ghi chú hóa đơn
                                </span>
                                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {invoice.notes}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Products Table & Tabs Area */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        {/* Tab Switcher */}
                        <div className="flex border-b border-slate-200/80 bg-slate-50/60 px-4 pt-2 gap-2">
                            <button
                                onClick={() => setActiveTab('items')}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                                    activeTab === 'items'
                                        ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-2xs'
                                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                                }`}
                            >
                                <ShoppingCart size={15} />
                                <span>Chi tiết sản phẩm xuất bán</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    {invoice.items?.length || 0}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('emailLogs')}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                                    activeTab === 'emailLogs'
                                        ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-2xs'
                                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                                }`}
                            >
                                <Mail size={15} />
                                <span>Lịch Sử Gửi Email</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                    {invoice.emailLogs?.length || 0}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('managers')}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                                    activeTab === 'managers'
                                        ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl shadow-2xs'
                                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                                }`}
                            >
                                <UserCheck size={15} />
                                <span>Người Phụ Trách</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                    {invoice.managers?.length || 0}
                                </span>
                            </button>
                        </div>

                        <div className="p-5">
                            {activeTab === 'items' && (
                                <div className="space-y-6">
                                    <div className="overflow-x-auto w-full rounded-xl border border-slate-200">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200/90 font-bold uppercase tracking-wider text-[11px]">
                                                    <th className="py-2.5 px-3.5">Tên Sản Phẩm / Dịch Vụ</th>
                                                    <th className="py-2.5 px-3.5 text-center w-[90px]">Số Lượng</th>
                                                    <th className="py-2.5 px-3.5 text-right w-[130px]">Đơn Giá</th>
                                                    <th className="py-2.5 px-3.5 text-center w-[95px]">Thuế GTGT</th>
                                                    <th className="py-2.5 px-3.5 text-right w-[140px]">Thành Tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {invoice.items?.map((item: any) => (
                                                    <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${item.isSubItem ? 'bg-slate-50/40' : ''}`}>
                                                        <td className={`py-3 px-3.5 align-middle ${item.isSubItem ? 'pl-8' : ''}`}>
                                                            <div className="flex items-start gap-1.5">
                                                                {item.isSubItem && <CornerDownRight size={13} className="text-slate-400 shrink-0 mt-0.5" />}
                                                                <div>
                                                                    <div className="font-bold text-xs text-slate-900">
                                                                        {item.customName || item.product?.name || 'Sản phẩm tự do'}
                                                                    </div>
                                                                    {item.product?.sku && (
                                                                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                                                            SKU: {item.product.sku}
                                                                        </div>
                                                                    )}
                                                                    {item.description && (
                                                                        <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">
                                                                            {item.description}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3.5 text-center align-middle font-mono font-bold text-slate-800">
                                                            {item.quantity} <span className="text-[10px] font-normal text-slate-400">{item.unit || item.product?.unit || ''}</span>
                                                        </td>
                                                        <td className="py-3 px-3.5 text-right align-middle font-mono text-slate-700">
                                                            {formatMoney(item.unitPrice)}
                                                        </td>
                                                        <td className="py-3 px-3.5 text-center align-middle">
                                                            <TaxBadge rate={item.taxRate} />
                                                        </td>
                                                        <td className="py-3 px-3.5 text-right align-middle font-mono font-bold text-slate-900">
                                                            {formatMoney(item.totalPrice)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Financial Calculation Summary Box */}
                                    <div className="flex justify-end">
                                        <div className="w-full sm:w-88 bg-slate-50/80 rounded-2xl p-4 md:p-5 border border-slate-200/90 shadow-2xs space-y-2.5">
                                            <div className="flex justify-between text-xs text-slate-600">
                                                <span>Tổng tiền hàng (Chưa thuế):</span>
                                                <span className="font-mono font-bold text-slate-800">{formatMoney(invoice.subTotal)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-600">
                                                <span>Tổng thuế GTGT:</span>
                                                <span className="font-mono font-bold text-slate-800">{formatMoney(invoice.taxAmount)}</span>
                                            </div>
                                            <div className="h-px bg-slate-200 my-2" />
                                            <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                                                <span>Tổng Hóa Đơn:</span>
                                                <span className="font-mono text-base font-black text-slate-900">{formatMoney(invoice.totalAmount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-slate-600">
                                                <span>Đã thanh toán trước đó:</span>
                                                <span className="font-mono font-bold text-emerald-700">{formatMoney(invoice.paidAmount || 0)}</span>
                                            </div>
                                            <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Còn Phải Thu:</span>
                                                <span className={`font-mono text-base font-black ${remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                                    {formatMoney(remainingAmount)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'emailLogs' && (
                                <EmailLogTable emailLogs={invoice.emailLogs || []} />
                            )}

                            {activeTab === 'managers' && (
                                <DocumentManagersPanel
                                    documentId={invoice.id}
                                    managers={invoice.managers || []}
                                    users={users || []}
                                    currentUserRole={session?.user?.role || 'USER'}
                                    onAssign={assignSalesInvoiceManagers}
                                    onRemove={removeSalesInvoiceManager}
                                />
                            )}
                        </div>
                    </div>

                    {/* Bank Info Card (If Enabled) */}
                    {settings?.BANK_INFO_ENABLED === 'true' && settings?.BANK_INFO_CONTENT && (
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Building size={18} className="text-sky-600" />
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                        Thông Tin Thanh Toán Chuyển Khoản
                                    </h2>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(settings.BANK_INFO_CONTENT || '');
                                        alert('Đã copy thông tin thanh toán');
                                    }}
                                    className="px-2.5 py-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <Copy size={13} />
                                    <span>Copy thông tin</span>
                                </button>
                            </div>
                            <div className="p-3.5 bg-slate-50 rounded-xl border-l-4 border-l-sky-500 border border-slate-200/70 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-mono">
                                {settings.BANK_INFO_CONTENT}
                            </div>
                        </div>
                    )}

                    {/* Signatures Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <FileText size={18} className="text-emerald-600" />
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                Chữ Ký Xác Nhận Chứng Từ
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <DocumentSignatureBlock 
                                entityType="SALES_INVOICE" 
                                entityId={invoice.id} 
                                role="CUSTOMER" 
                                title="ĐẠI DIỆN KHÁCH HÀNG" 
                                subtitle="(Ký xác nhận qua link online)" 
                                canSign={false} 
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
                                title="NGƯỜI LẬP HÓA ĐƠN" 
                                subtitle="(Ký xác nhận nội bộ)" 
                                canSign={true} 
                                initialSignature={invoice.companySignature} 
                                initialSignedAt={invoice.companySignedAt} 
                                signerName={invoice.creator?.name} 
                                companySignerId={session?.user?.id}
                            />
                        </div>
                    </div>
                </div>

                {/* ================= RIGHT 4-COLUMNS: PAYMENT KPI, NOTES, TASKS, TIMELINE ================= */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Financial Status KPI Card */}
                    <div 
                        className="rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden border border-emerald-900 text-white"
                        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)' }}
                    >
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-200">
                            <span>Trạng Thái Công Nợ</span>
                            <CreditCard size={16} className="text-emerald-300" />
                        </div>

                        {/* Big Remaining Amount */}
                        <div>
                            <span className="text-[11px] text-emerald-200 block uppercase font-medium">Còn phải thanh toán</span>
                            <div className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                                {formatMoney(remainingAmount)}
                            </div>
                        </div>

                        {/* Payment Progress Bar */}
                        <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between text-xs text-emerald-100 font-medium">
                                <span>Tiến độ thanh toán:</span>
                                <span className="font-mono font-bold text-white">{paidPercentage}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5">
                                <div 
                                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-500"
                                    style={{ width: `${paidPercentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="pt-3 border-t border-white/15 grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-emerald-200 text-[11px] block">Tổng hóa đơn:</span>
                                <span className="font-mono font-bold text-white">{formatMoney(invoice.totalAmount)}</span>
                            </div>
                            <div>
                                <span className="text-emerald-200 text-[11px] block">Đã thanh toán:</span>
                                <span className="font-mono font-bold text-emerald-300">{formatMoney(invoice.paidAmount || 0)}</span>
                            </div>
                        </div>

                        {/* Action Shortcuts inside card */}
                        {remainingAmount > 0 && (invoice.status === 'ISSUED' || invoice.status === 'PARTIAL_PAID') && (
                            <div className="pt-2 flex gap-2">
                                <button
                                    onClick={openPartialPaymentModal}
                                    className="flex-1 py-2 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-2xs text-center"
                                >
                                    Thu một phần
                                </button>
                                <button
                                    onClick={handleFullPayment}
                                    className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md text-center"
                                >
                                    Đã thu đủ
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Invoice Notes Panel */}
                    <SalesInvoiceNotes
                        invoiceId={invoice.id}
                        notes={invoice.invoiceNotes || []}
                        currentUserId={session?.user?.id || ''}
                        currentUserRole={session?.user?.role || ''}
                    />

                    {/* Tasks Panel */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <TaskPanel
                            initialTasks={invoice.tasks || []}
                            users={users || []}
                            entityType="SALES_INVOICE"
                            entityId={invoice.id}
                        />
                    </div>

                    {/* Invoice History & Payment Log */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <History size={18} className="text-emerald-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Lịch Sử Chứng Từ & Thanh Toán
                            </h3>
                        </div>

                        {/* Related Order / Estimate */}
                        {invoice.order && (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Từ Đơn Hàng Gốc
                                </span>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart size={15} className="text-slate-600" />
                                        <span className="font-mono text-xs font-bold text-slate-900">{invoice.order.code}</span>
                                    </div>
                                    <Link href={`/sales/orders/${invoice.order.id}`} className="text-xs font-bold text-emerald-600 hover:underline">
                                        Xem đơn →
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Payment Allocations (Phiếu thu) */}
                        {invoice.allocations && invoice.allocations.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Phiếu Thu Đã Ghi Nhận ({invoice.allocations.length})
                                </span>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                                    {invoice.allocations.map((alloc: any, idx: number) => (
                                        <div key={idx} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                                            <div>
                                                <div className="font-mono text-xs font-bold text-slate-900">
                                                    {alloc.payment?.code || 'Phiếu Thu'}
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                    {formatDate(alloc.payment?.date)} • {alloc.payment?.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                                                </div>
                                            </div>
                                            <span className="font-mono font-bold text-xs text-emerald-700">
                                                +{formatMoney(alloc.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Activity Log */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Nhật Ký Thao Tác
                            </span>
                            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                                {invoice.activityLogs && invoice.activityLogs.length > 0 ? (
                                    invoice.activityLogs.map((log: any, idx: number) => (
                                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-slate-200">
                                                {log.user?.name ? getInitials(log.user.name) : '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-slate-900 font-semibold">
                                                    {log.action === 'CREATED' || log.action === 'TẠO_HÓA_ĐƠN' ? 'Hóa đơn được khởi tạo bởi ' :
                                                     log.action === 'UPDATED' || log.action === 'CẬP_NHẬT' ? 'Cập nhật bởi ' :
                                                     log.action === 'STATUS_CHANGED' || log.action === 'CẬP_NHẬT_TRẠNG_THÁI' || log.action === 'APPROVED' ? 'Duyệt / đổi trạng thái bởi ' : 'Thao tác bởi '}
                                                    <strong className="text-slate-900">{log.user?.name || 'Hệ thống'}</strong>
                                                </div>
                                                {log.details && (
                                                    <div className="text-slate-500 text-[11px] mt-0.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200/60 leading-relaxed">
                                                        {(() => {
                                                            try {
                                                                const parsed = JSON.parse(log.details);
                                                                if (parsed.type === 'UPDATE_DIFF') {
                                                                    return (
                                                                        <div>
                                                                            <div>{parsed.summary}</div>
                                                                            <button
                                                                                onClick={() => setDiffModal({ isOpen: true, changes: parsed.changes })}
                                                                                className="text-emerald-600 hover:underline font-bold mt-1 block cursor-pointer"
                                                                            >
                                                                                Xem chi tiết thay đổi
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                }
                                                            } catch (e) {
                                                                return log.details;
                                                            }
                                                            return log.details;
                                                        })()}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    {formatDateTime(log.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-slate-400 italic py-2 text-center">
                                        Chưa có nhật ký ghi nhận
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Diff Modal */}
            <Modal isOpen={diffModal.isOpen} onClose={() => setDiffModal({ ...diffModal, isOpen: false })} title="Chi Tiết Điều Chỉnh / Cập Nhật">
                <div className="p-2 max-h-[60vh] overflow-y-auto space-y-2">
                    <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                        {diffModal.changes.map((change, i) => (
                            <li key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200" dangerouslySetInnerHTML={{
                                __html: change.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-bold">$1</strong>')
                            }} />
                        ))}
                    </ul>
                </div>
            </Modal>

            {/* Payment Modal */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Ghi Nhận Thu Tiền Hóa Đơn">
                <div className="space-y-4 p-1">
                    {/* Summary box */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-600">
                            <span>Tổng Hóa Đơn:</span>
                            <span className="font-mono font-bold text-slate-900">{formatMoney(invoice.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>Đã thu trước đó:</span>
                            <span className="font-mono font-bold text-emerald-700">{formatMoney(invoice.paidAmount || 0)}</span>
                        </div>
                        <div className="h-px bg-slate-200 my-1" />
                        <div className="flex justify-between text-slate-900 font-bold">
                            <span className="uppercase tracking-wider">Còn Phải Thu:</span>
                            <span className="font-mono text-base font-black text-rose-600">{formatMoney(remainingAmount)}</span>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs font-bold text-slate-700">Số tiền thực thu (VNĐ) <span className="text-rose-500">*</span></label>
                            <button
                                type="button"
                                onClick={() => setPaymentData({ ...paymentData, amount: remainingAmount })}
                                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                            >
                                Điền hết nợ ({formatMoney(remainingAmount)})
                            </button>
                        </div>
                        <input
                            type="number"
                            step="any"
                            value={paymentData.amount || ''}
                            onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                            className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500 shadow-2xs"
                            placeholder="Nhập số tiền..."
                        />
                    </div>

                    {/* Method */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">Hình thức thanh toán</label>
                        <select
                            value={paymentData.method}
                            onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                            className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                        >
                            <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng</option>
                            <option value="CASH">Tiền mặt</option>
                            <option value="CREDIT_CARD">Thẻ tín dụng / POS</option>
                        </select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">Ghi chú phiếu thu</label>
                        <textarea
                            rows={2}
                            value={paymentData.notes}
                            onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                            placeholder="Nhập ghi chú thanh toán..."
                            className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsPaymentModalOpen(false)}
                            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmitPayment}
                            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                            <CheckCircle2 size={14} />
                            <span>Xác Nhận & Lưu Phiếu Thu</span>
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Action Confirmation Modal */}
            {actionModal && (
                <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal(null)} title={actionModal.title}>
                    <div className="space-y-4 p-1">
                        <div className="flex items-center gap-3">
                            {actionModal.icon}
                            <div className="flex-1 min-w-0">
                                {actionModal.message}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setActionModal(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                                disabled={isActioning}
                            >
                                {actionModal.cancelLabel || 'Hủy bỏ'}
                            </button>
                            <button
                                onClick={async () => {
                                    setIsActioning(true);
                                    try {
                                        await actionModal.action();
                                        setActionModal(null);
                                    } finally {
                                        setIsActioning(false);
                                    }
                                }}
                                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 ${
                                    actionModal.confirmVariant === 'danger'
                                        ? 'bg-rose-600 hover:bg-rose-700'
                                        : actionModal.confirmVariant === 'success'
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                                disabled={isActioning}
                            >
                                {isActioning ? 'Đang xử lý...' : (actionModal.confirmLabel || 'Xác nhận')}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Send Email Modal */}
            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                templates={emailTemplates || []}
                moduleType="INVOICE"
                variablesData={{
                    invoiceCode: invoice.code,
                    customerName: invoice.customer?.name || '---',
                    totalAmount: formatMoney(invoice.totalAmount),
                    remainingAmount: formatMoney(remainingAmount),
                    dueDate: formatDate(invoice.dueDate),
                    link: typeof window !== 'undefined' ? `${window.location.origin}/public/sales/invoice/${invoice.id}` : ''
                }}
                onSend={async (emailData) => {
                    const res = await sendInvoiceEmail(invoice.id, emailData.to, emailData.subject, emailData.htmlBody);
                    if (res?.success) alert("Đã gửi email thông báo thành công!");
                    else alert("Lỗi khi gửi email: " + res?.error);
                }}
            />

            {/* Renewal Reminder Modal */}
            <InvoiceRenewalReminderModal
                isOpen={isRenewalModalOpen}
                onClose={() => setIsRenewalModalOpen(false)}
                invoice={invoice}
                users={users}
                currentUserId={session?.user?.id}
                onSuccess={() => {
                    alert('Đã tạo công việc nhắc gia hạn thành công!');
                    router.refresh();
                }}
            />
        </div>
    );
}
