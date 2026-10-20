'use client'

import React, { useState, useRef, useTransition } from 'react';
import { 
    Expense, 
    ExpenseCategory, 
    Customer, 
    Supplier, 
    User, 
    ExpenseNote, 
    Task 
} from '@prisma/client';
import { 
    ArrowLeft, 
    User as UserIcon, 
    Calendar, 
    CheckCircle2, 
    DollarSign, 
    Tag, 
    FileText, 
    Plus, 
    MapPin, 
    Phone, 
    Building2, 
    CreditCard, 
    Clock, 
    Download, 
    Printer, 
    Copy, 
    Check, 
    Edit3, 
    Trash2, 
    Ban, 
    RotateCcw, 
    Paperclip, 
    Upload, 
    Eye, 
    AlertCircle, 
    FileSpreadsheet, 
    FileImage, 
    FileArchive, 
    ExternalLink, 
    ShieldCheck, 
    Sparkles, 
    X,
    File as FileGeneric,
    Landmark,
    Briefcase,
    Mail,
    Send,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatMoney, formatDate, formatDateTime, autoLinkText, numberToVietnameseWords } from '@/lib/utils/formatters';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { 
    addExpenseNote, 
    updateExpense, 
    deleteExpense, 
    uploadExpenseAttachment, 
    removeExpenseAttachment, 
    cancelExpense, 
    restoreExpense 
} from '../actions';
import { useRouter } from 'next/navigation';
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal';

type ExpenseNoteWithUser = ExpenseNote & { user: { name: string | null; avatar?: string | null } };

type ExpenseWithRelations = Expense & {
    category: ExpenseCategory;
    customer: (Pick<Customer, 'id' | 'name' | 'phone'> & { email?: string | null; address?: string | null }) | null;
    supplier: (Pick<Supplier, 'id' | 'name' | 'phone'> & { email?: string | null; address?: string | null }) | null;
    creator: Pick<User, 'id' | 'name' | 'email'> & { avatar?: string | null };
    notes: ExpenseNoteWithUser[];
    tasks?: Task[];
    project?: { id: string; name: string; code?: string | null } | null;
    marketingCampaign?: { id: string; name: string } | null;
    activityLogs?: any[];
    linkedCashTransaction?: any | null;
};

interface ExpenseDetailClientProps {
    initialData: ExpenseWithRelations;
    relatedOptions?: {
        categories: ExpenseCategory[];
        customers: { id: string; name: string; phone: string | null }[];
        suppliers: { id: string; name: string; phone: string | null }[];
        projects: { id: string; name: string; code: string | null }[];
    };
}

export function ExpenseDetailClient({ initialData, relatedOptions }: ExpenseDetailClientProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [isPending, startTransition] = useTransition();

    const [expense, setExpense] = useState<ExpenseWithRelations>(initialData);
    const [copiedCode, setCopiedCode] = useState(false);

    // Document Preview Modal State
    const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);

    // Notes State
    const [notes, setNotes] = useState<ExpenseNoteWithUser[]>(initialData.notes || []);
    const [noteContent, setNoteContent] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    // File Upload State
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        amount: initialData.amount,
        date: initialData.date ? new Date(initialData.date).toISOString().substring(0, 10) : '',
        categoryId: initialData.categoryId,
        paymentMethod: initialData.paymentMethod || 'BANK_TRANSFER',
        payee: initialData.payee || '',
        description: initialData.description || '',
        reference: initialData.reference || '',
        status: initialData.status || 'COMPLETED',
        customerId: initialData.customerId || '',
        supplierId: initialData.supplierId || '',
        projectId: initialData.projectId || ''
    });
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Print Modal State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // Action Confirmation Modal State
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'primary';
        action: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'danger',
        action: async () => {}
    });
    const [isActionLoading, setIsActionLoading] = useState(false);

    interface DocItem {
        url: string;
        name: string;
        uploadedAt?: string;
    }

    // Parse Attachments (JSON array or single string)
    const documents: DocItem[] = React.useMemo(() => {
        if (!expense.attachment || typeof expense.attachment !== 'string') return [];
        const trimmed = expense.attachment.trim();
        if (!trimmed) return [];
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map((item: any) => {
                    if (typeof item === 'string') return { url: item, name: item.split('/').pop() || 'Tài liệu' };
                    if (item && item.url) return { url: item.url, name: item.name || item.url.split('/').pop() || 'Tài liệu', uploadedAt: item.uploadedAt };
                    return null;
                }).filter(Boolean) as DocItem[];
            }
            if (parsed && parsed.url) {
                return [{ url: parsed.url, name: parsed.name || parsed.url.split('/').pop() || 'Tài liệu', uploadedAt: parsed.uploadedAt }] as DocItem[];
            }
        } catch (_) {}
        return [{ url: trimmed, name: trimmed.split('/').pop() || 'Tài liệu', uploadedAt: undefined }] as DocItem[];
    }, [expense.attachment]);

    // Handle Code Copy
    const handleCopyCode = () => {
        navigator.clipboard.writeText(expense.code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    // Handle Add Note
    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim()) return;

        setIsSubmittingNote(true);
        const res = await addExpenseNote(expense.id, noteContent);
        if (res.success && res.data) {
            const newNote: ExpenseNoteWithUser = {
                ...res.data,
                user: { 
                    name: session?.user?.name || 'Tôi',
                    avatar: (session?.user as any)?.image || (session?.user as any)?.avatar || null
                }
            };
            setNotes([newNote, ...notes]);
            setNoteContent('');
        } else {
            alert(res.error || 'Có lỗi khi thêm ghi chú');
        }
        setIsSubmittingNote(false);
    };

    // Handle Direct File Upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                throw new Error(errData.error || 'Lỗi khi tải tệp lên');
            }

            const data = await uploadRes.json();
            if (data.url) {
                const updated = await uploadExpenseAttachment(expense.id, data.url, file.name);
                setExpense(prev => ({
                    ...prev,
                    attachment: updated.attachment
                }));
            }
        } catch (err: any) {
            alert(err.message || 'Lỗi khi tải tệp lên');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Handle Remove File
    const handleRemoveFile = (fileUrl: string, fileName: string) => {
        setActionModal({
            isOpen: true,
            title: 'Xóa tệp chứng từ đính kèm',
            message: `Bạn có chắc chắn muốn xóa tệp "${fileName}" khỏi phiếu chi này?`,
            type: 'danger',
            action: async () => {
                setIsActionLoading(true);
                try {
                    const updated = await removeExpenseAttachment(expense.id, fileUrl);
                    setExpense(prev => ({
                        ...prev,
                        attachment: updated.attachment
                    }));
                    setActionModal(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    alert(err.message || 'Lỗi khi xóa tệp');
                } finally {
                    setIsActionLoading(false);
                }
            }
        });
    };

    // Handle Save Edit Form
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingEdit(true);
        try {
            const updated = await updateExpense(expense.id, {
                amount: Number(editForm.amount),
                date: editForm.date ? new Date(editForm.date) : new Date(),
                categoryId: editForm.categoryId,
                paymentMethod: editForm.paymentMethod,
                payee: editForm.payee || undefined,
                description: editForm.description,
                reference: editForm.reference || undefined,
                status: editForm.status,
                customerId: editForm.customerId || null,
                supplierId: editForm.supplierId || null,
                projectId: editForm.projectId || null
            });

            // Update local state smoothly
            const matchingCat = relatedOptions?.categories.find(c => c.id === editForm.categoryId);
            const matchingCust = relatedOptions?.customers.find(c => c.id === editForm.customerId);
            const matchingSupp = relatedOptions?.suppliers.find(s => s.id === editForm.supplierId);
            const matchingProj = relatedOptions?.projects.find(p => p.id === editForm.projectId);

            setExpense(prev => ({
                ...prev,
                ...updated,
                category: matchingCat || prev.category,
                customer: matchingCust ? { ...prev.customer, ...matchingCust } : (editForm.customerId ? prev.customer : null),
                supplier: matchingSupp ? { ...prev.supplier, ...matchingSupp } : (editForm.supplierId ? prev.supplier : null),
                project: matchingProj ? { id: matchingProj.id, name: matchingProj.name, code: matchingProj.code } : null
            }));

            setIsEditModalOpen(false);
            router.refresh();
        } catch (err: any) {
            alert(err.message || 'Lỗi khi cập nhật phiếu chi');
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Handle Cancel Expense
    const handleCancelExpense = () => {
        setActionModal({
            isOpen: true,
            title: 'Hủy Phiếu Chi',
            message: `Bạn có chắc chắn muốn HỦY Phiếu chi ${expense.code}? Trạng thái sẽ chuyển sang ĐÃ HỦY.`,
            type: 'warning',
            action: async () => {
                setIsActionLoading(true);
                try {
                    const res = await cancelExpense(expense.id);
                    setExpense(prev => ({ ...prev, status: res.status }));
                    setActionModal(prev => ({ ...prev, isOpen: false }));
                    router.refresh();
                } catch (e: any) {
                    alert(e.message || 'Lỗi khi hủy phiếu chi');
                } finally {
                    setIsActionLoading(false);
                }
            }
        });
    };

    // Handle Restore Expense
    const handleRestoreExpense = () => {
        setActionModal({
            isOpen: true,
            title: 'Khôi Phục Phiếu Chi',
            message: `Bạn có chắc chắn muốn KHÔI PHỤC Phiếu chi ${expense.code} về trạng thái Hoàn thành?`,
            type: 'primary',
            action: async () => {
                setIsActionLoading(true);
                try {
                    const res = await restoreExpense(expense.id);
                    setExpense(prev => ({ ...prev, status: res.status }));
                    setActionModal(prev => ({ ...prev, isOpen: false }));
                    router.refresh();
                } catch (e: any) {
                    alert(e.message || 'Lỗi khi khôi phục phiếu chi');
                } finally {
                    setIsActionLoading(false);
                }
            }
        });
    };

    // Handle Delete Expense
    const handleDeleteExpense = () => {
        setActionModal({
            isOpen: true,
            title: 'Xóa Vĩnh Viễn Phiếu Chi',
            message: `CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN Phiếu chi ${expense.code}? Số tiền ${formatMoney(expense.amount)} và toàn bộ dữ liệu kèm theo sẽ bị xóa hoàn toàn khỏi hệ thống.`,
            type: 'danger',
            action: async () => {
                setIsActionLoading(true);
                try {
                    await deleteExpense(expense.id);
                    setActionModal(prev => ({ ...prev, isOpen: false }));
                    router.push('/sales/expenses');
                } catch (e: any) {
                    alert(e.message || 'Lỗi khi xóa phiếu chi');
                } finally {
                    setIsActionLoading(false);
                }
            }
        });
    };

    // File icon helper
    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-600 shrink-0" />;
        if (['xlsx', 'xls', 'csv'].includes(ext)) return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
        if (['doc', 'docx'].includes(ext)) return <FileText className="w-5 h-5 text-blue-600 shrink-0" />;
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return <FileImage className="w-5 h-5 text-purple-600 shrink-0" />;
        if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive className="w-5 h-5 text-amber-600 shrink-0" />;
        return <FileGeneric className="w-5 h-5 text-slate-500 shrink-0" />;
    };

    const isCancelled = expense.status === 'CANCELLED';
    const isPendingStatus = expense.status === 'PENDING';

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'BANK_TRANSFER': return 'Chuyển khoản ngân hàng';
            case 'CREDIT_CARD': return 'Thẻ tín dụng doanh nghiệp';
            case 'CASH': return 'Tiền mặt tại quỹ';
            default: return method || 'Tiền mặt';
        }
    };

    return (
        <div className="w-full flex flex-col gap-6 font-sans">
            {/* 1. Header & Actions Toolbar */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-start gap-3.5">
                    <button
                        type="button"
                        onClick={() => router.push('/sales/expenses')}
                        className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer mt-0.5"
                        title="Quay lại danh sách chi phí"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2.5 mb-1">
                            <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight flex items-center gap-2">
                                <span>Phiếu Chi</span>
                                <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-lg">
                                    {expense.code}
                                </span>
                            </h1>

                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                                title="Sao chép mã phiếu chi"
                            >
                                {copiedCode ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                            </button>

                            <StatusBadge status={expense.status} showDot />
                        </div>
                        <p className="text-slate-500 m-0 text-xs">
                            Ngày lập phiếu: {formatDate(expense.date)} • Người phụ trách: <span className="font-medium text-slate-700">{expense.creator?.name || 'Hệ thống'}</span>
                        </p>
                    </div>
                </div>

                {/* Cohesive Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                        type="button"
                        onClick={() => setIsPrintModalOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer h-9"
                    >
                        <Printer size={15} className="text-slate-500" />
                        <span>In Phiếu Chi A4</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setEditForm({
                                amount: expense.amount,
                                date: expense.date ? new Date(expense.date).toISOString().substring(0, 10) : '',
                                categoryId: expense.categoryId,
                                paymentMethod: expense.paymentMethod || 'BANK_TRANSFER',
                                payee: expense.payee || '',
                                description: expense.description || '',
                                reference: expense.reference || '',
                                status: expense.status || 'COMPLETED',
                                customerId: expense.customerId || '',
                                supplierId: expense.supplierId || '',
                                projectId: expense.projectId || ''
                            });
                            setIsEditModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer h-9"
                    >
                        <Edit3 size={15} className="text-slate-500" />
                        <span>Chỉnh Sửa</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer h-9 disabled:opacity-50"
                    >
                        <Paperclip size={15} className="text-slate-500" />
                        <span>{isUploading ? 'Đang tải...' : 'Đính Kèm Tệp'}</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {isCancelled ? (
                        <button
                            type="button"
                            onClick={handleRestoreExpense}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer h-9"
                        >
                            <RotateCcw size={15} />
                            <span>Khôi Phục</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleCancelExpense}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 transition-colors shadow-xs cursor-pointer h-9"
                        >
                            <Ban size={15} />
                            <span>Hủy Phiếu</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleDeleteExpense}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors shadow-xs cursor-pointer h-9"
                    >
                        <Trash2 size={15} />
                        <span>Xóa</span>
                    </button>
                </div>
            </div>

            {/* 2. Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Left 2 Columns: Financial Hero, Recipient Details, Attachments */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* HERO FINANCIAL CARD - Clean, High Contrast Enterprise Card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col gap-5">
                        {/* Top Meta Row */}
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 text-xs font-bold uppercase tracking-wider">
                                    <DollarSign size={13} />
                                    Tổng Số Tiền Chi
                                </span>
                                {isCancelled && (
                                    <span className="text-xs text-rose-600 font-semibold italic">
                                        (Đã hủy - Không ghi nhận vào chi phí)
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <Calendar size={14} className="text-slate-400" />
                                <span>Ngày hạch toán chi:</span>
                                <strong className="text-slate-800">{formatDate(new Date(expense.date))}</strong>
                            </div>
                        </div>

                        {/* Amount & Words Section */}
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-baseline gap-3">
                                <div className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${isCancelled ? 'text-slate-400 line-through' : 'text-rose-600'}`}>
                                    - {formatMoney(expense.amount)}
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3.5 py-2 text-xs text-slate-700 leading-relaxed font-medium">
                                <span className="text-slate-500 font-semibold mr-1.5">Bằng chữ:</span>
                                <span className="italic text-slate-800 font-semibold">{numberToVietnameseWords(expense.amount)}</span>
                            </div>
                        </div>

                        {/* 4 Financial Info Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col gap-1">
                                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                                    <Tag size={12} className="text-slate-400" /> Danh mục chi
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={expense.category?.name}>
                                    {expense.category?.name || 'Chi phí chung'}
                                </span>
                            </div>

                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col gap-1">
                                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                                    <CreditCard size={12} className="text-slate-400" /> Phương thức
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={getPaymentMethodLabel(expense.paymentMethod || '')}>
                                    {expense.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' :
                                     expense.paymentMethod === 'CREDIT_CARD' ? 'Thẻ tín dụng' :
                                     'Tiền mặt'}
                                </span>
                            </div>

                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col gap-1">
                                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                                    <Clock size={12} className="text-slate-400" /> Trạng thái
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {isCancelled ? 'Đã hủy' : isPendingStatus ? 'Chờ duyệt' : 'Hoàn thành / Đã chi'}
                                </span>
                            </div>

                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col gap-1">
                                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                                    <FileText size={12} className="text-slate-400" /> Mã tham chiếu
                                </span>
                                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate font-mono" title={expense.reference || ''}>
                                    {expense.reference || 'Không có'}
                                </span>
                            </div>
                        </div>

                        {/* Accounting Cashbook Sync Banner */}
                        {expense.linkedCashTransaction && (
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                        <Landmark size={15} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 m-0">
                                            Đã đồng bộ hạch toán Sổ Quỹ Kế Toán: <span className="font-mono text-emerald-700">{expense.linkedCashTransaction.code}</span>
                                        </p>
                                        {expense.linkedCashTransaction.financeAccount && (
                                            <p className="text-slate-600 text-[11px] m-0">
                                                Tài khoản: {expense.linkedCashTransaction.financeAccount.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Link 
                                    href="/accounting/cash-book" 
                                    className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 hover:underline shrink-0"
                                >
                                    <span>Xem Sổ Quỹ</span>
                                    <ArrowRight size={13} />
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* RECIPIENT INFORMATION & NOTES */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col gap-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Building2 size={18} className="text-slate-600" />
                                Thông Tin Đối Tượng Nhận Tiền & Nghiệp Vụ
                            </h2>
                        </div>

                        <div className="flex flex-col gap-4">
                            {/* Recipient Details */}
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                                    Đối tượng nhận thanh toán
                                </span>

                                {expense.customer ? (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                                                {expense.customer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-slate-900">{expense.customer.name}</span>
                                                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                                                        Khách Hàng
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1.5">
                                                    {expense.customer.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone size={12} className="text-slate-400" /> {expense.customer.phone}
                                                        </span>
                                                    )}
                                                    {expense.customer.email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail size={12} className="text-slate-400" /> {expense.customer.email}
                                                        </span>
                                                    )}
                                                    {expense.customer.address && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={12} className="text-slate-400" /> {expense.customer.address}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Link 
                                            href={`/customers/${expense.customer.id}`}
                                            className="px-3 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors shrink-0 inline-flex items-center gap-1 shadow-xs"
                                        >
                                            <span>Hồ sơ</span>
                                            <ExternalLink size={12} />
                                        </Link>
                                    </div>
                                ) : expense.supplier ? (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                                                {expense.supplier.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-slate-900">{expense.supplier.name}</span>
                                                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-semibold border border-orange-200">
                                                        Nhà Cung Cấp
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1.5">
                                                    {expense.supplier.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone size={12} className="text-slate-400" /> {expense.supplier.phone}
                                                        </span>
                                                    )}
                                                    {expense.supplier.email && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail size={12} className="text-slate-400" /> {expense.supplier.email}
                                                        </span>
                                                    )}
                                                    {expense.supplier.address && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={12} className="text-slate-400" /> {expense.supplier.address}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Link 
                                            href={`/suppliers/${expense.supplier.id}`}
                                            className="px-3 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors shrink-0 inline-flex items-center gap-1 shadow-xs"
                                        >
                                            <span>Hồ sơ</span>
                                            <ExternalLink size={12} />
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 m-0">
                                                {expense.payee || 'Chưa cập nhật người nhận'}
                                            </p>
                                            <p className="text-xs text-slate-500 m-0">
                                                Đối tượng nhận chi ngoại bộ / Đơn vị cung cấp dịch vụ ngoài
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Related Project or Campaign */}
                            {(expense.project || expense.marketingCampaign) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    {expense.project && (
                                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <Briefcase size={17} className="text-slate-500 shrink-0" />
                                                <div className="overflow-hidden">
                                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Dự án liên quan</span>
                                                    <p className="font-bold text-slate-900 text-xs truncate m-0">{expense.project.name}</p>
                                                </div>
                                            </div>
                                            <Link 
                                                href={`/projects/${expense.project.id}`}
                                                className="text-xs font-semibold text-slate-700 hover:text-emerald-700 inline-flex items-center gap-1 shrink-0 ml-2"
                                            >
                                                <span>Mở</span>
                                                <ExternalLink size={11} />
                                            </Link>
                                        </div>
                                    )}

                                    {expense.marketingCampaign && (
                                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <Sparkles size={17} className="text-slate-500 shrink-0" />
                                                <div className="overflow-hidden">
                                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Chiến dịch Marketing</span>
                                                    <p className="font-bold text-slate-900 text-xs truncate m-0">{expense.marketingCampaign.name}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Description Box - Clean ERP Style */}
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                                    Diễn giải / Nội dung chi tiết khoản chi
                                </span>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                                    {expense.description || <span className="text-slate-400 italic">Không có diễn giải chi tiết</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CENTRALIZED DOCUMENTS & ATTACHMENTS */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Paperclip size={18} className="text-slate-600" />
                                <h2 className="text-base font-bold text-slate-900">
                                    Chứng Từ & Tệp Đính Kèm Tập Trung
                                </h2>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold font-mono border border-slate-200">
                                    {documents.length}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            >
                                <Plus size={14} />
                                <span>{isUploading ? 'Đang tải lên...' : 'Thêm chứng từ'}</span>
                            </button>
                        </div>

                        {documents.length === 0 ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-slate-50 group"
                            >
                                <Upload size={28} className="mx-auto text-slate-400 group-hover:text-emerald-600 mb-2 transition-colors" />
                                <p className="text-xs font-semibold text-slate-700">
                                    Chưa có chứng từ đính kèm
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Bấm vào đây để tải hóa đơn VAT, ủy nhiệm chi, phiếu thu, phiếu chi hoặc sao kê ngân hàng (.pdf, .jpg, .xlsx, .docx...)
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {documents.map((doc, idx) => (
                                    <div 
                                        key={idx} 
                                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-all flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs shrink-0">
                                                {getFileIcon(doc.name)}
                                            </div>
                                            <div className="overflow-hidden">
                                                <h4 className="font-semibold text-xs text-slate-800 truncate" title={doc.name}>
                                                    {doc.name}
                                                </h4>
                                                <p className="text-[11px] text-slate-400 truncate m-0">
                                                    {doc.uploadedAt ? formatDate(new Date(doc.uploadedAt)) : 'Chứng từ gốc'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewDoc(doc)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                                                title="Xem trước tài liệu"
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <a
                                                href={doc.url}
                                                download={doc.name}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                                                title="Tải tệp về máy"
                                            >
                                                <Download size={15} />
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFile(doc.url, doc.name)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                                                title="Xóa tệp đính kèm"
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right 1 Column: Creator, Internal Notes, Audit Trail, Linked Tasks */}
                <div className="flex flex-col gap-6">

                    {/* CREATOR CARD */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block flex items-center gap-1.5">
                            <UserIcon size={14} className="text-slate-400" />
                            Người lập phiếu chi
                        </span>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-sm flex items-center justify-center shrink-0">
                                {expense.creator.name ? expense.creator.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-slate-900 text-sm truncate m-0">
                                    {expense.creator.name || 'Người dùng'}
                                </p>
                                <p className="text-xs text-slate-500 truncate m-0">
                                    {expense.creator.email}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5 m-0">
                                    Lập lúc: {formatDateTime(expense.createdAt)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* INTERNAL NOTES SECTION - Natural height, clean list & input */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-slate-600" />
                                <h3 className="text-sm font-bold text-slate-800 m-0">Ghi chú nội bộ</h3>
                            </div>
                            <span className="bg-slate-200/80 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold font-mono">
                                {notes.length}
                            </span>
                        </div>

                        {/* Notes Message List */}
                        <div className="p-4 flex flex-col gap-3 max-h-[360px] overflow-y-auto">
                            {notes.length === 0 ? (
                                <div className="text-center py-6 text-slate-400">
                                    <p className="text-xs font-medium m-0">Chưa có ghi chú nội bộ nào.</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5 m-0">Viết ghi chú bên dưới để trao đổi với đội ngũ.</p>
                                </div>
                            ) : (
                                notes.map((note) => (
                                    <div key={note.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-slate-800">
                                                {note.user?.name || 'Thành viên'}
                                            </span>
                                            <span className="text-[11px] text-slate-400" title={new Date(note.createdAt).toLocaleString('vi-VN')}>
                                                {formatDateTime(note.createdAt)}
                                            </span>
                                        </div>
                                        <div
                                            className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5"
                                            dangerouslySetInnerHTML={{ __html: autoLinkText(note.content) }}
                                        />
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input Box */}
                        <div className="p-3 border-t border-slate-100 bg-white">
                            <form onSubmit={handleAddNote} className="flex flex-col gap-2">
                                <textarea
                                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none resize-none transition-all placeholder:text-slate-400"
                                    placeholder="Viết ghi chú mới... (Ctrl + Enter để gửi)"
                                    rows={2}
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                            handleAddNote(e);
                                        }
                                    }}
                                    disabled={isSubmittingNote}
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={!noteContent.trim() || isSubmittingNote}
                                        className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                                    >
                                        <Send size={12} />
                                        <span>{isSubmittingNote ? 'Đang lưu...' : 'Lưu Ghi Chú'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* ACTIVITY LOGS (AUDIT TRAIL) - Clean Timeline */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 block flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-slate-400" />
                            Nhật ký kiểm toán & Lịch sử
                        </span>
                        
                        <div className="relative pl-5 border-l-2 border-slate-200 space-y-4">
                            {/* Created event */}
                            <div className="relative">
                                <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-slate-100" />
                                <p className="font-semibold text-xs text-slate-800 m-0">
                                    Khởi tạo phiếu chi: <span className="font-mono text-emerald-700">{expense.code}</span>
                                </p>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                    Bởi {expense.creator.name} • {formatDateTime(expense.createdAt)}
                                </span>
                            </div>

                            {/* Additional logs */}
                            {expense.activityLogs && expense.activityLogs.map((log: any) => (
                                <div key={log.id} className="relative">
                                    <div className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white ring-2 ring-slate-100" />
                                    <p className="font-semibold text-xs text-slate-800 m-0">
                                        {log.details || log.action}
                                    </p>
                                    <span className="text-[11px] text-slate-400 block mt-0.5">
                                        Bởi {log.user?.name || 'Hệ thống'} • {formatDateTime(log.createdAt)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* LINKED TASKS (IF ANY) */}
                    {expense.tasks && expense.tasks.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <Clock size={14} className="text-slate-400" /> Công việc liên quan
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                                    {expense.tasks.length}
                                </span>
                            </span>
                            <div className="flex flex-col gap-2">
                                {expense.tasks.map(task => (
                                    <Link key={task.id} href={`/tasks/${task.id}`} className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs block transition-all bg-slate-50 hover:bg-slate-100/60 no-underline">
                                        <p className="font-semibold text-slate-800 truncate m-0">{task.title}</p>
                                        <span className="text-[11px] text-slate-500 font-medium">Trạng thái: {task.status}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {previewDoc && (
                <DocumentPreviewModal
                    isOpen={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    fileUrl={previewDoc.url}
                    fileName={previewDoc.name}
                />
            )}

            {/* EDIT EXPENSE MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl relative my-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 m-0">
                                <Edit3 size={18} className="text-slate-600" />
                                Chỉnh Sửa Phiếu Chi {expense.code}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Số tiền chi (VND) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="any"
                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        value={editForm.amount}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Ngày chi *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        value={editForm.date}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Danh mục chi phí *
                                    </label>
                                    <select
                                        required
                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        value={editForm.categoryId}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, categoryId: e.target.value }))}
                                    >
                                        {relatedOptions?.categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Phương thức thanh toán
                                    </label>
                                    <select
                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        value={editForm.paymentMethod}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                    >
                                        <option value="BANK_TRANSFER">Chuyển khoản (Bank Transfer)</option>
                                        <option value="CASH">Tiền mặt (Cash)</option>
                                        <option value="CREDIT_CARD">Thẻ tín dụng (Credit Card)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Đối tượng nhận tiền (Tên người/Đơn vị)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: BV Hoàn Mỹ, Nhà hàng ABC..."
                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        value={editForm.payee}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, payee: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Mã tham chiếu / Số hóa đơn
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: HD-00123, UNC-8982..."
                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        value={editForm.reference}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, reference: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Nhà cung cấp liên kết
                                    </label>
                                    <select
                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        value={editForm.supplierId}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, supplierId: e.target.value }))}
                                    >
                                        <option value="">-- Không chọn NCC --</option>
                                        {relatedOptions?.suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Khách hàng liên kết
                                    </label>
                                    <select
                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        value={editForm.customerId}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, customerId: e.target.value }))}
                                    >
                                        <option value="">-- Không chọn Khách Hàng --</option>
                                        {relatedOptions?.customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Dự án liên kết
                                    </label>
                                    <select
                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        value={editForm.projectId}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, projectId: e.target.value }))}
                                    >
                                        <option value="">-- Không chọn Dự Án --</option>
                                        {relatedOptions?.projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        Trạng thái phiếu
                                    </label>
                                    <select
                                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        value={editForm.status}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="COMPLETED">Hoàn thành / Đã chi</option>
                                        <option value="PENDING">Chờ duyệt</option>
                                        <option value="CANCELLED">Đã hủy</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">
                                    Diễn giải / Nội dung chi *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none resize-none"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingEdit}
                                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                                >
                                    {isSavingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PRINT MODAL (CHUẨN THÔNG TƯ 200/133 BỘ TÀI CHÍNH) */}
            {isPrintModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative my-8 flex flex-col gap-6">
                        {/* Print Header Controls */}
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-2">
                                <Printer size={20} className="text-slate-700" />
                                <h3 className="text-base font-bold m-0">Xem Trước Bản In Phiếu Chi A4</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                    <Printer size={15} /> In Phiếu Chi
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPrintModalOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Printable Voucher Sheet */}
                        <div className="border border-slate-300 p-8 sm:p-10 rounded-xl bg-white text-slate-900 font-sans leading-relaxed">
                            {/* Company & Voucher Meta */}
                            <div className="flex justify-between items-start gap-4 mb-6">
                                <div>
                                    <h4 className="font-extrabold text-sm uppercase tracking-tight text-slate-900 m-0">
                                        CTY GIẢI PHÁP ĐÀO TẠO TRỊNH GIA
                                    </h4>
                                    <p className="text-xs text-slate-600 mt-1 mb-0.5">
                                        Địa chỉ: 147/80, NTMK, Khu 9, Phường Phú Lợi, Tp Hồ Chí Minh
                                    </p>
                                    <p className="text-xs text-slate-600 m-0">
                                        Hotline: 0274 999 2222 • MST: 0314812345
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-xs uppercase block text-slate-700">Mẫu số 02 - TT</span>
                                    <span className="text-[11px] text-slate-500 block italic">(Ban hành theo TT số 200/2014/TT-BTC)</span>
                                    <div className="mt-2 text-xs font-mono text-slate-700">
                                        <div>Số: <strong>{expense.code}</strong></div>
                                        <div>Nợ: <strong>642 / 154</strong></div>
                                        <div>Có: <strong>{expense.paymentMethod === 'BANK_TRANSFER' ? '112' : '111'}</strong></div>
                                    </div>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="text-center my-6">
                                <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900 m-0">
                                    PHIẾU CHI
                                </h2>
                                <p className="text-xs text-slate-600 italic mt-1 m-0">
                                    Ngày {new Date(expense.date).getDate()} tháng {new Date(expense.date).getMonth() + 1} năm {new Date(expense.date).getFullYear()}
                                </p>
                            </div>

                            {/* Content Lines */}
                            <div className="flex flex-col gap-3 text-sm my-6">
                                <div className="flex items-baseline">
                                    <span className="w-48 font-medium text-slate-700 shrink-0">Họ và tên người nhận tiền:</span>
                                    <span className="font-bold text-slate-900 border-b border-dotted border-slate-400 flex-1 pb-0.5">
                                        {expense.customer?.name || expense.supplier?.name || expense.payee || '---'}
                                    </span>
                                </div>

                                <div className="flex items-baseline">
                                    <span className="w-48 font-medium text-slate-700 shrink-0">Địa chỉ / Đơn vị:</span>
                                    <span className="text-slate-800 border-b border-dotted border-slate-400 flex-1 pb-0.5">
                                        {expense.customer?.address || expense.supplier?.address || '---'}
                                    </span>
                                </div>

                                <div className="flex items-baseline">
                                    <span className="w-48 font-medium text-slate-700 shrink-0">Lý do chi:</span>
                                    <span className="font-semibold text-slate-900 border-b border-dotted border-slate-400 flex-1 pb-0.5">
                                        {expense.description}
                                    </span>
                                </div>

                                <div className="flex items-baseline">
                                    <span className="w-48 font-medium text-slate-700 shrink-0">Số tiền:</span>
                                    <span className="font-bold font-mono text-base text-slate-900 border-b border-dotted border-slate-400 flex-1 pb-0.5">
                                        {formatMoney(expense.amount)}
                                    </span>
                                </div>

                                <div className="flex items-baseline">
                                    <span className="w-48 font-medium text-slate-700 shrink-0">Viết bằng chữ:</span>
                                    <span className="font-semibold italic text-slate-900 border-b border-dotted border-slate-400 flex-1 pb-0.5">
                                        {numberToVietnameseWords(expense.amount)}
                                    </span>
                                </div>

                                <div className="flex items-baseline">
                                    <span className="w-48 font-medium text-slate-700 shrink-0">Kèm theo:</span>
                                    <span className="text-slate-800 border-b border-dotted border-slate-400 flex-1 pb-0.5">
                                        {documents.length > 0 ? `${documents.length} chứng từ gốc đính kèm (${documents.map(d => d.name).join(', ')})` : (expense.reference ? `Chứng từ tham chiếu số ${expense.reference}` : '................................................ chứng từ gốc')}
                                    </span>
                                </div>
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-5 text-center mt-12 gap-2 text-xs">
                                <div>
                                    <p className="font-bold uppercase text-slate-900 m-0">Giám đốc</p>
                                    <p className="text-[11px] text-slate-500 italic mt-0.5 m-0">(Ký, họ tên, đóng dấu)</p>
                                    <div className="h-20" />
                                </div>
                                <div>
                                    <p className="font-bold uppercase text-slate-900 m-0">Kế toán trưởng</p>
                                    <p className="text-[11px] text-slate-500 italic mt-0.5 m-0">(Ký, họ tên)</p>
                                    <div className="h-20" />
                                </div>
                                <div>
                                    <p className="font-bold uppercase text-slate-900 m-0">Người nộp/nhận</p>
                                    <p className="text-[11px] text-slate-500 italic mt-0.5 m-0">(Ký, họ tên)</p>
                                    <div className="h-20" />
                                </div>
                                <div>
                                    <p className="font-bold uppercase text-slate-900 m-0">Người lập phiếu</p>
                                    <p className="text-[11px] text-slate-500 italic mt-0.5 m-0">(Ký, họ tên)</p>
                                    <div className="h-20 flex items-end justify-center font-bold text-slate-800 pb-1">
                                        {expense.creator.name}
                                    </div>
                                </div>
                                <div>
                                    <p className="font-bold uppercase text-slate-900 m-0">Thủ quỹ</p>
                                    <p className="text-[11px] text-slate-500 italic mt-0.5 m-0">(Ký, họ tên)</p>
                                    <div className="h-20" />
                                </div>
                            </div>

                            <div className="border-t border-slate-200 mt-6 pt-3 text-[11px] text-slate-500 italic flex justify-between">
                                <span>Đã nhận đủ số tiền (viết bằng chữ): ........................................................................................</span>
                                <span>Ngày in: {formatDate(new Date())}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ACTION CONFIRMATION MODAL */}
            {actionModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl relative">
                        <div className="flex items-start gap-3 mb-4">
                            <div className={`p-2.5 rounded-xl shrink-0 ${
                                actionModal.type === 'danger' ? 'bg-rose-100 text-rose-600' :
                                actionModal.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                                'bg-blue-100 text-blue-600'
                            }`}>
                                <AlertCircle size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 m-0">
                                    {actionModal.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed m-0">
                                    {actionModal.message}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={actionModal.action}
                                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${
                                    actionModal.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700' :
                                    actionModal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                                    'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {isActionLoading ? 'Đang thực hiện...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
