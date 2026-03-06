'use client'
import { formatDate } from '@/lib/utils/formatters';
import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Plus, Trash2, Edit2, ChevronUp, ChevronDown, List, Target, Users, LayoutDashboard, Clock, Pause, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createProject, updateProject, deleteProject } from './actions';
import Link from 'next/link';

export function ProjectListClient({ initialProjects, users, customers = [] }: { initialProjects: any[], users: any[], customers?: any[] }) {
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

    const filteredProjects = React.useMemo(() => {
        return initialProjects.filter(p => {
            const matchesSearch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [initialProjects, searchQuery, statusFilter]);

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

    return (
        <div>
            {/* KPI Cards for Projects */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.25rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '12px', backgroundColor: '#dbeafe', color: '#3b82f6', borderRadius: '10px' }}>
                        <Target size={24} />
                    </div>
                    <div>
                        <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Tổng Dự Án</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a' }}>{initialProjects.length}</div>
                    </div>
                </div>
                <div style={{ padding: '1.25rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '12px', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '10px' }}>
                        <LayoutDashboard size={24} />
                    </div>
                    <div>
                        <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Đang Triển Khai</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#14532d' }}>
                            {initialProjects.filter(p => p.status === 'IN_PROGRESS' || p.status === 'TODO').length}
                        </div>
                    </div>
                </div>
                <div style={{ padding: '1.25rem', backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '12px', backgroundColor: '#fef9c3', color: '#ca8a04', borderRadius: '10px' }}>
                        <Pause size={24} />
                    </div>
                    <div>
                        <div style={{ color: '#ca8a04', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Tạm Ngưng</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#713f12' }}>
                            {initialProjects.filter(p => p.status === 'PAUSED').length}
                        </div>
                    </div>
                </div>
                <div style={{ padding: '1.25rem', backgroundColor: '#f0fdfa', border: '1px solid #a7f3d0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '12px', backgroundColor: '#ccfbf1', color: '#0d9488', borderRadius: '10px' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <div style={{ color: '#0d9488', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Hoàn Thành</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#115e59' }}>
                            {initialProjects.filter(p => p.status === 'DONE').length}
                        </div>
                    </div>
                </div>
                <div style={{ padding: '1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '10px' }}>
                        <XCircle size={24} />
                    </div>
                    <div>
                        <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Đã Hủy</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7f1d1d' }}>
                            {initialProjects.filter(p => p.status === 'CANCELLED').length}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {canCreate && (
                    <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                        <Plus size={18} /> Tạo Dự Án Mới
                    </Button>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Tìm kiếm dự án..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', width: '260px', outline: 'none', fontSize: '0.85rem' }}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.85rem', backgroundColor: 'white' }}
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

            <Card>
                <div style={{ overflowX: 'auto' }}>
                    <Table>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('title')} style={{ cursor: 'pointer', minWidth: '250px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Tên Dự Án
                                        {sortField === 'title' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                    </div>
                                </th>
                                <th>Thành Viên</th>
                                <th onClick={() => handleSort('dueDate')} style={{ cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Hạn Chót
                                        {sortField === 'dueDate' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                    </div>
                                </th>
                                <th>Trạng Thái</th>
                                <th onClick={() => handleSort('progress')} style={{ cursor: 'pointer', minWidth: '150px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Tiến Độ Tham Khảo
                                        {sortField === 'progress' && (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                    </div>
                                </th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Hành Động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedProjects.map((project: any) => {
                                const isDueSoon = project.dueDate && new Date(project.dueDate).getTime() - new Date().getTime() < 86400000 && project.status !== 'DONE';
                                const assigneesCount = project.assignees?.length || 0;

                                return (
                                    <tr key={project.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: '1rem', color: isDueSoon ? 'var(--danger)' : 'var(--text-main)' }}>
                                                <Link href={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                                                    {project.title}
                                                </Link>
                                            </div>
                                            {project.description && (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                                                    {project.description}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Users size={16} color="var(--text-muted)" />
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                                    {assigneesCount} người
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ color: isDueSoon ? 'var(--danger)' : 'inherit', fontWeight: isDueSoon ? 600 : 400 }}>
                                            {project.dueDate ? formatDate(new Date(project.dueDate)) : '-'}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                backgroundColor: project.status === 'DONE' ? '#dcfce7' : (project.status === 'IN_PROGRESS' ? '#dbeafe' : project.status === 'PAUSED' ? '#fef9c3' : '#f1f5f9'),
                                                color: project.status === 'DONE' ? '#16a34a' : (project.status === 'IN_PROGRESS' ? '#2563eb' : project.status === 'PAUSED' ? '#ca8a04' : '#475569')
                                            }}>
                                                {project.status === 'TODO' ? 'Chuẩn Bị' : project.status === 'IN_PROGRESS' ? 'Đang Thực Hiện' : project.status === 'PAUSED' ? 'Tạm Ngưng' : project.status === 'DONE' ? 'Hoàn Thành' : project.status === 'CANCELLED' ? 'Đã Hủy' : project.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ flex: 1, backgroundColor: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${project.progress || 0}%`,
                                                        backgroundColor: project.progress === 100 ? '#10b981' : 'var(--primary)',
                                                        height: '100%',
                                                        transition: 'width 0.3s ease'
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', minWidth: '40px', textAlign: 'right' }}>
                                                    {project.progress || 0}%
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {project.completedTasks} / {project.totalTasks} công việc con
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                {canEdit && (
                                                    <button onClick={() => openEditModal(project)} style={{ color: 'var(--text-main)', padding: '4px' }} title="Sửa">
                                                        <Edit2 size={18} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button onClick={() => handleDelete(project.id)} style={{ color: 'var(--danger)', padding: '4px' }} title="Xóa">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {initialProjects.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                            <Target size={48} strokeWidth={1} style={{ opacity: 0.5 }} />
                                            <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>Chưa có dự án nào</div>
                                            <div>Tạo dự án mới để bắt đầu theo dõi tiến độ tổng thể.</div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </Card>

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
