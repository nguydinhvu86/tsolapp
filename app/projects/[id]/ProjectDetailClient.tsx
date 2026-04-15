'use client'
import { formatDate } from '@/lib/utils/formatters';
import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
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
import { uploadTaskAttachment, deleteTaskAttachment, toggleReaction } from '@/app/tasks/actions';
import { addProjectComment, toggleProjectReaction, createProjectTopic, updateProjectIssueStatus, updateProjectRiskStatus } from '@/app/projects/actions';
import { FileSignature, Receipt, FileText as FileTextIcon, Calculator, Plus, ShoppingCart, CreditCard, Send, AlertTriangle, Edit2 } from 'lucide-react';
import { CreateIssueModal } from './CreateIssueModal';
import { CreateRiskModal } from './CreateRiskModal';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '👀'];

export function ProjectDetailClient({ project, users }: { project: any, users: any[] }) {
    const router = useRouter();
    const { data: session } = useSession();

    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'ISSUES' | 'FINANCIALS' | 'TIMESHEETS' | 'DISCUSSIONS' | 'FILES' | 'REPORTS' | 'QUOTE' | 'CONTRACT' | 'INVOICE' | 'SALES_ESTIMATE' | 'PURCHASE_BILL' | 'EXPENSE'>('OVERVIEW');
    
    // Modal State
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [editingIssueData, setEditingIssueData] = useState<any>(null);
    const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
    const [editingRiskData, setEditingRiskData] = useState<any>(null);

    // Discussion State (Forum)
    const generalTopic = { id: 'GENERAL', title: 'Thảo Luận Chung', comments: project.comments?.filter((c:any) => !c.topicId) || [] };
    const allTopics = [generalTopic, ...(project.topics || [])];

    const [selectedTopic, setSelectedTopic] = useState<any>(generalTopic);
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicContent, setNewTopicContent] = useState('');

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
                {createHref && createHref !== '#' && (
                    <Link href={createHref}>
                        <Button variant="primary">
                            <Plus size={16} /> Tạo {title.replace('Chưa có ', '')}
                        </Button>
                    </Link>
                )}
            </div>
        );
    }

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !session?.user?.id || !selectedTopic) return;

        let finalHtml = newComment.replace(/\n/g, '<br/>');
        setIsSaving(true);
        try {
            await addProjectComment(project.id, finalHtml, selectedTopic.id === 'GENERAL' ? undefined : selectedTopic.id);
            setNewComment('');
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicTitle.trim() || !newTopicContent.trim() || !session?.user?.id) return;
        setIsSaving(true);
        try {
            await createProjectTopic(project.id, newTopicTitle.trim(), newTopicContent.trim());
            setNewTopicTitle('');
            setNewTopicContent('');
            setIsCreatingTopic(false);
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
        await toggleProjectReaction(commentId, emoji, project.id);
        router.refresh();
    };

    const tabs = [
        { id: 'OVERVIEW', label: 'Tổng Quan', icon: Target },
        { id: 'FINANCIALS', label: 'Tài Chính (P&L)', icon: DollarSign },
        { id: 'TASKS', label: 'Bảng Công Việc', icon: LayoutDashboard },
        { id: 'ISSUES', label: 'Vấn Đề & Rủi Ro', icon: Flag },
        { id: 'TIMESHEETS', label: 'Chấm Công (Timesheets)', icon: Clock },
        { id: 'SALES_ESTIMATE', label: 'Báo Giá ERP', icon: Calculator },
        { id: 'QUOTE', label: 'Báo Giá (VB)', icon: FileTextIcon },
        { id: 'CONTRACT', label: 'Hợp Đồng', icon: FileSignature },
        { id: 'INVOICE', label: 'Hóa Đơn Bán', icon: Receipt },
        { id: 'PURCHASE_BILL', label: 'Hóa Đơn Mua', icon: ShoppingCart },
        { id: 'EXPENSE', label: 'Chi Phí', icon: CreditCard },
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
                            
                            // Calculate Labor Cost from tracking timesheets
                            let totalLaborCost = 0;
                            project.tasks?.forEach((task: any) => {
                                task.timeLogs?.forEach((log: any) => {
                                    const hourlyRate = log.user?.employeeProfile?.hourlyRate || 0;
                                    const hours = (log.durationSec || 0) / 3600;
                                    totalLaborCost += hours * hourlyRate;
                                });
                            });

                            const totalCost = totalPurchaseCost + totalExpenseCost + totalLaborCost;
                            
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
                                                        Nhân sự: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalLaborCost)} | Vật tư: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPurchaseCost)} | Khác: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalExpenseCost)}
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
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '1rem' }}>
                                <Card style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', boxShadow: '0 2px 10px -2px rgba(99, 102, 241, 0.3)' }}>
                                                <Calculator size={28} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Báo Giá Phân Tích (ERP)</div>
                                                <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>{project.salesEstimate.code}</h2>
                                            </div>
                                        </div>
                                        <span style={{ padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 700, backgroundColor: project.salesEstimate.status === 'ACCEPTED' ? '#dcfce7' : '#f1f5f9', color: project.salesEstimate.status === 'ACCEPTED' ? '#16a34a' : 'var(--text-main)', border: project.salesEstimate.status === 'ACCEPTED' ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                                            {project.salesEstimate.status}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRight: '1px solid #e2e8f0', paddingRight: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ngày báo giá</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                                {project.salesEstimate.date ? formatDate(new Date(project.salesEstimate.date)) : '-'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Tổng tiền</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                                                {project.salesEstimate.totalAmount ? `${project.salesEstimate.totalAmount.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px dashed #e2e8f0' }}>
                                        <Link href={`/sales/estimates/${project.salesEstimate.id}`} style={{ textDecoration: 'none' }}>
                                            <Button variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 600, borderRadius: '8px' }}>
                                                Mở Chi Tiết Báo Giá ERP
                                            </Button>
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
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '1rem' }}>
                                <Card style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', boxShadow: '0 2px 10px -2px rgba(245, 158, 11, 0.3)' }}>
                                                <FileTextIcon size={28} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Tài liệu Báo Giá (Văn Bản)</div>
                                                <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>{project.quote.title}</h2>
                                            </div>
                                        </div>
                                        <span style={{ padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 700, backgroundColor: project.quote.status === 'ACCEPTED' ? '#dcfce7' : '#f1f5f9', color: project.quote.status === 'ACCEPTED' ? '#16a34a' : 'var(--text-main)', border: project.quote.status === 'ACCEPTED' ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                                            {project.quote.status}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ngày sinh chứng từ</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                                {project.quote.createdAt ? formatDate(new Date(project.quote.createdAt)) : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px dashed #e2e8f0' }}>
                                        <Link href={`/quotes/${project.quote.id}`} style={{ textDecoration: 'none' }}>
                                            <Button variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 600, borderRadius: '8px' }}>
                                                Mở Chi Tiết Báo Giá 
                                            </Button>
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
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '1rem' }}>
                                <Card style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', boxShadow: '0 2px 10px -2px rgba(37, 99, 235, 0.3)' }}>
                                                <FileSignature size={28} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Hợp đồng Khách hàng (Văn Bản)</div>
                                                <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>{project.contract.title}</h2>
                                            </div>
                                        </div>
                                        <span style={{ padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 700, backgroundColor: project.contract.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9', color: project.contract.status === 'ACTIVE' ? '#16a34a' : 'var(--text-main)', border: project.contract.status === 'ACTIVE' ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                                            {project.contract.status}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Theo dõi Ngày ký kết</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                                {project.contract.createdAt ? formatDate(new Date(project.contract.createdAt)) : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px dashed #e2e8f0' }}>
                                        <Link href={`/contracts/${project.contract.id}`} style={{ textDecoration: 'none' }}>
                                            <Button variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 600, borderRadius: '8px' }}>
                                                Xem & In Hợp Đồng
                                            </Button>
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
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '1rem' }}>
                                <Card style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', boxShadow: '0 2px 10px -2px rgba(79, 70, 229, 0.3)' }}>
                                                <Receipt size={28} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Hóa Đơn Thu Tiền (Sales Invoice)</div>
                                                <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>{project.invoice.code}</h2>
                                            </div>
                                        </div>
                                        <span style={{ padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 700, backgroundColor: project.invoice.status === 'PAID' ? '#dcfce7' : '#f1f5f9', color: project.invoice.status === 'PAID' ? '#16a34a' : 'var(--text-main)', border: project.invoice.status === 'PAID' ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                                            {project.invoice.status}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderRight: '1px solid #e2e8f0', paddingRight: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Tổng tiền Hóa đơn</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                                {project.invoice.totalAmount ? `${project.invoice.totalAmount.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Đã thu (Thanh toán)</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>
                                                {project.invoice.paidAmount ? `${project.invoice.paidAmount.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px dashed #e2e8f0' }}>
                                        <Link href={`/sales/invoices/${project.invoice.id}`} style={{ textDecoration: 'none' }}>
                                            <Button variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 600, borderRadius: '8px' }}>
                                                Mở Chi Tiết Hóa Đơn Khách
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'PURCHASE_BILL' && (
                    <div style={{ height: '100%' }}>
                        <Card style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Hóa Đơn Mua Vật Tư / Dịch Vụ</h3>
                                <Link href={`/purchasing/bills?action=new&projectId=${project.id}`}>
                                    <Button variant="primary" className="gap-2"><Plus size={16}/> Thêm Hóa Đơn Mua Mới</Button>
                                </Link>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <th>Mã Hóa Đơn</th>
                                            <th>Ngày lập</th>
                                            <th>Nhà Cung Cấp</th>
                                            <th>Tổng Tiền</th>
                                            <th>Đã Thanh Toán</th>
                                            <th>Trạng Thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {project.purchaseBills?.map((bill: any) => (
                                            <tr key={bill.id}>
                                                <td><Link href={`/purchasing/bills/${bill.id}`} className="text-blue-600 hover:underline font-medium">{bill.code}</Link></td>
                                                <td>{bill.date ? formatDate(new Date(bill.date)) : '-'}</td>
                                                <td><span style={{ fontWeight: 500, color: '#475569' }}>{bill.supplier?.name || '-'}</span></td>
                                                <td style={{ fontWeight: 600 }}>{bill.totalAmount ? bill.totalAmount.toLocaleString('vi-VN') + ' ₫' : '0 ₫'}</td>
                                                <td style={{ color: '#16a34a', fontWeight: 600 }}>{bill.paidAmount ? bill.paidAmount.toLocaleString('vi-VN') + ' ₫' : '0 ₫'}</td>
                                                <td>
                                                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: bill.status === 'PAID' ? '#dcfce7' : '#f1f5f9', color: bill.status === 'PAID' ? '#16a34a' : 'var(--text-muted)' }}>
                                                        {bill.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!project.purchaseBills || project.purchaseBills.length === 0) && (
                                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>Chưa có hóa đơn mua hàng nào.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'EXPENSE' && (
                    <div style={{ height: '100%' }}>
                        <Card style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Chi Phí Khác (Tiếp khách, Phụ cấp...)</h3>
                                <Link href={`/sales/expenses?action=new&projectId=${project.id}`}>
                                    <Button variant="primary" className="gap-2"><Plus size={16}/> Thêm Phiếu Chi Mới</Button>
                                </Link>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <th>Mã Phiếu Chi</th>
                                            <th>Ngày chi</th>
                                            <th>Lý do / Mô tả</th>
                                            <th>Số Tiền Chi</th>
                                            <th>Trạng Thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {project.expenses?.map((exp: any) => (
                                            <tr key={exp.id}>
                                                <td><Link href={`/sales/expenses/${exp.id}`} className="text-blue-600 hover:underline font-medium">{exp.code}</Link></td>
                                                <td>{exp.date ? formatDate(new Date(exp.date)) : '-'}</td>
                                                <td><span style={{ fontWeight: 500, color: '#475569' }}>{exp.description || '-'}</span></td>
                                                <td style={{ fontWeight: 600, color: '#ef4444' }}>{exp.amount ? exp.amount.toLocaleString('vi-VN') + ' ₫' : '0 ₫'}</td>
                                                <td>
                                                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: exp.status === 'APPROVED' || exp.status === 'PAID' ? '#dcfce7' : '#f1f5f9', color: exp.status === 'APPROVED' || exp.status === 'PAID' ? '#16a34a' : 'var(--text-muted)' }}>
                                                        {exp.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!project.expenses || project.expenses.length === 0) && (
                                            <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>Chưa có khoản chi phí nào liên kết với dự án này.</td></tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card>
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
                    <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 200px)' }}>
                        {/* Sidebar: Topics List */}
                        <Card style={{ width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fcfcfd' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>Chủ Đề</h3>
                                <Button onClick={() => setIsCreatingTopic(true)} title="Tạo Chủ Đề Mới" style={{ padding: '0.35rem 0.5rem', height: 'auto', borderRadius: '8px' }}><Plus size={16} /></Button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
                                {allTopics.map((topic: any) => {
                                    const isActive = selectedTopic?.id === topic.id && !isCreatingTopic;
                                    return (
                                        <div 
                                            key={topic.id}
                                            onClick={() => { setSelectedTopic(topic); setIsCreatingTopic(false); }}
                                            style={{ 
                                                padding: '1rem 1.5rem', 
                                                cursor: 'pointer',
                                                background: isActive ? 'linear-gradient(to right, rgba(59, 130, 246, 0.05), transparent)' : 'transparent',
                                                borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.25rem'
                                            }}
                                            className="hover:bg-slate-50 transition-colors"
                                        >
                                            <h4 style={{ margin: 0, fontSize: '0.90rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--primary)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {topic.id === 'GENERAL' ? <MessageSquare size={14} /> : <Tag size={14} />} {topic.title}
                                            </h4>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {topic.id === 'GENERAL' ? 'Kênh trao đổi chung' : `Bởi ${topic.creator?.name || 'Vô danh'}`}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Main Content */}
                        <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', backgroundColor: '#fafafb' }}>
                            {isCreatingTopic ? (
                                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Tạo Chủ Đề Thảo Luận</h3>
                                        <Button variant="secondary" onClick={() => setIsCreatingTopic(false)}>Hủy</Button>
                                    </div>
                                    <form onSubmit={handleCreateTopic} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Tiêu đề chủ đề</label>
                                            <input 
                                                autoFocus
                                                value={newTopicTitle} 
                                                onChange={e => setNewTopicTitle(e.target.value)} 
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                                                placeholder="VD: Cập nhật thiết kế báo giá đợt 2"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Nội dung chi tiết</label>
                                            <textarea 
                                                value={newTopicContent} 
                                                onChange={e => setNewTopicContent(e.target.value)} 
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '200px', fontSize: '0.95rem' }}
                                                placeholder="Mô tả cụ thể nội dung cần trao đổi..."
                                                required
                                            />
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <Button type="submit" variant="primary" disabled={isSaving || !newTopicTitle || !newTopicContent}>
                                                {isSaving ? 'Đang tạo...' : 'Đăng Chủ Đề'}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            ) : selectedTopic ? (
                                <>
                                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', zIndex: 10, position: 'sticky', top: 0 }}>
                                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.3px', color: '#1e293b' }}>
                                            # {selectedTopic.title}
                                        </h3>
                                        {selectedTopic.id !== 'GENERAL' && selectedTopic.content && (
                                            <div style={{ padding: '1rem', backgroundColor: 'rgba(241,245,249,0.5)', borderRadius: '12px', fontSize: '0.95rem', color: '#475569', marginTop: '1rem', borderLeft: '3px solid var(--primary)' }}>
                                                {selectedTopic.content}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {selectedTopic.comments?.length === 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', opacity: 0.5 }}>
                                                <MessageSquare size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                                <p style={{ fontSize: '1rem', fontWeight: 500 }}>Chưa có bình luận nào. Hãy gửi một lời nhắn!</p>
                                            </div>
                                        ) : (
                                            selectedTopic.comments?.map((comment: any) => {
                                                const reactionCounts = comment.reactions?.reduce((acc: any, r: any) => {
                                                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                    return acc;
                                                }, {}) || {};

                                                const userReactions = comment.reactions?.filter((r: any) => r.user?.id === session?.user?.id).map((r: any) => r.emoji) || [];
                                                const isMe = comment.user?.id === session?.user?.id;

                                                return (
                                                    <div key={comment.id} style={{ display: 'flex', gap: '1rem', alignSelf: isMe ? 'flex-end' : 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row', maxWidth: '85%' }}>
                                                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: isMe ? 'transparent' : 'white', background: isMe ? 'linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)' : 'white', border: isMe ? 'none' : '1px solid #cbd5e1', color: isMe ? 'white' : 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, boxShadow: isMe ? '0 4px 12px rgba(59, 130, 246, 0.4)' : '0 2px 8px rgba(0,0,0,0.05)' }}>
                                                            {comment.user?.name?.[0]?.toUpperCase() || comment.user?.email?.[0]?.toUpperCase() || 'U'}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0.25rem' }}>
                                                                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: isMe ? '#475569' : '#1e293b' }}>{isMe ? 'Bạn' : (comment.user?.name || comment.user?.email)}</span>
                                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                                                                    {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi }) : 'Vừa xong'}
                                                                </span>
                                                            </div>

                                                            <div
                                                                style={{ 
                                                                    padding: '0.85rem 1.25rem', 
                                                                    background: isMe ? 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)' : 'white', 
                                                                    color: isMe ? 'white' : '#334155',
                                                                    borderRadius: isMe ? '20px 4px 20px 20px' : '4px 20px 20px 20px', 
                                                                    lineHeight: 1.5, 
                                                                    fontSize: '0.95rem',
                                                                    boxShadow: isMe ? '0 8px 20px -5px rgba(59, 130, 246, 0.4)' : '0 4px 15px -3px rgba(0,0,0,0.05)',
                                                                    border: isMe ? 'none' : '1px solid rgba(0,0,0,0.02)',
                                                                    wordBreak: 'break-word',
                                                                }}
                                                                dangerouslySetInnerHTML={{ __html: (comment.content || '')
                                                                    .replace(/\[WARNING\]/g, '<span style="background: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; border: 1px solid #fca5a5;">⚠ CẢNH BÁO</span>')
                                                                    .replace(/\[INFO\]/g, '<span style="background: #e0e7ff; color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; border: 1px solid #93c5fd;">ℹ THÔNG BÁO</span>')
                                                                    .replace(/\[URGENT\]/g, '<span style="background: #fef2f2; color: #dc2626; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; border: 1px solid #ef4444;">🚨 KHẨN CẤP</span>')
                                                                }}
                                                            />

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                                {Object.keys(reactionCounts).length > 0 && (
                                                                    <div style={{ display: 'flex', gap: '0.25rem', background: 'white', padding: '2px', borderRadius: '12px', boxShadow: '0 1px 2px rgb(0 0 0 / 0.05)' }}>
                                                                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                                                                            <div key={emoji} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '2px 6px', backgroundColor: userReactions.includes(emoji) ? '#e0e7ff' : '#f1f5f9', borderRadius: '10px', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => handleToggleReaction(comment.id, emoji)}>
                                                                                <span>{emoji}</span>
                                                                                <span style={{ color: userReactions.includes(emoji) ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>{count as number}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <div style={{ display: 'flex', gap: '0.25rem', padding: '2px 6px', background: 'white', borderRadius: '12px', opacity: 0.7, boxShadow: '0 1px 2px rgb(0 0 0 / 0.05)' }}>
                                                                    {EMOJIS.slice(0, 4).map(emoji => (
                                                                        <button key={emoji} onClick={() => handleToggleReaction(comment.id, emoji)} style={{ fontSize: '0.85rem', cursor: 'pointer', border: 'none', background: 'none' }} className="hover:scale-125 transition-transform">{emoji}</button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    <div style={{ backgroundColor: 'transparent', padding: '0 1.5rem 1.5rem 1.5rem' }}>
                                        <form onSubmit={handleAddComment}>
                                            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', borderRadius: '32px', padding: '0.35rem 0.35rem 0.35rem 1rem', boxShadow: '0 15px 35px -5px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03)' }}>
                                                <Button type="button" variant="secondary" style={{ padding: '0.5rem', borderRadius: '50%', color: '#64748b', background: 'transparent' }} onClick={() => document.getElementById('discuss-attach')?.click()}>
                                                    <Paperclip size={20} />
                                                </Button>
                                                <input 
                                                    type="file" 
                                                    id="discuss-attach" 
                                                    style={{ display: 'none' }} 
                                                    multiple
                                                    onChange={async (e) => {
                                                        const files = e.target.files;
                                                        if (!files || files.length === 0) return;
                                                        setIsSaving(true);
                                                        try {
                                                            let newTxt = '';
                                                            for (let i=0; i<files.length; i++) {
                                                                const file = files[i];
                                                                if (file.size > 52428800) { alert('File quá lớn'); continue; }
                                                                const fd = new FormData(); fd.append('file', file);
                                                                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                                                                if (!res.ok) continue;
                                                                const data = await res.json();
                                                                if (file.type.startsWith('image/')) {
                                                                    newTxt += `\n<img src="${data.url}" alt="${file.name}" style="max-width:100%; border-radius:12px; margin-top:8px; display:block;" />`;
                                                                } else {
                                                                    newTxt += `\n<a href="${data.url}" target="_blank" style="display:inline-flex; align-items:center; gap:8px; padding:10px 14px; background:rgba(255,255,255,0.2); color:inherit; border-radius:12px; text-decoration:none; margin-top:8px; border:1px solid rgba(255,255,255,0.4); font-weight:500;">📎 ${file.name}</a>`;
                                                                }
                                                            }
                                                            setNewComment(prev => prev + newTxt);
                                                        } finally { setIsSaving(false); }
                                                    }} 
                                                />
                                                <textarea
                                                    value={newComment}
                                                    onChange={e => setNewComment(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            if(newComment.trim() && !isSaving) {
                                                              handleAddComment(e as unknown as React.FormEvent);
                                                            }
                                                        }
                                                    }}
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
                                                                        setNewComment(prev => prev + `\n<img src="${data.url}" alt="Pasted Image" style="max-width:100%; border-radius:12px; margin-top:8px; display:block; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);" />`);
                                                                    } catch (err) {
                                                                        alert('Lỗi tải hình ảnh từ clipboard');
                                                                    } finally {
                                                                        setIsSaving(false);
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    placeholder="Gõ tin nhắn... (Enter để gửi, Shift+Enter xuống dòng, Hỗ trợ dán ảnh)"
                                                    style={{ 
                                                        flex: 1, 
                                                        minHeight: '24px', 
                                                        maxHeight: '120px',
                                                        padding: '0.65rem 0.5rem', 
                                                        borderRadius: '0', 
                                                        border: 'none', 
                                                        backgroundColor: 'transparent',
                                                        resize: 'none', 
                                                        fontSize: '0.95rem',
                                                        outline: 'none',
                                                        color: '#1e293b'
                                                    }}
                                                    rows={1}
                                                />
                                                <Button 
                                                    type="submit" 
                                                    disabled={isSaving || !newComment.trim()} 
                                                    style={{ 
                                                        borderRadius: '50%', 
                                                        width: '44px', 
                                                        height: '44px', 
                                                        padding: 0, 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        background: (!isSaving && newComment.trim()) ? 'linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)' : '#e2e8f0',
                                                        border: 'none',
                                                        color: (!isSaving && newComment.trim()) ? 'white' : '#94a3b8',
                                                        boxShadow: (!isSaving && newComment.trim()) ? '0 4px 15px rgba(59, 130, 246, 0.4)' : 'none',
                                                        transition: 'all 0.3s'
                                                    }}
                                                >
                                                    <Send size={18} style={{ marginLeft: '3px' }} />
                                                </Button>
                                            </div>
                                        </form>
                                    </div>
                                </>
                            ) : null}
                        </Card>
                    </div>
                )}

                {activeTab === 'ISSUES' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        {/* SECTION 1: ISSUES */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Flag size={20} color="#ef4444" /> Sự Cố (Issues)
                                </h2>
                                <Button variant="primary" onClick={() => { setEditingIssueData(null); setIsIssueModalOpen(true); }}>
                                    <Plus size={16} style={{ marginRight: '8px' }} /> Ghi Nhận Sự Cố & Vấn Đề
                                </Button>
                            </div>
                            
                            {!project.issues || project.issues.length === 0 ? (
                                getEmptyState('Sự Cố (Issue)', 'Không có sự cố nào cản trở dự án ở hiện tại.', Flag, '#')
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                                    {project.issues.map((issue: any) => {
                                        const ragColors: Record<string, { bg: string, text: string, border: string, label: string }> = {
                                            'RED': { bg: '#fee2e2', text: '#ef4444', border: '#fca5a5', label: 'Nghiêm trọng (Blocker)' },
                                            'AMBER': { bg: '#fef3c7', text: '#f59e0b', border: '#fcd34d', label: 'Cảnh báo (Warning)' },
                                            'GREEN': { bg: '#dcfce7', text: '#10b981', border: '#86efac', label: 'Chấp nhận được' },
                                        };
                                        const c = ragColors[issue.severity || 'AMBER'];
                                        
                                        return (
                                            <Card key={issue.id} style={{ borderLeft: `6px solid ${c.text}`, overflow: 'hidden' }}>
                                                <div style={{ padding: '1.25rem', backgroundColor: c.bg + '30', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <button 
                                                                onClick={() => { setEditingIssueData(issue); setIsIssueModalOpen(true); }}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', padding: '2px' }}
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <span style={{ padding: '4px 10px', backgroundColor: c.bg, color: c.text, borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${c.border}` }}>
                                                                {c.label}
                                                            </span>
                                                        </div>
                                                        <select
                                                            value={issue.status}
                                                            onChange={async (e) => {
                                                                setIsSaving(true);
                                                                try {
                                                                    await updateProjectIssueStatus(issue.id, e.target.value, project.id);
                                                                    router.refresh();
                                                                } finally { setIsSaving(false); }
                                                            }}
                                                            disabled={isSaving}
                                                            style={{
                                                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                                                backgroundColor: issue.status === 'RESOLVED' || issue.status === 'CLOSED' ? '#dcfce7' : 'white',
                                                                color: issue.status === 'RESOLVED' || issue.status === 'CLOSED' ? '#16a34a' : 'var(--text-main)',
                                                                border: '1px solid var(--border)', cursor: 'pointer', outline: 'none'
                                                            }}
                                                        >
                                                            <option value="OPEN">Mở (Open)</option>
                                                            <option value="IN_PROGRESS">Đang xử lý</option>
                                                            <option value="RESOLVED">Đã giải quyết</option>
                                                            <option value="CLOSED">Đã đóng</option>
                                                        </select>
                                                    </div>
                                                    
                                                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: 'var(--text-main)' }}>{issue.title}</h3>
                                                    <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--text-muted)', flex: 1 }}>{issue.description || 'Không có mô tả chi tiết'}</p>
                                                    
                                                    {issue.mitigationPlan && (
                                                        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '8px', border: '1px dashed rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>PA khắc phục (Mitigation)</div>
                                                            <div style={{ fontSize: '0.85rem' }}>{issue.mitigationPlan}</div>
                                                        </div>
                                                    )}
                                                    
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Người xử lý:</div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                {issue.assignedTo ? (
                                                                    <>
                                                                        <img src={issue.assignedTo.avatar || '/default-avatar.png'} alt="user" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{issue.assignedTo.name}</span>
                                                                    </>
                                                                ) : (
                                                                    <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--danger)' }}>Chưa chỉ định</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {formatDate(new Date(issue.createdAt))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* SECTION 2: RISKS */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '2.5rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={20} color="#f59e0b" /> Quản Trị Rủi Ro (Risks)
                                </h2>
                                <Button variant="secondary" onClick={() => { setEditingRiskData(null); setIsRiskModalOpen(true); }}>
                                    <AlertTriangle size={16} style={{ marginRight: '8px' }} /> Đánh Giá Rủi Ro
                                </Button>
                            </div>

                            {!project.risks || project.risks.length === 0 ? (
                                getEmptyState('Rủi ro (Risk)', 'Dự án hiện tại không có rủi ro tiềm ẩn nào được cấu hình.', AlertTriangle, '#')
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                                    {project.risks.map((risk: any) => {
                                        const impactColors: Record<string, { bg: string, text: string }> = {
                                            'LOW': { bg: '#e0f2fe', text: '#0284c7' },       // Blue
                                            'MEDIUM': { bg: '#fef3c7', text: '#d97706' },    // Amber
                                            'HIGH': { bg: '#ffedd5', text: '#ea580c' },      // Orange
                                            'CRITICAL': { bg: '#fee2e2', text: '#dc2626' },  // Red
                                        };
                                        const c = impactColors[risk.impact || 'MEDIUM'];
                                        
                                        return (
                                            <Card key={risk.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <button 
                                                                onClick={() => { setEditingRiskData(risk); setIsRiskModalOpen(true); }}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', padding: '2px' }}
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <span style={{ padding: '4px 10px', backgroundColor: c.bg, color: c.text, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                                Tác động: {risk.impact}
                                                            </span>
                                                        </div>
                                                        <select
                                                            value={risk.status}
                                                            onChange={async (e) => {
                                                                setIsSaving(true);
                                                                try {
                                                                    await updateProjectRiskStatus(risk.id, e.target.value, project.id);
                                                                    router.refresh();
                                                                } finally { setIsSaving(false); }
                                                            }}
                                                            disabled={isSaving}
                                                            style={{
                                                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                                                backgroundColor: risk.status === 'MITIGATED' || risk.status === 'RESOLVED' ? '#dcfce7' : '#f1f5f9',
                                                                color: risk.status === 'MITIGATED' || risk.status === 'RESOLVED' ? '#16a34a' : 'var(--text-main)',
                                                                border: '1px solid var(--border)', cursor: 'pointer', outline: 'none'
                                                            }}
                                                        >
                                                            <option value="OPEN">Đang theo dõi (Open)</option>
                                                            <option value="MITIGATED">Đã phòng ngừa (Mitigated)</option>
                                                            <option value="OCCURRED">Đã xảy ra sự cố</option>
                                                            <option value="RESOLVED">Đã giải quyết</option>
                                                        </select>
                                                    </div>
                                                    
                                                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: 'var(--text-main)' }}>{risk.title}</h3>
                                                    <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', flex: 1 }}>{risk.description || 'Không có mô tả chi tiết'}</p>
                                                    
                                                    {/* Probability Bar */}
                                                    <div style={{ marginBottom: '1.5rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                                                            <span>Xác suất xảy ra</span>
                                                            <span style={{ color: risk.probability > 70 ? '#ef4444' : risk.probability > 40 ? '#f59e0b' : '#10b981' }}>
                                                                {risk.probability}%
                                                            </span>
                                                        </div>
                                                        <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${risk.probability}%`, backgroundColor: risk.probability > 70 ? '#ef4444' : risk.probability > 40 ? '#f59e0b' : '#10b981', height: '100%' }} />
                                                        </div>
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <img src={risk.creator?.avatar || '/default-avatar.png'} alt="user" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>{risk.creator?.name} ghi nhận</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {formatDate(new Date(risk.createdAt))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'TIMESHEETS' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <Card style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                                    <Clock size={20} color="var(--primary)" /> Phân Bổ Nguồn Lực & Chấm Công
                                </h3>
                            </div>
                            
                            {(() => {
                                const workloadByUser = new Map();
                                project.tasks?.forEach((task: any) => {
                                    task.timeLogs?.forEach((log: any) => {
                                        if (!log.user) return;
                                        const uid = log.user.id;
                                        if (!workloadByUser.has(uid)) {
                                            workloadByUser.set(uid, {
                                                user: log.user,
                                                totalHours: 0,
                                                laborCost: 0,
                                                tasksCount: new Set(),
                                                logs: []
                                            });
                                        }
                                        const w = workloadByUser.get(uid);
                                        const hours = (log.durationSec || 0) / 3600;
                                        w.totalHours += hours;
                                        w.laborCost += hours * (log.user.employeeProfile?.hourlyRate || 0);
                                        w.tasksCount.add(task.id);
                                        w.logs.push({ taskTitle: task.title, hours, date: log.createdAt || log.startTime });
                                    });
                                });
                                const workloadArray = Array.from(workloadByUser.values()).sort((a: any, b: any) => b.totalHours - a.totalHours);
                                
                                if (workloadArray.length === 0) {
                                    return getEmptyState('Ghi nhận thời gian', 'Chưa có nhân sự nào chấm công Play/Stop thời gian trong các công việc của dự án này.', Clock, '#');
                                }
                                
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {workloadArray.map((w: any) => (
                                            <div key={w.user.id} style={{ padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--surface)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <img src={w.user.avatar || '/default-avatar.png'} alt="avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-main)' }}>{w.user.name}</div>
                                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tham gia {w.tasksCount.size} công việc khác nhau</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{w.totalHours.toFixed(1)} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Giờ</span></div>
                                                        <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>Chi phí: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(w.laborCost)}</div>
                                                    </div>
                                                </div>
                                                
                                                <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                    {/* Warning red if working more than 40 hours logged strictly on this project alone */}
                                                    <div style={{ width: `${Math.min((w.totalHours / 40) * 100, 100)}%`, backgroundColor: w.totalHours > 40 ? '#ef4444' : (w.totalHours > 20 ? '#f59e0b' : '#10b981'), height: '100%', transition: 'width 0.5s' }} />
                                                </div>
                                                
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                                                    {w.logs.slice(0, 6).map((log: any, idx: number) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px dashed #e2e8f0' }}>
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', fontWeight: 500 }} title={log.taskTitle}>{log.taskTitle}</span>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-main)', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{log.hours.toFixed(1)}h</span>
                                                        </div>
                                                    ))}
                                                    {w.logs.length > 6 && <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)', fontWeight: 500 }}>+ {w.logs.length - 6} bản ghi khác...</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* KPI Summary Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '4px solid var(--primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Tiến độ tổng thể</span>
                                    <Target size={18} color="var(--primary)" />
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                    {progress}%
                                </div>
                                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginTop: '0.5rem' }}>
                                    <div style={{ width: `${progress}%`, backgroundColor: 'var(--primary)', height: '100%', borderRadius: '4px' }} />
                                </div>
                            </Card>

                            <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '4px solid #10b981' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Tài chính (Lãi/Lỗ)</span>
                                    <DollarSign size={18} color="#10b981" />
                                </div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                        (project.quotes?.reduce((acc: number, q: any) => acc + (q.status === 'ACCEPTED' ? q.totalAmount : 0), 0) || 0) - 
                                        (project.expenses?.reduce((acc: number, e: any) => acc + (e.status === 'APPROVED' ? e.amount : 0), 0) || 0)
                                    )}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <ArrowUpRight size={14} color="#10b981" /> Tạm tính từ Báo Giá & Chi Phí
                                </div>
                            </Card>

                            <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '4px solid #f59e0b' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Vấn đề & Rủi ro</span>
                                    <Flag size={18} color="#f59e0b" />
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                    {project.issues?.length || 0}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {project.issues?.filter((i:any) => i.status !== 'CLOSED').length || 0} vấn đề đang mở
                                </div>
                            </Card>

                            <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '4px solid #8b5cf6' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Team & Nguồn lực</span>
                                    <Users size={18} color="#8b5cf6" />
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                    {project.members?.length || 0} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>người</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                                    {project.members?.slice(0, 5).map((m: any) => (
                                        <div key={m.id} style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 600, color: 'var(--primary)', border: '1px solid white', marginLeft: '-8px' }}>
                                            {m.user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Detailed Charts Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem' }}>
                            {/* Breakdown of Tasks */}
                            <Card style={{ padding: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <LayoutDashboard size={18} color="var(--primary)" /> Phân bổ khối lượng công việc (Workload)
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {['TODO', 'IN_PROGRESS', 'REVIEW', 'CANCELLED'].map(status => {
                                        const count = project.tasks?.filter((t: any) => t.status === status).length || 0;
                                        const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                                        const config: Record<string, { color: string, label: string }> = {
                                            'TODO': { color: '#f59e0b', label: 'Chuẩn bị' },
                                            'IN_PROGRESS': { color: '#3b82f6', label: 'Đang làm' },
                                            'REVIEW': { color: '#8b5cf6', label: 'Chờ duyệt' },
                                            'CANCELLED': { color: '#ef4444', label: 'Hủy/Tạm dừng' }
                                        };
                                        return (
                                            <div key={status}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                                                    <span style={{ fontWeight: 500 }}>{config[status].label}</span>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{count} task(s) - {pct}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, backgroundColor: config[status].color, height: '100%', transition: 'width 1s ease-in-out' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* Timeline Health */}
                            <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Milestone size={18} color="#10b981" /> Sức khỏe Tiến độ
                                </h3>
                                
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
                                    {(() => {
                                        const endDate = project.endDate ? new Date(project.endDate) : null;
                                        const today = new Date();
                                        const totalDays = (endDate && project.startDate) ? Math.ceil((endDate.getTime() - new Date(project.startDate).getTime()) / (1000 * 3600 * 24)) : 0;
                                        const daysPassed = project.startDate ? Math.ceil((today.getTime() - new Date(project.startDate).getTime()) / (1000 * 3600 * 24)) : 0;
                                        
                                        const isOverdue = endDate && today > endDate;
                                        const timePct = totalDays > 0 ? Math.min(100, Math.max(0, (daysPassed / totalDays) * 100)) : 0;
                                        const timeProgressDiff = progress - timePct;
                                        
                                        let statusColor = '#10b981';
                                        let statusText = 'Đúng tiến độ';
                                        let statusIcon = '✓';
                                        
                                        if (isOverdue && progress < 100) {
                                            statusColor = '#ef4444'; statusText = 'Trễ hạn'; statusIcon = '⚠';
                                        } else if (timeProgressDiff < -15) {
                                            statusColor = '#f59e0b'; statusText = 'Nguy cơ chậm trễ'; statusIcon = '!';
                                        } else if (timeProgressDiff > 20) {
                                            statusColor = '#3b82f6'; statusText = 'Vượt tiến độ'; statusIcon = '🚀';
                                        }

                                        if (!endDate) {
                                            return <div style={{ color: 'var(--text-muted)' }}>Chưa cấu hình ngày kết thúc</div>;
                                        }

                                        return (
                                            <>
                                                <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: `${statusColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `4px solid ${statusColor}` }}>
                                                    <span style={{ fontSize: '3rem' }}>{statusIcon}</span>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: statusColor }}>{statusText}</h4>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        Đã tiêu hao <b>{Math.round(timePct)}%</b> thời gian quỹ đạo<br/>
                                                        để hoàn thành <b>{progress}%</b> khối lượng công việc.
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            <CreateIssueModal 
                isOpen={isIssueModalOpen}
                onClose={() => { setIsIssueModalOpen(false); setEditingIssueData(null); }}
                projectId={project.id}
                initialData={editingIssueData}
            />
            <CreateRiskModal 
                isOpen={isRiskModalOpen}
                onClose={() => { setIsRiskModalOpen(false); setEditingRiskData(null); }}
                projectId={project.id}
                initialData={editingRiskData}
            />
        </div>
    );
}

