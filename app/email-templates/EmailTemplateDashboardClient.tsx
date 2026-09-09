'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
    Mail, 
    Plus, 
    Search, 
    Trash2, 
    LayoutTemplate, 
    User, 
    ArrowRight,
    FileText,
    Receipt,
    Users,
    Layers
} from 'lucide-react';
import { deleteEmailTemplate } from './actions';
import { useRouter } from 'next/navigation';

export default function EmailTemplateDashboardClient({ initialTemplates }: { initialTemplates: any[] }) {
    const [templates, setTemplates] = useState(initialTemplates);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModule, setSelectedModule] = useState<string>('ALL');
    const router = useRouter();

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Bạn có chắc chắn muốn xóa mẫu email này?')) {
            await deleteEmailTemplate(id);
            setTemplates(prev => prev.filter(t => t.id !== id));
            router.refresh();
        }
    };

    const stats = useMemo(() => {
        const total = templates.length;
        const estimate = templates.filter(t => t.module === 'ESTIMATE').length;
        const invoice = templates.filter(t => t.module === 'INVOICE').length;
        const customer = templates.filter(t => t.module === 'CUSTOMER').length;
        return { total, estimate, invoice, customer };
    }, [templates]);

    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const matchesSearch = 
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.subject.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesModule = selectedModule === 'ALL' || t.module === selectedModule;
            return matchesSearch && matchesModule;
        });
    }, [templates, searchTerm, selectedModule]);

    const getModuleBadge = (module: string | null) => {
        switch (module) {
            case 'ESTIMATE':
                return {
                    label: 'Báo Giá',
                    icon: <FileText className="w-3 h-3" />,
                    style: 'bg-blue-50 text-blue-700 border-blue-200/60'
                };
            case 'INVOICE':
                return {
                    label: 'Hóa Đơn',
                    icon: <Receipt className="w-3 h-3" />,
                    style: 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                };
            case 'CUSTOMER':
                return {
                    label: 'Khách Hàng',
                    icon: <Users className="w-3 h-3" />,
                    style: 'bg-purple-50 text-purple-700 border-purple-200/60'
                };
            default:
                return {
                    label: 'Chung',
                    icon: <Layers className="w-3 h-3" />,
                    style: 'bg-slate-100 text-slate-700 border-slate-200'
                };
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                        <Mail className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">Quản Lý Mẫu Email</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                {templates.length} Mẫu
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Thiết kế và chuẩn hóa mẫu email thông báo, báo giá và tương tác khách hàng</p>
                    </div>
                </div>

                <Link
                    href="/email-templates/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-xs"
                >
                    <Plus className="w-4 h-4" /> Tạo Mẫu Mới
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng số mẫu</div>
                        <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats.total}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <LayoutTemplate className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mẫu Báo Giá</div>
                        <div className="text-2xl font-mono font-bold text-blue-600 mt-1">{stats.estimate}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mẫu Hóa Đơn</div>
                        <div className="text-2xl font-mono font-bold text-emerald-600 mt-1">{stats.invoice}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Receipt className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mẫu Khách Hàng</div>
                        <div className="text-2xl font-mono font-bold text-purple-600 mt-1">{stats.customer}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <Users className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter Ribbon */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm mẫu email theo tên hoặc tiêu đề..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {[
                        { id: 'ALL', label: 'Tất cả' },
                        { id: 'ESTIMATE', label: 'Báo Giá' },
                        { id: 'INVOICE', label: 'Hóa Đơn' },
                        { id: 'CUSTOMER', label: 'Khách Hàng' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedModule(tab.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                                selectedModule === tab.id
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Template Grid or Empty State */}
            {filteredTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTemplates.map((template, idx) => {
                        const badge = getModuleBadge(template.module);
                        return (
                            <Link
                                key={template.id}
                                href={`/email-templates/${template.id}`}
                                className="group relative bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.style}`}>
                                            {badge.icon}
                                            {badge.label}
                                        </span>

                                        <button
                                            onClick={(e) => handleDelete(template.id, e)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Xóa mẫu email"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1.5">
                                        {template.name}
                                    </h3>

                                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                                        <strong className="text-slate-700">Tiêu đề:</strong> {template.subject}
                                    </p>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{template.creator?.name || 'Hệ thống'}</span>
                                    </div>

                                    <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                                        Chi tiết <ArrowRight className="w-3.5 h-3.5" />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4">
                        <LayoutTemplate className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">Không tìm thấy mẫu email</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                        {searchTerm 
                            ? 'Không có mẫu email nào khớp với từ khóa tìm kiếm của bạn.' 
                            : 'Chưa có mẫu email nào trong phân loại này. Tạo mẫu đầu tiên ngay!'}
                    </p>
                    <Link
                        href="/email-templates/new"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs"
                    >
                        <Plus className="w-4 h-4" /> Tạo Mẫu Ngay
                    </Link>
                </div>
            )}
        </div>
    );
}
