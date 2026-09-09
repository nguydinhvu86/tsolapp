'use client';

import React, { useState, useMemo } from 'react';
import { toggleUserActiveStatus, getUserLoginLogs } from './actions';
import { Activity, MonitorSmartphone, Wifi, WifiOff, List, X, Users, ShieldCheck, ShieldAlert, Search, Laptop, Smartphone } from 'lucide-react';
import { Modal } from '@/app/components/ui/Modal';
import { AvatarImage } from '@/app/components/ui/AvatarImage';

const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

interface UserData {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    role: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    lastActiveAt: Date | null;
    currentPlatform: string | null;
    _count: {
        loginLogs: number;
    };
}

export default function MonitoringClient({ users }: { users: UserData[] }) {
    const [data, setData] = useState(users);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // Calculate online status (active within last 15 minutes)
    const isOnline = (lastActiveAt: Date | null) => {
        if (!lastActiveAt) return false;
        const diffInMinutes = (new Date().getTime() - new Date(lastActiveAt).getTime()) / 60000;
        return diffInMinutes <= 15;
    };

    // KPI Metrics
    const totalUsers = data.length;
    const onlineUsers = data.filter(u => isOnline(u.lastActiveAt)).length;
    const offlineUsers = totalUsers - onlineUsers;
    const disabledUsers = data.filter(u => !u.isActive).length;

    // Filtered users
    const filteredUsers = useMemo(() => {
        return data.filter(u => {
            const matchesSearch = 
                (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.role || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const online = isOnline(u.lastActiveAt);
            let matchesStatus = true;
            if (statusFilter === 'ONLINE') matchesStatus = online;
            else if (statusFilter === 'OFFLINE') matchesStatus = !online;
            else if (statusFilter === 'DISABLED') matchesStatus = !u.isActive;

            return matchesSearch && matchesStatus;
        });
    }, [data, searchTerm, statusFilter]);

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        setLoadingId(userId);
        try {
            const res = await toggleUserActiveStatus(userId);
            if (res.success) {
                setData(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
            } else {
                alert(res.error || 'Lỗi khi cập nhật trạng thái');
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi gửi request');
        } finally {
            setLoadingId(null);
        }
    };

    const handleViewLogs = async (user: UserData) => {
        setSelectedUser(user);
        setLogsLoading(true);
        setLogs([]);
        try {
            const res = await getUserLoginLogs(user.id);
            if (res.success && res.data) {
                setLogs(res.data);
            } else {
                alert(res.error || 'Lỗi tải lịch sử');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLogsLoading(false);
        }
    };

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></span>
                        Bảng Giám Sát Người Dùng
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Theo dõi thời gian thực phiên hoạt động, thiết bị đăng nhập và kiểm soát quyền truy cập tài khoản
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live Monitor
                    </span>
                </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tổng Tài Khoản</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-slate-900">{totalUsers}</span>
                            <span className="text-xs text-slate-400 font-medium">user</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Nhân sự trong hệ thống</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                        <Users size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-emerald-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Đang Trực Tuyến</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-emerald-600">{onlineUsers}</span>
                            <span className="text-xs text-slate-400 font-medium">online</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Hoạt động trong 15 phút</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <Wifi size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Ngoại Tuyến</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-slate-600">{offlineUsers}</span>
                            <span className="text-xs text-slate-400 font-medium">offline</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Chưa có phiên làm việc</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                        <WifiOff size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-rose-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Bị Khóa Truy Cập</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-rose-600">{disabledUsers}</span>
                            <span className="text-xs text-slate-400 font-medium">tài khoản</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Bị chặn đăng nhập</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                        <ShieldAlert size={22} />
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Tìm kiếm nhân sự theo tên, email, vai trò..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            {['ALL', 'ONLINE', 'OFFLINE', 'DISABLED'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                        statusFilter === st 
                                            ? 'bg-white text-slate-900 shadow-xs' 
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    {st === 'ALL' ? 'Tất cả' : st === 'ONLINE' ? 'Đang Online' : st === 'OFFLINE' ? 'Ngoại tuyến' : 'Đã khóa'}
                                </button>
                            ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2.5 py-1 rounded-full">
                            {filteredUsers.length} tài khoản
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Nhân Sự</th>
                                <th className="px-4 py-3 text-center">Vai Trò</th>
                                <th className="px-4 py-3 text-left">Tình Trạng</th>
                                <th className="px-4 py-3 text-left">Đăng Nhập Cuối</th>
                                <th className="px-4 py-3 text-right">Quyền Truy Cập</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-slate-500 bg-slate-50/30">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="w-10 h-10 text-slate-300 mb-2.5" strokeWidth={1.5} />
                                            <h3 className="text-sm font-bold text-slate-700">Không tìm thấy tài khoản phù hợp</h3>
                                            <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.map((user) => {
                                const online = isOnline(user.lastActiveAt);
                                return (
                                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                                        {/* User Identity */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="relative shrink-0">
                                                    <AvatarImage 
                                                        src={user.avatar?.startsWith('http') ? user.avatar : user.avatar ? `/${user.avatar.replace(/^\//, '')}` : null} 
                                                        name={user.name || user.email} 
                                                        size={36} 
                                                        className="border border-slate-200"
                                                    />
                                                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-900 truncate">{user.name || 'Chưa cập nhật tên'}</div>
                                                    <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role */}
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                                                user.role === 'ADMIN' 
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>

                                        {/* Online status */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {online ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                        Đang Online
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200">
                                                        <WifiOff size={11} className="text-slate-400" />
                                                        Ngoại tuyến
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Last login & device */}
                                        <td className="px-4 py-3">
                                            <div>
                                                {user.lastLoginAt ? (
                                                    <div className="font-mono text-xs font-semibold text-slate-800">
                                                        {formatDate(new Date(user.lastLoginAt))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 italic">Chưa đăng nhập</span>
                                                )}
                                                {user.currentPlatform && (
                                                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <MonitorSmartphone size={12} className="text-slate-400 shrink-0" />
                                                        <span>{user.currentPlatform}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions & Access Toggle */}
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => handleViewLogs(user)}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                                                >
                                                    <List size={12} /> Chi tiết
                                                </button>
                                                
                                                <button
                                                    onClick={() => handleToggleStatus(user.id, user.isActive)}
                                                    disabled={loadingId === user.id}
                                                    title={user.isActive ? "Bấm để khóa tài khoản" : "Bấm để mở khóa tài khoản"}
                                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                        user.isActive ? 'bg-emerald-600' : 'bg-slate-300'
                                                    } ${loadingId === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                        user.isActive ? 'translate-x-4' : 'translate-x-0'
                                                    }`} />
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

            {/* Login History Modal */}
            <Modal
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                title={`Lịch sử truy cập - ${selectedUser?.name || selectedUser?.email}`}
                maxWidth="max-w-4xl"
            >
                <div className="p-5" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                    {logsLoading ? (
                        <div className="flex justify-center p-12 text-slate-400 text-xs font-medium">Đang tải dữ liệu phiên làm việc...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center p-12 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                            Không có lịch sử đăng nhập nào được ghi nhận.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full border-collapse text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                                    <tr>
                                        <th className="py-2.5 px-3.5">Thời Gian Đăng Nhập</th>
                                        <th className="py-2.5 px-3.5">Kết Thúc Phiên</th>
                                        <th className="py-2.5 px-3.5">Thiết Bị / OS</th>
                                        <th className="py-2.5 px-3.5">Địa Chỉ IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                                                {formatDate(new Date(log.loginAt))}
                                            </td>
                                            <td className="py-2.5 px-3.5">
                                                {log.logoutAt ? (
                                                    <span className="font-mono text-slate-700">{formatDate(new Date(log.logoutAt))}</span>
                                                ) : (
                                                    <span className="text-emerald-600 font-bold italic text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                        Đang giữ phiên
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-slate-600">
                                                {log.platform || 'Bị ẩn'}
                                            </td>
                                            <td className="py-2.5 px-3.5 font-mono text-slate-500">
                                                {log.ipAddress || '---'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
