'use client';

import React, { useState, useMemo } from 'react';
import { Folder, FileText, ArrowUpRight, FileCheck, X } from 'lucide-react';
import PortalQuickDateFilter from '../components/PortalQuickDateFilter';
import PortalExportPdfButton from '../components/PortalExportPdfButton';

export interface DocumentItem {
    id: string;
    title: string;
    date: string;
    type: 'CONTRACT' | 'HANDOVER';
    typeLabel: string;
    status: string;
    statusLabel: string;
    statusColor: string;
    url: string;
}

interface DocumentsClientProps {
    initialDocuments: DocumentItem[];
    customerName: string;
}

export default function DocumentsClient({ initialDocuments, customerName }: DocumentsClientProps) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [search, setSearch] = useState('');
    const [selectedType, setSelectedType] = useState('ALL');

    const filteredDocuments = useMemo(() => {
        return initialDocuments.filter(doc => {
            if (selectedType !== 'ALL' && doc.type !== selectedType) return false;

            if (search.trim()) {
                const q = search.toLowerCase().trim();
                if (!doc.title.toLowerCase().includes(q)) return false;
            }

            if (from) {
                const itemDate = doc.date.split('T')[0];
                if (itemDate < from) return false;
            }
            if (to) {
                const itemDate = doc.date.split('T')[0];
                if (itemDate > to) return false;
            }

            return true;
        });
    }, [initialDocuments, selectedType, search, from, to]);

    const contractsCount = initialDocuments.filter(d => d.type === 'CONTRACT').length;
    const handoversCount = initialDocuments.filter(d => d.type === 'HANDOVER').length;

    const handleResetFilter = () => {
        setFrom('');
        setTo('');
        setSearch('');
        setSelectedType('ALL');
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <Folder size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Tài Liệu Của Tôi</h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Hồ sơ hợp đồng kinh tế và biên bản bàn giao lưu trữ.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <PortalExportPdfButton
                        targetId="portal-documents-print"
                        fileName={`Ho_so_tai_lieu_${customerName}`}
                    />
                </div>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
                <div
                    onClick={() => setSelectedType('ALL')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedType === 'ALL' ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-400/30' : 'bg-white border-slate-200 hover:border-purple-300'
                    }`}
                >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tổng Hồ Sơ Lưu Trữ</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">{initialDocuments.length} tài liệu</p>
                </div>

                <div
                    onClick={() => setSelectedType(selectedType === 'CONTRACT' ? 'ALL' : 'CONTRACT')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedType === 'CONTRACT' ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/30' : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Hợp Đồng Kinh Tế</p>
                    <p className="text-2xl font-black text-indigo-600 tracking-tight">{contractsCount} hợp đồng</p>
                </div>

                <div
                    onClick={() => setSelectedType(selectedType === 'HANDOVER' ? 'ALL' : 'HANDOVER')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedType === 'HANDOVER' ? 'bg-teal-50/80 border-teal-300 ring-2 ring-teal-400/30' : 'bg-white border-slate-200 hover:border-teal-300'
                    }`}
                >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Biên Bản Bàn Giao</p>
                    <p className="text-2xl font-black text-teal-600 tracking-tight">{handoversCount} biên bản</p>
                </div>
            </div>

            {/* Quick Filter Component */}
            <PortalQuickDateFilter
                from={from}
                to={to}
                search={search}
                onFromChange={setFrom}
                onToChange={setTo}
                onSearchChange={setSearch}
                onReset={handleResetFilter}
                placeholderSearch="Tìm theo tiêu đề hợp đồng, biên bản..."
            />

            {/* Type Filter Pills */}
            <div className="flex items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm print:hidden text-xs font-semibold">
                <span className="text-slate-400 uppercase text-[11px] mr-1">Phân loại:</span>
                {[
                    { id: 'ALL', label: 'Tất cả tài liệu' },
                    { id: 'CONTRACT', label: 'Hợp đồng' },
                    { id: 'HANDOVER', label: 'Biên bản bàn giao' },
                ].map(t => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedType(t.id)}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                            selectedType === t.id
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Printable Container */}
            <div id="portal-documents-print" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                <div className="hidden print:block p-6 border-b border-slate-800 text-center">
                    <h2 className="text-2xl font-black uppercase text-slate-900 mb-1">DANH SÁCH HỒ SƠ TÀI LIỆU KHÁCH HÀNG</h2>
                    <p className="text-base font-bold text-slate-800">Khách hàng: {customerName}</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold print:text-slate-800">
                                <th className="px-5 py-4">Tên Văn Bản / Hồ Sơ</th>
                                <th className="px-4 py-4 w-36">Phân Loại</th>
                                <th className="px-4 py-4 w-36">Ngày Tạo</th>
                                <th className="px-4 py-4 text-center w-32">Trạng Thái</th>
                                <th className="px-4 py-4 text-right w-28 print:hidden">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredDocuments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                        Không tìm thấy tài liệu nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filteredDocuments.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-3.5 font-bold text-slate-800">
                                            <p className="line-clamp-1">{doc.title}</p>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                                                doc.type === 'CONTRACT' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                                            }`}>
                                                {doc.typeLabel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                                            {new Date(doc.date).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${doc.statusColor}`}>
                                                {doc.statusLabel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right print:hidden">
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                            >
                                                Xem PDF &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
