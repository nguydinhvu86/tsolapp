'use client'

import React, { useState, useEffect, useRef } from 'react';
import { toast } from '@/app/components/providers/ToastProvider';
import { 
    X, 
    Printer, 
    FileDown, 
    FileSpreadsheet, 
    ShieldCheck, 
    CheckCircle2, 
    RotateCcw, 
    Wrench, 
    Clock, 
    Calendar, 
    User, 
    Building2, 
    Phone, 
    MapPin, 
    FileText, 
    Package, 
    RefreshCw,
    QrCode as QrCodeIcon,
    AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getWarrantyReturnSlipDataAction } from '../actions';

interface WarrantyReturnSlipModalProps {
    isOpen: boolean;
    onClose: () => void;
    serial: any | null;
}

export default function WarrantyReturnSlipModal({
    isOpen,
    onClose,
    serial
}: WarrantyReturnSlipModalProps) {
    const [loading, setLoading] = useState(true);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [slipData, setSlipData] = useState<any | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && serial) {
            setLoading(true);
            const targetIdOrSn = serial.id || serial.serialNumber;
            getWarrantyReturnSlipDataAction(targetIdOrSn)
                .then(res => {
                    if (res.success && res.data) {
                        setSlipData(res.data);
                    } else {
                        toast.error(res.error || 'Không tải được dữ liệu phiếu trả bảo hành');
                    }
                })
                .catch(err => {
                    toast.error('Lỗi khi tải dữ liệu phiếu: ' + err.message);
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen, serial]);

    if (!isOpen || !serial) return null;

    // In phiếu A4 chuẩn: Sử dụng hidden iframe để cô lập 100% nội dung phiếu, không bị lặp trang hay ảnh hưởng bởi DOM trang cha
    const handlePrint = () => {
        if (!slipData) return;
        const printContent = document.getElementById('warranty-return-slip-print');
        if (!printContent) {
            window.print();
            return;
        }

        try {
            // Lấy toàn bộ styles từ document (Tailwind css & style tags)
            const styleElements = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                .map(el => el.outerHTML)
                .join('\n');

            // Tạo iframe ẩn để in riêng biệt tài liệu phiếu
            const printFrame = document.createElement('iframe');
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = '0';
            printFrame.id = 'warranty-print-iframe';
            document.body.appendChild(printFrame);

            const frameDoc = printFrame.contentWindow?.document;
            if (!frameDoc) {
                window.print();
                return;
            }

            frameDoc.open();
            frameDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8" />
                    <title>Phiếu Trả Bảo Hành - ${slipData.slipCode}</title>
                    ${styleElements}
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 6mm 6mm 6mm 6mm;
                        }
                        * {
                            box-sizing: border-box !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #ffffff !important;
                            color: #0f172a !important;
                            height: auto !important;
                            overflow: visible !important;
                            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif !important;
                        }
                        #warranty-return-slip-print {
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 auto !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                            border: none !important;
                            page-break-after: avoid !important;
                            break-after: avoid !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                    </style>
                </head>
                <body>
                    <div id="warranty-return-slip-print">
                        ${printContent.innerHTML}
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.focus();
                                window.print();
                                setTimeout(function() {
                                    if (window.frameElement && window.frameElement.parentNode) {
                                        window.frameElement.parentNode.removeChild(window.frameElement);
                                    }
                                }, 1500);
                            }, 350);
                        };
                    </script>
                </body>
                </html>
            `);
            frameDoc.close();
        } catch (err: any) {
            console.error('Lỗi khi in qua iframe:', err);
            window.print();
        }
    };

    // Xuất file PDF trực tiếp bằng html2pdf.js với chất lượng cao Retina (Scale 3, Quality 1.0, 300 DPI)
    const handleExportPDF = async () => {
        if (!slipData) return;
        setExportingPdf(true);
        try {
            const element = document.getElementById('warranty-return-slip-print');
            if (!element) {
                toast.error('Không tìm thấy khung phiếu để xuất PDF');
                return;
            }

            // Import động html2pdf tránh lỗi SSR
            // @ts-ignore
            const html2pdfModule = await import('html2pdf.js');
            const html2pdf = html2pdfModule.default || html2pdfModule;

            const opt: any = {
                margin: [6, 6, 6, 6] as [number, number, number, number],
                filename: `Phieu_Tra_Bao_Hanh_${slipData.serial.serialNumber}.pdf`,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: { 
                    scale: 3, // Nâng lên 300 DPI (Retina resolution) giúp chữ nét căng, không bị vỡ hạt mờ
                    useCORS: true, 
                    logging: false,
                    letterRendering: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff'
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await html2pdf().set(opt).from(element).save();
            toast.success('Đã tải xuống file PDF phiếu trả bảo hành sắc nét!');
        } catch (err: any) {
            console.error('Lỗi khi xuất PDF:', err);
            toast.info('Đang mở hộp thoại in để bạn có thể chọn "Lưu dưới dạng PDF" (Save as PDF)');
            handlePrint();
        } finally {
            setExportingPdf(false);
        }
    };

    // Xuất file Excel (.xlsx) chuẩn doanh nghiệp chuyên nghiệp với ExcelJS
    const handleExportExcel = async () => {
        if (!slipData) return;
        setExportingExcel(true);
        try {
            const wb = new ExcelJS.Workbook();
            wb.creator = slipData.company?.name || 'TSOL ERP';
            wb.lastModifiedBy = 'TSOL ERP System';
            wb.created = new Date();
            wb.modified = new Date();

            const ws = wb.addWorksheet('Phieu_Tra_Bao_Hanh', {
                views: [{ showGridLines: true }],
                pageSetup: {
                    paperSize: 9, // A4
                    orientation: 'portrait',
                    fitToPage: true,
                    fitToWidth: 1,
                    fitToHeight: 0,
                    margins: {
                        left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2
                    }
                }
            });

            // Định cấu hình 6 cột chuẩn
            ws.columns = [
                { key: 'colA', width: 7 },   // STT / Mục
                { key: 'colB', width: 28 },  // Nhãn / Tên trường
                { key: 'colC', width: 34 },  // Tên sản phẩm / Nội dung
                { key: 'colD', width: 22 },  // Mã SKU / Serial / Ngày
                { key: 'colE', width: 22 },  // Hạn BH / KTV / Trạng thái
                { key: 'colF', width: 24 }   // Kho bàn giao / Ghi chú
            ];
            const colCount = 6;

            const borderThin = {
                top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
                left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } }
            };

            const isReplaced = slipData.serial.currentServiceState === 'REPLACED' || 
                               slipData.serial.status === 'REPLACED' || 
                               Boolean(slipData.replacementInfo?.replacementSerialNumber);

            const returnDateStr = slipData.serviceDetails.lastReturnDate ? new Date(slipData.serviceDetails.lastReturnDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
            const receivedDateStr = slipData.serviceDetails.lastReceivedDate 
                ? new Date(slipData.serviceDetails.lastReceivedDate).toLocaleDateString('vi-VN') 
                : (isReplaced ? 'Đổi mới trực tiếp' : ((slipData.serviceDetails.warrantyCount || 0) > 0 ? 'Theo biên bản tiếp nhận' : 'Theo phiếu xuất kho'));
            const warrantyEndStr = slipData.serial.warrantyEndDate ? new Date(slipData.serial.warrantyEndDate).toLocaleDateString('vi-VN') : 'Theo quy định';

            // 1. Header Công ty
            ws.mergeCells(1, 1, 1, colCount);
            const r1 = ws.getCell(1, 1);
            r1.value = 'TRUNG TÂM BẢO HÀNH & DỊCH VỤ KỸ THUẬT CHÍNH HÃNG';
            r1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F766E' } };
            r1.alignment = { horizontal: 'left', vertical: 'middle' };
            ws.getRow(1).height = 18;

            ws.mergeCells(2, 1, 2, colCount);
            const r2 = ws.getCell(2, 1);
            r2.value = (slipData.company?.name || 'CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ').toUpperCase();
            r2.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF0F172A' } };
            r2.alignment = { horizontal: 'left', vertical: 'middle' };
            ws.getRow(2).height = 22;

            ws.mergeCells(3, 1, 3, colCount);
            const r3 = ws.getCell(3, 1);
            r3.value = `Địa chỉ: ${slipData.company?.address || 'N/A'}`;
            r3.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
            r3.alignment = { horizontal: 'left', vertical: 'middle' };
            ws.getRow(3).height = 16;

            ws.mergeCells(4, 1, 4, colCount);
            const r4 = ws.getCell(4, 1);
            r4.value = `Hotline: ${slipData.company?.phone || 'N/A'}  |  Email: ${slipData.company?.email || 'N/A'}  |  Website: ${slipData.company?.website || 'N/A'}${slipData.company?.taxCode ? `  |  MST: ${slipData.company.taxCode}` : ''}`;
            r4.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
            r4.alignment = { horizontal: 'left', vertical: 'middle' };
            ws.getRow(4).height = 16;

            // Dòng kẻ phân cách
            const r5 = ws.getRow(5);
            r5.height = 6;
            for (let c = 1; c <= colCount; c++) {
                r5.getCell(c).border = { bottom: { style: 'medium', color: { argb: 'FF0F766E' } } };
            }

            // 2. Banner Tiêu đề Phiếu
            ws.addRow([]); // Row 6
            ws.getRow(6).height = 6;

            ws.mergeCells(7, 1, 7, colCount);
            const r7 = ws.getCell(7, 1);
            r7.value = isReplaced ? 'BIÊN BẢN BÀN GIAO & ĐỔI MỚI THIẾT BỊ 1-1' : 'PHIẾU TRẢ BẢO HÀNH & BIÊN BẢN BÀN GIAO THIẾT BỊ';
            r7.font = { name: 'Arial', size: 14, bold: true, color: { argb: isReplaced ? 'FF6B21A8' : 'FF0F2F4A' } };
            r7.alignment = { horizontal: 'center', vertical: 'middle' };
            r7.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isReplaced ? 'FFF5F3FF' : 'FFF0FDFA' }
            };
            ws.getRow(7).height = 26;

            ws.mergeCells(8, 1, 8, colCount);
            const r8 = ws.getCell(8, 1);
            r8.value = '(Căn cứ theo kết quả nghiệm thu bảo hành, sửa chữa kỹ thuật và chính sách đổi trả chính hãng)';
            r8.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
            r8.alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(8).height = 16;

            // Số phiếu & Ngày lập
            ws.mergeCells(9, 1, 9, 3);
            const r9a = ws.getCell(9, 1);
            r9a.value = `Số phiếu: ${slipData.slipCode}    •    Trạng thái: ${isReplaced ? 'ĐÃ ĐỔI MỚI 1-1' : 'HOÀN TẤT SỬA CHỮA'}`;
            r9a.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: isReplaced ? 'FF7E22CE' : 'FF0F766E' } };
            r9a.alignment = { horizontal: 'left', vertical: 'middle' };

            ws.mergeCells(9, 4, 9, colCount);
            const r9b = ws.getCell(9, 4);
            r9b.value = `Ngày lập phiếu: ${new Date(slipData.issueDate).toLocaleDateString('vi-VN')}    •    Số lần BH: Lần ${slipData.serviceDetails.warrantyCount || 1}`;
            r9b.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };
            r9b.alignment = { horizontal: 'right', vertical: 'middle' };
            ws.getRow(9).height = 20;

            let currentRow = 9;

            // Nếu ĐỔI MỚI 1-1: Hiển thị banner đổi serial nổi bật
            if (isReplaced) {
                currentRow++;
                ws.mergeCells(currentRow, 1, currentRow, colCount);
                const swapCell = ws.getCell(currentRow, 1);
                const newSn = slipData.replacementInfo?.replacementSerialNumber || '(Đã cấp mới)';
                swapCell.value = `⚡ THIẾT BỊ ĐÃ ĐƯỢC ĐỔI MỚI 1-1  |  SERIAL CŨ (THU HỒI): ${slipData.serial.serialNumber}  ➜  SERIAL MỚI (BÀN GIAO): ${newSn}`;
                swapCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF581C87' } };
                swapCell.alignment = { horizontal: 'center', vertical: 'middle' };
                swapCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
                for (let c = 1; c <= colCount; c++) {
                    ws.getCell(currentRow, c).border = {
                        top: { style: 'thin', color: { argb: 'FFA855F7' } },
                        bottom: { style: 'thin', color: { argb: 'FFA855F7' } },
                        left: { style: 'thin', color: { argb: 'FFA855F7' } },
                        right: { style: 'thin', color: { argb: 'FFA855F7' } }
                    };
                }
                ws.getRow(currentRow).height = 22;
            }

            // Helper tạo Section Header
            const addSectionHeader = (title: string) => {
                currentRow++;
                ws.getRow(currentRow).height = 4; // khoảng trống nhỏ
                currentRow++;
                ws.mergeCells(currentRow, 1, currentRow, colCount);
                const cell = ws.getCell(currentRow, 1);
                cell.value = title;
                cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
                for (let c = 1; c <= colCount; c++) {
                    ws.getCell(currentRow, c).border = borderThin;
                }
                ws.getRow(currentRow).height = 20;
            };

            // SECTION I: KHÁCH HÀNG / ĐẠI LÝ
            addSectionHeader('I. THÔNG TIN KHÁCH HÀNG / ĐẠI LÝ NHẬN THIẾT BỊ');

            currentRow++;
            ws.getCell(currentRow, 1).value = 'Khách hàng / Đơn vị:';
            ws.getCell(currentRow, 1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };
            ws.mergeCells(currentRow, 2, currentRow, 3);
            ws.getCell(currentRow, 2).value = slipData.customer?.name || 'Khách hàng vãng lai';
            ws.getCell(currentRow, 2).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };

            ws.getCell(currentRow, 4).value = 'Số điện thoại:';
            ws.getCell(currentRow, 4).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };
            ws.mergeCells(currentRow, 5, currentRow, 6);
            ws.getCell(currentRow, 5).value = slipData.customer?.phone || 'Chưa cập nhật';
            ws.getCell(currentRow, 5).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
            for (let c = 1; c <= colCount; c++) ws.getCell(currentRow, c).border = borderThin;
            ws.getRow(currentRow).height = 20;

            currentRow++;
            ws.getCell(currentRow, 1).value = 'Địa chỉ liên hệ:';
            ws.getCell(currentRow, 1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };
            ws.mergeCells(currentRow, 2, currentRow, 3);
            ws.getCell(currentRow, 2).value = slipData.customer?.address || 'Chưa cập nhật';
            ws.getCell(currentRow, 2).font = { name: 'Arial', size: 9, color: { argb: 'FF334155' } };

            ws.getCell(currentRow, 4).value = 'Hóa đơn mua hàng:';
            ws.getCell(currentRow, 4).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };
            ws.mergeCells(currentRow, 5, currentRow, 6);
            ws.getCell(currentRow, 5).value = slipData.invoice?.code ? `${slipData.invoice.code} (${slipData.invoice.date ? new Date(slipData.invoice.date).toLocaleDateString('vi-VN') : ''})` : 'N/A';
            ws.getCell(currentRow, 5).font = { name: 'Arial', size: 9, color: { argb: 'FF1D4ED8' } };
            for (let c = 1; c <= colCount; c++) ws.getCell(currentRow, c).border = borderThin;
            ws.getRow(currentRow).height = 20;

            // SECTION II: THÔNG TIN THIẾT BỊ BÀN GIAO (TABLE)
            addSectionHeader('II. THÔNG TIN THIẾT BỊ BÀN GIAO');

            currentRow++;
            const tblHeaders = ['STT', 'Tên Sản Phẩm / Thiết Bị', 'Mã SKU', 'Số Serial / IMEI', 'Hạn Bảo Hành', 'Kho Xuất Trả'];
            for (let c = 1; c <= colCount; c++) {
                const th = ws.getCell(currentRow, c);
                th.value = tblHeaders[c - 1];
                th.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E293B' } };
                th.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                th.alignment = { horizontal: 'center', vertical: 'middle' };
                th.border = borderThin;
            }
            ws.getRow(currentRow).height = 20;

            currentRow++;
            ws.getCell(currentRow, 1).value = 1;
            ws.getCell(currentRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
            
            ws.getCell(currentRow, 2).value = slipData.product.name;
            ws.getCell(currentRow, 2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
            ws.getCell(currentRow, 2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

            ws.getCell(currentRow, 3).value = slipData.product.sku;
            ws.getCell(currentRow, 3).alignment = { horizontal: 'center', vertical: 'middle' };

            const serialCell = ws.getCell(currentRow, 4);
            if (isReplaced && slipData.replacementInfo?.replacementSerialNumber) {
                serialCell.value = `${slipData.replacementInfo.replacementSerialNumber} (MỚI)\n[Cũ: ${slipData.serial.serialNumber}]`;
                serialCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF7E22CE' } };
            } else {
                serialCell.value = slipData.serial.serialNumber;
                serialCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1D4ED8' } };
            }
            serialCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            ws.getCell(currentRow, 5).value = warrantyEndStr;
            ws.getCell(currentRow, 5).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF047857' } };
            ws.getCell(currentRow, 5).alignment = { horizontal: 'center', vertical: 'middle' };

            ws.getCell(currentRow, 6).value = slipData.serial.warehouseName || 'TỔNG KHO';
            ws.getCell(currentRow, 6).alignment = { horizontal: 'center', vertical: 'middle' };

            for (let c = 1; c <= colCount; c++) ws.getCell(currentRow, c).border = borderThin;
            ws.getRow(currentRow).height = isReplaced ? 28 : 22;

            // SECTION III: CHI TIẾT TIẾP NHẬN BẢO HÀNH & KẾT QUẢ XỬ LÝ
            addSectionHeader('III. CHI TIẾT TIẾP NHẬN BẢO HÀNH & KẾT QUẢ XỬ LÝ KỸ THUẬT');

            const addInfoRow = (label1: string, val1: string, label2?: string, val2?: string, isHighlight = false) => {
                currentRow++;
                ws.getCell(currentRow, 1).value = label1;
                ws.getCell(currentRow, 1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };
                
                if (label2 && val2 !== undefined) {
                    ws.mergeCells(currentRow, 2, currentRow, 3);
                    ws.getCell(currentRow, 2).value = val1;
                    ws.getCell(currentRow, 2).font = { name: 'Arial', size: 9, bold: isHighlight, color: isHighlight ? { argb: 'FFB91C1C' } : { argb: 'FF0F172A' } };
                    ws.getCell(currentRow, 2).alignment = { wrapText: true, vertical: 'middle' };

                    ws.getCell(currentRow, 4).value = label2;
                    ws.getCell(currentRow, 4).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };

                    ws.mergeCells(currentRow, 5, currentRow, 6);
                    ws.getCell(currentRow, 5).value = val2;
                    ws.getCell(currentRow, 5).font = { name: 'Arial', size: 9, color: { argb: 'FF0F172A' } };
                    ws.getCell(currentRow, 5).alignment = { wrapText: true, vertical: 'middle' };
                } else {
                    ws.mergeCells(currentRow, 2, currentRow, colCount);
                    ws.getCell(currentRow, 2).value = val1;
                    ws.getCell(currentRow, 2).font = { name: 'Arial', size: 9, bold: isHighlight, color: isHighlight ? { argb: 'FF047857' } : { argb: 'FF0F172A' } };
                    ws.getCell(currentRow, 2).alignment = { wrapText: true, vertical: 'middle' };
                }

                for (let c = 1; c <= colCount; c++) ws.getCell(currentRow, c).border = borderThin;
                ws.getRow(currentRow).height = 20;
            };

            addInfoRow('Số lần bảo hành:', `Lần thứ ${slipData.serviceDetails.warrantyCount || 1}`, 'Ngày tiếp nhận:', receivedDateStr);
            addInfoRow('Hiện tượng lỗi nhận:', slipData.serviceDetails.latestDefectReason || 'Chưa ghi nhận', 'Ngoại quan tiếp nhận:', slipData.serviceDetails.latestAppearance || 'Bình thường', true);
            addInfoRow('Phụ kiện nhận kèm:', slipData.serviceDetails.latestAccessories || 'Thân máy', 'KTV tiếp nhận:', slipData.serviceDetails.technicianName || 'Bộ phận Kỹ thuật');
            addInfoRow('Kết quả xử lý kỹ thuật:', slipData.serviceDetails.latestRepairResult || 'Đã kiểm tra và xử lý hoàn tất', undefined, undefined, true);
            addInfoRow('Ghi chú của KTV:', slipData.serviceDetails.latestStaffNotes || 'Không có ghi chú thêm');

            // SECTION IV: TÌNH TRẠNG BÀN GIAO THIẾT BỊ HIỆN TẠI
            addSectionHeader('IV. TÌNH TRẠNG THIẾT BỊ BÀN GIAO HIỆN TẠI');
            addInfoRow('Tình trạng xuất trả:', slipData.serviceDetails.deliveryCondition || 'Hoạt động tốt 100%, ngoại quan hoàn chỉnh');
            addInfoRow('Phụ kiện hoàn trả:', `Đầy đủ phụ kiện nhận kèm (${slipData.serviceDetails.latestAccessories || 'Thân máy'})`);
            addInfoRow('Chế độ BH tiếp tục:', `Bảo hành chính hãng đến ngày ${warrantyEndStr} (tối thiểu 03 tháng cho linh kiện thay thế)`);

            // SECTION V: QUY ĐỊNH BÀN GIAO & NHẬN MÁY
            addSectionHeader('V. QUY ĐỊNH BÀN GIAO & NHẬN THIẾT BỊ');
            const terms = [
                '1. Quý khách hàng / đại lý vui lòng kiểm tra kỹ ngoại quan thiết bị, tem niêm phong bảo hành và toàn bộ phụ kiện trước khi ký nhận.',
                '2. Trung tâm bảo hành không chịu trách nhiệm đối với các khiếu nại về trầy xước, cấn móp cơ học hoặc rách vỡ tem sau khi thiết bị đã rời trung tâm.',
                `3. Mọi thắc mắc kỹ thuật vui lòng liên hệ hotline ${slipData.company?.phone || 'hỗ trợ'} hoặc tra cứu trực tuyến tại website ${slipData.company?.website || 'công ty'}.`
            ];
            terms.forEach(term => {
                currentRow++;
                ws.mergeCells(currentRow, 1, currentRow, colCount);
                const c = ws.getCell(currentRow, 1);
                c.value = term;
                c.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF64748B' } };
                c.alignment = { horizontal: 'left', vertical: 'middle' };
                for (let col = 1; col <= colCount; col++) ws.getCell(currentRow, col).border = borderThin;
                ws.getRow(currentRow).height = 16;
            });

            // SECTION VI: CHỮ KÝ 3 BÊN
            currentRow++;
            ws.getRow(currentRow).height = 6;
            currentRow++;

            // Header chữ ký
            ws.mergeCells(currentRow, 1, currentRow, 2);
            const sig1 = ws.getCell(currentRow, 1);
            sig1.value = 'ĐẠI DIỆN KHÁCH HÀNG / ĐẠI LÝ';
            sig1.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
            sig1.alignment = { horizontal: 'center', vertical: 'middle' };

            ws.mergeCells(currentRow, 3, currentRow, 4);
            const sig2 = ws.getCell(currentRow, 3);
            sig2.value = 'KỸ THUẬT VIÊN XỬ LÝ';
            sig2.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
            sig2.alignment = { horizontal: 'center', vertical: 'middle' };

            ws.mergeCells(currentRow, 5, currentRow, 6);
            const sig3 = ws.getCell(currentRow, 5);
            sig3.value = 'ĐẠI DIỆN TRUNG TÂM BẢO HÀNH';
            sig3.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
            sig3.alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(currentRow).height = 18;

            // Subtitle chữ ký
            currentRow++;
            ws.mergeCells(currentRow, 1, currentRow, 2);
            ws.getCell(currentRow, 1).value = '(Ký, ghi rõ họ tên & ngày nhận)';
            ws.getCell(currentRow, 1).font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF64748B' } };
            ws.getCell(currentRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };

            ws.mergeCells(currentRow, 3, currentRow, 4);
            ws.getCell(currentRow, 3).value = '(Ký và ghi rõ họ tên)';
            ws.getCell(currentRow, 3).font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF64748B' } };
            ws.getCell(currentRow, 3).alignment = { horizontal: 'center', vertical: 'middle' };

            ws.mergeCells(currentRow, 5, currentRow, 6);
            ws.getCell(currentRow, 5).value = '(Ký, đóng dấu và ghi rõ họ tên)';
            ws.getCell(currentRow, 5).font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF64748B' } };
            ws.getCell(currentRow, 5).alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(currentRow).height = 15;

            // Khoảng trống ký tên
            currentRow++;
            ws.getRow(currentRow).height = 40;

            // Tên người ký
            currentRow++;
            ws.mergeCells(currentRow, 1, currentRow, 2);
            ws.getCell(currentRow, 1).value = slipData.customer?.name || 'Khách hàng';
            ws.getCell(currentRow, 1).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
            ws.getCell(currentRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };

            ws.mergeCells(currentRow, 3, currentRow, 4);
            ws.getCell(currentRow, 3).value = slipData.serviceDetails.technicianName || 'Kỹ thuật viên';
            ws.getCell(currentRow, 3).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
            ws.getCell(currentRow, 3).alignment = { horizontal: 'center', vertical: 'middle' };

            ws.mergeCells(currentRow, 5, currentRow, 6);
            ws.getCell(currentRow, 5).value = slipData.company?.name || 'Trung Tâm Dịch Vụ';
            ws.getCell(currentRow, 5).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
            ws.getCell(currentRow, 5).alignment = { horizontal: 'center', vertical: 'middle' };
            ws.getRow(currentRow).height = 18;

            // Xuất ra buffer và lưu bằng FileSaver
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Phieu_Tra_Bao_Hanh_${slipData.serial.serialNumber}.xlsx`);
            toast.success('Đã xuất file Excel (.xlsx) biên bản trả bảo hành chuyên nghiệp!');
        } catch (err: any) {
            console.error('Lỗi xuất Excel chuyên nghiệp:', err);
            toast.error('Lỗi khi xuất file Excel: ' + err.message);
        } finally {
            setExportingExcel(false);
        }
    };

    const isReplaced = slipData && (
        slipData.serial.currentServiceState === 'REPLACED' || 
        slipData.serial.status === 'REPLACED' || 
        Boolean(slipData.replacementInfo?.replacementSerialNumber)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
            {/* CSS Print Stylesheet: Bảo đảm khi in trực tiếp từ trình duyệt chỉ in đúng 1 trang và không lặp layout cha */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 6mm 6mm 6mm 6mm;
                    }
                    html, body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        height: 100% !important;
                        max-height: 100vh !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #warranty-return-slip-print, #warranty-return-slip-print * {
                        visibility: visible !important;
                    }
                    #warranty-return-slip-print {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #ffffff !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}} />

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col my-auto overflow-hidden">
                
                {/* Modal Top Control Bar (Hidden when printing) */}
                <div className="no-print p-3 sm:px-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                                Phiếu Trả Bảo Hành & Biên Bản Bàn Giao
                            </h3>
                            <p className="text-xs text-slate-400 hidden sm:block">
                                Mẫu biểu chính quy chuẩn hóa cho bàn giao thiết bị sau sửa chữa hoặc đổi mới 1-1
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Nút In A4 (Tự động mở trình in cô lập đúng 1 trang A4) */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="In ngay ra máy in hoặc Lưu dưới dạng PDF chuẩn vector (Ctrl+P)"
                        >
                            <Printer className="w-4 h-4" />
                            <span>In Phiếu (A4)</span>
                        </button>

                        {/* Nút Xuất PDF Retina (300 DPI siêu nét) */}
                        <button
                            type="button"
                            onClick={handleExportPDF}
                            disabled={exportingPdf || loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Tải trực tiếp file PDF chất lượng cao (300 DPI) về máy tính"
                        >
                            {exportingPdf ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileDown className="w-4 h-4" />
                            )}
                            <span>{exportingPdf ? 'Đang tạo...' : 'Xuất PDF'}</span>
                        </button>

                        {/* Nút Xuất Excel Chuyên Nghiệp (Full màu sắc, viền, font chữ) */}
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={exportingExcel || loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Tải bảng tính Excel (.xlsx) thiết kế chuẩn doanh nghiệp đầy đủ định dạng"
                        >
                            {exportingExcel ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileSpreadsheet className="w-4 h-4" />
                            )}
                            <span>{exportingExcel ? 'Đang xuất...' : 'Xuất Excel'}</span>
                        </button>

                        {/* Nút Đóng */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Modal Body / Paper View Container */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
                    {loading ? (
                        <div className="py-24 text-center space-y-3">
                            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                Đang tổng hợp dữ liệu phiếu trả bảo hành...
                            </p>
                        </div>
                    ) : !slipData ? (
                        <div className="py-20 text-center space-y-3">
                            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                            <p className="text-sm font-semibold text-rose-600">
                                Không thể tải thông tin phiếu cho thiết bị này.
                            </p>
                        </div>
                    ) : (
                        /* ============================================================ */
                        /* SLIP PRINT DOCUMENT (A4 Standard Format - Gọn gàng 1 trang)  */
                        /* ============================================================ */
                        <div 
                            id="warranty-return-slip-print"
                            ref={printRef}
                            className="bg-white text-slate-900 w-full max-w-[794px] p-6 sm:p-8 shadow-lg border border-slate-200 rounded-xl space-y-3.5 text-xs"
                            style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" }}
                        >
                            {/* Document Header */}
                            <div className="flex justify-between items-start gap-4 pb-3 border-b-2 border-slate-800">
                                <div className="space-y-0.5 max-w-[520px]">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1">
                                        <Building2 className="w-3.5 h-3.5 text-teal-700" />
                                        TRUNG TÂM BẢO HÀNH & DỊCH VỤ KỸ THUẬT CHÍNH HÃNG
                                    </div>
                                    <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight uppercase">
                                        {slipData.company?.name || 'CÔNG TY TNHH GIẢI PHÁP CÔNG NGHỆ'}
                                    </h2>
                                    <div className="text-[11px] text-slate-600 space-y-0.5 leading-tight">
                                        <div><strong>Địa chỉ:</strong> {slipData.company?.address}</div>
                                        <div className="flex flex-wrap gap-x-3">
                                            <span><strong>Hotline:</strong> {slipData.company?.phone}</span>
                                            <span><strong>Email:</strong> {slipData.company?.email}</span>
                                            <span><strong>Website:</strong> {slipData.company?.website}</span>
                                        </div>
                                        {slipData.company?.taxCode && (
                                            <div><strong>Mã số thuế:</strong> {slipData.company.taxCode}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right shrink-0 space-y-0.5">
                                    <div className="flex justify-end">
                                        <QRCodeSVG 
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/warranty?serial=${slipData.serial.serialNumber}`}
                                            size={60}
                                            level="M"
                                            includeMargin={false}
                                        />
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-mono block">Quét tra cứu gốc</span>
                                </div>
                            </div>

                            {/* Slip Title Banner */}
                            <div className="text-center space-y-0.5 py-0.5">
                                <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                                    {isReplaced ? 'BIÊN BẢN BÀN GIAO & ĐỔI MỚI THIẾT BỊ 1-1' : 'PHIẾU TRẢ BẢO HÀNH & BÀN GIAO THIẾT BỊ'}
                                </h1>
                                <p className="text-[10px] italic text-slate-600">
                                    (Căn cứ theo kết quả nghiệm thu bảo hành, sửa chữa kỹ thuật và chính sách đổi trả)
                                </p>
                                <div className="flex justify-center items-center gap-2 pt-0.5 text-[11px]">
                                    <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                        Số phiếu: {slipData.slipCode}
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium text-slate-700">
                                        Ngày lập: {new Date(slipData.issueDate).toLocaleDateString('vi-VN')}
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium text-teal-800">
                                        Số lần BH: Lần {slipData.serviceDetails.warrantyCount || 1}
                                    </span>
                                </div>
                            </div>

                            {/* Special Purple Banner if Device was SWAPPED 1-to-1 */}
                            {isReplaced && (
                                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-300 text-xs text-purple-950 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5 text-[11px]">
                                            <RotateCcw className="w-3.5 h-3.5 text-purple-700" />
                                            XÁC NHẬN: THIẾT BỊ ĐÃ ĐƯỢC ĐỔI MỚI 1-1 (SERIAL SWAP)
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-bold text-[10px]">
                                            Thu hồi máy lỗi & Cấp phát máy mới
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-purple-200 text-xs">
                                        <div>
                                            <span className="text-slate-600 block text-[10px]">Số Serial cũ thu hồi:</span>
                                            <strong className="font-mono text-xs text-rose-700 line-through">
                                                {slipData.serial.serialNumber}
                                            </strong>
                                        </div>
                                        <div>
                                            <span className="text-purple-900 block font-semibold text-[10px]">Số Serial MỚI cấp phát thay thế:</span>
                                            <strong className="font-mono text-sm text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-400 inline-block">
                                                {slipData.replacementInfo?.replacementSerialNumber || '(Đã cấp mới)'}
                                            </strong>
                                        </div>
                                    </div>
                                    {slipData.serviceDetails.latestDefectReason && (
                                        <div className="text-[10px] text-purple-900 pt-0.5">
                                            <strong>Lý do đổi mới:</strong> {slipData.serviceDetails.latestDefectReason}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section 1: Customer Info */}
                            <div className="space-y-1">
                                <h3 className="font-bold text-[11px] uppercase tracking-wider text-teal-900 bg-teal-50/70 px-2 py-0.5 rounded border-l-4 border-teal-600">
                                    I. THÔNG TIN KHÁCH HÀNG / ĐẠI LÝ NHẬN MÁY
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs px-1">
                                    <div>
                                        <span className="text-slate-500">Khách hàng / Đại lý: </span>
                                        <strong className="text-slate-900">
                                            {slipData.customer?.name || 'Khách hàng vãng lai'}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Số điện thoại: </span>
                                        <strong className="font-mono font-bold text-slate-900">
                                            {slipData.customer?.phone || 'Chưa cập nhật'}
                                        </strong>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-slate-500">Địa chỉ: </span>
                                        <span className="text-slate-800">
                                            {slipData.customer?.address || 'Chưa cập nhật'}
                                        </span>
                                    </div>
                                    {slipData.invoice?.code && (
                                        <div className="sm:col-span-2">
                                            <span className="text-slate-500">Hóa đơn mua hàng gốc: </span>
                                            <strong className="font-mono text-blue-700">
                                                {slipData.invoice.code}
                                            </strong>
                                            {slipData.invoice.date && (
                                                <span className="text-slate-500 ml-1">
                                                    (Ngày: {new Date(slipData.invoice.date).toLocaleDateString('vi-VN')})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 2: Equipment Info */}
                            <div className="space-y-1">
                                <h3 className="font-bold text-[11px] uppercase tracking-wider text-teal-900 bg-teal-50/70 px-2 py-0.5 rounded border-l-4 border-teal-600">
                                    II. THÔNG TIN THIẾT BỊ BÀN GIAO
                                </h3>
                                <div className="border border-slate-300 rounded overflow-hidden">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                                            <tr>
                                                <th className="py-1.5 px-2.5">Tên Sản Phẩm / Thiết Bị</th>
                                                <th className="py-1.5 px-2.5">Mã SKU</th>
                                                <th className="py-1.5 px-2.5">Số Serial / IMEI</th>
                                                <th className="py-1.5 px-2.5 text-center">Hạn Bảo Hành Đến</th>
                                                <th className="py-1.5 px-2.5 text-right">Kho Bàn Giao</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            <tr>
                                                <td className="py-1.5 px-2.5 font-bold text-slate-900">
                                                    {slipData.product.name}
                                                </td>
                                                <td className="py-1.5 px-2.5 font-mono text-[11px]">
                                                    {slipData.product.sku}
                                                </td>
                                                <td className="py-1.5 px-2.5 font-mono font-bold text-blue-700">
                                                    {isReplaced && slipData.replacementInfo?.replacementSerialNumber ? (
                                                        <div>
                                                            <span className="block text-purple-800 font-bold">
                                                                {slipData.replacementInfo.replacementSerialNumber} (Mới)
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 line-through">
                                                                Cũ: {slipData.serial.serialNumber}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        slipData.serial.serialNumber
                                                    )}
                                                </td>
                                                <td className="py-1.5 px-2.5 text-center font-mono font-semibold text-emerald-700">
                                                    {slipData.serial.warrantyEndDate ? new Date(slipData.serial.warrantyEndDate).toLocaleDateString('vi-VN') : 'Theo chính sách'}
                                                </td>
                                                <td className="py-1.5 px-2.5 text-right text-slate-700 text-[11px]">
                                                    {slipData.serial.warehouseName || 'TỔNG KHO'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Section 3: Warranty & Repair Process Details */}
                            <div className="space-y-1">
                                <h3 className="font-bold text-[11px] uppercase tracking-wider text-teal-900 bg-teal-50/70 px-2 py-0.5 rounded border-l-4 border-teal-600">
                                    III. CHI TIẾT TIẾP NHẬN BẢO HÀNH & KẾT QUẢ XỬ LÝ
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">Số lần bảo hành:</span>
                                        <strong className="text-slate-900">
                                            Lần thứ {slipData.serviceDetails.warrantyCount || 1}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">Ngày tiếp nhận tại trung tâm:</span>
                                        <strong className="font-mono text-slate-900">
                                            {slipData.serviceDetails.lastReceivedDate 
                                                ? new Date(slipData.serviceDetails.lastReceivedDate).toLocaleDateString('vi-VN') 
                                                : (isReplaced ? 'Đổi mới trực tiếp' : ((slipData.serviceDetails.warrantyCount || 0) > 0 ? 'Theo biên bản tiếp nhận' : 'Theo phiếu xuất kho'))}
                                        </strong>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-slate-500 block text-[10px]">Hiện tượng lỗi tiếp nhận ghi nhận:</span>
                                        <span className="font-semibold text-rose-700">
                                            {slipData.serviceDetails.latestDefectReason || 'Chưa ghi nhận'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">Tình trạng ngoại quan lúc nhận:</span>
                                        <span className="text-slate-800">
                                            {slipData.serviceDetails.latestAppearance || 'Bình thường'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block text-[10px]">Phụ kiện nhận kèm ban đầu:</span>
                                        <span className="text-slate-800 font-medium">
                                            {slipData.serviceDetails.latestAccessories || 'Thân máy'}
                                        </span>
                                    </div>
                                    <div className="sm:col-span-2 pt-1 border-t border-slate-200">
                                        <span className="text-slate-500 block text-[10px]">Kết quả xử lý & nội dung sửa chữa / thay thế:</span>
                                        <strong className="text-emerald-800 text-xs block mt-0.5">
                                            {slipData.serviceDetails.latestRepairResult || 'Đã kiểm tra, xử lý hoàn tất'}
                                        </strong>
                                    </div>
                                    {slipData.serviceDetails.latestStaffNotes && (
                                        <div className="sm:col-span-2">
                                            <span className="text-slate-500 block text-[10px]">Lưu ý / Ghi chú kỹ thuật viên:</span>
                                            <span className="italic text-slate-700 text-[11px]">
                                                {slipData.serviceDetails.latestStaffNotes}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 4: Handover Condition & Return Accessories */}
                            <div className="space-y-1">
                                <h3 className="font-bold text-[11px] uppercase tracking-wider text-teal-900 bg-teal-50/70 px-2 py-0.5 rounded border-l-4 border-teal-600">
                                    IV. TÌNH TRẠNG BÀN GIAO THIẾT BỊ HIỆN TẠI
                                </h3>
                                <div className="text-[11px] space-y-0.5 text-slate-800 leading-normal bg-slate-50/60 p-2 rounded border border-slate-200">
                                    <div className="flex items-start gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                        <span><strong>Tình trạng máy khi xuất trả:</strong> {slipData.serviceDetails.deliveryCondition || 'Hoạt động tốt 100%, ngoại quan hoàn chỉnh'}</span>
                                    </div>
                                    <div className="flex items-start gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                        <span><strong>Phụ kiện bàn giao trả lại:</strong> Đầy đủ phụ kiện nhận kèm ({slipData.serviceDetails.latestAccessories || 'Thân máy'})</span>
                                    </div>
                                    <div className="flex items-start gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                        <span><strong>Chế độ bảo hành tiếp tục:</strong> Áp dụng hạn bảo hành chính hãng đến ngày <strong>{slipData.serial.warrantyEndDate ? new Date(slipData.serial.warrantyEndDate).toLocaleDateString('vi-VN') : 'theo quy định'}</strong> (được bảo hành tối thiểu 03 tháng đối với linh kiện thay thế).</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Terms & Conditions */}
                            <div className="space-y-0.5 text-[10px] text-slate-500 leading-tight border-t border-slate-200 pt-1.5">
                                <p className="font-bold uppercase text-slate-700">Quy định bàn giao & nhận máy:</p>
                                <p>1. Quý khách hàng / đại lý vui lòng kiểm tra kỹ ngoại quan thiết bị, tem niêm phong bảo hành và toàn bộ phụ kiện trước khi ký nhận bàn giao.</p>
                                <p>2. Trung tâm bảo hành không chịu trách nhiệm đối với các khiếu nại về trầy xước, móp méo cơ học hoặc rách vỡ tem sau khi rời khỏi trung tâm.</p>
                                <p>3. Mọi thắc mắc kỹ thuật vui lòng liên hệ tổng đài hỗ trợ <strong>{slipData.company?.phone}</strong> hoặc website <strong>{slipData.company?.website}</strong>.</p>
                            </div>

                            {/* Section 6: Signatures 3 Columns */}
                            <div className="pt-2 border-t-2 border-slate-300">
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="space-y-0.5">
                                        <div className="font-bold uppercase text-slate-900 text-[11px]">
                                            ĐẠI DIỆN KHÁCH HÀNG / ĐẠI LÝ
                                        </div>
                                        <div className="text-[10px] italic text-slate-500">
                                            (Ký, ghi rõ họ tên & ngày nhận máy)
                                        </div>
                                        <div className="h-12" />
                                        <div className="font-semibold text-slate-900 text-[11px]">
                                            {slipData.customer?.name || 'Khách hàng'}
                                        </div>
                                    </div>

                                    <div className="space-y-0.5">
                                        <div className="font-bold uppercase text-slate-900 text-[11px]">
                                            KỸ THUẬT VIÊN XỬ LÝ
                                        </div>
                                        <div className="text-[10px] italic text-slate-500">
                                            (Ký và ghi rõ họ tên)
                                        </div>
                                        <div className="h-12" />
                                        <div className="font-semibold text-slate-900 text-[11px]">
                                            {slipData.serviceDetails.technicianName || 'Kỹ thuật viên'}
                                        </div>
                                    </div>

                                    <div className="space-y-0.5">
                                        <div className="font-bold uppercase text-slate-900 text-[11px]">
                                            TRUNG TÂM BẢO HÀNH
                                        </div>
                                        <div className="text-[10px] italic text-slate-500">
                                            (Ký, đóng dấu và ghi rõ họ tên)
                                        </div>
                                        <div className="h-12" />
                                        <div className="font-semibold text-slate-900 text-[11px]">
                                            Đại diện Trung Tâm Dịch Vụ
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer Controls */}
                <div className="no-print p-3 sm:px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-500 hidden sm:inline">
                        Gợi ý: Nhấn nút <strong>In Phiếu (A4)</strong> để in trực tiếp hoặc lưu file PDF vector độ nét tối đa (1 trang duy nhất)
                    </span>
                    <span className="text-slate-500 sm:hidden">
                        Chuẩn biểu mẫu A4 (1 trang)
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                    >
                        Đóng cửa sổ
                    </button>
                </div>
            </div>
        </div>
    );
}
