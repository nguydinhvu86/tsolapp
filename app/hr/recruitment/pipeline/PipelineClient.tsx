'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { Plus, GripVertical, User, Mail, Phone, CalendarCheck } from 'lucide-react';
import { createCandidateAndApplication, updateApplicationStage } from './actions';
import CandidateDetailModal from './CandidateDetailModal';

const STAGES = [
    { id: 'SOURCED', name: 'Tiếp nhận', color: 'border-l-blue-500 bg-blue-50/50' },
    { id: 'SCREENING', name: 'Sàng lọc', color: 'border-l-purple-500 bg-purple-50/50' },
    { id: 'INTERVIEW', name: 'Phỏng vấn', color: 'border-l-orange-500 bg-orange-50/50' },
    { id: 'OFFER', name: 'Đề nghị (Offer)', color: 'border-l-yellow-500 bg-yellow-50/50' },
    { id: 'HIRED', name: 'Nhận việc', color: 'border-l-green-500 bg-green-50/50' },
    { id: 'REJECTED', name: 'Từ chối', color: 'border-l-red-500 bg-red-50/50' }
];

export default function PipelineClient({ requisitions, initialApplications, activeReqId }: any) {
    const router = useRouter();
    const [applications, setApplications] = useState(initialApplications);
    const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '', email: '', phone: '', source: 'Manual', skills: '', notes: '', cvUrl: ''
    });

    const handleReqChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        router.push(`/hr/recruitment/pipeline?reqId=${e.target.value}`);
    };

    const handleDragStart = (e: React.DragEvent, appId: string) => {
        setDraggedAppId(appId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // allow drop
    };

    const handleDrop = async (e: React.DragEvent, newStage: string) => {
        e.preventDefault();
        if (!draggedAppId) return;

        const appToMove = applications.find((a: any) => a.id === draggedAppId);
        if (appToMove && appToMove.stage !== newStage) {
            // Optimistic update
            setApplications(applications.map((a: any) => 
                a.id === draggedAppId ? { ...a, stage: newStage } : a
            ));
            
            const res = await updateApplicationStage(draggedAppId, newStage);
            if (!res.success) {
                // Revert if failed
                setApplications([...initialApplications]);
                alert(res.error || "Không thể chuyển giai đoạn");
            }
        }
        setDraggedAppId(null);
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeReqId) return alert("Vui lòng chọn Yêu cầu tuyển dụng trước!");
        
        setLoading(true);
        const res = await createCandidateAndApplication({ ...formData, requisitionId: activeReqId });
        if (res.success && res.data) {
            setApplications([res.data, ...applications]);
            setIsAddModalOpen(false);
            setFormData({ fullName: '', email: '', phone: '', source: 'Manual', skills: '', notes: '', cvUrl: '' });
        } else {
            alert(res.error || "Có lỗi xảy ra");
        }
        setLoading(false);
    };

    if (requisitions.length === 0) {
        return (
            <Card className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                    <p>Không có Yêu cầu tuyển dụng nào đang mở (APPROVED).</p>
                    <p className="text-sm mt-2">Vui lòng tạo Yêu cầu trước khi xây dựng phễu ứng viên.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800">Pipeline Tuyển dụng</h2>
                    <select 
                        value={activeReqId || ''} 
                        onChange={handleReqChange}
                        className="border border-gray-300 rounded-md p-2 text-sm bg-white font-medium text-indigo-700 min-w-[250px]"
                    >
                        {requisitions.map((req: any) => (
                            <option key={req.id} value={req.id}>[{req.code}] {req.title}</option>
                        ))}
                    </select>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={16} /> Thêm Ứng viên
                </Button>
            </div>

            {/* Kanban Board Container */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-4 h-full min-w-max">
                    {STAGES.map(stage => {
                        const stageApps = applications.filter((a: any) => a.stage === stage.id);
                        return (
                            <div 
                                key={stage.id} 
                                className={`w-80 flex flex-col bg-gray-50 rounded-xl border border-gray-200 overflow-hidden ${draggedAppId ? 'ring-2 ring-transparent hover:ring-indigo-300 transition-all' : ''}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                <div className={`p-3 border-b border-gray-200 shadow-sm font-semibold text-gray-800 flex justify-between items-center border-l-4 ${stage.color}`}>
                                    <span>{stage.name}</span>
                                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 border border-gray-200">{stageApps.length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {stageApps.map((app: any) => (
                                        <div 
                                            key={app.id} 
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, app.id)}
                                            onClick={() => setSelectedApplication(app)}
                                            className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm cursor-move hover:border-indigo-400 hover:shadow-md transition-all group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="font-semibold text-indigo-700">{app.candidate.fullName}</div>
                                                <GripVertical size={16} className="text-gray-300 group-hover:text-gray-500" />
                                            </div>
                                            {app.candidate.cvUrl && (
                                                <div className="mt-1">
                                                    <a href={app.candidate.cvUrl} target="_blank" rel="noreferrer" className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 hover:bg-indigo-100" onClick={(e) => e.stopPropagation()}>
                                                        🔗 Xem CV
                                                    </a>
                                                </div>
                                            )}
                                            <div className="text-xs text-slate-500 mt-2 space-y-1">
                                                {app.candidate.email && (
                                                    <div className="flex items-center gap-1.5"><Mail size={12}/> {app.candidate.email}</div>
                                                )}
                                                {app.candidate.phone && (
                                                    <div className="flex items-center gap-1.5"><Phone size={12}/> {app.candidate.phone}</div>
                                                )}
                                            </div>
                                            {app.interviews && app.interviews.length > 0 && (
                                                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 w-fit px-2 py-1 rounded">
                                                    <CalendarCheck size={12} /> Có lịch PV
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {stageApps.length === 0 && (
                                        <div className="text-center py-6 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                                            Kéo thả ứng viên vào đây
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Thêm Ứng viên mới">
                <form onSubmit={handleAddSubmit} className="space-y-4 p-4">
                    <Input label="Họ tên *" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        <Input label="Số điện thoại" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Nguồn (Source)" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} placeholder="Vd: Facebook..." />
                        <Input label="Link CV (Google Drive/PDF)" value={formData.cvUrl} onChange={e => setFormData({...formData, cvUrl: e.target.value})} placeholder="https://..." />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Kỹ năng / Kinh nghiệm</label>
                        <textarea className="w-full border border-gray-300 rounded p-2 text-sm" rows={2} value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} />
                    </div>
                    <div className="flex justify-end gap-3 pt-3 border-t">
                        <Button type="button" className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
                        <Button type="submit" disabled={loading}>Lưu Ứng viên</Button>
                    </div>
                </form>
            </Modal>

            <CandidateDetailModal 
                application={selectedApplication} 
                isOpen={!!selectedApplication} 
                onClose={() => setSelectedApplication(null)}
                users={[]} 
            />
        </Card>
    );
}
