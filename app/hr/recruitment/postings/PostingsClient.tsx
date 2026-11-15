'use client';

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { formatMoney } from '@/lib/utils/formatters';
import { 
    Plus, Globe, Share2, AlignLeft, Target, FileType, CheckCircle2, 
    Clock, Archive, Search, Copy, Check, ExternalLink, QrCode, 
    Edit, Trash2, Eye, Building2, Users, DollarSign, Sparkles, 
    LayoutGrid, Table as TableIcon, X, Download, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { createJobPosting, updateJobPosting, updatePostingStatus, deleteJobPosting } from './actions';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false, loading: () => <p className="text-xs text-slate-400 p-3">Đang tải trình soạn thảo...</p> });

export default function PostingsClient({ 
    initialData, 
    requisitions, 
    currentUserId,
    userRole,
    userPermissions = []
}: {
    initialData: any[];
    requisitions: any[];
    currentUserId: string;
    userRole: string;
    userPermissions?: string[];
}) {
    const [data, setData] = useState(initialData);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<any>(null);
    const [qrModalPost, setQrModalPost] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit');
    const [originUrl, setOriginUrl] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        requisitionId: '',
        content: '',
        channels: 'Website tuyển dụng, Facebook, LinkedIn, Zalo',
        status: 'PUBLISHED'
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOriginUrl(window.location.origin);
        }
    }, []);

    // Fix: SearchableSelect requires { value: string, label: string }
    const reqOptions = useMemo(() => {
        return requisitions.map((r: any) => ({
            value: r.id,
            label: `[${r.code || 'YC'}] ${r.title} (${r.department || 'Phòng ban'})`
        }));
    }, [requisitions]);

    // KPI Metrics
    const totalCount = data.length;
    const publishedCount = data.filter((p: any) => p.status === 'PUBLISHED').length;
    const draftClosedCount = data.filter((p: any) => p.status !== 'PUBLISHED').length;
    const totalApplications = data.reduce((sum: number, p: any) => {
        return sum + (p.requisition?._count?.applications || 0);
    }, 0);

    // Filtered Postings
    const filteredData = useMemo(() => {
        return data.filter((post: any) => {
            const term = searchTerm.toLowerCase();
            const matchesSearch = 
                (post.title || '').toLowerCase().includes(term) ||
                (post.requisition?.code || '').toLowerCase().includes(term) ||
                (post.requisition?.title || '').toLowerCase().includes(term) ||
                (post.requisition?.department || '').toLowerCase().includes(term) ||
                (post.channels || '').toLowerCase().includes(term);
            const matchesStatus = statusFilter === 'ALL' || post.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [data, searchTerm, statusFilter]);

    // Auto-fill template when Requisition is selected
    const handleReqChange = (val: string) => {
        const selectedReq = requisitions.find((r: any) => r.id === val);
        if (!selectedReq) return;

        const generatedTitle = `Tuyển dụng ${selectedReq.title} (${selectedReq.department || 'Toàn thời gian'})`;
        
        let templateContent = '';
        if (selectedReq.description || selectedReq.requirements) {
            templateContent = `
<h3><strong>1. Về Doanh Nghiệp</strong></h3>
<p>Chúng tôi là doanh nghiệp công nghệ hàng đầu, tiên phong cung cấp các giải pháp quản trị số toàn diện. Chúng tôi chào đón những ứng viên tài năng cùng chung tay xây dựng những giá trị mới.</p>

<h3><strong>2. Mô Tả Công Việc</strong></h3>
<p>${(selectedReq.description || '').replace(/\n/g, '<br/>')}</p>

<h3><strong>3. Yêu Cầu Tuyển Dụng</strong></h3>
<p>${(selectedReq.requirements || 'Trao đổi chi tiết khi phỏng vấn.').replace(/\n/g, '<br/>')}</p>

<h3><strong>4. Quyền Lợi & Đãi Ngộ</strong></h3>
<ul>
    <li>Mức lương cạnh tranh theo năng lực (${selectedReq.budget ? formatMoney(Number(selectedReq.budget)) : 'Thỏa thuận'}) + Thưởng hiệu quả KPI.</li>
    <li>Tham gia đầy đủ BHXH, BHYT, BHTN theo quy định Pháp luật.</li>
    <li>Lộ trình đào tạo nghiệp vụ chuyên sâu và cơ hội thăng tiến rộng mở.</li>
    <li>Môi trường làm việc trẻ trung, năng động, du lịch thường niên và teambuilding.</li>
</ul>

<h3><strong>5. Địa Điểm & Thời Gian Làm Việc</strong></h3>
<p>Địa điểm: TP. Hồ Chí Minh / Bình Dương.<br/>Thời gian: Thứ 2 đến Thứ 6 & Sáng Thứ 7.</p>
            `.trim();
        }

        setFormData(prev => ({
            ...prev,
            requisitionId: val,
            title: prev.title ? prev.title : generatedTitle,
            content: prev.content ? prev.content : templateContent
        }));
    };

    const handleOpenAddModal = () => {
        setEditingPost(null);
        setFormData({
            title: '',
            requisitionId: requisitions.length > 0 ? requisitions[0].id : '',
            content: '',
            channels: 'Website tuyển dụng, Facebook, LinkedIn, Zalo',
            status: 'PUBLISHED'
        });
        if (requisitions.length > 0) {
            handleReqChange(requisitions[0].id);
        }
        setPreviewTab('edit');
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (post: any) => {
        setEditingPost(post);
        setFormData({
            title: post.title,
            requisitionId: post.requisitionId,
            content: post.content || '',
            channels: post.channels || 'Website tuyển dụng, Mạng xã hội',
            status: post.status
        });
        setPreviewTab('edit');
        setIsAddModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.requisitionId) {
            toast.error("Vui lòng chọn Yêu cầu tuyển dụng đã duyệt!");
            return;
        }
        if (!formData.title.trim()) {
            toast.error("Vui lòng nhập tiêu đề tin tuyển dụng!");
            return;
        }

        setLoading(true);
        try {
            if (editingPost) {
                const res = await updateJobPosting(editingPost.id, formData);
                if (res.success && res.data) {
                    setData(data.map((p: any) => p.id === editingPost.id ? res.data : p));
                    setIsAddModalOpen(false);
                    toast.success("Cập nhật tin tuyển dụng thành công!");
                } else {
                    toast.error(res.error || "Không thể cập nhật tin");
                }
            } else {
                const res = await createJobPosting(formData);
                if (res.success && res.data) {
                    setData([res.data, ...data]);
                    setIsAddModalOpen(false);
                    toast.success("Tạo và xuất bản tin tuyển dụng thành công! Đã có link gửi ứng viên.");
                } else {
                    toast.error(res.error || "Có lỗi xảy ra");
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Lỗi thao tác");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        const actionLabel = status === 'PUBLISHED' ? 'Đăng tin công khai' : status === 'CLOSED' ? 'Đóng tin nhận hồ sơ' : 'Lưu bản nháp';
        if (!confirm(`Bạn chắc chắn muốn ${actionLabel}?`)) return;

        try {
            const res = await updatePostingStatus(id, status);
            if (res.success) {
                setData(data.map((r: any) => r.id === id ? { ...r, status } : r));
                toast.success(`Đã cập nhật trạng thái tin thành "${getStatusLabel(status)}"`);
            } else {
                toast.error(res.error || "Không thể cập nhật!");
            }
        } catch (err: any) {
            toast.error(err.message || "Lỗi thao tác");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa tin tuyển dụng này? Liên kết gửi ứng viên sẽ không còn hiệu lực.")) return;
        try {
            const res = await deleteJobPosting(id);
            if (res.success) {
                setData(data.filter((r: any) => r.id !== id));
                toast.success("Đã xóa tin tuyển dụng!");
            } else {
                toast.error(res.error || "Không thể xóa");
            }
        } catch (err: any) {
            toast.error(err.message || "Lỗi xóa tin");
        }
    };

    const handleCopyCandidateLink = (post: any) => {
        const host = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
        const candidateUrl = `${host}/careers/${post.id}`;
        if (navigator?.clipboard) {
            navigator.clipboard.writeText(candidateUrl);
            setCopiedId(post.id);
            toast.success(`Đã sao chép link trang tuyển dụng! Bạn có thể dán link này gửi cho ứng viên qua Zalo, Messenger, Email...`);
            setTimeout(() => setCopiedId(null), 3000);
        }
    };

    const getStatusTheme = (status: string) => {
        switch (status) {
            case 'PUBLISHED': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
            case 'DRAFT': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
            case 'CLOSED': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
            default: return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PUBLISHED': return 'Đang Mở Tuyển';
            case 'DRAFT': return 'Bản Nháp';
            case 'CLOSED': return 'Đã Đóng';
            default: return status;
        }
    };

    return (
        <div className="w-full max-w-full space-y-5">
            {/* Standard Enterprise Page Header */}
            <PageHeader 
                badge="TUYỂN DỤNG & ĐỊNH BIÊN"
                categoryColor="emerald"
                title="Quản Lý Tin Tuyển Dụng"
                description="Biên tập tin đăng (Job Postings), phát hành đa kênh và chia sẻ landing page ứng tuyển trực tuyến chuyên nghiệp"
                itemCount={totalCount}
                itemLabel="tin đăng"
                actions={
                    <button 
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs shadow-emerald-200 dark:shadow-none transition-all cursor-pointer"
                    >
                        <Plus size={15} /> Soạn Tin Mới
                    </button>
                }
            />

            {/* 4 KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Tổng Tin Đăng
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{totalCount}</span>
                            <span className="text-xs text-slate-400">chiến dịch</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Toàn bộ tin đã lập</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <Globe size={18} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:border-emerald-300 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                            <span>Đang Đăng Tuyển</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{publishedCount}</span>
                            <span className="text-xs text-slate-400">tin đang mở</span>
                        </div>
                        <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Sẵn sàng nhận ứng viên</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={18} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:border-amber-300 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Bản Nháp / Đã Đóng
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{draftClosedCount}</span>
                            <span className="text-xs text-slate-400">tin lưu trữ</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Chưa phát hành hoặc dừng nhận</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Archive size={18} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between hover:border-blue-300 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                            Hồ Sơ Ứng Tuyển
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{totalApplications}</span>
                            <span className="text-xs text-slate-400">ứng viên</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Tổng CV nộp từ các tin</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Users size={18} />
                    </div>
                </div>
            </div>

            {/* Filter & View Switcher Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Tìm kiếm tin tuyển dụng, mã yêu cầu, phòng ban..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-emerald-500 text-slate-900 dark:text-white transition-all"
                    />
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        {[
                            { id: 'ALL', label: 'Tất cả' },
                            { id: 'PUBLISHED', label: 'Đang mở' },
                            { id: 'DRAFT', label: 'Bản nháp' },
                            { id: 'CLOSED', label: 'Đã đóng' }
                        ].map((st) => (
                            <button
                                key={st.id}
                                onClick={() => setStatusFilter(st.id)}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    statusFilter === st.id 
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                            title="Chế độ Thẻ (Grid View)"
                        >
                            <LayoutGrid size={15} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-700'}`}
                            title="Chế độ Bảng (Table View)"
                        >
                            <TableIcon size={15} />
                        </button>
                    </div>

                    <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/70 px-2.5 py-1 rounded-full">
                        {filteredData.length} kết quả
                    </span>
                </div>
            </div>

            {/* Content: Empty State or Grid/Table View */}
            {filteredData.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <Globe className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" strokeWidth={1.5} />
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Chưa có tin tuyển dụng nào</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Bấm "Soạn Tin Mới" để liên kết với một Yêu cầu tuyển dụng đã duyệt và tự động tạo trang web tuyển dụng công khai cho ứng viên.
                        </p>
                        <button 
                            onClick={handleOpenAddModal}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs cursor-pointer"
                        >
                            <Plus size={14} /> Soạn Tin Tuyển Dụng Ngay
                        </button>
                    </div>
                </div>
            ) : viewMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredData.map((post: any) => {
                        const candidateCount = post.requisition?._count?.applications || 0;
                        const publicUrl = `${originUrl}/careers/${post.id}`;
                        const isCopied = copiedId === post.id;

                        return (
                            <div 
                                key={post.id} 
                                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between"
                            >
                                {/* Header of Card */}
                                <div className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 p-4">
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                                            {post.title}
                                        </h3>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${getStatusTheme(post.status)}`}>
                                            {post.status === 'PUBLISHED' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                            {getStatusLabel(post.status)}
                                        </span>
                                    </div>

                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                                        <Target size={13} className="text-emerald-600 shrink-0"/>
                                        <span className="truncate">
                                            YC: <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">{post.requisition?.code}</span> - {post.requisition?.title}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                                        <span>Phòng: <strong>{post.requisition?.department || '---'}</strong></span>
                                        <span>Cần: <strong>{post.requisition?.headcount || 1} người</strong></span>
                                        {post.requisition?.budget && (
                                            <span>Lương: <strong className="text-emerald-600">{formatMoney(Number(post.requisition.budget))}</strong></span>
                                        )}
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                                    <div 
                                        className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 prose prose-xs max-w-none leading-relaxed" 
                                        dangerouslySetInnerHTML={{ __html: post.content || '<em>Chưa có nội dung chi tiết</em>' }} 
                                    />

                                    {/* Candidate Share Box */}
                                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                                <Share2 size={12} /> Link Gửi Ứng Viên:
                                            </span>
                                            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                                                /careers/{post.id.slice(-6)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button 
                                                onClick={() => handleCopyCandidateLink(post)}
                                                className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                                title="Sao chép toàn bộ đường link để gửi Zalo, Facebook, Email..."
                                            >
                                                {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                                <span>{isCopied ? 'Đã sao chép!' : 'Sao Chép Link'}</span>
                                            </button>

                                            <a 
                                                href={`/careers/${post.id}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-800 border border-emerald-300 dark:border-emerald-700 transition-colors"
                                                title="Mở xem trang web tuyển dụng công khai"
                                            >
                                                <ExternalLink size={14} />
                                            </a>

                                            <button 
                                                onClick={() => setQrModalPost(post)}
                                                className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-800 border border-emerald-300 dark:border-emerald-700 transition-colors cursor-pointer"
                                                title="Xem mã QR quét di động"
                                            >
                                                <QrCode size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats & Pipeline Link */}
                                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} className="text-slate-400" />
                                                <span>Hồ sơ đã tiếp nhận:</span>
                                            </span>
                                            <Link 
                                                href={`/hr/recruitment/pipeline?reqId=${post.requisitionId}`}
                                                className="font-bold text-xs font-mono text-emerald-600 hover:underline flex items-center gap-1"
                                            >
                                                <span>{candidateCount} hồ sơ</span>
                                                <ArrowUpRight size={12} />
                                            </Link>
                                        </div>
                                        <div className="flex items-center gap-1.5 truncate">
                                            <FileType size={12} className="text-slate-400 shrink-0" />
                                            <span className="truncate">Người đăng: <strong>{post.poster?.name || post.poster?.email || 'HR'}</strong></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => handleOpenEditModal(post)}
                                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                            title="Chỉnh sửa nội dung tin"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(post.id)}
                                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                            title="Xóa tin tuyển dụng"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        {post.status === 'DRAFT' && (
                                            <button 
                                                className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-all" 
                                                onClick={() => handleUpdateStatus(post.id, 'PUBLISHED')}
                                            >
                                                Đăng Tin
                                            </button>
                                        )}
                                        {post.status === 'PUBLISHED' && (
                                            <button 
                                                className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer transition-all" 
                                                onClick={() => handleUpdateStatus(post.id, 'CLOSED')}
                                            >
                                                Đóng Tin
                                            </button>
                                        )}
                                        {post.status === 'CLOSED' && (
                                            <button 
                                                className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-all" 
                                                onClick={() => handleUpdateStatus(post.id, 'PUBLISHED')}
                                            >
                                                Mở Lại
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* TABLE VIEW */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[960px]">
                            <thead>
                                <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3.5 text-left">Tiêu Đề Tin Đăng</th>
                                    <th className="px-4 py-3.5 text-left w-[180px]">Yêu Cầu Tuyển Dụng</th>
                                    <th className="px-4 py-3.5 text-left w-[140px]">Phòng Ban</th>
                                    <th className="px-4 py-3.5 text-center w-[100px]">Ứng Viên</th>
                                    <th className="px-4 py-3.5 text-center w-[120px]">Trạng Thái</th>
                                    <th className="px-4 py-3.5 text-center w-[200px]">Link Gửi Ứng Viên</th>
                                    <th className="px-4 py-3.5 text-right w-[140px]">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                                {filteredData.map((post: any) => {
                                    const candidateCount = post.requisition?._count?.applications || 0;
                                    const isCopied = copiedId === post.id;

                                    return (
                                        <tr key={post.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3.5">
                                                <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                    {post.title}
                                                </div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">
                                                    Kênh: {post.channels || 'Website'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                                    {post.requisition?.code}
                                                </span>
                                                <div className="text-[11px] text-slate-500 truncate max-w-[170px]">
                                                    {post.requisition?.title}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                                                {post.requisition?.department || '---'}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <Link 
                                                    href={`/hr/recruitment/pipeline?reqId=${post.requisitionId}`}
                                                    className="inline-flex items-center gap-1 font-mono font-bold text-emerald-600 hover:underline bg-emerald-50 px-2 py-0.5 rounded"
                                                >
                                                    {candidateCount} hồ sơ
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${getStatusTheme(post.status)}`}>
                                                    {post.status === 'PUBLISHED' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                                    {getStatusLabel(post.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button 
                                                        onClick={() => handleCopyCandidateLink(post)}
                                                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                                                        title="Sao chép liên kết gửi cho ứng viên"
                                                    >
                                                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                                        <span>{isCopied ? 'Đã chép' : 'Chép Link'}</span>
                                                    </button>
                                                    <a 
                                                        href={`/careers/${post.id}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
                                                        title="Mở xem trang web công khai"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                    <button 
                                                        onClick={() => setQrModalPost(post)}
                                                        className="p-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 cursor-pointer"
                                                        title="Xem mã QR"
                                                    >
                                                        <QrCode size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => handleOpenEditModal(post)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                                                        title="Sửa"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(post.id)}
                                                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Soạn Tin / Chỉnh Sửa Tin */}
            <Modal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                title={editingPost ? "Chỉnh Sửa Tin Tuyển Dụng" : "Soạn Thảo Tin Tuyển Dụng Mới"}
                maxWidth="max-w-5xl"
            >
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Requisition Select & Title */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Liên kết Yêu cầu tuyển dụng đã duyệt *
                            </label>
                            {requisitions.length > 0 ? (
                                <SearchableSelect
                                    options={reqOptions}
                                    value={formData.requisitionId}
                                    onChange={handleReqChange}
                                    placeholder="Chọn Job Requisition đã duyệt..."
                                    disabled={!!editingPost}
                                />
                            ) : (
                                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                                    Chưa có Yêu cầu nào ở trạng thái "Đã Phê Duyệt". Vui lòng tạo và duyệt Yêu cầu trước!
                                </div>
                            )}
                        </div>

                        <Input 
                            label="Tiêu đề tin tuyển dụng (Hiển thị cho ứng viên) *" 
                            required 
                            value={formData.title} 
                            onChange={(e) => setFormData({...formData, title: e.target.value})} 
                            placeholder="Vd: Tuyển dụng Software Engineer (Lương lên đến 30.000.000 VNĐ)"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Kênh phát hành dự kiến" 
                            value={formData.channels} 
                            onChange={(e) => setFormData({...formData, channels: e.target.value})} 
                            placeholder="Website tuyển dụng, Facebook, LinkedIn, Zalo..."
                        />

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Trạng thái phát hành *
                            </label>
                            <select 
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                            >
                                <option value="PUBLISHED">Công khai & Mở nhận hồ sơ (PUBLISHED)</option>
                                <option value="DRAFT">Lưu bản nháp nội bộ (DRAFT)</option>
                                <option value="CLOSED">Đã đóng nhận hồ sơ (CLOSED)</option>
                            </select>
                        </div>
                    </div>

                    {/* Rich Editor or Preview Tabs */}
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <AlignLeft size={14} className="text-emerald-600"/>
                                <span>Nội dung chi tiết bản tin (JD Public hiển thị trên Website Ứng viên)</span>
                            </label>

                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab('edit')}
                                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${previewTab === 'edit' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'}`}
                                >
                                    Soạn thảo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab('preview')}
                                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${previewTab === 'preview' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'}`}
                                >
                                    Xem trước
                                </button>
                            </div>
                        </div>

                        {previewTab === 'edit' ? (
                            <div className="bg-white border rounded-xl overflow-hidden">
                                <ReactQuill 
                                    theme="snow"
                                    value={formData.content || ''}
                                    onChange={(val) => setFormData({...formData, content: val})}
                                    style={{ height: '240px', marginBottom: '45px' }}
                                />
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 min-h-[285px] max-h-[360px] overflow-y-auto custom-scrollbar">
                                <div 
                                    className="prose prose-sm max-w-none text-slate-700" 
                                    dangerouslySetInnerHTML={{ __html: formData.content || '<em>Chưa có nội dung soạn thảo</em>' }}
                                />
                            </div>
                        )}
                        <p className="text-[11px] text-slate-400 italic">
                            * Mẹo: Khi chọn Yêu cầu tuyển dụng, hệ thống tự động điền sẵn bản mẫu JD chuẩn chuyên nghiệp gồm: Giới thiệu doanh nghiệp, Mô tả công việc, Yêu cầu ứng viên và Quyền lợi đãi ngộ.
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100">
                        <Button 
                            type="button" 
                            className="bg-slate-100 text-slate-700 hover:bg-slate-200" 
                            onClick={() => setIsAddModalOpen(false)}
                        >
                            Hủy
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading || !formData.requisitionId}
                        >
                            {loading ? "Đang xử lý..." : editingPost ? "Cập Nhật Tin" : "Xuất Bản & Lấy Link"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal Mã QR Tuyển Dụng */}
            {qrModalPost && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-sm text-slate-900">Mã QR Tuyển Dụng</h3>
                                <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{qrModalPost.title}</p>
                            </div>
                            <button 
                                onClick={() => setQrModalPost(null)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
                            <QRCodeSVG 
                                value={`${originUrl}/careers/${qrModalPost.id}`} 
                                size={190}
                                level="M"
                                includeMargin={true}
                            />
                        </div>

                        <div className="text-xs text-slate-500">
                            Quét mã này bằng Camera điện thoại để mở thẳng trang ứng tuyển trực tuyến. Có thể chụp ảnh hoặc in mã QR này vào poster tuyển dụng!
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button 
                                onClick={() => handleCopyCandidateLink(qrModalPost)}
                                className="flex-1 py-2 px-3 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Copy size={13} />
                                <span>Sao chép Link</span>
                            </button>
                            <a 
                                href={`/careers/${qrModalPost.id}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex-1 py-2 px-3 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                            >
                                <ExternalLink size={13} />
                                <span>Mở Trang Web</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
