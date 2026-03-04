import React from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface LookerKPIProps {
    title: string;
    value: string | number;
    trendValue?: number;
    trendLabel?: string;
    icon?: any;
    theme?: 'purple' | 'blue' | 'green' | 'orange' | 'red';
}

export function LookerKPI({ title, value, trendValue, trendLabel, icon: Icon, theme = 'purple' }: LookerKPIProps) {
    const isPositive = trendValue && trendValue >= 0;
    const isNegative = trendValue && trendValue < 0;

    const themeClasses: Record<string, string> = {
        purple: "bg-gradient-to-br from-[#667eea] to-[#764ba2]",
        blue: "bg-gradient-to-br from-[#4facfe] to-[#00f2fe]",
        green: "bg-gradient-to-br from-[#43e97b] to-[#38f9d7]",
        orange: "bg-gradient-to-br from-[#fa709a] to-[#fee140]",
        red: "bg-gradient-to-br from-[#f093fb] to-[#f5576c]",
    };
    const themeClass = themeClasses[theme] || themeClasses['purple'];

    return (
        <div className={`p-6 flex flex-col h-full rounded-[12px] shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden text-white ${themeClass}`}>

            <div className="flex justify-between items-start mb-4 gap-4">
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-white/80 mb-1 font-medium truncate">{title}</p>
                    <h3 className="text-[32px] font-bold text-white tracking-tight leading-tight truncate">{value}</h3>
                </div>
                {Icon && (
                    <div className="w-[48px] h-[48px] bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                        <Icon size={24} className="text-white" />
                    </div>
                )}
            </div>

            <div className="mt-auto">
                {(trendValue !== undefined || trendLabel) && (
                    <div className="flex items-center gap-1.5 text-[13px] text-white/90">
                        {trendValue !== undefined && (
                            <span className="flex items-center font-medium">
                                {isPositive ? '↑' : isNegative ? '↓' : '−'} {Math.abs(trendValue)}%
                            </span>
                        )}
                        {trendLabel && <span>{trendLabel}</span>}
                    </div>
                )}
            </div>
        </div>
    );
}

export function LookerChartBox({ title, children, className = '' }: { title: string, children: React.ReactNode, className?: string }) {
    return (
        <div className={`flex flex-col min-h-[400px] bg-white rounded-[12px] shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 ${className}`}>
            <div className="px-6 pt-6 pb-4">
                <h3 className="text-[18px] font-semibold text-gray-800">{title}</h3>
            </div>
            <div className="flex-1 px-6 pb-6">
                {children}
            </div>
        </div>
    );
}


const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

export function StatusPieChart({ data, title = "Tỷ lệ trạng thái" }: { data: any[], title?: string }) {
    return (
        <LookerChartBox title={title} className="h-full">
            <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '4px', border: '1px solid var(--border)', boxShadow: 'none' }}
                            itemStyle={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 500 }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value, entry: any) => <span style={{ color: 'var(--text-main)', fontSize: '13px' }}>{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </LookerChartBox>
    );
}

export function RevenueBarChart({ data, title = "Doanh thu (Tháng)" }: { data: any[], title?: string }) {
    return (
        <LookerChartBox title={title} className="h-full">
            <div style={{ height: '350px', width: '100%', marginLeft: '-15px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 13 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 13 }} dx={-10} tickFormatter={(val) => `₫${val / 1000000}tr`} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                        <Tooltip
                            cursor={{ fill: 'var(--background)', opacity: 0.5 }}
                            contentStyle={{ borderRadius: '4px', border: '1px solid var(--border)', boxShadow: 'none', padding: '12px' }}
                            formatter={(value: number | undefined | string) => {
                                const val = typeof value === 'number' ? value : 0;
                                return [`${val.toLocaleString()} ₫`, 'Doanh Thu'];
                            }}
                        />
                        <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </LookerChartBox>
    );
}
