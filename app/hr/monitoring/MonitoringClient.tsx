'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { toggleUserActiveStatus, getUserLoginLogs } from './actions';
import { Activity, MonitorSmartphone, Wifi, WifiOff, List, X } from 'lucide-react';
import { Modal } from '@/app/components/ui/Modal';

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

    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // Calculate online status (active within last 15 minutes)
    const isOnline = (lastActiveAt: Date | null) => {
        if (!lastActiveAt) return false;
        const diffInMinutes = (new Date().getTime() - new Date(lastActiveAt).getTime()) / 60000;
        return diffInMinutes <= 15;
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        setLoadingId(userId);
        try {
            const res = await toggleUserActiveStatus(userId);
            if (res.success) {
                // Optimistic UI update
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
        <Card>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold m-0 flex items-center gap-2 text-gray-900">
                    <Activity size={20} className="text-primary" /> Bảng Giám Sát Người Dùng
                </h2>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nhân sự</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vai trò</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tình trạng</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Đăng nhập cuối</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Quyền truy cập</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {data.map((user) => {
                            const online = isOnline(user.lastActiveAt);
                            return (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex-shrink-0">
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt={user.name || ''} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">{user.name || 'Chưa cập nhật tên'}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {online ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-slate-400" />}
                                            <span className={`text-sm ${online ? 'font-medium text-green-600' : 'italic text-slate-500'}`}>
                                                {online ? 'Đang Online' : 'Ngoại tuyến'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="text-sm">
                                            {user.lastLoginAt ? (
                                                <div className="text-gray-900 font-medium">{formatDate(new Date(user.lastLoginAt))}</div>
                                            ) : (
                                                <span className="text-gray-500 italic">Chưa đăng nhập</span>
                                            )}
                                            {user.currentPlatform && (
                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <MonitorSmartphone size={14} /> {user.currentPlatform}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-4">
                                            <button
                                                onClick={() => handleViewLogs(user)}
                                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium border border-blue-200 bg-blue-50 px-2 py-1.5 rounded"
                                            >
                                                <List size={14} /> Chi tiết
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(user.id, user.isActive)}
                                                disabled={loadingId === user.id}
                                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${user.isActive ? 'bg-blue-600' : 'bg-gray-200'
                                                    } ${loadingId === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                aria-label="Kích hoạt tài khoản"
                                            >
                                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.isActive ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500 bg-gray-50">
                                    Không có dữ liệu người dùng.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col gap-4 mt-6">
                {data.map((user) => {
                    const online = isOnline(user.lastActiveAt);
                    return (
                        <div key={user.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0 flex items-center gap-3">
                                    <div className="relative flex-shrink-0">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.name || ''} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-semibold text-base text-primary truncate">
                                            {user.name || '---'}
                                        </div>
                                        <div className="text-sm text-gray-500 mt-1 truncate">{user.email}</div>
                                    </div>
                                </div>
                                <span className={`flex-shrink-0 px-2 py-1 rounded-full text-[0.7rem] font-semibold ${user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                    {user.role}
                                </span>
                            </div>

                            <div className="mt-3 flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    {online ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-slate-400" />}
                                    <span className={`text-sm ${online ? 'font-medium text-green-600' : 'italic text-slate-500'}`}>
                                        {online ? 'Đang Online' : 'Ngoại tuyến'}
                                    </span>
                                </div>
                                <div className="text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    {user.lastLoginAt ? (
                                        <div className="text-gray-900 font-medium">Đăng nhập: {formatDate(new Date(user.lastLoginAt))}</div>
                                    ) : (
                                        <span className="text-gray-500 italic">Chưa đăng nhập</span>
                                    )}
                                    {user.currentPlatform && (
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1.5">
                                            <MonitorSmartphone size={14} /> {user.currentPlatform}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-100">
                                <button
                                    onClick={() => handleViewLogs(user)}
                                    className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100"
                                >
                                    <List size={14} /> Lịch sử
                                </button>
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-medium ${user.isActive ? 'text-green-600' : 'text-red-500'}`}>
                                        {user.isActive ? 'Đang Kính hoạt' : 'Đã Khóa'}
                                    </span>
                                    <button
                                        onClick={() => handleToggleStatus(user.id, user.isActive)}
                                        disabled={loadingId === user.id}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${user.isActive ? 'bg-blue-600' : 'bg-gray-200'
                                            } ${loadingId === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        aria-label="Kích hoạt tài khoản"
                                    >
                                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${user.isActive ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {data.length === 0 && (
                    <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                        Không có dữ liệu người dùng.
                    </div>
                )}
            </div>

            <Modal
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                title={`Lịch sử truy cập - ${selectedUser?.name || selectedUser?.email}`}
                maxWidth="max-w-4xl"
            >
                <div className="p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {logsLoading ? (
                        <div className="flex justify-center p-8 text-gray-500">Đang tải dữ liệu...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg">Không có lịch sử đăng nhập nào được ghi nhận.</div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="py-2 px-3 font-semibold text-gray-600">Đăng nhập</th>
                                        <th className="py-2 px-3 font-semibold text-gray-600">Thời gian kết thúc</th>
                                        <th className="py-2 px-3 font-semibold text-gray-600">Thiết bị</th>
                                        <th className="py-2 px-3 font-semibold text-gray-600">IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50">
                                            <td className="py-2 px-3 whitespace-nowrap text-gray-900 font-medium">
                                                {formatDate(new Date(log.loginAt))}
                                            </td>
                                            <td className="py-2 px-3 whitespace-nowrap">
                                                {log.logoutAt ? (
                                                    <span className="text-gray-900">{formatDate(new Date(log.logoutAt))}</span>
                                                ) : (
                                                    <span className="text-green-600 font-medium italic text-sm">Đang giữ phiên</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3 whitespace-nowrap text-gray-500">
                                                {log.platform || 'Bị ẩn'}
                                            </td>
                                            <td className="py-2 px-3 whitespace-nowrap text-gray-500">
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
        </Card>
    );
}
