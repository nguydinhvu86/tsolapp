'use client'

import React, { useMemo } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { FileText, FileSpreadsheet, FileOutput, FilePlus2, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, FileStack, Mail, Plus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export function DashboardClient({ initialData }: { initialData: any }) {

    // Process data for the monthly chart
    const chartData = useMemo(() => {
        const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
        const currentYear = new Date().getFullYear();

        // Initialize 12 months data
        const data = months.map(m => ({
            name: m,
            BaoGia: 0,
            HopDong: 0
        }));

        // Count Quotes
        initialData.recentActivity.quotes.forEach((q: { createdAt: string | Date }) => {
            const date = new Date(q.createdAt);
            if (date.getFullYear() === currentYear) {
                data[date.getMonth()].BaoGia += 1;
            }
        });

        // Count Contracts
        initialData.recentActivity.contracts.forEach((c: { createdAt: string | Date }) => {
            const date = new Date(c.createdAt);
            if (date.getFullYear() === currentYear) {
                data[date.getMonth()].HopDong += 1;
            }
        });

        // Cut off until current month
        const currentMonthIndex = new Date().getMonth();
        return data.slice(Math.max(0, currentMonthIndex - 5), currentMonthIndex + 2);

    }, [initialData]);

    const aggregateActivity = useMemo(() => {
        const all: any[] = [];
        initialData.recentActivity.quotes.forEach((x: any) => all.push({ ...x, type: 'báo giá', icon: FileSpreadsheet }));
        initialData.recentActivity.contracts.forEach((x: any) => all.push({ ...x, type: 'hợp đồng', icon: FileText }));
        initialData.recentActivity.appendices?.forEach((x: any) => all.push({ ...x, type: 'phụ lục', icon: FileStack }));
        initialData.recentActivity.dispatches?.forEach((x: any) => all.push({ ...x, type: 'công văn', icon: Mail }));
        initialData.recentActivity.handovers.forEach((x: any) => all.push({ ...x, type: 'bàn giao', icon: FileOutput }));
        initialData.recentActivity.payments.forEach((x: any) => all.push({ ...x, type: 'đề nghị thanh toán', icon: FilePlus2 }));

        return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
    }, [initialData]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.025em', color: 'var(--text-main)' }}>
                        Bảng Điều Khiển
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
                        Tổng quan hoạt động kinh doanh và quản lý hồ sơ của bạn.
                    </p>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid var(--border)' }}>
                    <Activity size={16} color="var(--primary)" /> Dữ liệu được cập nhật tự động
                </div>
            </div>

            {/* Quick Actions Panel */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/contract-appendices/new" style={{ textDecoration: 'none' }}>
                    <Button variant="secondary" className="gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontWeight: 600 }}>
                        <Plus size={16} color="var(--primary)" /> Soạn Phụ Lục Nhanh
                    </Button>
                </Link>
                <Link href="/dispatches/new" style={{ textDecoration: 'none' }}>
                    <Button variant="secondary" className="gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontWeight: 600 }}>
                        <Plus size={16} color="var(--primary)" /> Soạn Công Văn / TB
                    </Button>
                </Link>
                <Link href="/quotes/new" style={{ textDecoration: 'none' }}>
                    <Button variant="secondary" className="gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', fontWeight: 600 }}>
                        <Plus size={16} color="var(--primary)" /> Tạo Báo Giá
                    </Button>
                </Link>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <MetricCard
                    title="Tổng Báo Giá"
                    value={initialData.totalQuotes}
                    subtitle={`${initialData.acceptedQuotes} đã duyệt`}
                    icon={<FileSpreadsheet size={24} color="#4f46e5" />}
                    trend={+12}
                />
                <MetricCard
                    title="Hợp Đồng Đã Ký"
                    value={initialData.signedContracts}
                    subtitle={`Trên ${initialData.totalContracts} tổng số`}
                    icon={<FileText size={24} color="#10b981" />}
                    trend={+5}
                />
                <MetricCard
                    title="Biên Bản Bàn Giao"
                    value={initialData.totalHandovers}
                    subtitle="Đang quản lý"
                    icon={<FileOutput size={24} color="#f59e0b" />}
                    trend={0}
                />
                <MetricCard
                    title="Đề Nghị Thanh Toán"
                    value={initialData.totalPayments}
                    subtitle="Đang quản lý"
                    icon={<FilePlus2 size={24} color="#8b5cf6" />}
                    trend={-2}
                />
                <MetricCard
                    title="Phụ Lục"
                    value={initialData.totalAppendices}
                    subtitle="Đính kèm HĐ"
                    icon={<FileStack size={24} color="#ec4899" />}
                    trend={+8}
                />
                <MetricCard
                    title="Công Văn"
                    value={initialData.totalDispatches}
                    subtitle="Đã phát hành"
                    icon={<Mail size={24} color="#06b6d4" />}
                    trend={+15}
                />
            </div>

            {/* Chart and Activity Feed Split */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
                <Card style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                        <div>
                            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', fontWeight: 700 }}>Tăng trưởng Hồ sơ</h3>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Lưu lượng Báo giá & Hợp đồng 6 tháng gần nhất</p>
                        </div>
                    </div>
                    <div style={{ height: '320px', width: '100%', marginLeft: '-15px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBaoGia" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorHopDong" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 13 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 13 }} dx={-10} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)', padding: '12px' }}
                                    cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area type="monotone" dataKey="BaoGia" name="Báo Giá" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorBaoGia)" />
                                <Area type="monotone" dataKey="HopDong" name="Hợp Đồng" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHopDong)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem', fontWeight: 700 }}>Hoạt động Gần Đây</h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cập nhật luồng công việc mới nhất.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                        {aggregateActivity.map((activity, i) => {
                            const Icon = activity.icon;
                            return (
                                <div key={i} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem', borderBottom: i !== aggregateActivity.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}>
                                        <Icon size={18} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: '0 0 0.25rem 0', fontWeight: 500, fontSize: '0.9375rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            Đã tạo một {activity.type} mới
                                        </p>
                                        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                            {getTimeAgo(new Date(activity.createdAt))} - ID: {activity.id.slice(0, 6)}...
                                        </p>
                                    </div>
                                </div>
                            )
                        })}

                        {aggregateActivity.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.875rem' }}>
                                Chưa có hoạt động nào.
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

// Sub-component for KPI Cards
function MetricCard({ title, value, subtitle, icon, trend }: { title: string, value: string | number, subtitle: string, icon: React.ReactNode, trend: number }) {
    const isPositive = trend > 0;
    const isNeutral = trend === 0;

    return (
        <Card style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {title}
                    </p>
                    <h4 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                        {value}
                    </h4>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {icon}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {!isNeutral && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        fontSize: '0.8125rem', fontWeight: 600,
                        color: isPositive ? 'var(--success)' : 'var(--danger)',
                        background: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        padding: '0.125rem 0.5rem', borderRadius: '999px'
                    }}>
                        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(trend)}%
                    </div>
                )}
                {isNeutral && (
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--border)', padding: '0.125rem 0.5rem', borderRadius: '999px' }}>
                        -
                    </div>
                )}
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{subtitle}</span>
            </div>
        </Card>
    );
}

function getTimeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return Math.floor(seconds) + " giây trước";
}
