import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Clock, PhoneIncoming, PhoneOutgoing, User } from 'lucide-react';

export function CustomerCallLogsPanel({ logs }: { logs: any[] }) {
    if (!logs || logs.length === 0) {
        return <div className="text-center p-8 text-slate-500 bg-white rounded-lg border border-slate-100 shadow-sm">Chưa có lịch sử cuộc gọi nào.</div>;
    }

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <Card className="overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Clock size={18} className="text-indigo-500" />
                    Lịch sử Cuộc Gọi ({logs.length})
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-3">Thời gian</th>
                            <th className="px-4 py-3">Loại</th>
                            <th className="px-4 py-3">Agent</th>
                            <th className="px-4 py-3">SĐT</th>
                            <th className="px-4 py-3">Thời lượng</th>
                            <th className="px-4 py-3">Kịch bản / Lời chào</th>
                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="px-4 py-3">Ghi âm</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {logs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                    {new Date(log.startedAt).toLocaleString('vi-VN')}
                                </td>
                                <td className="px-4 py-3">
                                    {log.type === 'INBOUND' ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold border border-emerald-100"><PhoneIncoming size={12}/> Gọi Đến</span>
                                    ) : log.type === 'OUTBOUND' ? (
                                        <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-semibold border border-blue-100"><PhoneOutgoing size={12}/> Gọi Đi</span>
                                    ) : (
                                        <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs font-medium">{log.type}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-500"><User size={12}/></div>
                                        {log.user?.name || `EXT: ${log.extension}`}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-slate-700 font-medium">
                                    {log.phone}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                    {formatDuration(log.billsec)} / {formatDuration(log.duration)}
                                </td>
                                <td className="px-4 py-3 text-slate-600">
                                    -
                                </td>
                                <td className="px-4 py-3">
                                    {log.status === 'ANSWER' || log.status === 'ANSWERED' ? <span className="text-emerald-600 font-medium">Thành công</span>
                                    : log.status === 'NOANSWER' ? <span className="text-amber-500 font-medium">K. Bắt Máy</span>
                                    : <span className="text-rose-500 font-medium">{log.status}</span>}
                                </td>
                                <td className="px-4 py-3">
                                    {log.recordingUrl ? (
                                        <audio controls src={log.recordingUrl} className="h-8 w-[200px]" />
                                    ) : <span className="text-slate-400 italic text-xs">Không có</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
