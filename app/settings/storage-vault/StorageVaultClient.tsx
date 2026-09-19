'use client'

import React, { useState, useEffect } from 'react';
import { 
    Database, 
    FileText, 
    ShieldCheck, 
    Clock, 
    Layers, 
    RefreshCw, 
    Search, 
    HardDrive,
    ExternalLink,
    Lock
} from 'lucide-react';
import { fetchVaultAndAuditData } from './actions';

export default function StorageVaultClient() {
    const [attachments, setAttachments] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'vault' | 'audit'>('vault');

    const loadData = async () => {
        setLoading(true);
        const res = await fetchVaultAndAuditData();
        if (res.success) {
            setAttachments(res.attachments || []);
            setLogs(res.logs || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const formatFileSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                        <Lock className="w-5 h-5" /> Bảo Mật & Quản Trị CSDL Tập Trung
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Kho Lưu Trữ Đính Kèm & Nhật Ký Kiểm Toán Hợp Nhất</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Quản trị tập trung toàn bộ tệp đính kèm trong CSDL và giám sát chi tiết lịch sử thay đổi dữ liệu (Audit Log)
                    </p>
                </div>
                <button
                    onClick={loadData}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => setActiveTab('vault')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'vault' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <HardDrive className="w-4 h-4" /> Kho Tệp Đính Kèm Tập Trung ({attachments.length})
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" /> Nhật Ký Kiểm Toán Hợp Nhất ({logs.length})
                </button>
            </div>

            {/* Tab 1: Vault */}
            {activeTab === 'vault' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    {attachments.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <HardDrive className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="font-semibold text-base">Kho lưu trữ tệp đính kèm tập trung đang sẵn sàng</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold">
                                        <th className="py-3 px-4">Tên Tệp</th>
                                        <th className="py-3 px-4">Thực Thể Liên Kết</th>
                                        <th className="py-3 px-4">Dung Lượng</th>
                                        <th className="py-3 px-4">Ngày Đính Kèm</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attachments.map((att) => (
                                        <tr key={att.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                                {att.fileName}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                    {att.entityType}: {att.entityId}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 text-xs font-mono">
                                                {formatFileSize(att.fileSize)}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-500">
                                                {new Date(att.createdAt).toLocaleString('vi-VN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Audit Logs */}
            {activeTab === 'audit' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    {logs.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="font-semibold text-base">Hệ thống giám sát kiểm toán hợp nhất đang chạy ngầm</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold">
                                        <th className="py-3 px-4">Hành Động</th>
                                        <th className="py-3 px-4">Đối Tượng</th>
                                        <th className="py-3 px-4">Chi Tiết</th>
                                        <th className="py-3 px-4">Thời Gian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                            <td className="py-3 px-4 font-bold text-xs uppercase text-blue-600 dark:text-blue-400">
                                                {log.action}
                                            </td>
                                            <td className="py-3 px-4 text-xs font-mono">
                                                {log.entityType} ({log.entityId})
                                            </td>
                                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300 text-xs">
                                                {log.details || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-500">
                                                {new Date(log.createdAt).toLocaleString('vi-VN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
