'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, CheckCircle, PackagePlus, AlertCircle, RefreshCw, Settings, Eye, X, Search, Filter, Trash } from 'lucide-react';
import { importInventoryFromInvoice, triggerManualScan, uploadInvoiceFiles, deleteInvoice, assignInvoiceSupplier, autoReassignAllInvoices } from './actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InvoiceDashboardClient({ initialInvoices, suppliers = [] }: { initialInvoices: any[]; suppliers?: any[] }) {
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
             if (res.success) {
                 alert(`Quá trình quét hoàn tất! Đã tải về ${res.count || 0} hóa đơn điện tử mới.`);
                 router.refresh();
             } else {
                 alert(res.error || "Không thể quét hóa đơn. Vui lòng kiểm tra lại cấu hình IMAP.");
             }
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

    const handleReassignSupplier = async (invoiceId: string, supplierId: string) => {
        setIsProcessing(true);
        try {
            await assignInvoiceSupplier(invoiceId, supplierId || null);
            const selectedSup = suppliers.find(s => s.id === supplierId);
            setInvoices(invoices.map(i => {
                if (i.id === invoiceId) {
                    return {
                        ...i,
                        supplierId: supplierId || null,
                        supplierName: selectedSup ? selectedSup.name : i.supplierName,
                        supplier: selectedSup || null
                    };
                }
                return i;
            }));
            if (viewingInvoice && viewingInvoice.id === invoiceId) {
                setViewingInvoice({
                    ...viewingInvoice,
                    supplierId: supplierId || null,
                    supplierName: selectedSup ? selectedSup.name : viewingInvoice.supplierName,
                    supplier: selectedSup || null
                });
            }
            alert("Cập nhật phân bổ Nhà Cung Cấp thành công!");
            router.refresh();
        } catch (e: any) {
            alert(e.message || "Lỗi khi gán Nhà Cung Cấp");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAutoReassignAll = async () => {
        if (!confirm("Hệ thống sẽ tự động quét lại toàn bộ hóa đơn và phân bổ chuẩn xác vào đúng Nhà Cung Cấp theo MST và Tên chuẩn. Bạn có chắc chắn?")) return;
        setIsProcessing(true);
        try {
            const res = await autoReassignAllInvoices();
            alert(`Hoàn tất! Đã tự động chuẩn hóa và phân bổ lại cho ${res.updatedCount || 0} hóa đơn.`);
            router.refresh();
        } catch (e: any) {
            alert(e.message || "Lỗi khi phân bổ tự động");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-5">
            <input 
                type="file" 
                ref={fileInputRef} 
                multiple 
                accept=".xml,.pdf"
                className="hidden" 
                onChange={handleFileChange} 
            />
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                            <FileText size={18} />
                        </div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                            Quản Lý Hóa Đơn Điện Tử Đầu Vào
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 font-medium text-slate-500 text-xs mt-1.5 ml-11">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Đồng bộ tự động từ Email Thuế của Doanh nghiệp</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2.5 flex-wrap">
                    <button 
                        onClick={handleManualScan} 
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={13} className={isProcessing ? 'animate-spin' : ''} />
                        <span>{isProcessing ? 'Đang quét...' : 'Quét Email Ngay'}</span>
                    </button>

                    <button 
                        onClick={handleAutoReassignAll} 
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-60"
                        title="Tự động so khớp lại MST và Tên để gán đúng Nhà Cung Cấp cho các hóa đơn"
                    >
                        <CheckCircle size={14} className="text-emerald-600" />
                        <span>Phân Bổ Lại NCC</span>
                    </button>

                    <Link 
                        href="/accounting/settings" 
                        className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all"
                    >
                        <Settings size={14} className="text-slate-500" />
                        <span>Cấu Hình</span>
                    </Link>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total Invoices */}
                <div 
                    onClick={() => setStatusFilter('ALL')} 
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        statusFilter === 'ALL' 
                            ? 'bg-slate-50/80 border-slate-400 ring-2 ring-slate-400/20 shadow-xs' 
                            : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Tổng Hóa Đơn
                        </p>
                        <h3 className="text-2xl font-bold font-mono text-slate-900">
                            {stats.total}
                        </h3>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/60">
                        <FileText size={20} />
                    </div>
                </div>
                
                {/* Card 2: New Invoices */}
                <div 
                    onClick={() => setStatusFilter('NEW')} 
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        statusFilter === 'NEW' 
                            ? 'bg-amber-50/40 border-amber-400 ring-2 ring-amber-400/20 shadow-xs' 
                            : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            HĐ Mới (Chưa XL)
                        </p>
                        <h3 className="text-2xl font-bold font-mono text-amber-600">
                            {stats.newCount}
                        </h3>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                        <PackagePlus size={20} />
                    </div>
                </div>

                {/* Card 3: Inventory Imported */}
                <div 
                    onClick={() => setStatusFilter('INVENTORY_IMPORTED')} 
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        statusFilter === 'INVENTORY_IMPORTED' 
                            ? 'bg-emerald-50/40 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs' 
                            : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            Đã Nhập Kho
                        </p>
                        <h3 className="text-2xl font-bold font-mono text-emerald-600">
                            {stats.importedCount}
                        </h3>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                        <CheckCircle size={20} />
                    </div>
                </div>

                {/* Card 4: Total Storage Value */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Dữ Liệu Kho Lưu Trữ
                        </p>
                        <h3 className="text-xl font-bold text-slate-900 font-mono">
                            {formatVND(stats.totalValue)}
                        </h3>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg font-mono border border-slate-200/60">
                        ₫
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
                {/* Search Bar */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo số HĐ, tên nhà cung cấp, MST..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all"
                    />
                </div>
                
                {/* Date & Dropdown Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-wrap">
                    {/* Date Pickers */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 flex-1 sm:w-36 focus-within:bg-white focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 transition-all">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Từ</span>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                                className="w-full text-xs font-semibold text-slate-700 bg-transparent border-none outline-none p-0"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 flex-1 sm:w-36 focus-within:bg-white focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 transition-all">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Đến</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                                className="w-full text-xs font-semibold text-slate-700 bg-transparent border-none outline-none p-0"
                            />
                        </div>
                    </div>

                    {/* Month Filter */}
                    <select 
                        value={monthFilter} 
                        onChange={e => setMonthFilter(e.target.value)}
                        className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200 focus:border-slate-400 cursor-pointer shadow-xs transition-all"
                    >
                        <option value="ALL">Mọi thời gian</option>
                        {availableMonths.map(m => (
                            <option key={m} value={m}>Tháng {m.split('-')[1]}/{m.split('-')[0]}</option>
                        ))}
                    </select>

                    {/* Sort Filter */}
                    <select 
                        value={sortBy} 
                        onChange={e => setSortBy(e.target.value)}
                        className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200 focus:border-slate-400 cursor-pointer shadow-xs transition-all"
                    >
                        <option value="DATE_DESC">Mới xuất ưu tiên</option>
                        <option value="DATE_ASC">Cũ xuất ưu tiên</option>
                        <option value="AMOUNT_DESC">Giá trị cao nhất</option>
                        <option value="AMOUNT_ASC">Giá trị thấp nhất</option>
                    </select>
                </div>
            </div>

            {/* Invoices Table Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">Ngày xuất</th>
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">Số Hóa Đơn</th>
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px] min-w-[280px]">Nhà Cung Cấp</th>
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">Tổng Tiền</th>
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px] text-center">Trạng Thái</th>
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Phân Bổ Định Khoản</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 px-4">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 mb-3 border border-slate-100">
                                            <Search size={22} />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-500">Chưa có hóa đơn nào phù hợp với bộ lọc hiện tại.</p>
                                    </td>
                                </tr>
                            )}
                            {paginatedInvoices.map((inv: any) => (
                                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors group">
                                    {/* Date */}
                                    <td className="px-4 py-3.5">
                                        <div className="font-semibold text-slate-700 font-mono text-xs">
                                            {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('vi-VN', {day: '2-digit', month:'2-digit', year:'numeric'}) : 'N/A'}
                                        </div>
                                    </td>

                                    {/* Invoice Number */}
                                    <td className="px-4 py-3.5">
                                        <div className="font-bold text-slate-900 flex items-center gap-2 font-mono text-xs">
                                            <FileText size={15} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                                            <span>{inv.invoiceNumber}</span>
                                        </div>
                                    </td>

                                    {/* Supplier Info */}
                                    <td className="px-4 py-3.5 whitespace-normal">
                                        {inv.supplierId ? (
                                            <Link href={`/suppliers/${inv.supplierId}`} className="text-emerald-700 hover:text-emerald-800 hover:underline font-bold block text-xs uppercase">
                                                {inv.supplierName}
                                            </Link>
                                        ) : (
                                            <div className="font-bold text-slate-800 uppercase text-xs">{inv.supplierName}</div>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70 font-mono">
                                                MST: {inv.supplierTaxCode}
                                            </div>
                                            {!inv.supplierId && (
                                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                    <AlertCircle size={10} /> Chưa map NCC
                                                </span>
                                            )}
                                            {inv.lookupLink && (
                                                <a 
                                                    href={inv.lookupLink} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-[10px] font-semibold text-sky-600 bg-sky-50 border border-sky-100 hover:bg-sky-100 px-1.5 py-0.5 rounded flex items-center gap-1 transition"
                                                >
                                                    <Search size={10} />
                                                    <span>Tra cứu ({inv.lookupCode || '-'})</span>
                                                </a>
                                            )}
                                        </div>
                                    </td>

                                    {/* Total Amount & VAT */}
                                    <td className="px-4 py-3.5">
                                        <div className="font-bold text-xs text-slate-900 font-mono">{formatVND(inv.totalAmount)}</div>
                                        <div className="text-[11px] font-medium text-slate-400 font-mono mt-0.5">VAT: {formatVND(inv.taxAmount)}</div>
                                        {inv.items?.some((i: any) => i.unitPriceDiscrepancy > 0) && (
                                            <div className="inline-flex items-center gap-1 text-rose-600 text-[10px] mt-1 font-bold bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                                                <AlertCircle size={10} /> Vượt Trần Giá ({inv.items.filter((i:any) => i.unitPriceDiscrepancy > 0).length} SP)
                                            </div>
                                        )}
                                    </td>

                                    {/* Status Badge */}
                                    <td className="px-4 py-3.5 text-center">
                                        <div className="flex justify-center">
                                            {inv.status === 'NEW' && (
                                                <span className="bg-blue-50 border border-blue-200/80 text-blue-700 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                                                    MỚI XUẤT
                                                </span>
                                            )}
                                            {inv.status === 'INVENTORY_IMPORTED' && (
                                                <span className="bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                                                    ĐÃ NHẬP KHO
                                                </span>
                                            )}
                                            {inv.status === 'DEBT_RECORDED' && (
                                                <span className="bg-purple-50 border border-purple-200/80 text-purple-700 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                                                    ĐÃ TÍNH NỢ
                                                </span>
                                            )}
                                            {inv.status === 'COMPLETED' && (
                                                <span className="bg-slate-100 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider">
                                                    <CheckCircle size={11} className="text-emerald-600" /> HOÀN TẤT
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Action Buttons */}
                                    <td className="px-4 py-3.5 text-right">
                                        <div className="flex flex-col items-end gap-1.5">
                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                <button
                                                    onClick={() => setViewingInvoice(inv)}
                                                    className="bg-white text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition text-xs font-semibold shadow-xs"
                                                    title="Xem bảng kê chi tiết"
                                                >
                                                    <Eye size={13} />
                                                    <span>Xem Kê</span>
                                                </button>
                                                
                                                {inv.status !== 'COMPLETED' && (
                                                    <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200/80">
                                                        {inv.status !== 'DEBT_RECORDED' && (
                                                            <button 
                                                                onClick={() => handleImportInventory(inv.id, 'DEBT_ONLY')}
                                                                disabled={isProcessing}
                                                                className="px-2 py-1 bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 rounded-md text-[11px] font-bold transition shadow-xs"
                                                                title="Chỉ Tính Nợ"
                                                            >
                                                                Tính Nợ
                                                            </button>
                                                        )}
                                                        {inv.status !== 'INVENTORY_IMPORTED' && (
                                                            <button 
                                                                onClick={() => handleImportInventory(inv.id, 'INVENTORY_ONLY')}
                                                                disabled={isProcessing}
                                                                className="px-2 py-1 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-md text-[11px] font-bold transition shadow-xs"
                                                                title="Chỉ Nhập Kho"
                                                            >
                                                                Nhập Kho
                                                            </button>
                                                        )}
                                                        {inv.status === 'NEW' && (
                                                            <button 
                                                                onClick={() => handleImportInventory(inv.id, 'BOTH')}
                                                                disabled={isProcessing}
                                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold transition shadow-xs"
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
                                                    <a href={inv.xmlUrl} download className="px-2 py-1 bg-white border border-slate-200 rounded-md hover:border-emerald-300 hover:text-emerald-700 text-slate-500 inline-flex items-center gap-1 text-[10px] font-bold shadow-xs transition" title="Tải XML gốc">
                                                        <Download size={11}/> XML
                                                    </a>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleUploadClick(inv.id)}
                                                        disabled={isProcessing}
                                                        className="px-2 py-1 border border-blue-200 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 inline-flex items-center gap-1 text-[10px] font-bold shadow-xs transition" 
                                                    >
                                                        Tải Bản Gốc Lên
                                                    </button>
                                                )}
                                                {inv.pdfUrl && (
                                                    <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="px-2 py-1 border border-red-200 rounded-md bg-white text-red-500 hover:bg-red-50 inline-flex items-center gap-1 text-[10px] font-bold shadow-xs transition" title="Xem Bản Thể Hiện PDF">
                                                        <FileText size={11}/> PDF
                                                    </a>
                                                )}
                                                {inv.status === 'NEW' && (
                                                    <button 
                                                        onClick={() => handleDelete(inv.id)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition ml-0.5"
                                                        title="Xóa vĩnh viễn hóa đơn mồ côi này"
                                                    >
                                                        <Trash size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50/90 border-t border-slate-200">
                            <tr>
                                <td colSpan={3} className="px-4 py-3.5 font-bold text-slate-600 text-right uppercase tracking-wider text-xs">
                                    Tổng cộng ({totalItems} Hóa đơn):
                                </td>
                                <td className="px-4 py-3.5">
                                    <div className="font-extrabold text-emerald-700 text-sm font-mono">{formatVND(totalMatchedAmount)}</div>
                                    <div className="text-[11px] text-slate-500 font-semibold font-mono mt-0.5">Thuế VAT: {formatVND(totalMatchedTax)}</div>
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                {/* Pagination Toolbar */}
                <div className="flex flex-wrap items-center justify-between p-3.5 sm:p-4 border-t border-slate-200/90 bg-slate-50/50">
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <span>Hiển thị:</span>
                            <select 
                                value={pageSize}
                                onChange={(e) => setPageSize(e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-700 shadow-xs text-xs"
                            >
                                <option value="25">25 dòng</option>
                                <option value="50">50 dòng</option>
                                <option value="75">75 dòng</option>
                                <option value="100">100 dòng</option>
                                <option value="ALL">Tất cả</option>
                            </select>
                        </div>
                        <span>
                            Đang xem <strong className="text-emerald-700 font-mono">{(currentPage - 1) * numPageSize + (totalItems > 0 ? 1 : 0)} - {Math.min(currentPage * numPageSize, totalItems)}</strong> trong tổng số <strong className="text-slate-900 font-mono">{totalItems}</strong> hóa đơn
                        </span>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1 mt-2 sm:mt-0">
                            <button 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold text-[11px] uppercase tracking-wider text-slate-600 hover:bg-slate-50 hover:text-emerald-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 shadow-xs transition-all"
                            >
                                Trước
                            </button>
                            
                            <div className="flex gap-1 px-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = currentPage;
                                    if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;
                                    
                                    if (pageNum > 0 && pageNum <= totalPages) {
                                        return (
                                            <button 
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold font-mono transition-all ${
                                                    currentPage === pageNum 
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                                                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                                                }`}
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
                                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold text-[11px] uppercase tracking-wider text-slate-600 hover:bg-slate-50 hover:text-emerald-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 shadow-xs transition-all"
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice Viewer Modal */}
            {viewingInvoice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-2 text-slate-900">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900">Chi Tiết Hóa Đơn: <span className="font-mono text-emerald-700">{viewingInvoice.invoiceNumber}</span></h3>
                                </div>
                            </div>
                            <button 
                                onClick={() => setViewingInvoice(null)} 
                                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 p-1.5 rounded-lg transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tên Nhà Cung Cấp Trên HĐ</p>
                                    <p className="font-bold text-xs text-slate-900 uppercase mt-0.5">{viewingInvoice.supplierName}</p>
                                </div>
                                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mã Số Thuế Trên HĐ</p>
                                    <p className="font-bold text-xs text-slate-900 font-mono mt-0.5">{viewingInvoice.supplierTaxCode}</p>
                                </div>

                                <div className="sm:col-span-2 bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Phân Bổ Nhà Cung Cấp Hệ Thống:</label>
                                        {viewingInvoice.supplierId ? (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <CheckCircle size={11} /> Đã map NCC
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <AlertCircle size={11} /> Chưa map NCC
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <select
                                            value={viewingInvoice.supplierId || ''}
                                            onChange={(e) => handleReassignSupplier(viewingInvoice.id, e.target.value)}
                                            disabled={isProcessing}
                                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 shadow-xs"
                                        >
                                            <option value="">-- Chưa gán Nhà Cung Cấp (Bỏ gán) --</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    [{s.code}] {s.name} {s.taxCode ? `(MST: ${s.taxCode})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ngày Lập Hóa Đơn</p>
                                    <p className="font-bold text-xs text-slate-800 font-mono mt-0.5">{viewingInvoice.issueDate ? new Date(viewingInvoice.issueDate).toLocaleDateString('vi-VN') : 'N/A'}</p>
                                </div>
                                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Tiền Thanh Toán</p>
                                    <p className="font-extrabold text-sm text-rose-600 font-mono mt-0.5">{formatVND(viewingInvoice.totalAmount)}</p>
                                </div>
                                {viewingInvoice.lookupLink && (
                                    <div className="sm:col-span-2 bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl space-y-1">
                                        <h5 className="font-bold text-emerald-900 text-xs">Thông tin tra cứu hóa đơn gốc:</h5>
                                        <p className="text-xs text-slate-600"><strong>Link tra cứu:</strong> <a href={viewingInvoice.lookupLink} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-semibold">{viewingInvoice.lookupLink}</a></p>
                                        {viewingInvoice.lookupCode && <p className="text-xs text-slate-600"><strong>Mã tra cứu:</strong> <span className="font-mono bg-white px-2 py-0.5 border rounded text-slate-800 font-bold">{viewingInvoice.lookupCode}</span></p>}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Chi Tiết Hàng Hóa / Dịch Vụ</h4>
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs whitespace-nowrap">
                                        <thead className="bg-slate-100/90 text-slate-600 text-[11px] font-bold uppercase">
                                            <tr>
                                                <th className="p-2.5 border-r border-slate-200 w-12 text-center">STT</th>
                                                <th className="p-2.5 border-r border-slate-200">Tên Hàng Hóa</th>
                                                <th className="p-2.5 border-r border-slate-200 text-right w-24">Số Lượng</th>
                                                <th className="p-2.5 border-r border-slate-200 text-right w-32">Đơn Giá</th>
                                                <th className="p-2.5 text-right w-32">Thành Tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {viewingInvoice.items && viewingInvoice.items.length > 0 ? (
                                                viewingInvoice.items.map((item: any, idx: number) => (
                                                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                                                        <td className="p-2.5 border-r border-slate-200 text-center text-slate-400 font-mono">{idx + 1}</td>
                                                        <td className="p-2.5 border-r border-slate-200 font-medium text-slate-800">{item.productName}</td>
                                                        <td className="p-2.5 border-r border-slate-200 text-right font-mono font-semibold text-slate-700">{item.quantity}</td>
                                                        <td className="p-2.5 border-r border-slate-200 text-right font-mono text-slate-700">{formatVND(item.unitPrice)}</td>
                                                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatVND(item.totalPrice)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="p-6 text-center text-slate-400 font-medium">
                                                        Không có chi tiết hàng hóa hoặc chưa trích xuất được.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
                            {viewingInvoice.xmlUrl && (
                                <a href={viewingInvoice.xmlUrl} download target="_blank" rel="noreferrer" className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition flex items-center gap-1.5 shadow-xs">
                                    <Download size={14} /> Tải XML Gốc
                                </a>
                            )}
                            {viewingInvoice.pdfUrl && (
                                <a href={viewingInvoice.pdfUrl} target="_blank" rel="noreferrer" className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-100 transition flex items-center gap-1.5 shadow-xs">
                                    <FileText size={14} /> Xem PDF Gốc
                                </a>
                            )}
                            <button 
                                onClick={() => setViewingInvoice(null)} 
                                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
