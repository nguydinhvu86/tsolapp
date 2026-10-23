'use client';

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useEffect, useMemo } from 'react';
import {
    FileText, Download, CheckCircle, PackagePlus, AlertCircle, RefreshCw,
    Settings, Eye, X, Search, Trash, BarChart3, PieChart, Building2,
    Calendar, ArrowUpDown, RotateCcw, TrendingUp, Wallet, ChevronDown,
    ExternalLink, Upload, Layers, CheckCircle2
} from 'lucide-react';
import {
    importInventoryFromInvoice,
    triggerManualScan,
    uploadInvoiceFiles,
    deleteInvoice,
    assignInvoiceSupplier,
    autoReassignAllInvoices
} from './actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InvoiceDashboardClient({
    initialInvoices,
    suppliers = []
}: {
    initialInvoices: any[];
    suppliers?: any[];
}) {
    const [invoices, setInvoices] = useState(initialInvoices);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCharts, setShowCharts] = useState(true);

    useEffect(() => {
        setInvoices(initialInvoices);
    }, [initialInvoices]);

    const [viewingInvoice, setViewingInvoice] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setViewingInvoice(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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
            if (sortBy === 'AMOUNT_DESC') return (b.totalAmount || 0) - (a.totalAmount || 0);
            if (sortBy === 'AMOUNT_ASC') return (a.totalAmount || 0) - (b.totalAmount || 0);
            return 0;
        });
    }, [invoices, searchTerm, statusFilter, monthFilter, sortBy, startDate, endDate]);

    // Pagination Logic
    const totalItems = processedInvoices.length;
    const isAll = pageSize === 'ALL';
    const numPageSize = isAll ? (totalItems > 0 ? totalItems : 1) : parseInt(pageSize);
    const totalPages = Math.ceil(totalItems / numPageSize);

    const paginatedInvoices = isAll
        ? processedInvoices
        : processedInvoices.slice((currentPage - 1) * numPageSize, currentPage * numPageSize);

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
        const totalTax = invoices.reduce((sum: number, inv: any) => sum + (inv.taxAmount || 0), 0);
        const unmappedCount = invoices.filter((i: any) => !i.supplierId).length;
        return { total, newCount, importedCount, debtCount, completedCount, totalValue, totalTax, unmappedCount };
    }, [invoices]);

    // Analytics Data 1: Monthly Spend & VAT Trend (Last 6 available months in chronological order)
    const monthlyChartData = useMemo(() => {
        const map = new Map<string, { month: string; label: string; totalAmount: number; taxAmount: number; count: number }>();
        invoices.forEach((inv: any) => {
            if (!inv.issueDate) return;
            const d = new Date(inv.issueDate);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `T${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
            const cur = map.get(key) || { month: key, label, totalAmount: 0, taxAmount: 0, count: 0 };
            cur.totalAmount += inv.totalAmount || 0;
            cur.taxAmount += inv.taxAmount || 0;
            cur.count += 1;
            map.set(key, cur);
        });
        const sorted = Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
        return sorted.slice(-6);
    }, [invoices]);

    const maxMonthlyAmount = useMemo(() => {
        return Math.max(...monthlyChartData.map(d => d.totalAmount), 1);
    }, [monthlyChartData]);

    // Analytics Data 2: Top 5 Suppliers by Spend
    const topSuppliersData = useMemo(() => {
        const map = new Map<string, { name: string; taxCode: string; totalAmount: number; count: number }>();
        invoices.forEach((inv: any) => {
            const key = inv.supplierTaxCode || inv.supplierName || 'UNKNOWN';
            const cur = map.get(key) || {
                name: inv.supplierName || 'Chưa xác định',
                taxCode: inv.supplierTaxCode || '',
                totalAmount: 0,
                count: 0
            };
            cur.totalAmount += inv.totalAmount || 0;
            cur.count += 1;
            map.set(key, cur);
        });
        return Array.from(map.values())
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5);
    }, [invoices]);

    const maxSupplierAmount = useMemo(() => {
        return Math.max(...topSuppliersData.map(s => s.totalAmount), 1);
    }, [topSuppliersData]);

    // Analytics Data 3: Status Breakdown for SVG Donut
    const statusBreakdown = useMemo(() => {
        const total = Math.max(stats.total, 1);
        const items = [
            { key: 'NEW', label: 'Mới xuất (Chưa XL)', count: stats.newCount, color: '#3b82f6', bgClass: 'bg-blue-500', textClass: 'text-blue-600' },
            { key: 'INVENTORY_IMPORTED', label: 'Đã nhập kho', count: stats.importedCount, color: '#10b981', bgClass: 'bg-emerald-500', textClass: 'text-emerald-600' },
            { key: 'DEBT_RECORDED', label: 'Đã tính nợ', count: stats.debtCount, color: '#8b5cf6', bgClass: 'bg-purple-500', textClass: 'text-purple-600' },
            { key: 'COMPLETED', label: 'Hoàn tất đồng bộ', count: stats.completedCount, color: '#0f172a', bgClass: 'bg-slate-900', textClass: 'text-slate-800' },
        ];
        let cumulativePercent = 0;
        return items.map(item => {
            const percent = (item.count / total) * 100;
            const startOffset = cumulativePercent;
            cumulativePercent += percent;
            return { ...item, percent, startOffset };
        });
    }, [stats]);

    const formatVND = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

    const formatShortVND = (val: number) => {
        if (!val) return '0 ₫';
        if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)} tỷ`;
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} tr`;
        if (val >= 1_000) return `${Math.round(val / 1_000)}k`;
        return `${val} ₫`;
    };

    const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ALL' || monthFilter !== 'ALL' || startDate !== '' || endDate !== '' || sortBy !== 'DATE_DESC';

    const resetAllFilters = () => {
        setSearchTerm('');
        setStatusFilter('ALL');
        setMonthFilter('ALL');
        setStartDate('');
        setEndDate('');
        setSortBy('DATE_DESC');
    };

    const handleImportInventory = async (invoiceId: string, actionType: 'DEBT_ONLY' | 'INVENTORY_ONLY' | 'BOTH') => {
        let msg = '';
        if (actionType === 'BOTH') msg = 'Hệ thống sẽ tự động tạo Hóa Đơn Mua Hàng, ghi nhận Công Nợ Nhà CC và Nhập Kho. Bạn có chắc chắn?';
        else if (actionType === 'DEBT_ONLY') msg = 'Xác nhận CHỈ Tính Nợ (Bỏ qua thao tác Nhập Kho) cho chứng từ này?';
        else msg = 'Xác nhận CHỈ Nhập Kho (Bỏ qua thao tác Ghi Góp Nợ) cho chứng từ này?';

        if (!confirm(msg)) return;
        setIsProcessing(true);
        try {
            await importInventoryFromInvoice(invoiceId, actionType, 'W-0001');
            toast.success('Thao tác thành công!');

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
            toast.error(e.message || 'Có lỗi xảy ra trong quá trình đồng bộ (Local)');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualScan = async () => {
        setIsProcessing(true);
        try {
            const res = await triggerManualScan();
            if (res.success) {
                toast.success(`Quá trình quét hoàn tất! Đã tải về ${res.count || 0} hóa đơn điện tử mới.`);
                router.refresh();
            } else {
                toast.error(res.error || 'Không thể quét hóa đơn. Vui lòng kiểm tra lại cấu hình IMAP.');
            }
        } catch (e: any) {
            toast.error(e.message || 'Lỗi. Vui lòng kiểm tra lại cấu hình IMAP.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (invoiceId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn hóa đơn này không? Hành động này không thể hoàn tác.')) return;

        setIsProcessing(true);
        try {
            await deleteInvoice(invoiceId);
            setInvoices(invoices.filter(inv => inv.id !== invoiceId));
        } catch (e: any) {
            toast.error(e.message || 'Lỗi khi xóa hóa đơn.');
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
            toast.warning('Vui lòng chọn ít nhất 1 file XML gốc của hóa đơn!');
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('xmlFile', xmlFile);
        if (pdfFile) formData.append('pdfFile', pdfFile);

        setIsProcessing(true);
        try {
            await uploadInvoiceFiles(uploadingInvoiceId, formData);
            toast.success('Tải lên hóa đơn thành công! Hệ thống đã tự động bóc tách lại toàn bộ dữ liệu.');
            e.target.value = '';
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || 'Có lỗi xảy ra khi xử lý file tải lên.');
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
            toast.success('Cập nhật phân bổ Nhà Cung Cấp thành công!');
            router.refresh();
        } catch (e: any) {
            toast.error(e.message || 'Lỗi khi gán Nhà Cung Cấp');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAutoReassignAll = async () => {
        if (!confirm('Hệ thống sẽ tự động quét lại toàn bộ hóa đơn và phân bổ chuẩn xác vào đúng Nhà Cung Cấp theo MST và Tên chuẩn. Bạn có chắc chắn?')) return;
        setIsProcessing(true);
        try {
            const res = await autoReassignAllInvoices();
            toast.success(`Hoàn tất! Đã tự động chuẩn hóa và phân bổ lại cho ${res.updatedCount || 0} hóa đơn.`);
            router.refresh();
        } catch (e: any) {
            toast.error(e.message || 'Lỗi khi phân bổ tự động');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-5 font-sans text-slate-800 pb-8">
            <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".xml,.pdf"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* 1. Standard ERP Page Header */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                            <FileText size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                    Kế Toán & Thuế
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    IMAP Auto-Sync
                                </span>
                                {stats.unmappedCount > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md">
                                        <AlertCircle size={11} />
                                        {stats.unmappedCount} HĐ chưa gán NCC
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2.5 mt-1">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight m-0">
                                    Quản Lý Hóa Đơn Điện Tử Đầu Vào
                                </h1>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full tabular-nums">
                                    {stats.total} chứng từ
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 m-0">
                                Tự động bóc tách XML/PDF từ email thuế, đối chiếu nhà cung cấp, nhập kho và hạch toán công nợ
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setShowCharts(prev => !prev)}
                            className={`inline-flex items-center gap-1.5 h-[36px] px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                showCharts
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/70'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <BarChart3 size={14} className={showCharts ? 'text-indigo-600' : 'text-slate-500'} />
                            <span>{showCharts ? 'Ẩn Biểu Đồ' : 'Hiện Biểu Đồ'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleAutoReassignAll}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 h-[36px] bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-3 rounded-lg text-xs font-semibold transition-all disabled:opacity-60 cursor-pointer"
                            title="Tự động so khớp lại MST và Tên để gán đúng Nhà Cung Cấp cho các hóa đơn"
                        >
                            <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                            <span>Phân Bổ Lại NCC</span>
                        </button>

                        <Link
                            href="/accounting/settings"
                            className="inline-flex items-center gap-1.5 h-[36px] bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-3 rounded-lg text-xs font-semibold transition-all no-underline"
                        >
                            <Settings size={14} className="text-slate-500 shrink-0" />
                            <span>Cấu Hình</span>
                        </Link>

                        <button
                            type="button"
                            onClick={handleManualScan}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 h-[36px] bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-60 cursor-pointer border-none"
                        >
                            <RefreshCw size={13} className={isProcessing ? 'animate-spin' : ''} />
                            <span>{isProcessing ? 'Đang quét...' : 'Quét Email Ngay'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Card 1: Total Invoices */}
                <div
                    onClick={() => setStatusFilter('ALL')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        statusFilter === 'ALL'
                            ? 'bg-indigo-50/40 border-indigo-400 ring-2 ring-indigo-500/15 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Tổng Hóa Đơn
                        </p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-2xl font-bold text-slate-900 tabular-nums m-0">
                                {stats.total}
                            </h3>
                            <span className="text-[11px] font-medium text-slate-500">
                                ({availableMonths.length} tháng)
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Nhấn để xem toàn bộ chứng từ
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
                        <FileText size={19} />
                    </div>
                </div>

                {/* Card 2: New Invoices */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'NEW' ? 'ALL' : 'NEW')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        statusFilter === 'NEW'
                            ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-500/15 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            HĐ Mới (Chưa Xử Lý)
                        </p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-2xl font-bold text-amber-600 tabular-nums m-0">
                                {stats.newCount}
                            </h3>
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                {stats.total > 0 ? `${Math.round((stats.newCount / stats.total) * 100)}%` : '0%'}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Chờ nhập kho hoặc hạch toán nợ
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shrink-0">
                        <PackagePlus size={19} />
                    </div>
                </div>

                {/* Card 3: Processed / Imported */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'INVENTORY_IMPORTED' ? 'ALL' : 'INVENTORY_IMPORTED')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        statusFilter === 'INVENTORY_IMPORTED'
                            ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-500/15 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Đã Nhập Kho / Xử Lý
                        </p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-2xl font-bold text-emerald-600 tabular-nums m-0">
                                {stats.importedCount + stats.completedCount}
                            </h3>
                            <span className="text-[11px] font-medium text-slate-500">
                                ({stats.debtCount} đã tính nợ)
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Đã đồng bộ tồn kho & công nợ
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60 shrink-0">
                        <CheckCircle2 size={19} />
                    </div>
                </div>

                {/* Card 4: Total Value & VAT */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider m-0">
                            Tổng Giá Trị Lưu Trữ
                        </p>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums truncate mt-1 m-0" title={formatVND(stats.totalValue)}>
                            {formatVND(stats.totalValue)}
                        </h3>
                        <p className="text-[11px] font-medium text-emerald-700 tabular-nums mt-1 m-0">
                            Thuế VAT: {formatVND(stats.totalTax)}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/70 shrink-0">
                        <Wallet size={19} />
                    </div>
                </div>
            </div>

            {/* 3. Visual Analytics Charts Section */}
            {showCharts && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Chart 1: Monthly Spend & VAT Trend (5 cols) */}
                    <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <TrendingUp size={15} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0">
                                            Xu Hướng Giá Trị Mua Vào Theo Tháng
                                        </h3>
                                        <p className="text-[11px] text-slate-500 m-0">
                                            Nhấn vào cột tháng để lọc nhanh danh sách hóa đơn
                                        </p>
                                    </div>
                                </div>
                                {monthFilter !== 'ALL' && (
                                    <button
                                        type="button"
                                        onClick={() => setMonthFilter('ALL')}
                                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border-none cursor-pointer"
                                    >
                                        Bỏ lọc tháng
                                    </button>
                                )}
                            </div>

                            {monthlyChartData.length === 0 ? (
                                <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                                    Chưa có dữ liệu hóa đơn theo tháng
                                </div>
                            ) : (
                                <div className="pt-4 pb-1 px-1">
                                    <div className="h-40 flex items-end justify-between gap-2.5 border-b border-slate-100 pb-2">
                                        {monthlyChartData.map(item => {
                                            const heightPct = Math.max(Math.round((item.totalAmount / maxMonthlyAmount) * 100), 8);
                                            const vatPct = item.totalAmount > 0 ? Math.min(Math.round((item.taxAmount / item.totalAmount) * 100), 100) : 0;
                                            const isSelected = monthFilter === item.month;
                                            return (
                                                <div
                                                    key={item.month}
                                                    onClick={() => setMonthFilter(isSelected ? 'ALL' : item.month)}
                                                    className="flex-1 flex flex-col items-center group cursor-pointer h-full justify-end"
                                                    title={`Tháng ${item.label}: ${formatVND(item.totalAmount)} (VAT: ${formatVND(item.taxAmount)} - ${item.count} HĐ)`}
                                                >
                                                    <span className={`text-[10px] font-bold tabular-nums mb-1 transition-colors ${
                                                        isSelected ? 'text-indigo-700' : 'text-slate-500 group-hover:text-slate-900'
                                                    }`}>
                                                        {formatShortVND(item.totalAmount)}
                                                    </span>
                                                    <div className="w-full max-w-[38px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-28 p-0.5">
                                                        <div
                                                            style={{ height: `${heightPct}%` }}
                                                            className={`w-full rounded-t-md transition-all relative flex flex-col justify-end overflow-hidden ${
                                                                isSelected
                                                                    ? 'bg-indigo-600 shadow-sm'
                                                                    : 'bg-indigo-500/85 group-hover:bg-indigo-600'
                                                            }`}
                                                        >
                                                            {vatPct > 0 && (
                                                                <div
                                                                    style={{ height: `${Math.max(vatPct, 12)}%` }}
                                                                    className="w-full bg-emerald-400/90 border-t border-white/20"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={`text-[11px] font-semibold tabular-nums mt-1.5 ${
                                                        isSelected ? 'text-indigo-700 font-bold underline' : 'text-slate-600'
                                                    }`}>
                                                        {item.label}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 tabular-nums">
                                                        {item.count} HĐ
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500 border-t border-slate-100 mt-2">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block" />
                                    Tổng thanh toán
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400 inline-block" />
                                    Thuế GTGT (VAT)
                                </span>
                            </div>
                            <span className="font-semibold text-slate-700 tabular-nums">
                                6 tháng gần nhất
                            </span>
                        </div>
                    </div>

                    {/* Chart 2: Status Distribution Donut & Breakdown (3 cols) */}
                    <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <PieChart size={15} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0">
                                        Cơ Cấu Trạng Thái
                                    </h3>
                                    <p className="text-[11px] text-slate-500 m-0">
                                        Tiến độ định khoản chứng từ
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center my-2">
                                <div className="relative w-28 h-28 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <circle
                                            cx="18"
                                            cy="18"
                                            r="14"
                                            fill="transparent"
                                            stroke="#f1f5f9"
                                            strokeWidth="4.2"
                                        />
                                        {statusBreakdown.map(seg => {
                                            if (seg.count === 0) return null;
                                            const circumference = 2 * Math.PI * 14;
                                            const strokeDasharray = `${(seg.percent / 100) * circumference} ${circumference}`;
                                            const strokeDashoffset = -((seg.startOffset / 100) * circumference);
                                            return (
                                                <circle
                                                    key={seg.key}
                                                    cx="18"
                                                    cy="18"
                                                    r="14"
                                                    fill="transparent"
                                                    stroke={seg.color}
                                                    strokeWidth="4.2"
                                                    strokeDasharray={strokeDasharray}
                                                    strokeDashoffset={strokeDashoffset}
                                                    className="transition-all duration-300 cursor-pointer hover:opacity-80"
                                                    onClick={() => setStatusFilter(statusFilter === seg.key ? 'ALL' : seg.key)}
                                                />
                                            );
                                        })}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                                        <span className="text-base font-bold text-slate-900 tabular-nums leading-none">
                                            {stats.total}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                                            Hóa đơn
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5 mt-2">
                                {statusBreakdown.map(seg => {
                                    const active = statusFilter === seg.key;
                                    return (
                                        <div
                                            key={seg.key}
                                            onClick={() => setStatusFilter(active ? 'ALL' : seg.key)}
                                            className={`flex items-center justify-between px-2 py-1 rounded-lg text-xs cursor-pointer transition-colors ${
                                                active ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.bgClass}`} />
                                                <span className="text-slate-700 truncate text-[11px]">{seg.label}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                                                <span className={`text-xs font-bold ${seg.textClass}`}>{seg.count}</span>
                                                <span className="text-[10px] text-slate-400">
                                                    ({Math.round(seg.percent)}%)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Tỷ lệ đã xử lý:</span>
                            <span className="font-bold text-emerald-600 tabular-nums">
                                {stats.total > 0
                                    ? `${Math.round(((stats.total - stats.newCount) / stats.total) * 100)}%`
                                    : '0%'}
                            </span>
                        </div>
                    </div>

                    {/* Chart 3: Top 5 Suppliers by Spend (4 cols) */}
                    <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Building2 size={15} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider m-0">
                                            Top 5 Nhà Cung Cấp Lớn Nhất
                                        </h3>
                                        <p className="text-[11px] text-slate-500 m-0">
                                            Nhấn vào nhà cung cấp để lọc hóa đơn
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {topSuppliersData.length === 0 ? (
                                <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                                    Chưa có dữ liệu nhà cung cấp
                                </div>
                            ) : (
                                <div className="space-y-2.5 mt-2">
                                    {topSuppliersData.map((sup, idx) => {
                                        const widthPct = Math.max(Math.round((sup.totalAmount / maxSupplierAmount) * 100), 6);
                                        const isSearchingThis = searchTerm.toLowerCase() === (sup.taxCode || sup.name).toLowerCase();
                                        return (
                                            <div
                                                key={sup.taxCode || idx}
                                                onClick={() => {
                                                    const key = sup.taxCode || sup.name;
                                                    setSearchTerm(isSearchingThis ? '' : key);
                                                }}
                                                className={`p-2 rounded-lg border transition-all cursor-pointer ${
                                                    isSearchingThis
                                                        ? 'bg-indigo-50/60 border-indigo-300'
                                                        : 'bg-slate-50/60 border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="w-4 h-4 rounded bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="font-semibold text-slate-800 truncate text-[11px]" title={sup.name}>
                                                            {sup.name}
                                                        </span>
                                                    </div>
                                                    <span className="font-bold text-slate-900 tabular-nums text-[11px] shrink-0">
                                                        {formatShortVND(sup.totalAmount)}
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                                    <div
                                                        style={{ width: `${widthPct}%` }}
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 tabular-nums">
                                                    <span>MST: {sup.taxCode || 'N/A'}</span>
                                                    <span>{sup.count} hóa đơn</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Tổng NCC đã giao dịch:</span>
                            <span className="font-bold text-slate-800 tabular-nums">
                                {new Set(invoices.map(i => i.supplierTaxCode || i.supplierName)).size} đơn vị
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Filter & Search Toolbar (Zero Double Borders, Clean Flex Containers) */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex flex-col xl:flex-row gap-2.5 items-stretch xl:items-center justify-between">
                    {/* Search Input Box (Flex layout to prevent icon overlap) */}
                    <div className="flex-1 flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-3 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                        <Search size={15} className="text-slate-400 shrink-0 mr-2" />
                        <input
                            type="text"
                            placeholder="Tìm theo số hóa đơn, tên nhà cung cấp, mã số thuế..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            className="w-full h-full text-xs font-medium text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none p-0"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-slate-400 hover:text-slate-600 ml-1.5 bg-transparent border-none cursor-pointer p-0.5 flex items-center"
                                title="Xóa từ khóa"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Right Side Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Date From */}
                        <div className="flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 gap-1.5 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                            <Calendar size={13} className="text-slate-400 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Từ</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                                className="text-xs font-semibold text-slate-700 bg-transparent border-none outline-none p-0 tabular-nums w-[112px]"
                            />
                        </div>

                        {/* Date To */}
                        <div className="flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 gap-1.5 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                            <Calendar size={13} className="text-slate-400 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Đến</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                                className="text-xs font-semibold text-slate-700 bg-transparent border-none outline-none p-0 tabular-nums w-[112px]"
                            />
                        </div>

                        {/* Month Select */}
                        <div className="relative flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                            <select
                                value={monthFilter}
                                onChange={e => setMonthFilter(e.target.value)}
                                style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                                className="appearance-none pr-5 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer h-full"
                            >
                                <option value="ALL">Tất cả các tháng</option>
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>
                                        Tháng {m.split('-')[1]}/{m.split('-')[0]}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={13} className="text-slate-400 pointer-events-none absolute right-2" />
                        </div>

                        {/* Sort Select */}
                        <div className="relative flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                            <ArrowUpDown size={13} className="text-slate-400 shrink-0 mr-1.5" />
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                                className="appearance-none pr-5 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer h-full"
                            >
                                <option value="DATE_DESC">Mới xuất ưu tiên</option>
                                <option value="DATE_ASC">Cũ xuất ưu tiên</option>
                                <option value="AMOUNT_DESC">Giá trị cao nhất</option>
                                <option value="AMOUNT_ASC">Giá trị thấp nhất</option>
                            </select>
                            <ChevronDown size={13} className="text-slate-400 pointer-events-none absolute right-2" />
                        </div>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetAllFilters}
                                className="inline-flex items-center gap-1 h-[36px] px-2.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 transition cursor-pointer"
                                title="Đặt lại toàn bộ bộ lọc"
                            >
                                <RotateCcw size={12} />
                                <span>Đặt lại</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Status Filter Pills */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-400 mr-1">Trạng thái:</span>
                        {[
                            { id: 'ALL', label: 'Tất cả', count: stats.total },
                            { id: 'NEW', label: 'Mới xuất', count: stats.newCount },
                            { id: 'INVENTORY_IMPORTED', label: 'Đã nhập kho', count: stats.importedCount },
                            { id: 'DEBT_RECORDED', label: 'Đã tính nợ', count: stats.debtCount },
                            { id: 'COMPLETED', label: 'Hoàn tất', count: stats.completedCount },
                        ].map(tab => {
                            const active = statusFilter === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setStatusFilter(tab.id)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                                        active
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                                        active ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="text-xs text-slate-500 tabular-nums">
                        Kết quả lọc: <strong className="text-slate-900">{totalItems}</strong> hóa đơn — Tổng cộng:{' '}
                        <strong className="text-indigo-700">{formatVND(totalMatchedAmount)}</strong>
                    </div>
                </div>
            </div>

            {/* 5. Invoices Data Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500">
                                <th className="px-3.5 py-3 font-bold uppercase tracking-wider text-[11px]">Ngày xuất</th>
                                <th className="px-3.5 py-3 font-bold uppercase tracking-wider text-[11px]">Số Hóa Đơn</th>
                                <th className="px-3.5 py-3 font-bold uppercase tracking-wider text-[11px] min-w-[280px]">Nhà Cung Cấp</th>
                                <th className="px-3.5 py-3 font-bold uppercase tracking-wider text-[11px] text-right">Tổng Tiền / VAT</th>
                                <th className="px-3.5 py-3 font-bold uppercase tracking-wider text-[11px] text-center">Trạng Thái</th>
                                <th className="px-3.5 py-3 font-bold uppercase tracking-wider text-[11px] text-right">Phân Bổ & Tệp Đính Kèm</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-14 px-4">
                                        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-slate-50 text-slate-400 mb-2.5 border border-slate-200/60">
                                            <Search size={20} />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-600 m-0">
                                            Không tìm thấy hóa đơn nào phù hợp với bộ lọc hiện tại.
                                        </p>
                                        {hasActiveFilters && (
                                            <button
                                                type="button"
                                                onClick={resetAllFilters}
                                                className="mt-2.5 text-xs font-semibold text-indigo-600 hover:underline bg-transparent border-none cursor-pointer"
                                            >
                                                Xóa bộ lọc để xem toàn bộ
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}
                            {paginatedInvoices.map((inv: any) => (
                                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors group">
                                    {/* Date */}
                                    <td className="px-3.5 py-3 align-middle">
                                        <div className="font-semibold text-slate-700 tabular-nums text-xs">
                                            {inv.issueDate
                                                ? new Date(inv.issueDate).toLocaleDateString('vi-VN', {
                                                      day: '2-digit',
                                                      month: '2-digit',
                                                      year: 'numeric'
                                                  })
                                                : 'N/A'}
                                        </div>
                                        {inv.items && inv.items.length > 0 && (
                                            <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                                                {inv.items.length} mặt hàng
                                            </div>
                                        )}
                                    </td>

                                    {/* Invoice Number */}
                                    <td className="px-3.5 py-3 align-middle">
                                        <button
                                            type="button"
                                            onClick={() => setViewingInvoice(inv)}
                                            className="font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1.5 tabular-nums text-xs bg-transparent border-none p-0 cursor-pointer transition-colors"
                                            title="Nhấn để xem chi tiết bảng kê"
                                        >
                                            <FileText size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                                            <span>{inv.invoiceNumber || '---'}</span>
                                        </button>
                                    </td>

                                    {/* Supplier Info */}
                                    <td className="px-3.5 py-3 whitespace-normal align-middle">
                                        {inv.supplierId ? (
                                            <Link
                                                href={`/suppliers/${inv.supplierId}`}
                                                className="text-slate-900 hover:text-indigo-600 hover:underline font-bold block text-xs leading-snug no-underline"
                                            >
                                                {inv.supplierName}
                                            </Link>
                                        ) : (
                                            <div className="font-bold text-slate-800 text-xs leading-snug">
                                                {inv.supplierName}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70 tabular-nums">
                                                MST: {inv.supplierTaxCode || '---'}
                                            </span>
                                            {!inv.supplierId ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingInvoice(inv)}
                                                    className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition"
                                                >
                                                    <AlertCircle size={10} /> Chưa map NCC
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                                    <CheckCircle size={10} /> Đã map NCC
                                                </span>
                                            )}
                                            {inv.lookupLink && (
                                                <a
                                                    href={inv.lookupLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/70 hover:bg-sky-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1 transition no-underline"
                                                >
                                                    <ExternalLink size={10} />
                                                    <span>Tra cứu ({inv.lookupCode || '-'})</span>
                                                </a>
                                            )}
                                        </div>
                                    </td>

                                    {/* Total Amount & VAT */}
                                    <td className="px-3.5 py-3 text-right align-middle">
                                        <div className="font-bold text-xs text-slate-900 tabular-nums">
                                            {formatVND(inv.totalAmount)}
                                        </div>
                                        <div className="text-[11px] font-medium text-slate-500 tabular-nums mt-0.5">
                                            VAT: {formatVND(inv.taxAmount)}
                                        </div>
                                        {inv.items?.some((i: any) => i.unitPriceDiscrepancy > 0) && (
                                            <div className="inline-flex items-center gap-1 text-rose-600 text-[10px] mt-1 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                                <AlertCircle size={10} /> Vượt trần giá ({inv.items.filter((i: any) => i.unitPriceDiscrepancy > 0).length} SP)
                                            </div>
                                        )}
                                    </td>

                                    {/* Status Badge */}
                                    <td className="px-3.5 py-3 text-center align-middle">
                                        <div className="flex justify-center">
                                            {inv.status === 'NEW' && (
                                                <span className="bg-blue-50 border border-blue-200/80 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                                                    Mới xuất
                                                </span>
                                            )}
                                            {inv.status === 'INVENTORY_IMPORTED' && (
                                                <span className="bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                                                    Đã nhập kho
                                                </span>
                                            )}
                                            {inv.status === 'DEBT_RECORDED' && (
                                                <span className="bg-purple-50 border border-purple-200/80 text-purple-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                                                    Đã tính nợ
                                                </span>
                                            )}
                                            {inv.status === 'COMPLETED' && (
                                                <span className="bg-slate-100 border border-slate-300 text-slate-800 px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1">
                                                    <CheckCircle size={11} className="text-emerald-600" /> Hoàn tất
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Action Buttons */}
                                    <td className="px-3.5 py-3 text-right align-middle">
                                        <div className="flex flex-col items-end gap-1.5">
                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingInvoice(inv)}
                                                    className="bg-white text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition text-xs font-semibold cursor-pointer"
                                                    title="Xem bảng kê chi tiết"
                                                >
                                                    <Eye size={13} />
                                                    <span>Xem Kê</span>
                                                </button>

                                                {inv.status !== 'COMPLETED' && (
                                                    <div className="inline-flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200/80">
                                                        {inv.status !== 'DEBT_RECORDED' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleImportInventory(inv.id, 'DEBT_ONLY')}
                                                                disabled={isProcessing}
                                                                className="px-2 py-1 bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 rounded-md text-[11px] font-semibold transition cursor-pointer"
                                                                title="Chỉ Tính Nợ"
                                                            >
                                                                Tính Nợ
                                                            </button>
                                                        )}
                                                        {inv.status !== 'INVENTORY_IMPORTED' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleImportInventory(inv.id, 'INVENTORY_ONLY')}
                                                                disabled={isProcessing}
                                                                className="px-2 py-1 bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-md text-[11px] font-semibold transition cursor-pointer"
                                                                title="Chỉ Nhập Kho"
                                                            >
                                                                Nhập Kho
                                                            </button>
                                                        )}
                                                        {inv.status === 'NEW' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleImportInventory(inv.id, 'BOTH')}
                                                                disabled={isProcessing}
                                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none rounded-md text-[11px] font-semibold transition cursor-pointer"
                                                                title="Thực hiện nhập kho và tính nợ ngay lập tức"
                                                            >
                                                                Cả Hai
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-end gap-1.5">
                                                {inv.xmlUrl ? (
                                                    <a
                                                        href={inv.xmlUrl}
                                                        download
                                                        className="px-2 py-0.5 bg-white border border-slate-200 rounded-md hover:border-emerald-300 hover:text-emerald-700 text-slate-600 inline-flex items-center gap-1 text-[10px] font-semibold transition no-underline"
                                                        title="Tải XML gốc"
                                                    >
                                                        <Download size={10} /> XML
                                                    </a>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUploadClick(inv.id)}
                                                        disabled={isProcessing}
                                                        className="px-2 py-0.5 border border-indigo-200 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 inline-flex items-center gap-1 text-[10px] font-semibold transition cursor-pointer"
                                                    >
                                                        <Upload size={10} /> Tải Bản Gốc
                                                    </button>
                                                )}
                                                {inv.pdfUrl && (
                                                    <a
                                                        href={inv.pdfUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-2 py-0.5 border border-rose-200 rounded-md bg-white text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1 text-[10px] font-semibold transition no-underline"
                                                        title="Xem Bản Thể Hiện PDF"
                                                    >
                                                        <FileText size={10} /> PDF
                                                    </a>
                                                )}
                                                {inv.status === 'NEW' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(inv.id)}
                                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition cursor-pointer bg-transparent"
                                                        title="Xóa vĩnh viễn hóa đơn này"
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
                                <td colSpan={3} className="px-3.5 py-3 font-bold text-slate-600 text-right uppercase tracking-wider text-xs">
                                    Tổng cộng ({totalItems} Hóa đơn):
                                </td>
                                <td className="px-3.5 py-3 text-right">
                                    <div className="font-bold text-emerald-700 text-sm tabular-nums">{formatVND(totalMatchedAmount)}</div>
                                    <div className="text-[11px] text-slate-500 font-semibold tabular-nums mt-0.5">
                                        Thuế VAT: {formatVND(totalMatchedTax)}
                                    </div>
                                </td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Pagination Toolbar */}
                <div className="flex flex-wrap items-center justify-between p-3.5 border-t border-slate-200/80 bg-slate-50/40 gap-3">
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                        <div className="flex items-center gap-1.5">
                            <span>Hiển thị:</span>
                            <div className="relative flex items-center bg-white border border-slate-200 rounded-lg px-2 h-[30px]">
                                <select
                                    value={pageSize}
                                    onChange={(e) => setPageSize(e.target.value)}
                                    style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                                    className="appearance-none pr-4 font-bold text-slate-700 text-xs bg-transparent border-none outline-none cursor-pointer h-full"
                                >
                                    <option value="25">25 dòng</option>
                                    <option value="50">50 dòng</option>
                                    <option value="75">75 dòng</option>
                                    <option value="100">100 dòng</option>
                                    <option value="ALL">Tất cả</option>
                                </select>
                                <ChevronDown size={12} className="text-slate-400 pointer-events-none absolute right-1.5" />
                            </div>
                        </div>
                        <span className="tabular-nums">
                            Đang xem{' '}
                            <strong className="text-slate-900">
                                {(currentPage - 1) * numPageSize + (totalItems > 0 ? 1 : 0)} - {Math.min(currentPage * numPageSize, totalItems)}
                            </strong>{' '}
                            / <strong className="text-slate-900">{totalItems}</strong> hóa đơn
                        </span>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white font-semibold text-xs text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 transition-all cursor-pointer"
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
                                                type="button"
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition-all cursor-pointer ${
                                                    currentPage === pageNum
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
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
                                type="button"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white font-semibold text-xs text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-40 transition-all cursor-pointer"
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 6. Invoice Detail Viewer Modal */}
            {viewingInvoice && (
                <div
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[999] flex items-center justify-center p-4 overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setViewingInvoice(null);
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-2.5 text-slate-900">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900 m-0">
                                        Chi Tiết Hóa Đơn:{' '}
                                        <span className="tabular-nums text-indigo-600 font-bold">
                                            {viewingInvoice.invoiceNumber}
                                        </span>
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium m-0">
                                        Bảng kê chi tiết hàng hóa và thông tin tra cứu hóa đơn
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingInvoice(null)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition text-xs font-semibold cursor-pointer"
                                title="Đóng cửa sổ này (ESC)"
                            >
                                <X size={14} />
                                <span>Đóng</span>
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">
                                        Tên Nhà Cung Cấp Trên HĐ
                                    </p>
                                    <p className="font-bold text-xs text-slate-900 uppercase mt-1 m-0">
                                        {viewingInvoice.supplierName}
                                    </p>
                                </div>
                                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">
                                        Mã Số Thuế Trên HĐ
                                    </p>
                                    <p className="font-bold text-xs text-slate-900 tabular-nums mt-1 m-0">
                                        {viewingInvoice.supplierTaxCode}
                                    </p>
                                </div>

                                <div className="sm:col-span-2 bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                            Phân Bổ Nhà Cung Cấp Hệ Thống:
                                        </label>
                                        {viewingInvoice.supplierId ? (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                                <CheckCircle size={11} /> Đã map NCC
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                                <AlertCircle size={11} /> Chưa map NCC
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative flex items-center bg-white border border-slate-300 rounded-lg px-3 h-[36px] focus-within:border-indigo-500">
                                        <select
                                            value={viewingInvoice.supplierId || ''}
                                            onChange={(e) => handleReassignSupplier(viewingInvoice.id, e.target.value)}
                                            disabled={isProcessing}
                                            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                                            className="w-full appearance-none pr-6 text-xs font-semibold text-slate-800 bg-transparent border-none outline-none cursor-pointer h-full"
                                        >
                                            <option value="">-- Chưa gán Nhà Cung Cấp (Bỏ gán) --</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    [{s.code}] {s.name} {s.taxCode ? `(MST: ${s.taxCode})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="text-slate-400 pointer-events-none absolute right-2.5" />
                                    </div>
                                </div>

                                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">
                                        Ngày Lập Hóa Đơn
                                    </p>
                                    <p className="font-bold text-xs text-slate-800 tabular-nums mt-1 m-0">
                                        {viewingInvoice.issueDate
                                            ? new Date(viewingInvoice.issueDate).toLocaleDateString('vi-VN')
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">
                                        Tổng Tiền Thanh Toán
                                    </p>
                                    <p className="font-bold text-sm text-rose-600 tabular-nums mt-1 m-0">
                                        {formatVND(viewingInvoice.totalAmount)}
                                    </p>
                                </div>
                                {viewingInvoice.lookupLink && (
                                    <div className="sm:col-span-2 bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl space-y-1">
                                        <h5 className="font-bold text-emerald-900 text-xs m-0">
                                            Thông tin tra cứu hóa đơn gốc:
                                        </h5>
                                        <p className="text-xs text-slate-600 m-0">
                                            <strong>Link tra cứu:</strong>{' '}
                                            <a
                                                href={viewingInvoice.lookupLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:underline font-semibold"
                                            >
                                                {viewingInvoice.lookupLink}
                                            </a>
                                        </p>
                                        {viewingInvoice.lookupCode && (
                                            <p className="text-xs text-slate-600 m-0">
                                                <strong>Mã tra cứu:</strong>{' '}
                                                <span className="tabular-nums bg-white px-2 py-0.5 border border-slate-200 rounded text-slate-800 font-bold">
                                                    {viewingInvoice.lookupCode}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider m-0">
                                    Chi Tiết Hàng Hóa / Dịch Vụ
                                </h4>
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
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
                                                        <td className="p-2.5 border-r border-slate-200 text-center text-slate-400 tabular-nums">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="p-2.5 border-r border-slate-200 font-medium text-slate-800 whitespace-normal">
                                                            {item.productName}
                                                        </td>
                                                        <td className="p-2.5 border-r border-slate-200 text-right tabular-nums font-semibold text-slate-700">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="p-2.5 border-r border-slate-200 text-right tabular-nums text-slate-700">
                                                            {formatVND(item.unitPrice)}
                                                        </td>
                                                        <td className="p-2.5 text-right tabular-nums font-bold text-slate-900">
                                                            {formatVND(item.totalPrice)}
                                                        </td>
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
                                <a
                                    href={viewingInvoice.xmlUrl}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition inline-flex items-center gap-1.5 no-underline"
                                >
                                    <Download size={14} /> Tải XML Gốc
                                </a>
                            )}
                            {viewingInvoice.pdfUrl && (
                                <a
                                    href={viewingInvoice.pdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-100 transition inline-flex items-center gap-1.5 no-underline"
                                >
                                    <FileText size={14} /> Xem PDF Gốc
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => setViewingInvoice(null)}
                                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer border-none"
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
