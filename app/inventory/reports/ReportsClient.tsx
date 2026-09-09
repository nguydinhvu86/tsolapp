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
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50"></span>
                        Báo Cáo & Thống Kê Kho
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Tổng hợp giá trị tồn kho, lưu lượng xuất nhập và biến động chi tiết từng sản phẩm
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap gap-1.5">
                <button
                    onClick={() => setActiveTab('VALUATION')}
                    className={`flex-1 min-w-[180px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                        activeTab === 'VALUATION'
                            ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    TỔNG HỢP TỒN KHO & GIÁ TRỊ
                </button>
                <button
                    onClick={() => setActiveTab('LEDGER')}
                    className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                        activeTab === 'LEDGER'
                            ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    SỔ CHI TIẾT (THẺ KHO)
                </button>
                <button
                    onClick={() => setActiveTab('TRANSACTIONS')}
                    className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                        activeTab === 'TRANSACTIONS'
                            ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    LỊCH SỬ GIAO DỊCH
                </button>
                <button
                    onClick={() => setActiveTab('IN_OUT_BALANCE')}
                    className={`flex-1 min-w-[180px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                        activeTab === 'IN_OUT_BALANCE'
                            ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    BÁO CÁO XUẤT NHẬP TỒN
                </button>
            </div>

            {/* Global Date Filter for Reports that need it */}
            {activeTab !== 'VALUATION' && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-slate-700">Khoảng thời gian:</span>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                        />
                        <span className="text-slate-400 text-xs">→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                        />
                    </div>
                </div>
            )}

            {/* Content Container */}
            <div>
                {/* --- TAB 1: TỔNG HỢP TỒN KHO --- */}
                {activeTab === 'VALUATION' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-indigo-700">Tổng Giá Trị Tồn Kho</p>
                                    <p className="text-2xl font-bold text-indigo-900 mt-1 font-mono tracking-tight">{formatMoney(totalAssetValue)}</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                                    <Package size={24} />
                                </div>
                            </div>
                            <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-rose-700">Vật Tư Dưới Mức Tối Thiểu</p>
                                    <p className="text-2xl font-bold text-rose-600 mt-1 font-mono tracking-tight">
                                        {filteredValuation.filter(v => v.qty <= (v.minStockLevel || 0)).length} <span className="text-xs font-medium text-rose-500">Mặt hàng cần nhập</span>
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-rose-600/10 flex items-center justify-center text-rose-600">
                                    <History size={24} />
                                </div>
                            </div>
                        </div>

                        {valuationChartData.length > 0 && (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">Cơ Cấu Giá Trị Theo Nhóm Sản Phẩm</h3>
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
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
                                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316'][index % 8]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: any) => formatMoney(Number(value))} />
                                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                                <div className="relative flex-1 min-w-[220px] max-w-sm">
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Tìm theo tên hoặc SKU..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                                    />
                                </div>

                                <form action="" className="flex items-center gap-2.5 flex-wrap">
                                    <select
                                        name="groupId"
                                        value={groupFilter}
                                        onChange={(e) => {
                                            setGroupFilter(e.target.value);
                                            e.target.form?.submit();
                                        }}
                                        className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium"
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
                                            e.target.form?.submit();
                                        }}
                                        className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium"
                                    >
                                        <option value="">Tất cả kho</option>
                                        {warehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </form>

                                <div className="flex items-center gap-2">
                                    <Button onClick={handleExportValuation} variant="secondary" className="px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border-slate-200 text-slate-700">
                                        <FileSpreadsheet size={15} className="text-emerald-600" /> Xuất Excel
                                    </Button>
                                    <Button onClick={() => window.print()} variant="secondary" className="px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border-slate-200 text-slate-700">
                                        <Printer size={15} /> In Báo Cáo
                                    </Button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Mã SKU</th>
                                            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tên Sản Phẩm</th>
                                            <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nhóm</th>
                                            <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider">ĐVT</th>
                                            <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider">Giá Vốn</th>
                                            <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tổng Tồn</th>
                                            <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider">Thành Tiền</th>
                                            <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider">Cảnh Báo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedValuation.map(v => {
                                            const isLow = v.qty <= (v.minStockLevel || 0);
                                            return (
                                                <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-800">{v.sku}</td>
                                                    <td className="px-4 py-2.5 text-xs font-medium text-slate-900">{v.name}</td>
                                                    <td className="px-4 py-2.5 text-xs text-slate-600">{v.groupName || '-'}</td>
                                                    <td className="px-4 py-2.5 text-xs text-center text-slate-500">{v.unit}</td>
                                                    <td className="px-4 py-2.5 text-xs text-right font-mono font-medium text-slate-700">{formatMoney(v.price)}</td>
                                                    <td className={`px-4 py-2.5 text-xs text-right font-mono font-bold ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>{v.qty}</td>
                                                    <td className="px-4 py-2.5 text-xs text-right font-mono font-bold text-indigo-600">{formatMoney(v.totalValue)}</td>
                                                    <td className="px-4 py-2.5 text-xs text-center">
                                                        {isLow && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">CẦN NHẬP</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredValuation.length === 0 && (
                                            <tr><td colSpan={8} className="text-center py-12 text-xs font-medium text-slate-400">Không có dữ liệu</td></tr>
                                        )}
                                    </tbody>
                                    {filteredValuation.length > 0 && (
                                        <tfoot className="bg-slate-50/90 border-t-2 border-slate-200">
                                            <tr>
                                                <td colSpan={5} className="px-4 py-3 text-right text-xs font-bold text-slate-700">TỔNG CỘNG:</td>
                                                <td className="px-4 py-3 text-right font-mono text-xs font-bold text-indigo-600">
                                                    {filteredValuation.reduce((sum, v) => sum + (v.qty || 0), 0)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs font-bold text-emerald-600">
                                                    {formatMoney(filteredValuation.reduce((sum, v) => sum + (v.totalValue || 0), 0))}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </Table>
                            </div>
                            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                                <Pagination {...valuationProps} />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB 2: SỔ CHI TIẾT (THẺ KHO) --- */}
                {activeTab === 'LEDGER' && (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[220px]">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mặt Hàng Cần Xem *</label>
                                <select
                                    value={ledgerProduct}
                                    onChange={(e) => setLedgerProduct(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 font-medium"
                                >
                                    <option value="">-- Chọn Sản Phẩm --</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lọc Theo Kho (Tùy chọn)</label>
                                <select
                                    value={ledgerWarehouse}
                                    onChange={(e) => setLedgerWarehouse(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 font-medium"
                                >
                                    <option value="">-- Tất cả kho --</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button onClick={loadLedger} disabled={isLoadingLedger} className="px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-200">
                                    <History size={15} /> Xem Thẻ Kho
                                </Button>
                                {ledgerData.length > 0 && (
                                    <>
                                        <Button onClick={handleExportLedger} variant="secondary" className="px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border-slate-200 text-slate-700">
                                            <FileSpreadsheet size={15} className="text-emerald-600" /> Xuất Excel
                                        </Button>
                                        <Button onClick={() => window.print()} variant="secondary" className="px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border-slate-200 text-slate-700">
                                            <Printer size={15} /> In
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {ledgerData.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Ngày/Giờ</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Mã Phiếu</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Diễn Giải Lệnh</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Ghi Chú</th>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider">Biến Động</th>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tồn Cuối</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedLedger.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">{formatDate(row.date)}</td>
                                                    <td className="px-4 py-2.5 text-xs font-bold text-indigo-600">
                                                        <a href={`/inventory/transactions/${row.documentId}`} target="_blank" rel="noreferrer" className="hover:underline">
                                                            {row.code}
                                                        </a>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-800">{row.type}</td>
                                                    <td className="px-4 py-2.5 text-xs text-slate-500">{row.notes || '-'}</td>
                                                    <td className={`px-4 py-2.5 text-xs text-right font-mono font-bold ${row.change > 0 ? 'text-emerald-600' : (row.change < 0 ? 'text-rose-600' : 'text-slate-400')}`}>
                                                        {row.change > 0 ? `+${row.change}` : row.change}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs text-right font-mono font-bold text-slate-900">{row.runningBalance}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                                    <Pagination {...ledgerProps} />
                                </div>
                            </div>
                        )}
                        {ledgerData.length === 0 && !isLoadingLedger && ledgerProduct && (
                            <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                                <Package size={40} className="text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-medium text-slate-500">Sản phẩm này chưa có phát sinh giao dịch nào trong khoảng thời gian đã chọn.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB 3: TRANSACTION REPORT --- */}
                {activeTab === 'TRANSACTIONS' && (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Loại Phiếu</label>
                                <select value={txnType} onChange={(e) => setTxnType(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium">
                                    <option value="ALL">Tất cả loại giao dịch</option>
                                    <option value="IN">Phiếu Nhập Kho</option>
                                    <option value="OUT">Phiếu Xuất Kho</option>
                                    <option value="TRANSFER">Phiếu Chuyển Kho</option>
                                    <option value="ADJUSTMENT">Kiểm Kê / Điều Chỉnh</option>
                                </select>
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mặt Hàng</label>
                                <select value={txnProduct} onChange={(e) => setTxnProduct(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium">
                                    <option value="">Tất cả</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nhóm SP</label>
                                <select value={txnGroup} onChange={(e) => setTxnGroup(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium">
                                    <option value="">Tất cả</option>
                                    {productGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lọc Theo Kho</label>
                                <select value={txnWarehouse} onChange={(e) => setTxnWarehouse(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium">
                                    <option value="">Tất cả kho</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <Button onClick={loadTransactions} disabled={isLoadingTxn} className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-200">Tạo Báo Cáo</Button>
                            {txnData.length > 0 && (
                                <>
                                    <Button onClick={handleExportTxn} variant="secondary" className="px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border-slate-200 text-slate-700"><FileSpreadsheet size={15} className="text-emerald-600" /> Xuất Excel</Button>
                                    <Button onClick={() => window.print()} variant="secondary" className="px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border-slate-200 text-slate-700"><Printer size={15} /> In</Button>
                                </>
                            )}
                        </div>

                        {txnChartData.length > 0 && (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">Biểu Đồ Lưu Lượng Giao Dịch</h3>
                                <div className="h-[280px] w-full min-w-[500px]">
                                    <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                                        <BarChart data={txnChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                            <Bar dataKey="Nhập" stackId="a" fill="#10b981" maxBarSize={36} />
                                            <Bar dataKey="Xuất" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {txnData.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Ngày</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Mã Phiếu</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Loại</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Từ Kho</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Đến Kho</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Chi Tiết Sản Phẩm</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Người Lập</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedTxn.map(t => (
                                                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-4 py-2.5 text-xs text-slate-600">{formatDate(t.date)}</td>
                                                    <td className="px-4 py-2.5 text-xs font-bold text-indigo-600">
                                                        <a href={`/inventory/transactions/${t.id}`} target="_blank" rel="noreferrer" className="hover:underline">
                                                            {t.code}
                                                        </a>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-800">{t.type === 'IN' ? 'NHẬP' : t.type === 'OUT' ? 'XUẤT' : t.type === 'TRANSFER' ? 'CHUYỂN KHO' : 'ĐIỀU CHỈNH'}</td>
                                                    <td className="px-4 py-2.5 text-xs text-slate-700">{t.fromWarehouse?.name || '-'}</td>
                                                    <td className="px-4 py-2.5 text-xs text-slate-700">{t.toWarehouse?.name || '-'}</td>
                                                    <td className="px-4 py-2.5 text-xs text-slate-700">
                                                        {t.items.map((i: any) => (
                                                            <div key={i.id}>{i.product.name} <span className="font-mono font-bold text-indigo-600">(x{i.quantity})</span></div>
                                                        ))}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{t.creator?.name || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                                    <Pagination {...txnProps} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB 4: IN / OUT / BALANCE REPORT --- */}
                {activeTab === 'IN_OUT_BALANCE' && (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mặt Hàng</label>
                                <select value={iobProduct} onChange={(e) => setIobProduct(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium">
                                    <option value="">Tất cả</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nhóm SP</label>
                                <select value={iobGroup} onChange={(e) => setIobGroup(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium">
                                    <option value="">Tất cả</option>
                                    {productGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lọc Theo Kho</label>
                                <select value={iobWarehouse} onChange={(e) => setIobWarehouse(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-medium">
                                    <option value="">Tất cả kho</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <Button onClick={loadInOutBalance} disabled={isLoadingIob} className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-200">Tạo Báo Cáo XNT</Button>
                            {iobData.length > 0 && (
                                <>
                                    <Button onClick={handleExportIob} variant="secondary" className="px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border-slate-200 text-slate-700"><FileSpreadsheet size={15} className="text-emerald-600" /> Xuất Excel</Button>
                                    <Button onClick={() => window.print()} variant="secondary" className="px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border-slate-200 text-slate-700"><Printer size={15} /> In</Button>
                                </>
                            )}
                        </div>

                        {iobChartData.length > 0 && (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">Top Sản Phẩm Biến Động Nhiều Nhất</h3>
                                <div className="h-[300px] w-full min-w-[500px]">
                                    <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                                        <BarChart data={iobChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                            <Bar dataKey="Nhập" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={44} />
                                            <Bar dataKey="Xuất" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={44} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {iobData.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <thead>
                                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Mã SKU</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tên Sản Phẩm</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nhóm SP</th>
                                                <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider">ĐVT</th>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tồn Đầu</th>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Nhập Kỳ</th>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-rose-600 uppercase tracking-wider">Xuất Kỳ</th>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Tồn Cuối</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedIob.map((row: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-4 py-2.5 text-xs font-mono font-bold text-slate-900">{row.sku}</td>
                                                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-800">{row.name}</td>
                                                    <td className="px-4 py-2.5 text-xs text-slate-500">{row.groupName || '-'}</td>
                                                    <td className="px-4 py-2.5 text-xs text-center text-slate-600">{row.unit}</td>
                                                    <td className="px-4 py-2.5 text-xs text-right font-mono font-bold text-slate-700">{row.openingBalance}</td>
                                                    <td className="px-4 py-2.5 text-xs text-right font-mono font-bold text-emerald-600">+{row.totalIn}</td>
                                                    <td className="px-4 py-2.5 text-xs text-right font-mono font-bold text-rose-600">-{row.totalOut}</td>
                                                    <td className="px-4 py-2.5 text-xs text-right font-mono font-black text-indigo-700">{row.closingBalance}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                                    <Pagination {...iobProps} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

