'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Plus, CheckCircle, XCircle, Globe, Share2, AlignLeft, Target, FileType } from 'lucide-react';
import { createJobPosting, updatePostingStatus } from './actions';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false, loading: () => <p>Loading editor...</p> });

export default function PostingsClient({ initialData, requisitions, currentUserId }: any) {
    const [data, setData] = useState(initialData);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

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
            case 'PUBLISHED': return 'bg-green-100 text-green-700';
            case 'DRAFT': return 'bg-yellow-100 text-yellow-700';
            case 'CLOSED': return 'bg-gray-100 text-gray-700';
            default: return 'bg-blue-100 text-blue-700';
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                    <Globe size={22} className="text-indigo-600" />
                    Quản lý Tin Tuyển Dụng (Job Postings)
                </h2>
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={16} /> Soạn tin mới
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.map((post: any) => (
                    <div key={post.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col">
                        <div className="bg-slate-50 border-b border-gray-100 p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-indigo-800 line-clamp-2">{post.title}</h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ml-2 ${getStatusTheme(post.status)}`}>
                                    {post.status}
                                </span>
                            </div>
                            <div className="text-sm font-medium text-gray-600 flex items-center gap-1.5 mt-2">
                                <Target size={14} className="text-gray-400"/>
                                YC: {post.requisition.code} - {post.requisition.title}
                            </div>
                        </div>

                        <div className="p-4 flex-1">
                            <div 
                                className="text-sm text-gray-600 line-clamp-3 mb-4 prose prose-sm max-w-none" 
                                dangerouslySetInnerHTML={{ __html: post.content }} 
                            />
                            
                            <div className="space-y-2 mt-auto text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                    <Share2 size={14} /> <strong>Kênh đăng:</strong> {post.channels}
                                </div>
                                <div className="flex items-center gap-2">
                                    <FileType size={14} /> <strong>Người đăng:</strong> {post.poster?.name || post.poster?.email}
                                </div>
                            </div>
                        </div>

                        <div className="p-3 border-t border-gray-100 bg-slate-50 flex justify-end gap-2">
                            {post.status === 'DRAFT' && (
                                <Button className="text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateStatus(post.id, 'PUBLISHED')}>
                                    Publish
                                </Button>
                            )}
                            {post.status === 'PUBLISHED' && (
                                <Button className="text-xs bg-gray-500 hover:bg-gray-600 text-white" onClick={() => handleUpdateStatus(post.id, 'CLOSED')}>
                                    Đóng tin
                                </Button>
                            )}
                            {post.status === 'CLOSED' && (
                                <Button className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200" onClick={() => handleUpdateStatus(post.id, 'PUBLISHED')}>
                                    Đăng lại
                                </Button>
                            )}
                        </div>
                    </div>
                ))}

                {data.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        Chưa có tin tuyển dụng nào.
                    </div>
                )}
            </div>

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
        </Card>
    );
}
