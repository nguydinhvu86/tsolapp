'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/app/components/ui/Button';
import { Plus, X, UploadCloud, FolderPlus } from 'lucide-react';
import { createLibraryCategory, createLibraryDocument } from './actions';
import { useRouter } from 'next/navigation';

export function LibraryActionButtons({ currentCategoryId, canManage, categories = [] }: { currentCategoryId?: string, canManage: boolean, categories?: any[] }) {
    const router = useRouter();
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Category state
    const [catName, setCatName] = useState('');
    const [catDesc, setCatDesc] = useState('');
    const [isSubmittingCat, setIsSubmittingCat] = useState(false);

    // Upload state
    const [docTitle, setDocTitle] = useState('');
    const [docDesc, setDocDesc] = useState('');
    const [docType, setDocType] = useState('PDF');
    const [docUrl, setDocUrl] = useState('');
    const [docFile, setDocFile] = useState<File | null>(null);
    const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
    const [selectedUploadCategory, setSelectedUploadCategory] = useState<string>(currentCategoryId || '');

    useEffect(() => {
        if (currentCategoryId !== undefined) {
            setSelectedUploadCategory(currentCategoryId || '');
        }
    }, [currentCategoryId]);

    // Mount state for portal
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!canManage) return null;

    const handleCreateCategory = async (e: React.FormEvent) => {
        // ... omitted to preserve lines
        e.preventDefault();
        if (!catName.trim()) return;
        setIsSubmittingCat(true);
        try {
            await createLibraryCategory({
                name: catName,
                description: catDesc,
                parentId: currentCategoryId
            });
            setIsCategoryModalOpen(false);
            setCatName('');
            setCatDesc('');
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Lỗi tạo thư mục');
        } finally {
            setIsSubmittingCat(false);
        }
    };

    const handleUploadDocument = async (e: React.FormEvent) => {
        e.preventDefault();
        const isUrlRequired = docType === 'VIDEO' || docType === 'LINK';
        if (!docTitle.trim() || (isUrlRequired && !docUrl.trim()) || (!isUrlRequired && !docFile)) return;

        setIsSubmittingDoc(true);
        try {
            let finalUrl = docUrl;

            // Upload file if selected
            if (docFile && !isUrlRequired) {
                const formData = new FormData();
                formData.append('file', docFile);

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadRes.ok) {
                    throw new Error('Upload file thất bại');
                }
                const data = await uploadRes.json();
                finalUrl = data.url;
            }

            await createLibraryDocument({
                title: docTitle,
                description: docDesc,
                fileType: docType,
                fileUrl: finalUrl,
                categoryId: selectedUploadCategory || undefined
            });

            setIsUploadModalOpen(false);
            setDocTitle('');
            setDocDesc('');
            setDocUrl('');
            setDocFile(null);
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Lỗi tải lên tài liệu');
        } finally {
            setIsSubmittingDoc(false);
        }
    };

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
        <div className="flex items-center gap-2">
            <CreateCategoryButton parentId={currentCategoryId} />
            <Button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2">
                <UploadCloud size={16} /> Tải Tài Liệu
            </Button>



            {/* Modal: Upload Document */}
            {isUploadModalOpen && mounted && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <UploadCloud className="text-primary" size={20} /> Chia sẻ Tài Liệu / Video
                            </h3>
                            <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUploadDocument} className="p-4 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên tài liệu *</label>
                                <input type="text" required value={docTitle} onChange={e => setDocTitle(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Hướng dẫn sử dụng T-SOLUTION" autoFocus />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Thư mục chứa *</label>
                                <select
                                    value={selectedUploadCategory}
                                    onChange={e => setSelectedUploadCategory(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary/20 outline-none bg-white text-slate-800"
                                >
                                    <option value="">-- Cấp cao nhất (Thư mục gốc) --</option>
                                    {renderCategoryOptions()}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Định dạng *</label>
                                    <select value={docType} onChange={e => { setDocType(e.target.value); setDocFile(null); setDocUrl(''); }} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                                        <option value="PDF">Tài liệu PDF</option>
                                        <option value="WORD">Tài liệu Word (DOCX)</option>
                                        <option value="EXCEL">Bảng tính (XLSX)</option>
                                        <option value="IMAGE">Hình ảnh</option>
                                        <option value="VIDEO">Video Đào tạo (MP4/Youtube)</option>
                                        <option value="LINK">Đường dẫn Website</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    {(docType === 'VIDEO' || docType === 'LINK') ? (
                                        <>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Đường dẫn File / Link URL *</label>
                                            <input type="url" required value={docUrl} onChange={e => setDocUrl(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary/20 outline-none text-slate-600 bg-slate-50" placeholder="https://..." />
                                        </>
                                    ) : (
                                        <>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Tải file từ máy tính *</label>
                                            <input type="file" required accept={docType === 'PDF' ? '.pdf' : docType === 'WORD' ? '.doc,.docx' : docType === 'EXCEL' ? '.xls,.xlsx' : 'image/*'} onChange={e => { if (e.target.files && e.target.files.length > 0) setDocFile(e.target.files[0]) }} className="w-full p-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-primary/20 outline-none text-slate-600 bg-slate-50 text-sm" />
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả nội dung</label>
                                <textarea value={docDesc} onChange={e => setDocDesc(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary/20 outline-none h-20 resize-none" placeholder="Trích yếu nội dung tài liệu..." />
                            </div>

                            <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors">
                                    Hủy
                                </button>
                                <Button type="submit" disabled={isSubmittingDoc}>{isSubmittingDoc ? 'Đang lưu...' : 'Lưu Tài Liệu Kho'}</Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export function CreateCategoryButton({ parentId, iconOnly, compact }: { parentId?: string, iconOnly?: boolean, compact?: boolean }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Mount state for portal
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        try {
            await createLibraryCategory({
                name,
                description: desc,
                parentId
            });
            setIsOpen(false);
            setName('');
            setDesc('');
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Lỗi tạo thư mục');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {iconOnly ? (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(true); }}
                    className="p-1 rounded text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Thêm thư mục con"
                >
                    <Plus size={14} strokeWidth={2.5} />
                </button>
            ) : compact ? (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(true); }}
                    className="flex items-center gap-1 text-[0.7rem] font-bold text-primary hover:text-blue-700 uppercase"
                >
                    <Plus size={12} strokeWidth={3} /> Thêm
                </button>
            ) : (
                <Button onClick={() => setIsOpen(true)} variant="secondary" className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                    <FolderPlus size={16} /> Thêm Thư Mục
                </Button>
            )}

            {isOpen && mounted && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-semibold text-lg flex items-center gap-2 text-slate-800">
                                <FolderPlus className="text-primary" size={20} /> Tạo Thư Mục {parentId ? 'Con' : 'Mới'}
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên thư mục *</label>
                                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary/20 outline-none" placeholder="VD: Quy trình Sale, Tài liệu Onboarding" autoFocus />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
                                <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary/20 outline-none h-24 resize-none" placeholder="Không bắt buộc" />
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors">
                                    Hủy
                                </button>
                                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang tạo...' : 'Tạo Thư Mục'}</Button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
