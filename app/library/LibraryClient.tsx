'use client';

import React, { useState, useMemo } from 'react';
import { 
    Folder, 
    File, 
    BookOpen, 
    Search, 
    PlayCircle, 
    Layers, 
    FileText, 
    Link2, 
    Presentation,
    MessageSquare,
    Sparkles,
    User
} from 'lucide-react';
import Link from 'next/link';
import { LibraryActionButtons, CreateCategoryButton } from './LibraryActionButtons';
import { MoveDocumentButton } from './MoveDocumentButton';
import { DeleteDocumentButton } from './DeleteDocumentButton';
import { ShareButton } from './document/[id]/ShareButton';
import { AvatarImage } from '@/app/components/ui/AvatarImage';

const getFileIcon = (type: string, size = 40) => {
    switch (type) {
        case 'VIDEO': return <PlayCircle size={size} className="text-rose-500" />;
        case 'PDF': return <FileText size={size} className="text-red-500" />;
        case 'LINK': return <Link2 size={size} className="text-blue-500" />;
        case 'PPT': return <Presentation size={size} className="text-amber-500" />;
        default: return <File size={size} className="text-slate-400" />;
    }
};

const getTypeBadge = (type: string) => {
    switch (type) {
        case 'VIDEO': return 'bg-rose-50 text-rose-700 border-rose-200/60';
        case 'PDF': return 'bg-red-50 text-red-700 border-red-200/60';
        case 'LINK': return 'bg-blue-50 text-blue-700 border-blue-200/60';
        case 'PPT': return 'bg-amber-50 text-amber-700 border-amber-200/60';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

export default function LibraryClient({
    categories,
    initialDocuments,
    currentCategoryId,
    initialSearch,
    canManage,
}: {
    categories: any[];
    initialDocuments: any[];
    currentCategoryId?: string;
    initialSearch?: string;
    canManage: boolean;
}) {
    const [searchTerm, setSearchTerm] = useState(initialSearch || '');

    const activeCategory = currentCategoryId ? categories.find((c: any) => c.id === currentCategoryId) : null;
    const rootCategories = categories.filter((c: any) => !c.parentId);

    const filteredDocuments = useMemo(() => {
        return initialDocuments.filter((doc: any) => {
            const matchesSearch = 
                doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesSearch;
        });
    }, [initialDocuments, searchTerm]);

    const pdfCount = initialDocuments.filter((d: any) => d.fileType === 'PDF').length;
    const videoCount = initialDocuments.filter((d: any) => d.fileType === 'VIDEO').length;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">
                                {activeCategory ? activeCategory.name : 'Thư Viện & Đào Tạo'}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                {initialDocuments.length} Tài Liệu
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {activeCategory?.description || 'Hệ thống lưu trữ tài liệu hướng dẫn nghiệp vụ, quy trình và đào tạo nội bộ'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <LibraryActionButtons currentCategoryId={currentCategoryId} canManage={canManage} categories={categories} />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng tài liệu</div>
                        <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{initialDocuments.length}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <BookOpen className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Danh mục đào tạo</div>
                        <div className="text-2xl font-mono font-bold text-indigo-600 mt-1">{categories.length}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Folder className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tài liệu PDF</div>
                        <div className="text-2xl font-mono font-bold text-red-600 mt-1">{pdfCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Video hướng dẫn</div>
                        <div className="text-2xl font-mono font-bold text-rose-600 mt-1">{videoCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                        <PlayCircle className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Layout: Sidebar Categories + Main Grid */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Category Sidebar */}
                <div className="w-full md:w-64 shrink-0">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-2 sticky top-6">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Danh Mục</span>
                            {canManage && <CreateCategoryButton parentId={undefined} iconOnly={false} compact />}
                        </div>

                        <div className="space-y-1 pt-1">
                            <Link 
                                href="/library" 
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                    !currentCategoryId 
                                        ? 'bg-indigo-50 text-indigo-700 font-bold' 
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Layers className="w-4 h-4 text-slate-400" />
                                <span className="flex-1">Tất cả tài liệu</span>
                            </Link>

                            {rootCategories.map((cat: any) => {
                                const isActive = currentCategoryId === cat.id;
                                const childCategories = categories.filter((c: any) => c.parentId === cat.id);
                                return (
                                    <div key={cat.id} className="space-y-1">
                                        <div className="flex items-center group">
                                            <Link
                                                href={`/library?category=${cat.id}`}
                                                className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors truncate ${
                                                    isActive 
                                                        ? 'bg-indigo-50 text-indigo-700 font-bold' 
                                                        : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <Folder className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                <span className="truncate flex-1">{cat.name}</span>
                                                {cat._count?.documents > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-500">
                                                        {cat._count.documents}
                                                    </span>
                                                )}
                                            </Link>
                                            {canManage && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                                                    <CreateCategoryButton parentId={cat.id} iconOnly />
                                                </div>
                                            )}
                                        </div>

                                        {/* Sub-categories */}
                                        {childCategories.length > 0 && (
                                            <div className="pl-4 space-y-1 border-l-2 border-slate-100 ml-3">
                                                {childCategories.map((child: any) => {
                                                    const isChildActive = currentCategoryId === child.id;
                                                    return (
                                                        <Link
                                                            key={child.id}
                                                            href={`/library?category=${child.id}`}
                                                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors truncate ${
                                                                isChildActive 
                                                                    ? 'bg-indigo-50 text-indigo-700 font-bold' 
                                                                    : 'text-slate-500 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                            <span className="truncate flex-1">{child.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 space-y-5">
                    {/* Search Ribbon */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm tài liệu theo tiêu đề, mô tả..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Document Grid */}
                    {filteredDocuments.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4">
                                <BookOpen className="w-8 h-8" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-1">Không tìm thấy tài liệu</h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                                Chưa có tài liệu nào trong phân loại này hoặc từ khóa tìm kiếm không khớp.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredDocuments.map((doc: any) => (
                                <div
                                    key={doc.id}
                                    className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between overflow-hidden"
                                >
                                    {/* Cover / Icon Header */}
                                    <Link href={`/library/document/${doc.id}`} className="block relative h-36 bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden cursor-pointer">
                                        {doc.thumbnail ? (
                                            <img src={doc.thumbnail} alt={doc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="p-4 rounded-2xl bg-white shadow-xs border border-slate-100">
                                                {getFileIcon(doc.fileType, 40)}
                                            </div>
                                        )}

                                        <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-xs ${getTypeBadge(doc.fileType)}`}>
                                            {doc.fileType || 'DOC'}
                                        </span>

                                        {doc.fileType === 'VIDEO' && (
                                            <div className="absolute inset-0 bg-slate-950/20 flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-white/90 text-rose-600 flex items-center justify-center shadow-md">
                                                    <PlayCircle className="w-6 h-6" />
                                                </div>
                                            </div>
                                        )}
                                    </Link>

                                    {/* Content */}
                                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                        <Link href={`/library/document/${doc.id}`} className="block">
                                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                {doc.title}
                                            </h3>
                                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                                {doc.description || "Không có mô tả chi tiết."}
                                            </p>
                                        </Link>

                                        {/* Footer */}
                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <AvatarImage src={doc.creator?.avatar} name={doc.creator?.name} size={20} className="w-5 h-5 rounded-full" />
                                                <span className="truncate max-w-[90px] font-medium text-slate-700">{doc.creator?.name}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold mr-1">
                                                    <MessageSquare className="w-3 h-3" />
                                                    <span>{doc._count?.comments || 0}</span>
                                                </div>

                                                {canManage && (
                                                    <>
                                                        <MoveDocumentButton documentId={doc.id} currentCategoryId={doc.categoryId} categories={categories} isIconOnly />
                                                        <DeleteDocumentButton documentId={doc.id} isIconOnly />
                                                    </>
                                                )}
                                                <ShareButton documentId={doc.id} isIconOnly />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
