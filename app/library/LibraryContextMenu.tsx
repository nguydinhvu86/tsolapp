'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
    FolderPlus, 
    UploadCloud, 
    RotateCw, 
    FolderOpen, 
    Edit3, 
    Trash2, 
    Eye, 
    Download, 
    Star, 
    Share2, 
    FolderInput, 
    Shield, 
    CornerLeftUp,
    FolderUp
} from 'lucide-react';

export interface ContextMenuState {
    isOpen: boolean;
    x: number;
    y: number;
    type: 'area' | 'folder' | 'document';
    data?: any;
}

interface LibraryContextMenuProps {
    menu: ContextMenuState;
    onClose: () => void;
    canManage: boolean;
    isLeadership: boolean;
    currentCategoryId?: string;
    parentCategoryId?: string | null;
    onOpenCreateFolder: (parentId?: string) => void;
    onOpenUploadFiles: (targetCategoryId?: string) => void;
    onOpenUploadFolder: (targetCategoryId?: string) => void;
    onOpenRenameFolder: (folder: any) => void;
    onOpenDeleteFolder: (folder: any) => void;
    onOpenSecurityFolder?: (folder: any) => void;
    onOpenMoveDoc: (doc: any) => void;
    onOpenDeleteDoc: (doc: any) => void;
    onToggleStarDoc: (docId: string) => void;
    onNavigateFolder: (folderId: string) => void;
    onNavigateParent?: () => void;
    onRefresh: () => void;
}

export function LibraryContextMenu({
    menu,
    onClose,
    canManage,
    isLeadership,
    currentCategoryId,
    parentCategoryId,
    onOpenCreateFolder,
    onOpenUploadFiles,
    onOpenUploadFolder,
    onOpenRenameFolder,
    onOpenDeleteFolder,
    onOpenSecurityFolder,
    onOpenMoveDoc,
    onOpenDeleteDoc,
    onToggleStarDoc,
    onNavigateFolder,
    onNavigateParent,
    onRefresh
}: LibraryContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState({ x: menu.x, y: menu.y });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Calculate clamped position within window bounds
    useEffect(() => {
        if (!menu.isOpen) return;

        const updatePosition = () => {
            const width = 230;
            const height = 280;
            let finalX = menu.x;
            let finalY = menu.y;

            if (finalX + width > window.innerWidth) {
                finalX = Math.max(10, window.innerWidth - width - 12);
            }
            if (finalY + height > window.innerHeight) {
                finalY = Math.max(10, window.innerHeight - height - 12);
            }

            setAdjustedPos({ x: finalX, y: finalY });
        };

        updatePosition();

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleScroll = () => onClose();
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [menu.isOpen, menu.x, menu.y, onClose]);

    if (!menu.isOpen || !mounted) return null;

    return createPortal(
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                top: `${adjustedPos.y}px`,
                left: `${adjustedPos.x}px`,
                zIndex: 99999
            }}
            className="w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100 select-none overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {/* AREA CONTEXT MENU (RIGHT-CLICK ON EMPTY SPACE) */}
            {menu.type === 'area' && (
                <>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                        {currentCategoryId ? 'Thao tác Thư mục hiện tại' : 'Thao tác Không gian lưu trữ'}
                    </div>

                    {canManage && (
                        <>
                            <button
                                onClick={() => { onClose(); onOpenCreateFolder(currentCategoryId); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                            >
                                <FolderPlus size={15} className="text-indigo-600" />
                                <span className="font-medium">Tạo thư mục con mới</span>
                            </button>

                            <button
                                onClick={() => { onClose(); onOpenUploadFiles(currentCategoryId); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left"
                            >
                                <UploadCloud size={15} className="text-emerald-600" />
                                <span className="font-medium">Tải tập tin lên</span>
                            </button>

                            <button
                                onClick={() => { onClose(); onOpenUploadFolder(currentCategoryId); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left"
                            >
                                <FolderUp size={15} className="text-teal-600" />
                                <span className="font-medium">Tải cả thư mục lên</span>
                            </button>

                            <div className="my-1 border-t border-slate-100" />
                        </>
                    )}

                    {currentCategoryId && onNavigateParent && (
                        <button
                            onClick={() => { onClose(); onNavigateParent(); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 transition-colors text-left"
                        >
                            <CornerLeftUp size={15} className="text-slate-500" />
                            <span>Lên thư mục cha</span>
                        </button>
                    )}

                    <button
                        onClick={() => { onClose(); onRefresh(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 transition-colors text-left"
                    >
                        <RotateCw size={15} className="text-slate-500" />
                        <span>Làm mới danh sách</span>
                    </button>
                </>
            )}

            {/* FOLDER CONTEXT MENU (RIGHT-CLICK ON A FOLDER) */}
            {menu.type === 'folder' && menu.data && (
                <>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 truncate">
                        📁 {menu.data.name}
                    </div>

                    <button
                        onClick={() => { onClose(); onNavigateFolder(menu.data.id); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left font-semibold"
                    >
                        <FolderOpen size={15} className="text-indigo-600" />
                        <span>Mở thư mục</span>
                    </button>

                    {canManage && (
                        <>
                            <button
                                onClick={() => { onClose(); onOpenCreateFolder(menu.data.id); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                            >
                                <FolderPlus size={15} className="text-indigo-500" />
                                <span>Thêm thư mục con</span>
                            </button>

                            <button
                                onClick={() => { onClose(); onOpenUploadFiles(menu.data.id); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-left"
                            >
                                <UploadCloud size={15} className="text-emerald-600" />
                                <span>Tải tập tin vào đây</span>
                            </button>

                            <button
                                onClick={() => { onClose(); onOpenUploadFolder(menu.data.id); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-teal-50 hover:text-teal-600 transition-colors text-left"
                            >
                                <FolderUp size={15} className="text-teal-600" />
                                <span>Tải thư mục vào đây</span>
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                                onClick={() => { onClose(); onOpenRenameFolder(menu.data); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 transition-colors text-left"
                            >
                                <Edit3 size={15} className="text-slate-500" />
                                <span>Đổi tên thư mục</span>
                            </button>

                            {isLeadership && onOpenSecurityFolder && (
                                <button
                                    onClick={() => { onClose(); onOpenSecurityFolder(menu.data); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors text-left"
                                >
                                    <Shield size={15} className="text-amber-500" />
                                    <span>Đổi cấp bảo mật</span>
                                </button>
                            )}

                            <div className="my-1 border-t border-slate-100" />

                            <button
                                onClick={() => { onClose(); onOpenDeleteFolder(menu.data); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                            >
                                <Trash2 size={15} className="text-rose-500" />
                                <span>Xóa thư mục</span>
                            </button>
                        </>
                    )}
                </>
            )}

            {/* DOCUMENT CONTEXT MENU (RIGHT-CLICK ON A DOCUMENT) */}
            {menu.type === 'document' && menu.data && (
                <>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 truncate">
                        📄 {menu.data.title}
                    </div>

                    <a
                        href={`/library/document/${menu.data.id}`}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left font-semibold"
                    >
                        <Eye size={15} className="text-indigo-600" />
                        <span>Xem chi tiết</span>
                    </a>

                    {menu.data.fileUrl && menu.data.isDownloadable && (
                        <a
                            href={menu.data.fileUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                        >
                            <Download size={15} className="text-emerald-600" />
                            <span>Tải xuống tập tin</span>
                        </a>
                    )}

                    <button
                        onClick={() => { onClose(); onToggleStarDoc(menu.data.id); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors text-left"
                    >
                        <Star size={15} className={`text-amber-500 ${menu.data.isStarred ? 'fill-amber-500' : ''}`} />
                        <span>{menu.data.isStarred ? 'Bỏ ghim tài liệu' : 'Ghim tài liệu'}</span>
                    </button>

                    <button
                        onClick={() => {
                            onClose();
                            const url = `${window.location.origin}/library/document/${menu.data.id}`;
                            navigator.clipboard.writeText(url);
                            alert('Đã sao chép liên kết tài liệu vào bộ nhớ tạm');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 transition-colors text-left"
                    >
                        <Share2 size={15} className="text-slate-500" />
                        <span>Sao chép liên kết</span>
                    </button>

                    {canManage && (
                        <>
                            <div className="my-1 border-t border-slate-100" />

                            <button
                                onClick={() => { onClose(); onOpenMoveDoc(menu.data); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 transition-colors text-left"
                            >
                                <FolderInput size={15} className="text-indigo-500" />
                                <span>Chuyển thư mục...</span>
                            </button>

                            <button
                                onClick={() => { onClose(); onOpenDeleteDoc(menu.data); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                            >
                                <Trash2 size={15} className="text-rose-500" />
                                <span>Xóa tài liệu</span>
                            </button>
                        </>
                    )}
                </>
            )}
        </div>,
        document.body
    );
}
