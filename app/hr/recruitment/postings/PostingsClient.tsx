'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Plus, CheckCircle, XCircle, Globe, Share2, AlignLeft, Target, FileType, CheckCircle2, Clock, Archive, Search } from 'lucide-react';
import { createJobPosting, updatePostingStatus } from './actions';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false, loading: () => <p>Loading editor...</p> });

export default function PostingsClient({ initialData, requisitions, currentUserId }: any) {
    const [data, setData] = useState(initialData);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [formData, setFormData] = useState({
        title: '',
        requisitionId: '',
        content: '',
        channels: 'Website, Facebook, LinkedIn'
    });

    const reqOptions = requisitions.map((r: any) => ({
        id: r.id,
        label: `[${r.code}] ${r.title}`
    }));

    // KPI Metrics
    const totalCount = data.length;
    const publishedCount = data.filter((p: any) => p.status === 'PUBLISHED').length;
    const draftClosedCount = data.filter((p: any) => p.status !== 'PUBLISHED').length;

    // Filtered Postings
    const filteredData = useMemo(() => {
        return data.filter((post: any) => {
            const matchesSearch = 
                (post.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (post.requisition?.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (post.requisition?.title || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || post.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [data, searchTerm, statusFilter]);

    // Auto-fill content based on Requisition JD
    const handleReqChange = (val: string) => {
        const selectedReq = requisitions.find((r: any) => r.id === val);
        setFormData({
            ...formData, 
            requisitionId: val,
            content: selectedReq && selectedReq.description ? selectedReq.description : ''
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createJobPosting(formData);
        if (res.success && res.data) {
            setData([res.data, ...data]);
            setIsAddModalOpen(false);
            setFormData({ title: '', requisitionId: '', content: '', channels: 'Website, Facebook, LinkedIn' });
        } else {
            alert(res.error || "Có lỗi xảy ra");
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        if (!confirm(`Chuyển trạng thái tin đăng thành ${status}?`)) return;
        const res = await updatePostingStatus(id, status);
        if (res.success) {
            setData(data.map((r: any) => r.id === id ? { ...r, status } : r));
        } else {
            alert(res.error || "Không thể cập nhật!");
        }
    };

    const getStatusTheme = (status: string) => {
        switch (status) {
            case 'PUBLISHED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'DRAFT': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'CLOSED': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PUBLISHED': return 'Đang Đăng';
            case 'DRAFT': return 'Bản Nháp';
            case 'CLOSED': return 'Đã Đóng';
            default: return status;
        }
    };

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></span>
                        Quản Lý Tin Tuyển Dụng
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Biên tập tin đăng (Job Postings), phát hành đa kênh mạng xã hội và website tuyển dụng
                    </p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs shadow-emerald-200 transition-all cursor-pointer"
                >
                    <Plus size={15} /> Soạn Tin Mới
                </button>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tổng Tin Đăng</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-slate-900">{totalCount}</span>
                            <span className="text-xs text-slate-400 font-medium">tin</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Toàn bộ chiến dịch</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                        <Globe size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-emerald-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Đang Đăng Tuyển</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-emerald-600">{publishedCount}</span>
                            <span className="text-xs text-slate-400 font-medium">tin đang mở</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Sẵn sàng nhận ứng viên</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-amber-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Bản Nháp / Đã Đóng</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-amber-600">{draftClosedCount}</span>
                            <span className="text-xs text-slate-400 font-medium">tin lưu trữ</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Chưa phát hành hoặc dừng nhận</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                        <Archive size={22} />
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Tìm kiếm tin tuyển dụng, mã yêu cầu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {['ALL', 'PUBLISHED', 'DRAFT', 'CLOSED'].map((st) => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    statusFilter === st 
                                        ? 'bg-white text-slate-900 shadow-xs' 
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {st === 'ALL' ? 'Tất cả' : st === 'PUBLISHED' ? 'Đang mở' : st === 'DRAFT' ? 'Bản nháp' : 'Đã đóng'}
                            </button>
                        ))}
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2.5 py-1 rounded-full">
                        {filteredData.length} tin
                    </span>
                </div>
            </div>

            {/* Grid / Empty State */}
            {filteredData.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <Globe className="w-12 h-12 text-slate-300 mb-3" strokeWidth={1.5} />
                        <h3 className="text-sm font-bold text-slate-800">Chưa có tin tuyển dụng nào</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Bấm "Soạn Tin Mới" để liên kết với một Yêu cầu tuyển dụng đã duyệt và soạn thảo bản tin public.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredData.map((post: any) => (
                        <div key={post.id} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-200 transition-all flex flex-col">
                            <div className="bg-slate-50/70 border-b border-slate-100 p-4">
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <h3 className="font-bold text-sm text-slate-900 line-clamp-2">{post.title}</h3>
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap border shrink-0 ${getStatusTheme(post.status)}`}>
                                        {getStatusLabel(post.status)}
                                    </span>
                                </div>
                                <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-1">
                                    <Target size={13} className="text-emerald-600 shrink-0"/>
                                    <span>YC: <span className="font-mono text-slate-700">{post.requisition?.code}</span> - {post.requisition?.title}</span>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                                <div 
                                    className="text-xs text-slate-600 line-clamp-3 prose prose-xs max-w-none" 
                                    dangerouslySetInnerHTML={{ __html: post.content }} 
                                />
                                
                                <div className="space-y-1.5 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <Share2 size={12} className="text-slate-400 shrink-0" />
                                        <span className="truncate"><strong>Kênh:</strong> {post.channels}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <FileType size={12} className="text-slate-400 shrink-0" />
                                        <span className="truncate"><strong>Người đăng:</strong> {post.poster?.name || post.poster?.email}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                                {post.status === 'DRAFT' && (
                                    <button 
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-all" 
                                        onClick={() => handleUpdateStatus(post.id, 'PUBLISHED')}
                                    >
                                        Đăng Tin
                                    </button>
                                )}
                                {post.status === 'PUBLISHED' && (
                                    <button 
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 shadow-xs cursor-pointer transition-all" 
                                        onClick={() => handleUpdateStatus(post.id, 'CLOSED')}
                                    >
                                        Đóng Tin
                                    </button>
                                )}
                                {post.status === 'CLOSED' && (
                                    <button 
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-all" 
                                        onClick={() => handleUpdateStatus(post.id, 'PUBLISHED')}
                                    >
                                        Mở Lại
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                title="Soạn Tin Tuyển Dụng"
                maxWidth="max-w-4xl"
            >
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Tiêu đề tin đăng (Hiển thị ra ngoài) *" 
                            required 
                            value={formData.title} 
                            onChange={(e) => setFormData({...formData, title: e.target.value})} 
                            placeholder="Vd: Tuyển dụng Software Engineer (Up to $2000)"
                        />
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Thuộc Yêu cầu (Requisition) *</label>
                            {requisitions.length > 0 ? (
                                <SearchableSelect
                                    options={reqOptions}
                                    value={formData.requisitionId}
                                    onChange={handleReqChange}
                                    placeholder="Chọn Job Requisition đã duyệt..."
                                />
                            ) : (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
                                    Không có Yêu cầu nào đang Đã Duyệt. Hãy tạo Requisition trước!
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <AlignLeft size={16}/> Nội dung tin đăng (JD Public)
                        </label>
                        <div className="bg-white border rounded">
                            <ReactQuill 
                                theme="snow"
                                value={formData.content || ''}
                                onChange={(val) => setFormData({...formData, content: val})}
                                style={{ height: '300px', marginBottom: '40px' }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 italic mt-2">Mẹo: Chọn Yêu cầu (Requisition) sẽ tự động điền bản nháp JD đã được duyệt.</p>
                    </div>

                    <Input 
                        label="Kênh đăng tuyển dự kiến" 
                        value={formData.channels} 
                        onChange={(e) => setFormData({...formData, channels: e.target.value})} 
                        placeholder="Website nội bộ, Facebook, VietnamWorks, v.v..."
                    />

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <Button type="button" className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
                        <Button type="submit" disabled={loading || !formData.requisitionId}>Tạo nháp (Draft)</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
