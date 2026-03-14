'use client'
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { Plus, Trash2, MessageSquare, Edit2, ChevronUp, ChevronDown, Download, List, Clock, Loader2, Search, CheckCircle2, AlertTriangle, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createTask, updateTaskStatus, deleteTask, searchEntities, updateTask } from './actions';
import Link from 'next/link';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';

export function TaskDashboardClient({ initialTasks, users, parentProjectId, parentProject }: { initialTasks: any[], users: any[], parentProjectId?: string, parentProject?: any }) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    // Mọi người đều có thể tạo/sửa/xoá công việc (thực tế server action sẽ kiểm tra quyền sở hữu)
    const canCreate = true;
    const canEdit = true;
    const canDelete = true;

    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [dueDate, setDueDate] = useState('');
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [selectedObservers, setSelectedObservers] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Edit State
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editPriority, setEditPriority] = useState('MEDIUM');
    const [editDueDate, setEditDueDate] = useState('');
    const [editSelectedAssignees, setEditSelectedAssignees] = useState<string[]>([]);
    const [editSelectedObservers, setEditSelectedObservers] = useState<string[]>([]);
    const [editIsRecurring, setEditIsRecurring] = useState(false);
    const [editRecurrenceFreq, setEditRecurrenceFreq] = useState('MONTHLY');
    const [editRecurrenceCount, setEditRecurrenceCount] = useState<number | string>(2);
    const [editStartDate, setEditStartDate] = useState('');

    // Recurrence State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFreq, setRecurrenceFreq] = useState('MONTHLY');
    const [recurrenceCount, setRecurrenceCount] = useState(2);
    const [startDate, setStartDate] = useState('');

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
    }, [isRecurring, dueDate, recurrenceFreq, recurrenceCount]);

    // Link State
    const [linkType, setLinkType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedLink, setSelectedLink] = useState<{ id: string, title?: string, name?: string } | null>(null);

    React.useEffect(() => {
        if (!linkType || searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const delaySearch = setTimeout(async () => {
            const results = await searchEntities(linkType, searchQuery);
            setSearchResults(results);
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [searchQuery, linkType]);

    // Sorting State
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Filter State
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

    // If parentProject is passed, filter available users to only those assigned to the project
    const availableUsersForAssign = React.useMemo(() => {
        if (parentProject && parentProject.assignees) {
            const projectAssigneeIds = parentProject.assignees.map((a: any) => a.userId);
            return users.filter(u => projectAssigneeIds.includes(u.id));
        }
        return users;
    }, [users, parentProject]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const isOverdue = (dueDate: Date | string | null, status: string) => {
        if (!dueDate || status === 'DONE') return false;
        return new Date(dueDate).getTime() < new Date().getTime();
    };

    const filteredTasks = React.useMemo(() => {
        // Find the "active" task for each recurring series
        const activeRecurringIds = new Set<string>();
        const seriesMap = new Map<string, any[]>();

        initialTasks.forEach((t: any) => {
            if (t.isRecurring) {
                const seriesId = t.parentTaskId || t.id;
                if (!seriesMap.has(seriesId)) seriesMap.set(seriesId, []);
                seriesMap.get(seriesId)!.push(t);
            }
        });

        seriesMap.forEach((tasksInSeries, seriesId) => {
            // Sort by due date or start date
            tasksInSeries.sort((a, b) => {
                const dateA = a.startDate ? new Date(a.startDate).getTime() : new Date(a.dueDate).getTime();
                const dateB = b.startDate ? new Date(b.startDate).getTime() : new Date(b.dueDate).getTime();
                return dateA - dateB;
            });

            // Find first incomplete
            const firstIncomplete = tasksInSeries.find(t => t.status !== 'DONE');
            if (firstIncomplete) {
                // Check if this task is happening reasonably soon (e.g. within 7 days)
                // If the user wants to see ALL RECURRING tasks, we bypass this hide logic later.
                // But for the default views, we only treat it as "active" if it's near.
                const thresholdDate = new Date();
                thresholdDate.setDate(thresholdDate.getDate() + 7); // Show 7 days in advance

                const taskDate = firstIncomplete.startDate ? new Date(firstIncomplete.startDate) : new Date(firstIncomplete.dueDate);

                if (taskDate.getTime() <= thresholdDate.getTime() || filterStatus === 'RECURRING') {
                    activeRecurringIds.add(firstIncomplete.id);
                }
            } else {
                // If all done, maybe show the last one
                if (tasksInSeries.length > 0) {
                    activeRecurringIds.add(tasksInSeries[tasksInSeries.length - 1].id);
                }
            }
        });

        return initialTasks.filter((task: any) => {
            // Hide future/past recurring tasks unless in RECURRING tab
            if (filterStatus !== 'RECURRING' && task.isRecurring) {
                if (!activeRecurringIds.has(task.id)) return false;
            }

            if (filterStatus === 'ALL') return task.status !== 'DONE' && task.status !== 'CANCELLED';

            // Core Statuses (also matched by the top cards)
            if (['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'PAUSED', 'CANCELLED'].includes(filterStatus)) {
                return task.status === filterStatus;
            }

            // Time based
            if (filterStatus === 'OVERDUE') return isOverdue(task.dueDate, task.status);
            if (filterStatus === 'TODAY') {
                if (!task.dueDate) return false;
                const d1 = new Date(task.dueDate).setHours(0, 0, 0, 0);
                const d2 = new Date().setHours(0, 0, 0, 0);
                return d1 === d2;
            }
            if (filterStatus === 'UPCOMING') {
                if (!task.dueDate) return false;
                const d1 = new Date(task.dueDate).setHours(0, 0, 0, 0);
                const d2 = new Date().setHours(0, 0, 0, 0);
                return d1 > d2;
            }

            // Assignee based
            if (filterStatus === 'ASSIGNED_ME') {
                return task.assignees?.some((a: any) => a.userId === session?.user?.id);
            }
            if (filterStatus === 'FOLLOWING') {
                return task.observers?.some((o: any) => o.userId === session?.user?.id);
            }
            if (filterStatus === 'UNASSIGNED') {
                return !task.assignees || task.assignees.length === 0;
            }

            // Other 
            if (filterStatus === 'RECURRING') {
                return task.isRecurring;
            }

            return true;
        });
    }, [initialTasks, filterStatus, session?.user?.id]);

    const filterCounts = React.useMemo(() => {
        let all = 0;
        let todo = 0, inProgress = 0, review = 0, done = 0, overdue = 0;

        initialTasks.forEach((task: any) => {
            if (task.status === 'TODO') todo++;
            else if (task.status === 'IN_PROGRESS') inProgress++;
            else if (task.status === 'REVIEW') review++;
            else if (task.status === 'DONE') done++;

            if (task.status !== 'DONE') all++; // Re-calculate 'all' to mean 'all active'

            if (isOverdue(task.dueDate, task.status)) overdue++;
        });

        return { all, todo, inProgress, review, done, overdue };
    }, [initialTasks]);

    const sortedTasks = React.useMemo(() => {
        if (!sortField) return filteredTasks;

        return [...filteredTasks].sort((a, b) => {
            let valA, valB;

            switch (sortField) {
                case 'title':
                    valA = a.title?.toLowerCase() || '';
                    valB = b.title?.toLowerCase() || '';
                    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                case 'dueDate':
                    valA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                    valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                case 'priority':
                    const pOrder: any = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'URGENT': 4 };
                    valA = pOrder[a.priority] || 0;
                    valB = pOrder[b.priority] || 0;
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                case 'assignees':
                    valA = a.assignees?.map((x: any) => x.user.name || x.user.email).join(', ').toLowerCase() || '';
                    valB = b.assignees?.map((x: any) => x.user.name || x.user.email).join(', ').toLowerCase() || '';
                    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                    return 0;
                default:
                    return 0;
            }
        });
    }, [filteredTasks, sortField, sortDirection]);

    const { paginatedItems, paginationProps } = usePagination(sortedTasks, 20);

    // Derived progress
    const renderProgress = (task: any) => {
        if (!task.checklists || task.checklists.length === 0) return '-';
        const done = task.checklists.filter((c: any) => c.isCompleted).length;
        const total = task.checklists.length;
        const percent = Math.round((done / total) * 100);
        return `${done}/${total} (${percent}%)`;
    }

    const handleCreate = async () => {
        if (!title.trim() || !session?.user?.id) return;
        setIsSaving(true);

        const payload: any = {
            title,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate) : null,
            startDate: startDate ? new Date(startDate) : null,
            status: 'TODO',
            assignees: selectedAssignees,
            observers: selectedObservers
        };

        if (isRecurring) {
            payload.recurrence = {
                isRecurring: true,
                frequency: recurrenceFreq,
                count: parseInt(recurrenceCount as any) || 1
            };
        }

        if (selectedLink && linkType) {
            if (linkType === 'CUSTOMER') payload.customerId = selectedLink.id;
            else if (linkType === 'CONTRACT') payload.contractId = selectedLink.id;
            else if (linkType === 'QUOTE') payload.quoteId = selectedLink.id;
            else if (linkType === 'HANDOVER') payload.handoverId = selectedLink.id;
            else if (linkType === 'PAYMENT_REQ') payload.paymentReqId = selectedLink.id;
            else if (linkType === 'DISPATCH') payload.dispatchId = selectedLink.id;
            else if (linkType === 'LEAD') payload.leadId = selectedLink.id;
            else if (linkType === 'APPENDIX') payload.appendixId = selectedLink.id;
            else if (linkType === 'SUPPLIER') payload.supplierId = selectedLink.id;
            else if (linkType === 'EXPENSE') payload.expenseId = selectedLink.id;
            else if (linkType === 'PURCHASE_ORDER') payload.purchaseOrderId = selectedLink.id;
            else if (linkType === 'PURCHASE_BILL') payload.purchaseBillId = selectedLink.id;
            else if (linkType === 'PURCHASE_PAYMENT') payload.purchasePaymentId = selectedLink.id;
            else if (linkType === 'SALES_ORDER') payload.salesOrderId = selectedLink.id;
            else if (linkType === 'SALES_INVOICE') payload.salesInvoiceId = selectedLink.id;
            else if (linkType === 'SALES_ESTIMATE') payload.salesEstimateId = selectedLink.id;
            else if (linkType === 'SALES_PAYMENT') payload.salesPaymentId = selectedLink.id;
        }

        if (parentProjectId) {
            payload.parentTaskId = parentProjectId;
            payload.isProject = false;
        }

        // Always inherit parent project links if we are creating a sub-task inside a project
        if (parentProject) {
            if (parentProject.customerId) payload.customerId = parentProject.customerId;
            if (parentProject.contractId) payload.contractId = parentProject.contractId;
            if (parentProject.quoteId) payload.quoteId = parentProject.quoteId;
            if (parentProject.leadId) payload.leadId = parentProject.leadId;
            if (parentProject.salesOrderId) payload.salesOrderId = parentProject.salesOrderId;
            if (parentProject.salesInvoiceId) payload.salesInvoiceId = parentProject.salesInvoiceId;
        }

        try {
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
            setLinkType('');
            setSearchQuery('');
            setSelectedLink(null);
            setSearchResults([]);

            router.refresh();
        } finally {
            setIsSaving(false);
        }
    }

    const openEditModal = (task: any) => {
        setEditingTaskId(task.id);
        setEditTitle(task.title);
        setEditDescription(task.description || '');
        setEditPriority(task.priority || 'MEDIUM');
        setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
        setEditStartDate(task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '');
        setEditSelectedAssignees(task.assignees?.map((a: any) => a.userId) || []);
        setEditSelectedObservers(task.observers?.map((o: any) => o.userId) || []);

        setEditIsRecurring(task.isRecurring || false);
        setEditRecurrenceFreq(task.recurrenceRule || 'MONTHLY');
        setEditRecurrenceCount(2); // Provide a default count when editing to enable generating more

        setEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTaskId || !editTitle.trim() || !session?.user?.id) return;
        setIsSaving(true);
        try {
            const payload: any = {
                title: editTitle,
                description: editDescription,
                priority: editPriority,
                dueDate: editDueDate ? new Date(editDueDate) : null,
                startDate: editStartDate ? new Date(editStartDate) : null,
                assignees: editSelectedAssignees,
                observers: editSelectedObservers
            };

            if (editIsRecurring) {
                payload.recurrence = {
                    isRecurring: true,
                    frequency: editRecurrenceFreq,
                    count: parseInt(editRecurrenceCount as any) || 1
                };
            } else {
                payload.recurrence = {
                    isRecurring: false
                };
            }

            await updateTask(editingTaskId, payload, session.user.id);
            setEditModalOpen(false);
            setEditingTaskId(null);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        if (!session?.user?.id) return;
        await updateTaskStatus(id, newStatus, session.user.id);
        router.refresh();
    }

    const handleDelete = async (id: string) => {
        if (confirm('Xóa công việc này?')) {
            await deleteTask(id);
            router.refresh();
        }
    }

    const handleExportCSV = () => {
        if (!sortedTasks || sortedTasks.length === 0) return;

        const csvRows = [
            ['Tên Công Việc', 'Người Phụ Trách', 'Mức Độ', 'Hạn Chót', 'Tình Trạng', 'Tiến Độ']
        ];

        sortedTasks.forEach((task: any) => {
            const assigneesNames = task.assignees?.map((a: any) => a.user.name || a.user.email).join(', ') || 'Chưa gán';
            const dueDateStr = task.dueDate ? formatDate(new Date(task.dueDate)) : '-';

            let progress = '-';
            if (task.checklists && task.checklists.length > 0) {
                const done = task.checklists.filter((c: any) => c.isCompleted).length;
                const total = task.checklists.length;
                const percent = Math.round((done / total) * 100);
                progress = `${done}/${total} (${percent}%)`;
            }

            const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

            csvRows.push([
                escapeCsv(task.title || ''),
                escapeCsv(assigneesNames),
                escapeCsv(task.priority || ''),
                escapeCsv(dueDateStr),
                escapeCsv(task.status || ''),
                escapeCsv(progress)
            ]);
        });

        const csvString = '\uFEFF' + csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `danh-sach-cong-viec-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const filterOptions = [
        { id: 'ALL', label: 'TẤT CẢ', icon: List, count: filterCounts.all, color: { bg: '#faf5ff', text: '#9333ea', border: '#e9d5ff', iconBg: '#f3e8ff' } },
        { id: 'TODO', label: 'CẦN LÀM', icon: Clock, count: filterCounts.todo, color: { bg: '#fffbeb', text: '#d97706', border: '#fde047', iconBg: '#fef3c7' } },
        { id: 'IN_PROGRESS', label: 'ĐANG LÀM', icon: Loader2, count: filterCounts.inProgress, color: { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe', iconBg: '#dbeafe' } },
        { id: 'REVIEW', label: 'CHỜ DUYỆT', icon: Search, count: filterCounts.review, color: { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd', iconBg: '#e0f2fe' } },
        { id: 'DONE', label: 'HOÀN THÀNH', icon: CheckCircle2, count: filterCounts.done, color: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', iconBg: '#dcfce7' } },
        { id: 'OVERDUE', label: 'QUÁ HẠN', icon: AlertTriangle, count: filterCounts.overdue, color: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', iconBg: '#fee2e2' } },
    ];

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {filterOptions.map((f) => {
                    const isActive = filterStatus === f.id;
                    const Icon = f.icon;
                    return (
                        <div
                            key={f.id}
                            style={{
                                padding: '1.25rem',
                                cursor: 'pointer',
                                border: isActive ? `2px solid ${f.color.text}` : `1px solid ${f.color.border}`,
                                backgroundColor: f.color.bg,
                                color: f.color.text,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isActive ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)';
                                    e.currentTarget.style.borderColor = f.color.text;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgb(0 0 0 / 0.05)';
                                    e.currentTarget.style.borderColor = f.color.border;
                                }
                            }}
                            onClick={() => setFilterStatus(f.id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.5px' }}>{f.label}</span>
                                <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: f.color.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={18} />
                                </div>
                            </div>
                            <div style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1 }}>
                                {f.count}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {canCreate && (
                    <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                        <Plus size={18} /> Giao Việc Mới
                    </Button>
                )}
                <Button variant="secondary" onClick={handleExportCSV} className="gap-2">
                    <Download size={18} /> Xuất Báo Cáo
                </Button>

                {/* Advanced Filter Dropdown */}
                <div style={{ position: 'relative' }}>
                    <Button
                        variant={filterStatus === 'ALL' ? 'secondary' : 'primary'}
                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                        className="gap-2"
                    >
                        <Filter size={18} /> Lọc ({filterStatus}) <ChevronDown size={14} />
                    </Button>
                    {isFilterMenuOpen && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                            backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '6px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                            zIndex: 50, width: '240px', paddingTop: '0.5rem', paddingBottom: '0.5rem', overflow: 'hidden'
                        }}>
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {/* Group: All */}
                                <div
                                    onClick={() => { setFilterStatus('ALL'); setIsFilterMenuOpen(false); }}
                                    style={{ padding: '8px 16px', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: filterStatus === 'ALL' ? 'var(--surface)' : 'white', fontWeight: filterStatus === 'ALL' ? 600 : 400 }}
                                    onMouseOver={(e: any) => e.target.style.backgroundColor = 'var(--surface)'}
                                    onMouseOut={(e: any) => e.target.style.backgroundColor = filterStatus === 'ALL' ? 'var(--surface)' : 'white'}
                                >
                                    Toàn bộ
                                </div>
                                <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />

                                {/* Group: Status */}
                                <div style={{ padding: '4px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Trạng Thái</div>
                                {[{ id: 'TODO', label: 'Cần làm' }, { id: 'IN_PROGRESS', label: 'Đang làm' }, { id: 'REVIEW', label: 'Chờ duyệt' }, { id: 'DONE', label: 'Hoàn thành' }, { id: 'PAUSED', label: 'Tạm ngưng' }, { id: 'CANCELLED', label: 'Đã hủy' }].map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => { setFilterStatus(item.id); setIsFilterMenuOpen(false); }}
                                        style={{ padding: '8px 16px', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: filterStatus === item.id ? 'var(--surface)' : 'white', fontWeight: filterStatus === item.id ? 600 : 400 }}
                                        onMouseOver={(e: any) => e.target.style.backgroundColor = 'var(--surface)'}
                                        onMouseOut={(e: any) => e.target.style.backgroundColor = filterStatus === item.id ? 'var(--surface)' : 'white'}
                                    >
                                        {item.label}
                                    </div>
                                ))}
                                <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />

                                {/* Group: Time */}
                                <div style={{ padding: '4px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Thời Gian</div>
                                {[{ id: 'TODAY', label: 'Hôm nay' }, { id: 'OVERDUE', label: 'Quá hạn' }, { id: 'UPCOMING', label: 'Sắp tới' }].map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => { setFilterStatus(item.id); setIsFilterMenuOpen(false); }}
                                        style={{ padding: '8px 16px', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: filterStatus === item.id ? 'var(--surface)' : 'white', fontWeight: filterStatus === item.id ? 600 : 400 }}
                                        onMouseOver={(e: any) => e.target.style.backgroundColor = 'var(--surface)'}
                                        onMouseOut={(e: any) => e.target.style.backgroundColor = filterStatus === item.id ? 'var(--surface)' : 'white'}
                                    >
                                        {item.label}
                                    </div>
                                ))}
                                <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />

                                {/* Group: Assignment */}
                                <div style={{ padding: '4px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Người Thực Hiện</div>
                                {[{ id: 'ASSIGNED_ME', label: 'Giao cho tôi' }, { id: 'FOLLOWING', label: 'Tôi đang theo dõi' }, { id: 'UNASSIGNED', label: 'Chưa phân công' }].map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => { setFilterStatus(item.id); setIsFilterMenuOpen(false); }}
                                        style={{ padding: '8px 16px', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: filterStatus === item.id ? 'var(--surface)' : 'white', fontWeight: filterStatus === item.id ? 600 : 400 }}
                                        onMouseOver={(e: any) => e.target.style.backgroundColor = 'var(--surface)'}
                                        onMouseOut={(e: any) => e.target.style.backgroundColor = filterStatus === item.id ? 'var(--surface)' : 'white'}
                                    >
                                        {item.label}
                                    </div>
                                ))}
                                <div style={{ borderBottom: '1px solid var(--border)', margin: '4px 0' }} />

                                {/* Group: Other */}
                                <div style={{ padding: '4px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Loại Công Việc</div>
                                {[{ id: 'RECURRING', label: 'Định kỳ (Lặp lại)' }].map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => { setFilterStatus(item.id); setIsFilterMenuOpen(false); }}
                                        style={{ padding: '8px 16px', fontSize: '0.9rem', cursor: 'pointer', backgroundColor: filterStatus === item.id ? 'var(--surface)' : 'white', fontWeight: filterStatus === item.id ? 600 : 400 }}
                                        onMouseOver={(e: any) => e.target.style.backgroundColor = 'var(--surface)'}
                                        onMouseOut={(e: any) => e.target.style.backgroundColor = filterStatus === item.id ? 'var(--surface)' : 'white'}
                                    >
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            <Card>
                <div style={{ overflowX: 'auto' }}>
                    <Table>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Tên Công Việc
                                        {sortField === 'title' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('assignees')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Người Phụ Trách
                                        {sortField === 'assignees' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Mức Độ
                                        {sortField === 'priority' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('startDate')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Ngày Bắt Đầu
                                        {sortField === 'startDate' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('dueDate')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Deadline
                                        {sortField === 'dueDate' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                    </div>
                                </th>
                                <th>Liên Quan</th>
                                <th>Tình Trạng</th>
                                <th>Tiến Độ</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.map((task: any) => {
                                const assigneesNames = task.assignees?.map((a: any) => a.user.name || a.user.email).join(', ') || 'Chưa gán';
                                const isDueSoon = task.dueDate && new Date(task.dueDate).getTime() - new Date().getTime() < 86400000 && task.status !== 'DONE';

                                let rowClass = 'transition-colors';
                                let rowStyle: React.CSSProperties = {};

                                if (task.status === 'PAUSED') {
                                    rowClass = 'transition-colors bg-yellow-200';
                                } else if (task.status !== 'DONE' && task.status !== 'CANCELLED') {
                                    if (task.priority === 'URGENT') {
                                        rowStyle = { animation: 'priority-urgent-bg-blink 1.5s linear infinite' };
                                        rowClass = '';
                                    } else if (task.priority === 'HIGH') {
                                        rowStyle = { animation: 'priority-high-bg-blink 2s ease-in-out infinite' };
                                        rowClass = '';
                                    }
                                }

                                return (
                                    <tr key={task.id} className={rowClass} style={rowStyle}>
                                        <td>
                                            <div style={{ fontWeight: 500, color: isDueSoon ? 'var(--danger)' : 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
                                                <Link href={`/tasks/${task.id}`} className="text-blue-600 hover:underline">
                                                    {task.title}
                                                </Link>
                                            </div>
                                            {task.contract && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hợp đồng: {task.contract.title}</div>}
                                            {task.customer && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Khách hàng: {task.customer.name}</div>}
                                        </td>
                                        <td>{assigneesNames}</td>
                                        <td>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                backgroundColor: task.priority === 'URGENT' ? 'var(--danger)' : (task.priority === 'HIGH' ? 'var(--warning)' : '#e2e8f0'),
                                                color: task.priority === 'URGENT' || task.priority === 'HIGH' ? '#fff' : '#000'
                                            }}>
                                                {task.priority}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-main)' }}>
                                            {task.startDate ? formatDate(new Date(task.startDate)) : '-'}
                                        </td>
                                        <td style={{ color: isDueSoon ? 'var(--danger)' : 'inherit' }}>
                                            {task.dueDate ? formatDate(new Date(task.dueDate)) : '-'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem' }}>
                                                {task.leadId && task.lead && <div><span style={{ color: 'var(--text-muted)' }}>Cơ hội:</span> <Link href={`/leads/${task.leadId}`} className="text-blue-600 hover:underline">{task.lead.name}</Link></div>}
                                                {task.customerId && task.customer && <div><span style={{ color: 'var(--text-muted)' }}>Khách hàng:</span> <Link href={`/customers/${task.customerId}`} className="text-blue-600 hover:underline">{task.customer.name}</Link></div>}
                                                {task.contractId && task.contract && <div><span style={{ color: 'var(--text-muted)' }}>Hợp đồng:</span> <Link href={`/contracts/${task.contractId}`} className="text-blue-600 hover:underline">{task.contract.title}</Link></div>}
                                                {task.appendixId && task.appendix && <div><span style={{ color: 'var(--text-muted)' }}>Phụ lục HĐ:</span> <Link href={`/contract-appendices/${task.appendixId}`} className="text-blue-600 hover:underline">{task.appendix.title}</Link></div>}
                                                {task.quoteId && task.quote && <div><span style={{ color: 'var(--text-muted)' }}>Báo giá:</span> <Link href={`/quotes/${task.quoteId}`} className="text-blue-600 hover:underline">{task.quote.title}</Link></div>}
                                                {task.handoverId && task.handover && <div><span style={{ color: 'var(--text-muted)' }}>Bàn giao:</span> <Link href={`/handovers/${task.handoverId}`} className="text-blue-600 hover:underline">{task.handover.title}</Link></div>}
                                                {task.paymentReqId && task.paymentReq && <div><span style={{ color: 'var(--text-muted)' }}>Đ/N thanh toán:</span> <Link href={`/payment-requests/${task.paymentReqId}`} className="text-blue-600 hover:underline">{task.paymentReq.title}</Link></div>}
                                                {task.dispatchId && task.dispatch && <div><span style={{ color: 'var(--text-muted)' }}>Công văn:</span> <Link href={`/dispatches/${task.dispatchId}`} className="text-blue-600 hover:underline">{task.dispatch.title}</Link></div>}

                                                {task.supplierId && task.supplier && <div><span style={{ color: 'var(--text-muted)' }}>Nhà C.Cấp:</span> <Link href={`/suppliers/${task.supplierId}`} className="text-blue-600 hover:underline">{task.supplier.name}</Link></div>}
                                                {task.purchaseOrderId && task.purchaseOrder && <div><span style={{ color: 'var(--text-muted)' }}>Đơn mua:</span> <Link href={`/purchasing/orders/${task.purchaseOrderId}`} className="text-blue-600 hover:underline">{task.purchaseOrder.code}</Link></div>}
                                                {task.purchaseBillId && task.purchaseBill && <div><span style={{ color: 'var(--text-muted)' }}>Hóa đơn mua:</span> <Link href={`/purchasing/bills/${task.purchaseBillId}`} className="text-blue-600 hover:underline">{task.purchaseBill.code}</Link></div>}
                                                {task.purchasePaymentId && task.purchasePayment && <div><span style={{ color: 'var(--text-muted)' }}>Phiếu chi (Mua):</span> <Link href={`/purchasing/payments/${task.purchasePaymentId}`} className="text-blue-600 hover:underline">{task.purchasePayment.code}</Link></div>}
                                                {task.expenseId && task.expense && <div><span style={{ color: 'var(--text-muted)' }}>Phiếu chi:</span> <Link href={`/sales/expenses/${task.expenseId}`} className="text-blue-600 hover:underline">{task.expense.description || task.expense.code}</Link></div>}

                                                {task.salesOrderId && task.salesOrder && <div><span style={{ color: 'var(--text-muted)' }}>Đơn hàng (Sales):</span> <Link href={`/sales/orders/${task.salesOrderId}`} className="text-blue-600 hover:underline">{task.salesOrder.code}</Link></div>}
                                                {task.salesInvoiceId && task.salesInvoice && <div><span style={{ color: 'var(--text-muted)' }}>Hóa đơn (Sales):</span> <Link href={`/sales/invoices/${task.salesInvoiceId}`} className="text-blue-600 hover:underline">{task.salesInvoice.code}</Link></div>}
                                                {task.salesEstimateId && task.salesEstimate && <div><span style={{ color: 'var(--text-muted)' }}>Báo giá (ERP):</span> <Link href={`/sales/estimates/${task.salesEstimateId}`} className="text-blue-600 hover:underline">{task.salesEstimate.code}</Link></div>}
                                                {task.salesPaymentId && task.salesPayment && <div><span style={{ color: 'var(--text-muted)' }}>Phiếu thu:</span> <Link href={`/sales/payments/${task.salesPaymentId}`} className="text-blue-600 hover:underline">{task.salesPayment.code}</Link></div>}

                                                {!task.customerId && !task.contractId && !task.quoteId && !task.handoverId && !task.paymentReqId && !task.dispatchId && !task.salesOrderId && !task.salesInvoiceId && !task.salesEstimateId && !task.salesPaymentId && !task.leadId && !task.appendixId && !task.supplierId && !task.expenseId && !task.purchaseOrderId && !task.purchaseBillId && !task.purchasePaymentId && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <select
                                                value={task.status}
                                                onChange={(e) => canEdit ? updateStatus(task.id, e.target.value) : null}
                                                disabled={!canEdit}
                                                style={{
                                                    padding: '4px 8px', borderRadius: 'var(--radius)',
                                                    border: '1px solid var(--border)', fontSize: '0.85rem',
                                                    backgroundColor: 'transparent', cursor: canEdit ? 'pointer' : 'default'
                                                }}
                                            >
                                                <option value="TODO">Cần Làm</option>
                                                <option value="IN_PROGRESS">Đang Xử Lý</option>
                                                <option value="REVIEW">Chờ Duyệt</option>
                                                <option value="DONE">Hoàn Thành</option>
                                                <option value="PAUSED">Tạm Ngưng</option>
                                                <option value="CANCELLED">Đã Hủy</option>
                                            </select>
                                        </td>
                                        <td>{renderProgress(task)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <Link href={`/tasks/${task.id}`}>
                                                    <button style={{ color: 'var(--primary)', padding: '4px' }} title="Chi tiết"><MessageSquare size={18} /></button>
                                                </Link>
                                                {canEdit && (
                                                    <button onClick={() => openEditModal(task)} style={{ color: 'var(--text-main)', padding: '4px' }} title="Sửa">
                                                        <Edit2 size={18} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button onClick={() => handleDelete(task.id)} style={{ color: 'var(--danger)', padding: '4px' }} title="Xóa">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {initialTasks.length === 0 && (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        Chưa có công việc nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                    <Pagination {...paginationProps} />
                </div>
            </Card >

            <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Giao Việc Mới">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Tên công việc <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="Nhập tên công việc" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Mô tả chi tiết</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '100px' }} placeholder="Nhập mô tả chi tiết..." />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Người phụ trách</label>
                            <select
                                multiple
                                value={selectedAssignees}
                                onChange={e => {
                                    const options = Array.from(e.target.selectedOptions);
                                    setSelectedAssignees(options.map(o => o.value));
                                }}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '120px' }}>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--text-muted)' }}>Bấm <kbd>Ctrl</kbd> hoặc kéo thả để chọn nhiều người.</small>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Người theo dõi</label>
                            <select
                                multiple
                                value={selectedObservers}
                                onChange={e => {
                                    const options = Array.from(e.target.selectedOptions);
                                    setSelectedObservers(options.map(o => o.value));
                                }}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '120px' }}>
                                {availableUsersForAssign.map(u => (
                                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                ))}
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
                                <option value="URGENT">Khẩn cấp (Urgent)</option>
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
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--primary)' }}>Liên kết thẻ liên quan</label>
                            <select
                                value={linkType}
                                onChange={e => { setLinkType(e.target.value); setSelectedLink(null); setSearchQuery(''); setSearchResults([]); }}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                                <option value="">-- Không liên kết --</option>
                                <option value="LEAD">Cơ hội bán hàng</option>
                                <option value="CUSTOMER">Khách Hàng</option>
                                <option value="QUOTE">Báo Giá (Sales)</option>
                                <option value="SALES_ESTIMATE">Báo Giá (ERP)</option>
                                <option value="CONTRACT">Hợp Đồng</option>
                                <option value="APPENDIX">Phụ Lục Hợp Đồng</option>
                                <option value="SALES_ORDER">Đơn Đặt Hàng (Sales)</option>
                                <option value="SALES_INVOICE">Hóa Đơn Bán</option>
                                <option value="SALES_PAYMENT">Phiếu Thu</option>
                                <option value="HANDOVER">Biên Bản Bàn Giao</option>
                                <option value="PAYMENT_REQ">Đề Nghị Thanh Toán</option>
                                <option value="EXPENSE">Phiếu Chi (Sales)</option>
                                <option value="DISPATCH">Công Văn</option>
                                <option value="SUPPLIER">Nhà Cung Cấp</option>
                                <option value="PURCHASE_ORDER">Đơn Mua Hàng</option>
                                <option value="PURCHASE_BILL">Hóa Đơn Mua</option>
                                <option value="PURCHASE_PAYMENT">Phiếu Chi (Mua Hàng)</option>
                            </select>

                            {linkType && !selectedLink && (
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="Gõ để tìm kiếm..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                                    />
                                    {searchResults.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                            {searchResults.map(res => (
                                                <div
                                                    key={res.id}
                                                    style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                                    onClick={() => { setSelectedLink(res); setSearchResults([]); setSearchQuery(''); }}
                                                >
                                                    {res.name || res.title}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedLink && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: 'var(--radius)' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedLink.name || selectedLink.title}</span>
                                    <button onClick={() => setSelectedLink(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                </div>
                            )}
                        </div>

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
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Số lần tạo:</span>
                                        <input
                                            type="number"
                                            min="2" max="100"
                                            value={recurrenceCount}
                                            onChange={e => setRecurrenceCount(parseInt(e.target.value))}
                                            style={{ width: '80px', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <small style={{ color: 'var(--text-muted)' }}>Hệ thống sẽ tạo {recurrenceCount || 0} công việc tự cộng ngày hạn chót.</small>
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
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>* Các công việc sẽ được tự động tạo và kế thừa thông tin.</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleCreate} disabled={isSaving || !title.trim()}>
                            {isSaving ? 'Đang tạo...' : 'Tạo Công Việc'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Chỉnh Sửa Công Việc">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Tên công việc <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="Nhập tên công việc" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Mô tả chi tiết</label>
                        <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '100px' }} placeholder="Nhập mô tả chi tiết..." />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Người phụ trách</label>
                            <select
                                multiple
                                value={editSelectedAssignees}
                                onChange={e => {
                                    const options = Array.from(e.target.selectedOptions);
                                    setEditSelectedAssignees(options.map(o => o.value));
                                }}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '120px' }}>
                                {availableUsersForAssign.map(u => (
                                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--text-muted)' }}>Bấm <kbd>Ctrl</kbd> hoặc kéo thả để chọn nhiều người.</small>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Người theo dõi</label>
                            <select
                                multiple
                                value={editSelectedObservers}
                                onChange={e => {
                                    const options = Array.from(e.target.selectedOptions);
                                    setEditSelectedObservers(options.map(o => o.value));
                                }}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '120px' }}>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Mức độ ưu tiên</label>
                            <select value={editPriority} onChange={e => setEditPriority(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                <option value="LOW">Thấp (Low)</option>
                                <option value="MEDIUM">Trung Bình (Medium)</option>
                                <option value="HIGH">Cao (High)</option>
                                <option value="URGENT">Khẩn cấp (Urgent)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Ngày bắt đầu</label>
                            <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Deadline</label>
                            <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                        </div>
                    </div>

                    {/* Recurrence Settings for Edit */}
                    <div style={{ marginTop: '0.5rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: editIsRecurring ? '#f8fafc' : 'white' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}>
                            <input type="checkbox" checked={editIsRecurring} onChange={(e) => setEditIsRecurring(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                            Lặp lại định kỳ (Tự động sinh việc)
                        </label>

                        <div style={{
                            marginTop: editIsRecurring ? '1rem' : '0',
                            height: editIsRecurring ? 'auto' : '0',
                            overflow: 'hidden',
                            opacity: editIsRecurring ? 1 : 0,
                            transition: 'all 0.3s'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Ngày bắt đầu chu kỳ</label>
                                    <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Tần suất lặp</label>
                                    <select value={editRecurrenceFreq} onChange={e => setEditRecurrenceFreq(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                        <option value="DAILY">Hàng ngày</option>
                                        <option value="WEEKLY">Hàng tuần</option>
                                        <option value="MONTHLY">Hàng tháng</option>
                                        <option value="QUARTERLY">Hàng quý</option>
                                        <option value="BIANNUALLY">Nửa năm</option>
                                        <option value="YEARLY">Hàng năm</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Số việc tạo thêm</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input type="number" min="1" max="60" value={editRecurrenceCount} onChange={e => setEditRecurrenceCount(e.target.value)} style={{ width: '100px', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center' }} />
                                    </div>
                                </div>
                                <div style={{ gridColumn: 'span 3' }}>
                                    <small style={{ color: 'var(--text-muted)' }}>Mặc định sẽ lưu dưới dạng 1 task mẹ gốc và tạo thêm N task mới theo hạn chót tịnh tiến bắt đầu từ Ngày bắt đầu chu kỳ.</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving || !editTitle.trim()}>
                            {isSaving ? 'Đang lưu...' : 'Cập Nhật Công Việc'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div >
    );
}
