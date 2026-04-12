'use client'
import { formatDate } from '@/lib/utils/formatters';
import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { TaskDashboardClient } from '@/app/tasks/TaskDashboardClient';
import Link from 'next/link';
import {
    ArrowLeft, Target, Calendar, Users, LayoutDashboard, Flag,
    MessageSquare, FileText, BarChart2, Link as LinkIcon, Milestone,
    Paperclip, Trash2, Clock, Tag, DollarSign, ArrowUpRight, ArrowDownRight, Briefcase
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { addComment, uploadTaskAttachment, deleteTaskAttachment, toggleReaction } from '@/app/tasks/actions';
import { FileSignature, Receipt, FileText as FileTextIcon, Calculator, Plus } from 'lucide-react';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '👀'];

export function ProjectDetailClient({ project, users }: { project: any, users: any[] }) {
    const router = useRouter();
    const { data: session } = useSession();

    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'FINANCIALS' | 'DISCUSSIONS' | 'FILES' | 'REPORTS' | 'QUOTE' | 'CONTRACT' | 'INVOICE' | 'SALES_ESTIMATE'>('OVERVIEW');

    // Discussion State
    const [newComment, setNewComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Upload Progress State
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

    // Calculate Project Progress
    const totalTasks = project.tasks?.length || 0;
    const completedTasks = project.tasks?.filter((t: any) => t.status === 'DONE').length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Derived Milestones (Child tasks with High/Urgent priority or a specific convention)
    const milestones = project.tasks?.filter((t: any) => t.priority === 'URGENT' || t.priority === 'HIGH') || [];

    // Contextual references
    const relatedLinks = [];
    if (project.contract) relatedLinks.push({ label: 'Hợp đồng', value: project.contract.title, href: `/contracts/${project.contract.id}` });
    if (project.quote) relatedLinks.push({ label: 'Báo giá (Văn bản)', value: project.quote.title, href: `/quotes/${project.quote.id}` });
    if (project.customer) relatedLinks.push({ label: 'Khách hàng', value: project.customer.name, href: `/customers/${project.customer.id}` });
    if (project.salesEstimate) relatedLinks.push({ label: 'Báo giá ERP', value: project.salesEstimate.code, href: `/sales/estimates/${project.salesEstimate.id}` });
    if (project.invoice) relatedLinks.push({ label: 'Hóa đơn', value: project.invoice.code, href: `/sales/invoices/${project.invoice.id}` });

    function getEmptyState(title: string, desc: string, icon: any, createHref: string) {
        const IconNode = icon;
        return (
            <div style={{ padding: '4rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <div style={{ padding: '1.5rem', backgroundColor: '#e2e8f0', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                    <IconNode size={48} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px' }}>{desc}</p>
                <Link href={createHref}>
                    <Button variant="primary">
                        <Plus size={16} /> Tạo {title.replace('Chưa có ', '')}
                    </Button>
                </Link>
            </div>
        );
    }

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !session?.user?.id) return;

        let finalHtml = newComment.replace(/\n/g, '<br/>');
        setIsSaving(true);
        try {
            await addComment(project.id, finalHtml, session.user.id);
            setNewComment('');
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !session?.user?.id) return;
        setIsSaving(true);
        try {
            for (const file of Array.from(e.target.files)) {
                if (file.size > 50 * 1024 * 1024) continue;
                
                setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
                const formData = new FormData();
                formData.append('file', file);

                try {
                    const url = await new Promise<string>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', '/api/upload', true);
                        
                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable) {
                                const percentComplete = Math.round((event.loaded / event.total) * 100);
                                setUploadProgress(prev => ({ ...prev, [file.name]: percentComplete }));
                            }
                        };
                        
                        xhr.onload = () => {
                            if (xhr.status === 200) {
                                try {
                                    const response = JSON.parse(xhr.responseText);
                                    if (response.url) resolve(response.url);
                                    else reject(new Error('Upload failed'));
                                } catch (e) {
                                    reject(new Error('Invalid response'));
                                }
                            } else {
                                reject(new Error('Upload failed'));
                            }
                        };
                        
                        xhr.onerror = () => reject(new Error('Network error'));
                        xhr.send(formData);
                    });
                    
                    await uploadTaskAttachment(project.id, file.name, url, file.type, session.user.id);
                } catch (err: any) {
                    console.error("Upload failed for", file.name, err);
                } finally {
                    setUploadProgress(prev => { 
                        const next = { ...prev }; delete next[file.name]; return next; 
                    });
                }
            }
            setTimeout(() => router.refresh(), 500);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
            e.target.value = '';
        }
    };

    const handleDocDelete = async (attachmentId: string) => {
        if (!confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
        if (!session?.user?.id) return;
        setIsSaving(true);
        try {
            await deleteTaskAttachment(attachmentId, session.user.id);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleReaction = async (commentId: string, emoji: string) => {
        if (!session?.user?.id) return;
        await toggleReaction(commentId, emoji, session.user.id);
        router.refresh();
    };

    const tabs = [
        { id: 'OVERVIEW', label: 'Tổng Quan', icon: Target },
        { id: 'FINANCIALS', label: 'Tài Chính (P&L)', icon: DollarSign },
        { id: 'TASKS', label: 'Bảng Công Việc', icon: LayoutDashboard },
        { id: 'SALES_ESTIMATE', label: 'Báo Giá ERP', icon: Calculator },
        { id: 'QUOTE', label: 'Báo Giá (VB)', icon: FileTextIcon },
        { id: 'CONTRACT', label: 'Hợp Đồng', icon: FileSignature },
        { id: 'INVOICE', label: 'Hóa Đơn', icon: Receipt },
        { id: 'DISCUSSIONS', label: 'Thảo Luận', icon: MessageSquare },
        { id: 'FILES', label: 'Tủ Hồ Sơ', icon: FileTextIcon },
        { id: 'REPORTS', label: 'Báo Cáo', icon: BarChart2 },
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Link href="/projects" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontSize: '0.875rem' }} className="hover:text-primary">
                        <ArrowLeft size={16} /> Quay lại danh sách
                    </Link>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{ padding: '8px', backgroundColor: '#e0e7ff', color: 'var(--primary)', borderRadius: '8px' }}>
                                <Target size={20} />
                            </div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {project.title}
                                <span style={{
                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                    backgroundColor: project.status === 'DONE' ? '#dcfce7' : (project.status === 'IN_PROGRESS' ? '#dbeafe' : '#f1f5f9'),
                                    color: project.status === 'DONE' ? '#16a34a' : (project.status === 'IN_PROGRESS' ? '#2563eb' : '#475569')
                                }}>
                                    {project.status === 'TODO' ? 'Chuẩn Bị' : project.status === 'IN_PROGRESS' ? 'Đang Thực Hiện' : project.status === 'DONE' ? 'Hoàn Thành' : project.status}
                                </span>
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div style={{ borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', overflowX: 'auto' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem',
                            background: 'none', border: 'none', cursor: 'pointer',
                            borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === tab.id ? 600 : 500,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENTS */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {activeTab === 'FINANCIALS' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
                        {(() => {
                            const expectedRevenue = project.salesEstimate?.totalAmount || project.estimatedValue || 0;
                            const actualRevenue = project.invoice?.totalAmount || 0;
                            
                            const totalPurchaseCost = project.purchaseBills?.reduce((sum: number, bill: any) => sum + (bill.totalAmount || 0), 0) || 0;
                            const totalExpenseCost = project.expenses?.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0) || 0;
                            const totalCost = totalPurchaseCost + totalExpenseCost;
                            
                            const grossProfit = actualRevenue - totalCost;
                            const profitMargin = actualRevenue > 0 ? (grossProfit / actualRevenue) * 100 : 0;
                            
                            const budget = project.budget || 0;
                            const budgetUsedPct = budget > 0 ? (totalCost / budget) * 100 : 0;
                            
                            return (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                                        {/* REVENUE CARD */}
                                        <Card style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>DOANH THU THỰC TẾ</p>
                                                    <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(actualRevenue)}
                                                    </h3>
                                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        Dự kiến: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(expectedRevenue)}
                                                    </p>
                                                </div>
                                                <div style={{ padding: '8px', backgroundColor: '#dcfce7', borderRadius: '8px', color: '#10b981' }}>
                                                    <ArrowUpRight size={24} />
                                                </div>
                                            </div>
                                        </Card>

                                        {/* COSTS CARD */}
                                        <Card style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG CHI PHÍ THỰC TẾ</p>
                                                    <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalCost)}
                                                    </h3>
                                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        Vật tư: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPurchaseCost)} | Khác: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalExpenseCost)}
                                                    </p>
                                                </div>
                                                <div style={{ padding: '8px', backgroundColor: '#fee2e2', borderRadius: '8px', color: '#ef4444' }}>
                                                    <ArrowDownRight size={24} />
                                                </div>
                                            </div>
                                        </Card>

                                        {/* PROFIT CARD */}
                                        <Card style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>LỢI NHUẬN GỘP (P&L)</p>
                                                    <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.5rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(grossProfit)}
                                                    </h3>
                                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        Biên lợi nhuận: {profitMargin.toFixed(1)}%
                                                    </p>
                                                </div>
                                                <div style={{ padding: '8px', backgroundColor: '#dbeafe', borderRadius: '8px', color: '#3b82f6' }}>
                                                    <Briefcase size={24} />
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* BUDGET BAR */}
                                    <Card style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Target size={18} color="var(--primary)" /> Ngân sách chi cho phép
                                            </h3>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: budgetUsedPct > 90 ? '#ef4444' : 'var(--text-muted)' }}>
                                                Đã dùng: {budgetUsedPct.toFixed(1)}%
                                            </div>
                                        </div>
                                        <div style={{ width: '100%', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '8px', overflow: 'hidden', margin: '1rem 0' }}>
                                            <div style={{
                                                height: '100%', backgroundColor: budgetUsedPct > 90 ? '#ef4444' : (budgetUsedPct > 75 ? '#f59e0b' : '#3b82f6'),
                                                width: `${Math.min(budgetUsedPct, 100)}%`, transition: 'width 0.5s ease-in-out'
                                            }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <span>0 ₫</span>
                                            <span>Ngân sách: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(budget)}</span>
                                        </div>
                                    </Card>
                                </>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'OVERVIEW' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <Card style={{ padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Target size={18} color="var(--primary)" /> Mô tả dự án
                                </h3>
                                {project.description ? (
                                    <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                        {project.description}
                                    </p>
                                ) : (
                                    <p style={{ color: 'var(--text-muted)' }}>Chưa có mô tả chi tiết.</p>
                                )}
                            </Card>

                            <Card style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <BarChart2 size={18} color="var(--primary)" /> Tiến độ dự án
                                    </h3>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: progress === 100 ? '#10b981' : 'var(--primary)' }}>{progress}%</div>
                                </div>
                                <div style={{ width: '100%', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', margin: '1rem 0' }}>
                                    <div style={{
                                        width: `${progress}%`,
                                        backgroundColor: progress === 100 ? '#10b981' : 'var(--primary)',
                                        height: '100%',
                                        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Đã hoàn thành <strong>{completedTasks}</strong> / {totalTasks} công việc con
                                </div>
                            </Card>

                            <Card style={{ padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Milestone size={18} color="var(--primary)" /> Cột Mốc Quan Trọng (Milestones)
                                </h3>
                                {milestones.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chưa có công việc nào đánh dấu Ưu tiên Cao / Khẩn cấp để làm mốc.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {milestones.map((m: any) => (
                                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                                <div>
                                                    <Link href={`/tasks/${m.id}`} style={{ fontWeight: 600, color: 'var(--text-main)', textDecoration: 'none' }} className="hover:text-primary">
                                                        {m.title}
                                                    </Link>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                        Hạn chót: {m.dueDate ? formatDate(new Date(m.dueDate)) : 'Chưa định'}
                                                    </div>
                                                </div>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                    backgroundColor: m.status === 'DONE' ? '#dcfce7' : '#f1f5f9',
                                                    color: m.status === 'DONE' ? '#16a34a' : 'var(--text-muted)'
                                                }}>
                                                    {m.status === 'DONE' ? 'Hoàn thành' : 'Chưa xong'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <Card style={{ padding: '1.5rem' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>
                                    Thông tin nhanh
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={12} /> Bắt đầu</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{project.startDate ? formatDate(new Date(project.startDate)) : formatDate(new Date(project.createdAt))}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={12} /> Hạn chót</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: project.dueDate && new Date(project.dueDate).getTime() < Date.now() ? 'var(--danger)' : 'var(--text-main)' }}>
                                            {project.dueDate ? formatDate(new Date(project.dueDate)) : 'Chưa thiết lập'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> Thời gian hoàn thành</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{project.estimatedDuration || 'Chưa thiết lập'}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Target size={12} /> Tổng tiền dự kiến</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#16a34a' }}>{project.estimatedValue ? `${project.estimatedValue.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}</div>
                                    </div>
                                    {project.tags && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: '1 / -1' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Tag size={12} /> Thẻ quản lý (Tags)</div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                                {project.tags.split(',').map((tag: string, idx: number) => (
                                                    <span key={idx} style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#e2e8f0', fontSize: '0.75rem', fontWeight: 500, color: '#475569' }}>
                                                        {tag.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: '1 / -1' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={12} /> Thành viên ({project.members?.length || 0})</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                            {project.members?.map((a: any) => (
                                                <div key={a.userId} style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f1f5f9', fontSize: '0.75rem', border: '1px solid #e2e8f0' }}>
                                                    {a.user.name || a.user.email}
                                                </div>
                                            ))}
                                            {(!project.members || project.members.length === 0) && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chưa có thành viên</span>}
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card style={{ padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <LinkIcon size={16} color="var(--primary)" /> Liên Kết Hệ Thống
                                </h3>
                                {relatedLinks.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Không có đối tượng liên kết.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {relatedLinks.map((link, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{link.label}</span>
                                                <Link href={link.href} style={{ fontSize: '0.85rem', fontWeight: 500, color: '#3b82f6', textDecoration: 'none' }} className="hover:underline">
                                                    {link.value}
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                )}
                {activeTab === 'SALES_ESTIMATE' && (
                    <div style={{ height: '100%' }}>
                        {!project.salesEstimate ? (
                            getEmptyState(
                                'Chưa có Báo Giá ERP', 
                                'Dự án này chưa được liên kết với một Báo Giá số liệu trên hệ thống. Hãy tạo Báo Giá ERP mới.', 
                                Calculator, 
                                `/sales/estimates?action=new&projectId=${project.id}${project.customer ? `&customerId=${project.customerId}` : ''}`
                            )
                        ) : (
                            <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
                                <Card style={{ padding: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                        <div>
                                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Báo Giá {project.salesEstimate.code}</h2>
                                        </div>
                                        <span style={{ padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: project.salesEstimate.status === 'ACCEPTED' ? '#dcfce7' : '#f1f5f9', color: project.salesEstimate.status === 'ACCEPTED' ? '#16a34a' : 'var(--text-main)' }}>
                                            {project.salesEstimate.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tổng tiền</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                                                {project.salesEstimate.totalAmount ? `${project.salesEstimate.totalAmount.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                                            </div>
                                        </div>
                                        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Ngày báo giá</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                {project.salesEstimate.date ? formatDate(new Date(project.salesEstimate.date)) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                        <Link href={`/sales/estimates/${project.salesEstimate.id}`}>
                                            <Button variant="primary">Mở Chi Tiết Báo Giá ERP</Button>
                                        </Link>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'QUOTE' && (
                    <div style={{ height: '100%' }}>
                        {!project.quote ? (
                            getEmptyState(
                                'Chưa có Báo Giá', 
                                'Dự án này chưa được liên kết với một Báo Giá nào. Hãy tạo Báo Giá mới để theo dõi tài chính dự toán.', 
                                Calculator, 
                                `/quotes/new?projectId=${project.id}${project.customer ? `&customerId=${project.customerId}` : ''}`
                            )
                        ) : (
                            <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
                                <Card style={{ padding: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                        <div>
                                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{project.quote.title}</h2>
                                            <p style={{ color: 'var(--text-muted)' }}>Tài liệu Báo Giá</p>
                                        </div>
                                        <span style={{ padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: project.quote.status === 'ACCEPTED' ? '#dcfce7' : '#f1f5f9', color: project.quote.status === 'ACCEPTED' ? '#16a34a' : 'var(--text-main)' }}>
                                            {project.quote.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Ngày tạo báo giá</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                {project.quote.createdAt ? formatDate(new Date(project.quote.createdAt)) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                        <Link href={`/quotes/${project.quote.id}`}>
                                            <Button variant="primary">Mở Chi Tiết Báo Giá</Button>
                                        </Link>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'CONTRACT' && (
                    <div style={{ height: '100%' }}>
                        {!project.contract ? (
                            getEmptyState(
                                'Chưa có Hợp Đồng', 
                                'Dự án này chưa được liên kết với một Hợp Đồng (văn bản) nào.', 
                                FileSignature, 
                                `/contracts/new?projectId=${project.id}${project.customer ? `&customerId=${project.customerId}` : ''}${project.quote ? `&quoteId=${project.quoteId}` : ''}`
                            )
                        ) : (
                            <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
                                <Card style={{ padding: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                        <div>
                                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{project.contract.title}</h2>
                                            <p style={{ color: 'var(--text-muted)' }}>Tài liệu Hợp đồng</p>
                                        </div>
                                        <span style={{ padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: project.contract.status === 'ACTIVE' ? '#dbeafe' : '#f1f5f9', color: project.contract.status === 'ACTIVE' ? '#2563eb' : 'var(--text-main)' }}>
                                            {project.contract.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Ngày tạo / ký kết dự kiến</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                {project.contract.createdAt ? formatDate(new Date(project.contract.createdAt)) : '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                        <Link href={`/contracts/${project.contract.id}`}>
                                            <Button variant="primary">Mở Chi Tiết Hợp Đồng</Button>
                                        </Link>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'INVOICE' && (
                    <div style={{ height: '100%' }}>
                        {!project.invoice ? (
                            getEmptyState(
                                'Chưa có Hóa Đơn', 
                                'Dự án này chưa được liên kết với một Hóa Đơn nào. Hãy tạo Hóa đơn để đối soát và thu tiền.', 
                                Receipt, 
                                `/sales/invoices?action=new&projectId=${project.id}${project.customer ? `&customerId=${project.customerId}` : ''}${project.contract ? `&contractId=${project.contractId}` : ''}`
                            )
                        ) : (
                            <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
                                <Card style={{ padding: '2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                        <div>
                                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Hóa Đơn {project.invoice.code}</h2>
                                        </div>
                                        <span style={{ padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 600, backgroundColor: project.invoice.status === 'PAID' ? '#dcfce7' : '#f1f5f9', color: project.invoice.status === 'PAID' ? '#16a34a' : 'var(--text-main)' }}>
                                            {project.invoice.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'revert', gap: '1.5rem', marginBottom: '2rem' }}>
                                        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', gridColumn: '1/-1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tổng tiền Hóa đơn</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                                    {project.invoice.totalAmount ? `${project.invoice.totalAmount.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Đã thu</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                                                    {project.invoice.paidAmount ? `${project.invoice.paidAmount.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                        <Link href={`/sales/invoices/${project.invoice.id}`}>
                                            <Button variant="primary">Mở Chi Tiết Hóa Đơn</Button>
                                        </Link>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                )}


                {activeTab === 'TASKS' && (
                    <div style={{ height: '100%' }}>
                        <TaskDashboardClient
                            initialTasks={project.tasks || []}
                            users={users}
                            parentProjectId={project.id}
                            parentProject={project}
                        />
                    </div>
                )}

                {activeTab === 'DISCUSSIONS' && (
                    <div style={{ maxWidth: '800px' }}>
                        <Card>
                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                                    {project.comments?.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>Chưa có bình luận nào.</p>
                                    ) : (
                                        project.comments?.map((comment: any) => {
                                            const reactionCounts = comment.reactions?.reduce((acc: any, r: any) => {
                                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                return acc;
                                            }, {}) || {};

                                            const userReactions = comment.reactions?.filter((r: any) => r.user?.id === session?.user?.id).map((r: any) => r.emoji) || [];

                                            return (
                                                <div key={comment.id} style={{ display: 'flex', gap: '1rem' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                                                        {comment.user.name?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{comment.user.name || comment.user.email}</span>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi }) : 'Vừa xong'}
                                                            </span>
                                                        </div>

                                                        <div
                                                            style={{ padding: '0.75rem', backgroundColor: 'var(--background)', borderRadius: '0.5rem', lineHeight: 1.5, fontSize: '0.95rem' }}
                                                            dangerouslySetInnerHTML={{ __html: comment.content }}
                                                        />

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                                            {Object.keys(reactionCounts).length > 0 && (
                                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                                                                        <div key={emoji} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '2px 6px', backgroundColor: userReactions.includes(emoji) ? '#e0e7ff' : '#f1f5f9', borderRadius: '12px', fontSize: '0.8rem', cursor: 'pointer', border: userReactions.includes(emoji) ? '1px solid #c7d2fe' : '1px solid transparent' }} onClick={() => handleToggleReaction(comment.id, emoji)}>
                                                                            <span>{emoji}</span>
                                                                            <span style={{ color: userReactions.includes(emoji) ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>{count as number}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', gap: '0.5rem', opacity: 0.7 }}>
                                                                {EMOJIS.slice(0, 3).map(emoji => (
                                                                    <button key={emoji} onClick={() => handleToggleReaction(comment.id, emoji)} style={{ fontSize: '0.85rem', cursor: 'pointer', border: 'none', background: 'none' }} className="hover:scale-110">{emoji}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <form onSubmit={handleAddComment}>
                                        <textarea
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            onPaste={async (e) => {
                                                const items = e.clipboardData.items;
                                                for (let i = 0; i < items.length; i++) {
                                                    if (items[i].type.indexOf('image') !== -1) {
                                                        const file = items[i].getAsFile();
                                                        if (file) {
                                                            if (file.size > 52428800) {
                                                                alert(`File ảnh dán vào quá lớn (Tối đa 50MB)`);
                                                                return;
                                                            }
                                                            setIsSaving(true);
                                                            try {
                                                                const formData = new FormData();
                                                                formData.append('file', file);
                                                                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                                                if (!res.ok) throw new Error('Upload failed');
                                                                const data = await res.json();
                                                                setNewComment(prev => prev + `\n<img src="${data.url}" alt="Pasted Image" style="max-width:100%; border-radius:8px; margin-top:8px;" />`);
                                                            } catch (err) {
                                                                alert('Lỗi tải hình ảnh từ clipboard');
                                                            } finally {
                                                                setIsSaving(false);
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                            placeholder="Thêm thảo luận mới về dự án... (Có thể dán ảnh trực tiếp ctrl+V)"
                                            style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', resize: 'vertical', fontSize: '0.95rem', marginBottom: '0.5rem' }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button type="submit" disabled={isSaving || !newComment.trim()}>
                                                Gửi bình luận
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'FILES' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Tủ Hồ Sơ Dự Án</h3>
                            <Button onClick={() => document.getElementById('fileUpload')?.click()}>
                                <Paperclip size={16} style={{ marginRight: '8px' }} />
                                Tải tài liệu lên
                            </Button>
                            <input
                                id="fileUpload"
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleDocUpload}
                                disabled={isSaving}
                            />
                        </div>

                        {(!project.attachments || project.attachments.length === 0) && Object.keys(uploadProgress).length === 0 ? (
                            <Card style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                <p>Chưa có tài liệu nào trong tủ hồ sơ của dự án.</p>
                            </Card>
                        ) : (
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {Object.entries(uploadProgress).map(([fileName, progress]) => (
                                    <Card key={fileName} style={{ padding: '1rem', width: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px dashed var(--primary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--primary)' }}>Đang tải lên: <strong>{fileName}</strong></span>
                                            <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{progress}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginTop: 'auto' }}>
                                            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.2s ease-out' }} />
                                        </div>
                                    </Card>
                                ))}
                                {project.attachments?.map((doc: any) => (
                                    <Card key={doc.id} style={{ padding: '1rem', width: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <FileText size={20} color="var(--primary)" />
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.fileName}>
                                                    {doc.fileName}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                                Bởi {doc.uploadedBy?.name || doc.uploadedBy?.email} - {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6', textDecoration: 'none' }}>
                                                Mở tài liệu
                                            </a>
                                            <button onClick={() => handleDocDelete(doc.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'REPORTS' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
                        <Card style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Tỷ lệ hoàn thành công việc</h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ position: 'relative', width: '200px', height: '200px', borderRadius: '50%', background: `conic-gradient(var(--primary) ${progress}%, #e2e8f0 ${progress}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '160px', height: '160px', backgroundColor: 'var(--surface)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{progress}%</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--primary)', borderRadius: '2px' }} />
                                        <span style={{ fontSize: '0.85rem' }}>Đã xong ({completedTasks})</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '12px', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '2px' }} />
                                        <span style={{ fontSize: '0.85rem' }}>Chưa xong ({totalTasks - completedTasks})</span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Báo cáo khối lượng theo trạng thái</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {['TODO', 'IN_PROGRESS', 'REVIEW', 'CANCELLED'].map(status => {
                                    const count = project.tasks?.filter((t: any) => t.status === status).length || 0;
                                    const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                                    const colors: Record<string, string> = {
                                        'TODO': '#f59e0b', 'IN_PROGRESS': '#3b82f6', 'REVIEW': '#8b5cf6', 'CANCELLED': '#ef4444'
                                    };
                                    const labels: Record<string, string> = {
                                        'TODO': 'Chuẩn bị', 'IN_PROGRESS': 'Đang làm', 'REVIEW': 'Chờ duyệt', 'CANCELLED': 'Hủy'
                                    };
                                    return (
                                        <div key={status}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                                <span>{labels[status]}</span>
                                                <span style={{ fontWeight: 600 }}>{count}</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, backgroundColor: colors[status], height: '100%' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

