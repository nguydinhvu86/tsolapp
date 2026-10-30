'use client';
import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/app/components/ui/Button';
import { Plus, X, UploadCloud, FolderPlus, Shield, ShieldAlert, Globe, Building2, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { createLibraryCategory, createLibraryDocument } from './actions';
import { useRouter } from 'next/navigation';

export function LibraryActionButtons({
    currentCategoryId,
    canManage,
    isLeadership = false,
    categories = []
}: {
    currentCategoryId?: string;
    canManage: boolean;
    isLeadership?: boolean;
    categories?: any[];
}) {
    const router = useRouter();
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Category state
    const [catName, setCatName] = useState('');
    const [catDesc, setCatDesc] = useState('');
    const [catSecurity, setCatSecurity] = useState<'PUBLIC' | 'DEPARTMENT' | 'CONFIDENTIAL'>('PUBLIC');
    const [catDepartment, setCatDepartment] = useState('KE_TOAN');
    const [isSubmittingCat, setIsSubmittingCat] = useState(false);

    // Upload state
    const [docTitle, setDocTitle] = useState('');
    const [docDesc, setDocDesc] = useState('');
    const [docType, setDocType] = useState('PDF');
    const [docUrl, setDocUrl] = useState('');
    const [docFile, setDocFile] = useState<File | null>(null);
    const [docSecurity, setDocSecurity] = useState<'INHERIT' | 'PUBLIC' | 'CONFIDENTIAL'>('INHERIT');
    const [isDownloadable, setIsDownloadable] = useState(true);
    const [docVersion, setDocVersion] = useState('1.0');
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
        e.preventDefault();
        if (!catName.trim()) return;
        setIsSubmittingCat(true);
        try {
            await createLibraryCategory({
                name: catName,
                description: catDesc,
                parentId: currentCategoryId,
                securityLevel: catSecurity,
                targetDepartment: catSecurity === 'DEPARTMENT' ? catDepartment : undefined,
                color: catSecurity === 'CONFIDENTIAL' ? 'rose' : catSecurity === 'DEPARTMENT' ? 'amber' : 'indigo',
                icon: catSecurity === 'CONFIDENTIAL' ? 'Lock' : 'Folder'
            });
            setIsCategoryModalOpen(false);
            setCatName('');
            setCatDesc('');
            setCatSecurity('PUBLIC');
            toast.success('Đã tạo thư mục thành công');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi tạo thư mục');
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
            let fileSize = 0;

            // Upload file if selected
            if (docFile && !isUrlRequired) {
                fileSize = docFile.size;
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
                size: fileSize || undefined,
                categoryId: selectedUploadCategory || undefined,
                securityLevel: docSecurity,
                isDownloadable,
                version: docVersion
            });

            setIsUploadModalOpen(false);
            setDocTitle('');
            setDocDesc('');
            setDocUrl('');
            setDocFile(null);
            setDocSecurity('INHERIT');
            toast.success('Đã tải lên tài liệu thành công');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi tải lên tài liệu');
        } finally {
            setIsSubmittingDoc(false);
        }
    };

    const renderCategoryOptions = () => {
        const options: JSX.Element[] = [];
        const rootCategories = categories.filter(c => !c.parentId);

        const processNode = (node: any, depth: number) => {
            const isSec = node.securityLevel === 'CONFIDENTIAL';
            options.push(
                <option key={node.id} value={node.id}>
                    {'\u00A0'.repeat(depth * 4)}{depth > 0 ? '└ ' : ''}{isSec ? '🔒 ' : '📁 '}{node.name}
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
        <div className="flex items-center gap-2.5">
            <CreateCategoryButton parentId={currentCategoryId} isLeadership={isLeadership} />
            
            <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium text-sm shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
            >
                <UploadCloud size={17} />
                <span>Tải Tài Liệu</span>
            </button>

            {/* Modal: Upload Document */}
            {isUploadModalOpen && mounted && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <UploadCloud size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base">Tải Tài Liệu Lên T-Drive</h3>
                                    <p className="text-xs text-slate-500">Lưu trữ tập tin văn bản, tài liệu hoặc video đào tạo</p>
                                </div>
                            </div>
                            <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUploadDocument} className="p-6 flex flex-col gap-4 text-sm max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1.5">Tên tài liệu / Văn bản *</label>
                                <input
                                    type="text"
                                    required
                                    value={docTitle}
                                    onChange={e => setDocTitle(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 placeholder:text-slate-400"
                                    placeholder="VD: Báo cáo tài chính Q3, Quy chế chi tiêu nội bộ..."
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1.5">Thư mục lưu trữ</label>
                                    <select
                                        value={selectedUploadCategory}
                                        onChange={e => setSelectedUploadCategory(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white text-slate-800"
                                    >
                                        <option value="">📁 -- Thư mục gốc (Root) --</option>
                                        {renderCategoryOptions()}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1.5">Định dạng tập tin *</label>
                                    <select
                                        value={docType}
                                        onChange={e => { setDocType(e.target.value); setDocFile(null); setDocUrl(''); }}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white text-slate-800"
                                    >
                                        <option value="PDF">📕 Tài liệu PDF (.pdf)</option>
                                        <option value="WORD">📘 Tài liệu Word (.docx, .doc)</option>
                                        <option value="EXCEL">📗 Bảng tính Excel (.xlsx, .xls)</option>
                                        <option value="PPT">📙 Bản thuyết trình (.pptx, .ppt)</option>
                                        <option value="IMAGE">🖼️ Hình ảnh (JPG, PNG, WebP)</option>
                                        <option value="VIDEO">🎬 Video đào tạo (MP4 / Youtube)</option>
                                        <option value="LINK">🔗 Liên kết Website</option>
                                    </select>
                                </div>
                            </div>

                            {/* File or URL input */}
                            <div>
                                {(docType === 'VIDEO' || docType === 'LINK') ? (
                                    <>
                                        <label className="block font-semibold text-slate-700 mb-1.5">Đường dẫn Video / Link URL *</label>
                                        <input
                                            type="url"
                                            required
                                            value={docUrl}
                                            onChange={e => setDocUrl(e.target.value)}
                                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 bg-slate-50 placeholder:text-slate-400"
                                            placeholder="https://youtube.com/watch?v=... hoặc https://..."
                                        />
                                    </>
                                ) : (
                                    <>
                                        <label className="block font-semibold text-slate-700 mb-1.5">Chọn tập tin từ máy tính *</label>
                                        <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 transition-colors">
                                            <input
                                                type="file"
                                                required
                                                accept={
                                                    docType === 'PDF' ? '.pdf' :
                                                    docType === 'WORD' ? '.doc,.docx' :
                                                    docType === 'EXCEL' ? '.xls,.xlsx,.csv' :
                                                    docType === 'PPT' ? '.ppt,.pptx' :
                                                    'image/*'
                                                }
                                                onChange={e => { if (e.target.files && e.target.files.length > 0) setDocFile(e.target.files[0]); }}
                                                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                            />
                                            {docFile && (
                                                <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center justify-center gap-1.5">
                                                    <CheckCircle2 size={14} /> Đã chọn: {docFile.name} ({(docFile.size / 1024 / 1024).toFixed(2)} MB)
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Cấp độ bảo mật & Phiên bản */}
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Shield size={14} className="text-emerald-600" /> Cấp độ bảo mật tài liệu
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setDocSecurity('INHERIT')}
                                            className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-left flex items-center gap-1.5 ${
                                                docSecurity === 'INHERIT'
                                                    ? 'bg-white border-slate-400 text-slate-800 shadow-xs'
                                                    : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'
                                            }`}
                                        >
                                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                            Kế thừa
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setDocSecurity('PUBLIC')}
                                            className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-left flex items-center gap-1.5 ${
                                                docSecurity === 'PUBLIC'
                                                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-xs'
                                                    : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'
                                            }`}
                                        >
                                            <Globe size={12} className="text-indigo-600" />
                                            Dùng chung
                                        </button>

                                        <button
                                            type="button"
                                            disabled={!isLeadership}
                                            onClick={() => setDocSecurity('CONFIDENTIAL')}
                                            className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-left flex items-center gap-1.5 ${
                                                docSecurity === 'CONFIDENTIAL'
                                                    ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs font-bold'
                                                    : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'
                                            } ${!isLeadership ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            title={!isLeadership ? 'Chỉ cấp Lãnh đạo mới được đặt bảo mật Mật' : ''}
                                        >
                                            <Lock size={12} className="text-rose-600" />
                                            🔒 Mật (Lãnh đạo)
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isDownloadable}
                                            onChange={e => setIsDownloadable(e.target.checked)}
                                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                                        />
                                        <span>Cho phép tải file gốc về máy tính</span>
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <span>Phiên bản:</span>
                                        <input
                                            type="text"
                                            value={docVersion}
                                            onChange={e => setDocVersion(e.target.value)}
                                            className="w-14 px-1.5 py-0.5 text-center border border-slate-300 rounded font-mono text-xs bg-white"
                                            placeholder="1.0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1.5">Mô tả hoặc ghi chú tóm tắt</label>
                                <textarea
                                    value={docDesc}
                                    onChange={e => setDocDesc(e.target.value)}
                                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none h-16 resize-none text-slate-800 placeholder:text-slate-400"
                                    placeholder="Trích yếu nội dung hoặc đối tượng áp dụng..."
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors text-xs"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingDoc}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors text-xs shadow-sm disabled:opacity-50"
                                >
                                    {isSubmittingDoc ? 'Đang tải lên...' : 'Lưu Tài Liệu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export function CreateCategoryButton({
    parentId,
    iconOnly = false,
    compact = false,
    isLeadership = false
}: {
    parentId?: string;
    iconOnly?: boolean;
    compact?: boolean;
    isLeadership?: boolean;
}) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [securityLevel, setSecurityLevel] = useState<'PUBLIC' | 'DEPARTMENT' | 'CONFIDENTIAL'>('PUBLIC');
    const [targetDepartment, setTargetDepartment] = useState('KE_TOAN');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                parentId,
                securityLevel,
                targetDepartment: securityLevel === 'DEPARTMENT' ? targetDepartment : undefined,
                color: securityLevel === 'CONFIDENTIAL' ? 'rose' : securityLevel === 'DEPARTMENT' ? 'amber' : 'indigo'
            });
            setIsOpen(false);
            setName('');
            setDesc('');
            setSecurityLevel('PUBLIC');
            toast.success('Đã tạo thư mục thành công');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi tạo thư mục');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {iconOnly ? (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(true); }}
                    className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Thêm thư mục con"
                >
                    <Plus size={14} strokeWidth={2.5} />
                </button>
            ) : compact ? (
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(true); }}
                    className="flex items-center gap-1 text-[0.7rem] font-bold text-emerald-700 hover:text-emerald-800 uppercase px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
                >
                    <Plus size={12} strokeWidth={3} /> Thêm Thư Mục
                </button>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 font-medium text-sm shadow-xs hover:border-slate-300 transition-all duration-200"
                >
                    <FolderPlus size={16} className="text-slate-500" />
                    <span>Thêm Thư Mục</span>
                </button>
            )}

            {isOpen && mounted && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                                    <FolderPlus size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-base">Tạo Thư Mục {parentId ? 'Con' : 'Mới'}</h3>
                                    <p className="text-xs text-slate-500">Thiết lập thư mục và quyền truy cập</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-sm">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1.5">Tên thư mục *</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 placeholder:text-slate-400"
                                    placeholder="VD: Hóa đơn & Thuế, Quy chế công ty..."
                                    autoFocus
                                />
                            </div>

                            {/* Cấp độ bảo mật thư mục */}
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <Shield size={14} className="text-indigo-600" /> Cấp độ bảo mật & Phạm vi truy cập
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    <label
                                        onClick={() => setSecurityLevel('PUBLIC')}
                                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                            securityLevel === 'PUBLIC'
                                                ? 'bg-indigo-50/60 border-indigo-400 text-indigo-950'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="mt-0.5"><Globe size={16} className="text-indigo-600" /></div>
                                        <div>
                                            <div className="font-semibold text-xs">🌐 Thư mục Dùng chung (Toàn công ty)</div>
                                            <div className="text-[11px] text-slate-500">Tất cả cán bộ nhân viên đều có thể xem và tra cứu tài liệu</div>
                                        </div>
                                    </label>

                                    <label
                                        onClick={() => setSecurityLevel('DEPARTMENT')}
                                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                            securityLevel === 'DEPARTMENT'
                                                ? 'bg-amber-50/60 border-amber-400 text-amber-950'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="mt-0.5"><Building2 size={16} className="text-amber-600" /></div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-xs">🏢 Thư mục Phòng ban</div>
                                            <div className="text-[11px] text-slate-500">Chỉ nhân viên thuộc phòng ban tương ứng được truy cập</div>
                                        </div>
                                    </label>

                                    <label
                                        onClick={() => { if (isLeadership) setSecurityLevel('CONFIDENTIAL'); }}
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                            securityLevel === 'CONFIDENTIAL'
                                                ? 'bg-rose-50/60 border-rose-400 text-rose-950'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        } ${!isLeadership ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                                        title={!isLeadership ? 'Chỉ cấp Lãnh đạo mới có quyền tạo thư mục Mật' : ''}
                                    >
                                        <div className="mt-0.5"><Lock size={16} className="text-rose-600" /></div>
                                        <div>
                                            <div className="font-semibold text-xs flex items-center gap-1.5">
                                                🔒 Thư mục Mật / Ban Lãnh Đạo
                                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-700 font-bold">Executive Vault</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500">Chỉ Ban Giám Đốc, HĐQT và Admin mới nhìn thấy & truy cập</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {securityLevel === 'DEPARTMENT' && (
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1.5">Chọn phòng ban</label>
                                    <select
                                        value={targetDepartment}
                                        onChange={e => setTargetDepartment(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white text-slate-800 text-xs"
                                    >
                                        <option value="KE_TOAN">Phòng Kế toán & Tài chính</option>
                                        <option value="NHAN_SU">Phòng Hành chính Nhân sự</option>
                                        <option value="KINH_DOANH">Phòng Kinh doanh & Marketing</option>
                                        <option value="KY_THUAT">Phòng Kỹ thuật & Công nghệ</option>
                                        <option value="BAN_GIAM_DOC">Ban Giám Đốc</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1.5">Mô tả chi tiết</label>
                                <textarea
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none h-20 resize-none text-slate-800 placeholder:text-slate-400"
                                    placeholder="Không bắt buộc"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors text-xs"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors text-xs shadow-sm disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Đang tạo...' : 'Tạo Thư Mục'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
