'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, CheckCircle, RefreshCcw, Building2, User, Phone, Mail, DollarSign, Calendar, Tag, FileText, CheckSquare, Plus, Paperclip, Send, Link as LinkIcon, ImageIcon } from 'lucide-react';
import { formatMoney, formatDate, formatDateTime } from '@/lib/utils/formatters';
import { updateLeadStatus, deleteLead, convertLeadToCustomer, connectLeadToExistingCustomer, addLeadActivityLog, sendLeadEmail, updateLeadAssignees } from '../actions';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Modal } from '@/app/components/ui/Modal';
import { SendEmailModal } from '@/app/components/ui/modals/SendEmailModal';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { EmailLogTable } from '@/app/components/ui/EmailLogTable';
import { LeadComments } from './comments/LeadComments';

const STATUSES = [
    { id: 'NEW', label: 'Tiếp nhận mới', color: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', light: '#a5b4fc', solid: '#4f46e5' } },
    { id: 'CONTACTED', label: 'Đã liên hệ', color: { bg: '#e0f2fe', text: '#075985', border: '#bae6fd', light: '#7dd3fc', solid: '#0284c7' } },
    { id: 'QUALIFIED', label: 'Đánh giá / Khảo sát', color: { bg: '#fef3c7', text: '#92400e', border: '#fde68a', light: '#fcd34d', solid: '#d97706' } },
    { id: 'PROPOSAL', label: 'Gửi báo giá', color: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', light: '#d8b4fe', solid: '#9333ea' } },
    { id: 'WON', label: 'Chốt thành công', color: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', light: '#86efac', solid: '#16a34a' } },
    { id: 'LOST', label: 'Thất bại', color: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', light: '#fca5a5', solid: '#dc2626' } }
];

const styles = {
    pageContainer: { padding: '24px', maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '24px', boxSizing: 'border-box' as const, fontFamily: 'Inter, sans-serif' },
    headerCard: {
        display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'space-between', alignItems: 'center', gap: '16px',
        backgroundColor: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9'
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    backBtn: { padding: '8px', borderRadius: '50%', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'all 0.2s' },
    titleArea: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
    titleRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const },
    pageTitle: { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 },
    statusBadge: { padding: '4px 12px', fontSize: '13px', fontWeight: 'bold', borderRadius: '9999px', whiteSpace: 'nowrap' as const },
    customerBadge: { padding: '4px 12px', fontSize: '13px', fontWeight: 'bold', borderRadius: '9999px', backgroundColor: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' as const },
    subtitle: { fontSize: '14px', color: '#64748b', margin: 0, fontWeight: '500' },

    headerRight: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const },
    btnPrimary: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)' },
    btnSecondary: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    btnDanger: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer' },

    pipelineCard: { backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', position: 'relative' as const },
    pipelineTrack: { position: 'absolute' as const, top: '50%', left: '40px', right: '40px', height: '4px', backgroundColor: '#f1f5f9', transform: 'translateY(-50%)', zIndex: 0, borderRadius: '2px' },
    pipelineSteps: { display: 'flex', justifyContent: 'space-between', position: 'relative' as const, zIndex: 1, overflowX: 'auto' as const },

    mainLayout: { display: 'grid', gridTemplateColumns: '1fr', gap: '24px' },
    mainLayoutDesktop: { gridTemplateColumns: '2fr 1fr' },

    sectionCard: { backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' },
    sectionTitle: { fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 20px 0', paddingBottom: '16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: '8px' },

    infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', rowGap: '20px' },
    infoGroup: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
    infoLabel: { fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
    infoValue: { fontSize: '15px', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' },
    infoIcon: { color: '#94a3b8' },

    activityItem: { padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', marginBottom: '16px' },
    activityHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
    activityTitle: { fontSize: '14px', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' },
    activityMeta: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
    activityContent: { fontSize: '14px', color: '#475569', backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '12px' }
};

export function LeadDetailClient({ lead, customers, users, emailTemplates = [] }: { lead: any, customers: any[], users: any[], emailTemplates?: any[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'emailLogs'>('info');

    // Convert states
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [convertMode, setConvertMode] = useState<'AUTO' | 'EXISTING'>('AUTO');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

    // Note Input State
    const [noteContent, setNoteContent] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState<{ url: string, name: string }[]>([]);
    const [noteImages, setNoteImages] = useState<{ url: string, name: string }[]>([]);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [activityLogs, setActivityLogs] = useState(lead.activityLogs || []);

    // Assignee Modal State
    const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false);
    const [editAssignees, setEditAssignees] = useState<string[]>(
        lead.assignees?.map((a: any) => a.userId) || (lead.assignedToId ? [lead.assignedToId] : [])
    );
    const [isSavingAssignees, setIsSavingAssignees] = useState(false);

    const handleSaveAssignees = async () => {
        setIsSavingAssignees(true);
        try {
            await updateLeadAssignees(lead.id, editAssignees);
            setIsAssigneeModalOpen(false);
            router.refresh();
        } catch (err: any) {
            alert(err.message || 'Lỗi cập nhật người phụ trách');
        } finally {
            setIsSavingAssignees(false);
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim() && attachments.length === 0 && noteImages.length === 0) return;

        setIsSubmittingNote(true);
        try {
            const hasText = noteContent.trim().length > 0;
            const hasFiles = attachments.length > 0;
            const hasImages = noteImages.length > 0;

            let actionText = 'NOTE_ADDED';
            if ((hasFiles || hasImages) && !hasText) actionText = 'FILE_UPLOADED';
            if ((hasFiles || hasImages) && hasText) actionText = 'NOTE_AND_FILE_ADDED';

            const attachmentStr = hasFiles ? JSON.stringify(attachments) : '';
            let finalDetails = hasText ? (hasFiles ? `${noteContent}\n\nĐính kèm: ${attachmentStr}` : noteContent) : `Đã tải lên tệp: ${attachmentStr}`;

            if (hasImages) {
                finalDetails += `||IMAGES:${JSON.stringify(noteImages)}`;
            }

            const res = await addLeadActivityLog(lead.id, actionText, finalDetails);
            if (res.success && res.log) {
                setActivityLogs([res.log, ...activityLogs]);
                setNoteContent('');
                setAttachments([]);
                setNoteImages([]);
            } else {
                alert(res.error || 'Có lỗi khi thêm ghi chú');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmittingNote(false);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    if (file.size > 5242880) {
                        alert(`File ảnh dán vào quá lớn (Tối đa 5MB)`);
                        return;
                    }
                    setIsUploading(true);
                    const formData = new FormData();
                    formData.append('file', file);
                    fetch('/api/upload', { method: 'POST', body: formData })
                        .then(res => {
                            if (!res.ok) throw new Error('Upload failed');
                            return res.json();
                        })
                        .then(data => {
                            setNoteImages(prev => [...prev, { url: data.url, name: file.name }]);
                        })
                        .catch(err => {
                            alert('Lỗi tải hình ảnh từ clipboard');
                        })
                        .finally(() => {
                            setIsUploading(false);
                        });
                }
            }
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (lead.status === newStatus) return;
        setLoading(true);
        try {
            await updateLeadStatus(lead.id, newStatus);
            router.refresh();
        } catch (err) {
            alert('Lỗi khi cập nhật trạng thái');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteLead(lead.id);
            router.push('/sales/leads');
            router.refresh();
        } catch (err) {
            alert('Lỗi khi xóa Cơ hội');
        } finally {
            setLoading(false);
            setIsDeleteModalOpen(false);
        }
    };

    const handleConvert = async () => {
        setLoading(true);
        setDuplicateWarning(null);
        try {
            if (convertMode === 'EXISTING') {
                if (!selectedCustomerId) {
                    alert('Vui lòng chọn khách hàng có sẵn!');
                    setLoading(false);
                    return;
                }
                await connectLeadToExistingCustomer(lead.id, selectedCustomerId);
                setIsConvertModalOpen(false);
                router.refresh();
            } else {
                const res = await convertLeadToCustomer(lead.id) as any;
                if (res.duplicate) {
                    setDuplicateWarning({
                        message: res.message,
                        customer: res.existingCustomer
                    });
                } else {
                    setIsConvertModalOpen(false);
                    router.refresh();
                }
            }
        } catch (err: any) {
            alert(err.message || 'Lỗi khi chuyển đổi khách hàng');
        } finally {
            setLoading(false);
        }
    };

    const currentStatus = STATUSES.find(s => s.id === lead.status) || STATUSES[0];
    const customerOptions = customers.map(c => ({ value: c.id, label: `${c.code ? c.code + ' - ' : ''}${c.name} ${c.phone ? `(${c.phone})` : ''}` }));

    return (
        <div style={styles.pageContainer}>
            {/* Lightbox */}
            {lightboxImage && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => setLightboxImage(null)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lightboxImage} alt="Phóng to" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px' }} />
                </div>
            )}

            {/* Header */}
            <div style={styles.headerCard}>
                <div style={styles.headerLeft}>
                    <Link href="/sales/leads" style={styles.backBtn}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div style={styles.titleArea}>
                        <div style={styles.titleRow}>
                            <h1 style={styles.pageTitle}>{lead.name}</h1>
                            <span style={{ ...styles.statusBadge, backgroundColor: currentStatus.color.bg, color: currentStatus.color.text, border: `1px solid ${currentStatus.color.border}` }}>
                                {currentStatus.label}
                            </span>
                            {lead.customerId && (
                                <span style={styles.customerBadge}>
                                    <CheckCircle size={14} /> Đã có KH
                                </span>
                            )}
                        </div>
                        <div style={{ ...styles.subtitle, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>Mã KH: <span style={{ fontWeight: '700' }}>{lead.code}</span></span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                Phụ trách:
                                {lead.assignees && lead.assignees.length > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {lead.assignees.map((a: any) => (
                                            <div key={a.userId} style={{ padding: '2px 8px', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }} title={a.user?.name}>
                                                {a.user?.name}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span>{lead.assignedTo?.name || 'Chưa gán'}</span>
                                )}
                                <button onClick={() => setIsAssigneeModalOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', padding: '4px' }} title="Sửa người phụ trách">
                                    <Edit size={14} />
                                </button>
                            </span>
                        </div>
                    </div>
                </div>

                <div style={styles.headerRight}>
                    {!lead.customerId && (
                        <button
                            onClick={() => setIsConvertModalOpen(true)}
                            style={styles.btnPrimary}
                        >
                            <RefreshCcw size={16} /> Chuyển thành Khách Hàng
                        </button>
                    )}
                    {lead.customerId && (
                        <Link href={`/customers/${lead.customerId}`} style={{ ...styles.btnSecondary, color: '#4f46e5', borderColor: '#c7d2fe', backgroundColor: '#e0e7ff' }}>
                            <User size={16} /> Xem hồ sơ KH
                        </Link>
                    )}
                    <Link href={`/sales/estimates?action=new&leadId=${lead.id}&customerId=${lead.customerId || ''}`} style={{ ...styles.btnSecondary, color: '#0ea5e9', borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }} title="Tạo Báo Giá">
                        <FileText size={16} /> Tạo Báo Giá
                    </Link>
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        style={{ ...styles.btnSecondary, color: '#3b82f6', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
                        title="Gửi Email Thông Báo"
                    >
                        <Mail size={16} /> Gửi Email
                    </button>
                    <Link href={`/sales/leads/${lead.id}/edit`} style={styles.btnSecondary}>
                        <Edit size={16} /> Sửa
                    </Link>
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        style={styles.btnDanger}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Pipeline Stage Bar */}
            <div style={styles.pipelineCard}>
                <div style={styles.pipelineTrack} />
                <div style={styles.pipelineSteps}>
                    {STATUSES.map((s, idx) => {
                        const isCurrent = s.id === lead.status;
                        const isPast = STATUSES.findIndex(x => x.id === lead.status) > idx;

                        const btnStyles = {
                            display: 'flex', flexDirection: 'column' as const, itemsCenter: 'center', gap: '8px',
                            padding: '12px 16px', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', background: 'transparent',
                            transform: isCurrent ? 'scale(1.05)' : 'none', transition: 'all 0.2s', alignItems: 'center'
                        };

                        const circleStyles = {
                            width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `2px solid ${isCurrent ? s.color.solid : isPast ? s.color.light : '#e2e8f0'}`,
                            backgroundColor: isCurrent ? s.color.solid : isPast ? s.color.bg : '#ffffff',
                            color: isCurrent ? '#ffffff' : isPast ? s.color.solid : '#94a3b8',
                            boxShadow: isCurrent ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', zIndex: 2
                        };

                        return (
                            <button
                                key={s.id}
                                disabled={loading}
                                onClick={() => handleStatusChange(s.id)}
                                style={btnStyles}
                            >
                                <div style={circleStyles}>
                                    {isPast || s.id === 'WON' ? <CheckCircle size={18} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }} />}
                                </div>
                                <span style={{
                                    fontSize: '13px',
                                    color: isCurrent ? s.color.solid : isPast ? '#475569' : '#94a3b8',
                                    fontWeight: isCurrent ? '700' : '600',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {s.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Left Col: Info & Tasks */}
            <div style={{ ...styles.mainLayout, ...(window.innerWidth >= 1024 ? styles.mainLayoutDesktop : {}) }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                        <button
                            onClick={() => setActiveTab('info')}
                            style={{
                                flex: 1, padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
                                backgroundColor: activeTab === 'info' ? 'white' : 'transparent',
                                color: activeTab === 'info' ? '#0f172a' : '#64748b',
                                border: 'none', cursor: 'pointer',
                                boxShadow: activeTab === 'info' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            <Building2 size={16} /> Thông tin chung
                        </button>
                        <button
                            onClick={() => setActiveTab('emailLogs')}
                            style={{
                                flex: 1, padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
                                backgroundColor: activeTab === 'emailLogs' ? 'white' : 'transparent',
                                color: activeTab === 'emailLogs' ? '#0f172a' : '#64748b',
                                border: 'none', cursor: 'pointer',
                                boxShadow: activeTab === 'emailLogs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            <Mail size={16} /> Lịch sử Email
                            <span style={{ backgroundColor: activeTab === 'emailLogs' ? '#e0e7ff' : '#cbd5e1', color: activeTab === 'emailLogs' ? '#4f46e5' : '#475569', padding: '2px 8px', borderRadius: '99px', fontSize: '12px' }}>
                                {lead.emailLogs?.length || 0}
                            </span>
                        </button>
                    </div>

                    {activeTab === 'info' ? (
                        <>
                            {/* Cơ bản */}
                            <div style={styles.sectionCard}>
                                <h2 style={styles.sectionTitle}>
                                    <Building2 size={20} color="#6366f1" /> Thông tin chung
                                </h2>

                                <div style={styles.infoGrid}>
                                    <div style={styles.infoGroup}>
                                        <p style={styles.infoLabel}>Công ty / Tổ chức</p>
                                        <p style={styles.infoValue}>
                                            {lead.customer?.name || lead.company || '—'}
                                        </p>
                                    </div>
                                    <div style={styles.infoGroup}>
                                        <p style={styles.infoLabel}>Người liên hệ</p>
                                        <div style={styles.infoValue}>
                                            <User size={16} style={styles.infoIcon} />
                                            {lead.customer?.contactName || lead.contactName || '—'}
                                        </div>
                                    </div>
                                    <div style={styles.infoGroup}>
                                        <p style={styles.infoLabel}>Số điện thoại</p>
                                        <div style={styles.infoValue}>
                                            <Phone size={16} style={styles.infoIcon} />
                                            {lead.customer?.phone || lead.phone || '—'}
                                        </div>
                                    </div>
                                    <div style={styles.infoGroup}>
                                        <p style={styles.infoLabel}>Email</p>
                                        <div style={styles.infoValue}>
                                            <Mail size={16} style={styles.infoIcon} />
                                            {lead.customer?.email || lead.email || '—'}
                                        </div>
                                    </div>
                                    <div style={styles.infoGroup}>
                                        <p style={styles.infoLabel}>Giá trị dự kiến</p>
                                        <div style={styles.infoValue}>
                                            <DollarSign size={16} style={{ color: '#059669' }} />
                                            <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '18px' }}>{formatMoney(lead.estimatedValue)}</span>
                                        </div>
                                    </div>
                                    <div style={styles.infoGroup}>
                                        <p style={styles.infoLabel}>Ngày chốt dự kiến</p>
                                        <div style={styles.infoValue}>
                                            <Calendar size={16} style={styles.infoIcon} />
                                            {lead.expectedCloseDate ? formatDate(lead.expectedCloseDate) : '—'}
                                        </div>
                                    </div>
                                    <div style={styles.infoGroup}>
                                        <p style={styles.infoLabel}>Nguồn khách hàng</p>
                                        <div style={styles.infoValue}>
                                            <Tag size={16} style={styles.infoIcon} />
                                            {lead.source || '—'}
                                        </div>
                                    </div>
                                </div>

                                {lead.notes && (
                                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                                        <p style={{ ...styles.infoLabel, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <FileText size={16} /> Ghi chú nội bộ
                                        </p>
                                        <p style={{ fontSize: '14px', color: '#475569', whiteSpace: 'pre-wrap', backgroundColor: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fef3c7', margin: 0 }}>
                                            {lead.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <EmailLogTable emailLogs={lead.emailLogs || []} />
                    )}

                    {/* Comments Section */}
                    <LeadComments leadId={lead.id} initialComments={lead.comments} users={users} />

                </div>

                {/* Right Col: Tasks & Activity Log */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

                    {/* Tasks section */}
                    <div style={{ height: '100%', maxHeight: '430px' }}>
                        <TaskPanel
                            initialTasks={lead.tasks || []}
                            users={users || []}
                            entityType="LEAD"
                            entityId={lead.id}
                            initialTitle={`Nhiệm vụ: Cơ hội ${lead.name}`}
                        />
                    </div>

                    {/* Quotes section */}
                    {lead.salesEstimates && lead.salesEstimates.length > 0 && (
                        <div style={{ ...styles.sectionCard }}>
                            <h2 style={{ ...styles.sectionTitle, borderBottom: 'none', paddingBottom: 0, marginBottom: '12px' }}>
                                <FileText size={18} style={{ color: '#0ea5e9' }} /> Báo Giá Liên Quan
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {lead.salesEstimates.map((est: any) => (
                                    <div key={est.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #f1f5f9', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                                        <div>
                                            <Link href={`/sales/estimates/${est.id}`} style={{ fontWeight: '600', color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>
                                                {est.code}
                                            </Link>
                                            <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '8px' }}>
                                                {formatDate(new Date(est.date))}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '14px' }}>
                                                {formatMoney(est.totalAmount)}
                                            </span>
                                            <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '99px', fontWeight: '600', backgroundColor: est.status === 'DRAFT' ? '#f1f5f9' : est.status === 'ACCEPTED' ? '#dcfce7' : est.status === 'REJECTED' ? '#fee2e2' : '#e0e7ff', color: est.status === 'DRAFT' ? '#475569' : est.status === 'ACCEPTED' ? '#166534' : est.status === 'REJECTED' ? '#991b1b' : '#3730a3' }}>
                                                {est.status === 'DRAFT' ? 'Bản Nháp' : est.status === 'ACCEPTED' ? 'Đã Chốt' : est.status === 'SENT' ? 'Đã Gửi' : est.status === 'INVOICED' ? 'Đã Hóa Đơn' : est.status === 'ORDERED' ? 'Đã Lên Đơn' : est.status === 'REJECTED' ? 'Từ Chối' : est.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input System Link, Note, and Data Upload */}
                    <div style={{ ...styles.sectionCard }}>
                        <h2 style={{ ...styles.sectionTitle, marginBottom: '12px' }}>Ghi chú & Tải dữ liệu</h2>
                        <form onSubmit={handleAddNote}>
                            <div style={{ position: 'relative', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0.75rem', paddingBottom: '3rem', transition: 'all 0.2s', boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)' }}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}>
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    onPaste={handlePaste}
                                    placeholder="Thêm các thông tin, trao đổi, đường dẫn hệ thống hoặc tải báo giá tham khảo (có thể dán ảnh trực tiếp)..."
                                    style={{ width: '100%', minHeight: '60px', border: 'none', backgroundColor: 'transparent', resize: 'vertical', outline: 'none', fontSize: '0.875rem', color: '#1e293b', fontFamily: 'inherit' }}
                                />
                                <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', right: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                                    disabled={isUploading}
                                                    onChange={async (e) => {
                                                        const files = e.target.files;
                                                        if (!files || files.length === 0) return;
                                                        setIsUploading(true);
                                                        try {
                                                            const newImages = [...noteImages];
                                                            for (let i = 0; i < files.length; i++) {
                                                                const formData = new FormData();
                                                                formData.append('file', files[i]);
                                                                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                                                if (!res.ok) throw new Error('Upload failed');
                                                                const data = await res.json();
                                                                newImages.push({ url: data.url, name: files[i].name });
                                                            }
                                                            setNoteImages(newImages);
                                                        } catch (err) {
                                                            alert('Lỗi tải hình ảnh');
                                                        } finally {
                                                            setIsUploading(false);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    title="Thêm hình ảnh"
                                                />
                                                <button type="button" disabled={isUploading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '0.375rem', backgroundColor: 'transparent', border: 'none', color: isUploading ? '#cbd5e1' : '#64748b', cursor: isUploading ? 'not-allowed' : 'pointer' }} title="Thêm hình ảnh" className="hover:bg-slate-200">
                                                    <ImageIcon size={18} />
                                                </button>
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="file"
                                                    multiple
                                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                                    disabled={isUploading}
                                                    onChange={async (e) => {
                                                        const files = e.target.files;
                                                        if (!files || files.length === 0) return;
                                                        setIsUploading(true);
                                                        try {
                                                            const newAttachments = [...attachments];
                                                            for (let i = 0; i < files.length; i++) {
                                                                const formData = new FormData();
                                                                formData.append('file', files[i]);
                                                                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                                                if (!res.ok) throw new Error('Upload failed');
                                                                const data = await res.json();
                                                                newAttachments.push({ url: data.url, name: files[i].name });
                                                            }
                                                            setAttachments(newAttachments);
                                                        } catch (err) {
                                                            alert('Lỗi tải tệp tin');
                                                        } finally {
                                                            setIsUploading(false);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    title="Đính kèm tài liệu"
                                                />
                                                <button type="button" disabled={isUploading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '0.375rem', backgroundColor: 'transparent', border: 'none', color: isUploading ? '#cbd5e1' : '#64748b', cursor: isUploading ? 'not-allowed' : 'pointer' }} title="Đính kèm file" className="hover:bg-slate-200">
                                                    <Paperclip size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        {isUploading && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Đang tải...</span>}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingNote || (!noteContent.trim() && attachments.length === 0 && noteImages.length === 0) || isUploading}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: ((noteContent.trim() || attachments.length > 0 || noteImages.length > 0) && !isSubmittingNote && !isUploading) ? '#2563eb' : '#94a3b8', color: 'white', border: 'none', cursor: ((noteContent.trim() || attachments.length > 0 || noteImages.length > 0) && !isSubmittingNote && !isUploading) ? 'pointer' : 'not-allowed', transition: 'background-color 0.2s' }}
                                    >
                                        {isSubmittingNote ? 'Đang lưu...' : <><Send size={14} /> Lưu lại</>}
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Pending Attachments List */}
                        {(attachments.length > 0 || noteImages.length > 0) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '12px' }}>
                                {noteImages.map((img, idx) => (
                                    <div key={`img-${idx}`} style={{ position: 'relative', width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={img.url} alt="Upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button onClick={() => setNoteImages(noteImages.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer', display: 'flex' }}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {attachments.map((att, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.5rem', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#4338ca', height: 'max-content' }}>
                                        <FileText size={12} />
                                        <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                        <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ ...styles.sectionCard, height: '100%', maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                        <h2 style={styles.sectionTitle}>Lịch sử hoạt động</h2>
                        <div style={{ flex: 1, overflowY: 'auto' as const, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {activityLogs.map((log: any) => {
                                let actionText = log.action;
                                if (log.action === 'NOTE_ADDED') actionText = 'Đã thêm ghi chú';
                                else if (log.action === 'FILE_UPLOADED') actionText = 'Đã tải lên tài liệu';
                                else if (log.action === 'NOTE_AND_FILE_ADDED') actionText = 'Đã thêm ghi chú & tài liệu';

                                // Clean up formatting for display if handling custom JSON str logic 
                                let displayDetails = log.details;
                                let parsedFiles: any[] = [];
                                let parsedImages: any[] = [];

                                if (log.details && log.details.includes('||IMAGES:')) {
                                    const parts = log.details.split('||IMAGES:');
                                    displayDetails = parts[0];
                                    try {
                                        parsedImages = JSON.parse(parts[1]);
                                    } catch (e) { }
                                }

                                if (displayDetails && displayDetails.includes('Đính kèm: [')) {
                                    const parts = displayDetails.split('Đính kèm: ');
                                    displayDetails = parts[0].trim();
                                    try {
                                        parsedFiles = JSON.parse(parts[1]);
                                    } catch (e) { }
                                } else if (displayDetails && displayDetails.startsWith('Đã tải lên tệp: [')) {
                                    const parts = displayDetails.split('Đã tải lên tệp: ');
                                    displayDetails = '';
                                    try {
                                        parsedFiles = JSON.parse(parts[1]);
                                    } catch (e) { }
                                }

                                return (
                                    <div key={log.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                                        <div style={{ width: '32px', height: '32px', flexShrink: 0, backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', zIndex: 10 }}>
                                            {log.user?.name ? log.user.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div style={{ flex: 1, paddingBottom: '16px', minWidth: 0 }}>
                                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>{actionText}</p>
                                            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>{formatDateTime(log.createdAt)} • bởi {log.user?.name}</p>

                                            {(displayDetails || parsedFiles.length > 0 || parsedImages.length > 0) && (
                                                <div style={{ fontSize: '14px', color: '#334155', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                                                    {displayDetails && <div>{displayDetails}</div>}
                                                    {parsedImages.length > 0 && (
                                                        <div style={{ marginTop: displayDetails ? '12px' : '0', paddingTop: displayDetails ? '12px' : '0', borderTop: displayDetails ? '1px solid #e2e8f0' : 'none', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            {parsedImages.map((img: any, idx: number) => (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img key={`lg-img-${idx}`} src={img.url} alt={img.name || 'Image'} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1' }} onClick={() => setLightboxImage(img.url)} />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {parsedFiles.length > 0 && (
                                                        <div style={{ marginTop: (displayDetails || parsedImages.length > 0) ? '12px' : '0', paddingTop: (displayDetails || parsedImages.length > 0) ? '12px' : '0', borderTop: (displayDetails || parsedImages.length > 0) ? '1px solid #e2e8f0' : 'none', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            {parsedFiles.map((att: any, idx: number) => (
                                                                <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', color: '#4f46e5', textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#94a3b8'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}>
                                                                    <LinkIcon size={12} /> {att.name || 'Tài liệu đính kèm'}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>



            {/* Convert Modal */}
            <Modal isOpen={isConvertModalOpen} onClose={() => { setIsConvertModalOpen(false); setDuplicateWarning(null); }} title="Chuyển đổi Cơ hội thành Khách hàng">
                <div className="space-y-4">
                    {duplicateWarning ? (
                        <div className="bg-amber-50 p-4 border border-amber-200 rounded-lg">
                            <h3 className="text-amber-800 font-semibold mb-2">Phát hiện trùng lặp!</h3>
                            <p className="text-sm text-amber-700 mb-4">{duplicateWarning.message}</p>

                            <div className="bg-white p-3 rounded border border-amber-100 mb-4 text-sm">
                                <strong>Khách hàng:</strong> {duplicateWarning.customer.name}<br />
                                <strong>SĐT:</strong> {duplicateWarning.customer.phone || '—'} | <strong>Email:</strong> {duplicateWarning.customer.email || '—'}
                            </div>

                            <p className="text-sm text-gray-600 mb-3">Bạn muốn làm gì tiếp theo?</p>

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => {
                                        setConvertMode('EXISTING');
                                        setSelectedCustomerId(duplicateWarning.customer.id);
                                        setDuplicateWarning(null);
                                    }}
                                    className="btn-primary w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded px-4 py-2 text-sm text-center"
                                >
                                    Liên kết vào khách hàng này
                                </button>
                                <button
                                    onClick={() => {
                                        setIsConvertModalOpen(false);
                                        setDuplicateWarning(null);
                                    }}
                                    className="btn-secondary w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded px-4 py-2 text-sm text-center"
                                >
                                    Hủy bỏ
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                <button
                                    onClick={() => setConvertMode('AUTO')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${convertMode === 'AUTO' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Tạo KH rỗng
                                </button>
                                <button
                                    onClick={() => setConvertMode('EXISTING')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${convertMode === 'EXISTING' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Chọn KH có sẵn
                                </button>
                            </div>

                            {convertMode === 'AUTO' ? (
                                <p className="text-sm text-gray-600">
                                    Hệ thống sẽ tự động tạo một Hồ sơ Khách hàng mới dựa trên thông tin Cơ hội này (Tên công ty: <strong>{lead.company || lead.name}</strong>). Bạn có chắc chắn muốn tiếp tục?
                                </p>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Chọn khách hàng để liên kết:
                                    </label>
                                    <SearchableSelect
                                        options={customerOptions}
                                        value={selectedCustomerId}
                                        onChange={setSelectedCustomerId}
                                        placeholder="Tìm theo mã, tên, sđt..."
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setIsConvertModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                    disabled={loading}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleConvert}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                    disabled={loading || (convertMode === 'EXISTING' && !selectedCustomerId)}
                                >
                                    {loading && <RefreshCcw size={14} className="animate-spin" />}
                                    Xác nhận {convertMode === 'AUTO' ? 'Tạo mới' : 'Liên kết'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Xác nhận xóa">
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Bạn có chắc chắn muốn xóa Cơ hội <strong>{lead.name}</strong>? Thao tác này không thể hoàn tác.
                    </p>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                            disabled={loading}
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading && <RefreshCcw size={14} className="animate-spin" />}
                            Xóa Cơ hội
                        </button>
                    </div>
                </div>
            </Modal>

            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                templates={emailTemplates}
                moduleType="LEAD"
                variablesData={{
                    leadName: lead.name,
                    companyName: lead.company || lead.customer?.name || '---',
                    phone: lead.phone || lead.customer?.phone || '---',
                    email: lead.email || lead.customer?.email || '---',
                    source: lead.source || '---',
                    assignedTo: lead.assignees ? lead.assignees.map((a: any) => a.user?.name).join(', ') : (lead.assignedTo?.name || '---'),
                    status: currentStatus.label,
                    link: typeof window !== 'undefined' ? `${window.location.origin}/sales/leads/${lead.id}` : ''
                }}
                onSend={async (emailData) => {
                    const res = await sendLeadEmail(lead.id, emailData.to, emailData.subject, emailData.htmlBody);
                    if (res?.success) alert("Đã gửi email thông báo thành công!");
                    else alert("Lỗi khi gửi email: " + res?.error);
                }}
            />

            {/* Edit Assignees Modal */}
            <Modal isOpen={isAssigneeModalOpen} onClose={() => setIsAssigneeModalOpen(false)} title="Chỉnh sửa người phụ trách">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Người phụ trách</label>
                        <select
                            multiple
                            value={editAssignees}
                            onChange={e => {
                                const options = Array.from(e.target.selectedOptions);
                                setEditAssignees(options.map(o => o.value));
                            }}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', minHeight: '120px' }}
                        >
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name || u.email}</option>
                            ))}
                        </select>
                        <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>Bấm <kbd>Ctrl</kbd> hoặc kéo thả để chọn nhiều người.</small>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button onClick={() => setIsAssigneeModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
                            Hủy
                        </button>
                        <button onClick={handleSaveAssignees} disabled={isSavingAssignees} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: 'white', cursor: isSavingAssignees ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                            {isSavingAssignees ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
