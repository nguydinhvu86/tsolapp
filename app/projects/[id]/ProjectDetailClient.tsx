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
    Paperclip, Trash2, Clock, Tag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { addComment, uploadTaskAttachment, deleteTaskAttachment, toggleReaction } from '@/app/tasks/actions';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '👀'];

export function ProjectDetailClient({ project, users }: { project: any, users: any[] }) {
    const router = useRouter();
    const { data: session } = useSession();

    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'DISCUSSIONS' | 'FILES' | 'REPORTS'>('OVERVIEW');

    // Discussion State
    const [newComment, setNewComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Upload Progress State
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

    // Calculate Project Progress
    const totalTasks = project.childTasks?.length || 0;
    const completedTasks = project.childTasks?.filter((t: any) => t.status === 'DONE').length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Derived Milestones (Child tasks with High/Urgent priority or a specific convention)
    const milestones = project.childTasks?.filter((t: any) => t.priority === 'URGENT' || t.priority === 'HIGH') || [];

    // Contextual references
    const relatedLinks = [];
    if (project.contract) relatedLinks.push({ label: 'Hợp đồng', value: project.contract.title, href: `/contracts/${project.contract.id}` });
    if (project.quote) relatedLinks.push({ label: 'Báo giá', value: project.quote.title, href: `/quotes/${project.quote.id}` });
    if (project.handover) relatedLinks.push({ label: 'Bàn giao', value: project.handover.title, href: `/handovers/${project.handover.id}` });
    if (project.paymentReq) relatedLinks.push({ label: 'Thanh toán', value: project.paymentReq.title, href: `/payment-requests/${project.paymentReq.id}` });
    if (project.dispatch) relatedLinks.push({ label: 'Công văn', value: project.dispatch.title, href: `/dispatches/${project.dispatch.id}` });
    if (project.customer) relatedLinks.push({ label: 'Khách hàng', value: project.customer.name, href: `/customers/${project.customer.id}` });
    if (project.salesOrder) relatedLinks.push({ label: 'Đơn hàng', value: project.salesOrder.code, href: `/sales/orders/${project.salesOrder.id}` });
    if (project.salesInvoice) relatedLinks.push({ label: 'Hóa đơn', value: project.salesInvoice.code, href: `/sales/invoices/${project.salesInvoice.id}` });
    if (project.salesEstimate) relatedLinks.push({ label: 'Báo giá (Sales)', value: project.salesEstimate.code, href: `/sales/estimates/${project.salesEstimate.id}` });
    if (project.salesPayment) relatedLinks.push({ label: 'Phiếu thu', value: project.salesPayment.code, href: `/sales/payments/${project.salesPayment.id}` });

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
        { id: 'TASKS', label: 'Bảng Công Việc', icon: LayoutDashboard },
        { id: 'DISCUSSIONS', label: 'Thảo Luận', icon: MessageSquare },
        { id: 'FILES', label: 'Tủ Hồ Sơ', icon: FileText },
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
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={12} /> Thành viên ({project.assignees?.length || 0})</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                            {project.assignees?.map((a: any) => (
                                                <div key={a.userId} style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: '#f1f5f9', fontSize: '0.75rem', border: '1px solid #e2e8f0' }}>
                                                    {a.user.name || a.user.email}
                                                </div>
                                            ))}
                                            {(!project.assignees || project.assignees.length === 0) && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chưa có thành viên</span>}
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

                {activeTab === 'TASKS' && (
                    <div style={{ height: '100%' }}>
                        <TaskDashboardClient
                            initialTasks={project.childTasks || []}
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
                                    const count = project.childTasks?.filter((t: any) => t.status === status).length || 0;
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

