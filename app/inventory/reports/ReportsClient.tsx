'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Package, Search, History, FileSpreadsheet } from 'lucide-react';
import { getStockLedger } from '../report-actions';
import * as XLSX from 'xlsx';

export default function ReportsClient({ initialValuation, products, warehouses }: { initialValuation: any[], products: any[], warehouses: any[] }) {
    const [activeTab, setActiveTab] = useState<'VALUATION' | 'LEDGER'>('VALUATION');

    // Valuation State
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Ledger State
    const [ledgerProduct, setLedgerProduct] = useState('');
    const [ledgerWarehouse, setLedgerWarehouse] = useState('');
    const [ledgerData, setLedgerData] = useState<any[]>([]);
    const [isLoadingLedger, setIsLoadingLedger] = useState(false);

    // Filter Valuation
    const filteredValuation = initialValuation.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAssetValue = filteredValuation.reduce((acc, curr) => acc + curr.totalValue, 0);

    const formatMoney = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
    const formatDate = (d: string | Date) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));

    const loadLedger = async () => {
        if (!ledgerProduct) {
            alert("Vui lòng chọn một mặt hàng để xem Thẻ Kho!");
            return;
        }
        try {
            setIsLoadingLedger(true);
            const data = await getStockLedger(ledgerProduct, ledgerWarehouse || undefined);
            setLedgerData(data);
        } catch (error) {
            console.error(error);
            alert("Lỗi tải Thẻ kho.");
        } finally {
            setIsLoadingLedger(false);
        }
    };

    const handleExportValuation = () => {
        const wb = XLSX.utils.book_new();
        const wsData = filteredValuation.map((v: any) => ({
            'Mã SKU': v.sku,
            'Tên Sản Phẩm': v.name,
            'ĐVT': v.unit,
            'Giá Vốn': v.price,
            'Tổng Tồn': v.qty,
            'Thành Tiền': v.totalValue,
            'Trạng Thái': v.qty <= (v.minStockLevel || 0) ? 'CẦN NHẬP' : 'BÌNH THƯỜNG'
        }));
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Ton Kho");
        XLSX.writeFile(wb, `Bao_Cao_Ton_Kho.xlsx`);
    };

    const handleExportLedger = () => {
        if (ledgerData.length === 0) {
            alert("Không có dữ liệu thẻ kho để xuất.");
            return;
        }
        const wb = XLSX.utils.book_new();
        const wsData = ledgerData.map((row: any) => ({
            'Ngày/Giờ': formatDate(row.date),
            'Mã Phiếu': row.code,
            'Diễn Giải Lệnh': row.type,
            'Ghi Chú': row.notes || '',
            'Biến Động': row.change,
            'Tồn Cuối': row.runningBalance
        }));
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "The Kho");
        XLSX.writeFile(wb, `The_Kho.xlsx`);
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
                    SỔ CHI TIẾT VẬT TƯ (THẺ KHO)
                </button>
            </div>

            <div style={{ padding: '1.5rem' }}>

                {/* --- TAB 1: TỔNG HỢP TỒN KHO --- */}
                {activeTab === 'VALUATION' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                            <div style={{ padding: '1.5rem', borderRadius: 'var(--radius)', backgroundColor: 'rgba(79, 70, 229, 0.05)', border: '1px solid rgba(79, 70, 229, 0.1)' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tổng Giá Trị Tồn Kho</p>
                                <p style={{ color: 'var(--primary)', fontSize: '1.75rem', fontWeight: 800 }}>{formatMoney(totalAssetValue)}</p>
                            </div>
                            <div style={{ padding: '1.5rem', borderRadius: 'var(--radius)', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Vật Tư Cần Nhập Thêm</p>
                                <p style={{ color: '#ef4444', fontSize: '1.75rem', fontWeight: 800 }}>
                                    {filteredValuation.filter(v => v.qty <= (v.minStockLevel || 0)).length} <span style={{ fontSize: '1rem', fontWeight: 600 }}>Mặt hàng</span>
                                </p>
                            </div>
                        </div>

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
                                    name="warehouseId"
                                    value={warehouseFilter}
                                    onChange={(e) => {
                                        setWarehouseFilter(e.target.value);
                                        e.target.form?.submit(); // Auto submit to reload server props
                                    }}
                                    style={{
                                        padding: '0.625rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                        outline: 'none', fontSize: '0.875rem', backgroundColor: 'white', minWidth: '200px'
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
                        </div>

                        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Mã SKU</th>
                                        <th>Tên Sản Phẩm</th>
                                        <th style={{ textAlign: 'center' }}>ĐVT</th>
                                        <th style={{ textAlign: 'right' }}>Giá Vốn (Nhập)</th>
                                        <th style={{ textAlign: 'right' }}>Tổng Tồn</th>
                                        <th style={{ textAlign: 'right' }}>Thành Tiền</th>
                                        <th style={{ textAlign: 'center' }}>Cảnh Báo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredValuation.map(v => {
                                        const isLow = v.qty <= (v.minStockLevel || 0);
                                        return (
                                            <tr key={v.id}>
                                                <td style={{ fontWeight: 600 }}>{v.sku}</td>
                                                <td>{v.name}</td>
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
                                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Không có dữ liệu</td></tr>
                                    )}
                                </tbody>
                            </Table>
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
                                    <Button onClick={handleExportLedger} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}>
                                        <FileSpreadsheet size={16} /> Xuất Excel
                                    </Button>
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
                                        {ledgerData.map((row, idx) => (
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
            </div>
        </Card>
    );
}
