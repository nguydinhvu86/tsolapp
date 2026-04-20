'use client'
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Plus, CheckSquare, MessageSquare, Trash2, Clock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createTask, updateTaskStatus, deleteTask } from '@/app/tasks/actions';
import Link from 'next/link';

interface TaskPanelProps {
    initialTasks: any[];
    users: any[];
    entityType: 'PROJECT' | 'CONTRACT' | 'QUOTE' | 'HANDOVER' | 'PAYMENT_REQUEST' | 'DISPATCH' | 'CUSTOMER' | 'APPENDIX' | 'SUPPLIER' | 'PURCHASE_ORDER' | 'PURCHASE_BILL' | 'PURCHASE_PAYMENT' | 'SALES_ESTIMATE' | 'SALES_ORDER' | 'SALES_INVOICE' | 'SALES_PAYMENT' | 'LEAD' | 'MARKETING_CAMPAIGN' | 'OTHER';
    entityId: string;
    initialTitle?: string;
    initialDescription?: string;
}

export function TaskPanel({ initialTasks, users, entityType, entityId, initialTitle, initialDescription }: TaskPanelProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = true;
    const canEdit = isAdmin || permissions.includes('TASKS_EDIT');
    const canDelete = isAdmin || permissions.includes('TASKS_DELETE');

    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isViewAllModalOpen, setViewAllModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [dueDate, setDueDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [selectedObservers, setSelectedObservers] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

    // Recurrence State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFreq, setRecurrenceFreq] = useState('MONTHLY');
    const [recurrenceCount, setRecurrenceCount] = useState(2);

    // Derived Preview Dates for Recurrence
    const previewDates = React.useMemo(() => {
        if (!isRecurring || (!dueDate && !startDate) || recurrenceCount < 2) return [];
        const generateDates = () => {
            const dates = [];
            const base = new Date(startDate || dueDate);
            for (let i = 0; i < recurrenceCount; i++) {
                const d = new Date(base);
                switch (recurrenceFreq) {
                    case 'DAILY': d.setDate(d.getDate() + i); break;
                    case 'MONTHLY': d.setMonth(d.getMonth() + i); break;
                    case 'QUARTERLY': d.setMonth(d.getMonth() + 3 * i); break;
                    case 'BIANNUALLY': d.setMonth(d.getMonth() + 6 * i); break;
                    case 'YEARLY': d.setFullYear(d.getFullYear() + i); break;
                }
                dates.push(d);
            }
            return dates;
        };
        return generateDates();
    }, [isRecurring, dueDate, startDate, recurrenceFreq, recurrenceCount]);

    // Filter tasks logic
    const currentUserTasks = initialTasks.filter((t: any) => {
        const canViewAllTasks = isAdmin || session?.user?.role === 'MANAGER' || permissions.includes('TASKS_VIEW_ALL');
        if (canViewAllTasks) return true; // Admins, Managers, and ViewAll see all for context
        const userId = session?.user?.id;
        if (!userId) return false;

        const isAssignee = t.assignees?.some((a: any) => a.userId === userId);
        const isObserver = t.observers?.some((o: any) => o.userId === userId);
        const isCreator = t.creatorId === userId;

        return isAssignee || isObserver || isCreator;
    });

    const activeTasks = currentUserTasks.filter((t: any) => {
        if (!showCompleted && (t.status === 'DONE' || t.status === 'CANCELLED')) return false;

        // Hide recurring tasks until their exact start/due date arrives (or within 7 days)
        if (t.isRecurring) {
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() + 7); // Show 7 days in advance
            const taskDate = t.startDate ? new Date(t.startDate) : (t.dueDate ? new Date(t.dueDate) : null);
            if (taskDate && taskDate.getTime() > thresholdDate.getTime()) return false; // Hide if date is too far in the future
        }

        return true;
    });

    const displayTasks = activeTasks.slice(0, 3);
    const hasMoreTasks = activeTasks.length > 3;

    const handleOpenModal = () => {
        if (!title) setTitle(initialTitle || '');
        if (!description) setDescription(initialDescription || '');
        setCreateModalOpen(true);
    };

    const handleCreate = async () => {
        if (!title.trim() || !session?.user?.id) return;
        setIsSaving(true);

        let contextLinks: any = {};
        if (entityType === 'PROJECT') contextLinks.parentTaskId = entityId;
        if (entityType === 'CONTRACT') contextLinks.contractId = entityId;
        if (entityType === 'QUOTE') contextLinks.quoteId = entityId;
        if (entityType === 'HANDOVER') contextLinks.handoverId = entityId;
        if (entityType === 'PAYMENT_REQUEST') contextLinks.paymentReqId = entityId;
        if (entityType === 'DISPATCH') contextLinks.dispatchId = entityId;
        if (entityType === 'CUSTOMER') contextLinks.customerId = entityId;
        if (entityType === 'APPENDIX') contextLinks.appendixId = entityId;
        if (entityType === 'SUPPLIER') contextLinks.supplierId = entityId;
        if (entityType === 'PURCHASE_ORDER') contextLinks.purchaseOrderId = entityId;
        if (entityType === 'PURCHASE_BILL') contextLinks.purchaseBillId = entityId;
        if (entityType === 'PURCHASE_PAYMENT') contextLinks.purchasePaymentId = entityId;
        if (entityType === 'SALES_ESTIMATE') contextLinks.salesEstimateId = entityId;
        if (entityType === 'SALES_ORDER') contextLinks.salesOrderId = entityId;
        if (entityType === 'SALES_INVOICE') contextLinks.salesInvoiceId = entityId;
        if (entityType === 'SALES_PAYMENT') contextLinks.salesPaymentId = entityId;
        if (entityType === 'LEAD') contextLinks.leadId = entityId;
        if (entityType === 'MARKETING_CAMPAIGN') contextLinks.marketingCampaignId = entityId;

        try {
            const payload: any = {
                title,
                description,
                priority,
                dueDate: dueDate ? new Date(dueDate) : null,
                startDate: startDate ? new Date(startDate) : null,
                status: 'TODO',
                assignees: selectedAssignees,
                observers: selectedObservers,
                ...contextLinks
            };

            if (isRecurring) {
                payload.recurrence = {
                    isRecurring: true,
                    frequency: recurrenceFreq,
                    count: parseInt(recurrenceCount as any) || 1
                };
            }

            await createTask(payload, session.user.id);

            setCreateModalOpen(false);
            setTitle('');
            setDescription('');
            setPriority('MEDIUM');
            setDueDate('');
            setStartDate('');
            setSelectedAssignees([]);
            setSelectedObservers([]);
            setIsRecurring(false);
            setRecurrenceFreq('MONTHLY');
            setRecurrenceCount(2);

            router.refresh();
        } finally {
            setIsSaving(false);
        }
    }

    const updateStatus = async (id: string, newStatus: string) => {
        if (!session?.user?.id) return;
        await updateTaskStatus(id, newStatus, session.user.id);
        router.refresh();
    }

    const handleDelete = async (id: string) => {
        if (confirm('Xóa công việc này khỏi hệ thống?')) {
            await deleteTask(id);
            router.refresh();
        }
    }

    const derivedProgress = (task: any) => {
        if (!task.checklists || task.checklists.length === 0) return '';
        const done = task.checklists.filter((c: any) => c.isCompleted).length;
        const total = task.checklists.length;
        return `${done}/${total} checklist`;
    }

    return (
        <Card style={{
            marginTop: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 40px)',
            overflow: 'hidden',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            border: '1px solid var(--border)',
            borderRadius: '12px'
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    <CheckSquare size={16} color="var(--primary)" /> Công việc liên quan
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={(e) => setShowCompleted(e.target.checked)}
                            style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: '14px', height: '14px' }}
                        />
                        <span>Hiện việc đã xong</span>
                    </label>
                    {canCreate && (
                        <Button onClick={handleOpenModal} className="gap-2" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}>
                            <Plus size={14} /> Giao việc
                        </Button>
                    )}
                </div>
            </div>

            {/* List */}
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, backgroundColor: 'white' }}>
                {activeTasks.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <CheckSquare size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                        <p style={{ fontSize: '0.85rem', margin: 0 }}>Không có công việc nào đang chờ xử lý.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {displayTasks.map(task => {
                            const assigneesNames = task.assignees?.map((a: any) => a.user.name || a.user.email).join(', ') || 'Chưa phân công';
                            const isOverdue = task.dueDate && task.status !== 'DONE' && new Date(task.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

                            return (
                                <div key={task.id} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '0.85rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    backgroundColor: task.status === 'DONE' ? '#f8fafc' : 'white',
                                    transition: 'all 0.2s',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    {/* Task Header info */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <Link href={`/tasks/${task.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.4, flex: 1 }} className="hover:text-primary">
                                            <span style={{ textDecoration: task.status === 'DONE' ? 'line-through' : 'none', color: task.status === 'DONE' ? 'var(--text-muted)' : 'inherit' }}>
                                                {task.title}
                                            </span>
                                        </Link>
                                    </div>

                                    {/* Tags */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 600,
                                            backgroundColor: task.priority === 'URGENT' ? '#fee2e2' : (task.priority === 'HIGH' ? '#fef3c7' : '#f1f5f9'),
                                            color: task.priority === 'URGENT' ? '#dc2626' : (task.priority === 'HIGH' ? '#d97706' : '#475569')
                                        }}>
                                            {task.priority === 'URGENT' ? 'Khẩn Cấp' : (task.priority === 'HIGH' ? 'Cao' : (task.priority === 'LOW' ? 'Thấp' : 'Trung Bình'))}
                                        </span>
                                        {derivedProgress(task) && (
                                            <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600, backgroundColor: '#e0e7ff', padding: '2px 8px', borderRadius: '999px' }}>
                                                {derivedProgress(task)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Sub details */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <User size={13} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{assigneesNames}</span>
                                        </div>
                                        {task.dueDate && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isOverdue ? '#dc2626' : 'inherit' }}>
                                                <Clock size={13} /> <span>{formatDate(new Date(task.dueDate))}</span>
                                                {isOverdue && <span style={{ fontSize: '0.6rem', padding: '1px 4px', background: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontWeight: 600 }}>Quá hạn</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                                        <select
                                            value={task.status}
                                            onChange={(e) => canEdit ? updateStatus(task.id, e.target.value) : null}
                                            disabled={!canEdit}
                                            style={{
                                                padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)',
                                                fontSize: '0.75rem', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 500,
                                                color: task.status === 'DONE' ? 'var(--success)' : 'var(--text-main)'
                                            }}
                                        >
                                            <option value="TODO">Cần Làm</option>
                                            <option value="IN_PROGRESS">Đang Xử Lý</option>
                                            <option value="REVIEW">Chờ Duyệt</option>
                                            <option value="DONE">Hoàn Thành</option>
                                            <option value="CANCELLED">Hủy</option>
                                        </select>

                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <Link href={`/tasks/${task.id}`}>
                                                <button style={{ color: 'var(--primary)', padding: '6px', borderRadius: '4px', transition: 'background 0.2s', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} title="Full chi tiết" className="hover:bg-indigo-50">
                                                    <MessageSquare size={16} />
                                                </button>
                                            </Link>
                                            {canDelete && (
                                                <button onClick={() => handleDelete(task.id)} style={{ color: 'var(--danger)', padding: '6px', borderRadius: '4px', transition: 'background 0.2s', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} title="Xóa" className="hover:bg-red-50">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {hasMoreTasks && (
                            <button
                                onClick={() => setViewAllModalOpen(true)}
                                style={{
                                    marginTop: '0.5rem',
                                    padding: '0.75rem',
                                    width: '100%',
                                    backgroundColor: '#f1f5f9',
                                    color: 'var(--primary)',
                                    border: '1px dashed #cbd5e1',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                className="hover:bg-slate-200"
                            >
                                Xem tất cả {activeTasks.length} công việc
                            </button>
                        )}
                    </div>
                )}
            </div>

            <Modal isOpen={isViewAllModalOpen} onClose={() => setViewAllModalOpen(false)} title={`Tất cả công việc (${activeTasks.length})`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                    {activeTasks.map(task => {
                        const assigneesNames = task.assignees?.map((a: any) => a.user.name || a.user.email).join(', ') || 'Chưa phân công';
                        const isOverdue = task.dueDate && task.status !== 'DONE' && new Date(task.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

                        return (
                            <div key={task.id} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '1rem',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                backgroundColor: task.status === 'DONE' ? '#f8fafc' : 'white',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                {/* Task Header info */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Link href={`/tasks/${task.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', lineHeight: 1.4, flex: 1 }} className="hover:text-primary">
                                        <span style={{ textDecoration: task.status === 'DONE' ? 'line-through' : 'none', color: task.status === 'DONE' ? 'var(--text-muted)' : 'inherit' }}>
                                            {task.title}
                                        </span>
                                    </Link>
                                </div>

                                {/* Tags */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                                        backgroundColor: task.priority === 'URGENT' ? '#fee2e2' : (task.priority === 'HIGH' ? '#fef3c7' : '#f1f5f9'),
                                        color: task.priority === 'URGENT' ? '#dc2626' : (task.priority === 'HIGH' ? '#d97706' : '#475569')
                                    }}>
                                        {task.priority === 'URGENT' ? 'Khẩn Cấp' : (task.priority === 'HIGH' ? 'Cao' : (task.priority === 'LOW' ? 'Thấp' : 'Trung Bình'))}
                                    </span>
                                    {derivedProgress(task) && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, backgroundColor: '#e0e7ff', padding: '2px 8px', borderRadius: '999px' }}>
                                            {derivedProgress(task)}
                                        </span>
                                    )}
                                </div>

                                {/* Sub details */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={14} /> <span>{assigneesNames}</span>
                                    </div>
                                    {(task.startDate || task.dueDate) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <Clock size={14} />
                                            {task.startDate && <span style={{ color: 'var(--text-main)' }}>Bắt đầu: {formatDate(new Date(task.startDate))}</span>}
                                            {task.startDate && task.dueDate && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                            {task.dueDate && (
                                                <span style={{ color: isOverdue ? '#dc2626' : 'inherit' }}>
                                                    Deadline: {formatDate(new Date(task.dueDate))}
                                                </span>
                                            )}
                                            {isOverdue && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontWeight: 600 }}>Quá hạn</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: 'auto' }}>
                                    <select
                                        value={task.status}
                                        onChange={(e) => canEdit ? updateStatus(task.id, e.target.value) : null}
                                        disabled={!canEdit}
                                        style={{
                                            padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                                            fontSize: '0.875rem', outline: 'none', backgroundColor: '#f8fafc', fontWeight: 500,
                                            color: task.status === 'DONE' ? 'var(--success)' : 'var(--text-main)'
                                        }}
                                    >
                                        <option value="TODO">Cần Làm</option>
                                        <option value="IN_PROGRESS">Đang Xử Lý</option>
                                        <option value="REVIEW">Chờ Duyệt</option>
                                        <option value="DONE">Hoàn Thành</option>
                                        <option value="CANCELLED">Hủy</option>
                                    </select>

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Link href={`/tasks/${task.id}`}>
                                            <button style={{ color: 'var(--primary)', padding: '8px', borderRadius: '6px', transition: 'background 0.2s', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} title="Full chi tiết" className="hover:bg-indigo-50">
                                                <MessageSquare size={18} />
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Modal>

            <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Giao Việc Liên Quan" maxWidth="575px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Tên công việc <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="Nhập tên việc..." />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Mô tả</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="Ghi chú thêm..." />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Người phụ trách</label>
                            <select multiple value={selectedAssignees} onChange={e => {
                                const options = Array.from(e.target.selectedOptions);
                                setSelectedAssignees(options.map(o => o.value));
                            }} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '100px' }}>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                            </select>
                            <small style={{ color: 'var(--text-muted)' }}>Bấm Ctrl hoặc kéo thả để chọn nhiều người.</small>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Người theo dõi</label>
                            <select multiple value={selectedObservers} onChange={e => {
                                const options = Array.from(e.target.selectedOptions);
                                setSelectedObservers(options.map(o => o.value));
                            }} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '100px' }}>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Mức độ ưu tiên</label>
                            <select value={priority} onChange={e => setPriority(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                <option value="LOW">Thấp (Low)</option>
                                <option value="MEDIUM">Trung Bình (Medium)</option>
                                <option value="HIGH">Cao (High)</option>
                                <option value="URGENT">Khẩn Cấp (Urgent)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Ngày bắt đầu</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Deadline</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--primary)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                                Lặp lại định kỳ
                            </label>

                            {isRecurring && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Tần suất lặp</label>
                                            <select value={recurrenceFreq} onChange={e => setRecurrenceFreq(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                                <option value="DAILY">Hàng ngày</option>
                                                <option value="MONTHLY">Hàng tháng</option>
                                                <option value="QUARTERLY">Mỗi 3 tháng</option>
                                                <option value="BIANNUALLY">Mỗi 6 tháng</option>
                                                <option value="YEARLY">Hàng năm</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Số lần lặp thêm:</span>
                                        <input
                                            type="number"
                                            min="1" max="100"
                                            value={recurrenceCount}
                                            onChange={e => setRecurrenceCount(parseInt(e.target.value))}
                                            style={{ width: '80px', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <small style={{ color: 'var(--text-muted)' }}>Hệ thống sẽ tạo gốc và {recurrenceCount || 0} công việc tự động.</small>
                                </div>
                            )}

                            {isRecurring && previewDates.length > 0 && (
                                <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 'var(--radius)' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Lịch trình dự kiến:</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '120px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                        {previewDates.map((d, index) => (
                                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: index === 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                                                <span>{index === 0 ? 'Lần 1 (Gốc):' : `Lần ${index + 1}:`}</span>
                                                <span style={{ fontWeight: 500 }}>{formatDate(d)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleCreate} disabled={isSaving || !title.trim()}>
                            {isSaving ? 'Đang tạo...' : 'Tạo Việc'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
}
