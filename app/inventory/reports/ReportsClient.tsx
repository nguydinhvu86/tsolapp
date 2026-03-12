'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Button } from '@/app/components/ui/Button';
import { Package, Search, History, FileSpreadsheet, Printer } from 'lucide-react';
import { getStockLedger, getTransactionReport, getInOutBalanceReport } from '../report-actions';
import * as XLSX from 'xlsx';
import { exportToExcel } from '@/lib/utils/export';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Utility for date string formatting "YYYY-MM-DD" for HTML input
const toDateInputString = (date: Date) => {
    return date.toISOString().split('T')[0];
};

const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
};

export default function ReportsClient({ initialValuation, products, warehouses, productGroups = [] }: { initialValuation: any[], products: any[], warehouses: any[], productGroups?: any[] }) {
    const [activeTab, setActiveTab] = useState<'VALUATION' | 'LEDGER' | 'TRANSACTIONS' | 'IN_OUT_BALANCE'>('VALUATION');

    // Global Date Filter
    const [startDate, setStartDate] = useState(toDateInputString(getFirstDayOfMonth()));
    const [endDate, setEndDate] = useState(toDateInputString(new Date()));

    // Valuation State
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const [groupFilter, setGroupFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [ledgerProduct, setLedgerProduct] = useState('');
    const [ledgerWarehouse, setLedgerWarehouse] = useState('');
    const [ledgerData, setLedgerData] = useState<any[]>([]);
    const [isLoadingLedger, setIsLoadingLedger] = useState(false);

    // Transactions State
    const [txnType, setTxnType] = useState('ALL');
    const [txnWarehouse, setTxnWarehouse] = useState('');
    const [txnProduct, setTxnProduct] = useState('');
    const [txnGroup, setTxnGroup] = useState('');
    const [txnData, setTxnData] = useState<any[]>([]);
    const [isLoadingTxn, setIsLoadingTxn] = useState(false);

    // In/Out/Balance State
    const [iobWarehouse, setIobWarehouse] = useState('');
    const [iobProduct, setIobProduct] = useState('');
    const [iobGroup, setIobGroup] = useState('');
    const [iobData, setIobData] = useState<any[]>([]);
    const [isLoadingIob, setIsLoadingIob] = useState(false);

    const iobChartData = React.useMemo(() => {
        const sorted = [...iobData].sort((a, b) => (b.totalIn + b.totalOut) - (a.totalIn + a.totalOut));
        return sorted.slice(0, 10).map(item => ({
            name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
            'Nhập': item.totalIn,
            'Xuất': item.totalOut,
            sku: item.sku
        }));
    }, [iobData]);

    // Filter Valuation
    const filteredValuation = initialValuation.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAssetValue = filteredValuation.reduce((acc, curr) => acc + curr.totalValue, 0);

    const formatMoney = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

    const { paginatedItems: paginatedValuation, paginationProps: valuationProps } = usePagination(filteredValuation, 25);
    const { paginatedItems: paginatedLedger, paginationProps: ledgerProps } = usePagination(ledgerData, 25);
    const { paginatedItems: paginatedTxn, paginationProps: txnProps } = usePagination(txnData, 25);
    const { paginatedItems: paginatedIob, paginationProps: iobProps } = usePagination(iobData, 25);

    // Valuation Chart Data
    const valuationChartData = React.useMemo(() => {
        const grouped = filteredValuation.reduce((acc, curr) => {
            const group = curr.groupName || 'Chưa phân nhóm';
            acc[group] = (acc[group] || 0) + curr.totalValue;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value);
    }, [filteredValuation]);

    const formatDate = (d: string | Date) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));

    const txnChartData = React.useMemo(() => {
        // Group transactions by Date and Type to show volume over time
        const grouped: Record<string, { date: string, Nhập: number, Xuất: number }> = {};

        txnData.forEach(txn => {
            const dStr = formatDate(txn.date).split(' ')[0]; // Just the date part
            if (!grouped[dStr]) {
                grouped[dStr] = { date: dStr, Nhập: 0, Xuất: 0 };
            }

            // For a simple volume metric, we can count the number of transactions or sum the items
            // Summarizing quantity of items might be better
            const qty = txn.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

            if (txn.type === 'IN') {
                grouped[dStr].Nhập += qty;
            } else if (txn.type === 'OUT') {
                grouped[dStr].Xuất += qty;
            }
        });

        // Convert to array and sort by date chronologically
        return Object.values(grouped).sort((a, b) => {
            // Very basic date sort based on the string format "DD thg MM, YYYY"
            // It's better to sort the original Date objects, but we'll use a hack for now or just trust the backend sort
            return 1; // Relying loosely on backend ordering
        });
    }, [txnData, formatDate]);

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

    const loadLedger = async () => {
        if (!ledgerProduct) {
            alert("Vui lòng chọn một mặt hàng để xem Thẻ Kho!");
            return;
        }
        try {
            setIsLoadingLedger(true);
            const data = await getStockLedger(ledgerProduct, ledgerWarehouse || undefined);
            const filteredData = data.filter(r => {
                const rowDateStr = toDateInputString(r.date);
                return rowDateStr >= startDate && rowDateStr <= endDate;
            });
            setLedgerData(filteredData);
        } catch (error) {
            console.error(error);
            alert("Lỗi tải Thẻ kho.");
        } finally {
            setIsLoadingLedger(false);
        }
    };

    const loadTransactions = async () => {
        try {
            setIsLoadingTxn(true);
            const data = await getTransactionReport(txnType, startDate, endDate, txnWarehouse || undefined, txnProduct || undefined, txnGroup || undefined);
            setTxnData(data);
        } catch (error) {
            console.error(error);
            alert("Lỗi tải báo cáo giao dịch.");
        } finally {
            setIsLoadingTxn(false);
        }
    };

    const loadInOutBalance = async () => {
        try {
            setIsLoadingIob(true);
            const data = await getInOutBalanceReport(startDate, endDate, iobWarehouse || undefined, iobProduct || undefined, iobGroup || undefined);
            if (!data) throw new Error("Server returned undefined data.");
            // Hide rows where everything is 0
            setIobData(data.filter((r: any) => r.openingBalance !== 0 || r.totalIn !== 0 || r.totalOut !== 0 || r.closingBalance !== 0));
        } catch (error) {
            console.error(error);
            alert("Lỗi tải báo cáo Xuất-Nhập-Tồn.");
        } finally {
            setIsLoadingIob(false);
        }
    };

    const handleExportValuation = () => {
        exportToExcel(
            filteredValuation.map((v: any) => ({
                'Mã SKU': v.sku,
                'Tên Sản Phẩm': v.name,
                'Nhóm': v.groupName || '-',
                'ĐVT': v.unit,
                'Giá Vốn': v.price,
                'Tổng Tồn': v.qty,
                'Thành Tiền': v.totalValue,
                'Trạng Thái': v.qty <= (v.minStockLevel || 0) ? 'CẦN NHẬP' : 'BÌNH THƯỜNG'
            })),
            `Bao_Cao_Ton_Kho_Hien_Tai`
        );
    };

    const handleExportLedger = () => {
        if (ledgerData.length === 0) {
            alert("Không có dữ liệu thẻ kho để xuất.");
            return;
        }
        exportToExcel(
            ledgerData.map((row: any) => ({
                'Ngày/Giờ': formatDate(row.date),
                'Mã Phiếu': row.code,
                'Diễn Giải Lệnh': row.type,
                'Ghi Chú': row.notes || '',
                'Biến Động': row.change,
                'Tồn Cuối': row.runningBalance
            })),
            `The_Kho_${ledgerProduct}_from_${startDate}_to_${endDate}`
        );
    };

    const handleExportTxn = () => {
        if (txnData.length === 0) return alert("Không có dữ liệu.");
        exportToExcel(
            txnData.map((row: any) => ({
                'Ngày': formatDate(row.date),
                'Mã Phiếu': row.code,
                'Loại': row.type === 'IN' ? 'Nhập' : row.type === 'OUT' ? 'Xuất' : row.type === 'TRANSFER' ? 'Chuyển Kho' : 'Kiểm Kê/Điều Chỉnh',
                'Sản Phẩm': row.items.map((i: any) => `${i.product.name} (x${i.quantity})`).join(', '),
                'Nhóm SP': row.items.map((i: any) => i.product.group?.name || '-').join(', '),
                'Từ Kho': row.fromWarehouse?.name || '',
                'Đến Kho': row.toWarehouse?.name || '',
                'Người Tạo': row.creator?.name || '',
                'Trạng Thái': row.status
            })),
            `Bao_Cao_Giao_Dich_${startDate}_to_${endDate}`
        );
    };

    const handleExportIob = () => {
        if (iobData.length === 0) return alert("Không có dữ liệu.");
        exportToExcel(
            iobData.map((row: any) => ({
                'Mã SKU': row.sku,
                'Tên Sản Phẩm': row.name,
                'Nhóm': row.groupName || '-',
                'ĐVT': row.unit,
                'Tồn Đầu Kỳ': row.openingBalance,
                'Nhập Trong Kỳ': row.totalIn,
                'Xuất Trong Kỳ': row.totalOut,
                'Tồn Cuối Kỳ': row.closingBalance
            })),
            `Bao_Cao_Xuat_Nhap_Ton_${startDate}_to_${endDate}`
        );
    };

    return (
        <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', backgroundColor: '#fafafa' }}>
                <button
                    onClick={() => setActiveTab('VALUATION')}
                    style={{
                        flex: 1, padding: '1rem', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
                        color: activeTab === 'VALUATION' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'VALUATION' ? '2px solid var(--primary)' : '2px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    TỔNG HỢP TỒN KHO & GIÁ TRỊ VẬT TƯ
                </button>
                <button
                    onClick={() => setActiveTab('LEDGER')}
                    style={{
                        flex: 1, padding: '1rem', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
                        color: activeTab === 'LEDGER' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'LEDGER' ? '2px solid var(--primary)' : '2px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    SỔ CHI TIẾT (THẺ KHO)
                </button>
                <button
                    onClick={() => setActiveTab('TRANSACTIONS')}
                    style={{
                        flex: 1, padding: '1rem', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
                        color: activeTab === 'TRANSACTIONS' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'TRANSACTIONS' ? '2px solid var(--primary)' : '2px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    LỊCH SỬ GIAO DỊCH
                </button>
                <button
                    onClick={() => setActiveTab('IN_OUT_BALANCE')}
                    style={{
                        flex: 1, padding: '1rem', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
                        color: activeTab === 'IN_OUT_BALANCE' ? 'var(--primary)' : 'var(--text-muted)',
                        borderBottom: activeTab === 'IN_OUT_BALANCE' ? '2px solid var(--primary)' : '2px solid transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    BÁO CÁO XUẤT NHẬP TỒN
                </button>
            </div>

            {/* Global Date Filter for Reports that need it */}
            {activeTab !== 'VALUATION' && (
                <div style={{ padding: '1.5rem 1.5rem 0 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Thời gian:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, color: 'var(--text-main)' }}
                        />
                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 600, color: 'var(--text-main)' }}
                        />
                    </div>
                </div>
            )}

            <div style={{ padding: '1.5rem' }}>

                {/* --- TAB 1: TỔNG HỢP TỒN KHO --- */}
                {activeTab === 'VALUATION' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                            <div style={{ padding: '1.5rem', borderRadius: 'var(--radius)', backgroundColor: 'rgba(79, 70, 229, 0.05)', border: '1px solid rgba(79, 70, 229, 0.1)', flex: 1 }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tổng Giá Trị Tồn Kho</p>
                                <p style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 800 }}>{formatMoney(totalAssetValue)}</p>
                            </div>
                            <div style={{ padding: '1.5rem', borderRadius: 'var(--radius)', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', flex: 1 }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Vật Tư Cần Nhập Thêm</p>
                                <p style={{ color: '#ef4444', fontSize: '1.75rem', fontWeight: 800 }}>
                                    {filteredValuation.filter(v => v.qty <= (v.minStockLevel || 0)).length} <span style={{ fontSize: '1rem', fontWeight: 600 }}>Mặt hàng</span>
                                </p>
                            </div>
                        </div>

                        {valuationChartData.length > 0 && (
                            <div style={{ padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', backgroundColor: '#fff' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Cơ Cấu Giá Trị Theo Nhóm Sản Phẩm</h3>
                                <div style={{ height: '300px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={valuationChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {valuationChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: any) => formatMoney(value)} />
                                            <Legend verticalAlign="middle" align="right" layout="vertical" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '300px' }}>
                                <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên hoặc mã SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem',
                                        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                        outline: 'none', transition: 'border-color 0.2s', fontSize: '0.875rem'
                                    }}
                                />
                            </div>

                            <form action="" style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                                <select
                                    name="groupId"
                                    value={groupFilter}
                                    onChange={(e) => {
                                        setGroupFilter(e.target.value);
                                        e.target.form?.submit(); // Auto submit to reload server props
                                    }}
                                    style={{
                                        padding: '0.625rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                        outline: 'none', fontSize: '0.875rem', backgroundColor: 'white', minWidth: '150px'
                                    }}
                                >
                                    <option value="">Tất cả Nhóm</option>
                                    {productGroups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                                <select
                                    name="warehouseId"
                                    value={warehouseFilter}
                                    onChange={(e) => {
                                        setWarehouseFilter(e.target.value);
                                        e.target.form?.submit(); // Auto submit to reload server props
                                    }}
                                    style={{
                                        padding: '0.625rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                        outline: 'none', fontSize: '0.875rem', backgroundColor: 'white', minWidth: '150px'
                                    }}
                                >
                                    <option value="">Tất cả kho</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </form>
                            <Button onClick={handleExportValuation} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileSpreadsheet size={16} /> Xuất Excel
                            </Button>
                            <Button onClick={() => window.print()} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Printer size={16} /> Print
                            </Button>
                        </div>

                        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Mã SKU</th>
                                        <th>Tên Sản Phẩm</th>
                                        <th>Nhóm</th>
                                        <th style={{ textAlign: 'center' }}>ĐVT</th>
                                        <th style={{ textAlign: 'right' }}>Giá Vốn (Nhập)</th>
                                        <th style={{ textAlign: 'right' }}>Tổng Tồn</th>
                                        <th style={{ textAlign: 'right' }}>Thành Tiền</th>
                                        <th style={{ textAlign: 'center' }}>Cảnh Báo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedValuation.map(v => {
                                        const isLow = v.qty <= (v.minStockLevel || 0);
                                        return (
                                            <tr key={v.id}>
                                                <td style={{ fontWeight: 600 }}>{v.sku}</td>
                                                <td>{v.name}</td>
                                                <td>{v.groupName || '-'}</td>
                                                <td style={{ textAlign: 'center' }}>{v.unit}</td>
                                                <td style={{ textAlign: 'right' }}>{formatMoney(v.price)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: isLow ? '#ef4444' : 'var(--text-main)' }}>{v.qty}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>{formatMoney(v.totalValue)}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {isLow && <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>CẦN NHẬP</span>}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {filteredValuation.length === 0 && (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Không có dữ liệu</td></tr>
                                    )}
                                </tbody>
                                {filteredValuation.length > 0 && (
                                    <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                        <tr>
                                            <td colSpan={5} className="text-right font-bold text-gray-700">TỔNG CỘNG:</td>
                                            <td className="text-right font-bold text-primary">
                                                {filteredValuation.reduce((sum, v) => sum + (v.qty || 0), 0)}
                                            </td>
                                            <td className="text-right font-bold text-success">
                                                {formatMoney(filteredValuation.reduce((sum, v) => sum + (v.totalValue || 0), 0))}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </Table>
                            <Pagination {...valuationProps} />
                        </div>
                    </div>
                )}

                {/* --- TAB 2: SỔ CHI TIẾT (THẺ KHO) --- */}
                {activeTab === 'LEDGER' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Mặt Hàng Cần Xem *</label>
                                <select
                                    value={ledgerProduct}
                                    onChange={(e) => setLedgerProduct(e.target.value)}
                                    style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }}
                                >
                                    <option value="">-- Chọn Sản Phẩm --</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Lọc Theo Kho (Tùy chọn)</label>
                                <select
                                    value={ledgerWarehouse}
                                    onChange={(e) => setLedgerWarehouse(e.target.value)}
                                    style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }}
                                >
                                    <option value="">-- Tất cả kho --</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                                <Button onClick={loadLedger} disabled={isLoadingLedger} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}>
                                    <History size={16} /> Xem Thẻ Kho
                                </Button>
                                {ledgerData.length > 0 && (
                                    <>
                                        <Button onClick={handleExportLedger} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}>
                                            <FileSpreadsheet size={16} /> Xuất Excel
                                        </Button>
                                        <Button onClick={() => window.print()} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}>
                                            <Printer size={16} /> Print
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {ledgerData.length > 0 && (
                            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <th>Ngày/Giờ</th>
                                            <th>Mã Phiếu</th>
                                            <th>Diễn Giải Lệnh</th>
                                            <th>Ghi Chú</th>
                                            <th style={{ textAlign: 'right' }}>Biến Động</th>
                                            <th style={{ textAlign: 'right' }}>Tồn Cuối</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedLedger.map((row, idx) => (
                                            <tr key={idx} style={{ backgroundColor: row.change === 0 ? '#f9fafb' : 'transparent' }}>
                                                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.date)}</td>
                                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                                    <a href={`/inventory/transactions/${row.documentId}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                                                        {row.code}
                                                    </a>
                                                </td>
                                                <td style={{ fontWeight: 500 }}>{row.type}</td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{row.notes || '-'}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, color: row.change > 0 ? '#16a34a' : (row.change < 0 ? '#ef4444' : 'var(--text-muted)') }}>
                                                    {row.change > 0 ? `+${row.change}` : row.change}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.1em' }}>{row.runningBalance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                                <Pagination {...ledgerProps} />
                            </div>
                        )}
                        {ledgerData.length === 0 && !isLoadingLedger && ledgerProduct && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                                <Package size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                                <p>Sản phẩm này chưa có phát sinh giao dịch nào.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB 3: TRANSACTION REPORT --- */}
                {activeTab === 'TRANSACTIONS' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Loại Phiếu</label>
                                <select value={txnType} onChange={(e) => setTxnType(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                    <option value="ALL">Tất cả loại giao dịch</option>
                                    <option value="IN">Phiếu Nhập Kho</option>
                                    <option value="OUT">Phiếu Xuất Kho</option>
                                    <option value="TRANSFER">Phiếu Chuyển Kho</option>
                                    <option value="ADJUSTMENT">Kiểm Kê / Điều Chỉnh</option>
                                </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Mặt Hàng</label>
                                <select value={txnProduct} onChange={(e) => setTxnProduct(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                    <option value="">Tất cả</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Nhóm SP</label>
                                <select value={txnGroup} onChange={(e) => setTxnGroup(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                    <option value="">Tất cả</option>
                                    {productGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Lọc Theo Kho</label>
                                <select value={txnWarehouse} onChange={(e) => setTxnWarehouse(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                    <option value="">Tất cả kho</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <Button onClick={loadTransactions} disabled={isLoadingTxn} style={{ height: '42px' }}>Tạo Báo Cáo</Button>
                            {txnData.length > 0 && (
                                <>
                                    <Button onClick={handleExportTxn} variant="secondary" style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileSpreadsheet size={16} /> Xuất Excel</Button>
                                    <Button onClick={() => window.print()} variant="secondary" style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Printer size={16} /> Print</Button>
                                </>
                            )}
                        </div>

                        {txnChartData.length > 0 && (
                            <div style={{ padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', backgroundColor: '#fff', overflowX: 'auto' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Biểu Đồ Lưu Lượng Giao Dịch</h3>
                                <div style={{ height: '300px', width: '100%', minWidth: '600px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={txnChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                                            <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="Nhập" stackId="a" fill="#10b981" maxBarSize={40} />
                                            <Bar dataKey="Xuất" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {txnData.length > 0 && (
                            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <th>Ngày</th>
                                            <th>Mã Phiếu</th>
                                            <th>Loại</th>
                                            <th>Từ Kho</th>
                                            <th>Đến Kho</th>
                                            <th>Chi Tiết Sản Phẩm</th>
                                            <th>Người Lập</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedTxn.map(t => (
                                            <tr key={t.id}>
                                                <td>{formatDate(t.date)}</td>
                                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                                    <a href={`/inventory/transactions/${t.id}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                                                        {t.code}
                                                    </a>
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{t.type === 'IN' ? 'NHẬP' : t.type === 'OUT' ? 'XUẤT' : t.type === 'TRANSFER' ? 'CHUYỂN KHO' : 'ĐIỀU CHỈNH'}</td>
                                                <td>{t.fromWarehouse?.name || '-'}</td>
                                                <td>{t.toWarehouse?.name || '-'}</td>
                                                <td style={{ fontSize: '0.85rem' }}>
                                                    {t.items.map((i: any) => (
                                                        <div key={i.id}>{i.product.name} <strong style={{ color: 'var(--primary)' }}>(x{i.quantity})</strong></div>
                                                    ))}
                                                </td>
                                                <td>{t.creator.name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                                <Pagination {...txnProps} />
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB 4: IN / OUT / BALANCE REPORT --- */}
                {activeTab === 'IN_OUT_BALANCE' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Mặt Hàng</label>
                                <select value={iobProduct} onChange={(e) => setIobProduct(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                    <option value="">Tất cả</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Nhóm SP</label>
                                <select value={iobGroup} onChange={(e) => setIobGroup(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                    <option value="">Tất cả</option>
                                    {productGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Lọc Theo Kho</label>
                                <select value={iobWarehouse} onChange={(e) => setIobWarehouse(e.target.value)} style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                    <option value="">Tất cả kho</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <Button onClick={loadInOutBalance} disabled={isLoadingIob} style={{ height: '42px' }}>Tạo Báo Cáo XNT</Button>
                            {iobData.length > 0 && (
                                <>
                                    <Button onClick={handleExportIob} variant="secondary" style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileSpreadsheet size={16} /> Xuất Excel</Button>
                                    <Button onClick={() => window.print()} variant="secondary" style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Printer size={16} /> Print</Button>
                                </>
                            )}
                        </div>

                        {iobChartData.length > 0 && (
                            <div style={{ padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', backgroundColor: '#fff', overflowX: 'auto' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Top Sản Phẩm Biến Động Nhiều Nhất</h3>
                                <div style={{ height: '350px', width: '100%', minWidth: '600px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={iobChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                                            <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            <Bar dataKey="Nhập" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                            <Bar dataKey="Xuất" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {iobData.length > 0 && (
                            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <th>Mã SKU</th>
                                            <th>Tên Sản Phẩm</th>
                                            <th>Nhóm</th>
                                            <th style={{ textAlign: 'center' }}>ĐVT</th>
                                            <th style={{ textAlign: 'right' }}>Tồn Đầu Kỳ</th>
                                            <th style={{ textAlign: 'right', color: '#16a34a' }}>Nhập Trong Kỳ</th>
                                            <th style={{ textAlign: 'right', color: '#ef4444' }}>Xuất Trong Kỳ</th>
                                            <th style={{ textAlign: 'right', color: 'var(--primary)' }}>Tồn Cuối Kỳ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedIob.map((row, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{row.sku}</td>
                                                <td style={{ fontWeight: 500 }}>{row.name}</td>
                                                <td>{row.groupName || '-'}</td>
                                                <td style={{ textAlign: 'center' }}>{row.unit}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.openingBalance}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{row.totalIn > 0 ? `+${row.totalIn}` : '-'}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>{row.totalOut > 0 ? `-${row.totalOut}` : '-'}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: '1.1em' }}>{row.closingBalance}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {iobData.length > 0 && (
                                        <tfoot style={{ position: 'sticky', bottom: 0, backgroundColor: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                                            <tr>
                                                <td colSpan={4} className="text-right font-bold text-gray-700">TỔNG CỘNG:</td>
                                                <td className="text-right font-bold text-gray-700">
                                                    {iobData.reduce((sum, v) => sum + (v.openingBalance || 0), 0)}
                                                </td>
                                                <td className="text-right font-bold text-success">
                                                    {iobData.reduce((sum, v) => sum + (v.totalIn || 0), 0)}
                                                </td>
                                                <td className="text-right font-bold text-danger">
                                                    {iobData.reduce((sum, v) => sum + (v.totalOut || 0), 0)}
                                                </td>
                                                <td className="text-right font-bold text-primary">
                                                    {iobData.reduce((sum, v) => sum + (v.closingBalance || 0), 0)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </Table>
                                <Pagination {...iobProps} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
