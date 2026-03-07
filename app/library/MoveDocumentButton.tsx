'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FolderSymlink, X } from 'lucide-react';
import { moveLibraryDocument } from './actions';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';

export function MoveDocumentButton({ documentId, currentCategoryId, categories, isIconOnly = false }: { documentId: string, currentCategoryId?: string | null, categories: any[], isIconOnly?: boolean }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>(currentCategoryId || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const handleMove = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await moveLibraryDocument(documentId, selectedCategory || null);
            setIsOpen(false);
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Lỗi di chuyển tài liệu');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Flatten categories for select dropdown
    const renderCategoryOptions = () => {
        const options: JSX.Element[] = [];
        const rootCategories = categories.filter(c => !c.parentId);

        const processNode = (node: any, depth: number) => {
            options.push(
                <option key={node.id} value={node.id}>
                    {'\u00A0'.repeat(depth * 4)}{depth > 0 ? '└ ' : ''}{node.name}
                </option>
            );
            categories
                .filter(c => c.parentId === node.id)
                .forEach(child => processNode(child, depth + 1));
        };

        rootCategories.forEach(root => processNode(root, 0));
        return options;
    };

    return (
        <>
            {isIconOnly ? (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(true); }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Di chuyển tài liệu"
                >
                    <FolderSymlink size={16} />
                </button>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        height: '36px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        padding: '0 1rem',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#f8fafc',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <FolderSymlink size={15} /> Di chuyển
                </button>
            )}

            {isOpen && mounted && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-800">
                                <FolderSymlink className="text-blue-600" size={20} /> Di chuyển Tài liệu
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleMove} className="p-4 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Chọn thư mục đích</label>
                                <select
                                    value={selectedCategory}
                                    onChange={e => setSelectedCategory(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-600/20 outline-none bg-white text-slate-800"
                                >
                                    <option value="">-- Cấp cao nhất (Thư mục gốc) --</option>
                                    {renderCategoryOptions()}
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors">
                                    Hủy
                                </button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang chuyển...' : 'Xác nhận Chuyển'}</Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
