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
    
    const stats = useMemo(() => {
        const total = invoices.length;
        const newCount = invoices.filter((i: any) => i.status === 'NEW').length;
        const importedCount = invoices.filter((i: any) => i.status === 'INVENTORY_IMPORTED').length;
        const debtCount = invoices.filter((i: any) => i.status === 'DEBT_RECORDED').length;
        const completedCount = invoices.filter((i: any) => i.status === 'COMPLETED').length;
        const totalValue = invoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0);
        return { total, newCount, importedCount, debtCount, completedCount, totalValue };
    }, [invoices]);

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
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-7 rounded-[24px] shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-50 opacity-60 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col gap-1.5">
                    <h2 className="text-[22px] font-black text-gray-800 tracking-tight">QUẢN LÝ HÓA ĐƠN ĐIỆN TỬ ĐẦU VÀO</h2>
                    <div className="flex items-center gap-2 font-semibold text-gray-500 text-[13px]">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-sm"></span>
                        Đồng bộ tự động từ Email Thuế của Doanh nghiệp
                    </div>
                </div>
                
                <div className="flex gap-3 relative z-10 w-full sm:w-auto mt-2 sm:mt-0">
                    <button 
                        onClick={handleManualScan} 
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold transition shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={18} className={isProcessing ? 'animate-spin' : ''} />
                        {isProcessing ? 'Đang khởi chạy...' : 'Quét Email Ngay'}
                    </button>
                    <Link href="/accounting/settings" className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-50 text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl hover:bg-gray-100 hover:text-indigo-600 hover:border-indigo-200 font-bold transition shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                        <Settings size={18} /> Cấu Hình
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div onClick={() => setStatusFilter('ALL')} className={`bg-white p-5 rounded-[20px] shadow-sm border ${statusFilter === 'ALL' ? 'border-gray-800 ring-1 ring-gray-800 bg-gray-50/50' : 'border-gray-100 hover:border-gray-300'} cursor-pointer transition-all flex items-center gap-4 group`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${statusFilter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-600 group-hover:bg-gray-100'}`}>
                        <FileText size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Tổng Hóa Đơn</p>
                        <h3 className="text-2xl font-black text-gray-900">{stats.total}</h3>
                    </div>
                </div>
                
                <div onClick={() => setStatusFilter('NEW')} className={`bg-white p-5 rounded-[20px] shadow-sm border ${statusFilter === 'NEW' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-blue-200'} cursor-pointer transition-all flex items-center gap-4 group`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${statusFilter === 'NEW' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
                        <PackagePlus size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">HĐ Mới (Chưa XL)</p>
                        <h3 className="text-2xl font-black text-gray-900">{stats.newCount}</h3>
                    </div>
                </div>

                <div onClick={() => setStatusFilter('INVENTORY_IMPORTED')} className={`bg-white p-5 rounded-[20px] shadow-sm border ${statusFilter === 'INVENTORY_IMPORTED' ? 'border-green-500 ring-1 ring-green-500 bg-green-50/50' : 'border-gray-100 hover:border-green-200'} cursor-pointer transition-all flex items-center gap-4 group`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${statusFilter === 'INVENTORY_IMPORTED' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 group-hover:bg-green-100'}`}>
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Đã Nhập Kho</p>
                        <h3 className="text-2xl font-black text-gray-900">{stats.importedCount}</h3>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-[20px] shadow-sm border border-indigo-100 flex items-center gap-4 relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 text-indigo-100/50">
                       <FileText size={80} />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm">
                        <div className="text-xl font-bold">₫</div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-indigo-500/80 uppercase tracking-wider mb-0.5">Dữ Liệu Kho Lưu Trữ</p>
                        <h3 className="text-[19px] font-black text-indigo-900">{formatVND(stats.totalValue)}</h3>
                    </div>
                </div>
            </div>

            {/* Filter controls */}
            <div className="bg-white p-4 sm:p-5 rounded-[20px] shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
                <div className="flex-1 w-full xl:w-auto relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm Số HĐ, Tên Công ty, MST..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all font-medium placeholder-gray-400"
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 hover:border-indigo-300 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all flex-1 shadow-sm">
                            <span className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">Từ</span>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                                className="w-full text-sm font-semibold text-gray-700 bg-transparent border-none outline-none focus:ring-0 p-0"
                                style={{ colorScheme: 'light' }}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 hover:border-indigo-300 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all flex-1 shadow-sm">
                            <span className="text-[11px] font-bold text-gray-400 tracking-widest uppercase ml-1">Đến</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                                className="w-full text-sm font-semibold text-gray-700 bg-transparent border-none outline-none focus:ring-0 p-0"
                                style={{ colorScheme: 'light' }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-1 sm:flex-none gap-3">
                        <select 
                            value={monthFilter} 
                            onChange={e => setMonthFilter(e.target.value)}
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none bg-white shadow-sm hover:border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all"
                        >
                            <option value="ALL">Mọi thời gian</option>
                            {availableMonths.map(m => (
                                <option key={m} value={m}>Tháng {m.split('-')[1]}/{m.split('-')[0]}</option>
                            ))}
                        </select>

                        <select 
                            value={sortBy} 
                            onChange={e => setSortBy(e.target.value)}
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none bg-gray-50 shadow-sm hover:border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all"
                        >
                            <option value="DATE_DESC">Mới xuất ưu tiên</option>
                            <option value="DATE_ASC">Cũ xuất ưu tiên</option>
                            <option value="AMOUNT_DESC">Giá trị cao nhất</option>
                            <option value="AMOUNT_ASC">Giá trị thấp nhất</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-gray-100 text-gray-500">
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Ngày xuất</th>
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Số Hóa Đơn</th>
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px] min-w-[280px]">Nhà Cung Cấp</th>
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px]">Tổng Tiền</th>
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px] text-center">Trạng Thái</th>
                            <th className="px-5 py-4 font-bold uppercase tracking-wider text-[11px] text-right">Phân Bổ Định Khoản</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedInvoices.length === 0 && (
                             <tr>
                                 <td colSpan={6} className="text-center p-12">
                                     <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4 text-gray-400">
                                         <Search size={32} />
                                     </div>
                                     <p className="text-gray-500 font-medium">Chưa có hóa đơn nào phù hợp với bộ lọc hiện tại.</p>
                                 </td>
                             </tr>
                        )}
                    {paginatedInvoices.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-5 py-4">
                                <div className="font-semibold text-gray-700">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('vi-VN', {day: '2-digit', month:'2-digit', year:'numeric'}) : 'N/A'}</div>
                            </td>
                            <td className="px-5 py-4">
                                <div className="font-bold text-slate-800 flex items-center gap-2 font-mono text-[15px]">
                                    <FileText size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" /> {inv.invoiceNumber}
                                </div>
                            </td>
                            <td className="px-5 py-4 whitespace-normal">
                                {inv.supplierId ? (
                                    <Link href={`/suppliers/${inv.supplierId}`} className="text-indigo-700 hover:text-indigo-800 hover:underline font-bold block text-[13px] uppercase">
                                        {inv.supplierName}
                                    </Link>
                                ) : (
                                    <div className="font-bold text-slate-700 uppercase text-[13px]">{inv.supplierName}</div>
                                )}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">MST: {inv.supplierTaxCode}</div>
                                    {!inv.supplierId && (
                                         <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-bold px-2 py-0.5 rounded-md">
                                              <AlertCircle size={10}/> CHƯA MAP NCC
                                         </span>
                                    )}
                                    {inv.lookupLink && (
                                        <div className="text-[11px] font-semibold text-sky-600 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <a href={inv.lookupLink} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                                <Search size={10} /> Tra cứu (Mã: {inv.lookupCode || '-'})
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-5 py-4">
                                <div className="font-bold text-[15px] text-gray-900">{formatVND(inv.totalAmount)}</div>
                                <div className="text-xs font-medium text-gray-500">VAT: {formatVND(inv.taxAmount)}</div>
                                {inv.items?.some((i: any) => i.unitPriceDiscrepancy > 0) && (
                                     <div className="flex items-center gap-1 text-rose-600 text-[11px] mt-2 font-bold bg-rose-50 border border-rose-100 px-2 py-1 rounded w-fit capitalize">
                                         <AlertCircle size={12}/> Vượt Trần Giá ({inv.items.filter((i:any) => i.unitPriceDiscrepancy > 0).length} SP)
                                     </div>
                                )}
                            </td>
                            <td className="px-5 py-4 font-medium">
                                <div className="flex justify-center flex-wrap gap-1.5 w-full max-w-[150px] mx-auto">
                                    {inv.status === 'NEW' && <span className="bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold w-full text-center tracking-wide">MỚI XUẤT</span>}
                                    {inv.status === 'INVENTORY_IMPORTED' && <span className="bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-lg text-xs font-bold w-full text-center tracking-wide">ĐÃ NHẬP KHO</span>}
                                    {inv.status === 'DEBT_RECORDED' && <span className="bg-purple-50 border border-purple-200 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-bold w-full text-center tracking-wide">ĐÃ TÍNH NỢ</span>}
                                    {inv.status === 'COMPLETED' && <span className="bg-gray-100 border border-gray-300 text-gray-700 px-2.5 py-1 flex items-center justify-center gap-1 rounded-lg text-xs font-bold w-full text-center tracking-wide"><CheckCircle size={12} className="text-green-500"/> HOÀN TẤT</span>}
                                </div>
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex gap-1.5 flex-wrap justify-end">
                                        <button
                                            onClick={() => setViewingInvoice(inv)}
                                            className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs font-bold shadow-sm bg-white"
                                            title="Xem bảng kê chi tiết"
                                        >
                                            <Eye size={14} /> Xem Kê
                                        </button>
                                        
                                        {inv.status !== 'COMPLETED' && (
                                            <div className="flex gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-100 shadow-inner">
                                                {inv.status !== 'DEBT_RECORDED' && (
                                                    <button 
                                                        onClick={() => handleImportInventory(inv.id, 'DEBT_ONLY')}
                                                        disabled={isProcessing}
                                                        className="px-3 py-1 bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 rounded-lg text-xs font-bold transition shadow-sm"
                                                        title="Chỉ Tính Nợ"
                                                    >
                                                        Tính Nợ
                                                    </button>
                                                )}
                                                {inv.status !== 'INVENTORY_IMPORTED' && (
                                                    <button 
                                                        onClick={() => handleImportInventory(inv.id, 'INVENTORY_ONLY')}
                                                        disabled={isProcessing}
                                                        className="px-3 py-1 bg-white text-green-600 border border-green-200 hover:bg-green-50 rounded-lg text-xs font-bold transition shadow-sm"
                                                        title="Chỉ Nhập Kho"
                                                    >
                                                        Nhập Kho
                                                    </button>
                                                )}
                                                {inv.status === 'NEW' && (
                                                    <button 
                                                        onClick={() => handleImportInventory(inv.id, 'BOTH')}
                                                        disabled={isProcessing}
                                                        className="flex items-center gap-1.5 px-4 py-1 bg-indigo-600 text-white border border-transparent rounded-lg hover:shadow-md hover:bg-indigo-700 hover:-translate-y-0.5 text-xs font-bold transition-all shadow-sm"
                                                        title="Thực hiện nhập kho và tính nợ ngay lập tức"
                                                    >
                                                        Cả Hai 🚀
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center justify-end gap-1.5">
                                        {inv.xmlUrl ? (
                                            <a href={inv.xmlUrl} download className="p-1 px-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:text-indigo-600 text-gray-500 inline-flex items-center gap-1 text-[11px] font-bold shadow-sm transition" title="Tải XML gốc">
                                                 <Download size={12}/> XML
                                            </a>
                                        ) : (
                                            <button 
                                                onClick={() => handleUploadClick(inv.id)}
                                                disabled={isProcessing}
                                                className="p-1.5 px-3 border border-blue-200 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 inline-flex items-center gap-1 text-[11px] font-bold shadow-sm transition" 
                                            >
                                                Tải Bản Gốc Lên
                                            </button>
                                        )}
                                        {inv.pdfUrl && (
                                            <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="p-1 px-3 border border-red-200 rounded-lg bg-white text-red-500 hover:bg-red-50 inline-flex items-center gap-1 text-[11px] font-bold shadow-sm transition" title="Xem Bản Thể Hiện PDF">
                                                 <FileText size={12}/> PDF
                                            </a>
                                        )}
                                        {inv.status === 'NEW' && (
                                            <button 
                                                onClick={() => handleDelete(inv.id)}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition ml-1"
                                                title="Xóa vĩnh viễn hóa đơn mồ côi này"
                                            >
                                                <Trash size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                        <td colSpan={3} className="px-5 py-4 font-bold text-gray-700 text-right uppercase tracking-wider text-xs">Tổng cộng ({totalItems} Hóa đơn):</td>
                        <td className="px-5 py-4 font-black text-indigo-700 text-[16px]">
                            <div>{formatVND(totalMatchedAmount)}</div>
                            <div className="text-xs text-indigo-500 font-bold mt-0.5">Thuế VAT: {formatVND(totalMatchedTax)}</div>
                        </td>
                        <td colSpan={2}></td>
                    </tr>
                </tfoot>
            </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex flex-wrap items-center justify-between p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-[24px]">
                <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                    <div className="flex items-center gap-2">
                        <span>Hiển thị:</span>
                        <select 
                            value={pageSize}
                            onChange={(e) => setPageSize(e.target.value)}
                            className="bg-white border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-gray-700 shadow-sm"
                        >
                            <option value="25">25 dòng</option>
                            <option value="50">50 dòng</option>
                            <option value="75">75 dòng</option>
                            <option value="100">100 dòng</option>
                            <option value="ALL">Tất cả</option>
                        </select>
                    </div>
                    <span>
                        Đang xem <strong className="text-indigo-600">{(currentPage - 1) * numPageSize + (totalItems > 0 ? 1 : 0)} - {Math.min(currentPage * numPageSize, totalItems)}</strong> trong tổng số <strong className="text-gray-900">{totalItems}</strong> hóa đơn
                    </span>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-4 py-2 border rounded-xl bg-white font-bold text-xs uppercase tracking-wider text-gray-600 hover:bg-gray-50 hover:text-indigo-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-600 shadow-sm transition-all"
                        >
                            Trước
                        </button>
                        
                        <div className="flex gap-1.5 px-3">
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
                                            className={`w-9 h-9 flex items-center justify-center rounded-xl border text-sm font-bold shadow-sm transition-all ${currentPage === pageNum ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white border-transparent' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
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
                            className="px-4 py-2 border rounded-xl bg-white font-bold text-xs uppercase tracking-wider text-gray-600 hover:bg-gray-50 hover:text-indigo-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-600 shadow-sm transition-all"
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
