'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { formatMoney } from '@/lib/utils/formatters';

interface CashFlowChartProps {
    cashFlow?: {
        name: string;
        income: number;
        expense: number;
        supplierPayment: number;
    }[];
}

export function CashFlowChartWidget({ cashFlow = [] }: CashFlowChartProps) {
    const currentYear = new Date().getFullYear();

    // Calculate annual aggregates
    const totalIncome = cashFlow.reduce((acc, curr) => acc + (curr.income || 0), 0);
    const totalExpense = cashFlow.reduce((acc, curr) => acc + (curr.expense || 0), 0);
    const totalSupplier = cashFlow.reduce((acc, curr) => acc + (curr.supplierPayment || 0), 0);
    const totalOutflow = totalExpense + totalSupplier;
    const netCashFlow = totalIncome - totalOutflow;

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <TrendingUp size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                                Biểu Đồ Dòng Tiền & Cân Đối Tài Chính Năm {currentYear}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                12 Tháng
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-none mt-1">
                            Theo dõi thực thu bán hàng, chi phí hoạt động nội bộ và công nợ nhà cung cấp
                        </p>
                    </div>
                </div>

                {/* 3 Metric Pills */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-50/80 border border-emerald-200/60 text-xs">
                        <span className="text-[10px] text-emerald-600 font-semibold block">Tổng thực thu</span>
                        <span className="font-mono font-bold text-emerald-800">{formatMoney(totalIncome)}</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-rose-50/80 border border-rose-200/60 text-xs">
                        <span className="text-[10px] text-rose-600 font-semibold block">Tổng chi & NCC</span>
                        <span className="font-mono font-bold text-rose-800">{formatMoney(totalOutflow)}</span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg border text-xs ${
                        netCashFlow >= 0
                            ? 'bg-blue-50/80 border-blue-200/60 text-blue-800'
                            : 'bg-amber-50/80 border-amber-200/60 text-amber-800'
                    }`}>
                        <span className="text-[10px] font-semibold block text-slate-500">Dòng tiền thuần</span>
                        <span className="font-mono font-bold">{formatMoney(netCashFlow)}</span>
                    </div>
                </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="w-full flex-1" style={{ height: '340px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlow} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradientIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="gradientExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="gradientSupplier" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                            dy={8}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            dx={-5}
                            tickFormatter={(val) => {
                                if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} Tỷ`;
                                if (val >= 1000000) return `${(val / 1000000).toFixed(0)} Tr`;
                                return val;
                            }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#ffffff',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                fontSize: '12px',
                                padding: '10px 14px'
                            }}
                            formatter={(value: any, name: any) => {
                                let label = '';
                                if (name === 'income') label = 'Thu tiền bán hàng';
                                if (name === 'expense') label = 'Chi phí nội bộ';
                                if (name === 'supplierPayment') label = 'Trả nhà cung cấp';
                                return [formatMoney(Number(value) || 0), label];
                            }}
                        />
                        <Legend
                            verticalAlign="top"
                            height={34}
                            iconType="circle"
                            formatter={(val) => {
                                if (val === 'income') return 'Thu bán hàng';
                                if (val === 'expense') return 'Chi phí hoạt động';
                                if (val === 'supplierPayment') return 'Trả NCC';
                                return val;
                            }}
                            wrapperStyle={{
                                fontSize: '12px',
                                fontWeight: 600,
                                paddingBottom: '8px',
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="income"
                            name="income"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#gradientIncome)"
                        />
                        <Area
                            type="monotone"
                            dataKey="expense"
                            name="expense"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#gradientExpense)"
                        />
                        <Area
                            type="monotone"
                            dataKey="supplierPayment"
                            name="supplierPayment"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#gradientSupplier)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
