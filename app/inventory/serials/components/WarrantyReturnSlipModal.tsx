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
import * as XLSX from 'xlsx';
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

    // In phiếu A4 qua trình duyệt
    const handlePrint = () => {
        window.print();
    };

    // Xuất file PDF trực tiếp bằng html2pdf.js
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
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(element).save();
            toast.success('Đã tải xuống file PDF phiếu trả bảo hành!');
        } catch (err: any) {
            console.error('Lỗi khi xuất PDF:', err);
            // Fallback mở hộp thoại in của trình duyệt để lưu PDF
            toast.info('Đang mở hộp thoại in để bạn có thể chọn "Lưu dưới dạng PDF" (Save as PDF)');
            window.print();
        } finally {
            setExportingPdf(false);
        }
    };

    // Xuất file Excel (.xlsx) chuẩn chỉnh bằng SheetJS (xlsx)
    const handleExportExcel = () => {
        if (!slipData) return;
        try {
            const wb = XLSX.utils.book_new();

            const isReplaced = slipData.serial.currentServiceState === 'REPLACED' || slipData.serial.status === 'REPLACED' || Boolean(slipData.replacementInfo?.replacementSerialNumber);
            const returnDateStr = slipData.serviceDetails.lastReturnDate ? new Date(slipData.serviceDetails.lastReturnDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
            const receivedDateStr = slipData.serviceDetails.lastReceivedDate ? new Date(slipData.serviceDetails.lastReceivedDate).toLocaleDateString('vi-VN') : 'N/A';
            const warrantyEndStr = slipData.serial.warrantyEndDate ? new Date(slipData.serial.warrantyEndDate).toLocaleDateString('vi-VN') : 'Không áp dụng';

            const wsData = [
                ['TRUNG TÂM BẢO HÀNH & DỊCH VỤ KỸ THUẬT', '', '', '', ''],
                [slipData.company.name.toUpperCase(), '', '', '', ''],
                [`Địa chỉ: ${slipData.company.address}`, '', '', '', ''],
                [`Hotline: ${slipData.company.phone}  |  Email: ${slipData.company.email}  |  Website: ${slipData.company.website}`, '', '', '', ''],
                ['', '', '', '', ''],
                ['PHIẾU TRẢ BẢO HÀNH & BIÊN BẢN BÀN GIAO THIẾT BỊ', '', '', '', ''],
                [`Số phiếu: ${slipData.slipCode}`, '', '', `Ngày lập phiếu: ${new Date(slipData.issueDate).toLocaleDateString('vi-VN')}`, ''],
                [`Trạng thái xử lý: ${isReplaced ? 'ĐÃ ĐỔI MỚI THIẾT BỊ 1-1' : 'HOÀN TẤT SỬA CHỮA BẢO HÀNH'}`, '', '', `Số lần bảo hành: Lần ${slipData.serviceDetails.warrantyCount || 1}`, ''],
                ['', '', '', '', ''],
                ['I. THÔNG TIN KHÁCH HÀNG / ĐẠI LÝ', '', '', '', ''],
                ['Tên khách hàng / Đơn vị:', slipData.customer?.name || 'Khách hàng vãng lai', '', 'Số điện thoại:', slipData.customer?.phone || 'N/A'],
                ['Địa chỉ liên hệ:', slipData.customer?.address || 'N/A', '', 'Hóa đơn / Đơn hàng:', slipData.invoice?.code || 'N/A'],
                ['', '', '', '', ''],
                ['II. THÔNG TIN THIẾT BỊ BÀN GIAO', '', '', '', ''],
                ['Tên thiết bị / sản phẩm:', slipData.product.name, '', 'Mã SKU:', slipData.product.sku],
                ['Số Serial / IMEI thu hồi:', slipData.serial.serialNumber, '', 'Kho xuất trả:', slipData.serial.warehouseName],
                ...(isReplaced && slipData.replacementInfo?.replacementSerialNumber ? [
                    ['SỐ SERIAL MỚI (ĐỔI 1-1):', slipData.replacementInfo.replacementSerialNumber, '', 'Phân loại:', 'Thiết bị thay thế đổi mới 1-1'],
                ] : []),
                ['Thời hạn BH tiếp theo:', warrantyEndStr, '', 'Tình trạng ngoại quan:', slipData.serviceDetails.latestAppearance],
                ['', '', '', '', ''],
                ['III. NỘI DUNG BẢO HÀNH & KẾT QUẢ XỬ LÝ KỸ THUẬT', '', '', '', ''],
                ['Ngày tiếp nhận bảo hành:', receivedDateStr, '', 'KTV tiếp nhận:', slipData.serviceDetails.technicianName],
                ['Hiện tượng lỗi lúc tiếp nhận:', slipData.serviceDetails.latestDefectReason, '', '', ''],
                ['Phụ kiện nhận kèm ban đầu:', slipData.serviceDetails.latestAccessories, '', '', ''],
                ['Ngày hoàn tất & bàn giao:', returnDateStr, '', 'KTV xử lý / Nghiệm thu:', slipData.serviceDetails.technicianName],
                ['Kết quả xử lý kỹ thuật:', slipData.serviceDetails.latestRepairResult, '', '', ''],
                ['Tình trạng máy khi bàn giao:', slipData.serviceDetails.deliveryCondition, '', '', ''],
                ['Ghi chú nhân viên kỹ thuật:', slipData.serviceDetails.latestStaffNotes, '', '', ''],
                ['', '', '', '', ''],
                ['IV. CAM KẾT & QUY ĐỊNH BẢO HÀNH TIẾP THEO', '', '', '', ''],
                ['1. Thiết bị tiếp tục được bảo hành chính hãng theo thời hạn bảo hành còn lại ghi trên phiếu.', '', '', '', ''],
                ['2. Khách hàng vui lòng kiểm tra kỹ ngoại quan, tem bảo hành và phụ kiện kèm theo trước khi ký nhận.', '', '', '', ''],
                ['3. Trung tâm không chịu trách nhiệm đối với các hư hỏng do rơi vỡ, ẩm ướt hoặc rách tem sau khi bàn giao.', '', '', '', ''],
                ['', '', '', '', ''],
                ['ĐẠI DIỆN KHÁCH HÀNG / ĐẠI LÝ', '', 'KỸ THUẬT VIÊN XỬ LÝ', '', 'TRUNG TÂM BẢO HÀNH'],
                ['(Ký, ghi rõ họ tên & ngày nhận)', '', '(Ký và ghi rõ họ tên)', '', '(Ký, đóng dấu và ghi rõ họ tên)'],
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                ['', '', '', '', ''],
                [slipData.customer?.name || 'Khách hàng', '', slipData.serviceDetails.technicianName, '', slipData.company.name]
            ];

            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Cài đặt độ rộng cột
            ws['!cols'] = [
                { wch: 28 },
                { wch: 38 },
                { wch: 24 },
                { wch: 26 },
                { wch: 30 }
            ];

            // Gộp ô tiêu đề
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
                { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
                { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
                { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } },
                { s: { r: 9, c: 0 }, e: { r: 9, c: 4 } },
                { s: { r: 13, c: 0 }, e: { r: 13, c: 4 } },
                { s: { r: 19, c: 0 }, e: { r: 19, c: 4 } },
                { s: { r: 28, c: 0 }, e: { r: 28, c: 4 } },
                { s: { r: 29, c: 0 }, e: { r: 29, c: 4 } },
                { s: { r: 30, c: 0 }, e: { r: 30, c: 4 } },
                { s: { r: 31, c: 0 }, e: { r: 31, c: 4 } }
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Phieu_Tra_Bao_Hanh');
            XLSX.writeFile(wb, `Phieu_Tra_Bao_Hanh_${slipData.serial.serialNumber}_${Date.now()}.xlsx`);
            toast.success('Đã xuất file Excel (.xlsx) biên bản trả bảo hành thành công!');
        } catch (err: any) {
            console.error('Lỗi xuất Excel:', err);
            toast.error('Lỗi khi xuất file Excel: ' + err.message);
        }
    };

    const isReplaced = slipData && (
        slipData.serial.currentServiceState === 'REPLACED' || 
        slipData.serial.status === 'REPLACED' || 
        Boolean(slipData.replacementInfo?.replacementSerialNumber)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
            {/* CSS Print Stylesheet injected into DOM */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm 10mm 10mm 10mm;
                    }
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #warranty-return-slip-print, #warranty-return-slip-print * {
                        visibility: visible !important;
                    }
                    #warranty-return-slip-print {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #ffffff !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}} />

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col my-auto overflow-hidden">
                
                {/* Modal Top Control Bar (Hidden when printing) */}
                <div className="no-print p-4 sm:px-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-white flex items-center gap-2">
                                Phiếu Trả Bảo Hành & Biên Bản Bàn Giao
                            </h3>
                            <p className="text-xs text-slate-400">
                                Mẫu biểu chính quy chuẩn hóa cho bàn giao thiết bị sau sửa chữa hoặc đổi mới 1-1
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Nút In A4 */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="In ngay ra máy in hoặc Lưu dưới dạng PDF (Ctrl+P)"
                        >
                            <Printer className="w-4 h-4" />
                            <span>In Phiếu (A4)</span>
                        </button>

                        {/* Nút Xuất PDF */}
                        <button
                            type="button"
                            onClick={handleExportPDF}
                            disabled={exportingPdf || loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Tải trực tiếp file PDF về máy tính"
                        >
                            {exportingPdf ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileDown className="w-4 h-4" />
                            )}
                            <span>{exportingPdf ? 'Đang tạo...' : 'Xuất PDF'}</span>
                        </button>

                        {/* Nút Xuất Excel */}
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                            title="Tải bảng tính Excel (.xlsx) có đầy đủ định dạng"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Xuất Excel (.xlsx)</span>
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
                        /* SLIP PRINT DOCUMENT (A4 Standard Format)                     */
                        /* ============================================================ */
                        <div 
                            id="warranty-return-slip-print"
                            ref={printRef}
                            className="bg-white text-slate-900 w-full max-w-[800px] p-6 sm:p-10 shadow-lg border border-slate-200 rounded-xl space-y-6 text-sm"
                            style={{ fontFamily: "'Times New Roman', Times, serif" }}
                        >
                            {/* Document Header */}
                            <div className="flex justify-between items-start gap-4 pb-4 border-b-2 border-slate-800">
                                <div className="space-y-1 max-w-[500px]">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-teal-700" />
                                        TRUNG TÂM BẢO HÀNH & DỊCH VỤ KỸ THUẬT CHÍNH HÃNG
                                    </div>
                                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight uppercase">
                                        {slipData.company.name}
                                    </h2>
                                    <div className="text-xs text-slate-600 space-y-0.5 leading-relaxed">
                                        <div><strong>Địa chỉ:</strong> {slipData.company.address}</div>
                                        <div className="flex flex-wrap gap-x-3">
                                            <span><strong>Hotline:</strong> {slipData.company.phone}</span>
                                            <span><strong>Email:</strong> {slipData.company.email}</span>
                                            <span><strong>Website:</strong> {slipData.company.website}</span>
                                        </div>
                                        {slipData.company.taxCode && (
                                            <div><strong>Mã số thuế:</strong> {slipData.company.taxCode}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right shrink-0 space-y-1">
                                    <div className="flex justify-end">
                                        <QRCodeSVG 
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/warranty?serial=${slipData.serial.serialNumber}`}
                                            size={68}
                                            level="M"
                                            includeMargin={false}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono block">Quét tra cứu gốc</span>
                                </div>
                            </div>

                            {/* Slip Title Banner */}
                            <div className="text-center space-y-1 py-1">
                                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900">
                                    {isReplaced ? 'BIÊN BẢN BÀN GIAO & ĐỔI MỚI THIẾT BỊ 1-1' : 'PHIẾU TRẢ BẢO HÀNH & BÀN GIAO THIẾT BỊ'}
                                </h1>
                                <p className="text-xs italic text-slate-600">
                                    (Căn cứ theo kết quả nghiệm thu bảo hành, sửa chữa kỹ thuật và chính sách đổi trả)
                                </p>
                                <div className="flex justify-center items-center gap-3 pt-1 text-xs">
                                    <span className="font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                                        Số phiếu: {slipData.slipCode}
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium text-slate-700">
                                        Ngày lập: {new Date(slipData.issueDate).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                            </div>

                            {/* Special Purple Banner if Device was SWAPPED 1-to-1 */}
                            {isReplaced && (
                                <div className="p-3.5 rounded-lg bg-purple-50 border-2 border-purple-300 text-xs text-purple-950 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5 text-xs">
                                            <RotateCcw className="w-4 h-4 text-purple-700" />
                                            XÁC NHẬN: THIẾT BỊ ĐÃ ĐƯỢC ĐỔI MỚI 1-1 (SERIAL SWAP)
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-bold text-[11px]">
                                            Thu hồi máy lỗi & Cấp phát máy mới
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-purple-200 text-xs">
                                        <div>
                                            <span className="text-slate-600 block">Số Serial cũ thu hồi:</span>
                                            <strong className="font-mono text-sm text-rose-700 line-through">
                                                {slipData.serial.serialNumber}
                                            </strong>
                                        </div>
                                        <div>
                                            <span className="text-purple-900 block font-semibold">Số Serial MỚI cấp phát thay thế:</span>
                                            <strong className="font-mono text-base text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-400 inline-block">
                                                {slipData.replacementInfo?.replacementSerialNumber || '(Đã cấp mới)'}
                                            </strong>
                                        </div>
                                    </div>
                                    {slipData.serviceDetails.latestDefectReason && (
                                        <div className="text-[11px] text-purple-900 pt-1">
                                            <strong>Lý do đổi mới:</strong> {slipData.serviceDetails.latestDefectReason}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section 1: Customer Info */}
                            <div className="space-y-1.5">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center gap-1.5">
                                    <span>I. THÔNG TIN KHÁCH HÀNG / ĐẠI LÝ NHẬN MÁY</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                                    <div>
                                        <span className="text-slate-500">Khách hàng / Đại lý: </span>
                                        <strong className="text-slate-900 text-sm">
                                            {slipData.customer?.name || 'Khách hàng vãng lai'}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Số điện thoại liên hệ: </span>
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
                                        <div>
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
                            <div className="space-y-1.5">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center gap-1.5">
                                    <span>II. THÔNG TIN THIẾT BỊ BÀN GIAO</span>
                                </h3>
                                <div className="border border-slate-300 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                                            <tr>
                                                <th className="py-2 px-3">Tên Sản Phẩm / Thiết Bị</th>
                                                <th className="py-2 px-3">Mã SKU</th>
                                                <th className="py-2 px-3">Số Serial / IMEI</th>
                                                <th className="py-2 px-3 text-center">Hạn Bảo Hành Đến</th>
                                                <th className="py-2 px-3 text-right">Kho Bàn Giao</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            <tr>
                                                <td className="py-2 px-3 font-bold text-slate-900">
                                                    {slipData.product.name}
                                                </td>
                                                <td className="py-2 px-3 font-mono">
                                                    {slipData.product.sku}
                                                </td>
                                                <td className="py-2 px-3 font-mono font-bold text-blue-700">
                                                    {isReplaced && slipData.replacementInfo?.replacementSerialNumber ? (
                                                        <div>
                                                            <span className="block text-purple-800 font-bold">
                                                                {slipData.replacementInfo.replacementSerialNumber} (Mới)
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 line-through">
                                                                Cũ: {slipData.serial.serialNumber}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        slipData.serial.serialNumber
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-center font-mono font-semibold text-emerald-700">
                                                    {slipData.serial.warrantyEndDate ? new Date(slipData.serial.warrantyEndDate).toLocaleDateString('vi-VN') : 'Theo chính sách'}
                                                </td>
                                                <td className="py-2 px-3 text-right text-slate-700">
                                                    {slipData.serial.warehouseName}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Section 3: Warranty & Repair Process Details */}
                            <div className="space-y-1.5">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center gap-1.5">
                                    <span>III. CHI TIẾT TIẾP NHẬN BẢO HÀNH & KẾT QUẢ XỬ LÝ</span>
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                                    <div>
                                        <span className="text-slate-500 block">Số lần bảo hành:</span>
                                        <strong className="text-slate-900">
                                            Lần thứ {slipData.serviceDetails.warrantyCount || 1}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">Ngày tiếp nhận tại trung tâm:</span>
                                        <strong className="font-mono text-slate-900">
                                            {slipData.serviceDetails.lastReceivedDate ? new Date(slipData.serviceDetails.lastReceivedDate).toLocaleDateString('vi-VN') : 'N/A'}
                                        </strong>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-slate-500 block">Hiện tượng lỗi tiếp nhận ghi nhận:</span>
                                        <span className="font-semibold text-rose-700">
                                            {slipData.serviceDetails.latestDefectReason}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">Tình trạng ngoại quan lúc nhận:</span>
                                        <span className="text-slate-800">
                                            {slipData.serviceDetails.latestAppearance}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">Phụ kiện nhận kèm ban đầu:</span>
                                        <span className="text-slate-800 font-medium">
                                            {slipData.serviceDetails.latestAccessories}
                                        </span>
                                    </div>
                                    <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                                        <span className="text-slate-500 block">Kết quả xử lý & nội dung sửa chữa / thay thế:</span>
                                        <strong className="text-emerald-800 text-sm block mt-0.5">
                                            {slipData.serviceDetails.latestRepairResult}
                                        </strong>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-slate-500 block">Lưu ý / Ghi chú kỹ thuật viên:</span>
                                        <span className="italic text-slate-700">
                                            {slipData.serviceDetails.latestStaffNotes}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Handover Condition & Return Accessories */}
                            <div className="space-y-1.5">
                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center gap-1.5">
                                    <span>IV. TÌNH TRẠNG BÀN GIAO THIẾT BỊ HIỆN TẠI</span>
                                </h3>
                                <div className="text-xs space-y-1 text-slate-800 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-200">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <span><strong>Tình trạng máy khi xuất trả:</strong> {slipData.serviceDetails.deliveryCondition}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <span><strong>Phụ kiện bàn giao trả lại:</strong> Đầy đủ phụ kiện nhận kèm ({slipData.serviceDetails.latestAccessories || 'Thân máy'})</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <span><strong>Chế độ bảo hành tiếp tục:</strong> Áp dụng hạn bảo hành chính hãng đến ngày <strong>{slipData.serial.warrantyEndDate ? new Date(slipData.serial.warrantyEndDate).toLocaleDateString('vi-VN') : 'theo quy định'}</strong> (được bảo hành tối thiểu 03 tháng đối với linh kiện thay thế).</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Terms & Conditions */}
                            <div className="space-y-1 text-[11px] text-slate-500 leading-normal border-t border-slate-200 pt-2">
                                <p className="font-bold uppercase text-slate-700">Quy định bàn giao & nhận máy:</p>
                                <p>1. Quý khách hàng / đại lý vui lòng kiểm tra kỹ ngoại quan thiết bị, tem niêm phong bảo hành và toàn bộ phụ kiện trước khi ký nhận bàn giao.</p>
                                <p>2. Trung tâm bảo hành không chịu trách nhiệm đối với các khiếu nại về trầy xước, móp méo cơ học hoặc rách vỡ tem niêm phong sau khi thiết bị đã rời khỏi trung tâm.</p>
                                <p>3. Mọi thắc mắc kỹ thuật vui lòng liên hệ tổng đài hỗ trợ <strong>{slipData.company.phone}</strong> hoặc website <strong>{slipData.company.website}</strong>.</p>
                            </div>

                            {/* Section 6: Signatures 3 Columns */}
                            <div className="pt-4 border-t-2 border-slate-300">
                                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                                    <div className="space-y-1">
                                        <div className="font-bold uppercase text-slate-900">
                                            ĐẠI DIỆN KHÁCH HÀNG / ĐẠI LÝ
                                        </div>
                                        <div className="text-[11px] italic text-slate-500">
                                            (Ký, ghi rõ họ tên & ngày nhận máy)
                                        </div>
                                        <div className="h-20" />
                                        <div className="font-semibold text-slate-900">
                                            {slipData.customer?.name || 'Khách hàng'}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="font-bold uppercase text-slate-900">
                                            KỸ THUẬT VIÊN XỬ LÝ
                                        </div>
                                        <div className="text-[11px] italic text-slate-500">
                                            (Ký và ghi rõ họ tên)
                                        </div>
                                        <div className="h-20" />
                                        <div className="font-semibold text-slate-900">
                                            {slipData.serviceDetails.technicianName || 'Kỹ thuật viên'}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="font-bold uppercase text-slate-900">
                                            TRUNG TÂM BẢO HÀNH
                                        </div>
                                        <div className="text-[11px] italic text-slate-500">
                                            (Ký, đóng dấu và ghi rõ họ tên)
                                        </div>
                                        <div className="h-20" />
                                        <div className="font-semibold text-slate-900">
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
                    <span className="text-slate-500">
                        Gợi ý: Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl + P</kbd> để in trực tiếp khổ A4
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
