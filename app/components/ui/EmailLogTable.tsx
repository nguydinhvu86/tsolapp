'use client'

import React, { useState } from 'react';
import { formatDate } from '@/lib/utils/formatters';
import { MailCheck, MailOpen, MailX, ChevronDown, ChevronRight, Search, Info } from 'lucide-react';

interface EmailLogProps {
    emailLogs: any[];
}

export function EmailLogTable({ emailLogs }: EmailLogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    if (!emailLogs || emailLogs.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                Chưa có lịch sử gửi email nào.
            </div>
        );
    }

    const toggleRow = (id: string) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'SENT': return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: <MailCheck size={16} />, label: 'Đã gửi' };
            case 'OPENED': return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: <MailOpen size={16} />, label: 'Khách Đã Mở' };
            case 'FAILED': return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: <MailX size={16} />, label: 'Lỗi' };
            default: return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: <MailCheck size={16} />, label: status };
        }
    };

    const filteredLogs = emailLogs.filter((log: any) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            log.subject?.toLowerCase().includes(q) ||
            log.toEmail?.toLowerCase().includes(q) ||
            log.sender?.name?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="relative max-w-md">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo tiêu đề, email người nhận hoặc người gửi..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="w-10 px-4 py-3"></th>
                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="px-4 py-3">Tiêu đề</th>
                            <th className="px-4 py-3">Gửi đến</th>
                            <th className="px-4 py-3">Người gửi</th>
                            <th className="px-4 py-3">Thời điểm gửi</th>
                            <th className="px-4 py-3">Mở lúc (Ghi nhận)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredLogs.map((log: any) => {
                            const status = getStatusStyle(log.status);
                            const isExpanded = expandedRows.includes(log.id);

                            return (
                                <React.Fragment key={log.id}>
                                    <tr
                                        onClick={() => toggleRow(log.id)}
                                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <td className="px-4 py-3 text-gray-400">
                                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                                                {status.icon}
                                                <span>{status.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-[250px] truncate" title={log.subject}>
                                            {log.subject}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.toEmail}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.sender?.name || 'Hệ thống'}</td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400" suppressHydrationWarning>
                                            {formatDate(new Date(log.createdAt))}
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.openedAt ? (
                                                <span className="text-green-600 dark:text-green-400 font-medium" suppressHydrationWarning>
                                                    {formatDate(new Date(log.openedAt))}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic">Chưa mở</span>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-50 dark:bg-gray-800/30">
                                            <td colSpan={7} className="px-8 py-4 border-l-4 border-blue-400">
                                                <div className="text-sm">
                                                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Nội dung Email đính kèm (Log):</div>
                                                    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 max-h-[400px] overflow-y-auto">
                                                        {/* Sanitize conceptually, but since it's internal we render safely */}
                                                        <div dangerouslySetInnerHTML={{ __html: log.body }} className="prose dark:prose-invert max-w-none text-sm" />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-8 text-center text-gray-500">
                                    Không tìm thấy dòng nhật ký email phù hợp với tìm kiếm.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
