'use client';

import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { Calendar, TrendingUp, DollarSign, Users, Package, FileText, CreditCard, Search, ArrowUpRight, Activity, Download, Printer } from 'lucide-react';
import Link from 'next/link';
import { exportToExcel, exportToPDF } from '@/lib/utils/export';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function SalesReportClient({ invoices, payments, expenses, customers, estimates = [], users, isAdminOrManager }: { invoices: any[], payments: any[], expenses: any[], customers: any[], estimates?: any[], users?: any[], isAdminOrManager?: boolean }) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState<'overview' | 'customer' | 'product' | 'estimate' | 'expense' | 'invoice' | 'payment'>('overview');

    // Filter states
    const [customerSearch, setCustomerSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [invoiceStatus, setInvoiceStatus] = useState('ALL');
    const [expenseSearch, setExpenseSearch] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('ALL');
    const [estimateSearch, setEstimateSearch] = useState('');
    const [estimateStatus, setEstimateStatus] = useState('ALL');
    const [paymentSearch, setPaymentSearch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('ALL');



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

    const filteredInvoices = useMemo(() => filterByDate(invoices), [invoices, startDate, endDate]);
    const filteredPayments = useMemo(() => filterByDate(payments), [payments, startDate, endDate]);
    const filteredExpenses = useMemo(() => filterByDate(expenses), [expenses, startDate, endDate]);
    const filteredEstimates = useMemo(() => filterByDate(estimates), [estimates, startDate, endDate]);

    // --- Tab 1: Overview Data ---
    const totalSales = filteredInvoices.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalDebt = customers.reduce((sum, c) => {
        const validInvoices = c.salesInvoices ? c.salesInvoices.filter((i: any) => !['CANCELLED', 'DRAFT'].includes(i.status)) : [];
        const exactSales = validInvoices.reduce((s: number, inv: any) => s + (Number(inv.totalAmount) || 0), 0);
        const exactPayments = validInvoices.reduce((s: number, inv: any) => s + (Number(inv.paidAmount) || 0), 0);
        return sum + (exactSales - exactPayments);
    }, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    const timelineData = useMemo(() => {
        const dataMap = new Map();

        filteredInvoices.forEach(b => {
            const dateStr = new Date(b.date).toISOString().split('T')[0];
            if (!dataMap.has(dateStr)) dataMap.set(dateStr, { date: dateStr, 'Doanh Thu': 0, 'Thực Thu': 0, 'Chi Phí': 0 });
            dataMap.get(dateStr)['Doanh Thu'] += b.totalAmount;
        });

        filteredPayments.forEach(p => {
            const dateStr = new Date(p.date).toISOString().split('T')[0];
            if (!dataMap.has(dateStr)) dataMap.set(dateStr, { date: dateStr, 'Doanh Thu': 0, 'Thực Thu': 0, 'Chi Phí': 0 });
            dataMap.get(dateStr)['Thực Thu'] += p.amount;
        });

        filteredExpenses.forEach(e => {
            const dateStr = new Date(e.date).toISOString().split('T')[0];
            if (!dataMap.has(dateStr)) dataMap.set(dateStr, { date: dateStr, 'Doanh Thu': 0, 'Thực Thu': 0, 'Chi Phí': 0 });
            dataMap.get(dateStr)['Chi Phí'] += e.amount;
        });

        const sortedData = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        return sortedData.map(d => ({
            ...d,
            displayDate: formatDate(new Date(d.date))
        }));
    }, [filteredInvoices, filteredPayments]);

    // --- Tab 2: Customer Data ---
    const customerReportData = useMemo(() => {
        const map = new Map();

        // Extract employeeId from URL if present
        const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const employeeId = searchParams?.get('employeeId');

        customers.forEach(currentCustomer => {
            // Determine exact debt dynamically by summing all valid invoices minus payments
            const validInvoices = currentCustomer.salesInvoices ? currentCustomer.salesInvoices.filter((i: any) => !['CANCELLED', 'DRAFT'].includes(i.status)) : [];
            const exactSales = validInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.totalAmount) || 0), 0);
            const exactPayments = validInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.paidAmount) || 0), 0);
            const exactDebt = exactSales - exactPayments;

            map.set(currentCustomer.id, {
                id: currentCustomer.id,
                code: currentCustomer.taxCode || 'N/A',
                name: currentCustomer.name,
                totalPurchased: 0,
                totalPaid: 0,
                currentDebt: exactDebt
            });
        });

        filteredInvoices.forEach(b => {
            if (b.customerId && map.has(b.customerId)) {
                map.get(b.customerId).totalPurchased += b.totalAmount;
            }
        });

        filteredPayments.forEach(p => {
            if (p.customerId && map.has(p.customerId)) {
                map.get(p.customerId).totalPaid += p.amount;
            }
        });

        let result = Array.from(map.values())
            .filter(c => {
                // If filtering by a specific employee, ONLY show customers that have actual transactions (purchases/payments) with this employee.
                // Otherwise, it would list EVERY customer with a debt in the database.
                if (employeeId) {
                    return c.totalPurchased > 0 || c.totalPaid > 0;
                }
                // Default: show if there's any activity OR any outstanding debt
                return c.totalPurchased > 0 || c.totalPaid > 0 || c.currentDebt > 0;
            })
            .sort((a, b) => b.totalPurchased - a.totalPurchased);

        if (customerSearch.trim()) {
            const query = customerSearch.toLowerCase();
            result = result.filter(c =>
                c.name?.toLowerCase().includes(query) ||
                c.code?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [customers, filteredInvoices, filteredPayments, customerSearch]);

    const topCustomersChartData = useMemo(() => {
        return customerReportData.slice(0, 5).map(c => ({
            name: c.name?.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
            'Doanh Thu': c.totalPurchased,
            'Thực Thu': c.totalPaid
        }));
    }, [customerReportData]);

    // --- Tab 3: Product Data ---
    const productReportData = useMemo(() => {
        const map = new Map();

        filteredInvoices.forEach(invoice => {
            if (invoice.items && Array.isArray(invoice.items)) {
                invoice.items.forEach((item: any) => {
                    const prodId = item.productId;
                    if (!map.has(prodId)) {
                        map.set(prodId, {
                            id: prodId,
                            sku: item.product?.sku || '',
                            name: item.product?.name || item.productName || item.customName || 'Sản phẩm không xác định',
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
    }, [filteredInvoices, productSearch]);

    const topProductsChartData = useMemo(() => {
        const rawData = productReportData;
        if (rawData.length <= 5) return rawData.map(p => ({ name: p.name, value: p.totalValue }));
        const top5 = rawData.slice(0, 5).map(p => ({ name: p.name, value: p.totalValue }));
        const others = rawData.slice(5).reduce((sum, p) => sum + p.totalValue, 0);
        return [...top5, { name: 'Khác', value: others }];
    }, [productReportData]);

    const getInvoiceStatusBadge = (inv: any) => {
        if (inv.status === 'CANCELLED') return <span className="status-badge badge-danger">Đã Hủy</span>;
        if (inv.status === 'PAID') return <span className="status-badge badge-success">Đã Thanh Toán</span>;
        if (inv.status === 'DRAFT') return <span className="status-badge badge-neutral">Dự Thảo</span>;

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (inv.dueDate) {
            const due = new Date(inv.dueDate);
            due.setHours(0, 0, 0, 0);
            if (due < now && (inv.totalAmount - (inv.paidAmount || 0)) > 0) {
                return <span className="status-badge badge-danger">Quá Hạn</span>;
            }
        }

        if (inv.status === 'PARTIAL_PAID') return <span className="status-badge badge-warning">Thu Một Phần</span>;
        if (inv.status === 'ISSUED') return <span className="status-badge badge-info">Ghi Nhận Nợ</span>;

        return <span className="status-badge badge-neutral">{inv.status}</span>;
    };

    // --- Tab 4 & 5 (Filtered Documents) ---
    const displayInvoices = useMemo(() => {
        let result = filteredInvoices;
        if (invoiceSearch.trim()) {
            const query = invoiceSearch.toLowerCase();
            result = result.filter(b => b.code?.toLowerCase().includes(query) || b.customer?.name?.toLowerCase().includes(query));
        }

        if (invoiceStatus !== 'ALL') {
            if (invoiceStatus === 'OVERDUE') {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                result = result.filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'DRAFT' && i.dueDate && new Date(i.dueDate) < now && (i.totalAmount - (i.paidAmount || 0)) > 0);
            } else if (invoiceStatus === 'DUE_SOON') {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                result = result.filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.status !== 'DRAFT' && i.dueDate && new Date(i.dueDate) >= now && (i.totalAmount - (i.paidAmount || 0)) > 0);
            } else {
                result = result.filter((i: any) => i.status === invoiceStatus);
            }
        }

        return result;
    }, [filteredInvoices, invoiceSearch, invoiceStatus]);

    const displayExpenses = useMemo(() => {
        let result = filteredExpenses;
        if (expenseSearch.trim()) {
            const query = expenseSearch.toLowerCase();
            result = result.filter(e => e.code?.toLowerCase().includes(query) || e.payee?.toLowerCase().includes(query) || e.customer?.name?.toLowerCase().includes(query) || e.supplier?.name?.toLowerCase().includes(query));
        }
        if (expenseCategory !== 'ALL') {
            result = result.filter(e => e.categoryId === expenseCategory);
        }
        return result;
    }, [filteredExpenses, expenseSearch, expenseCategory]);

    const expenseCategoriesList = useMemo(() => {
        const unique = new Map();
        expenses.forEach(e => {
            if (e.category) {
                unique.set(e.categoryId, e.category.name);
            }
        });
        return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
    }, [expenses]);

    const displayEstimates = useMemo(() => {
        let result = filteredEstimates;
        if (estimateSearch.trim()) {
            const query = estimateSearch.toLowerCase();
            result = result.filter(e => e.code?.toLowerCase().includes(query) || e.customer?.name?.toLowerCase().includes(query));
        }
        if (estimateStatus !== 'ALL') {
            result = result.filter(e => e.status === estimateStatus);
        }
        return result;
    }, [filteredEstimates, estimateSearch, estimateStatus]);

    const displayPayments = useMemo(() => {
        let result = filteredPayments;
        if (paymentSearch.trim()) {
            const query = paymentSearch.toLowerCase();
            result = result.filter(p => p.code?.toLowerCase().includes(query) || p.reference?.toLowerCase().includes(query) || p.customer?.name?.toLowerCase().includes(query));
        }
        if (paymentMethod !== 'ALL') {
            result = result.filter(p => p.paymentMethod === paymentMethod);
        }
        return result;
    }, [filteredPayments, paymentSearch, paymentMethod]);

    // Pagination hooks
    const customerPag = usePagination(customerReportData);
    const productPag = usePagination(productReportData);
    const estimatePag = usePagination(displayEstimates);
    const expensePag = usePagination(displayExpenses);
    const invoicePag = usePagination(displayInvoices);
    const paymentPag = usePagination(displayPayments);


    // Custom Premium Styles
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
        .badge-danger { background: #fee2e2; color: #dc2626; }
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

    return (
        <div className="p-4 md:p-6 w-full mx-auto max-w-[100vw] overflow-hidden">
            <style>{premiumStyles}</style>

            {/* Header */}
            <div className="page-header flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold mb-1">Báo Cáo Phân Tích Bán Hàng</h1>
                    <p className="text-gray-500 text-sm">Theo dõi hiệu suất kinh doanh, doanh thu và công nợ</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-start sm:items-center">
                    {isAdminOrManager && users && users.length > 0 && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-sm text-gray-500 font-medium whitespace-nowrap">Lọc NV:</span>
                            <select
                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:border-blue-500 flex-1 sm:flex-none"
                                defaultValue={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('employeeId') || '' : ''}
                                onChange={(e) => {
                                    const newEmployeeId = e.target.value;
                                    const params = new URLSearchParams(window.location.search);
                                    if (newEmployeeId) {
                                        params.set('employeeId', newEmployeeId);
                                    } else {
                                        params.delete('employeeId');
                                    }
                                    window.location.href = `/sales/reports?${params.toString()}`;
                                }}
                            >
                                <option value="">Tất cả nhân viên</option>
                                {users.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="filter-group w-full sm:w-auto justify-between sm:justify-start overflow-hidden">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400 shrink-0" />
                            <input type="date" className="filter-input w-full min-w-[110px]" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <span className="text-gray-400 font-bold shrink-0">→</span>
                        <input type="date" className="filter-input w-full min-w-[110px]" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="premium-tabs-wrapper">
                    <button className={`premium-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                        <TrendingUp size={16} /> Tổng Quan
                    </button>
                    <button className={`premium-tab ${activeTab === 'customer' ? 'active' : ''}`} onClick={() => setActiveTab('customer')}>
                        <Users size={16} /> Khách Hàng
                    </button>
                    <button className={`premium-tab ${activeTab === 'product' ? 'active' : ''}`} onClick={() => setActiveTab('product')}>
                        <Package size={16} /> Sản Phẩm
                    </button>
                    <button className={`premium-tab ${activeTab === 'estimate' ? 'active' : ''}`} onClick={() => setActiveTab('estimate')}>
                        <FileText size={16} /> Báo Giá
                    </button>
                    <button className={`premium-tab ${activeTab === 'expense' ? 'active' : ''}`} onClick={() => setActiveTab('expense')}>
                        <DollarSign size={16} /> Chi Phí
                    </button>
                    <button className={`premium-tab ${activeTab === 'invoice' ? 'active' : ''}`} onClick={() => setActiveTab('invoice')}>
                        <FileText size={16} /> Hóa Đơn Xuất
                    </button>
                    <button className={`premium-tab ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>
                        <CreditCard size={16} /> Dòng Tiền Thu
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}

            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div>
                    <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                        <div className="stat-card stat-card-blue">
                            <div className="stat-header">
                                <div className="stat-info">
                                    <div className="stat-title"><TrendingUp size={14} /> TỔNG DOANH THU</div>
                                    <div className="stat-value">{formatMoney(totalSales)}</div>
                                </div>
                                <div className="stat-icon"><Activity size={24} /></div>
                            </div>
                            <div className="text-sm font-medium mt-2 opacity-80" style={{ color: '#1d4ed8' }}>
                                {filteredInvoices.length} hóa đơn trong kỳ
                            </div>
                        </div>

                        <div className="stat-card stat-card-green">
                            <div className="stat-header">
                                <div className="stat-info">
                                    <div className="stat-title"><DollarSign size={14} /> THỰC THU TRONG KỲ</div>
                                    <div className="stat-value">{formatMoney(totalPayments)}</div>
                                </div>
                                <div className="stat-icon"><CreditCard size={24} /></div>
                            </div>
                            <div className="text-sm font-medium mt-2 opacity-80" style={{ color: '#047857' }}>
                                {filteredPayments.length} phiếu thu tiền
                            </div>
                        </div>

                        <div className="stat-card stat-card-amber">
                            <div className="stat-header">
                                <div className="stat-info">
                                    <div className="stat-title"><Users size={14} /> CÔNG NỢ PHẢI THU</div>
                                    <div className="stat-value">{formatMoney(totalDebt)}</div>
                                </div>
                                <div className="stat-icon"><ArrowUpRight size={24} /></div>
                            </div>
                            <div className="text-sm font-medium mt-2 opacity-80" style={{ color: '#b45309' }}>
                                Dư nợ tồn đọng từ khách hàng
                            </div>
                        </div>

                        <div className="stat-card" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', borderStyle: 'solid', borderWidth: '1px' }}>
                            <div className="stat-header">
                                <div className="stat-info">
                                    <div className="stat-title" style={{ color: '#b91c1c' }}><Activity size={14} /> TỔNG CHI PHÍ</div>
                                    <div className="stat-value text-danger">{formatMoney(totalExpenses)}</div>
                                </div>
                                <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}><Activity size={24} /></div>
                            </div>
                            <div className="text-sm font-medium mt-2 opacity-80" style={{ color: '#b91c1c' }}>
                                {filteredExpenses.length} khoản chi trong kỳ
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="card">
                        <h3 className="font-bold text-lg mb-4">Lưu Chuyển Dòng Tiền (Kinh Doanh)</h3>
                        <div style={{ height: '350px', width: '100%' }}>
                            {timelineData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                                    <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorDoanhThu" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorThucThu" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorChiPhi" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="displayDate" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis tickFormatter={(val) => {
                                            if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}T`;
                                            if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M`;
                                            return val;
                                        }} stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} width={60} dx={-10} />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <RechartsTooltip content={<CustomRechartsTooltip />} />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                        <Area type="monotone" dataKey="Doanh Thu" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorDoanhThu)" />
                                        <Area type="monotone" dataKey="Thực Thu" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorThucThu)" />
                                        <Area type="monotone" dataKey="Chi Phí" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorChiPhi)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-100 h-full">
                                    <TrendingUp size={48} className="text-gray-300 mb-4" />
                                    <p className="font-medium text-gray-500">Không có dữ liệu trong khoảng thời gian này.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. CUSTOMER TAB */}
            {activeTab === 'customer' && (
                <div>
                    <div className="card mb-6">
                        <h3 className="font-bold text-lg mb-4">Top 5 Khách Hàng (Theo Doanh Thu)</h3>
                        <div style={{ height: '300px', width: '100%' }}>
                            {topCustomersChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                                    <BarChart data={topCustomersChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }} barGap={6}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis tickFormatter={(val) => `${val / 1000000}M`} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} width={60} />
                                        <RechartsTooltip content={<CustomRechartsTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
                                        <Bar dataKey="Doanh Thu" fill="var(--primary)" radius={[4, 4, 4, 4]} maxBarSize={40} />
                                        <Bar dataKey="Thực Thu" fill="var(--success)" radius={[4, 4, 4, 4]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-100 h-full">
                                    <Users size={48} className="text-gray-300 mb-4" />
                                    <p className="font-medium text-gray-500">Không có dữ liệu khách hàng.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ padding: 0 }}>
                        <div className="search-card flex flex-col sm:flex-row justify-between gap-4" style={{ padding: '1.25rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
                            <h3 className="font-bold text-lg">Phân Tích Khách Hàng</h3>
                            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                                <div className="search-input-wrapper flex-1 sm:flex-none min-w-[200px]">
                                    <Search size={16} className="search-icon" />
                                    <input type="text" placeholder="Tìm tên, MST..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="input w-full" />
                                </div>
                                <button
                                    onClick={() => exportToExcel(
                                        customerReportData.map(c => ({ "MST/Mã": c.code, "Khách Hàng": c.name, "Tổng Doanh Thu": c.totalPurchased, "Đã Thu": c.totalPaid, "Nợ Phải Thu": c.currentDebt })),
                                        `Bao_Cao_Khach_Hang_${startDate}_to_${endDate}`
                                    )}
                                    className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center"
                                >
                                    <Download size={16} /> <span className="hidden sm:inline">Excel</span>
                                </button>
                                <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center">
                                    <Printer size={16} /> <span className="hidden sm:inline">Print</span>
                                </button>
                            </div>
                        </div>
                        <div className="table-wrapper overflow-x-auto w-full" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>MST / Mã</th>
                                        <th>Khách Hàng</th>
                                        <th className="text-right">Doanh Thu (Kỳ)</th>
                                        <th className="text-right">Đã Thu (Kỳ)</th>
                                        <th className="text-right">Nợ Phải Thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerPag.paginatedItems.map(c => (
                                        <tr key={c.id}>
                                            <td className="font-medium text-gray-500">
                                                <Link href={`/customers/${c.id}`} className="hover:text-primary hover:underline transition-colors block">
                                                    {c.code}
                                                </Link>
                                            </td>
                                            <td className="font-bold">
                                                <Link href={`/customers/${c.id}`} className="hover:text-primary hover:underline transition-colors block">
                                                    {c.name}
                                                </Link>
                                            </td>
                                            <td className="text-right font-medium">{formatMoney(c.totalPurchased)}</td>
                                            <td className="text-right font-medium text-success">{formatMoney(c.totalPaid)}</td>
                                            <td className="text-right font-bold text-danger">{formatMoney(c.currentDebt)}</td>
                                        </tr>
                                    ))}
                                    {customerPag.paginatedItems.length === 0 && (
                                        <tr><td colSpan={5} className="text-center p-8 text-gray-500">Không tìm thấy khách hàng nào.</td></tr>
                                    )}
                                </tbody>
                                {customerReportData.length > 0 && (
                                    <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                        <tr>
                                            <td colSpan={2} className="text-right font-bold text-gray-700">TỔNG CỘNG:</td>
                                            <td className="text-right font-bold text-primary">
                                                {formatMoney(customerReportData.reduce((sum, c) => sum + (c.totalPurchased || 0), 0))}
                                            </td>
                                            <td className="text-right font-bold text-success">
                                                {formatMoney(customerReportData.reduce((sum, c) => sum + (c.totalPaid || 0), 0))}
                                            </td>
                                            <td className="text-right font-bold text-danger">
                                                {formatMoney(customerReportData.reduce((sum, c) => sum + (c.currentDebt || 0), 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                            <Pagination {...customerPag.paginationProps} />
                        </div>
                    </div>
                </div>
            )}

            {/* 3. PRODUCT TAB */}
            {activeTab === 'product' && (
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="card lg:col-span-2" style={{ padding: 0 }}>
                        <div className="search-card flex flex-col sm:flex-row justify-between gap-4" style={{ padding: '1.25rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
                            <h3 className="font-bold text-lg">Sản Phẩm Tiêu Thụ</h3>
                            <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                                <div className="search-input-wrapper flex-1 sm:flex-none min-w-[200px]">
                                    <Search size={16} className="search-icon" />
                                    <input type="text" placeholder="Tìm mã SP..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="input w-full" />
                                </div>
                                <button
                                    onClick={() => exportToExcel(
                                        productReportData.map(p => ({ "Mã SP": p.sku, "Tên Sản Phẩm": p.name, "ĐVT": p.unit, "Số Lượng Xuất": p.totalQuantity, "Giá Bán TB": p.avgPrice, "Thành Tiền": p.totalValue })),
                                        `Chi_Tiet_San_Pham_Xuat_${startDate}_to_${endDate}`
                                    )}
                                    className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center"
                                >
                                    <Download size={16} /> <span className="hidden sm:inline">Excel</span>
                                </button>
                                <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center">
                                    <Printer size={16} /> <span className="hidden sm:inline">Print</span>
                                </button>
                            </div>
                        </div>
                        <div className="table-wrapper overflow-x-auto w-full" style={{ border: 'none', borderRadius: '0', maxHeight: '500px' }}>
                            <table>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th>Mã SP</th>
                                        <th>Tên Sản Phẩm</th>
                                        <th className="text-center">ĐVT</th>
                                        <th className="text-center">SL Xuất</th>
                                        <th className="text-right">Giá Bán TB</th>
                                        <th className="text-right">Doanh Thu</th>
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
                                        <tr><td colSpan={6} className="text-center p-8 text-gray-500">Chưa tiêu thụ sản phẩm nào.</td></tr>
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
                        <h3 className="font-bold text-lg mb-6 w-full text-center">Cơ Cấu Doanh Thu</h3>
                        <div style={{ height: '300px', width: '100%' }}>
                            {topProductsChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
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
                                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-100 h-full">
                                    <Package size={48} className="text-gray-300 mb-4" />
                                    <p className="font-medium text-gray-500">Chưa có dữ liệu.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 3.5 ESTIMATES TAB */}
            {activeTab === 'estimate' && (
                <div className="card" style={{ padding: 0 }}>
                    <div className="search-card flex flex-col xl:flex-row justify-between gap-4" style={{ padding: '1.25rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
                        <h3 className="font-bold text-lg"><FileText size={18} className="inline mr-2 text-primary" /> Báo Giá / Ước Tính</h3>
                        <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                            <select className="input flex-1 sm:flex-none" style={{ minWidth: '130px', padding: '0.4rem' }} value={estimateStatus} onChange={e => setEstimateStatus(e.target.value)}>
                                <option value="ALL">Mọi TT</option>
                                <option value="DRAFT">Dự Thảo</option>
                                <option value="SENT">Đã Gửi KH</option>
                                <option value="CONFIRMED">Đã Chốt</option>
                                <option value="CANCELLED">Hủy</option>
                            </select>
                            <div className="search-input-wrapper flex-1 sm:flex-none min-w-[200px]">
                                <Search size={16} className="search-icon" />
                                <input type="text" placeholder="Tìm mã báo giá..." value={estimateSearch} onChange={e => setEstimateSearch(e.target.value)} className="input w-full" />
                            </div>
                            <button
                                onClick={() => exportToExcel(
                                    displayEstimates.map(e => ({ "Mã/Ngày": `${e.code} (${formatDate(e.date)})`, "Khách Hàng": e.customer?.name, "Trạng Thái": e.status, "Tổng Tiền": e.totalAmount })),
                                    `Bao_Gia_${startDate}_to_${endDate}`
                                )}
                                className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center"
                            >
                                <Download size={16} /> <span className="hidden sm:inline">Excel</span>
                            </button>
                            <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center">
                                <Printer size={16} /> <span className="hidden sm:inline">Print</span>
                            </button>
                        </div>
                    </div>
                    <div className="table-wrapper overflow-x-auto w-full" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)', maxHeight: '500px' }}>
                        <table>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th>Mã / Ngày</th>
                                    <th>Khách Hàng</th>
                                    <th className="text-center">Trạng Thái</th>
                                    <th className="text-right">Tổng Tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {estimatePag.paginatedItems.map(e => (
                                    <tr key={e.id}>
                                        <td>
                                            <Link href={`/sales/estimates/${e.id}`} className="font-bold hover:text-primary hover:underline transition-colors block">{e.code}</Link>
                                            <div className="text-sm text-gray-500">{formatDate(e.date)}</div>
                                        </td>
                                        <td className="font-medium text-sm">{e.customer?.name}</td>
                                        <td className="text-center">
                                            {e.status === 'CONFIRMED' ? <span className="status-badge badge-success">Đã Chốt</span> :
                                                e.status === 'SENT' ? <span className="status-badge badge-warning">Đã gửi</span> :
                                                    e.status === 'CANCELLED' ? <span className="status-badge badge-danger">Đã hủy</span> :
                                                        <span className="status-badge badge-neutral">Dự Thảo</span>}
                                        </td>
                                        <td className="text-right font-bold">{formatMoney(e.totalAmount)}</td>
                                    </tr>
                                ))}
                                {estimatePag.paginatedItems.length === 0 && <tr><td colSpan={4} className="text-center p-8 text-gray-500">Không có báo giá.</td></tr>}
                            </tbody>
                            {displayEstimates.length > 0 && (
                                <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                    <tr>
                                        <td colSpan={3} className="text-right font-bold text-gray-700">TỔNG CỘNG ({displayEstimates.length}):</td>
                                        <td className="text-right font-bold text-primary">
                                            {formatMoney(displayEstimates.reduce((sum, e) => sum + (e.totalAmount || 0), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                        <Pagination {...estimatePag.paginationProps} />
                    </div>
                </div>
            )}

            {/* 4. EXPENSES TAB */}
            {activeTab === 'expense' && (
                <div className="card" style={{ padding: 0 }}>
                    <div className="search-card flex flex-col xl:flex-row justify-between gap-4" style={{ padding: '1.25rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
                        <h3 className="font-bold text-lg"><DollarSign size={18} className="inline mr-2 text-primary" /> Phân Tích Chi Phí</h3>
                        <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                            <select className="input flex-1 sm:flex-none" style={{ minWidth: '150px', padding: '0.4rem' }} value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                                <option value="ALL">Mọi Danh Mục</option>
                                {expenseCategoriesList.map((cat: { id: string, name: string }) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <div className="search-input-wrapper flex-1 sm:flex-none min-w-[200px]">
                                <Search size={16} className="search-icon" />
                                <input type="text" placeholder="Tìm mã, đối tượng..." value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} className="input w-full" />
                            </div>
                            <button
                                onClick={() => exportToExcel(
                                    displayExpenses.map(e => ({ "Mã Phiếu/Ngày": `${e.code} (${formatDate(e.date)})`, "Đối Tượng": e.customer?.name || e.supplier?.name || e.payee, "Danh Mục": e.category?.name, "Tổng Tiền": e.amount })),
                                    `Chi_Phi_${startDate}_to_${endDate}`
                                )}
                                className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center"
                            >
                                <Download size={16} /> <span className="hidden sm:inline">Excel</span>
                            </button>
                            <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center">
                                <Printer size={16} /> <span className="hidden sm:inline">Print</span>
                            </button>
                        </div>
                    </div>
                    <div className="table-wrapper overflow-x-auto w-full" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)', maxHeight: '500px' }}>
                        <table>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th>Mã Ph / Ngày</th>
                                    <th>Đối Tượng</th>
                                    <th>Danh Mục</th>
                                    <th className="text-right">Số Tiền Chi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expensePag.paginatedItems.map(e => (
                                    <tr key={e.id}>
                                        <td>
                                            <Link href={`/sales/expenses/${e.id}`} className="font-bold hover:text-primary hover:underline transition-colors block">{e.code}</Link>
                                            <div className="text-sm text-gray-500">{formatDate(e.date)}</div>
                                        </td>
                                        <td className="font-medium text-sm">
                                            {e.customer ? (
                                                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-200">KH: {e.customer.name}</span>
                                            ) : e.supplier ? (
                                                <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs border border-orange-200">NCC: {e.supplier.name}</span>
                                            ) : (
                                                <span className="text-gray-700 font-medium">{e.payee}</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md border border-slate-200 font-medium">
                                                {e.category?.name}
                                            </span>
                                        </td>
                                        <td className="text-right font-bold text-danger">{formatMoney(e.amount)}</td>
                                    </tr>
                                ))}
                                {expensePag.paginatedItems.length === 0 && <tr><td colSpan={4} className="text-center p-8 text-gray-500">Chưa có khoản chi phí nào.</td></tr>}
                            </tbody>
                            {displayExpenses.length > 0 && (
                                <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                    <tr>
                                        <td colSpan={3} className="text-right font-bold text-gray-700">TỔNG CHI PHÍ ({displayExpenses.length}):</td>
                                        <td className="text-right font-bold text-danger text-lg">
                                            {formatMoney(displayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                        <Pagination {...expensePag.paginationProps} />
                    </div>
                </div>
            )}

            {/* 5. INVOICES TAB */}
            {activeTab === 'invoice' && (
                <div className="card" style={{ padding: 0 }}>
                    <div className="search-card flex flex-col xl:flex-row justify-between gap-4" style={{ padding: '1.25rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
                        <h3 className="font-bold text-lg"><FileText size={18} className="inline mr-2 text-primary" /> Hóa Đơn Bán Hàng</h3>
                        <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                            <select className="input flex-1 sm:flex-none" style={{ minWidth: '150px', padding: '0.4rem' }} value={invoiceStatus} onChange={e => setInvoiceStatus(e.target.value)}>
                                <option value="ALL">Mọi Tình Trạng</option>
                                <option value="DRAFT">Dự Thảo</option>
                                <option value="ISSUED">Ghi Nhận Nợ</option>
                                <option value="PARTIAL_PAID">Thu Một Phần</option>
                                <option value="PAID">Đã Thanh Toán</option>
                                <option value="OVERDUE">Quá Hạn</option>
                                <option value="DUE_SOON">Sắp Tới Hạn</option>
                                <option value="CANCELLED">Đã Hủy</option>
                            </select>
                            <div className="search-input-wrapper flex-1 sm:flex-none min-w-[200px]">
                                <Search size={16} className="search-icon" />
                                <input type="text" placeholder="Tìm mã xuất, Khách hàng..." value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} className="input w-full" />
                            </div>
                            <button
                                onClick={() => exportToExcel(
                                    displayInvoices.map(b => ({ "Mã/Ngày": `${b.code} (${formatDate(b.date)})`, "Khách Hàng": b.customer?.name, "Doanh Thu": b.totalAmount, "Đã Thu": b.paidAmount, "Trạng Thái": b.totalAmount > b.paidAmount ? 'Chưa Thu Đủ' : 'Đã Thanh Toán' })),
                                    `Hoa_Don_Xuat_${startDate}_to_${endDate}`
                                )}
                                className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center"
                            >
                                <Download size={16} /> <span className="hidden sm:inline">Excel</span>
                            </button>
                            <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center">
                                <Printer size={16} /> <span className="hidden sm:inline">Print</span>
                            </button>
                        </div>
                    </div>
                    <div className="table-wrapper overflow-x-auto w-full" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)', maxHeight: '500px' }}>
                        <table>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th>Mã / Ngày</th>
                                    <th>Khách Hàng</th>
                                    <th className="text-center">Trạng Thái</th>
                                    <th className="text-right">Doanh Thu</th>
                                    <th className="text-right">Tình Trạng Thu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoicePag.paginatedItems.map(b => (
                                    <tr key={b.id}>
                                        <td>
                                            <Link href={`/sales/invoices/${b.id}`} className="font-bold hover:text-primary hover:underline transition-colors block">{b.code}</Link>
                                            <div className="text-sm text-gray-500">{formatDate(b.date)}</div>
                                        </td>
                                        <td className="font-medium text-sm">
                                            {b.customerId ? (
                                                <Link href={`/customers/${b.customerId}`} className="hover:text-primary hover:underline transition-colors block">
                                                    {b.customer?.name}
                                                </Link>
                                            ) : (
                                                <span>{b.customer?.name}</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {getInvoiceStatusBadge(b)}
                                        </td>
                                        <td className="text-right font-bold text-primary">{formatMoney(b.totalAmount)}</td>
                                        <td className="text-right">
                                            {b.totalAmount > b.paidAmount ? (
                                                <span className="status-badge badge-warning">Còn Nợ {formatMoney(b.totalAmount - b.paidAmount)}</span>
                                            ) : (
                                                <span className="status-badge badge-success">Đã thu đủ</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {invoicePag.paginatedItems.length === 0 && <tr><td colSpan={5} className="text-center p-8 text-gray-500">Không có hóa đơn xuất bán.</td></tr>}
                            </tbody>
                            {displayInvoices.length > 0 && (
                                <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                    <tr>
                                        <td colSpan={3} className="text-right font-bold text-gray-700">TỔNG CỘNG ({displayInvoices.length}):</td>
                                        <td className="text-right font-bold text-primary">
                                            {formatMoney(displayInvoices.reduce((sum, b) => sum + (b.totalAmount || 0), 0))}
                                        </td>
                                        <td className="text-right font-bold text-danger">
                                            Lỗ hổng {formatMoney(displayInvoices.reduce((sum, b) => sum + (b.totalAmount - (b.paidAmount || 0)), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                        <Pagination {...invoicePag.paginationProps} />
                    </div>
                </div>
            )}

            {/* 6. PAYMENTS TAB */}
            {activeTab === 'payment' && (
                <div className="card" style={{ padding: 0 }}>
                    <div className="search-card flex flex-col xl:flex-row justify-between gap-4" style={{ padding: '1.25rem', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>
                        <h3 className="font-bold text-lg"><CreditCard size={18} className="inline mr-2 text-primary" /> Phiếu Thu Tiền</h3>
                        <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                            <select className="input flex-1 sm:flex-none" style={{ minWidth: '130px', padding: '0.4rem' }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                <option value="ALL">Mọi P/T</option>
                                <option value="CASH">Tiền mặt</option>
                                <option value="BANK_TRANSFER">Chuyển khoản</option>
                                <option value="CREDIT">Cấn trừ / Khác</option>
                            </select>
                            <div className="search-input-wrapper flex-1 sm:flex-none min-w-[200px]">
                                <Search size={16} className="search-icon" />
                                <input type="text" placeholder="Tìm phiếu, tham chiếu..." value={paymentSearch} onChange={e => setPaymentSearch(e.target.value)} className="input w-full" />
                            </div>
                            <button
                                onClick={() => exportToExcel(
                                    displayPayments.map(p => ({ "Mã/Ngày": `${p.code} (${formatDate(p.date)})`, "Khách Hàng": p.customer?.name, "Số Tiền": p.amount, "Phương Thức": p.paymentMethod, "Thực Thu Của Khách": p.allocations?.length > 0 ? "Đã phân bổ" : "Chưa phân bổ" })),
                                    `Thu_Tien_${startDate}_to_${endDate}`
                                )}
                                className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center"
                            >
                                <Download size={16} /> <span className="hidden sm:inline">Excel</span>
                            </button>
                            <button onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2 flex-1 sm:flex-none justify-center">
                                <Printer size={16} /> <span className="hidden sm:inline">Print</span>
                            </button>
                        </div>
                    </div>
                    <div className="table-wrapper overflow-x-auto w-full" style={{ border: 'none', borderRadius: '0 0 var(--radius) var(--radius)', maxHeight: '500px' }}>
                        <table>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th>Mã PT / Ngày</th>
                                    <th>Khách Hàng</th>
                                    <th>Phương Thức</th>
                                    <th className="text-right">Số Tiền Thu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentPag.paginatedItems.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <Link href={`/sales/payments/${p.id}`} className="font-bold hover:text-primary hover:underline transition-colors block">{p.code}</Link>
                                            <div className="text-sm text-gray-500">{formatDate(p.date)} {p.reference && `• Ref: ${p.reference}`}</div>
                                        </td>
                                        <td className="font-medium text-sm">{p.customer?.name}</td>
                                        <td>
                                            <span className={`status-badge ${p.paymentMethod === 'BANK_TRANSFER' ? 'badge-info' : p.paymentMethod === 'CASH' ? 'badge-success' : 'badge-neutral'}`}>
                                                {p.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : p.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Khác'}
                                            </span>
                                        </td>
                                        <td className="text-right font-bold text-success">{formatMoney(p.amount)}</td>
                                    </tr>
                                ))}
                                {paymentPag.paginatedItems.length === 0 && <tr><td colSpan={4} className="text-center p-8 text-gray-500">Không có giao dịch thu.</td></tr>}
                            </tbody>
                            {displayPayments.length > 0 && (
                                <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                    <tr>
                                        <td colSpan={3} className="text-right font-bold text-gray-700">TỔNG CỘNG ({displayPayments.length}):</td>
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
            )}
        </div>
    );
}
