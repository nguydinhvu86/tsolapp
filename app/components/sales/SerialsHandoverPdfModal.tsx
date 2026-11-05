'use client';

import React, { useState } from 'react';
import { toast } from '@/app/components/providers/ToastProvider';
import { FileText, Download, Printer, X, Check, Barcode } from 'lucide-react';
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

    // Brand color
    const brandColor = settings?.COMPANY_PRIMARY_COLOR || settings?.PRIMARY_COLOR || '#0f766e';
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
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Biên Bản Bàn Giao Serial - ${invoice.code}</title>
                <style>
                    @page { size: A4 portrait; margin: 10mm; }
                    body { 
                        margin: 0; 
                        padding: 10px;
                        font-family: Arial, Helvetica, sans-serif; 
                        color: #0f172a;
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                    }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; }
                    th { background-color: #0f766e !important; color: white !important; font-weight: bold; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    .font-mono { font-family: monospace; }
                    .font-bold { font-weight: bold; }
                </style>
            </head>
            <body>
                ${element.innerHTML}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() { window.close(); };
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Header Toolbar */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                Biên Bản Bàn Giao Thiết Bị & Bảng Kê Serial
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800">
                                    PDF A4
                                </span>
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Xuất biểu mẫu biên bản bàn giao & số Serial/IMEI kèm bảo hành chính hãng
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                            title="In trực tiếp ra máy in A4"
                        >
                            <Printer size={14} />
                            <span>In A4</span>
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
                        className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-md w-full max-w-[760px] text-xs font-sans leading-relaxed border border-slate-200"
                        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                    >
                        {/* Company Header */}
                        <div className="pb-3 border-b-2" style={{ borderColor: brandColor }}>
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1 flex-1">
                                    <h1 className="font-black text-sm sm:text-base tracking-wide" style={{ color: brandColor }}>
                                        {companyName}
                                    </h1>
                                    {companyAddress && (
                                        <p className="text-[11px] text-slate-600">
                                            Địa chỉ: {companyAddress}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-600 pt-0.5">
                                        {companyPhone && <span>Hotline: <strong>{companyPhone}</strong></span>}
                                        {companyEmail && <span>Email: {companyEmail}</span>}
                                        {companyWebsite && <span>Website: {companyWebsite}</span>}
                                    </div>
                                    {companyTax && (
                                        <p className="text-[11px] text-slate-600">
                                            Mã số thuế: <strong>{companyTax}</strong>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Document Title */}
                        <div className="text-center my-4 space-y-1">
                            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider" style={{ color: brandColor }}>
                                BIÊN BẢN BÀN GIAO THIẾT BỊ & BẢNG KÊ SERIAL / IMEI
                            </h2>
                            <p className="text-[11px] text-slate-500 italic">
                                (Kèm theo Hóa đơn bán hàng số: <strong>{invoice.code}</strong> • Ngày lập: {formatDate(invoice.issueDate || invoice.date || invoice.createdAt)})
                            </p>
                        </div>

                        {/* Customer & Handover Meta */}
                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-[11px]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                <div>
                                    <span className="text-slate-500">Đơn vị nhận bàn giao: </span>
                                    <strong className="text-slate-900 font-bold">{invoice.customer?.name || 'Khách hàng cá nhân'}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-500">Thời gian bàn giao: </span>
                                    <span className="font-semibold text-slate-800">{formatDate(new Date())}</span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-500">Địa chỉ giao hàng: </span>
                                    <span className="text-slate-800">{invoice.customer?.address || invoice.customer?.shippingAddress || invoice.customer?.billingAddress || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Người nhận / Liên hệ: </span>
                                    <span className="font-semibold text-slate-800">
                                        {invoice.customer?.contactName || invoice.customer?.contacts?.[0]?.name || '-'} 
                                        {(invoice.customer?.phone || invoice.customer?.contacts?.[0]?.phone) && ` (${invoice.customer?.phone || invoice.customer?.contacts?.[0]?.phone})`}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Đơn hàng tham chiếu: </span>
                                    <span className="font-mono font-semibold text-slate-800">{invoice.order?.code || invoice.code}</span>
                                </div>
                            </div>
                        </div>

                        {/* Serials Table - Chuyên nghiệp, chỉ lấy tên sản phẩm, không lấy chi tiết thông số */}
                        <div className="mt-4 overflow-hidden rounded-lg border border-slate-300">
                            <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                    <tr className="text-white uppercase font-bold text-[10px] tracking-wider" style={{ backgroundColor: brandColor }}>
                                        <th className="py-2.5 px-2 text-center w-10 border border-slate-300">STT</th>
                                        <th className="py-2.5 px-3 border border-slate-300">Tên Thiết Bị / Hàng Hóa</th>
                                        <th className="py-2.5 px-2 text-center w-14 border border-slate-300">ĐVT</th>
                                        <th className="py-2.5 px-2 text-center w-16 border border-slate-300">Số Lượng</th>
                                        <th className="py-2.5 px-3 border border-slate-300">Danh Sách Số Serial / IMEI Bàn Giao</th>
                                        <th className="py-2.5 px-2 text-center w-28 border border-slate-300">Tình Trạng & Bảo Hành</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {serialItems.map((item: any, idx: number) => {
                                        const snList = getSerialsList(item);
                                        // Chỉ lấy tên sản phẩm, không lấy chi tiết thông số
                                        const productName = item.productName || item.customName || item.product?.name || 'Sản phẩm';
                                        const isEven = idx % 2 === 1;

                                        return (
                                            <tr key={item.id || idx} className={isEven ? 'bg-slate-50/70' : 'bg-white'}>
                                                <td className="py-2.5 px-2 text-center font-mono text-slate-500 border border-slate-300">
                                                    {idx + 1}
                                                </td>
                                                <td className="py-2.5 px-3 font-bold text-slate-900 border border-slate-300">
                                                    {productName}
                                                </td>
                                                <td className="py-2.5 px-2 text-center text-slate-600 border border-slate-300">
                                                    {item.unit || item.product?.unit || 'Cái'}
                                                </td>
                                                <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900 border border-slate-300">
                                                    {Number(item.quantity) || snList.length || 1}
                                                </td>
                                                <td className="py-2.5 px-3 border border-slate-300">
                                                    {snList.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {snList.map((sn: string, sIdx: number) => (
                                                                <span 
                                                                    key={sIdx}
                                                                    className="inline-block font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-900"
                                                                >
                                                                    {sn}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Không có mã Serial</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-2 text-center text-[10px] text-slate-700 border border-slate-300">
                                                    <span className="font-semibold block" style={{ color: brandColor }}>
                                                        12 tháng
                                                    </span>
                                                    <span className="text-slate-400">BH điện tử</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="font-bold bg-teal-50/70 border-t-2 border-slate-300 text-slate-900">
                                        <td colSpan={3} className="py-2.5 px-3 text-right uppercase border border-slate-300">
                                            Tổng cộng thiết bị bàn giao:
                                        </td>
                                        <td className="py-2.5 px-2 text-center font-mono text-sm border border-slate-300" style={{ color: brandColor }}>
                                            {totalQty}
                                        </td>
                                        <td colSpan={2} className="py-2.5 px-3 border border-slate-300" style={{ color: brandColor }}>
                                            Tổng cộng: <strong>{totalSerialsCount}</strong> mã Serial / IMEI đã bàn giao
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Handover Terms & Commitments */}
                        <div className="mt-4 space-y-1.5 text-[11px] text-slate-700 leading-normal">
                            <p className="font-bold uppercase tracking-wide" style={{ color: brandColor }}>
                                Xác nhận bàn giao & cam kết bảo hành:
                            </p>
                            <p>1. Hai bên cùng tiến hành nghiệm thu, kiểm tra số lượng và số Serial/IMEI thực tế của toàn bộ thiết bị nêu trên.</p>
                            <p>2. Bên nhận xác nhận toàn bộ thiết bị nguyên vẹn, mới 100%, đúng chủng loại, đúng mã Serial/IMEI và hoạt động bình thường theo tiêu chuẩn kỹ thuật.</p>
                            <p>3. Thiết bị được áp dụng chính sách bảo hành chính hãng / bảo hành điện tử theo quy định của nhà cung cấp.</p>
                            <p>4. Biên bản này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để làm căn cứ bảo hành và quyết toán.</p>
                        </div>

                        {/* Signature Block */}
                        <div className="mt-8 pt-2 grid grid-cols-2 gap-8 text-center text-xs">
                            <div className="space-y-1">
                                <p className="font-bold uppercase text-slate-900">
                                    ĐẠI DIỆN BÊN NHẬN (KHÁCH HÀNG)
                                </p>
                                <p className="text-[10px] text-slate-500 italic">
                                    (Ký, ghi rõ họ tên & đóng dấu)
                                </p>
                                <div className="h-20" />
                                <p className="font-bold text-slate-800">
                                    {invoice.customer?.contactName || ''}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="font-bold uppercase text-slate-900">
                                    ĐẠI DIỆN BÊN GIAO (KỸ THUẬT / GIAO HÀNG)
                                </p>
                                <p className="text-[10px] text-slate-500 italic">
                                    (Ký, ghi rõ họ tên)
                                </p>
                                <div className="h-20" />
                                <p className="font-bold text-slate-800">
                                    {invoice.creator?.name || ''}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
