'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    Folder, 
    FolderOpen, 
    Lock, 
    ChevronRight, 
    ChevronDown, 
    Plus, 
    Building2 
} from 'lucide-react';

interface FolderTreeProps {
    categories: any[];
    currentCategoryId?: string;
    canManage: boolean;
    isLeadership: boolean;
    variant: 'public' | 'confidential';
    onContextMenu: (e: React.MouseEvent, folder: any) => void;
    onAddSubfolder: (parentId: string) => void;
}

export function FolderTree({
    categories,
    currentCategoryId,
    canManage,
    isLeadership,
    variant,
    onContextMenu,
    onAddSubfolder
}: FolderTreeProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Automatically expand ancestors of currentCategoryId
    useEffect(() => {
        if (!currentCategoryId) return;

        const ancestors = new Set<string>();
        let curr = categories.find((c: any) => c.id === currentCategoryId);
        while (curr && curr.parentId) {
            ancestors.add(curr.parentId);
            curr = categories.find((c: any) => c.id === curr.parentId);
        }

        if (ancestors.size > 0) {
            setExpandedIds(prev => {
                const next = new Set(prev);
                ancestors.forEach(id => next.add(id));
                return next;
            });
        }
    }, [currentCategoryId, categories]);

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Filter root items for this variant
    const rootCategories = useMemo(() => {
        if (variant === 'confidential') {
            return categories.filter((c: any) => c.securityLevel === 'CONFIDENTIAL' && !c.parentId);
        }
        // Public & department root categories
        return categories.filter((c: any) => c.securityLevel !== 'CONFIDENTIAL' && !c.parentId);
    }, [categories, variant]);

    const renderNode = (node: any, depth = 0) => {
        const isConf = node.securityLevel === 'CONFIDENTIAL';
        const isDept = node.securityLevel === 'DEPARTMENT';
        const children = categories.filter((c: any) => c.parentId === node.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedIds.has(node.id);
        const isActive = currentCategoryId === node.id;

        return (
            <div key={node.id} className="select-none">
                <div
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onContextMenu(e, node);
                    }}
                    className={`group flex items-center justify-between rounded-xl transition-all duration-150 py-1.5 px-2 my-0.5 ${
                        isActive
                            ? isConf
                                ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200/80 shadow-2xs'
                                : 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100/80 shadow-2xs'
                            : isConf
                                ? 'text-rose-900/80 hover:bg-rose-50/50'
                                : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    style={{ paddingLeft: `${Math.max(8, depth * 14 + 8)}px` }}
                >
                    {/* Expand/Collapse Chevron */}
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                        {hasChildren ? (
                            <button
                                type="button"
                                onClick={(e) => toggleExpand(node.id, e)}
                                className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown size={14} className={isActive ? (isConf ? 'text-rose-600' : 'text-indigo-600') : 'text-slate-400'} />
                                ) : (
                                    <ChevronRight size={14} className="text-slate-400" />
                                )}
                            </button>
                        ) : (
                            <span className="w-4 shrink-0 inline-block" />
                        )}

                        {/* Folder Link */}
                        <Link
                            href={`/library?category=${node.id}`}
                            className="flex items-center gap-2 min-w-0 flex-1 truncate text-xs"
                            onClick={() => {
                                if (hasChildren && !isExpanded) {
                                    setExpandedIds(prev => new Set(prev).add(node.id));
                                }
                            }}
                        >
                            {isConf ? (
                                <Lock size={14} className="text-rose-500 shrink-0" />
                            ) : isDept ? (
                                <Building2 size={14} className="text-amber-500 shrink-0" />
                            ) : isExpanded ? (
                                <FolderOpen size={14} className={isActive ? 'text-indigo-600' : 'text-indigo-400'} />
                            ) : (
                                <Folder size={14} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                            )}
                            <span className="truncate">{node.name}</span>
                        </Link>
                    </div>

                    {/* Right side: item count & quick add subfolder */}
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                        {node._count?.documents > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                isConf 
                                    ? 'bg-rose-100 text-rose-700 font-bold' 
                                    : 'bg-slate-100 text-slate-500'
                            }`}>
                                {node._count.documents}
                            </span>
                        )}

                        {canManage && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onAddSubfolder(node.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white transition-opacity"
                                title="Thêm thư mục con bên trong"
                            >
                                <Plus size={13} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Recursive Children */}
                {hasChildren && isExpanded && (
                    <div className="relative border-l border-slate-200/60 ml-4 pl-0.5 space-y-0.5">
                        {children.map((child: any) => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (rootCategories.length === 0) {
        if (variant === 'confidential') {
            return (
                <div className="text-[11px] text-slate-400 px-3 py-1.5 italic">
                    Chưa có thư mục mật nào. Bấm &quot;Thêm Thư Mục&quot; và chọn cấp độ Mật để tạo.
                </div>
            );
        }
        return (
            <div className="text-[11px] text-slate-400 px-3 py-1.5 italic">
                Chưa có thư mục nào.
            </div>
        );
    }

    return (
        <div className="space-y-0.5">
            {rootCategories.map((root: any) => renderNode(root, 0))}
        </div>
    );
}
