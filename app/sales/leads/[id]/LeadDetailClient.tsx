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
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal';
import { LeadNotes } from '@/app/components/sales/LeadNotes';
import { useTranslation } from '@/app/i18n/LanguageContext';

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

export function LeadDetailClient({ lead, customers, users, emailTemplates = [], currentUserId, currentUserRole }: { lead: any, customers: any[], users: any[], emailTemplates?: any[], currentUserId: string, currentUserRole: string }) {
    const { t } = useTranslation();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const STATUSES = React.useMemo(() => [
        { id: 'NEW', label: t('leadDetails.statusNew'), color: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', light: '#a5b4fc', solid: '#4f46e5' } },
        { id: 'CONTACTED', label: t('leadDetails.statusContacted'), color: { bg: '#e0f2fe', text: '#075985', border: '#bae6fd', light: '#7dd3fc', solid: '#0284c7' } },
        { id: 'QUALIFIED', label: t('leadDetails.statusQualified'), color: { bg: '#fef3c7', text: '#92400e', border: '#fde68a', light: '#fcd34d', solid: '#d97706' } },
        { id: 'PROPOSAL', label: t('leadDetails.statusProposal'), color: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', light: '#d8b4fe', solid: '#9333ea' } },
        { id: 'WON', label: t('leadDetails.statusWon'), color: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', light: '#86efac', solid: '#16a34a' } },
        { id: 'LOST', label: t('leadDetails.statusLost'), color: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', light: '#fca5a5', solid: '#dc2626' } }
    ], [t]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'emailLogs'>('info');

    // Convert states
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [convertMode, setConvertMode] = useState<'AUTO' | 'EXISTING'>('AUTO');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

    // Note State
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [activityLogs, setActivityLogs] = useState(lead.activityLogs || []);

    // Assignee Modal State
    const [isAssigneeModalOpen, setIsAssigneeModalOpen] = useState(false);
    const [editAssignees, setEditAssignees] = useState<string[]>(
        lead.assignees?.map((a: any) => a.userId) || (lead.assignedToId ? [lead.assignedToId] : [])
    );
    const [isSavingAssignees, setIsSavingAssignees] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string } | null>(null);

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
        <>
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
                                        <CheckCircle size={14} /> {t('leadDetails.hasCustomer')}
                                    </span>
                                )}
                            </div>
                            <div style={{ ...styles.subtitle, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span>{t('leadDetails.leadCode')}: <span style={{ fontWeight: '700' }}>{lead.code}</span></span>
                                <span>•</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {t('leadDetails.assignee')}:
                                    {lead.assignees && lead.assignees.length > 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {lead.assignees.map((a: any) => (
                                                <div key={a.userId} style={{ padding: '2px 8px', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }} title={a.user?.name}>
                                                    {a.user?.name}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span>{lead.assignedTo?.name || t('leadDetails.unassigned')}</span>
                                    )}
                                    <button onClick={() => setIsAssigneeModalOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', padding: '4px' }} title={t('leadDetails.editAssigneeTitle')}>
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
                                <RefreshCcw size={16} /> {t('leadDetails.convertToCustomer')}
                            </button>
                        )}
                        {lead.customerId && (
                            <Link href={`/customers/${lead.customerId}`} style={{ ...styles.btnSecondary, color: '#4f46e5', borderColor: '#c7d2fe', backgroundColor: '#e0e7ff' }}>
                                <User size={16} /> {t('leadDetails.viewCustomerProfile')}
                            </Link>
                        )}
                        <Link href={`/sales/estimates?action=new&leadId=${lead.id}&customerId=${lead.customerId || ''}`} style={{ ...styles.btnSecondary, color: '#0ea5e9', borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }} title={t('leadDetails.createEstimate')}>
                            <FileText size={16} /> {t('leadDetails.createEstimate')}
                        </Link>
                        <button
                            onClick={() => setIsEmailModalOpen(true)}
                            style={{ ...styles.btnSecondary, color: '#3b82f6', borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }}
                            title={t('leadDetails.sendEmail')}
                        >
                            <Mail size={16} /> {t('leadDetails.sendEmail')}
                        </button>
                        <Link href={`/sales/leads/${lead.id}/edit`} style={styles.btnSecondary}>
                            <Edit size={16} /> {t('leadDetails.edit')}
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
                <div className="flex flex-col lg:grid lg:grid-cols-[2fr_1fr] gap-6">
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
                                <Building2 size={16} /> {t('leadDetails.generalInfo')}
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
                                <Mail size={16} /> {t('leadDetails.emailHistory')}
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
                                        <Building2 size={20} color="#6366f1" /> {t('leadDetails.generalInfo')}
                                    </h2>

                                    <div style={styles.infoGrid}>
                                        <div style={styles.infoGroup}>
                                            <p style={styles.infoLabel}>{t('leadDetails.companyOrg')}</p>
                                            <p style={styles.infoValue}>
                                                {lead.customer?.name || lead.company || '—'}
                                            </p>
                                        </div>
                                        <div style={styles.infoGroup}>
                                            <p style={styles.infoLabel}>{t('leadDetails.contactPerson')}</p>
                                            <div style={styles.infoValue}>
                                                <User size={16} style={styles.infoIcon} />
                                                {lead.customer?.contactName || lead.contactName || '—'}
                                            </div>
                                        </div>
                                        <div style={styles.infoGroup}>
                                            <p style={styles.infoLabel}>{t('leadDetails.phoneNumber')}</p>
                                            <div style={styles.infoValue}>
                                                <Phone size={16} style={styles.infoIcon} />
                                                {lead.customer?.phone || lead.phone || '—'}
                                            </div>
                                        </div>
                                        <div style={styles.infoGroup}>
                                            <p style={styles.infoLabel}>{t('leadDetails.email')}</p>
                                            <div style={styles.infoValue}>
                                                <Mail size={16} style={styles.infoIcon} />
                                                {lead.customer?.email || lead.email || '—'}
                                            </div>
                                        </div>
                                        <div style={styles.infoGroup}>
                                            <p style={styles.infoLabel}>{t('leadDetails.expectedValue')}</p>
                                            <div style={styles.infoValue}>
                                                <DollarSign size={16} style={{ color: '#059669' }} />
                                                <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '18px' }}>{formatMoney(lead.estimatedValue)}</span>
                                            </div>
                                        </div>
                                        <div style={styles.infoGroup}>
                                            <p style={styles.infoLabel}>{t('leadDetails.expectedCloseDate')}</p>
                                            <div style={styles.infoValue}>
                                                <Calendar size={16} style={styles.infoIcon} />
                                                {lead.expectedCloseDate ? formatDate(lead.expectedCloseDate) : '—'}
                                            </div>
                                        </div>
                                        <div style={styles.infoGroup}>
                                            <p style={styles.infoLabel}>{t('leadDetails.leadSource')}</p>
                                            <div style={styles.infoValue}>
                                                <Tag size={16} style={styles.infoIcon} />
                                                {lead.source || '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {lead.notes && (
                                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                                            <p style={{ ...styles.infoLabel, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <FileText size={16} /> {t('leadDetails.internalNotes')}
                                            </p>
                                            <p style={{ fontSize: '14px', color: '#475569', whiteSpace: 'pre-wrap', backgroundColor: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fef3c7', margin: 0 }}>
                                                {lead.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <EmailLogTable emailLogs={lead.emailLogs || []} />
                            </div>
                        )}

                        {/* Comments Section */}
                        <LeadComments leadId={lead.id} initialComments={lead.comments} users={users} />

                    </div>

                    {/* Right Col: Tasks & Activity Log */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

                        {/* Tasks section */}
                        <div style={{ maxHeight: '430px' }}>
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
                                    <FileText size={18} style={{ color: '#0ea5e9' }} /> {t('leadDetails.relatedEstimates')}
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
                                                    {est.status === 'DRAFT' ? t('leadDetails.estimateDraft') : est.status === 'ACCEPTED' ? t('leadDetails.estimateAccepted') : est.status === 'SENT' ? t('leadDetails.estimateSent') : est.status === 'INVOICED' ? t('leadDetails.estimateInvoiced') : est.status === 'ORDERED' ? t('leadDetails.estimateOrdered') : est.status === 'REJECTED' ? t('leadDetails.estimateRejected') : est.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Lead Notes Component */}
                        <LeadNotes leadId={lead.id} notes={lead.leadNotes || []} currentUserId={currentUserId} currentUserRole={currentUserRole} />



                        <div style={{ ...styles.sectionCard, height: '100%', maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                            <h2 style={styles.sectionTitle}>{t('leadDetails.activityHistory')}</h2>
                            <div style={{ flex: 1, overflowY: 'auto' as const, paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {(() => {
                                    const sysLogs = activityLogs.filter((log: any) => !['NOTE_ADDED', 'FILE_UPLOADED', 'NOTE_AND_FILE_ADDED'].includes(log.action));

                                    if (sysLogs.length === 0) {
                                        return <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>{t('leadDetails.noSystemActivity')}</p>;
                                    }

                                    return sysLogs.map((log: any) => {
                                        let actionText = log.action;

                                        return (
                                            <div key={log.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                                                <div style={{ width: '32px', height: '32px', flexShrink: 0, backgroundColor: '#e0e7ff', color: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', zIndex: 10 }}>
                                                    {log.user?.name ? log.user.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div style={{ flex: 1, paddingBottom: '16px', minWidth: 0 }}>
                                                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>{actionText}</p>
                                                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>{formatDateTime(log.createdAt)} • {t('leadDetails.byUser')} {log.user?.name}</p>

                                                    {log.details && (
                                                        <div style={{ fontSize: '14px', color: '#334155', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                                                            {log.details}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                    </div>


                </div>
            </div >

            {/* Convert Modal */}
            < Modal isOpen={isConvertModalOpen} onClose={() => { setIsConvertModalOpen(false); setDuplicateWarning(null); }
            } title={t('leadDetails.convertModalTitle')} >
                <div className="space-y-4">
                    {duplicateWarning ? (
                        <div className="bg-amber-50 p-4 border border-amber-200 rounded-lg">
                            <h3 className="text-amber-800 font-semibold mb-2">{t('leadDetails.duplicateAlert')}</h3>
                            <p className="text-sm text-amber-700 mb-4">{duplicateWarning.message}</p>

                            <div className="bg-white p-3 rounded border border-amber-100 mb-4 text-sm">
                                <strong>Khách hàng:</strong> {duplicateWarning.customer.name}<br />
                                <strong>SĐT:</strong> {duplicateWarning.customer.phone || '—'} | <strong>Email:</strong> {duplicateWarning.customer.email || '—'}
                            </div>

                            <p className="text-sm text-gray-600 mb-3">{t('leadDetails.whatNext')}</p>

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => {
                                        setConvertMode('EXISTING');
                                        setSelectedCustomerId(duplicateWarning.customer.id);
                                        setDuplicateWarning(null);
                                    }}
                                    className="btn-primary w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded px-4 py-2 text-sm text-center"
                                >
                                    {t('leadDetails.linkToExisting')}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsConvertModalOpen(false);
                                        setDuplicateWarning(null);
                                    }}
                                    className="btn-secondary w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded px-4 py-2 text-sm text-center"
                                >
                                    {t('leadDetails.cancel')}
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
                                    {t('leadDetails.createEmptyCustomer')}
                                </button>
                                <button
                                    onClick={() => setConvertMode('EXISTING')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${convertMode === 'EXISTING' ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    {t('leadDetails.chooseExistingCustomer')}
                                </button>
                            </div>

                            {convertMode === 'AUTO' ? (
                                <p className="text-sm text-gray-600">
                                    {t('leadDetails.autoCreateWarning')}
                                </p>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('leadDetails.selectLinkCustomer')}
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
                                    {t('leadDetails.cancel')}
                                </button>
                                <button
                                    onClick={handleConvert}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                    disabled={loading || (convertMode === 'EXISTING' && !selectedCustomerId)}
                                >
                                    {loading && <RefreshCcw size={14} className="animate-spin" />}
                                    {convertMode === 'AUTO' ? t('leadDetails.confirmCreate') : t('leadDetails.confirmLink')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal >

            {/* Delete Confirmation Modal */}
            < Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={t('leadDetails.deleteModalTitle')} >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        {t('leadDetails.deleteWarning')}
                    </p>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                            disabled={loading}
                        >
                            {t('leadDetails.cancel')}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading && <RefreshCcw size={14} className="animate-spin" />}
                            {t('leadDetails.confirmDelete')}
                        </button>
                    </div>
                </div>
            </Modal >

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
            <Modal isOpen={isAssigneeModalOpen} onClose={() => setIsAssigneeModalOpen(false)} title={t('leadDetails.editAssigneeTitle')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>{t('leadDetails.assigneeLabel')}</label>
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
                        <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>{t('leadDetails.selectMultipleHint')}</small>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button onClick={() => setIsAssigneeModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
                            {t('leadDetails.cancel')}
                        </button>
                        <button onClick={handleSaveAssignees} disabled={isSavingAssignees} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: 'white', cursor: isSavingAssignees ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                            {isSavingAssignees ? t('leadDetails.saving') : t('leadDetails.saveChanges')}
                        </button>
                    </div>
                </div>
            </Modal>

            {
                previewDoc && (
                    <DocumentPreviewModal
                        isOpen={!!previewDoc}
                        onClose={() => setPreviewDoc(null)}
                        fileUrl={previewDoc.url}
                        fileName={previewDoc.name}
                    />
                )
            }
        </>
    );
}
