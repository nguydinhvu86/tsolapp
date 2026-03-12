'use client';
import { formatDate } from '@/lib/utils/formatters';

import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Calendar, TrendingUp, DollarSign, Users, Package, FileText, CreditCard, Search, ArrowUpRight, Activity, Download, Printer } from 'lucide-react';
import Link from 'next/link';
import { exportToExcel, exportToPDF } from '@/lib/utils/export';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function PurchasingReportClient({ bills, payments, orders, suppliers }: { bills: any[], payments: any[], orders: any[], suppliers: any[] }) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState<'overview' | 'supplier' | 'product' | 'bill' | 'order' | 'payment'>('overview');

    // Filter states
    const [supplierSearch, setSupplierSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [billSearch, setBillSearch] = useState('');
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatus, setOrderStatus] = useState('ALL');
    const [paymentSearch, setPaymentSearch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('ALL');

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };


    // --- Data Filtering based on Date Range ---
    const filterByDate = (items: any[], dateField: string = 'date') => {
        if (!startDate || !endDate) return items;
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return items.filter(item => {
            const itemDate = new Date(item[dateField]);
            return itemDate >= start && itemDate <= end;
        });
    };

    const filteredBills = useMemo(() => filterByDate(bills), [bills, startDate, endDate]);
    const filteredPayments = useMemo(() => filterByDate(payments), [payments, startDate, endDate]);
    const filteredOrders = useMemo(() => filterByDate(orders), [orders, startDate, endDate]);

    // --- Tab 1: Overview Data ---
    const validFilteredBills = useMemo(() => filteredBills.filter(b => !['DRAFT', 'CANCELLED'].includes(b.status)), [filteredBills]);

    const totalPurchases = validFilteredBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPayments = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Compute total debt dynamically from all valid bills and payments per supplier
    const totalDebt = suppliers.reduce((sum, s) => {
        const validSupplierBills = s.bills ? s.bills.filter((b: any) => !['DRAFT', 'CANCELLED'].includes(b.status)) : [];
        const exactPurchases = validSupplierBills.reduce((acc: number, bill: any) => acc + (bill.totalAmount || 0), 0);
        const exactPayments = validSupplierBills.reduce((acc: number, bill: any) => acc + (bill.paidAmount || 0), 0);
        return sum + (exactPurchases - exactPayments);
    }, 0);

    const timelineData = useMemo(() => {
        const dataMap = new Map();

        validFilteredBills.forEach(b => {
            const dateStr = new Date(b.date).toISOString().split('T')[0];
            if (!dataMap.has(dateStr)) dataMap.set(dateStr, { date: dateStr, 'Mua Hàng': 0, 'Thanh Toán': 0 });
            dataMap.get(dateStr)['Mua Hàng'] += (b.totalAmount || 0);
        });

        filteredPayments.forEach(p => {
            const dateStr = new Date(p.date).toISOString().split('T')[0];
            if (!dataMap.has(dateStr)) dataMap.set(dateStr, { date: dateStr, 'Mua Hàng': 0, 'Thanh Toán': 0 });
            dataMap.get(dateStr)['Thanh Toán'] += p.amount;
        });

        const sortedData = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        return sortedData.map(d => ({
            ...d,
            displayDate: formatDate(new Date(d.date))
        }));
    }, [filteredBills, filteredPayments]);

    // --- Tab 2: Supplier Data ---
    const supplierReportData = useMemo(() => {
        const map = new Map();

        suppliers.forEach(s => {
            const validSupplierBills = s.bills ? s.bills.filter((b: any) => !['DRAFT', 'CANCELLED'].includes(b.status)) : [];
            const exactPurchases = validSupplierBills.reduce((acc: number, bill: any) => acc + (bill.totalAmount || 0), 0);
            const exactPayments = validSupplierBills.reduce((acc: number, bill: any) => acc + (bill.paidAmount || 0), 0);

            map.set(s.id, {
                id: s.id,
                code: s.code,
                name: s.name,
                totalPurchased: 0,
                totalPaid: 0,
                currentDebt: exactPurchases - exactPayments
            });
        });

        validFilteredBills.forEach(b => {
            if (b.supplierId && map.has(b.supplierId)) {
                map.get(b.supplierId).totalPurchased += (b.totalAmount || 0);
            }
        });

        filteredPayments.forEach(p => {
            if (p.supplierId && map.has(p.supplierId)) {
                map.get(p.supplierId).totalPaid += p.amount;
            }
        });

        let result = Array.from(map.values())
            .filter(s => s.totalPurchased > 0 || s.totalPaid > 0 || s.currentDebt > 0)
            .sort((a, b) => b.totalPurchased - a.totalPurchased);

        if (supplierSearch.trim()) {
            const query = supplierSearch.toLowerCase();
            result = result.filter(s =>
                s.name?.toLowerCase().includes(query) ||
                s.code?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [suppliers, filteredBills, filteredPayments, supplierSearch]);

    const topSuppliersChartData = useMemo(() => {
        return supplierReportData.slice(0, 5).map(s => ({
            name: s.name?.length > 15 ? s.name.substring(0, 15) + '...' : s.name,
            'Mua Hàng': s.totalPurchased,
            'Thanh Toán': s.totalPaid
        }));
    }, [supplierReportData]);

    // --- Tab 3: Product Data ---
    const productReportData = useMemo(() => {
        const map = new Map();

        validFilteredBills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach((item: any) => {
                    const prodId = item.productId;
                    if (!map.has(prodId)) {
                        map.set(prodId, {
                            id: prodId,
                            sku: item.product?.sku || '',
                            name: item.product?.name || item.productName || 'Sản phẩm không xác định',
                            unit: item.product?.unit || '',
                            totalQuantity: 0,
                            totalValue: 0,
                        });
                    }
                    const p = map.get(prodId);
                    p.totalQuantity += item.quantity;
                    p.totalValue += item.totalPrice;
                });
            }
        });

        let result = Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);

        if (productSearch.trim()) {
            const query = productSearch.toLowerCase();
            result = result.filter(p =>
                p.name?.toLowerCase().includes(query) ||
                p.sku?.toLowerCase().includes(query)
            );
        }

        return result.map(p => ({
            ...p,
            avgPrice: p.totalQuantity > 0 ? p.totalValue / p.totalQuantity : 0
        }));
    }, [filteredBills, productSearch]);

    const topProductsChartData = useMemo(() => {
        const rawData = productReportData;
        if (rawData.length <= 5) return rawData.map(p => ({ name: p.name, value: p.totalValue }));
        const top5 = rawData.slice(0, 5).map(p => ({ name: p.name, value: p.totalValue }));
        const others = rawData.slice(5).reduce((sum, p) => sum + p.totalValue, 0);
        return [...top5, { name: 'Khác', value: others }];
    }, [productReportData]);

    // --- Tab 4 & 5 (Filtered Documents) ---
    const displayBills = useMemo(() => {
        let result = validFilteredBills;
        if (billSearch.trim()) {
            const query = billSearch.toLowerCase();
            result = result.filter(b => b.code?.toLowerCase().includes(query) || b.supplier?.name?.toLowerCase().includes(query));
        }
        return result;
    }, [validFilteredBills, billSearch]);

    const displayOrders = useMemo(() => {
        let result = filteredOrders;
        if (orderSearch.trim()) {
            const query = orderSearch.toLowerCase();
            result = result.filter(o => o.code?.toLowerCase().includes(query) || o.supplier?.name?.toLowerCase().includes(query));
        }
        if (orderStatus !== 'ALL') {
            result = result.filter(o => o.status === orderStatus);
        }
        return result;
    }, [filteredOrders, orderSearch, orderStatus]);

    const displayPayments = useMemo(() => {
        let result = filteredPayments;
        if (paymentSearch.trim()) {
            const query = paymentSearch.toLowerCase();
            result = result.filter(p => p.code?.toLowerCase().includes(query) || p.reference?.toLowerCase().includes(query) || p.supplier?.name?.toLowerCase().includes(query));
        }
        if (paymentMethod !== 'ALL') {
            result = result.filter(p => p.paymentMethod === paymentMethod);
        }
        return result;
    }, [filteredPayments, paymentSearch, paymentMethod]);


    // Custom Premium Styles injected directly to ensure they work alongside globals.css
    const premiumStyles = `
        .premium-tabs-wrapper {
            display: inline-flex;
            background: #fff;
            padding: 4px;
            border-radius: 12px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
            gap: 4px;
            overflow-x: auto;
            max-width: 100%;
        }
        .premium-tab {
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-muted);
            background: transparent;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
        }
        .premium-tab:hover {
            color: var(--text-main);
            background: #f4f4f5;
        }
        .premium-tab.active {
            background: var(--primary);
            color: white;
            box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
        }
        .custom-tooltip {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(8px);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px;
            box-shadow: var(--shadow-lg);
        }
        .custom-tooltip-title {
            font-weight: 600;
            margin-bottom: 8px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 4px;
            color: var(--text-main);
            font-size: 0.875rem;
        }
        .custom-tooltip-item {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            font-size: 0.875rem;
            margin-bottom: 4px;
        }
        .filter-group {
            display: flex;
            align-items: center;
            gap: 12px;
            background: white;
            padding: 6px 12px;
            border-radius: 20px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-sm);
        }
        .filter-input {
            border: none;
            outline: none;
            font-size: 0.875rem;
            font-family: inherit;
            color: var(--text-main);
            background: transparent;
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .badge-success { background: #d1fae5; color: #047857; }
        .badge-warning { background: #fef3c7; color: #b45309; }
        .badge-neutral { background: #f3f4f6; color: #374151; }
        .badge-info { background: #dbeafe; color: #1d4ed8; }
    `;

    const CustomRechartsTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <div className="custom-tooltip-title">{label}</div>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="custom-tooltip-item">
                            <span style={{ color: entry.color, fontWeight: 500 }}>{entry.name}:</span>
                            <span style={{ fontWeight: 600 }}>{formatMoney(entry.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const supplierPag = usePagination(supplierReportData);
    const productPag = usePagination(productReportData);
    const billPag = usePagination(displayBills);
    const orderPag = usePagination(displayOrders);
    const paymentPag = usePagination(displayPayments);

    return (
        <div className="p-6 w-full mx-auto">
            <style>{premiumStyles}</style>

            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="text-xl font-bold mb-1">Báo Cáo Phân Tích Mua Hàng</h1>
                    <p className="text-gray-500 text-sm">Theo dõi hiệu suất chuỗi cung ứng và lịch sử thanh toán</p>
                </div>
                <div className="filter-group">
                    <Calendar size={16} className="text-gray-400" />
                    <input type="date" className="filter-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <span className="text-gray-400 font-bold">→</span>
                    <input type="date" className="filter-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="premium-tabs-wrapper">
                    <button className={`premium-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                        <TrendingUp size={16} /> Tổng Quan
                    </button>
                    <button className={`premium-tab ${activeTab === 'supplier' ? 'active' : ''}`} onClick={() => setActiveTab('supplier')}>
                        <Users size={16} /> Nhà Cung Cấp
                    </button>
                    <button className={`premium-tab ${activeTab === 'product' ? 'active' : ''}`} onClick={() => setActiveTab('product')}>
                        <Package size={16} /> Sản Phẩm
                    </button>
                    <button className={`premium-tab ${activeTab === 'order' ? 'active' : ''}`} onClick={() => setActiveTab('order')}>
                        <Package size={16} /> Đơn Đặt Hàng
                    </button>
                    <button className={`premium-tab ${activeTab === 'bill' ? 'active' : ''}`} onClick={() => setActiveTab('bill')}>
                        <FileText size={16} /> Hóa Đơn Mua
                    </button>
                    <button className={`premium-tab ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>
                        <CreditCard size={16} /> Thanh Toán
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}

            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div>
                    {/* Stat Cards - using the built-in globals.css classes for premium look */}
                    <div className="grid lg:grid-cols-3 gap-4 mb-6">
                        <div className="stat-card stat-card-blue">
                            <div className="stat-header">
                                <div className="stat-info">
                                    <div className="stat-title"><Package size={14} /> TỔNG MUA HÀNG</div>
                                    <div className="stat-value">{formatMoney(totalPurchases)}</div>
                                </div>
                                <div className="stat-icon"><TrendingUp size={24} /></div>
                            </div>
                            <div className="text-sm font-medium mt-2 opacity-80" style={{ color: '#1d4ed8' }}>
                                {filteredBills.length} hóa đơn trong kỳ
                            </div>
                        </div>

                        <div className="stat-card stat-card-green">
                            <div className="stat-header">
                                <div className="stat-info">
                                    <div className="stat-title"><CreditCard size={14} /> ĐÃ THANH TOÁN</div>
                                    <div className="stat-value">{formatMoney(totalPayments)}</div>
                                </div>
                                <div className="stat-icon"><DollarSign size={24} /></div>
                            </div>
                            <div className="text-sm font-medium mt-2 opacity-80" style={{ color: '#047857' }}>
                                {filteredPayments.length} giao dịch chi tiền
                            </div>
                        </div>

                        <div className="stat-card stat-card-amber">
                            <div className="stat-header">
                                <div className="stat-info">
                                    <div className="stat-title"><Users size={14} /> CÔNG NỢ HIỆN TẠI</div>
                                    <div className="stat-value">{formatMoney(totalDebt)}</div>
                                </div>
                                <div className="stat-icon"><ArrowUpRight size={24} /></div>
                            </div>
                            <div className="text-sm font-medium mt-2 opacity-80" style={{ color: '#b45309' }}>
                                Dư nợ tổng hợp các NCC
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="card">
                        <h3 className="font-bold text-lg mb-4">Lưu Chuyển Tiền Tệ</h3>
                        <div style={{ height: '350px', width: '100%' }}>
                            {timelineData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorMua" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorTra" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="displayDate" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis tickFormatter={(val) => `${val / 1000000}M`} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} width={60} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                        <RechartsTooltip content={<CustomRechartsTooltip />} />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                        <Area type="monotone" dataKey="Mua Hàng" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorMua)" />
                                        <Area type="monotone" dataKey="Thanh Toán" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorTra)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="Không có dữ liệu trong khoảng thời gian này." />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. SUPPLIER TAB */}
            {activeTab === 'supplier' && (
                <div>
                    <div className="card mb-6">
                        <h3 className="font-bold text-lg mb-4">Top 5 Đối Tác Mua Hàng</h3>
                        <div style={{ height: '300px', width: '100%' }}>
                            {topSuppliersChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topSuppliersChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }} barGap={6}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis tickFormatter={(val) => `${val / 1000000}M`} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} width={60} />
                                        <RechartsTooltip content={<CustomRechartsTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
                                        <Bar dataKey="Mua Hàng" fill="var(--primary)" radius={[4, 4, 4, 4]} maxBarSize={40} />
                                        <Bar dataKey="Thanh Toán" fill="var(--success)" radius={[4, 4, 4, 4]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="Không có dữ liệu đối tác." />
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ padding: 0 }}>
                        <div className="search-card" style={{ padding: '1.25rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
                            <h3 className="font-bold text-lg">Bảng Hiệu Suất</h3>
                            <div className="flex gap-2 items-center">
                                <div className="search-input-wrapper">
                                    <Search size={16} className="search-icon" />
                                    <input type="text" placeholder="Tìm tên, mã đối tác..." value={supplierSearch} onChange={(e) => setSupplierSearch(e.target.value)} className="input" />
                                </div>
                                <button
                                    onClick={() => exportToExcel(
                                        supplierReportData.map(s => ({ "Mã NCC": s.code, "Tên NCC": s.name, "Tổng Mua": s.totalPurchased, "Đã Trả": s.totalPaid, "Nợ Tồn": s.currentDebt })),
                                        `Bao_Cao_NCC_${startDate}_to_${endDate}`
                                    )}
                                    className="btn btn-secondary flex items-center gap-2"
                                    title="Xuất Excel"
                                >
                                    <Download size={16} /> Excel
                                </button>
                                <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2" title="In / Xuất PDF">
                                    <Printer size={16} /> Print
                                </button>
                            </div>
                        </div>
                        <div className="table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Mã NCC</th>
                                        <th>Tên Nhà Cung Cấp</th>
                                        <th className="text-right">Tổng Mua (Kỳ)</th>
                                        <th className="text-right">Đã Trả (Kỳ)</th>
                                        <th className="text-right">Nợ Tồn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supplierPag.paginatedItems.map(s => (
                                        <tr key={s.id}>
                                            <td className="font-medium text-gray-500">
                                                <Link href={`/suppliers/${s.id}`} className="hover:text-primary hover:underline transition-colors block">
                                                    {s.code}
                                                </Link>
                                            </td>
                                            <td className="font-bold">
                                                <Link href={`/suppliers/${s.id}`} className="hover:text-primary hover:underline transition-colors block">
                                                    {s.name}
                                                </Link>
                                            </td>
                                            <td className="text-right font-medium">{formatMoney(s.totalPurchased)}</td>
                                            <td className="text-right font-medium text-success">{formatMoney(s.totalPaid)}</td>
                                            <td className="text-right font-bold text-danger">{formatMoney(s.currentDebt)}</td>
                                        </tr>
                                    ))}
                                    {supplierPag.paginatedItems.length === 0 && (
                                        <tr><td colSpan={5} className="text-center p-8 text-gray-500">Không tìm thấy nhà cung cấp nào.</td></tr>
                                    )}
                                </tbody>
                                {supplierReportData.length > 0 && (
                                    <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                        <tr>
                                            <td colSpan={2} className="text-right font-bold text-gray-700">TỔNG CỘNG:</td>
                                            <td className="text-right font-bold text-primary">
                                                {formatMoney(supplierReportData.reduce((sum, s) => sum + (s.totalPurchased || 0), 0))}
                                            </td>
                                            <td className="text-right font-bold text-success">
                                                {formatMoney(supplierReportData.reduce((sum, s) => sum + (s.totalPaid || 0), 0))}
                                            </td>
                                            <td className="text-right font-bold text-danger">
                                                {formatMoney(supplierReportData.reduce((sum, s) => sum + (s.currentDebt || 0), 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                            <Pagination {...supplierPag.paginationProps} />
                        </div>
                    </div>
                </div>
            )}

            {/* 3. PRODUCT TAB */}
            {activeTab === 'product' && (
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="card lg:col-span-2" style={{ padding: 0 }}>
                        <div className="search-card" style={{ padding: '1.25rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
                            <h3 className="font-bold text-lg">Chi Tiết Sản Phẩm Nhập</h3>
                            <div className="flex gap-2 items-center">
                                <div className="search-input-wrapper">
                                    <Search size={16} className="search-icon" />
                                    <input type="text" placeholder="Tìm tên, mã sản phẩm..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="input" />
                                </div>
                                <button
                                    onClick={() => exportToExcel(
                                        productReportData.map(p => ({ "Mã SP": p.sku, "Tên Sản Phẩm": p.name, "ĐVT": p.unit, "Số Lượng": p.totalQuantity, "Giá TB": p.avgPrice, "Thành Tiền": p.totalValue })),
                                        `Chi_Tiet_San_Pham_Nhap_${startDate}_to_${endDate}`
                                    )}
                                    className="btn btn-secondary flex items-center gap-2"
                                >
                                    <Download size={16} /> Excel
                                </button>
                                <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2">
                                    <Printer size={16} /> Print
                                </button>
                            </div>
                        </div>
                        <div className="table-wrapper" style={{ border: 'none', borderRadius: '0', maxHeight: '500px' }}>
                            <table>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th>Mã SP</th>
                                        <th>Tên Sản Phẩm</th>
                                        <th className="text-center">ĐVT</th>
                                        <th className="text-center">Số Lượng</th>
                                        <th className="text-right">Giá TB</th>
                                        <th className="text-right">Thành Tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productPag.paginatedItems.map(p => (
                                        <tr key={p.id}>
                                            <td className="font-medium text-gray-500">
                                                <Link href={`/products/${p.id}`} className="hover:text-primary hover:underline transition-colors block">
                                                    {p.sku}
                                                </Link>
                                            </td>
                                            <td className="font-bold">
                                                <Link href={`/products/${p.id}`} className="hover:text-primary hover:underline transition-colors block">
                                                    {p.name}
                                                </Link>
                                            </td>
                                            <td className="text-center text-sm">{p.unit}</td>
                                            <td className="text-center font-bold text-primary">{p.totalQuantity}</td>
                                            <td className="text-right text-sm">{formatMoney(p.avgPrice)}</td>
                                            <td className="text-right font-bold">{formatMoney(p.totalValue)}</td>
                                        </tr>
                                    ))}
                                    {productPag.paginatedItems.length === 0 && (
                                        <tr><td colSpan={6} className="text-center p-8 text-gray-500">Chưa có sản phẩm nào.</td></tr>
                                    )}
                                </tbody>
                                {productReportData.length > 0 && (
                                    <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                        <tr>
                                            <td colSpan={3} className="text-right font-bold text-gray-700">TỔNG CỘNG:</td>
                                            <td className="text-center font-bold text-primary">
                                                {productReportData.reduce((sum, p) => sum + (p.totalQuantity || 0), 0)}
                                            </td>
                                            <td></td>
                                            <td className="text-right font-bold text-primary">
                                                {formatMoney(productReportData.reduce((sum, p) => sum + (p.totalValue || 0), 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                            <Pagination {...productPag.paginationProps} />
                        </div>
                    </div>

                    <div className="card flex flex-col items-center">
                        <h3 className="font-bold text-lg mb-6 w-full text-center">Cơ Cấu Giá Trị Nhập</h3>
                        <div style={{ height: '300px', width: '100%' }}>
                            {topProductsChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={topProductsChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                                            {topProductsChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={<CustomRechartsTooltip />} />
                                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="Chưa có dữ liệu." />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. BILLS TAB */}
            {activeTab === 'bill' && (
                <div className="card" style={{ padding: 0 }}>
                    <div className="search-card" style={{ padding: '1.25rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
                        <h3 className="font-bold text-lg"><FileText size={18} className="inline mr-2 text-primary" /> Hóa Đơn Mua Hàng</h3>
                        <div className="flex gap-2 items-center">
                            <div className="search-input-wrapper">
                                <Search size={16} className="search-icon" />
                                <input type="text" placeholder="Tìm mã, NCC..." value={billSearch} onChange={e => setBillSearch(e.target.value)} className="input" />
                            </div>
                            <button
                                onClick={() => exportToExcel(
                                    displayBills.map(b => ({ "Mã/Ngày": `${b.code} (${formatDate(b.date)})`, "Nhà Cung Cấp": b.supplier?.name, "Tổng Tiền": b.totalAmount, "Đã Trả": b.paidAmount, "Trạng Thái": b.totalAmount > b.paidAmount ? 'Nợ' : 'Đã trả đủ' })),
                                    `Hoa_Don_Mua_${startDate}_to_${endDate}`
                                )}
                                className="btn btn-secondary flex items-center gap-2"
                                title="Xuất Excel"
                            >
                                <Download size={16} /> Excel
                            </button>
                            <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2" title="In / Xuất PDF">
                                <Printer size={16} /> Print
                            </button>
                        </div>
                    </div>
                    <div className="table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)', maxHeight: '500px' }}>
                        <table>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th>Mã / Ngày</th>
                                    <th>Nhà Cung Cấp</th>
                                    <th className="text-right">Tổng Tiền</th>
                                    <th className="text-right">Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billPag.paginatedItems.map(b => (
                                    <tr key={b.id}>
                                        <td>
                                            <Link href={`/purchasing/bills/${b.id}`} className="font-bold hover:text-primary hover:underline transition-colors block">
                                                {b.code}
                                            </Link>
                                            <div className="text-sm text-gray-500">{formatDate(b.date)}</div>
                                        </td>
                                        <td className="font-medium text-sm">
                                            {b.supplierId ? (
                                                <Link href={`/suppliers/${b.supplierId}`} className="hover:text-primary hover:underline transition-colors block">
                                                    {b.supplier?.name}
                                                </Link>
                                            ) : (
                                                <span>{b.supplier?.name}</span>
                                            )}
                                        </td>
                                        <td className="text-right font-bold">{formatMoney(b.totalAmount)}</td>
                                        <td className="text-right">
                                            {b.totalAmount > b.paidAmount ? (
                                                <span className="status-badge badge-warning">Nợ {formatMoney(b.totalAmount - b.paidAmount)}</span>
                                            ) : (
                                                <span className="status-badge badge-success">Đã trả đủ</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {billPag.paginatedItems.length === 0 && <tr><td colSpan={4} className="text-center p-8 text-gray-500">Không có hóa đơn.</td></tr>}
                            </tbody>
                            {displayBills.length > 0 && (
                                <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                    <tr>
                                        <td colSpan={2} className="text-right font-bold text-gray-700">TỔNG CỘNG ({displayBills.length}):</td>
                                        <td className="text-right font-bold text-primary">
                                            {formatMoney(displayBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0))}
                                        </td>
                                        <td className="text-right font-bold text-danger">
                                            Nợ {formatMoney(displayBills.reduce((sum, b) => sum + (b.totalAmount - (b.paidAmount || 0)), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                        <Pagination {...billPag.paginationProps} />
                    </div>
                </div>
            )}

            {/* 5. ORDERS TAB */}
            {activeTab === 'order' && (
                <div className="card" style={{ padding: 0 }}>
                    <div className="search-card" style={{ padding: '1.25rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
                        <h3 className="font-bold text-lg"><Package size={18} className="inline mr-2 text-primary" /> Đơn Đặt Hàng</h3>
                        <div className="flex gap-2">
                            <select className="input" style={{ width: '130px', padding: '0.4rem' }} value={orderStatus} onChange={e => setOrderStatus(e.target.value)}>
                                <option value="ALL">Mọi TT</option>
                                <option value="DRAFT">Nháp</option>
                                <option value="PENDING">Chờ Duyệt</option>
                                <option value="APPROVED">Đã Duyệt</option>
                                <option value="COMPLETED">Hoàn Thành</option>
                            </select>
                            <div className="search-input-wrapper">
                                <Search size={16} className="search-icon" />
                                <input type="text" placeholder="Tìm..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} className="input" />
                            </div>
                            <button
                                onClick={() => exportToExcel(
                                    displayOrders.map(o => ({ "Mã/Ngày": `${o.code} (${formatDate(o.date)})`, "Nhà Cung Cấp": o.supplier?.name, "Trạng Thái": o.status, "Tổng Tiền": o.totalAmount })),
                                    `Don_Dat_Hang_${startDate}_to_${endDate}`
                                )}
                                className="btn btn-secondary flex items-center gap-2"
                                title="Xuất Excel"
                            >
                                <Download size={16} /> Excel
                            </button>
                            <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2" title="In / Xuất PDF">
                                <Printer size={16} /> Print
                            </button>
                        </div>
                    </div>
                    <div className="table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)', maxHeight: '500px' }}>
                        <table>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th>Mã / Ngày</th>
                                    <th>Nhà Cung Cấp</th>
                                    <th className="text-center">Trạng Thái</th>
                                    <th className="text-right">Tổng Tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderPag.paginatedItems.map(o => (
                                    <tr key={o.id}>
                                        <td>
                                            <div className="font-bold">{o.code}</div>
                                            <div className="text-sm text-gray-500">{formatDate(o.date)}</div>
                                        </td>
                                        <td className="font-medium text-sm">{o.supplier?.name}</td>
                                        <td className="text-center">
                                            {o.status === 'COMPLETED' ? <span className="status-badge badge-success">Hoàn thành</span> :
                                                o.status === 'APPROVED' ? <span className="status-badge badge-info">Đã duyệt</span> :
                                                    o.status === 'PENDING' ? <span className="status-badge badge-warning">Chờ duyệt</span> :
                                                        <span className="status-badge badge-neutral">Nháp</span>}
                                        </td>
                                        <td className="text-right font-bold">{formatMoney(o.totalAmount)}</td>
                                    </tr>
                                ))}
                                {orderPag.paginatedItems.length === 0 && <tr><td colSpan={4} className="text-center p-8 text-gray-500">Không có đơn đặt hàng.</td></tr>}
                            </tbody>
                            {displayOrders.length > 0 && (
                                <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                    <tr>
                                        <td colSpan={3} className="text-right font-bold text-gray-700">TỔNG CỘNG ({displayOrders.length}):</td>
                                        <td className="text-right font-bold text-primary">
                                            {formatMoney(displayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                        <Pagination {...orderPag.paginationProps} />
                    </div>
                </div>
            )}

            {/* 6. PAYMENT TAB */}
            {activeTab === 'payment' && (
                <div className="card" style={{ padding: 0 }}>
                    <div className="search-card" style={{ padding: '1.5rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
                        <div>
                            <h3 className="font-bold text-xl mb-1">Sổ Phụ Chi Tiền</h3>
                            <p className="text-sm text-gray-500">Danh sách giao dịch chi trả nhà cung cấp</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <select className="input" style={{ width: '180px' }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                <option value="ALL">Mọi Hình Thức</option>
                                <option value="BANK_TRANSFER">Chuyển Khoản</option>
                                <option value="CASH">Tiền Mặt</option>
                            </select>
                            <div className="search-input-wrapper">
                                <Search size={16} className="search-icon" />
                                <input type="text" placeholder="Tìm tham chiếu, NCC..." value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)} className="input" />
                            </div>
                            <button
                                onClick={() => exportToExcel(
                                    displayPayments.map(p => ({ "Mã GD": p.code, "Ngày": formatDate(p.date), "Nhà Cung Cấp": p.supplier?.name, "Hình Thức": p.paymentMethod, "Tham Chiếu": p.reference || '', "Số Tiền": p.amount })),
                                    `So_Phu_Chi_Tien_${startDate}_to_${endDate}`
                                )}
                                className="btn btn-secondary flex items-center gap-2"
                                title="Xuất Excel"
                            >
                                <Download size={16} /> Excel
                            </button>
                            <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2" title="In / Xuất PDF">
                                <Printer size={16} /> Print
                            </button>
                        </div>
                    </div>
                    <div className="table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Mã GD</th>
                                    <th>Ngày</th>
                                    <th>Nhà Cung Cấp</th>
                                    <th>Hình Thức</th>
                                    <th>Tham Chiếu</th>
                                    <th className="text-right">Số Tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentPag.paginatedItems.map(p => (
                                    <tr key={p.id}>
                                        <td className="font-bold">{p.code}</td>
                                        <td className="text-sm font-medium">{formatDate(p.date)}</td>
                                        <td className="font-bold text-sm">
                                            {p.supplierId ? (
                                                <Link href={`/suppliers/${p.supplierId}`} className="hover:text-primary hover:underline transition-colors block">
                                                    {p.supplier?.name}
                                                </Link>
                                            ) : (
                                                <span>{p.supplier?.name}</span>
                                            )}
                                        </td>
                                        <td>
                                            {p.paymentMethod === 'BANK_TRANSFER' ? (
                                                <span className="status-badge badge-info">Chuyển Khoản</span>
                                            ) : (
                                                <span className="status-badge badge-warning">Tiền Mặt</span>
                                            )}
                                        </td>
                                        <td className="text-sm text-gray-500 font-mono">{p.reference || '-'}</td>
                                        <td className="text-right font-bold text-success text-lg">{formatMoney(p.amount)}</td>
                                    </tr>
                                ))}
                                {paymentPag.paginatedItems.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-gray-500">Không có giao dịch thanh toán.</td></tr>}
                            </tbody>
                            {displayPayments.length > 0 && (
                                <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                    <tr>
                                        <td colSpan={5} className="text-right font-bold text-gray-700">TỔNG CỘNG ({displayPayments.length}):</td>
                                        <td className="text-right font-bold text-success">
                                            {formatMoney(displayPayments.reduce((sum, p) => sum + (p.amount || 0), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                        <Pagination {...paymentPag.paginationProps} />
                    </div>
                </div>
            )
            }
        </div >
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6, pointerEvents: 'none' }}>
            <Activity size={32} className="mb-2 text-gray-400" />
            <p className="text-sm text-gray-500 font-medium">{message}</p>
        </div>
    );
}
