'use client'

import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Printer, Calendar, Search, ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { getCustomerStatement, StatementSummary, StatementTransaction } from '../../customers/[id]/statement/actions';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';

interface CustomerStatementPanelProps {
    customerId: string;
    customerName: string;
}

export function CustomerStatementPanel({ customerId, customerName }: CustomerStatementPanelProps) {
    const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [isLoading, setIsLoading] = useState(false);

    const [summary, setSummary] = useState<StatementSummary | null>(null);
    const [transactions, setTransactions] = useState<StatementTransaction[]>([]);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getCustomerStatement(customerId, startDate, endDate);
            if (result.success && result.summary) {
                setSummary(result.summary);
                setTransactions(result.transactions || []);
            } else {
                setError(result.error || 'Lỗi không xác định khi tải dữ liệu sao kê.');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const setQuickDate = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR') => {
        const now = new Date();
        if (preset === 'THIS_MONTH') {
            setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        } else if (preset === 'LAST_MONTH') {
            const lastMonth = subMonths(now, 1);
            setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        } else if (preset === 'THIS_YEAR') {
            setStartDate(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
            setEndDate(format(now, 'yyyy-MM-dd'));
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="statement-panel">
            {/* Header & Controls - Hidden when printing */}
            <div className="print-hide" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: '#334155', border: '1px solid #cbd5e1' }}>
                        <Printer size={16} /> In Sao Kê
                    </Button>
                </div>

                <Card style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Từ ngày</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Đến ngày</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    style={{ width: '100%', padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', outline: 'none' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => setQuickDate('THIS_MONTH')} style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '0.375rem', cursor: 'pointer', color: '#475569' }}>Tháng này</button>
                            <button type="button" onClick={() => setQuickDate('LAST_MONTH')} style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '0.375rem', cursor: 'pointer', color: '#475569' }}>Tháng trước</button>
                            <button type="button" onClick={() => setQuickDate('THIS_YEAR')} style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '0.375rem', cursor: 'pointer', color: '#475569' }}>Năm nay</button>
                            <Button onClick={loadData} disabled={isLoading} style={{ background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Search size={16} /> {isLoading ? 'Đang tải...' : 'Xem báo cáo'}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {error && (
                <div className="print-hide" style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #fca5a5' }}>
                    {error}
                </div>
            )}

            {/* Print Header - Visible only when printing */}
            <div className="print-only" style={{ display: 'none', marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>SAO KÊ CÔNG NỢ KHÁCH HÀNG</h1>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', fontWeight: 600 }}>Khách hàng: {customerName}</p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                    Từ {format(new Date(startDate), 'dd/MM/yyyy')} đến {format(new Date(endDate), 'dd/MM/yyyy')}
                </p>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }} className="statement-summary-grid">
                    <Card style={{ padding: '1.25rem', borderLeft: '4px solid #94a3b8' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Dư nợ đầu kỳ</p>
                        <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#334155' }}>
                            {formatCurrency(summary.openingBalance)}
                        </p>
                    </Card>
                    <Card style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>Phát sinh nợ (Hóa đơn)</p>
                        <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>
                            +{formatCurrency(summary.invoicedAmount)}
                        </p>
                    </Card>
                    <Card style={{ padding: '1.25rem', borderLeft: '4px solid #22c55e' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>Thanh toán (Có)</p>
                        <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#22c55e' }}>
                            -{formatCurrency(summary.paidAmount)}
                        </p>
                    </Card>
                    <Card style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6', background: '#f8fafc' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' }}>Dư nợ cuối kỳ</p>
                        <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e40af' }}>
                            {formatCurrency(summary.closingBalance)}
                        </p>
                    </Card>
                </div>
            )}

            {/* Transactions Table */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <Table>
                        <thead>
                            <tr>
                                <th style={{ width: '12%' }}>Ngày chứng từ</th>
                                <th style={{ width: '15%' }}>Số chứng từ</th>
                                <th style={{ width: '31%' }}>Diễn giải</th>
                                <th style={{ width: '14%', textAlign: 'right' }}>Phát sinh (Nợ)</th>
                                <th style={{ width: '14%', textAlign: 'right' }}>Thanh toán (Có)</th>
                                <th style={{ width: '14%', textAlign: 'right' }}>Số dư nợ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Opening Balance Row */}
                            {summary && (
                                <tr style={{ background: '#f8fafc' }}>
                                    <td colSpan={3} style={{ fontWeight: 600, textAlign: 'right' }}>Số Dư Đầu Kỳ:</td>
                                    <td style={{ textAlign: 'right' }}>-</td>
                                    <td style={{ textAlign: 'right' }}>-</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#334155' }}>
                                        {formatCurrency(summary.openingBalance)}
                                    </td>
                                </tr>
                            )}

                            {/* Detail Rows */}
                            {transactions.length > 0 ? (
                                transactions.map((tx, idx) => (
                                    <tr key={`${tx.id}-${idx}`}>
                                        <td suppressHydrationWarning>{format(new Date(tx.date), 'dd/MM/yyyy')}</td>
                                        <td style={{ fontWeight: 500 }}>
                                            <span style={{
                                                display: 'inline-block', padding: '0.125rem 0.375rem',
                                                background: tx.type === 'INVOICE' ? '#fee2e2' : '#dcfce7',
                                                color: tx.type === 'INVOICE' ? '#b91c1c' : '#15803d',
                                                borderRadius: '0.25rem', fontSize: '0.75rem', marginRight: '0.5rem'
                                            }}>
                                                {tx.type === 'INVOICE' ? 'HĐ' : 'TT'}
                                            </span>
                                            <Link href={tx.type === 'INVOICE' ? `/sales/invoices/${tx.id}` : `/sales/payments/${tx.id}`}
                                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 w-max">
                                                {tx.code}
                                                <ExternalLink size={12} className="print-hide" />
                                            </Link>
                                        </td>
                                        <td>{tx.description}</td>
                                        <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: tx.debit > 0 ? 500 : 400 }}>
                                            {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', color: '#22c55e', fontWeight: tx.credit > 0 ? 500 : 400 }}>
                                            {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                                            {formatCurrency(tx.runningBalance)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={32} style={{ opacity: 0.5 }} />
                                            <p style={{ margin: 0 }}>Không có giao dịch phát sinh trong kỳ này.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Closing Balance Row */}
                            {summary && (
                                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                                    <td colSpan={3} style={{ fontWeight: 700, textAlign: 'right', color: '#0f172a' }}>Tổng Cộng Cuối Kỳ:</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>
                                        {formatCurrency(summary.invoicedAmount)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#22c55e' }}>
                                        {formatCurrency(summary.paidAmount)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#1e40af', fontSize: '1.05rem' }}>
                                        {formatCurrency(summary.closingBalance)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </Card>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4 landscape; margin: 15mm; }
                    body * { visibility: hidden; }
                    .statement-panel, .statement-panel * { visibility: visible; }
                    .statement-panel { position: absolute; left: 0; top: 0; width: 100%; }
                    .print-hide { display: none !important; }
                    .print-only { display: block !important; }
                    
                    /* Grid fallback for older printers */
                    .statement-summary-grid {
                        display: flex !important;
                        flex-wrap: wrap !important;
                    }
                    .statement-summary-grid > * {
                        flex: 1 1 200px !important;
                        min-width: 200px !important;
                    }
                    
                    /* Clean up card styles for print */
                    .statement-panel .card {
                        box-shadow: none !important;
                        border: 1px solid #e2e8f0 !important;
                        break-inside: avoid;
                    }
                    table { page-break-inside: auto; }
                    tr    { page-break-inside: avoid; page-break-after: auto; }
                    th, td { border-bottom: 1px solid #e2e8f0; padding: 0.5rem !important; }
                }
            `}} />
        </div>
    );
}
