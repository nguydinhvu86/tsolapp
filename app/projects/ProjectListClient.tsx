'use client'
import { formatDate } from '@/lib/utils/formatters';
import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Plus, Trash2, Edit2, ChevronUp, ChevronDown, List, Target, Users, LayoutDashboard, Clock, Pause, CheckCircle, XCircle, ArrowUpDown, X, Search } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createProject, updateProject, deleteProject } from './actions';
import Link from 'next/link';

export function ProjectListClient({ initialProjects, users, customers = [] }: { initialProjects: any[], users: any[], customers?: any[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = isAdmin || permissions.includes('PROJECTS_CREATE');
    const canEdit = isAdmin || permissions.includes('PROJECTS_EDIT');
    const canDelete = isAdmin || permissions.includes('PROJECTS_DELETE');

    const [isMounted, setIsMounted] = React.useState(false);
    const [localProjects, setLocalProjects] = React.useState<any[]>(initialProjects);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    React.useEffect(() => {
        setLocalProjects(initialProjects);
    }, [initialProjects]);

    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [dueDate, setDueDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [estimatedValue, setEstimatedValue] = useState<number | ''>('');
    const [estimatedDuration, setEstimatedDuration] = useState('');
    const [tags, setTags] = useState('');
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Edit State
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editPriority, setEditPriority] = useState('MEDIUM');
    const [editDueDate, setEditDueDate] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editCustomerId, setEditCustomerId] = useState('');
    const [editEstimatedValue, setEditEstimatedValue] = useState<number | ''>('');
    const [editEstimatedDuration, setEditEstimatedDuration] = useState('');
    const [editTags, setEditTags] = useState('');
    const [editSelectedAssignees, setEditSelectedAssignees] = useState<string[]>([]);
    const [editStatus, setEditStatus] = useState('TODO');

    // Sorting State
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [assigneeFilter, setAssigneeFilter] = useState('ALL');

    // View State
    const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN'>('LIST');

    const customerOptions = [
        { value: '', label: '-- Không chọn --' },
        ...(customers?.map(c => ({ value: c.id, label: c.name })) || [])
    ];

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleStatusChange = async (projectId: string, newStatus: string) => {
        if (!session?.user?.id) return;
        try {
            await updateProject(projectId, { status: newStatus }, session.user.id);
            router.refresh();
        } catch (error) {
            console.error("Lỗi cập nhật trạng thái", error);
            alert("Chỉ người tạo hoặc người quản trị mới có thể cập nhật.");
        }
    };

    const onDragEnd = async (result: any) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId;
        const projectId = draggableId;

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
            console.error("Lỗi cập nhật trạng thái", error);
            setLocalProjects(initialProjects);
            alert("Lỗi kéo thả cập nhật trạng thái. Chỉ người tạo hoặc người quản trị mới có thể cập nhật.");
        }
    };

    const filteredProjects = React.useMemo(() => {
        return localProjects.filter(p => {
            const matchesSearch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
            const matchesAssignee = assigneeFilter === 'ALL' || p.assignees?.some((a: any) => a.userId === assigneeFilter);
            return matchesSearch && matchesStatus && matchesAssignee;
        });
    }, [initialProjects, searchQuery, statusFilter, assigneeFilter]);

    const sortedProjects = React.useMemo(() => {
        if (!sortField) return filteredProjects;

        return [...filteredProjects].sort((a, b) => {
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
                case 'progress':
                    valA = a.progress || 0;
                    valB = b.progress || 0;
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                default:
                    return 0;
            }
        });
    }, [filteredProjects, sortField, sortDirection]);

    const handleCreate = async () => {
        if (!title.trim() || !session?.user?.id) return;
        setIsSaving(true);

        const payload: any = {
            title,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate) : null,
            startDate: startDate ? new Date(startDate) : null,
            customerId: customerId || null,
            estimatedValue: estimatedValue ? Number(estimatedValue) : 0,
            estimatedDuration,
            tags,
            assignees: selectedAssignees,
        };

        try {
            await createProject(payload, session.user.id);
            setCreateModalOpen(false);
            setTitle('');
            setDescription('');
            setPriority('MEDIUM');
            setDueDate('');
            setStartDate('');
            setCustomerId('');
            setEstimatedValue('');
            setEstimatedDuration('');
            setTags('');
            setSelectedAssignees([]);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    }

    const openEditModal = (project: any) => {
        setEditingProjectId(project.id);
        setEditTitle(project.title);
        setEditDescription(project.description || '');
        setEditPriority(project.priority || 'MEDIUM');
        setEditDueDate(project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : '');
        setEditStartDate(project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '');
        setEditCustomerId(project.customerId || '');
        setEditEstimatedValue(project.estimatedValue || '');
        setEditEstimatedDuration(project.estimatedDuration || '');
        setEditTags(project.tags || '');
        setEditSelectedAssignees(project.assignees?.map((a: any) => a.userId) || []);
        setEditStatus(project.status || 'TODO');
        setEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingProjectId || !editTitle.trim() || !session?.user?.id) return;
        setIsSaving(true);
        try {
            const payload: any = {
                title: editTitle,
                description: editDescription,
                priority: editPriority,
                status: editStatus,
                dueDate: editDueDate ? new Date(editDueDate) : null,
                startDate: editStartDate ? new Date(editStartDate) : null,
                customerId: editCustomerId || null,
                estimatedValue: editEstimatedValue ? Number(editEstimatedValue) : 0,
                estimatedDuration: editEstimatedDuration,
                tags: editTags,
                assignees: editSelectedAssignees,
            };

            await updateProject(editingProjectId, payload, session.user.id);
            setEditModalOpen(false);
            setEditingProjectId(null);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa dự án này? Mọi công việc con bên trong cũng sẽ bị xóa.')) {
            await deleteProject(id);
            router.refresh();
        }
    }

    const { paginatedItems: paginatedProjects, paginationProps } = usePagination(sortedProjects, 20);

    return (
        <div className="space-y-6">
            {/* KPI Cards for Projects */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div
                    onClick={() => setStatusFilter('ALL')}
                    className={`stat-card stat-card-blue cursor-pointer transition-all ${statusFilter === 'ALL' ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md' : 'hover:-translate-y-0.5'}`}
                >
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tổng Dự Án</div>
                    <div className="stat-value text-2xl font-black text-blue-700">{initialProjects.length}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Tất cả dự án</div>
                </div>

                <div
                    onClick={() => setStatusFilter('IN_PROGRESS')}
                    className={`stat-card stat-card-emerald cursor-pointer transition-all ${statusFilter === 'IN_PROGRESS' ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md' : 'hover:-translate-y-0.5'}`}
                >
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Đang Triển Khai</div>
                    <div className="stat-value text-2xl font-black text-emerald-600">
                        {initialProjects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'TODO').length}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Đang tiến hành</div>
                </div>

                <div
                    onClick={() => setStatusFilter('PAUSED')}
                    className={`stat-card stat-card-amber cursor-pointer transition-all ${statusFilter === 'PAUSED' ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md' : 'hover:-translate-y-0.5'}`}
                >
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tạm Ngưng</div>
                    <div className="stat-value text-2xl font-black text-amber-600">
                        {initialProjects.filter(p => p.status === 'PAUSED').length}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Tạm hoãn</div>
                </div>

                <div
                    onClick={() => setStatusFilter('DONE')}
                    className={`stat-card stat-card-green cursor-pointer transition-all ${statusFilter === 'DONE' ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md' : 'hover:-translate-y-0.5'}`}
                >
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Hoàn Thành</div>
                    <div className="stat-value text-2xl font-black text-emerald-700">
                        {initialProjects.filter(p => p.status === 'DONE').length}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Đã kết thúc</div>
                </div>

                <div
                    onClick={() => setStatusFilter('CANCELLED')}
                    className={`stat-card stat-card-red cursor-pointer transition-all ${statusFilter === 'CANCELLED' ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md' : 'hover:-translate-y-0.5'}`}
                >
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Đã Hủy</div>
                    <div className="stat-value text-2xl font-black text-rose-600">
                        {initialProjects.filter(p => p.status === 'CANCELLED').length}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Đã hủy bỏ</div>
                </div>
            </div>

            {/* Filter Ribbon & Actions */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex items-center gap-2">
                    {canCreate && (
                        <Button onClick={() => setCreateModalOpen(true)} className="gap-2 shadow-sm whitespace-nowrap">
                            <Plus size={18} /> Tạo Dự Án Mới
                        </Button>
                    )}

                    <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200/60">
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode === 'LIST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <List size={14} /> Danh sách
                        </button>
                        <button
                            onClick={() => setViewMode('KANBAN')}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${viewMode === 'KANBAN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <LayoutDashboard size={14} /> Kanban
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2.5 items-center flex-1 md:justify-end">
                    <div className="relative min-w-[200px] flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm dự án..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full md:w-[220px] h-9 pl-8 pr-7 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 font-medium"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <select
                        value={assigneeFilter}
                        onChange={e => setAssigneeFilter(e.target.value)}
                        className="h-9 px-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-700 font-medium cursor-pointer"
                    >
                        <option value="ALL">Tất cả thành viên</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="h-9 px-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-700 font-medium cursor-pointer"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="TODO">Chuẩn Bị</option>
                        <option value="IN_PROGRESS">Đang Thực Hiện</option>
                        <option value="PAUSED">Tạm Ngưng</option>
                        <option value="DONE">Hoàn Thành</option>
                        <option value="CANCELLED">Đã Hủy</option>
                    </select>
                </div>
            </div>

            {viewMode === 'LIST' && (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('title')} className="cursor-pointer hover:bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 min-w-[240px]">
                                    <div className="flex items-center gap-1">
                                        Tên Dự Án
                                        {sortField === 'title' ? (sortDirection === 'asc' ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />) : <ArrowUpDown size={13} className="text-slate-300" />}
                                    </div>
                                </th>
                                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Thành Viên</th>
                                <th onClick={() => handleSort('dueDate')} className="cursor-pointer hover:bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    <div className="flex items-center gap-1">
                                        Hạn Chót
                                        {sortField === 'dueDate' ? (sortDirection === 'asc' ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />) : <ArrowUpDown size={13} className="text-slate-300" />}
                                    </div>
                                </th>
                                <th className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">Trạng Thái</th>
                                <th onClick={() => handleSort('progress')} className="cursor-pointer hover:bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600 min-w-[150px]">
                                    <div className="flex items-center gap-1">
                                        Tiến Độ Tham Khảo
                                        {sortField === 'progress' ? (sortDirection === 'asc' ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />) : <ArrowUpDown size={13} className="text-slate-300" />}
                                    </div>
                                </th>
                                <th className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 w-[100px]">Hành Động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {paginatedProjects.map((project: any) => {
                                const isDueSoon = project.dueDate && new Date(project.dueDate).getTime() - new Date().getTime() < 86400000 && project.status !== 'DONE';
                                const assigneesCount = project.assignees?.length || 0;

                                return (
                                    <tr key={project.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="p-3">
                                            <div className="font-semibold text-[13px]">
                                                <Link href={`/projects/${project.id}`} className="text-slate-900 hover:text-emerald-600 transition-colors">
                                                    {project.title}
                                                </Link>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${project.priority === 'URGENT' ? 'bg-rose-50 text-rose-600 border border-rose-200' : project.priority === 'HIGH' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                                                    {project.priority || 'MEDIUM'}
                                                </span>
                                                <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                    {project.code || 'PRJ'}
                                                </span>
                                            </div>
                                            {project.description && (
                                                <div className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-[320px]">
                                                    {project.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                                                <Users size={14} className="text-slate-400" />
                                                <span>{assigneesCount} người</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-xs" style={{ color: isDueSoon ? '#dc2626' : 'inherit', fontWeight: isDueSoon ? 600 : 400 }}>
                                            {project.dueDate ? formatDate(new Date(project.dueDate)) : '-'}
                                        </td>
                                        <td className="p-3 text-center">
                                            <select
                                                value={project.status}
                                                onChange={(e) => handleStatusChange(project.id, e.target.value)}
                                                disabled={!canEdit}
                                                className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 border cursor-pointer focus:outline-none transition-colors"
                                                style={{
                                                    backgroundColor: project.status === 'DONE' ? '#ecfdf5' : (project.status === 'IN_PROGRESS' ? '#eff6ff' : project.status === 'PAUSED' ? '#fefce8' : project.status === 'CANCELLED' ? '#fef2f2' : '#f8fafc'),
                                                    color: project.status === 'DONE' ? '#047857' : (project.status === 'IN_PROGRESS' ? '#1d4ed8' : project.status === 'PAUSED' ? '#a16207' : project.status === 'CANCELLED' ? '#b91c1c' : '#475569'),
                                                    borderColor: project.status === 'DONE' ? '#a7f3d0' : (project.status === 'IN_PROGRESS' ? '#bfdbfe' : project.status === 'PAUSED' ? '#fde047' : project.status === 'CANCELLED' ? '#fecaca' : '#e2e8f0'),
                                                }}
                                            >
                                                <option value="TODO">Chuẩn Bị</option>
                                                <option value="IN_PROGRESS">Đang Thực Hiện</option>
                                                <option value="PAUSED">Tạm Ngưng</option>
                                                <option value="DONE">Hoàn Thành</option>
                                                <option value="CANCELLED">Đã Hủy</option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-300"
                                                        style={{
                                                            width: `${project.progress || 0}%`,
                                                            backgroundColor: project.progress === 100 ? '#10b981' : '#05A613',
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 min-w-[36px] text-right">
                                                    {project.progress || 0}%
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-1">
                                                {project.completedTasks} / {project.totalTasks} công việc con
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-center gap-1">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => openEditModal(project)}
                                                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Sửa"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(project.id)}
                                                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {initialProjects.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Target size={40} strokeWidth={1.5} className="text-slate-300" />
                                            <div className="font-semibold text-slate-700 text-sm">Chưa có dự án nào</div>
                                            <div className="text-xs text-slate-400">Tạo dự án mới để bắt đầu theo dõi tiến độ tổng thể.</div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <Pagination {...paginationProps} />
                </div>
            )}


            {viewMode === 'KANBAN' && isMounted && (
                <DragDropContext onDragEnd={onDragEnd}>
                <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem', minHeight: '600px', alignItems: 'flex-start' }}>
                    {['TODO', 'IN_PROGRESS', 'PAUSED', 'DONE', 'CANCELLED'].map(colStatus => {
                        const colProjects = sortedProjects.filter(p => p.status === colStatus);
                        const colTitles: any = { 'TODO': 'Chuẩn Bị', 'IN_PROGRESS': 'Đang Triển Khai', 'PAUSED': 'Tạm Ngưng', 'DONE': 'Hoàn Thành', 'CANCELLED': 'Đã Hủy' };
                        const colColors: any = { 'TODO': '#f1f5f9', 'IN_PROGRESS': '#e0f2fe', 'PAUSED': '#fef9c3', 'DONE': '#dcfce7', 'CANCELLED': '#fee2e2' };
                        const headerColors: any = { 'TODO': '#64748b', 'IN_PROGRESS': '#0284c7', 'PAUSED': '#ca8a04', 'DONE': '#16a34a', 'CANCELLED': '#dc2626' };

                        return (
                            <Droppable key={colStatus} droppableId={colStatus}>
                                {(provided) => (
                            <div 
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                style={{ minWidth: '320px', width: '320px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}
                            >
                                <div style={{ padding: '1rem', borderBottom: '2px solid transparent', borderBottomColor: colColors[colStatus], display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: headerColors[colStatus] }}>
                                        {colTitles[colStatus]}
                                    </div>
                                    <div style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px' }}>
                                        {colProjects.length}
                                    </div>
                                </div>
                                
                                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
                                    {colProjects.map((project: any, index: number) => {
                                        const isDueSoon = project.dueDate && new Date(project.dueDate).getTime() - new Date().getTime() < 86400000 && project.status !== 'DONE';
                                        
                                        return (
                                            <Draggable key={project.id} draggableId={project.id} index={index} isDragDisabled={!canEdit}>
                                                {(provided, snapshot) => (
                                                    <div 
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{ 
                                                            backgroundColor: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', 
                                                            boxShadow: snapshot.isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : '0 1px 2px rgba(0,0,0,0.05)', 
                                                            cursor: canEdit ? 'grab' : 'default', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                                                            ...provided.draggableProps.style 
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: project.priority === 'URGENT' ? '#fef2f2' : project.priority === 'HIGH' ? '#fffbeb' : '#f8fafc', color: project.priority === 'URGENT' ? '#ef4444' : project.priority === 'HIGH' ? '#d97706' : '#64748b' }}>
                                                            {project.priority || 'MEDIUM'}
                                                        </span>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#64748b' }}>
                                                            {project.code || 'PRJ'}
                                                        </span>
                                                    </div>
                                                    {canEdit && (
                                                        <button onClick={() => openEditModal(project)} style={{ color: '#cbd5e1', padding: '0px' }} title="Sửa">
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                <Link href={`/projects/${project.id}`} style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a', lineHeight: '1.4', textDecoration: 'none' }} className="hover:text-blue-600">
                                                    {project.title}
                                                </Link>

                                                {project.description && (
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {project.description}
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px dashed #e2e8f0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isDueSoon ? '#ef4444' : '#64748b', fontSize: '0.75rem', fontWeight: isDueSoon ? 600 : 500 }}>
                                                        <Clock size={14} />
                                                        {project.dueDate ? formatDate(new Date(project.dueDate)) : 'No deadline'}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>
                                                        <Users size={14} />
                                                        {project.assignees?.length || 0}
                                                    </div>
                                                </div>
                                                
                                                {/* Progress Bar Mini */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ flex: 1, backgroundColor: '#e2e8f0', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: `${project.progress || 0}%`,
                                                            backgroundColor: project.progress === 100 ? '#10b981' : 'var(--primary)',
                                                            height: '100%'
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', minWidth: '28px', textAlign: 'right' }}>
                                                        {project.progress || 0}%
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                                    {project.completedTasks || 0} / {project.totalTasks || 0} công việc con
                                                </div>

                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                    
                                    {colProjects.length === 0 && (
                                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '2px dashed #e2e8f0', borderRadius: '8px' }}>
                                            Kéo thả hoặc tạo dự án mới
                                        </div>
                                    )}
                                </div>
                            </div>
                                )}
                            </Droppable>
                        );
                    })}
                </div>
                </DragDropContext>
            )}

            {/* Create Project Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Tạo Dự Án Mới">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Tên dự án <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="Nhập tên dự án" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Mô tả mục tiêu</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '100px' }} placeholder="Nhập mô tả..." />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Khách hàng liên kết</label>
                            <SearchableSelect
                                value={customerId}
                                onChange={setCustomerId}
                                options={customerOptions}
                                placeholder="-- Không chọn --"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Tổng tiền dự kiến (VNĐ)</label>
                            <input type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="0" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Thời gian hoàn thành dự kiến</label>
                            <input type="text" value={estimatedDuration} onChange={e => setEstimatedDuration(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="VD: 3 tháng, 30 ngày..." />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Thẻ tag quản lý</label>
                            <input type="text" value={tags} onChange={e => setTags(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="Công nghệ, Marketing..." />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Thành viên tham gia</label>
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
                            <div style={{ marginBottom: '1rem' }}>
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
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Hạn chót dự kiến</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleCreate} disabled={!title.trim() || isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Tạo Dự Án'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Project Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Sửa Thông Tin Dự Án">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Tên dự án <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="Nhập tên dự án" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Mô tả mục tiêu</label>
                        <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '100px' }} placeholder="Nhập mô tả..." />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Khách hàng liên kết</label>
                            <SearchableSelect
                                value={editCustomerId}
                                onChange={setEditCustomerId}
                                options={customerOptions}
                                placeholder="-- Không chọn --"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Tổng tiền dự kiến (VNĐ)</label>
                            <input type="number" value={editEstimatedValue} onChange={e => setEditEstimatedValue(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="0" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Thời gian hoàn thành dự kiến</label>
                            <input type="text" value={editEstimatedDuration} onChange={e => setEditEstimatedDuration(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="VD: 3 tháng..." />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Thẻ tag quản lý</label>
                            <input type="text" value={editTags} onChange={e => setEditTags(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} placeholder="Công nghệ, Marketing..." />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Trạng thái</label>
                            <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                <option value="TODO">Chuẩn Bị</option>
                                <option value="IN_PROGRESS">Đang Thực Hiện</option>
                                <option value="PAUSED">Tạm Ngưng</option>
                                <option value="DONE">Hoàn Thành</option>
                                <option value="CANCELLED">Đã Hủy</option>
                            </select>
                        </div>
                        <div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Ngày bắt đầu</label>
                                <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                            </div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Hạn chót dự kiến</label>
                            <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>Thành viên tham gia</label>
                        <select
                            multiple
                            value={editSelectedAssignees}
                            onChange={e => {
                                const options = Array.from(e.target.selectedOptions);
                                setEditSelectedAssignees(options.map(o => o.value));
                            }}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', minHeight: '120px' }}>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name || u.email}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveEdit} disabled={!editTitle.trim() || isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
