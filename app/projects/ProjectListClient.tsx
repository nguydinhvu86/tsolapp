'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Plus,
    Trash2,
    Edit3,
    List,
    LayoutDashboard,
    Search,
    X,
    Briefcase,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle,
    PauseCircle,
    XCircle,
    Building2,
    DollarSign,
    ArrowUpDown,
    ExternalLink,
    Flame
} from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { formatDate } from '@/lib/utils/formatters';
import { createProject, updateProject, deleteProject } from './actions';

interface ProjectListClientProps {
    initialProjects: any[];
    users: any[];
    customers?: any[];
}

export function ProjectListClient({
    initialProjects = [],
    users = [],
    customers = [],
}: ProjectListClientProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = isAdmin || permissions.includes('PROJECTS_CREATE');
    const canEdit = isAdmin || permissions.includes('PROJECTS_EDIT');
    const canDelete = isAdmin || permissions.includes('PROJECTS_DELETE');

    const [isMounted, setIsMounted] = useState(false);
    const [localProjects, setLocalProjects] = useState<any[]>(initialProjects);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        setLocalProjects(initialProjects);
    }, [initialProjects]);

    // View & Filters State
    const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN'>('LIST');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [priorityFilter, setPriorityFilter] = useState('ALL');
    const [customerFilter, setCustomerFilter] = useState('ALL');
    const [memberFilter, setMemberFilter] = useState('ALL');

    // Sorting State
    const [sortField, setSortField] = useState<string>('createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Create Modal State
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [status, setStatus] = useState('PLANNING');
    const [dueDate, setDueDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [estimatedValue, setEstimatedValue] = useState<number | ''>('');
    const [budget, setBudget] = useState<number | ''>('');
    const [estimatedDuration, setEstimatedDuration] = useState('');
    const [tags, setTags] = useState('');
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editPriority, setEditPriority] = useState('MEDIUM');
    const [editStatus, setEditStatus] = useState('PLANNING');
    const [editDueDate, setEditDueDate] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editCustomerId, setEditCustomerId] = useState('');
    const [editEstimatedValue, setEditEstimatedValue] = useState<number | ''>('');
    const [editBudget, setEditBudget] = useState<number | ''>('');
    const [editEstimatedDuration, setEditEstimatedDuration] = useState('');
    const [editTags, setEditTags] = useState('');
    const [editSelectedAssignees, setEditSelectedAssignees] = useState<string[]>([]);

    const customerOptions = useMemo(() => [
        { value: '', label: '-- Không chọn khách hàng --' },
        ...(customers?.map(c => ({
            value: c.id,
            label: `${c.name}${c.code ? ` (${c.code})` : ''}`
        })) || [])
    ], [customers]);

    // KPI Metrics calculation
    const metrics = useMemo(() => {
        const total = localProjects.length;
        const inProgress = localProjects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'RUNNING').length;
        const planning = localProjects.filter(p => p.status === 'PLANNING' || p.status === 'TODO').length;
        const completed = localProjects.filter(p => p.status === 'COMPLETED' || p.status === 'DONE').length;
        const totalBudget = localProjects.reduce((sum, p) => sum + (p.budget || p.estimatedValue || 0), 0);

        return { total, inProgress, planning, completed, totalBudget };
    }, [localProjects]);

    // Filtered & Sorted Projects
    const filteredProjects = useMemo(() => {
        return localProjects.filter((p: any) => {
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query ||
                (p.title || p.name || '').toLowerCase().includes(query) ||
                (p.code || '').toLowerCase().includes(query) ||
                (p.description || '').toLowerCase().includes(query) ||
                (p.customer?.name || '').toLowerCase().includes(query);

            const pStatus = p.status === 'TODO' ? 'PLANNING' : (p.status === 'DONE' ? 'COMPLETED' : p.status);
            const matchesStatus = statusFilter === 'ALL' || pStatus === statusFilter || p.status === statusFilter;
            const matchesPriority = priorityFilter === 'ALL' || p.priority === priorityFilter;
            const matchesCustomer = customerFilter === 'ALL' || p.customerId === customerFilter;
            const matchesMember = memberFilter === 'ALL' ||
                p.creatorId === memberFilter ||
                p.members?.some((m: any) => m.userId === memberFilter || m.user?.id === memberFilter) ||
                p.assignees?.some((a: any) => a.userId === memberFilter || a.user?.id === memberFilter);

            return matchesSearch && matchesStatus && matchesPriority && matchesCustomer && matchesMember;
        });
    }, [localProjects, searchQuery, statusFilter, priorityFilter, customerFilter, memberFilter]);

    const sortedProjects = useMemo(() => {
        return [...filteredProjects].sort((a: any, b: any) => {
            let valA: any = a[sortField];
            let valB: any = b[sortField];

            if (sortField === 'title') {
                valA = (a.title || a.name || '').toLowerCase();
                valB = (b.title || b.name || '').toLowerCase();
            } else if (sortField === 'customer') {
                valA = (a.customer?.name || '').toLowerCase();
                valB = (b.customer?.name || '').toLowerCase();
            } else if (sortField === 'progress') {
                valA = a.progress || 0;
                valB = b.progress || 0;
            } else if (sortField === 'estimatedValue') {
                valA = a.estimatedValue || a.budget || 0;
                valB = b.budget || b.estimatedValue || 0;
            } else if (sortField === 'dueDate') {
                valA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            } else if (sortField === 'createdAt') {
                valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredProjects, sortField, sortDirection]);

    const {
        paginatedItems: paginatedProjects,
        paginationProps
    } = usePagination<any>(sortedProjects, 15);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Drag & Drop for Kanban
    const onDragEnd = async (result: any) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId;
        const projectId = draggableId;

        const previousProjects = [...localProjects];
        const updatedLocalProjects = localProjects.map((p) => {
            if (p.id === projectId) return { ...p, status: newStatus };
            return p;
        });
        setLocalProjects(updatedLocalProjects);

        try {
            if (session?.user?.id) {
                await updateProject(projectId, { status: newStatus }, session.user.id);
                router.refresh();
            }
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái', error);
            setLocalProjects(previousProjects);
            alert('Lỗi cập nhật trạng thái dự án. Vui lòng kiểm tra quyền truy cập.');
        }
    };

    // Create Project Handler
    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !session?.user?.id) return;

        setIsSaving(true);
        try {
            await createProject({
                title: title.trim(),
                description: description.trim() || null,
                priority,
                status,
                startDate: startDate ? new Date(startDate) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                customerId: customerId || null,
                estimatedValue: estimatedValue ? Number(estimatedValue) : null,
                budget: budget ? Number(budget) : null,
                estimatedDuration: estimatedDuration.trim() || null,
                tags: tags.trim() || null,
                assignees: selectedAssignees,
            }, session.user.id);

            setCreateModalOpen(false);
            resetCreateForm();
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Lỗi khi tạo dự án');
        } finally {
            setIsSaving(false);
        }
    };

    const resetCreateForm = () => {
        setTitle('');
        setDescription('');
        setPriority('MEDIUM');
        setStatus('PLANNING');
        setDueDate('');
        setStartDate('');
        setCustomerId('');
        setEstimatedValue('');
        setBudget('');
        setEstimatedDuration('');
        setTags('');
        setSelectedAssignees([]);
    };

    // Edit Project Handlers
    const openEditModal = (p: any) => {
        setEditingProjectId(p.id);
        setEditTitle(p.title || p.name || '');
        setEditDescription(p.description || '');
        setEditPriority(p.priority || 'MEDIUM');
        setEditStatus(p.status === 'TODO' ? 'PLANNING' : (p.status === 'DONE' ? 'COMPLETED' : (p.status || 'PLANNING')));
        setEditStartDate(p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '');
        setEditDueDate(p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : '');
        setEditCustomerId(p.customerId || '');
        setEditEstimatedValue(p.estimatedValue || '');
        setEditBudget(p.budget || '');
        setEditEstimatedDuration(p.estimatedDuration || '');
        setEditTags(p.tags || '');
        setEditSelectedAssignees(
            p.members?.map((m: any) => m.userId || m.user?.id) ||
            p.assignees?.map((a: any) => a.userId || a.user?.id) || []
        );
        setEditModalOpen(true);
    };

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProjectId || !editTitle.trim() || !session?.user?.id) return;

        setIsSaving(true);
        try {
            await updateProject(editingProjectId, {
                title: editTitle.trim(),
                description: editDescription.trim() || null,
                priority: editPriority,
                status: editStatus,
                startDate: editStartDate ? new Date(editStartDate) : null,
                dueDate: editDueDate ? new Date(editDueDate) : null,
                customerId: editCustomerId || null,
                estimatedValue: editEstimatedValue ? Number(editEstimatedValue) : null,
                budget: editBudget ? Number(editBudget) : null,
                estimatedDuration: editEstimatedDuration.trim() || null,
                tags: editTags.trim() || null,
                assignees: editSelectedAssignees,
            }, session.user.id);

            setEditModalOpen(false);
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Lỗi khi cập nhật dự án');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProject = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa dự án "${name}"?\nTất cả công việc, thảo luận và tài liệu con sẽ bị xóa hoàn toàn.`)) return;

        try {
            await deleteProject(id);
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Lỗi khi xóa dự án');
        }
    };

    // Helper rendering badges
    const renderStatusBadge = (st: string) => {
        switch (st) {
            case 'PLANNING':
            case 'TODO':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-500" /> Chuẩn Bị
                    </span>
                );
            case 'IN_PROGRESS':
            case 'RUNNING':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <TrendingUp className="w-3 h-3 text-blue-500" /> Đang Chạy
                    </span>
                );
            case 'ON_HOLD':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <PauseCircle className="w-3 h-3 text-purple-500" /> Tạm Dừng
                    </span>
                );
            case 'COMPLETED':
            case 'DONE':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Hoàn Thành
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        <XCircle className="w-3 h-3 text-slate-400" /> Đã Hủy
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {st}
                    </span>
                );
        }
    };

    const renderPriorityBadge = (pr: string) => {
        switch (pr) {
            case 'URGENT':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                        <Flame className="w-3 h-3 text-red-500" /> Khẩn cấp
                    </span>
                );
            case 'HIGH':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                        Ưu tiên cao
                    </span>
                );
            case 'MEDIUM':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        Bình thường
                    </span>
                );
            case 'LOW':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Thấp
                    </span>
                );
            default:
                return <span className="text-xs text-gray-500">{pr}</span>;
        }
    };

    if (!isMounted) return null;

    return (
        <div className="space-y-6">
            {/* Top Header Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                        <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản Lý Dự Án</h1>
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {metrics.total} Dự án
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Theo dõi tiến độ, chi phí, ngân sách và đồng bộ giao dịch kinh doanh
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === 'LIST'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <List className="w-4 h-4" /> Danh sách
                        </button>
                        <button
                            onClick={() => setViewMode('KANBAN')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === 'KANBAN'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <LayoutDashboard className="w-4 h-4" /> Kanban Board
                        </button>
                    </div>

                    {canCreate && (
                        <Button
                            variant="primary"
                            onClick={() => setCreateModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md shadow-indigo-100 transition-all"
                        >
                            <Plus className="w-4 h-4" /> Khởi Tạo Dự Án
                        </Button>
                    )}
                </div>
            </div>

            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng dự án</span>
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                            <Briefcase className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">{metrics.total}</span>
                        <span className="text-xs text-slate-400">toàn hệ thống</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm hover:border-blue-200 transition-all bg-gradient-to-br from-blue-50/30 to-white">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Đang thực hiện</span>
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-blue-700">{metrics.inProgress}</span>
                        <span className="text-xs text-blue-600">dự án đang chạy</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm hover:border-amber-200 transition-all bg-gradient-to-br from-amber-50/30 to-white">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Lập kế hoạch</span>
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-amber-700">{metrics.planning}</span>
                        <span className="text-xs text-amber-600">chuẩn bị khởi động</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm hover:border-emerald-200 transition-all bg-gradient-to-br from-emerald-50/30 to-white">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Đã hoàn thành</span>
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-emerald-700">{metrics.completed}</span>
                        <span className="text-xs text-emerald-600">nghiệm thu xong</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm hover:border-indigo-200 transition-all bg-gradient-to-br from-indigo-50/30 to-white">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Tổng Ngân Sách / Giá Trị</span>
                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-xl font-black text-indigo-700 block truncate" title={metrics.totalBudget.toLocaleString('vi-VN') + ' ₫'}>
                            {metrics.totalBudget.toLocaleString('vi-VN')} ₫
                        </span>
                        <span className="text-xs text-indigo-500">quy mô tài chính</span>
                    </div>
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex-1 flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative min-w-[240px] flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm dự án theo mã, tên, khách hàng, mô tả..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="py-2 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="PLANNING">Chuẩn bị / Planning</option>
                            <option value="IN_PROGRESS">Đang chạy / In Progress</option>
                            <option value="ON_HOLD">Tạm dừng / On Hold</option>
                            <option value="COMPLETED">Hoàn thành / Done</option>
                            <option value="CANCELLED">Đã hủy / Cancelled</option>
                        </select>
                    </div>

                    {/* Priority Filter */}
                    <div className="flex items-center gap-1.5">
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="py-2 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                            <option value="ALL">Tất cả độ ưu tiên</option>
                            <option value="URGENT">Khẩn cấp (Urgent)</option>
                            <option value="HIGH">Cao (High)</option>
                            <option value="MEDIUM">Trung bình (Medium)</option>
                            <option value="LOW">Thấp (Low)</option>
                        </select>
                    </div>

                    {/* Customer Filter */}
                    <div className="flex items-center gap-1.5">
                        <select
                            value={customerFilter}
                            onChange={(e) => setCustomerFilter(e.target.value)}
                            className="py-2 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 max-w-[180px] truncate"
                        >
                            <option value="ALL">Tất cả khách hàng</option>
                            {customers?.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Member Filter */}
                    <div className="flex items-center gap-1.5">
                        <select
                            value={memberFilter}
                            onChange={(e) => setMemberFilter(e.target.value)}
                            className="py-2 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 max-w-[160px] truncate"
                        >
                            <option value="ALL">Tất cả nhân sự</option>
                            {users?.map((u: any) => (
                                <option key={u.id} value={u.id}>
                                    {u.name || u.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reset Button */}
                    {(searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || customerFilter !== 'ALL' || memberFilter !== 'ALL') && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('ALL');
                                setPriorityFilter('ALL');
                                setCustomerFilter('ALL');
                                setMemberFilter('ALL');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 font-medium transition-all"
                        >
                            <X className="w-3.5 h-3.5" /> Xóa bộ lọc
                        </button>
                    )}
                </div>

                <div className="text-xs text-slate-500 font-medium whitespace-nowrap self-end lg:self-center">
                    Hiển thị <span className="font-bold text-slate-800">{filteredProjects.length}</span> / {localProjects.length} dự án
                </div>
            </div>

            {/* MAIN CONTENT: TABLE VIEW vs KANBAN VIEW */}
            {viewMode === 'LIST' ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    <th className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('code')}>
                                        <div className="flex items-center gap-1.5">
                                            Mã Dự Án
                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </th>
                                    <th className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 transition-colors min-w-[220px]" onClick={() => handleSort('title')}>
                                        <div className="flex items-center gap-1.5">
                                            Tên Dự Án
                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </th>
                                    <th className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('customer')}>
                                        <div className="flex items-center gap-1.5">
                                            Khách Hàng
                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </th>
                                    <th className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 transition-colors min-w-[150px]" onClick={() => handleSort('progress')}>
                                        <div className="flex items-center gap-1.5">
                                            Tiến Độ
                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </th>
                                    <th className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('estimatedValue')}>
                                        <div className="flex items-center gap-1.5">
                                            Giá Trị / Ngân Sách
                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </th>
                                    <th className="py-3.5 px-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('dueDate')}>
                                        <div className="flex items-center gap-1.5">
                                            Thời Hạn
                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </th>
                                    <th className="py-3.5 px-4">Thành Viên</th>
                                    <th className="py-3.5 px-4">Độ Ưu Tiên</th>
                                    <th className="py-3.5 px-4">Trạng Thái</th>
                                    <th className="py-3.5 px-4 text-right">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {paginatedProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Briefcase className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                                                <p className="font-medium text-slate-500">Không tìm thấy dự án phù hợp</p>
                                                <p className="text-xs text-slate-400">Hãy thử thay đổi từ khóa tìm kiếm hoặc điều kiện lọc</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedProjects.map((p: any) => {
                                        const projectTitle = p.title || p.name || 'Dự án không tên';
                                        const progress = p.progress ?? 0;
                                        const totalTasks = p.totalTasks ?? p.tasks?.length ?? 0;
                                        const completedTasks = p.completedTasks ?? p.tasks?.filter((t: any) => t.status === 'DONE').length ?? 0;
                                        const isOverdue = p.dueDate && new Date(p.dueDate).getTime() < Date.now() && p.status !== 'COMPLETED' && p.status !== 'DONE';

                                        const membersList = p.members || p.assignees || [];

                                        return (
                                            <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                        {p.code || 'PRJ'}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="flex flex-col">
                                                        <Link
                                                            href={`/projects/${p.id}`}
                                                            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
                                                        >
                                                            {projectTitle}
                                                        </Link>
                                                        {p.tags && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {p.tags.split(',').map((t: string, idx: number) => (
                                                                    <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                                                        #{t.trim()}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    {p.customer ? (
                                                        <Link
                                                            href={`/customers/${p.customer.id}`}
                                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600"
                                                        >
                                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                            {p.customer.name}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Chưa gắn KH</span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs font-semibold">
                                                            <span className={progress === 100 ? 'text-emerald-600' : 'text-indigo-600'}>
                                                                {progress}%
                                                            </span>
                                                            <span className="text-[11px] text-slate-400 font-normal">
                                                                {completedTasks}/{totalTasks} việc
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    progress === 100
                                                                        ? 'bg-emerald-500'
                                                                        : progress > 50
                                                                        ? 'bg-indigo-500'
                                                                        : 'bg-blue-400'
                                                                }`}
                                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-800 text-xs">
                                                            {(p.budget || p.estimatedValue || 0).toLocaleString('vi-VN')} ₫
                                                        </span>
                                                        {p.budget && p.estimatedValue && p.budget !== p.estimatedValue && (
                                                            <span className="text-[11px] text-slate-400">
                                                                Dự toán: {p.estimatedValue.toLocaleString('vi-VN')} ₫
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <div className="flex flex-col text-xs">
                                                        <span className={`font-medium ${isOverdue ? 'text-rose-600 font-bold flex items-center gap-1' : 'text-slate-700'}`}>
                                                            {isOverdue && <AlertCircle className="w-3 h-3 text-rose-500" />}
                                                            {p.dueDate ? formatDate(new Date(p.dueDate)) : 'Chưa định'}
                                                        </span>
                                                        {p.startDate && (
                                                            <span className="text-[11px] text-slate-400">
                                                                Từ: {formatDate(new Date(p.startDate))}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center -space-x-2 overflow-hidden max-w-[120px]">
                                                        {membersList.slice(0, 3).map((m: any, idx: number) => {
                                                            const u = m.user || m;
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    title={u.name || u.email}
                                                                    className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm flex-shrink-0"
                                                                >
                                                                    {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                                                                </div>
                                                            );
                                                        })}
                                                        {membersList.length > 3 && (
                                                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm flex-shrink-0">
                                                                +{membersList.length - 3}
                                                            </div>
                                                        )}
                                                        {membersList.length === 0 && (
                                                            <span className="text-xs text-slate-400">--</span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    {renderPriorityBadge(p.priority || 'MEDIUM')}
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    {renderStatusBadge(p.status || 'PLANNING')}
                                                </td>

                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                                                        <Link
                                                            href={`/projects/${p.id}`}
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                            title="Xem chi tiết"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </Link>

                                                        {canEdit && (
                                                            <button
                                                                onClick={() => openEditModal(p)}
                                                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                                title="Chỉnh sửa dự án"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDeleteProject(p.id, projectTitle)}
                                                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                                title="Xóa dự án"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {paginationProps.totalPages > 1 && (
                        <div className="p-4 border-t border-slate-200">
                            <Pagination {...paginationProps} />
                        </div>
                    )}
                </div>
            ) : (
                /* KANBAN BOARD VIEW */
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
                        {[
                            { id: 'PLANNING', title: 'Chuẩn Bị', countBg: 'bg-amber-100 text-amber-800', border: 'border-amber-200' },
                            { id: 'IN_PROGRESS', title: 'Đang Thực Hiện', countBg: 'bg-blue-100 text-blue-800', border: 'border-blue-200' },
                            { id: 'ON_HOLD', title: 'Tạm Dừng', countBg: 'bg-purple-100 text-purple-800', border: 'border-purple-200' },
                            { id: 'COMPLETED', title: 'Hoàn Thành', countBg: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200' },
                            { id: 'CANCELLED', title: 'Đã Hủy', countBg: 'bg-slate-100 text-slate-800', border: 'border-slate-200' }
                        ].map((col) => {
                            const colProjects = filteredProjects.filter((p: any) => {
                                const st = p.status === 'TODO' ? 'PLANNING' : (p.status === 'DONE' ? 'COMPLETED' : (p.status === 'RUNNING' ? 'IN_PROGRESS' : p.status));
                                return st === col.id;
                            });

                            return (
                                <div key={col.id} className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3 flex flex-col max-h-[calc(100vh-280px)] min-h-[400px]">
                                    {/* Column Header */}
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 px-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                                                {col.title}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.countBg}`}>
                                                {colProjects.length}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Droppable Area */}
                                    <Droppable droppableId={col.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`flex-1 overflow-y-auto space-y-3 p-1 rounded-xl transition-colors ${
                                                    snapshot.isDraggingOver ? 'bg-indigo-50/50 ring-2 ring-indigo-400 ring-dashed' : ''
                                                }`}
                                            >
                                                {colProjects.map((p: any, index: number) => {
                                                    const projectTitle = p.title || p.name || 'Dự án không tên';
                                                    const progress = p.progress ?? 0;
                                                    const totalTasks = p.totalTasks ?? p.tasks?.length ?? 0;
                                                    const completedTasks = p.completedTasks ?? p.tasks?.filter((t: any) => t.status === 'DONE').length ?? 0;
                                                    const membersList = p.members || p.assignees || [];

                                                    return (
                                                        <Draggable key={p.id} draggableId={p.id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group ${
                                                                        snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500 rotate-1' : ''
                                                                    }`}
                                                                >
                                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                                            {p.code || 'PRJ'}
                                                                        </span>
                                                                        {renderPriorityBadge(p.priority || 'MEDIUM')}
                                                                    </div>

                                                                    <Link
                                                                        href={`/projects/${p.id}`}
                                                                        className="font-bold text-slate-900 hover:text-indigo-600 text-sm line-clamp-2 transition-colors block mb-2"
                                                                    >
                                                                        {projectTitle}
                                                                    </Link>

                                                                    {p.customer && (
                                                                        <div className="flex items-center gap-1 text-xs text-slate-500 mb-3 truncate">
                                                                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                                            <span className="truncate">{p.customer.name}</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Progress */}
                                                                    <div className="space-y-1 mb-3">
                                                                        <div className="flex items-center justify-between text-[11px] font-semibold">
                                                                            <span className="text-slate-600">{progress}% hoàn thành</span>
                                                                            <span className="text-slate-400">{completedTasks}/{totalTasks} việc</span>
                                                                        </div>
                                                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-indigo-500 rounded-full"
                                                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Footer Info */}
                                                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                                                        <div className="flex items-center gap-1 font-semibold text-slate-700">
                                                                            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                                                                            {(p.budget || p.estimatedValue || 0).toLocaleString('vi-VN')} ₫
                                                                        </div>

                                                                        <div className="flex items-center -space-x-1.5">
                                                                            {membersList.slice(0, 2).map((m: any, idx: number) => {
                                                                                const u = m.user || m;
                                                                                return (
                                                                                    <div
                                                                                        key={idx}
                                                                                        title={u.name || u.email}
                                                                                        className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold border border-white"
                                                                                    >
                                                                                        {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    );
                                                })}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </DragDropContext>
            )}

            {/* CREATE PROJECT MODAL */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title="Khởi Tạo Dự Án Mới"
                maxWidth="880px"
            >
                <form onSubmit={handleCreateProject} className="space-y-4 p-1">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Tên dự án <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="VD: Triển khai hệ thống ERP cho Công ty ABC"
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Khách hàng liên quan
                            </label>
                            <SearchableSelect
                                options={customerOptions}
                                value={customerId}
                                onChange={(val) => setCustomerId(val)}
                                placeholder="Chọn khách hàng..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Trạng thái khởi tạo
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            >
                                <option value="PLANNING">Chuẩn Bị (Planning)</option>
                                <option value="IN_PROGRESS">Đang Thực Hiện (In Progress)</option>
                                <option value="ON_HOLD">Tạm Dừng (On Hold)</option>
                                <option value="COMPLETED">Hoàn Thành (Completed)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Mức độ ưu tiên
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            >
                                <option value="LOW">Thấp (Low)</option>
                                <option value="MEDIUM">Bình thường (Medium)</option>
                                <option value="HIGH">Ưu tiên cao (High)</option>
                                <option value="URGENT">Khẩn cấp (Urgent)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Ngày bắt đầu
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Hạn hoàn thành
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Giá trị dự toán (VNĐ)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={estimatedValue}
                                onChange={(e) => setEstimatedValue(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="VD: 50000000"
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Ngân sách chi tối đa (VNĐ)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={budget}
                                onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="VD: 35000000"
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Thời gian ước tính
                            </label>
                            <input
                                type="text"
                                value={estimatedDuration}
                                onChange={(e) => setEstimatedDuration(e.target.value)}
                                placeholder="VD: 3 tháng, 60 ngày"
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Thẻ quản lý (Tags cách nhau dấu phẩy)
                        </label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="ERP, Website, Setup, Q3..."
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Thành viên tham gia
                        </label>
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-slate-50">
                            {users.map((u: any) => {
                                const isSelected = selectedAssignees.includes(u.id);
                                return (
                                    <label
                                        key={u.id}
                                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs font-medium border transition-all select-none ${
                                            isSelected
                                                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs font-semibold'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedAssignees([...selectedAssignees, u.id]);
                                                } else {
                                                    setSelectedAssignees(selectedAssignees.filter(id => id !== u.id));
                                                }
                                            }}
                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                            {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <span className="truncate">{u.name || u.email}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Mô tả chi tiết dự án
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả phạm vi công việc, mục tiêu, yêu cầu kỹ thuật..."
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setCreateModalOpen(false)}
                            disabled={isSaving}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSaving || !title.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            {isSaving ? 'Đang tạo...' : 'Tạo Dự Án'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* EDIT PROJECT MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setEditModalOpen(false)}
                title="Chỉnh Sửa Thông Tin Dự Án"
                maxWidth="880px"
            >
                <form onSubmit={handleUpdateProject} className="space-y-4 p-1">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Tên dự án <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Khách hàng liên quan
                            </label>
                            <SearchableSelect
                                options={customerOptions}
                                value={editCustomerId}
                                onChange={(val) => setEditCustomerId(val)}
                                placeholder="Chọn khách hàng..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Trạng thái
                            </label>
                            <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            >
                                <option value="PLANNING">Chuẩn Bị (Planning)</option>
                                <option value="IN_PROGRESS">Đang Thực Hiện (In Progress)</option>
                                <option value="ON_HOLD">Tạm Dừng (On Hold)</option>
                                <option value="COMPLETED">Hoàn Thành (Completed)</option>
                                <option value="CANCELLED">Đã Hủy (Cancelled)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Mức độ ưu tiên
                            </label>
                            <select
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            >
                                <option value="LOW">Thấp (Low)</option>
                                <option value="MEDIUM">Bình thường (Medium)</option>
                                <option value="HIGH">Ưu tiên cao (High)</option>
                                <option value="URGENT">Khẩn cấp (Urgent)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Ngày bắt đầu
                            </label>
                            <input
                                type="date"
                                value={editStartDate}
                                onChange={(e) => setEditStartDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Hạn hoàn thành
                            </label>
                            <input
                                type="date"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Giá trị dự toán (VNĐ)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={editEstimatedValue}
                                onChange={(e) => setEditEstimatedValue(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Ngân sách chi tối đa (VNĐ)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={editBudget}
                                onChange={(e) => setEditBudget(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 whitespace-nowrap">
                                Thời gian ước tính
                            </label>
                            <input
                                type="text"
                                value={editEstimatedDuration}
                                onChange={(e) => setEditEstimatedDuration(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Thẻ quản lý (Tags)
                        </label>
                        <input
                            type="text"
                            value={editTags}
                            onChange={(e) => setEditTags(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Thành viên tham gia
                        </label>
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-slate-50">
                            {users.map((u: any) => {
                                const isSelected = editSelectedAssignees.includes(u.id);
                                return (
                                    <label
                                        key={u.id}
                                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs font-medium border transition-all select-none ${
                                            isSelected
                                                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs font-semibold'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setEditSelectedAssignees([...editSelectedAssignees, u.id]);
                                                } else {
                                                    setEditSelectedAssignees(editSelectedAssignees.filter(id => id !== u.id));
                                                }
                                            }}
                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                            {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <span className="truncate">{u.name || u.email}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Mô tả chi tiết dự án
                        </label>
                        <textarea
                            rows={3}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setEditModalOpen(false)}
                            disabled={isSaving}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSaving || !editTitle.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
