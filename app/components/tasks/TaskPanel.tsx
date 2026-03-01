'use client'

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
    entityType: 'CONTRACT' | 'QUOTE' | 'HANDOVER' | 'PAYMENT_REQUEST' | 'DISPATCH' | 'CUSTOMER' | 'APPENDIX' | 'SUPPLIER' | 'PURCHASE_ORDER' | 'PURCHASE_BILL' | 'PURCHASE_PAYMENT';
    entityId: string;
}

export function TaskPanel({ initialTasks, users, entityType, entityId }: TaskPanelProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = isAdmin || permissions.includes('TASKS_CREATE');
    const canEdit = isAdmin || permissions.includes('TASKS_EDIT');
    const canDelete = isAdmin || permissions.includes('TASKS_DELETE');

    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [dueDate, setDueDate] = useState('');
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [selectedObservers, setSelectedObservers] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const handleCreate = async () => {
        if (!title.trim() || !session?.user?.id) return;
        setIsSaving(true);

        let contextLinks: any = {};
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

        try {
            await createTask({
                title,
                description,
                priority,
                dueDate: dueDate ? new Date(dueDate) : null,
                status: 'TODO',
                assignees: selectedAssignees,
                observers: selectedObservers,
                ...contextLinks
            }, session.user.id);

            setCreateModalOpen(false);
            setTitle('');
            setDescription('');
            setPriority('MEDIUM');
            setDueDate('');
            setSelectedAssignees([]);
            setSelectedObservers([]);

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
                {canCreate && (
                    <Button onClick={() => setCreateModalOpen(true)} className="gap-2" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}>
                        <Plus size={14} /> Giao việc
                    </Button>
                )}
            </div>

            {/* List */}
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, backgroundColor: 'white' }}>
                {initialTasks.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <CheckSquare size={32} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                        <p style={{ fontSize: '0.85rem', margin: 0 }}>Chưa có công việc nào gắn với tài liệu này.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {initialTasks.map(task => {
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
                                                <Clock size={13} /> <span>{new Date(task.dueDate).toLocaleDateString('vi-VN')}</span>
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
                                                <button style={{ color: 'var(--primary)', padding: '6px', borderRadius: '4px', transition: 'background 0.2s', backgroundColor: 'transparent' }} title="Full chi tiết" className="hover:bg-indigo-50">
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
                    </div>
                )}
            </div>

            <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Giao Việc Liên Quan">
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
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Cấp độ</label>
                            <select value={priority} onChange={e => setPriority(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                                <option value="LOW">Thấp</option>
                                <option value="MEDIUM">Trung Bình</option>
                                <option value="HIGH">Cao</option>
                                <option value="URGENT">Khẩn Cấp</option>
                            </select>

                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Deadline</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
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
