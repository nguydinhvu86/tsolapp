'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { 
    Plus, 
    Edit3, 
    Trash2, 
    Link as LinkIcon, 
    CheckCircle2, 
    XCircle, 
    Code, 
    FormInput,
    Search,
    Globe,
    UserCheck,
    Copy
} from 'lucide-react';
import { createLeadForm, updateLeadForm, deleteLeadForm } from './actions';

export function LeadFormsClient({ initialForms, users }: { initialForms: any[], users: any[] }) {
    const [forms, setForms] = useState(initialForms);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingFormId, setEditingFormId] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [source, setSource] = useState('Website');
    const [assigneeId, setAssigneeId] = useState('');
    const [successMessage, setSuccessMessage] = useState('Cảm ơn bạn đã để lại thông tin. Chúng tôi sẽ liên hệ lại trong thời gian sớm nhất.');
    const [isActive, setIsActive] = useState(true);

    const stats = useMemo(() => {
        const total = forms.length;
        const active = forms.filter(f => f.isActive).length;
        const inactive = forms.filter(f => !f.isActive).length;
        return { total, active, inactive };
    }, [forms]);

    const filteredForms = useMemo(() => {
        return forms.filter(f => 
            f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (f.source && f.source.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [forms, searchTerm]);

    const openCreateModal = () => {
        setEditingFormId(null);
        setTitle('');
        setSource('Website');
        setAssigneeId('');
        setSuccessMessage('Cảm ơn bạn đã để lại thông tin. Chúng tôi sẽ liên hệ lại trong thời gian sớm nhất.');
        setIsActive(true);
        setIsModalOpen(true);
    };

    const openEditModal = (form: any) => {
        setEditingFormId(form.id);
        setTitle(form.title);
        setSource(form.source);
        setAssigneeId(form.assigneeId || '');
        setSuccessMessage(form.successMessage || '');
        setIsActive(form.isActive);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Vui lòng nhập tên Form.');
            return;
        }

        setIsSaving(true);
        try {
            const data = {
                title,
                source,
                assigneeId: assigneeId || undefined,
                successMessage,
                isActive
            };

            let updatedForms = [...forms];

            if (editingFormId) {
                const res = await updateLeadForm(editingFormId, data);
                if (!res.success) throw new Error(res.error);
                const index = updatedForms.findIndex(f => f.id === editingFormId);
                if (index !== -1) {
                    updatedForms[index] = { ...updatedForms[index], ...res.leadForm, assignee: users.find(u => u.id === data.assigneeId) };
                }
            } else {
                const res = await createLeadForm(data);
                if (!res.success) throw new Error(res.error);
                updatedForms.unshift({ ...res.leadForm, assignee: users.find(u => u.id === data.assigneeId) });
            }

            setForms(updatedForms);
            setIsModalOpen(false);
        } catch (error: any) {
            alert('Lỗi: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa form cấu hình này? Các Lead đã tạo từ form sẽ KHÔNG bị ảnh hưởng.')) {
            const res = await deleteLeadForm(id);
            if (res.success) {
                setForms(forms.filter(f => f.id !== id));
            } else {
                alert('Lỗi: ' + res.error);
            }
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Đã copy đường dẫn / mã nhúng iframe!');
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
                        <FormInput className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">Cấu Hình Lead Form</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {forms.length} Biểu Mẫu
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Tạo và quản lý các biểu mẫu thu thập dữ liệu Lead tự động từ Website & Landing Page</p>
                    </div>
                </div>

                <Button onClick={openCreateModal} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-xs">
                    <Plus className="w-4 h-4" /> Tạo Form Mới
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng số form</div>
                        <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats.total}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <FormInput className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đang hoạt động</div>
                        <div className="text-2xl font-mono font-bold text-emerald-600 mt-1">{stats.active}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đã tạm dừng</div>
                        <div className="text-2xl font-mono font-bold text-slate-400 mt-1">{stats.inactive}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <XCircle className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Search Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm biểu mẫu theo tên hoặc nguồn..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <th className="py-3.5 px-4 font-semibold">Tên Biểu Mẫu</th>
                                <th className="py-3.5 px-4 font-semibold">Nguồn Dữ Liệu</th>
                                <th className="py-3.5 px-4 font-semibold">Người Nhận Mặc Định</th>
                                <th className="py-3.5 px-4 font-semibold text-center">Trạng Thái</th>
                                <th className="py-3.5 px-4 font-semibold text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredForms.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                                                <FormInput className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">Chưa có biểu mẫu nào</p>
                                            <p className="text-xs text-slate-400">Tạo form mới để nhúng vào trang web hoặc landing page của bạn</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredForms.map((form) => {
                                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                    const publicUrl = `${origin}/f/${form.id}`;
                                    const iframeCode = `<iframe src="${publicUrl}" width="100%" height="600px" frameborder="0"></iframe>`;

                                    return (
                                        <tr key={form.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-slate-900">{form.title}</div>
                                                <div className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {form.id}</div>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                    <Globe className="w-3 h-3 text-slate-500" />
                                                    {form.source || 'Website'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600">
                                                {form.assignee ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                                                        {form.assignee.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Chưa gán</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {form.isActive ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                        <CheckCircle2 className="w-3 h-3" /> Đang Bật
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                        <XCircle className="w-3 h-3" /> Đã Tắt
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => copyToClipboard(iframeCode)} 
                                                        title="Copy mã nhúng Iframe"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                                    >
                                                        <Code className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => window.open(publicUrl, '_blank')} 
                                                        title="Mở liên kết Form Public"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    >
                                                        <LinkIcon className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => openEditModal(form)} 
                                                        title="Chỉnh sửa form"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(form.id)} 
                                                        title="Xóa form"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingFormId ? "Sửa Cấu Hình Form" : "Tạo Biểu Mẫu Thu Thập Lead Mới"}>
                <div className="space-y-4 pt-2">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Tên Biểu Mẫu <span className="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            autoFocus 
                            placeholder="VD: Form Đăng Ký Tư Vấn Landing Page Tháng 10..."
                            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Nguồn Lead (Source)
                            </label>
                            <input 
                                type="text" 
                                value={source} 
                                onChange={e => setSource(e.target.value)} 
                                placeholder="Website, Facebook, Zalo, LandingPage..." 
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Người Phụ Trách Tiếp Nhận
                            </label>
                            <select 
                                value={assigneeId} 
                                onChange={e => setAssigneeId(e.target.value)} 
                                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                            >
                                <option value="">-- Không tự động gán --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Thông Báo Sau Khi Gửi Thành Công
                        </label>
                        <textarea 
                            value={successMessage} 
                            onChange={e => setSuccessMessage(e.target.value)} 
                            rows={3} 
                            placeholder="Cảm ơn bạn đã để lại thông tin..."
                            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors resize-none"
                        />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                        <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 font-medium">
                            <input 
                                type="checkbox" 
                                id="isActive" 
                                checked={isActive} 
                                onChange={e => setIsActive(e.target.checked)} 
                                className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                            />
                            <span>Kích hoạt nhận dữ liệu từ biểu mẫu này</span>
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving || !title.trim()}
                            className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                        >
                            {isSaving ? 'Đang lưu...' : (editingFormId ? 'Cập nhật' : 'Hoàn tất')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
