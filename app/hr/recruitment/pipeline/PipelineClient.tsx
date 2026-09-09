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
            <div className="space-y-6 w-full">
                {/* Header */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></span>
                            Phễu Tuyển Dụng & Ứng Viên (ATS Pipeline)
                        </h1>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                            Quản lý tiến trình ứng tuyển, sàng lọc hồ sơ và lịch phỏng vấn theo từng chiến dịch
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4">
                            <CalendarCheck size={32} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mb-1.5">Không có Yêu cầu tuyển dụng nào đang mở</h3>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            Hệ thống phễu ứng viên (Kanban Pipeline) được quản lý theo từng Yêu cầu tuyển dụng (Job Requisition) đã được duyệt (APPROVED). Vui lòng tạo hoặc duyệt yêu cầu trước.
                        </p>
                        <a 
                            href="/hr/recruitment/requisitions" 
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs shadow-emerald-200 transition-all cursor-pointer"
                        >
                            <Plus size={15} /> Đi đến Quản Lý Yêu Cầu
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    const currentReq = requisitions.find((r: any) => r.id === activeReqId);

    return (
        <div className="flex flex-col h-full space-y-5 w-full">
            {/* Header & Requisition Switcher */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></span>
                            Phễu Tuyển Dụng & Ứng Viên
                        </h1>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                            {applications.length} ứng viên trong chiến dịch • Kéo thả thẻ ứng viên giữa các cột giai đoạn
                        </p>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-500 pl-2">Vị trí:</span>
                        <select 
                            value={activeReqId || ''} 
                            onChange={handleReqChange}
                            className="bg-transparent text-xs font-bold text-emerald-700 outline-none cursor-pointer pr-2"
                        >
                            {requisitions.map((req: any) => (
                                <option key={req.id} value={req.id}>[{req.code}] {req.title} ({req.department || '---'})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs shadow-emerald-200 transition-all cursor-pointer"
                >
                    <Plus size={15} /> Thêm Ứng Viên
                </button>
            </div>

            {/* Kanban Board Container */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
                <div className="flex gap-4 h-full min-w-max pb-2">
                    {STAGES.map(stage => {
                        const stageApps = applications.filter((a: any) => a.stage === stage.id);
                        return (
                            <div 
                                key={stage.id} 
                                className={`w-80 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden ${draggedAppId ? 'ring-2 ring-transparent hover:ring-emerald-300 transition-all' : ''}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 font-bold text-xs text-slate-800 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${
                                            stage.id === 'SOURCED' ? 'bg-blue-500' :
                                            stage.id === 'SCREENING' ? 'bg-purple-500' :
                                            stage.id === 'INTERVIEW' ? 'bg-amber-500' :
                                            stage.id === 'OFFER' ? 'bg-yellow-500' :
                                            stage.id === 'HIRED' ? 'bg-emerald-500' : 'bg-rose-500'
                                        }`}></span>
                                        <span className="uppercase tracking-wider">{stage.name}</span>
                                    </div>
                                    <span className="bg-slate-200/80 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold text-slate-700">{stageApps.length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/40">
                                    {stageApps.map((app: any) => (
                                        <div 
                                            key={app.id} 
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, app.id)}
                                            onClick={() => setSelectedApplication(app)}
                                            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs cursor-grab active:cursor-grabbing hover:border-emerald-400 hover:shadow-sm transition-all group"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors">{app.candidate.fullName}</div>
                                                <GripVertical size={14} className="text-slate-300 group-hover:text-slate-500" />
                                            </div>
                                            {app.candidate.cvUrl && (
                                                <div className="mt-1.5">
                                                    <a href={app.candidate.cvUrl} target="_blank" rel="noreferrer" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 hover:bg-emerald-100 transition-all inline-block" onClick={(e) => e.stopPropagation()}>
                                                        🔗 Xem Hồ Sơ / CV
                                                    </a>
                                                </div>
                                            )}
                                            <div className="text-[11px] text-slate-500 mt-2 space-y-1">
                                                {app.candidate.email && (
                                                    <div className="flex items-center gap-1.5 truncate"><Mail size={11} className="text-slate-400 shrink-0"/> <span className="truncate">{app.candidate.email}</span></div>
                                                )}
                                                {app.candidate.phone && (
                                                    <div className="flex items-center gap-1.5"><Phone size={11} className="text-slate-400 shrink-0"/> <span>{app.candidate.phone}</span></div>
                                                )}
                                            </div>
                                            {app.interviews && app.interviews.length > 0 && (
                                                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50/80 w-fit px-2 py-0.5 rounded-md border border-amber-200">
                                                    <CalendarCheck size={11} /> Có lịch phỏng vấn
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {stageApps.length === 0 && (
                                        <div className="text-center py-10 text-xs font-medium text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">
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
        </div>
    );
}
