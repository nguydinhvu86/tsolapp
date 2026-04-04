'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

interface FinancialChartWrapperProps {
    data: { name: string; amount: number; payment: number }[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export function FinancialChartWrapper({ data }: FinancialChartWrapperProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center bg-slate-50 border border-slate-100 rounded-lg">
                <p className="text-slate-400">Chưa có dữ liệu giao dịch để hiển thị</p>
            </div>
        );
    }

    return (
        <div className="w-full h-80 pt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                    <YAxis 
                        tickFormatter={(value) => `${(value / 1000000).toLocaleString('vi-VN')}M`} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b' }} 
                        width={80}
                    />
                    <Tooltip 
                        formatter={(value: any) => [formatCurrency(value || 0), '']}
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="amount" name="Doanh số Hóa đơn" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="payment" name="Đã thanh toán" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
