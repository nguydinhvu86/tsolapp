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
    User,
    Shield,
    ShieldAlert,
    Lock,
    Star,
    LayoutGrid,
    List as ListIcon,
    ChevronRight,
    Download,
    ExternalLink,
    Eye,
    Building2,
    Globe,
    HardDrive,
    Plus,
    X,
    Image as ImageIcon,
    FileSpreadsheet,
    Check
} from 'lucide-react';
import Link from 'next/link';
import { LibraryActionButtons, CreateCategoryButton } from './LibraryActionButtons';
import { MoveDocumentButton } from './MoveDocumentButton';
import { DeleteDocumentButton } from './DeleteDocumentButton';
import { ShareButton } from './document/[id]/ShareButton';
import { AvatarImage } from '@/app/components/ui/AvatarImage';
import { toggleStarDocument } from './actions';
import { toast } from '@/app/components/providers/ToastProvider';

const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '';
    }
};

const getFileIcon = (type: string, size = 36) => {
    switch (type) {
        case 'VIDEO': return <PlayCircle size={size} className="text-rose-500" />;
        case 'PDF': return <FileText size={size} className="text-red-500" />;
        case 'WORD': return <FileText size={size} className="text-blue-600" />;
        case 'EXCEL': return <FileSpreadsheet size={size} className="text-emerald-600" />;
        case 'PPT': return <Presentation size={size} className="text-amber-500" />;
        case 'IMAGE': return <ImageIcon size={size} className="text-violet-500" />;
        case 'LINK': return <Link2 size={size} className="text-sky-500" />;
        default: return <File size={size} className="text-slate-400" />;
    }
};

const getTypeBadge = (type: string) => {
    switch (type) {
        case 'VIDEO': return 'bg-rose-50 text-rose-700 border-rose-200/60';
        case 'PDF': return 'bg-red-50 text-red-700 border-red-200/60';
        case 'WORD': return 'bg-blue-50 text-blue-700 border-blue-200/60';
        case 'EXCEL': return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
        case 'PPT': return 'bg-amber-50 text-amber-700 border-amber-200/60';
        case 'IMAGE': return 'bg-violet-50 text-violet-700 border-violet-200/60';
        case 'LINK': return 'bg-sky-50 text-sky-700 border-sky-200/60';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

export default function LibraryClient({
    categories,
    initialDocuments,
    currentCategoryId,
    initialSearch,
    canManage,
    isLeadership = false,
    currentUser
}: {
    categories: any[];
    initialDocuments: any[];
    currentCategoryId?: string;
    initialSearch?: string;
    canManage: boolean;
    isLeadership?: boolean;
    currentUser?: any;
}) {
    const [searchTerm, setSearchTerm] = useState(initialSearch || '');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [selectedSecurity, setSelectedSecurity] = useState<string>('ALL');
    const [filterStarredOnly, setFilterStarredOnly] = useState<boolean>(false);
    const [documents, setDocuments] = useState(initialDocuments);

    // Active Category hierarchy
    const activeCategory = useMemo(() => {
        return currentCategoryId ? categories.find((c: any) => c.id === currentCategoryId) : null;
    }, [categories, currentCategoryId]);

    // Parent hierarchy for breadcrumbs
    const breadcrumbs = useMemo(() => {
        const crumbs: any[] = [];
        let curr = activeCategory;
        while (curr) {
            crumbs.unshift(curr);
            curr = curr.parentId ? categories.find((c: any) => c.id === curr.parentId) : null;
        }
        return crumbs;
    }, [activeCategory, categories]);

    // Sub-categories inside current folder
    const subCategories = useMemo(() => {
        if (!currentCategoryId) {
            return categories.filter((c: any) => !c.parentId);
        }
        return categories.filter((c: any) => c.parentId === currentCategoryId);
    }, [categories, currentCategoryId]);

    // Categorize directories into spaces
    const publicCategories = useMemo(() => {
        return categories.filter((c: any) => (!c.securityLevel || c.securityLevel === 'PUBLIC') && !c.parentId);
    }, [categories]);

    const departmentCategories = useMemo(() => {
        return categories.filter((c: any) => c.securityLevel === 'DEPARTMENT' && !c.parentId);
    }, [categories]);

    const confidentialCategories = useMemo(() => {
        return categories.filter((c: any) => c.securityLevel === 'CONFIDENTIAL' && !c.parentId);
    }, [categories]);

    // Filter documents
    const filteredDocuments = useMemo(() => {
        return documents.filter((doc: any) => {
            const matchesSearch = 
                doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesType = selectedType === 'ALL' || doc.fileType === selectedType;
            
            const isDocConfidential = doc.securityLevel === 'CONFIDENTIAL' || doc.category?.securityLevel === 'CONFIDENTIAL';
            const matchesSecurity = 
                selectedSecurity === 'ALL' ||
                (selectedSecurity === 'CONFIDENTIAL' && isDocConfidential) ||
                (selectedSecurity === 'PUBLIC' && !isDocConfidential);

            const matchesStarred = !filterStarredOnly || doc.isStarred;

            return matchesSearch && matchesType && matchesSecurity && matchesStarred;
        });
    }, [documents, searchTerm, selectedType, selectedSecurity, filterStarredOnly]);

    // Storage calculation
    const totalBytes = useMemo(() => {
        return initialDocuments.reduce((acc: number, doc: any) => acc + (doc.size || 0), 0);
    }, [initialDocuments]);

    const handleToggleStar = async (docId: string) => {
        try {
            const updated = await toggleStarDocument(docId);
            setDocuments((prev: any[]) => prev.map((d: any) => d.id === docId ? { ...d, isStarred: updated.isStarred } : d));
            toast.success(updated.isStarred ? 'Đã ghim tài liệu' : 'Đã bỏ ghim');
        } catch (e: any) {
            toast.error(e.message || 'Lỗi thao tác');
        }
    };

    return (
        <div className="w-full space-y-5 pb-16">
            {/* Top Enterprise Full-Width Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
                        <HardDrive className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                T-Drive & Kho Lưu Trữ Doanh Nghiệp
                            </h1>
                            {isLeadership && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                                    Ban Lãnh Đạo
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                {initialDocuments.length} Văn bản & Tập tin
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Hệ thống lưu trữ số tập trung, phân quyền thư mục mật và quản trị tri thức nội bộ
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <LibraryActionButtons 
                        currentCategoryId={currentCategoryId} 
                        canManage={canManage} 
                        isLeadership={isLeadership}
                        categories={categories} 
                    />
                </div>
            </div>

            {/* Breadcrumb Navigation (Full Width) */}
            <nav className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50/90 rounded-xl border border-slate-200/70 text-xs font-medium text-slate-600 overflow-x-auto">
                <Link href="/library" className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors shrink-0">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Trang chủ T-Drive</span>
                </Link>
                {breadcrumbs.map((crumb: any, index: number) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                        <React.Fragment key={crumb.id}>
                            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                            {isLast ? (
                                <span className="font-bold text-slate-900 flex items-center gap-1 shrink-0">
                                    {crumb.securityLevel === 'CONFIDENTIAL' && <Lock className="w-3 h-3 text-rose-500" />}
                                    {crumb.name}
                                </span>
                            ) : (
                                <Link href={`/library?category=${crumb.id}`} className="text-slate-600 hover:text-indigo-600 transition-colors shrink-0">
                                    {crumb.name}
                                </Link>
                            )}
                        </React.Fragment>
                    );
                })}
            </nav>

            {/* Main Full-Width Workspace Layout */}
            <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
                {/* Left Workspace Navigation Sidebar */}
                <aside className="w-full lg:w-72 xl:w-80 shrink-0 sticky top-4 self-start space-y-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                        {/* Spaces Nav */}
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1">
                                Không Gian Làm Việc
                            </span>
                            <Link
                                href="/library"
                                onClick={() => setFilterStarredOnly(false)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                                    !currentCategoryId && !filterStarredOnly
                                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <Layers className="w-4 h-4 text-slate-400" />
                                    Tất cả tài liệu
                                </span>
                                <span className="text-[11px] font-mono text-slate-400">{initialDocuments.length}</span>
                            </Link>

                            <button
                                type="button"
                                onClick={() => setFilterStarredOnly(!filterStarredOnly)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                                    filterStarredOnly
                                        ? 'bg-amber-50 text-amber-800 font-bold'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <Star className={`w-4 h-4 ${filterStarredOnly ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                                    Tài liệu đã ghim
                                </span>
                                <span className="text-[11px] font-mono text-slate-400">
                                    {initialDocuments.filter(d => d.isStarred).length}
                                </span>
                            </button>
                        </div>

                        {/* Executive Vault Section (Only for Leadership) */}
                        {isLeadership && (
                            <div className="pt-3 border-t border-slate-100">
                                <div className="flex items-center justify-between px-2 mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                                        <ShieldAlert className="w-3.5 h-3.5" /> Kho Tài Liệu Mật (Vault)
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {confidentialCategories.map((cat: any) => {
                                        const isActive = currentCategoryId === cat.id;
                                        return (
                                            <Link
                                                key={cat.id}
                                                href={`/library?category=${cat.id}`}
                                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                                                    isActive
                                                        ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200/80 shadow-2xs'
                                                        : 'text-rose-900/80 hover:bg-rose-50/50'
                                                }`}
                                            >
                                                <span className="flex items-center gap-2 truncate">
                                                    <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                    <span className="truncate">{cat.name}</span>
                                                </span>
                                                {cat._count?.documents > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-rose-100 text-rose-700 font-bold">
                                                        {cat._count.documents}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                    {confidentialCategories.length === 0 && (
                                        <div className="text-[11px] text-slate-400 px-3 py-1.5 italic">
                                            Chưa có thư mục mật nào. Bấm &quot;Thêm Thư Mục&quot; và chọn cấp độ Mật để tạo.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Public & Department Directories */}
                        <div className="pt-3 border-t border-slate-100 space-y-1">
                            <div className="flex items-center justify-between px-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Thư Mục Doanh Nghiệp
                                </span>
                                {canManage && <CreateCategoryButton compact isLeadership={isLeadership} />}
                            </div>

                            {/* Public folders */}
                            {publicCategories.map((cat: any) => {
                                const isActive = currentCategoryId === cat.id;
                                const childCategories = categories.filter((c: any) => c.parentId === cat.id);
                                return (
                                    <div key={cat.id} className="space-y-1">
                                        <div className="flex items-center group">
                                            <Link
                                                href={`/library?category=${cat.id}`}
                                                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors truncate ${
                                                    isActive
                                                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                                                        : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="flex items-center gap-2 truncate flex-1">
                                                    <Folder className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                    <span className="truncate">{cat.name}</span>
                                                </span>
                                                {cat._count?.documents > 0 && (
                                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-500 ml-1">
                                                        {cat._count.documents}
                                                    </span>
                                                )}
                                            </Link>
                                            {canManage && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                                                    <CreateCategoryButton parentId={cat.id} iconOnly isLeadership={isLeadership} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Sub-categories */}
                                        {childCategories.length > 0 && (
                                            <div className="pl-4 space-y-1 border-l border-slate-200/60 ml-3.5">
                                                {childCategories.map((child: any) => {
                                                    const isChildActive = currentCategoryId === child.id;
                                                    const isSec = child.securityLevel === 'CONFIDENTIAL';
                                                    return (
                                                        <Link
                                                            key={child.id}
                                                            href={`/library?category=${child.id}`}
                                                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors truncate ${
                                                                isChildActive 
                                                                    ? 'bg-indigo-50 text-indigo-700 font-bold' 
                                                                    : 'text-slate-500 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-1.5 truncate flex-1">
                                                                {isSec ? <Lock className="w-3 h-3 text-rose-500" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>}
                                                                <span className="truncate">{child.name}</span>
                                                            </span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Storage Widget */}
                        <div className="pt-3 border-t border-slate-100">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                                        <HardDrive className="w-3.5 h-3.5 text-indigo-500" /> Dung lượng đã dùng
                                    </span>
                                    <span className="font-mono font-bold text-slate-700">{formatBytes(totalBytes)}</span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: '12%' }}></div>
                                </div>
                                <div className="text-[10px] text-slate-400 text-right">
                                    100 GB lưu trữ nội bộ
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Workspace Panel (Full Width) */}
                <main className="flex-1 min-w-0 space-y-5 w-full">
                    {/* Active Folder Header Banner (if inside category) */}
                    {activeCategory && (
                        <div className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                            activeCategory.securityLevel === 'CONFIDENTIAL'
                                ? 'bg-gradient-to-r from-rose-50 via-rose-50/50 to-white border-rose-200'
                                : 'bg-white border-slate-200/90'
                        }`}>
                            <div className="flex items-center gap-3.5">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                    activeCategory.securityLevel === 'CONFIDENTIAL'
                                        ? 'bg-rose-100 text-rose-600 shadow-xs'
                                        : 'bg-indigo-50 text-indigo-600'
                                }`}>
                                    {activeCategory.securityLevel === 'CONFIDENTIAL' ? <Lock className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-slate-900">{activeCategory.name}</h2>
                                        {activeCategory.securityLevel === 'CONFIDENTIAL' && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white shadow-2xs">
                                                🔒 THƯ MỤC MẬT LÃNH ĐẠO
                                            </span>
                                        )}
                                        {activeCategory.securityLevel === 'DEPARTMENT' && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                🏢 {activeCategory.targetDepartment || 'PHÒNG BAN'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {activeCategory.description || 'Thư mục tài liệu trong hệ thống'}
                                    </p>
                                </div>
                            </div>

                            <Link href="/library" className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                Thoát thư mục
                            </Link>
                        </div>
                    )}

                    {/* Sub-folders Grid (Full Width Multi-Column) */}
                    {subCategories.length > 0 && !searchTerm && (
                        <div>
                            <div className="flex items-center justify-between mb-2.5 px-1">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Thư Mục ({subCategories.length})
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5">
                                {subCategories.map((sub: any) => {
                                    const isConf = sub.securityLevel === 'CONFIDENTIAL';
                                    return (
                                        <Link
                                            key={sub.id}
                                            href={`/library?category=${sub.id}`}
                                            className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 group shadow-2xs hover:shadow-sm ${
                                                isConf
                                                    ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-400 hover:bg-rose-50'
                                                    : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:bg-slate-50/60'
                                            }`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                                isConf
                                                    ? 'bg-rose-100 text-rose-600'
                                                    : 'bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform'
                                            }`}>
                                                {isConf ? <Lock className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                                                    {sub.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1">
                                                    <span>{sub._count?.documents || 0} tệp</span>
                                                    {isConf && <span className="text-rose-600 font-bold">• Mật</span>}
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Search & Filter Toolbar (Responsive wrap without ugly scrollbar) */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            {/* Search bar */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm tài liệu theo tiêu đề, trích yếu nội dung..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* View Switcher & Star Filter */}
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                <button
                                    onClick={() => setFilterStarredOnly(!filterStarredOnly)}
                                    className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                                        filterStarredOnly 
                                            ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold shadow-2xs' 
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                    title="Chỉ hiện tài liệu đã ghim"
                                >
                                    <Star className={`w-3.5 h-3.5 ${filterStarredOnly ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                                    <span>Đã ghim</span>
                                </button>

                                <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/80">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                                        title="Hiển thị dạng lưới"
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                                        title="Hiển thị dạng bảng"
                                    >
                                        <ListIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Format Filters (Wrap gracefully across full width) */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1.5 shrink-0">Định dạng:</span>
                            {[
                                { id: 'ALL', label: 'Tất cả' },
                                { id: 'PDF', label: '📕 PDF' },
                                { id: 'WORD', label: '📘 Word' },
                                { id: 'EXCEL', label: '📗 Excel' },
                                { id: 'PPT', label: '📙 PowerPoint' },
                                { id: 'VIDEO', label: '🎬 Video' },
                                { id: 'IMAGE', label: '🖼️ Hình ảnh' },
                                { id: 'LINK', label: '🔗 Liên kết' }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedType(item.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        selectedType === item.id
                                            ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}

                            {isLeadership && (
                                <>
                                    <div className="hidden sm:block h-4 w-px bg-slate-200 mx-1.5"></div>
                                    <button
                                        onClick={() => setSelectedSecurity(selectedSecurity === 'CONFIDENTIAL' ? 'ALL' : 'CONFIDENTIAL')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                            selectedSecurity === 'CONFIDENTIAL'
                                                ? 'bg-rose-600 text-white shadow-2xs'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100'
                                        }`}
                                    >
                                        <Lock className="w-3 h-3" /> Chỉ Tài Liệu Mật
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Files Section Heading */}
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Tài Liệu & Tập Tin ({filteredDocuments.length})
                        </h3>
                    </div>

                    {/* Document Display (Full Width Grid or Table) */}
                    {filteredDocuments.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-3">
                                <BookOpen className="w-8 h-8" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-1">Không tìm thấy tài liệu nào</h3>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                                {searchTerm 
                                    ? `Không có kết quả nào khớp với từ khóa "${searchTerm}".` 
                                    : 'Thư mục hiện tại chưa có tài liệu nào. Bạn có thể bấm "Tải Tài Liệu" để đưa tập tin lên.'}
                            </p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* FULL WIDTH GRID VIEW */
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {filteredDocuments.map((doc: any) => {
                                const isConfidential = doc.securityLevel === 'CONFIDENTIAL' || doc.category?.securityLevel === 'CONFIDENTIAL';
                                return (
                                    <div
                                        key={doc.id}
                                        className={`group bg-white rounded-2xl border shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative ${
                                            isConfidential ? 'border-rose-200/90 hover:border-rose-400' : 'border-slate-200/90 hover:border-indigo-300'
                                        }`}
                                    >
                                        {/* Top Star & Security Badges Overlay */}
                                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleStar(doc.id); }}
                                                className={`p-1.5 rounded-lg backdrop-blur-md shadow-2xs transition-transform active:scale-90 ${
                                                    doc.isStarred 
                                                        ? 'bg-amber-400 text-white' 
                                                        : 'bg-white/90 text-slate-400 hover:text-amber-500 hover:bg-white'
                                                }`}
                                                title={doc.isStarred ? 'Bỏ ghim' : 'Ghim tài liệu'}
                                            >
                                                <Star className="w-3.5 h-3.5" fill={doc.isStarred ? 'currentColor' : 'none'} />
                                            </button>

                                            {isConfidential && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white shadow-2xs uppercase tracking-wider">
                                                    <Lock className="w-2.5 h-2.5" /> MẬT
                                                </span>
                                            )}
                                        </div>

                                        {/* Cover / Icon Header */}
                                        <Link
                                            href={`/library/document/${doc.id}`}
                                            className="block relative h-36 bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden cursor-pointer group-hover:bg-slate-100/60 transition-colors"
                                        >
                                            {doc.thumbnail ? (
                                                <img src={doc.thumbnail} alt={doc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <div className="p-3.5 rounded-2xl bg-white shadow-xs border border-slate-100 group-hover:scale-105 transition-transform duration-200">
                                                    {getFileIcon(doc.fileType, 36)}
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

                                        {/* Card Content */}
                                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                            <Link href={`/library/document/${doc.id}`} className="block">
                                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                                                    {doc.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">
                                                    {doc.description || "Chưa có mô tả chi tiết."}
                                                </p>
                                            </Link>

                                            {/* Meta & Category tag */}
                                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                                <span className="truncate max-w-[130px]">
                                                    {doc.category ? `📁 ${doc.category.name}` : '📁 Thư mục gốc'}
                                                </span>
                                                <span className="font-mono">{formatBytes(doc.size)}</span>
                                            </div>

                                            {/* Footer Info & Actions */}
                                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <AvatarImage src={doc.creator?.avatar} name={doc.creator?.name} size={20} className="w-5 h-5 rounded-full" />
                                                    <span className="truncate max-w-[85px] font-medium text-slate-700 text-xs">
                                                        {doc.creator?.name || 'Thành viên'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold mr-1" title="Bình luận">
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
                                );
                            })}
                        </div>
                    ) : (
                        /* FULL WIDTH TABLE / LIST VIEW */
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden w-full">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="py-3 px-4 w-10"></th>
                                            <th className="py-3 px-4">Tên Tài Liệu</th>
                                            <th className="py-3 px-4">Cấp Bảo Mật</th>
                                            <th className="py-3 px-4">Thư Mục</th>
                                            <th className="py-3 px-4">Người Tạo</th>
                                            <th className="py-3 px-4">Cập Nhật</th>
                                            <th className="py-3 px-4">Kích Thước</th>
                                            <th className="py-3 px-4 text-right">Thao Tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-600">
                                        {filteredDocuments.map((doc: any) => {
                                            const isConf = doc.securityLevel === 'CONFIDENTIAL' || doc.category?.securityLevel === 'CONFIDENTIAL';
                                            return (
                                                <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors group">
                                                    <td className="py-3 px-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleStar(doc.id)}
                                                            className={`p-1 rounded transition-colors ${doc.isStarred ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                                                            title={doc.isStarred ? 'Bỏ ghim' : 'Ghim'}
                                                        >
                                                            <Star className="w-3.5 h-3.5" fill={doc.isStarred ? 'currentColor' : 'none'} />
                                                        </button>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Link href={`/library/document/${doc.id}`} className="flex items-center gap-2.5 font-semibold text-slate-800 hover:text-indigo-600 transition-colors">
                                                            <div className="p-1.5 rounded-lg bg-slate-100 shrink-0">
                                                                {getFileIcon(doc.fileType, 16)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-bold text-slate-900">{doc.title}</div>
                                                                {doc.description && <div className="text-[11px] text-slate-400 truncate max-w-md">{doc.description}</div>}
                                                            </div>
                                                        </Link>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {isConf ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                                <Lock className="w-2.5 h-2.5" /> MẬT LÃNH ĐẠO
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                                                                <Globe className="w-2.5 h-2.5" /> Dùng chung
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-500 font-medium">
                                                        {doc.category?.name || 'Gốc'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <AvatarImage src={doc.creator?.avatar} name={doc.creator?.name} size={18} className="w-4 h-4 rounded-full" />
                                                            <span className="truncate max-w-[120px]">{doc.creator?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                                        {formatDate(doc.createdAt)}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                                        {formatBytes(doc.size)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Link
                                                                href={`/library/document/${doc.id}`}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                                title="Xem chi tiết"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </Link>
                                                            {canManage && (
                                                                <>
                                                                    <MoveDocumentButton documentId={doc.id} currentCategoryId={doc.categoryId} categories={categories} isIconOnly />
                                                                    <DeleteDocumentButton documentId={doc.id} isIconOnly />
                                                                </>
                                                            )}
                                                            <ShareButton documentId={doc.id} isIconOnly />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
