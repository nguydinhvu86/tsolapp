'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, CheckCircle, PackagePlus, AlertCircle, RefreshCw, Settings, Eye, X, Search, Filter, Trash } from 'lucide-react';
import { importInventoryFromInvoice, triggerManualScan, uploadInvoiceFiles, deleteInvoice } from './actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InvoiceDashboardClient({ initialInvoices }: { initialInvoices: any[] }) {
    const [invoices, setInvoices] = useState(initialInvoices);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        setInvoices(initialInvoices);
    }, [initialInvoices]);
    const [viewingInvoice, setViewingInvoice] = useState<any>(null);
    const router = useRouter();

    // Filters and Sorting State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [monthFilter, setMonthFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('DATE_DESC');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState('25');

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, monthFilter, sortBy, pageSize, startDate, endDate]);

    // Extract available months from dataset
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        invoices.forEach(i => {
             if (i.issueDate) {
                 const d = new Date(i.issueDate);
                 months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
             }
        });
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [invoices]);

    // Derived processed items
    const processedInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = !term || 
                (inv.invoiceNumber?.toLowerCase().includes(term)) || 
                (inv.supplierName?.toLowerCase().includes(term)) || 
                (inv.supplierTaxCode?.toLowerCase().includes(term));
            
            const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
            
            let matchesMonth = true;
            if (monthFilter !== 'ALL' && inv.issueDate) {
                const d = new Date(inv.issueDate);
                const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                matchesMonth = m === monthFilter;
            }

            let matchesDateBounds = true;
            if (startDate && inv.issueDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                if (new Date(inv.issueDate) < sDate) matchesDateBounds = false;
            }
            if (endDate && inv.issueDate) {
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                if (new Date(inv.issueDate) > eDate) matchesDateBounds = false;
            }

            return matchesSearch && matchesStatus && matchesMonth && matchesDateBounds;
        }).sort((a, b) => {
            if (sortBy === 'DATE_DESC') return new Date(b.issueDate || 0).getTime() - new Date(a.issueDate || 0).getTime();
            if (sortBy === 'DATE_ASC') return new Date(a.issueDate || 0).getTime() - new Date(b.issueDate || 0).getTime();
            if (sortBy === 'AMOUNT_DESC') return b.totalAmount - a.totalAmount;
            if (sortBy === 'AMOUNT_ASC') return a.totalAmount - b.totalAmount;
            return 0;
        });
    }, [invoices, searchTerm, statusFilter, monthFilter, sortBy, startDate, endDate]);

    // Pagination Logic
    const totalItems = processedInvoices.length;
    const isAll = pageSize === 'ALL';
    const numPageSize = isAll ? (totalItems > 0 ? totalItems : 1) : parseInt(pageSize);
    const totalPages = Math.ceil(totalItems / numPageSize);
    
    const paginatedInvoices = isAll ? processedInvoices : processedInvoices.slice((currentPage - 1) * numPageSize, currentPage * numPageSize);

    // Compute active totals
    const totalMatchedAmount = processedInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalMatchedTax = processedInvoices.reduce((sum, inv) => sum + (inv.taxAmount || 0), 0);

    const formatVND = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    const handleImportInventory = async (invoiceId: string, actionType: 'DEBT_ONLY' | 'INVENTORY_ONLY' | 'BOTH') => {
         let msg = '';
         if (actionType === 'BOTH') msg = "Hệ thống sẽ tự động tạo Hóa Đơn Mua Hàng, ghi nhận Công Nợ Nhà CC và Nhập Kho. Bạn có chắc chắn?";
         else if (actionType === 'DEBT_ONLY') msg = "Xác nhận CHỈ Tính Nợ (Bỏ qua thao tác Nhập Kho) cho chứng từ này?";
         else msg = "Xác nhận CHỈ Nhập Kho (Bỏ qua thao tác Ghi Góp Nợ) cho chứng từ này?";

         if (!confirm(msg)) return;
         setIsProcessing(true);
         try {
             await importInventoryFromInvoice(invoiceId, actionType, 'W-0001');
             alert(`Thao tác thành công!`);
             
             // Update local state proactively
             setInvoices(invoices.map(i => {
                 if (i.id === invoiceId) {
                     let nextStatus = 'INVENTORY_IMPORTED';
                     if (actionType === 'DEBT_ONLY') nextStatus = 'DEBT_RECORDED';
                     if (actionType === 'BOTH') nextStatus = 'COMPLETED';
                     if (i.status === 'DEBT_RECORDED' && actionType === 'INVENTORY_ONLY') nextStatus = 'COMPLETED';
                     if (i.status === 'INVENTORY_IMPORTED' && actionType === 'DEBT_ONLY') nextStatus = 'COMPLETED';
                     return { ...i, status: nextStatus };
                 }
                 return i;
             }));
             router.refresh();
         } catch (e: any) {
             alert(e.message || "Có lỗi xảy ra trong quá trình đồng bộ (Local)");
         } finally {
             setIsProcessing(false);
         }
    };

    const handleManualScan = async () => {
         setIsProcessing(true);
         try {
             const res = await triggerManualScan();
             alert(`Quá trình quét hoàn tất. Đã tải về ${res.count} hóa đơn điện tử mới.`);
             router.refresh();
         } catch (e: any) {
             alert(e.message || "Lỗi. Vui lòng kiểm tra lại cấu hình IMAP.");
         } finally {
             setIsProcessing(false);
         }
    };

    const handleDelete = async (invoiceId: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa vĩnh viễn hóa đơn này không? Hành động này không thể hoàn tác.")) return;
        
        setIsProcessing(true);
        try {
            await deleteInvoice(invoiceId);
            setInvoices(invoices.filter(inv => inv.id !== invoiceId));
        } catch (e: any) {
            alert(e.message || "Lỗi khi xóa hóa đơn.");
        } finally {
            setIsProcessing(false);
        }
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploadingInvoiceId, setUploadingInvoiceId] = useState<string | null>(null);

    const handleUploadClick = (invoiceId: string) => {
         setUploadingInvoiceId(invoiceId);
         fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
         const files = e.target.files;
         if (!files || files.length === 0 || !uploadingInvoiceId) return;

         const xmlFile = Array.from(files).find(f => f.name.toLowerCase().endsWith('.xml'));
         const pdfFile = Array.from(files).find(f => f.name.toLowerCase().endsWith('.pdf'));

         if (!xmlFile) {
             alert("Vui lòng chọn ít nhất 1 file XML gốc của hóa đơn!");
             e.target.value = '';
             return;
         }

         const formData = new FormData();
         formData.append('xmlFile', xmlFile);
         if (pdfFile) formData.append('pdfFile', pdfFile);

         setIsProcessing(true);
         try {
             await uploadInvoiceFiles(uploadingInvoiceId, formData);
             alert("Tải lên hóa đơn thành công! Hệ thống đã tự động bóc tách lại toàn bộ dữ liệu.");
             e.target.value = '';
             router.refresh();
         } catch (err: any) {
             alert(err.message || "Có lỗi xảy ra khi xử lý file tải lên.");
             e.target.value = '';
         } finally {
             setIsProcessing(false);
             setUploadingInvoiceId(null);
         }
    };

    return (
        <div className="space-y-4">
            <input 
                type="file" 
                ref={fileInputRef} 
                multiple 
                accept=".xml,.pdf"
                className="hidden" 
                onChange={handleFileChange} 
            />
            
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">Quản Lý Hóa Đơn VAT Điện Tử</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={handleManualScan} 
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50 font-medium transition disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} />
                        {isProcessing ? 'Đang Quét...' : 'Quét Email Ngay'}
                    </button>
                    <Link href="/accounting/settings" className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium transition">
                        <Settings size={16} /> Cấu Hình
                    </Link>
                </div>
            </div>

            {/* Filter controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm Số HĐ, Tên NCC, MST..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                    />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    
                    <div className="flex items-center gap-1 border rounded-lg bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-100">
                         <span className="text-xs text-gray-400">Từ</span>
                         <input 
                              type="date" 
                              value={startDate} 
                              onChange={e => setStartDate(e.target.value)} 
                              className="text-sm outline-none bg-transparent"
                         />
                         <span className="text-xs text-gray-400 ml-1">Đến</span>
                         <input 
                              type="date" 
                              value={endDate} 
                              onChange={e => setEndDate(e.target.value)} 
                              className="text-sm outline-none bg-transparent"
                         />
                    </div>

                    <select 
                        value={monthFilter} 
                        onChange={e => setMonthFilter(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm outline-none bg-white"
                    >
                        <option value="ALL">Tất cả thời gian</option>
                        {availableMonths.map(m => (
                            <option key={m} value={m}>Tháng {m.split('-')[1]}/{m.split('-')[0]}</option>
                        ))}
                    </select>

                    <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm outline-none bg-white"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="NEW">Mới xuất / Chưa nhập kho</option>
                        <option value="INVENTORY_IMPORTED">Đã nhập kho</option>
                    </select>

                    <select 
                        value={sortBy} 
                        onChange={e => setSortBy(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm outline-none bg-white"
                    >
                        <option value="DATE_DESC">Mới nhất tới cũ nhất</option>
                        <option value="DATE_ASC">Cũ nhất tới mới nhất</option>
                        <option value="AMOUNT_DESC">Tổng tiền giảm dần</option>
                        <option value="AMOUNT_ASC">Tổng tiền tăng dần</option>
                    </select>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b bg-gray-50">
                        <th className="p-3">Ngày xuất</th>
                        <th className="p-3">Số Hóa Đơn</th>
                        <th className="p-3">Nhà Cung Cấp</th>
                        <th className="p-3">Tổng Tiền</th>
                        <th className="p-3">Trạng Thái</th>
                        <th className="p-3 text-right">Thao Tác</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedInvoices.length === 0 && (
                         <tr><td colSpan={6} className="text-center p-6 text-gray-500">Chưa có hóa đơn nào phù hợp với bộ lọc</td></tr>
                    )}
                    {paginatedInvoices.map((inv: any) => (
                        <tr key={inv.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                                {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-3 font-semibold text-indigo-600 flex items-center gap-2">
                                <FileText size={16}/> {inv.invoiceNumber}
                            </td>
                            <td className="p-3">
                                {inv.supplierId ? (
                                    <Link href={`/suppliers/${inv.supplierId}`} className="text-indigo-600 hover:underline font-medium block">
                                        {inv.supplierName}
                                    </Link>
                                ) : (
                                    <div className="font-medium text-gray-800">{inv.supplierName}</div>
                                )}
                                <div className="text-xs text-gray-500">MST: {inv.supplierTaxCode}</div>
                                {!inv.supplierId && (
                                     <span className="inline-flex items-center gap-1 text-red-500 text-xs mt-1">
                                          <AlertCircle size={12}/> Chưa map NCC
                                     </span>
                                )}
                                {inv.lookupLink && (
                                    <div className="mt-2 text-xs text-indigo-600 bg-indigo-50 p-1.5 rounded inline-block">
                                        <a href={inv.lookupLink} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                            <Search size={12} /> Link tra cứu
                                        </a>
                                        {inv.lookupCode && <span className="font-semibold ml-1">Mã: {inv.lookupCode}</span>}
                                    </div>
                                )}
                            </td>
                            <td className="p-3">
                                <div>{formatVND(inv.totalAmount)}</div>
                                <div className="text-xs text-gray-400">Thuế: {formatVND(inv.taxAmount)}</div>
                                {inv.items?.some((i: any) => i.unitPriceDiscrepancy > 0) && (
                                     <div className="flex items-center gap-1 text-red-600 text-xs mt-2 font-medium bg-red-50 p-1 px-2 rounded w-fit" title="Cảnh báo: Giá trên hóa đơn cao hơn đơn giá thỏa thuận trên Đơn đặt hàng">
                                         <AlertCircle size={12}/> Chênh giá quá quy định ({inv.items.filter((i:any) => i.unitPriceDiscrepancy > 0).length} SP)
                                     </div>
                                )}
                            </td>
                            <td className="p-3">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setViewingInvoice(inv)}
                                        className="text-gray-600 hover:text-indigo-600 border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                                        title="Xem Chi Tiết Màng Hình Hóa Đơn"
                                    >
                                        <Eye size={16} /> Xem
                                    </button>
                                    {inv.status === 'NEW' && (
                                        <button 
                                            onClick={() => handleDelete(inv.id)}
                                            className="text-red-600 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                                            title="Xóa hóa đơn"
                                        >
                                            <Trash size={16} />
                                        </button>
                                    )}
                                    {inv.status === 'NEW' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Mới tải về</span>}
                                    {inv.status === 'INVENTORY_IMPORTED' && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Đã Nhập Kho (Chưa Nợ)</span>}
                                    {inv.status === 'DEBT_RECORDED' && <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">Đã Tính Nợ (Chưa Kho)</span>}
                                    {inv.status === 'COMPLETED' && <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs px-4">HOÀN TẤT</span>}
                                </div>
                            </td>
                            <td className="p-3 text-right flex items-center justify-end gap-1">
                                {inv.status !== 'COMPLETED' && (
                                     <div className="flex gap-1 items-center">
                                         {inv.status !== 'DEBT_RECORDED' && (
                                              <button 
                                                  onClick={() => handleImportInventory(inv.id, 'DEBT_ONLY')}
                                                  disabled={isProcessing}
                                                  className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded text-xs transition"
                                                  title="Chỉ Tính Nợ"
                                              >
                                                  Tính Nợ
                                              </button>
                                         )}
                                         {inv.status !== 'INVENTORY_IMPORTED' && (
                                              <button 
                                                  onClick={() => handleImportInventory(inv.id, 'INVENTORY_ONLY')}
                                                  disabled={isProcessing}
                                                  className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded text-xs transition"
                                                  title="Chỉ Nhập Kho"
                                              >
                                                  Nhập Kho
                                              </button>
                                         )}
                                         {inv.status === 'NEW' && (
                                              <button 
                                                  onClick={() => handleImportInventory(inv.id, 'BOTH')}
                                                  disabled={isProcessing}
                                                  className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs transition"
                                                  title="Làm Cả Hai Tự Động"
                                              >
                                                  Cả Hai 🚀
                                              </button>
                                         )}
                                     </div>
                                )}
                                <div className="flex flex-col gap-1 items-end ml-2">
                                    {inv.xmlUrl ? (
                                        <a href={inv.xmlUrl} download className="p-1 px-2 border rounded hover:bg-gray-100 text-gray-600 inline-flex items-center gap-1 text-xs" title="Tải XML">
                                             <Download size={12}/> XML
                                        </a>
                                    ) : (
                                        <button 
                                            onClick={() => handleUploadClick(inv.id)}
                                            disabled={isProcessing}
                                            className="p-1 px-2 border border-blue-200 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 inline-flex items-center gap-1 text-xs font-medium cursor-pointer" 
                                            title="Tải File XML/PDF Lên"
                                        >
                                            Chưa có file -&gt; Tải Lên Đính Kèm
                                        </button>
                                    )}
                                    {inv.pdfUrl && (
                                        <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="p-1 px-2 border border-red-200 rounded bg-red-50 hover:bg-red-100 text-red-600 inline-flex items-center gap-1 text-xs" title="Xem/Tải PDF">
                                             <FileText size={12}/> PDF
                                        </a>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-indigo-50/10 border-t border-gray-200">
                    <tr>
                        <td colSpan={3} className="p-3 font-semibold text-gray-700 text-right">Tổng cộng ({totalItems} HĐ):</td>
                        <td className="p-3 font-bold text-indigo-700">
                            <div>{formatVND(totalMatchedAmount)}</div>
                            <div className="text-xs text-indigo-500 font-normal">Thuế: {formatVND(totalMatchedTax)}</div>
                        </td>
                        <td colSpan={2}></td>
                    </tr>
                </tfoot>
            </table>
            
            {/* Pagination Controls */}
            <div className="flex flex-wrap items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <span>Hiển thị:</span>
                        <select 
                            value={pageSize}
                            onChange={(e) => setPageSize(e.target.value)}
                            className="bg-white border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="25">25 dòng</option>
                            <option value="50">50 dòng</option>
                            <option value="75">75 dòng</option>
                            <option value="100">100 dòng</option>
                            <option value="ALL">Tất cả</option>
                        </select>
                    </div>
                    <span>
                        Đang xem {(currentPage - 1) * numPageSize + (totalItems > 0 ? 1 : 0)} - {Math.min(currentPage * numPageSize, totalItems)} trong tổng số {totalItems} hóa đơn
                    </span>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1 border rounded bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
                        >
                            Trước
                        </button>
                        
                        <div className="flex gap-1 px-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Simple logic to show a window of pages around current page
                                let pageNum = currentPage;
                                if (currentPage <= 3) pageNum = i + 1;
                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = currentPage - 2 + i;
                                
                                if (pageNum > 0 && pageNum <= totalPages) {
                                    return (
                                        <button 
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 flex items-center justify-center rounded border ${currentPage === pageNum ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                }
                                return null;
                            })}
                        </div>

                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-3 py-1 border rounded bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
                        >
                            Sau
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* INVOICE VIEWER MODAL */}
        {viewingInvoice && (
            <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                        <div className="flex items-center gap-2 text-indigo-700">
                            <FileText size={20} />
                            <h3 className="font-bold text-lg">Hóa Đơn: {viewingInvoice.invoiceNumber}</h3>
                        </div>
                        <button onClick={() => setViewingInvoice(null)} className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-lg">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <p className="text-sm text-gray-500">Tên Nhà Cung Cấp</p>
                                <p className="font-semibold">{viewingInvoice.supplierName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Mã Số Thuế</p>
                                <p className="font-semibold">{viewingInvoice.supplierTaxCode}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Ngày Lập Hóa Đơn</p>
                                <p className="font-semibold">{viewingInvoice.issueDate ? new Date(viewingInvoice.issueDate).toLocaleDateString('vi-VN') : 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Tổng Tiền Thanh Toán</p>
                                <p className="font-bold text-red-600">{formatVND(viewingInvoice.totalAmount)}</p>
                            </div>
                            {viewingInvoice.lookupLink && (
                                <div className="col-span-2 mt-2 bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                                    <h5 className="font-semibold text-indigo-800 text-sm mb-1">Thông tin tra cứu hóa đơn gốc:</h5>
                                    <p className="text-sm"><strong>Link:</strong> <a href={viewingInvoice.lookupLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{viewingInvoice.lookupLink}</a></p>
                                    {viewingInvoice.lookupCode && <p className="text-sm mt-1"><strong>Mã Số Tra Cứu:</strong> <span className="font-mono bg-white px-2 py-0.5 border rounded">{viewingInvoice.lookupCode}</span></p>}
                                </div>
                            )}
                        </div>

                        <h4 className="font-bold mb-3 border-b pb-2">Chi Tiết Hàng Hóa / Dịch Vụ</h4>
                        <table className="w-full text-left text-sm border">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 border-r w-12 text-center">STT</th>
                                    <th className="p-2 border-r">Tên Hàng Hóa</th>
                                    <th className="p-2 border-r text-right w-24">Số Lượng</th>
                                    <th className="p-2 border-r text-right w-32">Đơn Giá</th>
                                    <th className="p-2 text-right w-32">Thành Tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viewingInvoice.items && viewingInvoice.items.length > 0 ? (
                                    viewingInvoice.items.map((item: any, idx: number) => (
                                        <tr key={item.id || idx} className="border-t">
                                            <td className="p-2 border-r text-center text-gray-500">{idx + 1}</td>
                                            <td className="p-2 border-r font-medium">{item.productName}</td>
                                            <td className="p-2 border-r text-right">{item.quantity}</td>
                                            <td className="p-2 border-r text-right">{formatVND(item.unitPrice)}</td>
                                            <td className="p-2 text-right">{formatVND(item.totalPrice)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-4 text-center text-gray-500">
                                            Không có chi tiết hàng hóa hoặc chưa trích xuất được.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-xl">
                        {viewingInvoice.xmlUrl && (
                            <a href={viewingInvoice.xmlUrl} download target="_blank" rel="noreferrer" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition flex items-center gap-2">
                                <Download size={16} /> Tải XML Gốc
                            </a>
                        )}
                        {viewingInvoice.pdfUrl && (
                            <a href={viewingInvoice.pdfUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition flex items-center gap-2">
                                <FileText size={16} /> Xem PDF Gốc
                            </a>
                        )}
                        <button onClick={() => setViewingInvoice(null)} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
}
