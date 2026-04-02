'use client';

import React, { useState } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Calendar, Clock, MapPin, UserCheck, Phone, Mail, FileText, CheckCircle } from 'lucide-react';
import { scheduleInterview, submitEvaluation } from './actions';

export default function CandidateDetailModal({ 
    application, 
    isOpen, 
    onClose, 
    users 
}: { 
    application: any, 
    isOpen: boolean, 
    onClose: () => void,
    users: any[] 
}) {
    const [isScheduling, setIsScheduling] = useState(false);
    const [loading, setLoading] = useState(false);
    const [evaluatingInterviewId, setEvaluatingInterviewId] = useState<string | null>(null);

    const [evalData, setEvalData] = useState({
        score: 80,
        recommendation: 'Tuyển',
        notes: ''
    });

    const [interviewData, setInterviewData] = useState({
        title: 'Phỏng vấn vòng 1',
        scheduledAt: '',
        durationMinutes: 60,
        location: '',
        interviewerIds: [] as string[]
    });

    if (!application) return null;

    const { candidate, interviews } = application;

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await scheduleInterview({
            applicationId: application.id,
            ...interviewData
        });
        
        if (res.success) {
            alert('Đã đặt lịch phỏng vấn thành công!');
            setIsScheduling(false);
            window.location.reload(); // Simple reload to refresh data for pipeline
        } else {
            alert(res.error || 'Có lỗi xảy ra');
        }
        setLoading(false);
    };

    const handleEvaluationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!evaluatingInterviewId) return;
        
        setLoading(true);
        const res = await submitEvaluation({
            interviewId: evaluatingInterviewId,
            ...evalData
        });
        
        if (res.success) {
            alert('Đã lưu bài chấm thi (Scorecard) thành công!');
            setEvaluatingInterviewId(null);
            window.location.reload(); 
        } else {
            alert(res.error || 'Có lỗi xảy ra');
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Hồ sơ ứng viên: ${candidate.fullName}`} maxWidth="max-w-4xl">
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Column: Candidate Info */}
                <div className="col-span-1 border-r border-gray-100 pr-4 space-y-5">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Thông tin liên hệ</h4>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                                <Mail size={16} className="text-gray-400" /> 
                                {candidate.email || 'Chưa cập nhật'}
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                                <Phone size={16} className="text-gray-400" /> 
                                {candidate.phone || 'Chưa cập nhật'}
                            </div>
                            <div className="flex items-start gap-2 text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                                <span className="font-semibold text-indigo-700">{application.stage}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Kỹ năng / Kinh nghiệm</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{candidate.skills || 'Không có thông tin'}</p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Ghi chú</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap italic">{candidate.notes || 'Không có ghi chú'}</p>
                    </div>
                </div>

                {/* Right Column: Interviews & Pipeline Info */}
                <div className="col-span-1 md:col-span-2 space-y-6 pl-2">
                    <div className="flex justify-between items-center bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">Lịch phỏng vấn</h3>
                            <p className="text-sm text-gray-500">Quản lý và đánh giá ứng viên</p>
                        </div>
                        {!isScheduling && !evaluatingInterviewId && (
                            <Button onClick={() => setIsScheduling(true)} className="flex items-center gap-2">
                                <Calendar size={16} /> Đặt lịch mới
                            </Button>
                        )}
                    </div>

                    {isScheduling && (
                        <div className="bg-white p-4 rounded-xl border-2 border-indigo-100 shadow-sm">
                            <h4 className="font-semibold mb-4 text-indigo-800">Thông tin Lịch Phỏng vấn</h4>
                            <form onSubmit={handleSchedule} className="space-y-4">
                                <Input 
                                    label="Tiêu đề *" 
                                    required
                                    value={interviewData.title} 
                                    onChange={e => setInterviewData({...interviewData, title: e.target.value})} 
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input 
                                        label="Thời gian (Ngày & Giờ) *" 
                                        type="datetime-local" 
                                        required
                                        value={interviewData.scheduledAt} 
                                        onChange={e => setInterviewData({...interviewData, scheduledAt: e.target.value})} 
                                    />
                                    <Input 
                                        label="Thời lượng (Phút) *" 
                                        type="number" 
                                        required
                                        value={interviewData.durationMinutes.toString()} 
                                        onChange={e => setInterviewData({...interviewData, durationMinutes: parseInt(e.target.value) || 60})} 
                                    />
                                </div>
                                <Input 
                                    label="Địa điểm / Link Online" 
                                    value={interviewData.location} 
                                    onChange={e => setInterviewData({...interviewData, location: e.target.value})} 
                                    placeholder="Vd: Phòng Tầng 3 hoặc Link Google Meet"
                                />
                                
                                <div className="pt-2 flex justify-end gap-2">
                                    <Button type="button" className="bg-gray-200 hover:bg-gray-300 text-gray-800" onClick={() => setIsScheduling(false)}>Hủy</Button>
                                    <Button type="submit" disabled={loading}>Lưu lịch</Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {!isScheduling && (
                        <div className="space-y-3">
                            {interviews && interviews.length > 0 ? interviews.map((iv: any) => {
                                if (evaluatingInterviewId === iv.id) {
                                    return (
                                        <div key={`eval-${iv.id}`} className="bg-white p-4 rounded-xl border-2 border-indigo-400 shadow-sm animate-pulse-once">
                                            <div className="flex items-center gap-2 text-indigo-800 font-bold mb-4 border-b border-indigo-100 pb-2">
                                                <CheckCircle size={18} /> Chấm điểm: {iv.title}
                                            </div>
                                            <form onSubmit={handleEvaluationSubmit} className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input 
                                                        label="Điểm (0-100) *" 
                                                        type="number" 
                                                        min={0} max={100}
                                                        required
                                                        value={evalData.score.toString()} 
                                                        onChange={e => setEvalData({...evalData, score: parseInt(e.target.value) || 0})} 
                                                    />
                                                    <div className="space-y-1">
                                                        <label className="text-sm font-medium text-gray-700">Quyết định *</label>
                                                        <select 
                                                            className="w-full border border-gray-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-indigo-100"
                                                            value={evalData.recommendation}
                                                            onChange={e => setEvalData({...evalData, recommendation: e.target.value})}
                                                        >
                                                            <option value="Tuyển (Hired)">Mạnh dạn tuyển (Hired)</option>
                                                            <option value="Cân nhắc thêm">Cân nhắc thêm</option>
                                                            <option value="Từ chối (Rejected)">Loại (Rejected)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><FileText size={14}/> Ghi chú bài test / Nhận xét</label>
                                                    <textarea 
                                                        className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-100" 
                                                        rows={3} 
                                                        required
                                                        placeholder="Ứng viên trả lời tốt câu hỏi A, kỹ năng B còn yếu..."
                                                        value={evalData.notes} 
                                                        onChange={e => setEvalData({...evalData, notes: e.target.value})} 
                                                    />
                                                </div>
                                                <div className="pt-2 flex justify-end gap-2">
                                                    <Button type="button" className="bg-gray-200 hover:bg-gray-300 text-gray-800" onClick={() => setEvaluatingInterviewId(null)}>Hủy</Button>
                                                    <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">Hoàn tất Đánh giá</Button>
                                                </div>
                                            </form>
                                        </div>
                                    );
                                }

                                return (
                                <div key={iv.id} className={`p-4 border rounded-lg transition-colors ${iv.status === 'COMPLETED' ? 'border-green-200 bg-green-50/30' : 'border-gray-200 hover:border-indigo-300'}`}>
                                    <div className="flex justify-between items-start">
                                        <h5 className="font-bold text-gray-900">{iv.title}</h5>
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                            iv.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                            iv.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {iv.status}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1.5"><Calendar size={14}/> {new Date(iv.scheduledAt).toLocaleString('vi-VN')}</div>
                                        <div className="flex items-center gap-1.5"><Clock size={14}/> {iv.durationMinutes} phút</div>
                                        {iv.location && <div className="flex items-center gap-1.5"><MapPin size={14}/> {iv.location}</div>}
                                    </div>
                                    {iv.status === 'SCHEDULED' && !evaluatingInterviewId && (
                                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                                            <Button className="bg-white border text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-xs flex items-center gap-1" onClick={() => setEvaluatingInterviewId(iv.id)}>
                                                <CheckCircle size={14}/> Chấm điểm (Scorecard)
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                )
                            }) : (
                                <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
                                    Chưa có lịch phỏng vấn nào được thiết lập.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
