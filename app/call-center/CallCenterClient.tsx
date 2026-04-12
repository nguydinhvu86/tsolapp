'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Users, User, Clock, AlertCircle, Play, Pause, XCircle, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPusherClientConfig } from '@/app/notifications/actions';
import { getExtensionStatus, spyCall, syncPbxCallLogs } from './actions';
import Pusher from 'pusher-js';
import { useRouter } from 'next/navigation';

export default function CallCenterClient({ initialAgents, initialLogs, totalCount, dict, currentUser, searchParams }: any) {
    const router = useRouter();
    const [agents, setAgents] = useState(initialAgents);
    const [agentStatus, setAgentStatus] = useState<Record<string, string>>({});
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Filters state
    const [filters, setFilters] = useState({
        search: searchParams?.search || '',
        startDate: searchParams?.startDate || '',
        endDate: searchParams?.endDate || '',
        type: searchParams?.type || '',
        status: searchParams?.status || '',
        page: searchParams?.page ? Number(searchParams?.page) : 1,
        perPage: searchParams?.perPage ? Number(searchParams?.perPage) : 25,
        sortField: searchParams?.sortField || 'time',
        sortOrder: searchParams?.sortOrder || 'desc'
    });

    const applyFilters = () => {
        const query = new URLSearchParams();
        if (filters.search) query.set('search', filters.search);
        if (filters.startDate) query.set('startDate', filters.startDate);
        if (filters.endDate) query.set('endDate', filters.endDate);
        if (filters.type) query.set('type', filters.type);
        if (filters.status) query.set('status', filters.status);
        if (filters.page) query.set('page', filters.page.toString());
        if (filters.perPage) query.set('perPage', filters.perPage.toString());
        if (filters.sortField) query.set('sortField', filters.sortField);
        if (filters.sortOrder) query.set('sortOrder', filters.sortOrder);
        
        router.push(`/call-center?${query.toString()}`);
    };

    // Auto-apply filters on change with debounce for text
    useEffect(() => {
        const timer = setTimeout(() => {
            applyFilters();
        }, 800);
        return () => clearTimeout(timer);
    }, [filters]);

    const clearFilters = () => {
        setFilters({ search: '', startDate: '', endDate: '', type: '', status: '', page: 1, perPage: 25, sortField: 'time', sortOrder: 'desc' });
        router.push('/call-center');
    };

    const handleSort = (field: string) => {
        setFilters(prev => ({
             ...prev,
             sortField: field,
             sortOrder: prev.sortField === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
             page: 1 // reset page on sort
        }));
    };

    const renderSortIcon = (field: string) => {
        if (filters.sortField !== field) return <ChevronDown className="w-4 h-4 text-gray-300 inline ml-1" />;
        return filters.sortOrder === 'asc' ? <ChevronUp className="w-4 h-4 text-indigo-500 inline ml-1" /> : <ChevronDown className="w-4 h-4 text-indigo-500 inline ml-1" />;
    };
    useEffect(() => {
        const fetchStatus = async () => {
            const exts = agents.map((a: any) => a.extension).filter(Boolean);
            if (!exts.length) return;
            const res = await getExtensionStatus(exts);
            // Assuming res is array of { ext: '101', status: 'idle' }
            if (Array.isArray(res)) {
                const map: any = {};
                res.forEach(item => {
                     map[item.ext] = item.status;
                });
                setAgentStatus(map);
            }
        };
        fetchStatus();
    }, [agents]);

    // Listen to real-time agent status changes via Pusher
    useEffect(() => {
        let pusher: Pusher;
        getPusherClientConfig().then(config => {
             if (config.key && config.cluster) {
                 pusher = new Pusher(config.key, { cluster: config.cluster });
                 const channel = pusher.subscribe('callcenter-dashboard');
                 channel.bind('agent-status', (data: { extension: string, status: string }) => {
                      setAgentStatus(prev => ({ ...prev, [data.extension]: data.status }));
                 });
             }
        });
        return () => {
             if (pusher) {
                 pusher.unsubscribe('callcenter-dashboard');
                 pusher.disconnect();
             }
        };
    }, []);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSpy = async (targetExt: string, mode: 'whisper' | 'threeway' | 'caller' | 'callee') => {
        const myExt = agents.find((a: any) => a.id === currentUser.id)?.extension;
        if (!myExt) {
             alert('Bạn cần cấu hình số nội bộ (Extension) trong hồ sơ để sử dụng tính năng Nghe lén/Giám sát.');
             return;
        }
        const res = await spyCall(myExt, targetExt, mode);
        if (!res.success) alert('Không thể kích hoạt gọi giám sát: ' + res.error);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const res = await syncPbxCallLogs(2); // Sync last 2 days
            if (res.success) {
                alert(`Đã đồng bộ ${res.count} cuộc gọi thành công. Vui lòng tải lại trang!`);
                window.location.reload();
            } else {
                alert('Lỗi: ' + res.error);
            }
        } catch (e: any) {
            alert('Lỗi đồng bộ: ' + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
           {/* AGENTS GRID */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {agents.map((agent: any) => {
                   const rawSt = agentStatus[agent.extension];
                   const st = (typeof rawSt === 'string' ? rawSt.toLowerCase() : 'off');
                   
                   let stColor = 'from-gray-100 to-gray-200 text-gray-500';
                   let stText = 'Ngoại tuyến';
                   if (st === 'on' || st === 'idle' || st === 'online') { stColor = 'from-green-50 to-green-100 border-green-200 text-green-700'; stText = 'Sẵn sàng'; }
                   else if (st === 'ring' || st === 'ringing') { stColor = 'from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-700 animate-pulse'; stText = 'Đang đổ chuông'; }
                   else if (st === 'talk' || st === 'inuse' || st === 'busy') { stColor = 'from-blue-50 to-blue-100 border-blue-200 text-blue-700'; stText = 'Đang đàm thoại'; }
                   else if (st === 'pause' || st === 'paused') { stColor = 'from-orange-50 to-orange-100 border-orange-200 text-orange-700'; stText = 'Tạm dừng'; }

                   return (
                       <div key={agent.id} className={`bg-white rounded-xl shadow-sm border ${stColor} p-4 transition-all`}>
                           <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold relative overflow-hidden">
                                   <User size={20} className="absolute z-0" />
                                   {agent.avatar && <img src={agent.avatar} className="w-10 h-10 rounded-full object-cover relative z-10" onError={e => e.currentTarget.style.display='none'} />}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <div className="font-semibold text-gray-900 truncate">{agent.name}</div>
                                   <div className="text-sm font-medium opacity-80">EXT: {agent.extension}</div>
                               </div>
                           </div>
                           <div className="mt-3 text-sm flex items-center justify-between">
                               <span>{stText}</span>
                               {st === 'talk' && currentUser.role === 'ADMIN' && (
                                   <div className="flex gap-1">
                                       <button onClick={() => handleSpy(agent.extension, 'whisper')} title="Whisper (Nhắc việc qua tai nghe)" className="p-1 hover:bg-blue-100 rounded text-blue-600"><Play size={16} /></button>
                                       <button onClick={() => handleSpy(agent.extension, 'threeway')} title="3-Way (Thảo luận 3 bên)" className="p-1 hover:bg-green-100 rounded text-green-600"><Users size={16} /></button>
                                   </div>
                               )}
                           </div>
                       </div>
                   );
               })}
           </div>

           {/* FILTERS */}
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tìm kiếm (SĐT, KH, Agent)</label>
                    <input type="text" 
                        value={filters.search} onChange={e => setFilters({...filters, search: e.target.value, page: 1})}
                        className="w-full border border-gray-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Nhập từ khóa..." />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
                    <input type="date" 
                        value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value, page: 1})}
                        className="border border-gray-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
                    <input type="date" 
                        value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value, page: 1})}
                        className="border border-gray-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Loại cuộc gọi</label>
                    <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value, page: 1})}
                        className="border border-gray-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 w-32">
                       <option value="">Tất cả</option>
                       <option value="INBOUND">Gọi đến</option>
                       <option value="OUTBOUND">Gọi đi</option>
                   </select>
               </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái</label>
                    <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value, page: 1})}
                        className="border border-gray-200 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 w-32">
                       <option value="">Tất cả</option>
                       <option value="ANSWER">Thành công</option>
                       <option value="NOANSWER">K. Bắt Máy</option>
                       <option value="BUSY">Máy bận</option>
                       <option value="CANCEL">Khách hủy</option>
                       <option value="FAILED">Thất bại</option>
                   </select>
               </div>
           </div>

           {/* CALL LOGS */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="p-4 border-b border-gray-100 font-semibold text-gray-800 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                       <Clock className="w-5 h-5 text-indigo-500" />
                       Lịch sử cuộc gọi
                   </div>
                   <button 
                       onClick={handleSync} 
                       disabled={isSyncing}
                       className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                   >
                       <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                       {isSyncing ? "Đang đồng bộ..." : "Đồng bộ log từ máy chủ (2 ngày)"}
                   </button>
               </div>
               <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('time')}>Thời gian {renderSortIcon('time')}</th>
                                <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('type')}>Loại {renderSortIcon('type')}</th>
                                <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('customer')}>Khách hàng {renderSortIcon('customer')}</th>
                                <th className="px-4 py-3">SĐT</th>
                                <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('agent')}>Agent {renderSortIcon('agent')}</th>
                                <th className="px-4 py-3">Thời lượng</th>
                                <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => handleSort('status')}>Trạng thái {renderSortIcon('status')}</th>
                                <th className="px-4 py-3">Ghi âm</th>
                            </tr>
                        </thead>
                       <tbody className="divide-y divide-gray-100">
                           {initialLogs.map((log: any) => (
                               <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                   <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                        {new Date(log.startedAt).toLocaleString('vi-VN')}
                                   </td>
                                   <td className="px-4 py-3">
                                       {log.type === 'INBOUND' ? <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-medium border border-green-200">Gọi Đến</span> 
                                       : log.type === 'OUTBOUND' ? <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium border border-blue-200">Gọi Đi</span>
                                       : <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-xs font-medium border border-gray-200">{log.type}</span>}
                                   </td>
                                   <td className="px-4 py-3 font-medium text-gray-900">
                                        {log.customer?.name || log.lead?.name || '-'}
                                   </td>
                                   <td className="px-4 py-3">{log.phone}</td>
                                   <td className="px-4 py-3">{log.user?.name || `EXT: ${log.extension}`}</td>
                                   <td className="px-4 py-3">
                                        {formatDuration(log.billsec)} / {formatDuration(log.duration)}
                                   </td>
                                   <td className="px-4 py-3">
                                       {log.status === 'ANSWER' || log.status === 'ANSWERED' ? <span className="text-emerald-600">Thành công</span>
                                       : log.status === 'NOANSWER' ? <span className="text-amber-500">K. Bắt Máy</span>
                                       : <span className="text-rose-500">{log.status}</span>}
                                   </td>
                                   <td className="px-4 py-3">
                                       {log.recordingUrl ? (
                                           <audio controls src={log.recordingUrl} className="h-8 w-[200px]" />
                                       ) : <span className="text-gray-400">Không có</span>}
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                    </table>
                </div>
                
                {/* PAGINATION */}
                <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 bg-white">
                    <div className="flex items-center gap-2">
                        <span>Hiển thị</span>
                        <select 
                            value={filters.perPage} 
                            onChange={(e) => setFilters(prev => ({ ...prev, perPage: Number(e.target.value), page: 1 }))}
                            className="border border-gray-200 rounded p-1 text-gray-700 bg-gray-50 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span>dòng / trang</span>
                    </div>
                    <div>
                        Hiển thị <b>{totalCount > 0 ? ((filters.page - 1) * filters.perPage + 1) : 0} - {Math.min(filters.page * filters.perPage, totalCount || 0)}</b> của <b>{totalCount || 0}</b> kết quả
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            disabled={filters.page <= 1}
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                            className="p-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-3 font-medium text-gray-700">Trang {filters.page} / {Math.max(1, Math.ceil((totalCount || 0) / filters.perPage))}</span>
                        <button 
                            disabled={filters.page >= Math.ceil((totalCount || 0) / filters.perPage)}
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                            className="p-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
