'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, Edit, Trash2, CheckCircle2, RefreshCcw, Building2, User, 
    Phone, Mail, DollarSign, Calendar, Tag, FileText, CheckSquare, Plus, 
    Paperclip, Send, Link as LinkIcon, ImageIcon, ExternalLink, Target,
    Clock, ShieldAlert, Sparkles, MessageSquare, ChevronRight, Check
} from 'lucide-react';
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
import { ClickToCallButton } from '@/app/components/ClickToCallButton';

function getInitials(name: string) {
    if (!name) return 'U';
    const clean = name.trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function LeadDetailClient({ 
    lead, 
    customers, 
    users, 
    emailTemplates = [], 
    currentUserId, 
    currentUserRole 
}: { 
    lead: any, 
    customers: any[], 
    users: any[], 
    emailTemplates?: any[], 
    currentUserId: string, 
    currentUserRole: string 
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const STATUSES = React.useMemo(() => [
        { id: 'NEW', label: t('leadDetails.statusNew'), badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', nodeColor: 'bg-blue-600 text-white', activeBg: 'border-blue-500 text-blue-700 bg-blue-50/50' },
        { id: 'CONTACTED', label: t('leadDetails.statusContacted'), badgeClass: 'bg-sky-50 text-sky-700 border-sky-200', nodeColor: 'bg-sky-600 text-white', activeBg: 'border-sky-500 text-sky-700 bg-sky-50/50' },
        { id: 'QUALIFIED', label: t('leadDetails.statusQualified'), badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', nodeColor: 'bg-amber-500 text-white', activeBg: 'border-amber-500 text-amber-700 bg-amber-50/50' },
        { id: 'PROPOSAL', label: t('leadDetails.statusProposal'), badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', nodeColor: 'bg-purple-600 text-white', activeBg: 'border-purple-500 text-purple-700 bg-purple-50/50' },
        { id: 'WON', label: t('leadDetails.statusWon'), badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', nodeColor: 'bg-emerald-600 text-white', activeBg: 'border-emerald-500 text-emerald-700 bg-emerald-50/50' },
        { id: 'LOST', label: t('leadDetails.statusLost'), badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', nodeColor: 'bg-rose-600 text-white', activeBg: 'border-rose-500 text-rose-700 bg-rose-50/50' }
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
        <div className="w-full max-w-full space-y-5 p-4 md:p-6 lg:p-8">
            {/* Lightbox Modal */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center cursor-pointer p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lightboxImage} alt="Phóng to" className="max-w-[90%] max-h-[90%] object-contain rounded-xl shadow-2xl" />
                </div>
            )}

            {/* Top Navigation & Action Header */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 md:p-5 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                    <Link
                        href="/sales/leads"
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
                        title="Quay lại danh sách"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                                {lead.code}
                            </span>
                            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 line-clamp-1">
                                {lead.name}
                            </h1>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${currentStatus.badgeClass}`}>
                                {currentStatus.label}
                            </span>
                            {lead.customerId && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                    <CheckCircle2 size={12} className="text-emerald-600" /> {t('leadDetails.hasCustomer')}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                            <span>Ngày tạo: <strong className="text-slate-700">{formatDate(lead.createdAt || new Date())}</strong></span>
                            <span>•</span>
                            <div className="flex items-center gap-1.5">
                                <span>Người phụ trách:</span>
                                {lead.assignees && lead.assignees.length > 0 ? (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {lead.assignees.map((a: any) => (
                                            <span key={a.userId} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium shadow-2xs">
                                                <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white text-[8px] font-bold inline-flex items-center justify-center">
                                                    {getInitials(a.user?.name || a.user?.email)}
                                                </span>
                                                {a.user?.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-slate-700 font-semibold">{lead.assignedTo?.name || t('leadDetails.unassigned')}</span>
                                )}
                                <button
                                    onClick={() => setIsAssigneeModalOpen(true)}
                                    className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded cursor-pointer"
                                    title={t('leadDetails.editAssigneeTitle')}
                                >
                                    <Edit size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {!lead.customerId ? (
                        <button
                            onClick={() => setIsConvertModalOpen(true)}
                            className="inline-flex items-center justify-center gap-1.5 h-[34px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 active:scale-98 cursor-pointer"
                        >
                            <RefreshCcw size={14} className="stroke-[2.2]" />
                            <span>{t('leadDetails.convertToCustomer')}</span>
                        </button>
                    ) : (
                        <Link
                            href={`/customers/${lead.customerId}`}
                            className="inline-flex items-center justify-center gap-1.5 h-[34px] px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                            <User size={14} />
                            <span>{t('leadDetails.viewCustomerProfile')}</span>
                        </Link>
                    )}

                    <Link
                        href={`/sales/estimates?action=new&leadId=${lead.id}&customerId=${lead.customerId || ''}`}
                        className="inline-flex items-center justify-center gap-1.5 h-[34px] px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        title={t('leadDetails.createEstimate')}
                    >
                        <FileText size={14} />
                        <span>{t('leadDetails.createEstimate')}</span>
                    </Link>

                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 h-[34px] px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        title={t('leadDetails.sendEmail')}
                    >
                        <Mail size={14} />
                        <span>{t('leadDetails.sendEmail')}</span>
                    </button>

                    <Link
                        href={`/sales/leads/${lead.id}/edit`}
                        className="inline-flex items-center justify-center gap-1.5 h-[34px] px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                        <Edit size={14} />
                        <span>{t('leadDetails.edit')}</span>
                    </Link>

                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="inline-flex items-center justify-center h-[34px] w-[34px] bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                        title={t('leadDetails.deleteModalTitle')}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Interactive Deal Pipeline Stepper */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 relative overflow-hidden">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
                    <span>Quy Trình Xử Lý Cơ Hội (Sales Pipeline)</span>
                    <span className="text-[11px] text-slate-400 font-normal">Nhấn vào từng bước để cập nhật trạng thái nhanh</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 relative z-10">
                    {STATUSES.map((s, idx) => {
                        const isCurrent = s.id === lead.status;
                        const isPast = STATUSES.findIndex(x => x.id === lead.status) > idx;

                        return (
                            <button
                                key={s.id}
                                disabled={loading}
                                onClick={() => handleStatusChange(s.id)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer relative ${
                                    isCurrent
                                        ? `${s.activeBg} ring-2 ring-emerald-500/30 shadow-xs font-extrabold`
                                        : isPast
                                            ? 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100'
                                            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-1.5 font-mono text-xs font-bold shadow-2xs transition-transform ${
                                    isCurrent
                                        ? `${s.nodeColor} scale-110 shadow-md`
                                        : isPast
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                                }`}>
                                    {isPast || s.id === 'WON' ? (
                                        <Check size={14} className="stroke-[3]" />
                                    ) : (
                                        idx + 1
                                    )}
                                </div>
                                <span className="text-xs truncate w-full font-bold">
                                    {s.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main 12-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left 8-Columns: Detailed Info, Quotes, Comments */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Navigation Tabs */}
                    <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-2xs">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                activeTab === 'info'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Building2 size={15} />
                            <span>{t('leadDetails.generalInfo')}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('emailLogs')}
                            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                activeTab === 'emailLogs'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Mail size={15} />
                            <span>{t('leadDetails.emailHistory')}</span>
                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                {lead.emailLogs?.length || 0}
                            </span>
                        </button>
                    </div>

                    {activeTab === 'info' ? (
                        <>
                            {/* General Information Card */}
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-5">
                                <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100">
                                    <Building2 size={18} className="text-emerald-600" />
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                        {t('leadDetails.generalInfo')}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                    {/* Company / Customer */}
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                            {t('leadDetails.companyOrg')}
                                        </span>
                                        <div className="text-xs font-semibold text-slate-900">
                                            {lead.customer?.name || lead.company || '—'}
                                        </div>
                                    </div>

                                    {/* Contact Person */}
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                            {t('leadDetails.contactPerson')}
                                        </span>
                                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                                            <User size={13} className="text-slate-400" />
                                            <span>{lead.customer?.contactName || lead.contactName || '—'}</span>
                                        </div>
                                    </div>

                                    {/* Phone Number */}
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                            {t('leadDetails.phoneNumber')}
                                        </span>
                                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                                            <Phone size={13} className="text-slate-400" />
                                            <span>{lead.customer?.phone || lead.phone || '—'}</span>
                                            {(lead.customer?.phone || lead.phone) && (
                                                <ClickToCallButton phoneNumber={lead.customer?.phone || lead.phone} className="ml-1 scale-90 origin-left" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                            {t('leadDetails.email')}
                                        </span>
                                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                                            <Mail size={13} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{lead.customer?.email || lead.email || '—'}</span>
                                        </div>
                                    </div>

                                    {/* Expected Close Date */}
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                            {t('leadDetails.expectedCloseDate')}
                                        </span>
                                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                                            <Calendar size={13} className="text-slate-400" />
                                            <span>{lead.expectedCloseDate ? formatDate(lead.expectedCloseDate) : '—'}</span>
                                        </div>
                                    </div>

                                    {/* Lead Source */}
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                            {t('leadDetails.leadSource')}
                                        </span>
                                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                                            <Tag size={13} className="text-slate-400" />
                                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                                                {lead.source || '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Internal Notes */}
                                {lead.notes && (
                                    <div className="pt-4 border-t border-slate-100 space-y-1.5">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                            <FileText size={13} /> {t('leadDetails.internalNotes')}
                                        </span>
                                        <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {lead.notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Related Estimates Card */}
                            {lead.salesEstimates && lead.salesEstimates.length > 0 && (
                                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <FileText size={18} className="text-sky-600" />
                                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                                {t('leadDetails.relatedEstimates')} ({lead.salesEstimates.length})
                                            </h2>
                                        </div>
                                        <Link
                                            href={`/sales/estimates?action=new&leadId=${lead.id}&customerId=${lead.customerId || ''}`}
                                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                        >
                                            <Plus size={13} /> Tạo thêm báo giá
                                        </Link>
                                    </div>

                                    <div className="space-y-2">
                                        {lead.salesEstimates.map((est: any) => (
                                            <div
                                                key={est.id}
                                                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Link
                                                        href={`/sales/estimates/${est.id}`}
                                                        className="font-mono text-xs font-bold text-sky-700 hover:underline"
                                                    >
                                                        {est.code}
                                                    </Link>
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        {formatDate(new Date(est.date))}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-bold text-xs text-slate-900">
                                                        {formatMoney(est.totalAmount)}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                        est.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        est.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                        est.status === 'SENT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                        {est.status === 'DRAFT' ? t('leadDetails.estimateDraft') : est.status === 'ACCEPTED' ? t('leadDetails.estimateAccepted') : est.status === 'SENT' ? t('leadDetails.estimateSent') : est.status === 'INVOICED' ? t('leadDetails.estimateInvoiced') : est.status === 'ORDERED' ? t('leadDetails.estimateOrdered') : est.status === 'REJECTED' ? t('leadDetails.estimateRejected') : est.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Lead Comments */}
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
                                <LeadComments leadId={lead.id} initialComments={lead.comments} users={users} />
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 overflow-x-auto">
                            <EmailLogTable emailLogs={lead.emailLogs || []} />
                        </div>
                    )}
                </div>

                {/* Right 4-Columns: Key Metrics, Tasks, Activity Log */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Big Value Metric Card */}
                    <div 
                        className="rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden border border-emerald-900"
                        style={{
                            background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)',
                            color: '#ffffff'
                        }}
                    >
                        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider" style={{ color: '#a7f3d0' }}>
                            <span>{t('leadDetails.expectedValue')}</span>
                            <Sparkles size={16} style={{ color: '#6ee7b7' }} />
                        </div>
                        <div className="font-mono text-2xl sm:text-3xl font-black tracking-tight" style={{ color: '#ffffff' }}>
                            {formatMoney(lead.estimatedValue || 0)}
                        </div>
                        <div className="pt-2.5 flex items-center justify-between text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', color: '#d1fae5' }}>
                            <span style={{ color: '#a7f3d0' }}>Xác suất thành công:</span>
                            <span className="font-bold font-mono text-sm" style={{ color: '#ffffff' }}>
                                {lead.status === 'WON' ? '100%' : lead.status === 'PROPOSAL' ? '75%' : lead.status === 'QUALIFIED' ? '50%' : lead.status === 'CONTACTED' ? '25%' : lead.status === 'LOST' ? '0%' : '10%'}
                            </span>
                        </div>
                    </div>

                    {/* Tasks Panel */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                        <TaskPanel
                            initialTasks={lead.tasks || []}
                            users={users || []}
                            entityType="LEAD"
                            entityId={lead.id}
                            initialTitle={`Nhiệm vụ: Cơ hội ${lead.name}`}
                        />
                    </div>

                    {/* Lead Notes */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
                        <LeadNotes leadId={lead.id} notes={lead.leadNotes || []} currentUserId={currentUserId} currentUserRole={currentUserRole} />
                    </div>

                    {/* Activity History */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-slate-500" />
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                    {t('leadDetails.activityHistory')}
                                </h3>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                            {(() => {
                                const sysLogs = activityLogs.filter((log: any) => !['NOTE_ADDED', 'FILE_UPLOADED', 'NOTE_AND_FILE_ADDED'].includes(log.action));

                                if (sysLogs.length === 0) {
                                    return <p className="text-xs text-slate-400 italic py-4 text-center">{t('leadDetails.noSystemActivity')}</p>;
                                }

                                return sysLogs.map((log: any) => (
                                    <div key={log.id} className="flex items-start gap-3 relative pb-2 last:pb-0">
                                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs border border-emerald-200">
                                            {log.user?.name ? getInitials(log.user.name) : '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-slate-900">{log.action}</div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                {formatDateTime(log.createdAt)} • {log.user?.name}
                                            </div>
                                            {log.details && (
                                                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/70 mt-1.5 leading-relaxed whitespace-pre-wrap">
                                                    {log.details}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Convert Modal */}
            <Modal isOpen={isConvertModalOpen} onClose={() => { setIsConvertModalOpen(false); setDuplicateWarning(null); }} title={t('leadDetails.convertModalTitle')}>
                <div className="space-y-4 p-1">
                    {duplicateWarning ? (
                        <div className="bg-amber-50 p-4 border border-amber-200 rounded-xl space-y-3">
                            <h3 className="text-amber-900 font-bold text-xs uppercase tracking-wider">{t('leadDetails.duplicateAlert')}</h3>
                            <p className="text-xs text-amber-800">{duplicateWarning.message}</p>

                            <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs space-y-1">
                                <div><strong>Khách hàng:</strong> {duplicateWarning.customer.name}</div>
                                <div><strong>SĐT:</strong> {duplicateWarning.customer.phone || '—'} | <strong>Email:</strong> {duplicateWarning.customer.email || '—'}</div>
                            </div>

                            <p className="text-xs text-slate-600">{t('leadDetails.whatNext')}</p>

                            <div className="flex gap-2.5 pt-2">
                                <button
                                    onClick={() => {
                                        setConvertMode('EXISTING');
                                        setSelectedCustomerId(duplicateWarning.customer.id);
                                        setDuplicateWarning(null);
                                    }}
                                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                >
                                    {t('leadDetails.linkToExisting')}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsConvertModalOpen(false);
                                        setDuplicateWarning(null);
                                    }}
                                    className="flex-1 py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    {t('leadDetails.cancel')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                <button
                                    onClick={() => setConvertMode('AUTO')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        convertMode === 'AUTO' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {t('leadDetails.createEmptyCustomer')}
                                </button>
                                <button
                                    onClick={() => setConvertMode('EXISTING')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        convertMode === 'EXISTING' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {t('leadDetails.chooseExistingCustomer')}
                                </button>
                            </div>

                            {convertMode === 'AUTO' ? (
                                <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                                    {t('leadDetails.autoCreateWarning')}
                                </p>
                            ) : (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-700">
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

                            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setIsConvertModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                                    disabled={loading}
                                >
                                    {t('leadDetails.cancel')}
                                </button>
                                <button
                                    onClick={handleConvert}
                                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                                    disabled={loading || (convertMode === 'EXISTING' && !selectedCustomerId)}
                                >
                                    {loading && <RefreshCcw size={13} className="animate-spin" />}
                                    {convertMode === 'AUTO' ? t('leadDetails.confirmCreate') : t('leadDetails.confirmLink')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={t('leadDetails.deleteModalTitle')}>
                <div className="space-y-4 p-1">
                    <p className="text-xs text-slate-600 leading-relaxed">
                        {t('leadDetails.deleteWarning')}
                    </p>
                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                            disabled={loading}
                        >
                            {t('leadDetails.cancel')}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                            disabled={loading}
                        >
                            {loading && <RefreshCcw size={13} className="animate-spin" />}
                            {t('leadDetails.confirmDelete')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Email Modal */}
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
                <div className="space-y-4 p-1">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">{t('leadDetails.assigneeLabel')}</label>
                        <select
                            multiple
                            value={editAssignees}
                            onChange={e => {
                                const options = Array.from(e.target.selectedOptions);
                                setEditAssignees(options.map(o => o.value));
                            }}
                            className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 min-h-[140px] focus:outline-none focus:border-emerald-500 shadow-2xs"
                        >
                            {users.map(u => (
                                <option key={u.id} value={u.id} className="py-1 px-1.5 rounded">{u.name || u.email}</option>
                            ))}
                        </select>
                        <small className="text-slate-400 text-[11px] block">{t('leadDetails.selectMultipleHint')}</small>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setIsAssigneeModalOpen(false)}
                            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
                        >
                            {t('leadDetails.cancel')}
                        </button>
                        <button
                            onClick={handleSaveAssignees}
                            disabled={isSavingAssignees}
                            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                            {isSavingAssignees ? t('leadDetails.saving') : t('leadDetails.saveChanges')}
                        </button>
                    </div>
                </div>
            </Modal>

            {previewDoc && (
                <DocumentPreviewModal
                    isOpen={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    fileUrl={previewDoc.url}
                    fileName={previewDoc.name}
                />
            )}
        </div>
    );
}
