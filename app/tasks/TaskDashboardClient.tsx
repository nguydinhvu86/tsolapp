'use client'
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { UserMultiSelect } from '@/app/components/ui/UserMultiSelect';
import { Plus, Trash2, MessageSquare, Edit2, ChevronUp, ChevronDown, Download, List, Clock, Loader2, Search, CheckCircle2, AlertTriangle, Filter, X, Check, ArrowUpDown, Eye, Building2, FileText, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createTask, updateTaskStatus, deleteTask, searchEntities, updateTask, startTaskTimer, stopTaskTimer } from './actions';
import Link from 'next/link';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import GanttChart from '@/app/components/GanttChart';

function formatTimer(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h${m}m${s}s`;
    if (m > 0) return `${m}m${s}s`;
    return `${s}s`;
}

function getInitials(name: string) {
    if (!name) return 'U';
    const clean = name.trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getStatusBadgeClass(status: string) {
    switch (status) {
        case 'TODO': return 'bg-amber-50 text-amber-700 border-amber-200';
        case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'REVIEW': return 'bg-sky-50 text-sky-700 border-sky-200';
        case 'DONE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'PAUSED': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'CANCELLED': return 'bg-slate-100 text-slate-500 border-slate-200';
        default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
}

function TimerCell({ task, session }: { task: any, session: any }) {
    const [elapsed, setElapsed] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(false);
    
    const activeLog = task.timeLogs?.find((l: any) => l.userId === session?.user?.id && !l.endTime);

    React.useEffect(() => {
        if (activeLog && activeLog.startTime) {
            const start = new Date(activeLog.startTime).getTime();
            // initialize immediately
            setElapsed(Math.floor((new Date().getTime() - start) / 1000));
            const interval = setInterval(() => {
                setElapsed(Math.floor((new Date().getTime() - start) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setElapsed(0);
        }
    }, [activeLog]);

    const handleStart = async (e: any) => {
        e.stopPropagation();
        setIsLoading(true);
        try {
            await startTaskTimer(task.id);
        } catch (err: any) {
            alert(err.message || 'Lỗi khi bắt đầu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStop = async (e: any) => {
        e.stopPropagation();
        setIsLoading(true);
        try {
            await stopTaskTimer(task.id);
        } catch (err: any) {
            alert(err.message || 'Lỗi khi dừng');
        } finally {
            setIsLoading(false);
        }
    };

    const totalDurationSec = task.timeLogs?.reduce((sum: number, l: any) => sum + (l.durationSec || 0), 0) || 0;
    const currentTotal = totalDurationSec + elapsed;
    const hours = Math.floor(currentTotal / 3600);
    const mins = Math.floor((currentTotal % 3600) / 60);
    const timeDisplay = hours > 0 ? `${hours}h${mins}m` : (mins > 0 ? `${mins}m` : '0m');

    if (activeLog) {
        return (
            <div className="flex flex-col items-center justify-center gap-1 min-w-[90px] whitespace-nowrap">
                <button 
                    onClick={handleStop} 
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-1 h-[24px] px-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold shadow-2xs animate-pulse cursor-pointer transition-all whitespace-nowrap shrink-0"
                >
                    {isLoading ? '...' : `⏹ Dừng (${formatTimer(elapsed)})`}
                </button>
            </div>
        );
    } else {
        return (
            <div className="flex flex-col items-center justify-center gap-0.5 min-w-[90px] whitespace-nowrap">
                <button 
                    onClick={handleStart} 
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-1 h-[22px] px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 rounded text-[10px] font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                >
                    {isLoading ? '...' : `▶ Bắt Đầu`}
                </button>
                <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap leading-tight mt-0.5">{timeDisplay}</span>
            </div>
        );
    }
}

export function TaskDashboardClient({ 
    initialTasks, 
    users, 
    parentProjectId, 
    parentProject,
    canCreateTask = true
}: { 
    initialTasks: any[], 
    users: any[], 
    parentProjectId?: string, 
    parentProject?: any,
    canCreateTask?: boolean 
}) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    // Quyền tạo/sửa/xóa công việc
    const canCreate = canCreateTask ?? true;
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
    const [editDependencies, setEditDependencies] = useState<string[]>([]);
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

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('action') === 'new' && canCreate) {
                setCreateModalOpen(true);
                window.history.replaceState({}, '', '/tasks');
            }
        }
    }, [canCreate]);

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

    // View Mode State
    const [viewMode, setViewMode] = useState<'LIST' | 'GANTT'>('LIST');

    // Search State
    const [globalFilter, setGlobalFilter] = useState('');

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
            const query = globalFilter ? globalFilter.toLowerCase() : '';
            if (query) {
                const matchesSearch = (
                    (task.title?.toLowerCase().includes(query)) ||
                    (task.description?.toLowerCase().includes(query)) ||
                    (task.status?.toLowerCase().includes(query)) ||
                    (task.customer?.name?.toLowerCase().includes(query))
                );
                if (!matchesSearch) return false;
            }

            // Hide tasks that start > 10 days in the future
            if (task.startDate) {
                const threshold = new Date().getTime() + 10 * 24 * 60 * 60 * 1000;
                if (new Date(task.startDate).getTime() > threshold) return false;
            }

            // Hide future/past recurring tasks unless in RECURRING tab
            if (filterStatus !== 'RECURRING' && task.isRecurring) {
                if (!activeRecurringIds.has(task.id)) return false;
            }

            if (filterStatus === 'ALL') {
                if (globalFilter && globalFilter.trim() !== '') return true;
                return task.status !== 'DONE' && task.status !== 'CANCELLED';
            }

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

    // Prepare Gantt Data
    const ganttTasks = React.useMemo(() => {
        return filteredTasks
            .filter((t: any) => t.startDate || t.dueDate) // Tasks must have dates
            .map((t: any) => {
                const startDateStr = t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : new Date(t.dueDate).toISOString().split('T')[0];
                let endDateStr = t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : startDateStr;
                
                // Gantt requires end >= start
                if (new Date(endDateStr) < new Date(startDateStr)) endDateStr = startDateStr;

                const progress = t.checklists?.length > 0 
                                 ? Math.round((t.checklists.filter((c:any)=>c.isCompleted).length / t.checklists.length)*100) 
                                 : (t.status === 'DONE' ? 100 : (t.status === 'IN_PROGRESS' ? 50 : 0));

                const deps = t.dependencies?.map((d: any) => d.dependsOnId).join(', ') || '';

                return {
                    id: t.id,
                    name: t.title,
                    start: startDateStr,
                    end: endDateStr,
                    progress: progress,
                    dependencies: deps,
                    custom_class: t.status === 'DONE' ? 'bar-done' : (t.priority === 'URGENT' ? 'bar-urgent' : '')
                };
            });
    }, [filteredTasks]);

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
            payload.projectId = parentProjectId;
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
        setEditDependencies(task.dependencies?.map((d: any) => d.dependsOnId) || []);

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
                observers: editSelectedObservers,
                dependencies: editDependencies
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
        { id: 'ALL', label: 'TẤT CẢ', sub: 'Đang xử lý', icon: List, count: filterCounts.all, colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
        { id: 'TODO', label: 'CẦN LÀM', sub: 'Chưa bắt đầu', icon: Clock, count: filterCounts.todo, colorClass: 'text-amber-600 bg-amber-50 border-amber-200' },
        { id: 'IN_PROGRESS', label: 'ĐANG LÀM', sub: 'Đang triển khai', icon: Loader2, count: filterCounts.inProgress, colorClass: 'text-blue-600 bg-blue-50 border-blue-200' },
        { id: 'REVIEW', label: 'CHỜ DUYỆT', sub: 'Đang nghiệm thu', icon: Search, count: filterCounts.review, colorClass: 'text-sky-600 bg-sky-50 border-sky-200' },
        { id: 'DONE', label: 'HOÀN THÀNH', sub: 'Đã hoàn tất', icon: CheckCircle2, count: filterCounts.done, colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
        { id: 'OVERDUE', label: 'QUÁ HẠN', sub: 'Cần xử lý ngay', icon: AlertTriangle, count: filterCounts.overdue, colorClass: 'text-rose-600 bg-rose-50 border-rose-200' },
    ];

    return (
        <div className="flex flex-col gap-5">
            {/* Top Page Tech Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Workspace &amp; Tiến độ
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">|</span>
                        <span className="text-[11px] font-medium text-slate-500">Quản lý &amp; Điều phối công việc đa dự án</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Quản lý Công Việc (Tasks)</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                            {initialTasks.length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    {canCreate && (
                        <Button
                            onClick={() => setCreateModalOpen(true)}
                            className="btn btn-primary gap-2 h-[34px] px-3.5 text-xs font-bold rounded-lg shadow-sm"
                        >
                            <Plus size={15} className="stroke-[2.5]" />
                            <span>Giao Việc Mới</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Quick KPI Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {filterOptions.map((f) => {
                    const isActive = filterStatus === f.id;
                    const Icon = f.icon;
                    const isOverdueAlert = f.id === 'OVERDUE' && f.count > 0;
                    return (
                        <div
                            key={f.id}
                            onClick={() => setFilterStatus(f.id)}
                            className={`cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border shadow-xs hover:-translate-y-0.5 hover:shadow-sm relative overflow-hidden ${
                                isOverdueAlert && !isActive ? 'border-rose-300 ring-2 ring-rose-300/40 animate-pulse' : ''
                            } ${
                                isActive
                                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                                    : 'border-slate-200/90 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isOverdueAlert ? 'text-rose-600 font-extrabold' : 'text-slate-500'}`}>
                                    {f.label}
                                </span>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${f.colorClass} border shadow-2xs`}>
                                    <Icon size={14} className="stroke-[2.2]" />
                                </div>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <span className={`text-2xl font-black font-mono tracking-tight ${isOverdueAlert ? 'text-rose-600' : 'text-slate-900'}`}>
                                    {f.count}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {f.sub}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Data Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Search & Actions Toolbar */}
                <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row justify-between md:items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-[280px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên, mô tả, khách hàng..."
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="w-full h-[34px] pl-9 pr-8 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-2xs"
                            />
                            {globalFilter && (
                                <button
                                    onClick={() => setGlobalFilter('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Filter Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                className="h-[34px] px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                            >
                                <Filter size={13} className="text-slate-500" />
                                <span>Lọc: {filterStatus}</span>
                                <ChevronDown size={12} className="text-slate-400" />
                            </button>
                            {isFilterMenuOpen && (
                                <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 max-h-96 overflow-y-auto">
                                    <div
                                        onClick={() => { setFilterStatus('ALL'); setIsFilterMenuOpen(false); }}
                                        className={`px-3 py-2 text-xs cursor-pointer font-medium hover:bg-slate-50 flex items-center justify-between ${filterStatus === 'ALL' ? 'text-primary bg-emerald-50/50 font-bold' : 'text-slate-700'}`}
                                    >
                                        <span>Toàn bộ đang xử lý</span>
                                        {filterStatus === 'ALL' && <Check size={13} className="text-primary" />}
                                    </div>
                                    <div className="my-1 border-t border-slate-100" />
                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng Thái</div>
                                    {[
                                        { id: 'TODO', label: 'Cần làm' },
                                        { id: 'IN_PROGRESS', label: 'Đang làm' },
                                        { id: 'REVIEW', label: 'Chờ duyệt' },
                                        { id: 'DONE', label: 'Hoàn thành' },
                                        { id: 'PAUSED', label: 'Tạm ngưng' },
                                        { id: 'CANCELLED', label: 'Đã hủy' }
                                    ].map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => { setFilterStatus(item.id); setIsFilterMenuOpen(false); }}
                                            className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 flex items-center justify-between ${filterStatus === item.id ? 'text-primary bg-emerald-50/50 font-bold' : 'text-slate-700'}`}
                                        >
                                            <span>{item.label}</span>
                                            {filterStatus === item.id && <Check size={13} className="text-primary" />}
                                        </div>
                                    ))}
                                    <div className="my-1 border-t border-slate-100" />
                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thời Gian</div>
                                    {[
                                        { id: 'TODAY', label: 'Hôm nay' },
                                        { id: 'OVERDUE', label: 'Quá hạn' },
                                        { id: 'UPCOMING', label: 'Sắp tới' }
                                    ].map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => { setFilterStatus(item.id); setIsFilterMenuOpen(false); }}
                                            className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 flex items-center justify-between ${filterStatus === item.id ? 'text-primary bg-emerald-50/50 font-bold' : 'text-slate-700'}`}
                                        >
                                            <span>{item.label}</span>
                                            {filterStatus === item.id && <Check size={13} className="text-primary" />}
                                        </div>
                                    ))}
                                    <div className="my-1 border-t border-slate-100" />
                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Người Thực Hiện</div>
                                    {[
                                        { id: 'ASSIGNED_ME', label: 'Giao cho tôi' },
                                        { id: 'FOLLOWING', label: 'Tôi theo dõi' },
                                        { id: 'UNASSIGNED', label: 'Chưa phân công' }
                                    ].map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => { setFilterStatus(item.id); setIsFilterMenuOpen(false); }}
                                            className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 flex items-center justify-between ${filterStatus === item.id ? 'text-primary bg-emerald-50/50 font-bold' : 'text-slate-700'}`}
                                        >
                                            <span>{item.label}</span>
                                            {filterStatus === item.id && <Check size={13} className="text-primary" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* View Switcher */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setViewMode('LIST')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                    viewMode === 'LIST'
                                        ? 'bg-white text-slate-900 shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <List size={13} />
                                <span>Dạng Bảng</span>
                            </button>
                            <button
                                onClick={() => setViewMode('GANTT')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                    viewMode === 'GANTT'
                                        ? 'bg-white text-slate-900 shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Clock size={13} />
                                <span>Gantt</span>
                            </button>
                        </div>

                        {/* Export CSV */}
                        <button
                            onClick={handleExportCSV}
                            className="h-[34px] px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
                        >
                            <Download size={13} className="text-slate-500" />
                            <span>Xuất CSV</span>
                        </button>

                        <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-slate-900 font-bold">{filteredTasks.length}</span> việc
                        </span>
                    </div>
                </div>

                {viewMode === 'LIST' && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/90 bg-slate-100/70">
                                    <th onClick={() => handleSort('title')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            TÊN CÔNG VIỆC
                                            {sortField === 'title' ? (sortDirection === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('assignees')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[180px] min-w-[160px] whitespace-nowrap hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            NGƯỜI PHỤ TRÁCH
                                            {sortField === 'assignees' ? (sortDirection === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('priority')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[110px] min-w-[95px] whitespace-nowrap hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            MỨC ĐỘ
                                            {sortField === 'priority' ? (sortDirection === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('startDate')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[105px] min-w-[95px] whitespace-nowrap hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            BẮT ĐẦU
                                            {sortField === 'startDate' ? (sortDirection === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('dueDate')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[105px] min-w-[95px] whitespace-nowrap hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            DEADLINE
                                            {sortField === 'dueDate' ? (sortDirection === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[170px] min-w-[150px] whitespace-nowrap">LIÊN QUAN</th>
                                    <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[130px] min-w-[115px] whitespace-nowrap">TÌNH TRẠNG</th>
                                    <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center w-[110px] min-w-[100px] whitespace-nowrap">THỜI GIAN</th>
                                    <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[110px] min-w-[100px] whitespace-nowrap">TIẾN ĐỘ</th>
                                    <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right w-[90px] min-w-[80px] whitespace-nowrap">THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedItems.map((task: any) => {
                                    const overdue = isOverdue(task.dueDate, task.status);
                                    const isDueSoon = task.dueDate && new Date(task.dueDate).getTime() - new Date().getTime() < 86400000 && task.status !== 'DONE';

                                    return (
                                        <tr 
                                            key={task.id} 
                                            className={`transition-all border-b border-slate-100 last:border-0 group ${
                                                overdue 
                                                    ? 'animate-overdue-row border-l-4 border-l-rose-500 shadow-2xs' 
                                                    : 'hover:bg-slate-50/80'
                                            }`}
                                        >
                                            {/* Title */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                <div className="flex items-start gap-2">
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={`/tasks/${task.id}`}
                                                            className={`font-semibold text-xs hover:text-primary transition-colors block truncate max-w-[280px] sm:max-w-[340px] ${
                                                                overdue ? 'text-rose-950 font-bold' : 'text-slate-900'
                                                            }`}
                                                        >
                                                            {task.title}
                                                        </Link>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {overdue && (
                                                                <span className="animate-overdue-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-rose-300">
                                                                    <AlertTriangle size={10} className="text-rose-600 animate-pulse" />
                                                                    QUÁ HẠN
                                                                </span>
                                                            )}
                                                            {task.contract && (
                                                                <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={task.contract.title}>
                                                                    HĐ: {task.contract.title}
                                                                </span>
                                                            )}
                                                            {task.customer && !task.contract && (
                                                                <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={task.customer.name}>
                                                                    KH: {task.customer.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Assignees */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                {task.assignees && task.assignees.length > 0 ? (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {task.assignees.slice(0, 2).map((a: any, idx: number) => (
                                                            <span
                                                                key={a.id || idx}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium max-w-[130px] truncate shadow-2xs"
                                                                title={a.user?.name || a.user?.email}
                                                            >
                                                                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold inline-flex items-center justify-center shrink-0">
                                                                    {getInitials(a.user?.name || a.user?.email)}
                                                                </span>
                                                                <span className="truncate">{a.user?.name || a.user?.email}</span>
                                                            </span>
                                                        ))}
                                                        {task.assignees.length > 2 && (
                                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                +{task.assignees.length - 2}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">Chưa gán</span>
                                                )}
                                            </td>

                                            {/* Priority */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                {task.priority === 'URGENT' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                        Khẩn cấp
                                                    </span>
                                                )}
                                                {task.priority === 'HIGH' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                                        Cao
                                                    </span>
                                                )}
                                                {task.priority === 'MEDIUM' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                                        Vừa
                                                    </span>
                                                )}
                                                {task.priority === 'LOW' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                                                        Thấp
                                                    </span>
                                                )}
                                            </td>

                                            {/* Start Date */}
                                            <td className="py-2.5 px-3.5 align-middle font-mono text-xs text-slate-600">
                                                {task.startDate ? formatDate(new Date(task.startDate)) : (task.createdAt ? formatDate(new Date(task.createdAt)) : '-')}
                                            </td>

                                            {/* Due Date */}
                                            <td className="py-2.5 px-3.5 align-middle font-mono text-xs">
                                                {task.dueDate ? (
                                                    <span className={
                                                        overdue 
                                                            ? 'inline-flex items-center gap-1 text-rose-700 font-extrabold bg-rose-100/90 px-2 py-0.5 rounded border border-rose-300 shadow-2xs' 
                                                            : (isDueSoon ? 'text-amber-600 font-semibold' : 'text-slate-700')
                                                    }>
                                                        {overdue && <Clock size={11} className="text-rose-600 animate-pulse shrink-0" />}
                                                        {formatDate(new Date(task.dueDate))}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>

                                            {/* Related Entity */}
                                            <td className="py-2.5 px-3.5 align-middle text-xs text-slate-600">
                                                <div className="flex flex-col gap-1 max-w-[160px]">
                                                    {task.leadId && task.lead && (
                                                        <Link href={`/leads/${task.leadId}`} className="text-slate-700 hover:text-primary truncate block font-medium">
                                                            Cơ hội: {task.lead.name}
                                                        </Link>
                                                    )}
                                                    {task.customerId && task.customer && (
                                                        <Link href={`/customers/${task.customerId}`} className="text-slate-700 hover:text-primary truncate block font-medium">
                                                            KH: {task.customer.name}
                                                        </Link>
                                                    )}
                                                    {task.contractId && task.contract && (
                                                        <Link href={`/contracts/${task.contractId}`} className="text-slate-700 hover:text-primary truncate block font-medium">
                                                            HĐ: {task.contract.title}
                                                        </Link>
                                                    )}
                                                    {task.salesInvoiceId && task.salesInvoice && (
                                                        <Link href={`/sales/invoices/${task.salesInvoiceId}`} className="text-primary hover:underline truncate block font-mono text-[11px] font-bold">
                                                            HĐ (Sales): {task.salesInvoice.code}
                                                        </Link>
                                                    )}
                                                    {task.salesOrderId && task.salesOrder && (
                                                        <Link href={`/sales/orders/${task.salesOrderId}`} className="text-primary hover:underline truncate block font-mono text-[11px] font-bold">
                                                            Đơn: {task.salesOrder.code}
                                                        </Link>
                                                    )}
                                                    {task.salesEstimateId && task.salesEstimate && (
                                                        <Link href={`/sales/estimates/${task.salesEstimateId}`} className="text-primary hover:underline truncate block font-mono text-[11px] font-bold">
                                                            Báo giá: {task.salesEstimate.code}
                                                        </Link>
                                                    )}
                                                    {task.purchaseOrderId && task.purchaseOrder && (
                                                        <Link href={`/purchasing/orders/${task.purchaseOrderId}`} className="text-blue-600 hover:underline truncate block font-mono text-[11px] font-bold">
                                                            Đơn mua: {task.purchaseOrder.code}
                                                        </Link>
                                                    )}
                                                    {task.purchaseBillId && task.purchaseBill && (
                                                        <Link href={`/purchasing/bills/${task.purchaseBillId}`} className="text-blue-600 hover:underline truncate block font-mono text-[11px] font-bold">
                                                            HĐ mua: {task.purchaseBill.code}
                                                        </Link>
                                                    )}
                                                    {!task.customerId && !task.contractId && !task.salesOrderId && !task.salesInvoiceId && !task.salesEstimateId && !task.purchaseOrderId && !task.purchaseBillId && !task.leadId && (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                <select
                                                    value={task.status}
                                                    onChange={(e) => canEdit ? updateStatus(task.id, e.target.value) : null}
                                                    disabled={!canEdit}
                                                    className={`text-xs font-semibold px-2 py-1 rounded-md border shadow-2xs transition-all cursor-pointer focus:outline-none ${getStatusBadgeClass(task.status)}`}
                                                >
                                                    <option value="TODO">Cần Làm</option>
                                                    <option value="IN_PROGRESS">Đang Xử Lý</option>
                                                    <option value="REVIEW">Chờ Duyệt</option>
                                                    <option value="DONE">Hoàn Thành</option>
                                                    <option value="PAUSED">Tạm Ngưng</option>
                                                    <option value="CANCELLED">Đã Hủy</option>
                                                </select>
                                            </td>

                                            {/* Time Tracking */}
                                            <td className="py-2.5 px-3.5 align-middle text-center whitespace-nowrap">
                                                <TimerCell task={task} session={session} />
                                            </td>

                                            {/* Progress */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                {task.checklists && task.checklists.length > 0 ? (
                                                    <div className="flex flex-col gap-1 w-20">
                                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200/50">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    task.checklists.filter((c: any) => c.isCompleted).length === task.checklists.length
                                                                        ? 'bg-emerald-500'
                                                                        : 'bg-primary'
                                                                }`}
                                                                style={{
                                                                    width: `${Math.round((task.checklists.filter((c: any) => c.isCompleted).length / task.checklists.length) * 100)}%`
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-500 font-semibold">
                                                            {task.checklists.filter((c: any) => c.isCompleted).length}/{task.checklists.length} ({Math.round((task.checklists.filter((c: any) => c.isCompleted).length / task.checklists.length) * 100)}%)
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-2.5 px-3.5 align-middle text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/tasks/${task.id}`}
                                                        className="p-1 text-slate-400 hover:text-primary hover:bg-emerald-50 rounded transition-colors"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye size={14} />
                                                    </Link>
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => openEditModal(task)}
                                                            className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                                                            title="Sửa"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDelete(task.id)}
                                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {sortedTasks.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <Search size={18} />
                                                </div>
                                                <p className="text-xs font-semibold text-slate-600">Không có công việc nào</p>
                                                <p className="text-[11px] text-slate-400">Không tìm thấy công việc phù hợp với bộ lọc hiện tại.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {sortedTasks.length > 0 && (
                            <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
                                <Pagination {...paginationProps} />
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'GANTT' && (
                    <div className="p-5 bg-slate-50/50">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock size={16} className="text-primary" />
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tiến Độ Dự Án (Gantt Chart)</h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
                            <GanttChart 
                                tasks={ganttTasks} 
                                viewMode="Day"
                                onTaskClick={(t) => openEditModal(filteredTasks.find((task: any) => task.id === t.id))}
                                onDateChange={async (t, start, end) => {
                                    if (!session?.user?.id) return;
                                    await updateTask(t.id, { startDate: new Date(start), dueDate: new Date(end) }, session.user.id);
                                    router.refresh();
                                }}
                            />
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400">
                            * Kéo thả thanh timeline để thay đổi ngày bắt đầu/deadline. Nhấp đúp vào thanh để xem chi tiết.
                        </p>
                    </div>
                )}
            </div>

            {/* Create Task Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Giao Việc Mới" maxWidth="640px">
                <div className="flex flex-col gap-3.5 pt-1 text-slate-800">
                    <div>
                        <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                            <span>Tên công việc <span className="text-rose-500 font-bold">*</span></span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                            className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                            placeholder="Nhập tên công việc cần giao..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Mô tả chi tiết
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all placeholder:text-slate-400 resize-y shadow-2xs leading-relaxed"
                            placeholder="Nhập mô tả chi tiết công việc..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Người phụ trách
                            </label>
                            <UserMultiSelect
                                users={users}
                                selectedUserIds={selectedAssignees}
                                onChange={setSelectedAssignees}
                                placeholder="Chọn người phụ trách..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Người theo dõi
                            </label>
                            <UserMultiSelect
                                users={availableUsersForAssign}
                                selectedUserIds={selectedObservers}
                                onChange={setSelectedObservers}
                                placeholder="Chọn người theo dõi..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Mức độ ưu tiên
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full h-[38px] px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all shadow-2xs cursor-pointer text-slate-700"
                            >
                                <option value="LOW">🟢 Thấp (Low)</option>
                                <option value="MEDIUM">🔵 Trung Bình (Medium)</option>
                                <option value="HIGH">🟠 Cao (High)</option>
                                <option value="URGENT">🔴 Khẩn Cấp (Urgent)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Ngày bắt đầu
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-[38px] px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all shadow-2xs text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Deadline
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full h-[38px] px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all shadow-2xs text-slate-700"
                            />
                        </div>
                    </div>

                    {/* Linked Entity Selector */}
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Liên kết đối tượng liên quan (Hợp đồng, Báo giá, Dự án...)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <select
                                value={linkType}
                                onChange={(e) => {
                                    setLinkType(e.target.value);
                                    setSelectedLink(null);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                }}
                                className="w-full h-[36px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-slate-700"
                            >
                                <option value="">-- Không liên kết --</option>
                                <option value="PROJECT">Dự Án</option>
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
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Gõ để tìm kiếm..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-[36px] px-3 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-[160px] overflow-y-auto">
                                            {searchResults.map((res) => (
                                                <div
                                                    key={res.id}
                                                    className="p-2 text-xs hover:bg-slate-100 cursor-pointer border-b border-slate-100 last:border-none"
                                                    onClick={() => {
                                                        setSelectedLink(res);
                                                        setSearchResults([]);
                                                        setSearchQuery('');
                                                    }}
                                                >
                                                    {res.name || res.title}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedLink && (
                                <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                                    <span className="truncate">{selectedLink.name || selectedLink.title}</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedLink(null)}
                                        className="text-rose-500 hover:text-rose-700 p-0.5"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recurrence Section */}
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 transition-all">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                <span>Lặp lại định kỳ</span>
                                {isRecurring && (
                                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                                        Đang bật
                                    </span>
                                )}
                            </span>
                        </label>

                        {isRecurring && (
                            <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-col gap-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                            Tần suất lặp
                                        </label>
                                        <select
                                            value={recurrenceFreq}
                                            onChange={(e) => setRecurrenceFreq(e.target.value)}
                                            className="w-full h-[34px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        >
                                            <option value="DAILY">Hàng ngày</option>
                                            <option value="MONTHLY">Hàng tháng</option>
                                            <option value="QUARTERLY">Mỗi 3 tháng (Quý)</option>
                                            <option value="BIANNUALLY">Mỗi 6 tháng (Nửa năm)</option>
                                            <option value="YEARLY">Hàng năm</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                            Số lần lặp thêm
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={recurrenceCount}
                                            onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 1)}
                                            className="w-full h-[34px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                        />
                                    </div>
                                </div>

                                {previewDates.length > 0 && (
                                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                                        <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                                            <span>Lịch trình dự kiến:</span>
                                            <span className="text-[10px] text-emerald-600 font-mono font-semibold">{previewDates.length} mốc thời gian</span>
                                        </div>
                                        <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                                            {previewDates.map((d, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between text-[11px] px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-600"
                                                >
                                                    <span className={index === 0 ? 'font-bold text-emerald-700' : 'text-slate-600'}>
                                                        {index === 0 ? 'Lần 1 (Gốc):' : `Lần ${index + 1}:`}
                                                    </span>
                                                    <span className="font-mono font-medium">{formatDate(d)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-slate-200/80 mt-1">
                        <button
                            type="button"
                            onClick={() => setCreateModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={isSaving || !title.trim()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                    <span>Đang tạo...</span>
                                </>
                            ) : (
                                <>
                                    <Plus size={14} strokeWidth={2.5} />
                                    <span>Tạo Công Việc</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Task Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Chỉnh Sửa Công Việc" maxWidth="640px">
                <div className="flex flex-col gap-3.5 pt-1 text-slate-800">
                    <div>
                        <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                            <span>Tên công việc <span className="text-rose-500 font-bold">*</span></span>
                        </label>
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                            placeholder="Nhập tên công việc"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Mô tả chi tiết
                        </label>
                        <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all placeholder:text-slate-400 resize-y shadow-2xs leading-relaxed"
                            placeholder="Nhập mô tả chi tiết..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Người phụ trách
                            </label>
                            <UserMultiSelect
                                users={availableUsersForAssign}
                                selectedUserIds={editSelectedAssignees}
                                onChange={setEditSelectedAssignees}
                                placeholder="Chọn người phụ trách..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Người theo dõi
                            </label>
                            <UserMultiSelect
                                users={users}
                                selectedUserIds={editSelectedObservers}
                                onChange={setEditSelectedObservers}
                                placeholder="Chọn người theo dõi..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Mức độ ưu tiên
                            </label>
                            <select
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value)}
                                className="w-full h-[38px] px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all shadow-2xs cursor-pointer text-slate-700"
                            >
                                <option value="LOW">🟢 Thấp (Low)</option>
                                <option value="MEDIUM">🔵 Trung Bình (Medium)</option>
                                <option value="HIGH">🟠 Cao (High)</option>
                                <option value="URGENT">🔴 Khẩn Cấp (Urgent)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Ngày bắt đầu
                            </label>
                            <input
                                type="date"
                                value={editStartDate}
                                onChange={(e) => setEditStartDate(e.target.value)}
                                className="w-full h-[38px] px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all shadow-2xs text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Deadline
                            </label>
                            <input
                                type="date"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                                className="w-full h-[38px] px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all shadow-2xs text-slate-700"
                            />
                        </div>
                    </div>

                    {/* Recurrence Settings for Edit */}
                    <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 transition-all">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={editIsRecurring}
                                onChange={(e) => setEditIsRecurring(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-slate-800">
                                Lặp lại định kỳ (Tự động sinh việc)
                            </span>
                        </label>

                        {editIsRecurring && (
                            <div className="mt-3 pt-3 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Ngày bắt đầu chu kỳ
                                    </label>
                                    <input
                                        type="date"
                                        value={editStartDate}
                                        onChange={(e) => setEditStartDate(e.target.value)}
                                        className="w-full h-[34px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Tần suất lặp
                                    </label>
                                    <select
                                        value={editRecurrenceFreq}
                                        onChange={(e) => setEditRecurrenceFreq(e.target.value)}
                                        className="w-full h-[34px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                    >
                                        <option value="DAILY">Hàng ngày</option>
                                        <option value="WEEKLY">Hàng tuần</option>
                                        <option value="MONTHLY">Hàng tháng</option>
                                        <option value="QUARTERLY">Hàng quý</option>
                                        <option value="BIANNUALLY">Nửa năm</option>
                                        <option value="YEARLY">Hàng năm</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Số việc tạo thêm
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={editRecurrenceCount}
                                        onChange={(e) => setEditRecurrenceCount(e.target.value)}
                                        className="w-full h-[34px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-2.5 border-t border-slate-200/80 mt-1">
                        <button
                            type="button"
                            onClick={() => setEditModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={isSaving || !editTitle.trim()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                    <span>Đang lưu...</span>
                                </>
                            ) : (
                                <>
                                    <Check size={14} strokeWidth={2.5} />
                                    <span>Cập Nhật Công Việc</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
