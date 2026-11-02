'use client';

import React, { useState } from 'react';
import { 
    ShieldCheck, ShieldAlert, Search, RefreshCw, CheckCircle2, 
    AlertCircle, Clock, Calendar, Package, Tag, Copy, Check, 
    FileSpreadsheet, ExternalLink, Code, Info, ArrowUpRight
} from 'lucide-react';
import { lookupPublicWarranty } from '@/app/warranty/actions';
import { calculateWarrantyRemaining } from '@/lib/warranty';

interface CustomerSerialItem {
    id: string;
    serialNumber: string;
    status: string;
    warrantyStartDate: string | null;
    warrantyEndDate: string | null;
    notes: string | null;
    createdAt: string;
    product: {
        id: string;
        name: string;
        sku: string;
        unit: string;
        warrantyMonths: number | null;
    };
    salesInvoice?: {
        id: string;
        code: string;
        date: string;
    } | null;
}

export default function PortalWarrantyClient({ 
    initialSerials = [], 
    customerName = '' 
}: { 
    initialSerials: CustomerSerialItem[];
    customerName?: string;
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'EXPIRED'>('ALL');
    
    // Quick Lookup state
    const [lookupInput, setLookupInput] = useState('');
    const [lookingUp, setLookingUp] = useState(false);
    const [lookupResult, setLookupResult] = useState<any>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);

    // Copy states
    const [copiedSerial, setCopiedSerial] = useState<string | null>(null);
    const [copiedPublicLink, setCopiedPublicLink] = useState(false);
    const [copiedIframe, setCopiedIframe] = useState(false);
    const [mounted, setMounted] = useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Calculate real-time stats
    const now = new Date();
    const totalCount = initialSerials.length;
    const validCount = initialSerials.filter(s => {
        if (!s.warrantyEndDate) return false;
        return now <= new Date(s.warrantyEndDate);
    }).length;
    const expiredCount = initialSerials.filter(s => {
        if (!s.warrantyEndDate) return false;
        return now > new Date(s.warrantyEndDate);
    }).length;

    // Filter serials
    const filteredSerials = initialSerials.filter(s => {
        const matchesSearch = 
            s.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.salesInvoice?.code && s.salesInvoice.code.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        if (statusFilter === 'VALID') {
            return s.warrantyEndDate && now <= new Date(s.warrantyEndDate);
        }
        if (statusFilter === 'EXPIRED') {
            return s.warrantyEndDate && now > new Date(s.warrantyEndDate);
        }
        return true;
    });

    const handleQuickLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = lookupInput.trim();
        if (!clean) return;

        setLookingUp(true);
        setLookupError(null);
        setLookupResult(null);

        try {
            const res = await lookupPublicWarranty(clean);
            if (res.success && res.data) {
                setLookupResult(res.data);
            } else {
                setLookupError(res.error || 'Không tìm thấy số Serial này trên hệ thống.');
            }
        } catch (err: any) {
            setLookupError('Lỗi kết nối khi tra cứu bảo hành.');
        } finally {
            setLookingUp(false);
        }
    };

    const handleCopySerial = (sn: string) => {
        navigator.clipboard.writeText(sn);
        setCopiedSerial(sn);
        setTimeout(() => setCopiedSerial(null), 2000);
    };

    const getOrigin = () => {
        if (typeof window !== 'undefined') return window.location.origin;
        return '';
    };

    const handleCopyPublicLink = () => {
        const url = `${getOrigin()}/warranty`;
        navigator.clipboard.writeText(url);
        setCopiedPublicLink(true);
        setTimeout(() => setCopiedPublicLink(false), 2000);
    };

    const handleCopyIframe = () => {
        const snippet = `<iframe src="${getOrigin()}/warranty?embed=true" width="100%" height="700" frameborder="0" style="border:none;border-radius:16px;"></iframe>`;
        navigator.clipboard.writeText(snippet);
        setCopiedIframe(true);
        setTimeout(() => setCopiedIframe(false), 2000);
    };

    const handleExportCSV = () => {
        if (filteredSerials.length === 0) return;
        
        const headers = ['STT,Số Serial/IMEI,Tên Sản Phẩm,Mã SKU,Hóa Đơn Mua,Ngày Xuất Hàng,Thời Hạn BH,Hạn Đến Ngày,Trạng Thái'];
        const rows = filteredSerials.map((s, idx) => {
            const isValid = s.warrantyEndDate && now <= new Date(s.warrantyEndDate);
            const statusText = s.product.warrantyMonths === 0 ? 'KBH' : (isValid ? 'Còn hạn' : 'Hết hạn');
            const exportDate = s.warrantyStartDate ? new Date(s.warrantyStartDate).toLocaleDateString('vi-VN') : (s.salesInvoice?.date ? new Date(s.salesInvoice.date).toLocaleDateString('vi-VN') : '');
            const endDate = s.warrantyEndDate ? new Date(s.warrantyEndDate).toLocaleDateString('vi-VN') : '';
            return `"${idx + 1}","${s.serialNumber}","${s.product.name}","${s.product.sku}","${s.salesInvoice?.code || ''}","${exportDate}","${s.product.warrantyMonths || 12} tháng","${endDate}","${statusText}"`;
        });

        const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Danh_Sach_Serial_Bao_Hanh_${customerName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                        <ShieldCheck size={26} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">
                                Tra Cứu & Quản Lý Bảo Hành Serial / IMEI
                            </h1>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Đại Lý
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Theo dõi thời hạn bảo hành điện tử chính hãng cho toàn bộ thiết bị đã mua của đại lý
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={filteredSerials.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Xuất Danh Sách Excel
                    </button>
                    <a
                        href="/warranty"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                        <ExternalLink size={14} />
                        Cổng Tra Cứu Public
                    </a>
                </div>
            </div>

            {/* Stats Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Package size={22} />
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 font-medium">Tổng Thiết Bị Đã Mua</span>
                        <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <span className="text-xs text-emerald-600 font-bold">Đang Còn Hạn Bảo Hành</span>
                        <p className="text-2xl font-black text-emerald-700 mt-0.5">{validCount}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                        <ShieldAlert size={22} />
                    </div>
                    <div>
                        <span className="text-xs text-rose-500 font-bold">Đã Hết Hạn Bảo Hành</span>
                        <p className="text-2xl font-black text-rose-700 mt-0.5">{expiredCount}</p>
                    </div>
                </div>
            </div>

            {/* Quick Serial Lookup Search Box */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6 rounded-3xl border border-emerald-200/80 shadow-xs space-y-4">
                <div>
                    <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <Search className="w-4 h-4 text-emerald-600" />
                        Tra Cứu Nhanh Bất Kỳ Mã Serial / IMEI
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Nhập số Serial hoặc IMEI của thiết bị để kiểm tra tức thì trạng thái bảo hành và ngày hết hạn
                    </p>
                </div>

                <form onSubmit={handleQuickLookup} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                    <input
                        type="text"
                        value={lookupInput}
                        onChange={(e) => setLookupInput(e.target.value)}
                        placeholder="Nhập mã Serial hoặc IMEI (VD: SN-SYNC-1789799524265, win01-01...)..."
                        className="flex-1 h-11 px-4 rounded-2xl bg-white border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    />
                    <button
                        type="submit"
                        disabled={lookingUp}
                        className="h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-60"
                    >
                        {lookingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Kiểm Tra Bảo Hành
                    </button>
                </form>

                {lookupError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{lookupError}</span>
                    </div>
                )}

                {/* Lookup Result Box */}
                {lookupResult && (
                    <div className="p-5 rounded-2xl bg-white border-2 border-emerald-500/40 shadow-sm space-y-3 animate-in fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-base text-slate-900">
                                    {lookupResult.serialNumber}
                                </span>
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                    {lookupResult.productName}
                                </span>
                            </div>

                            <div>
                                {lookupResult.isNoWarranty ? (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">KBH (Không bảo hành)</span>
                                ) : lookupResult.isWarrantyValid ? (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Còn hạn ({lookupResult.daysRemaining} ngày)
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1.5">
                                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Đã hết hạn bảo hành
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                                <span className="text-slate-400">Mã SKU:</span>
                                <p className="font-mono font-bold text-slate-800 mt-0.5">{lookupResult.sku}</p>
                            </div>
                            <div>
                                <span className="text-slate-400">Ngày xuất hàng:</span>
                                <p className="font-mono font-bold text-slate-800 mt-0.5">
                                    {lookupResult.exportDate ? new Date(lookupResult.exportDate).toLocaleDateString('vi-VN') : 'Chưa có'}
                                </p>
                            </div>
                            <div>
                                <span className="text-slate-400">Thời gian bảo hành:</span>
                                <p className="font-bold text-slate-800 mt-0.5">
                                    {lookupResult.isNoWarranty ? 'Không bảo hành' : `${lookupResult.warrantyMonths} Tháng`}
                                </p>
                            </div>
                            <div>
                                <span className="text-slate-400">Hạn bảo hành đến ngày:</span>
                                <p className="font-mono font-bold text-emerald-700 mt-0.5">
                                    {lookupResult.warrantyEndDate ? new Date(lookupResult.warrantyEndDate).toLocaleDateString('vi-VN') : 'Không áp dụng'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Partner / Dealer Public Link & Embed Tool Banner */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-emerald-600" />
                            Cổng Tra Cứu Công Khai Dành Cho Khách Hàng Của Đại Lý
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Khi đại lý bán sản phẩm cho khách hàng cuối, quý đại lý có thể gửi đường link này hoặc nhúng trực tiếp vào website bán hàng của đại lý để khách hàng tự tra cứu.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleCopyPublicLink}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                            {copiedPublicLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                            <span>{copiedPublicLink ? 'Đã Sao Chép Link' : 'Sao Chép Link Tra Cứu'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleCopyIframe}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                            {copiedIframe ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code className="w-3.5 h-3.5 text-slate-500" />}
                            <span>{copiedIframe ? 'Đã Sao Chép Mã' : 'Lấy Mã Nhúng Iframe'}</span>
                        </button>
                    </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-mono text-slate-700">
                    <span className="truncate pr-4" suppressHydrationWarning>
                        {mounted && typeof window !== 'undefined' ? `${window.location.origin}/warranty` : '/warranty'}
                    </span>
                    <a
                        href="/warranty"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 font-bold font-sans flex items-center gap-1 shrink-0"
                    >
                        Mở Thử <ArrowUpRight size={13} />
                    </a>
                </div>
            </div>

            {/* Purchased Serials List Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                            Danh Sách Thiết Bị & Serial Đã Mua ({filteredSerials.length})
                        </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search Input */}
                        <div className="relative min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Tìm theo Serial, sản phẩm, HĐ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-8.5 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex rounded-xl bg-slate-200/60 p-0.5 text-xs font-bold">
                            <button
                                onClick={() => setStatusFilter('ALL')}
                                className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Tất Cả
                            </button>
                            <button
                                onClick={() => setStatusFilter('VALID')}
                                className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'VALID' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Còn Hạn
                            </button>
                            <button
                                onClick={() => setStatusFilter('EXPIRED')}
                                className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'EXPIRED' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Hết Hạn
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                                <th className="px-4 py-3.5">Số Serial / IMEI</th>
                                <th className="px-4 py-3.5">Sản Phẩm & SKU</th>
                                <th className="px-4 py-3.5">Hóa Đơn Mua</th>
                                <th className="px-4 py-3.5">Ngày Xuất Hàng</th>
                                <th className="px-4 py-3.5 text-center">Bảo Hành</th>
                                <th className="px-4 py-3.5">Hạn Đến Ngày</th>
                                <th className="px-4 py-3.5 text-center">Trạng Thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSerials.length > 0 ? (
                                filteredSerials.map((s) => {
                                    const isNoWarranty = s.product.warrantyMonths === 0;
                                    const isValid = !isNoWarranty && s.warrantyEndDate && now <= new Date(s.warrantyEndDate);
                                    const isExpired = !isNoWarranty && s.warrantyEndDate && now > new Date(s.warrantyEndDate);
                                    const exportDate = s.warrantyStartDate || s.salesInvoice?.date || s.createdAt;

                                    return (
                                        <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                                                    <span>{s.serialNumber}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopySerial(s.serialNumber)}
                                                        className="p-1 text-slate-400 hover:text-emerald-600 transition-colors rounded"
                                                        title="Sao chép Serial"
                                                    >
                                                        {copiedSerial === s.serialNumber ? (
                                                            <Check size={12} className="text-emerald-600" />
                                                        ) : (
                                                            <Copy size={12} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3.5">
                                                <div>
                                                    <span className="font-bold text-slate-800">{s.product.name}</span>
                                                    <span className="block text-[10px] font-mono text-slate-400">SKU: {s.product.sku}</span>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3.5 font-mono text-blue-600 font-semibold">
                                                {s.salesInvoice?.code || '-'}
                                            </td>

                                            <td className="px-4 py-3.5 font-mono text-slate-600" suppressHydrationWarning>
                                                {exportDate ? new Date(exportDate).toLocaleDateString('vi-VN') : '-'}
                                            </td>

                                            <td className="px-4 py-3.5 text-center">
                                                {isNoWarranty ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                                        KBH
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        {s.product.warrantyMonths || 12} Tháng
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3.5 font-mono font-bold text-slate-800" suppressHydrationWarning>
                                                {s.warrantyEndDate ? new Date(s.warrantyEndDate).toLocaleDateString('vi-VN') : '-'}
                                            </td>

                                            <td className="px-4 py-3.5 text-center" suppressHydrationWarning>
                                                {isNoWarranty ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                                        KBH
                                                    </span>
                                                ) : (() => {
                                                    const wStat = calculateWarrantyRemaining(s.warrantyEndDate, s.product.warrantyMonths ?? 12);
                                                    return wStat.isValid ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            Còn {wStat.daysRemaining} ngày
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                            Hết hạn
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-medium">
                                        Không tìm thấy thiết bị nào phù hợp với điều kiện tìm kiếm.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
