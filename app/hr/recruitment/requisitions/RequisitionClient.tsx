'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Plus, CheckCircle, XCircle, Clock, FileText, Send } from 'lucide-react';
import { createRequisition, updateRequisitionStatus } from './actions';

export default function RequisitionClient({ initialData, users, currentUserId, userRole }: any) {
    const [data, setData] = useState(initialData);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        department: '',
        headcount: 1,
        budget: 0,
        description: '',
        requirements: '',
        approverId: ''
    });

    const userOptions = users.map((u: any) => ({
        id: u.id,
        label: `${u.name || u.email} (${u.role})`
    }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createRequisition(formData);
        if (res.success && res.data) {
            // Optimistic Update
            setData([res.data, ...data]);
            setIsAddModalOpen(false);
            setFormData({
                title: '', department: '', headcount: 1, budget: 0, description: '', requirements: '', approverId: ''
            });
        } else {
            alert(res.error || "Có lỗi xảy ra");
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        if (!confirm(`Bạn chắc chắn muốn đổi trạng thái thành ${status}?`)) return;
        const res = await updateRequisitionStatus(id, status);
        if (res.success) {
            setData(data.map((r: any) => r.id === id ? { ...r, status } : r));
        } else {
            alert(res.error || "Không thể cập nhật!");
        }
    };

    const getStatusTheme = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700';
            case 'REJECTED': return 'bg-red-100 text-red-700';
            case 'PENDING': return 'bg-yellow-100 text-yellow-700';
            case 'CLOSED': return 'bg-gray-100 text-gray-700';
            default: return 'bg-blue-100 text-blue-700';
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                    <FileText size={22} className="text-indigo-600" />
                    Quản lý Yêu cầu Tuyển dụng (Job Requisition)
                </h2>
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={16} /> Tạo yêu cầu
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600 uppercase">
                            <th className="p-3 font-semibold">Mã YC</th>
                            <th className="p-3 font-semibold">Vị trí / Chức danh</th>
                            <th className="p-3 font-semibold">Phòng ban</th>
                            <th className="p-3 font-semibold text-center">SL</th>
                            <th className="p-3 font-semibold">Người duyệt</th>
                            <th className="p-3 font-semibold text-center">Trạng thái</th>
                            <th className="p-3 font-semibold text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {data.map((req: any) => (
                            <tr key={req.id} className="hover:bg-slate-50">
                                <td className="p-3 font-medium text-gray-900">{req.code}</td>
                                <td className="p-3">
                                    <div className="font-semibold text-indigo-700">{req.title}</div>
                                    <div className="text-xs text-gray-500 mt-1 line-clamp-1">{req.description}</div>
                                </td>
                                <td className="p-3 text-gray-600">{req.department || '---'}</td>
                                <td className="p-3 text-center font-semibold">{req.headcount}</td>
                                <td className="p-3 text-gray-600">
                                    {req.approver?.name || req.approver?.email || 'Chưa gán'}
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusTheme(req.status)}`}>
                                        {req.status}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    {req.status === 'PENDING' && (req.approverId === currentUserId || userRole === 'ADMIN') && (
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleUpdateStatus(req.id, 'APPROVED')} className="text-green-600 hover:text-green-800 p-1" title="Duyệt">
                                                <CheckCircle size={18} />
                                            </button>
                                            <button onClick={() => handleUpdateStatus(req.id, 'REJECTED')} className="text-red-600 hover:text-red-800 p-1" title="Từ chối">
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-500 bg-gray-50">
                                    Chưa có yêu cầu tuyển dụng nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                title="Tạo Yêu cầu Tuyển dụng"
                maxWidth="max-w-3xl"
            >
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Chức danh cần tuyển *" 
                            required 
                            value={formData.title} 
                            onChange={(e) => setFormData({...formData, title: e.target.value})} 
                        />
                        <Input 
                            label="Phòng ban" 
                            value={formData.department} 
                            onChange={(e) => setFormData({...formData, department: e.target.value})} 
                        />
                        <Input 
                            label="Số lượng (Headcount) *" 
                            type="number" 
                            min={1} 
                            required 
                            value={formData.headcount.toString()} 
                            onChange={(e) => setFormData({...formData, headcount: parseInt(e.target.value) || 1})} 
                        />
                        <Input 
                            label="Ngân sách lương (Dự kiến)" 
                            type="number" 
                            value={formData.budget?.toString() || ''} 
                            onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})} 
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Mô tả công việc (JD)</label>
                        <textarea 
                            required
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Yêu cầu năng lực (Requirements)</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                            rows={3}
                            value={formData.requirements}
                            onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Người phê duyệt (Director/Manager)</label>
                        <SearchableSelect
                            options={userOptions}
                            value={formData.approverId}
                            onChange={(val: any) => setFormData({...formData, approverId: val})}
                            placeholder="Chọn người duyệt yêu cầu..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <Button type="button" className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
                        <Button type="submit" disabled={loading} className="flex items-center gap-2">
                            <Send size={16} /> Gửi yêu cầu
                        </Button>
                    </div>
                </form>
            </Modal>
        </Card>
    );
}
