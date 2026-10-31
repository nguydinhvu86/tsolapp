'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '@/app/components/providers/ToastProvider';
import { 
    Plus, 
    X, 
    UploadCloud, 
    FolderPlus, 
    Shield, 
    Globe, 
    Building2, 
    Lock, 
    FileText, 
    CheckCircle2, 
    Folder,
    FolderUp, 
    Files, 
    Link2, 
    PlayCircle, 
    Trash2, 
    AlertCircle,
    Edit3
} from 'lucide-react';
import { 
    createLibraryCategory, 
    createLibraryDocument, 
    getOrCreateCategoryPath,
    renameLibraryCategory,
    updateCategorySecurity
} from './actions';
import { useRouter } from 'next/navigation';

export function detectFileType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pdf': return 'PDF';
        case 'doc':
        case 'docx': return 'WORD';
        case 'xls':
        case 'xlsx':
        case 'csv': return 'EXCEL';
        case 'ppt':
        case 'pptx': return 'PPT';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
        case 'svg': return 'IMAGE';
        case 'mp4':
        case 'webm':
        case 'mov':
        case 'avi':
        case 'mkv': return 'VIDEO';
        case 'zip':
        case 'rar':
        case '7z':
        case 'tar':
        case 'gz': return 'ZIP';
        default: return 'DOC';
    }
}

function formatBytes(bytes?: number) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Render hierarchically indented category options
export function renderCategorySelectOptions(categories: any[]) {
    const options: JSX.Element[] = [];
    const rootCategories = categories.filter(c => !c.parentId);

    const processNode = (node: any, depth: number) => {
        const isSec = node.securityLevel === 'CONFIDENTIAL';
        const isDept = node.securityLevel === 'DEPARTMENT';
        options.push(
            <option key={node.id} value={node.id}>
                {'\u00A0'.repeat(depth * 4)}{depth > 0 ? '└ ' : ''}{isSec ? '🔒 ' : isDept ? '🏢 ' : '📁 '}{node.name}
            </option>
        );
        categories
            .filter(c => c.parentId === node.id)
            .forEach(child => processNode(child, depth + 1));
    };

    rootCategories.forEach(root => processNode(root, 0));
    return options;
}

// ----------------------------------------------------
// 1. TOP ACTION BUTTONS (Header)
// ----------------------------------------------------
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
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadInitialMode, setUploadInitialMode] = useState<'files' | 'folder' | 'link'>('files');

    if (!canManage) return null;

    return (
        <div className="flex items-center gap-2.5">
            <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm shadow-xs hover:border-slate-300 transition-all duration-200"
            >
                <FolderPlus size={16} className="text-slate-500" />
                <span>Thêm Thư Mục</span>
            </button>

            <button
                onClick={() => {
                    setUploadInitialMode('files');
                    setIsUploadModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium text-xs sm:text-sm shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
            >
                <UploadCloud size={17} />
                <span>Tải Tài Liệu</span>
            </button>

            {/* Modals */}
            <CreateCategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                initialParentId={currentCategoryId}
                categories={categories}
                isLeadership={isLeadership}
            />

            <UploadDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                defaultCategoryId={currentCategoryId}
                categories={categories}
                isLeadership={isLeadership}
                initialMode={uploadInitialMode}
            />
        </div>
    );
}

// ----------------------------------------------------
// 2. CREATE CATEGORY BUTTON & MODAL
// ----------------------------------------------------
export function CreateCategoryButton({
    parentId,
    categories = [],
    iconOnly = false,
    compact = false,
    isLeadership = false
}: {
    parentId?: string;
    categories?: any[];
    iconOnly?: boolean;
    compact?: boolean;
    isLeadership?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);

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

            <CreateCategoryModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                initialParentId={parentId}
                categories={categories}
                isLeadership={isLeadership}
            />
        </>
    );
}

export function CreateCategoryModal({
    isOpen,
    onClose,
    initialParentId,
    categories = [],
    isLeadership = false
}: {
    isOpen: boolean;
    onClose: () => void;
    initialParentId?: string;
    categories?: any[];
    isLeadership?: boolean;
}) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [parentId, setParentId] = useState<string>(initialParentId || '');
    const [securityLevel, setSecurityLevel] = useState<'PUBLIC' | 'DEPARTMENT' | 'CONFIDENTIAL'>('PUBLIC');
    const [targetDepartment, setTargetDepartment] = useState('KE_TOAN');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isOpen) {
            setParentId(initialParentId || '');
            // If parent is confidential, auto switch to confidential
            if (initialParentId) {
                const parent = categories.find(c => c.id === initialParentId);
                if (parent && parent.securityLevel === 'CONFIDENTIAL') {
                    setSecurityLevel('CONFIDENTIAL');
                } else {
                    setSecurityLevel('PUBLIC');
                }
            } else {
                setSecurityLevel('PUBLIC');
            }
        }
    }, [isOpen, initialParentId, categories]);

    const handleParentChange = (newParentId: string) => {
        setParentId(newParentId);
        if (newParentId) {
            const parent = categories.find(c => c.id === newParentId);
            if (parent && parent.securityLevel === 'CONFIDENTIAL') {
                setSecurityLevel('CONFIDENTIAL');
            }
        }
    };

    if (!isOpen || !mounted) return null;

    const parentCategory = categories.find(c => c.id === parentId);
    const isParentConfidential = parentCategory?.securityLevel === 'CONFIDENTIAL';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        try {
            await createLibraryCategory({
                name: name.trim(),
                description: desc.trim() || undefined,
                parentId: parentId || undefined,
                securityLevel,
                targetDepartment: securityLevel === 'DEPARTMENT' ? targetDepartment : undefined,
                color: securityLevel === 'CONFIDENTIAL' ? 'rose' : securityLevel === 'DEPARTMENT' ? 'amber' : 'indigo'
            });
            onClose();
            setName('');
            setDesc('');
            toast.success('Đã tạo thư mục thành công');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Lỗi tạo thư mục');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                backgroundColor: 'rgba(15,23,42,0.6)', 
                backdropFilter: 'blur(4px)', 
                zIndex: 99999, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '1rem' 
            }}
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                            <FolderPlus size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">
                                {parentId ? 'Tạo Thư Mục Con' : 'Tạo Thư Mục Mới'}
                            </h3>
                            <p className="text-xs text-slate-500">Hỗ trợ cấu trúc thư mục phân cấp đa tầng</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-sm max-h-[85vh] overflow-y-auto">
                    {/* Thư mục cha (Parent folder) selector */}
                    <div>
                        <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <span>Vị trí thư mục cha (Cấp trên)</span>
                        </label>
                        <select
                            value={parentId}
                            onChange={e => handleParentChange(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white text-slate-800 text-xs"
                        >
                            <option value="">📁 -- Thư mục gốc (Root - Cấp cao nhất) --</option>
                            {renderCategorySelectOptions(categories)}
                        </select>
                        {parentCategory && (
                            <p className="text-[11px] text-slate-500 mt-1">
                                Sẽ được tạo bên trong: <span className="font-semibold text-indigo-600">📁 {parentCategory.name}</span>
                            </p>
                        )}
                    </div>

                    {/* Tên thư mục */}
                    <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Tên thư mục mới *</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 placeholder:text-slate-400"
                            placeholder="VD: Hóa đơn tháng 10, Kế hoạch kinh doanh..."
                            autoFocus
                        />
                    </div>

                    {/* Cấp độ bảo mật thư mục */}
                    <div>
                        <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Shield size={14} className="text-indigo-600" /> Cấp độ bảo mật & Quyền truy cập
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            <label
                                onClick={() => { if (!isParentConfidential) setSecurityLevel('PUBLIC'); }}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                    isParentConfidential ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200' : 'cursor-pointer'
                                } ${
                                    securityLevel === 'PUBLIC'
                                        ? 'bg-indigo-50/60 border-indigo-400 text-indigo-950 font-semibold'
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
                                onClick={() => { if (!isParentConfidential) setSecurityLevel('DEPARTMENT'); }}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                                    isParentConfidential ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200' : 'cursor-pointer'
                                } ${
                                    securityLevel === 'DEPARTMENT'
                                        ? 'bg-amber-50/60 border-amber-400 text-amber-950 font-semibold'
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
                                        ? 'bg-rose-50/60 border-rose-400 text-rose-950 font-semibold'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                } ${!isLeadership ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <div className="mt-0.5"><Lock size={16} className="text-rose-600" /></div>
                                <div>
                                    <div className="font-semibold text-xs flex items-center gap-1.5">
                                        🔒 Thư mục Mật (Executive Vault)
                                        {isParentConfidential && (
                                            <span className="text-[10px] text-rose-600 font-bold bg-rose-100 px-1.5 rounded">Tự động kế thừa</span>
                                        )}
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
                        <label className="block font-semibold text-slate-700 mb-1.5">Mô tả hoặc ghi chú</label>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none h-16 resize-none text-slate-800 placeholder:text-slate-400 text-xs"
                            placeholder="Mục đích sử dụng của thư mục này..."
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
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
    );
}

// ----------------------------------------------------
// 3. UPLOAD DOCUMENT MODAL (Single file, Multi-file, Folder, URL)
// ----------------------------------------------------
export function UploadDocumentModal({
    isOpen,
    onClose,
    defaultCategoryId,
    categories = [],
    isLeadership = false,
    initialMode = 'files'
}: {
    isOpen: boolean;
    onClose: () => void;
    defaultCategoryId?: string;
    categories?: any[];
    isLeadership?: boolean;
    initialMode?: 'files' | 'folder' | 'link';
}) {
    const router = useRouter();
    const [uploadMode, setUploadMode] = useState<'files' | 'folder' | 'link'>(initialMode);
    const [targetCategoryId, setTargetCategoryId] = useState<string>(defaultCategoryId || '');

    // Single file fields
    const [singleTitle, setSingleTitle] = useState('');
    const [singleDesc, setSingleDesc] = useState('');
    const [singleType, setSingleType] = useState('PDF');
    const [singleUrl, setSingleUrl] = useState('');
    const [singleVersion, setSingleVersion] = useState('1.0');

    // Multi-file selection
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    
    // Security & download settings
    const [docSecurity, setDocSecurity] = useState<'INHERIT' | 'PUBLIC' | 'CONFIDENTIAL'>('INHERIT');
    const [isDownloadable, setIsDownloadable] = useState(true);

    // Upload progress state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{
        current: number;
        total: number;
        percent: number;
        currentFileName: string;
    } | null>(null);

    const [mounted, setMounted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isOpen) {
            setTargetCategoryId(defaultCategoryId || '');
            setUploadMode(initialMode || 'files');
            setSelectedFiles([]);
            setSingleTitle('');
            setSingleDesc('');
            setSingleUrl('');
            setUploadProgress(null);
        }
    }, [isOpen, defaultCategoryId, initialMode]);

    const folderStructure = useMemo(() => {
        if (selectedFiles.length === 0) return null;
        const subfolderMap = new Map<string, number>();
        let rootFolderName = '';

        for (const file of selectedFiles) {
            const relPath = (file as any).webkitRelativePath;
            if (relPath) {
                const parts = relPath.split(/[/\\]/);
                if (parts.length > 1) {
                    if (!rootFolderName) rootFolderName = parts[0];
                    const dirPath = parts.slice(0, -1).join(' / ');
                    subfolderMap.set(dirPath, (subfolderMap.get(dirPath) || 0) + 1);
                }
            }
        }

        return {
            rootName: rootFolderName || 'Thư mục tải lên',
            subfolders: Array.from(subfolderMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
            fileCount: selectedFiles.length,
            totalBytes: selectedFiles.reduce((acc, f) => acc + f.size, 0)
        };
    }, [selectedFiles]);

    if (!isOpen || !mounted) return null;

    const handleFilesSelect = (filesList: FileList | null) => {
        if (!filesList || filesList.length === 0) return;
        const arr = Array.from(filesList).filter(f => !f.name.startsWith('.') && f.name !== 'Thumbs.db');
        setSelectedFiles(arr);

        if (arr.length === 1) {
            const f = arr[0];
            const cleanName = f.name.replace(/\.[^/.]+$/, '');
            setSingleTitle(cleanName);
            setSingleType(detectFileType(f.name));
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const items = e.dataTransfer.items;
        if (!items || items.length === 0) {
            handleFilesSelect(e.dataTransfer.files);
            return;
        }

        const readEntry = async (entry: any, currentPath = ''): Promise<File[]> => {
            if (entry.isFile) {
                return new Promise((resolve) => {
                    entry.file((file: File) => {
                        if (!file.name.startsWith('.') && file.name !== 'Thumbs.db') {
                            Object.defineProperty(file, 'webkitRelativePath', {
                                value: currentPath + file.name,
                                writable: true
                            });
                            resolve([file]);
                        } else {
                            resolve([]);
                        }
                    }, () => resolve([]));
                });
            } else if (entry.isDirectory) {
                const dirReader = entry.createReader();
                const readBatch = async (): Promise<any[]> => {
                    return new Promise((resolve) => {
                        dirReader.readEntries((entries: any[]) => resolve(entries || []), () => resolve([]));
                    });
                };
                let allEntries: any[] = [];
                let batch = await readBatch();
                while (batch.length > 0) {
                    allEntries = allEntries.concat(batch);
                    batch = await readBatch();
                }

                let subFiles: File[] = [];
                for (const childEntry of allEntries) {
                    const files = await readEntry(childEntry, `${currentPath}${entry.name}/`);
                    subFiles = subFiles.concat(files);
                }
                return subFiles;
            }
            return [];
        };

        let collectedFiles: File[] = [];
        let hasDirectory = false;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
            if (entry) {
                if (entry.isDirectory) hasDirectory = true;
                const files = await readEntry(entry, '');
                collectedFiles = collectedFiles.concat(files);
            }
        }

        if (collectedFiles.length > 0) {
            if (hasDirectory) {
                setUploadMode('folder');
            }
            setSelectedFiles(collectedFiles);
        } else {
            handleFilesSelect(e.dataTransfer.files);
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadSingleFileRecord = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Tải file ${file.name} thất bại`);
        }

        const data = await res.json();
        return data.url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // LINK / VIDEO URL MODE
        if (uploadMode === 'link') {
            if (!singleTitle.trim() || !singleUrl.trim()) {
                toast.error('Vui lòng nhập tên tài liệu và đường dẫn liên kết');
                return;
            }

            setIsUploading(true);
            try {
                await createLibraryDocument({
                    title: singleTitle.trim(),
                    description: singleDesc.trim() || undefined,
                    fileType: singleType === 'VIDEO' ? 'VIDEO' : 'LINK',
                    fileUrl: singleUrl.trim(),
                    categoryId: targetCategoryId || undefined,
                    securityLevel: docSecurity,
                    isDownloadable,
                    version: singleVersion || '1.0'
                });
                toast.success('Đã lưu liên kết tài liệu thành công');
                onClose();
                router.refresh();
            } catch (err: any) {
                toast.error(err.message || 'Lỗi lưu tài liệu');
            } finally {
                setIsUploading(false);
            }
            return;
        }

        // FILES OR FOLDER MODE
        if (selectedFiles.length === 0) {
            toast.error('Vui lòng chọn ít nhất một tập tin hoặc thư mục để tải lên');
            return;
        }

        setIsUploading(true);
        const total = selectedFiles.length;
        let successCount = 0;
        const failedFiles: string[] = [];

        // Cache for directory path -> categoryId (to create folder hierarchy once)
        const dirCache = new Map<string, string>();

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                setUploadProgress({
                    current: i + 1,
                    total,
                    percent: Math.round(((i + 1) / total) * 100),
                    currentFileName: file.name
                });

                try {
                    // Upload the file to storage
                    const fileUrl = await uploadSingleFileRecord(file);

                    // Resolve target category (if folder upload with webkitRelativePath)
                    let fileCategoryId = targetCategoryId || undefined;
                    const relativePath = (file as any).webkitRelativePath;

                    if (relativePath) {
                        const parts = relativePath.split(/[/\\]/);
                        const dirSegments = parts.slice(0, -1); // folders only

                        if (dirSegments.length > 0) {
                            const pathKey = dirSegments.join('/');
                            if (dirCache.has(pathKey)) {
                                fileCategoryId = dirCache.get(pathKey);
                            } else {
                                // Sequentially resolve category path
                                let currentParent: string | undefined = targetCategoryId || undefined;
                                let runningKey = '';
                                for (const seg of dirSegments) {
                                    runningKey = runningKey ? `${runningKey}/${seg}` : seg;
                                    if (dirCache.has(runningKey)) {
                                        currentParent = dirCache.get(runningKey);
                                    } else {
                                        const createdId: any = await getOrCreateCategoryPath([seg], currentParent);
                                        if (createdId) {
                                            currentParent = createdId;
                                            dirCache.set(runningKey, createdId);
                                        }
                                    }
                                }
                                fileCategoryId = currentParent;
                            }
                        }
                    }

                    // Determine title & type
                    const fileTitle = (selectedFiles.length === 1 && singleTitle.trim())
                        ? singleTitle.trim()
                        : file.name.replace(/\.[^/.]+$/, '');

                    const detectedType = selectedFiles.length === 1
                        ? singleType
                        : detectFileType(file.name);

                    await createLibraryDocument({
                        title: fileTitle,
                        description: selectedFiles.length === 1 ? (singleDesc.trim() || undefined) : undefined,
                        fileType: detectedType,
                        fileUrl,
                        size: file.size,
                        categoryId: fileCategoryId,
                        securityLevel: docSecurity,
                        isDownloadable,
                        version: selectedFiles.length === 1 ? singleVersion : '1.0'
                    });

                    successCount++;
                } catch (err: any) {
                    console.error('File upload failed:', file.name, err);
                    failedFiles.push(file.name);
                }
            }

            if (successCount > 0) {
                toast.success(`Đã tải lên thành công ${successCount} tập tin`);
                onClose();
                router.refresh();
            }

            if (failedFiles.length > 0) {
                toast.error(`Có ${failedFiles.length} tập tin không tải được: ${failedFiles.slice(0, 3).join(', ')}...`);
            }
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
        }
    };

    const targetCategory = categories.find(c => c.id === targetCategoryId);

    return createPortal(
        <div 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                backgroundColor: 'rgba(15,23,42,0.6)', 
                backdropFilter: 'blur(4px)', 
                zIndex: 99999, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '1rem' 
            }}
            onClick={() => { if (!isUploading) onClose(); }}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                            <UploadCloud size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">Tải Tài Liệu & Tập Tin</h3>
                            <p className="text-xs text-slate-500">Lưu trữ tập tin, thư mục phân cấp hoặc liên kết</p>
                        </div>
                    </div>
                    {!isUploading && (
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Upload Mode Switcher Tabs */}
                <div className="flex border-b border-slate-200/80 bg-slate-50/50 px-6 pt-2 gap-2 text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => { setUploadMode('files'); setSelectedFiles([]); }}
                        className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 transition-all ${
                            uploadMode === 'files'
                                ? 'border-emerald-600 text-emerald-700 font-bold bg-white rounded-t-lg'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Files size={15} />
                        <span>Tải Tập Tin (1 hoặc nhiều)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setUploadMode('folder'); setSelectedFiles([]); }}
                        className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 transition-all ${
                            uploadMode === 'folder'
                                ? 'border-emerald-600 text-emerald-700 font-bold bg-white rounded-t-lg'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <FolderUp size={15} />
                        <span>Tải Thư Mục (Toàn bộ cây)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setUploadMode('link'); setSelectedFiles([]); }}
                        className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 transition-all ${
                            uploadMode === 'link'
                                ? 'border-emerald-600 text-emerald-700 font-bold bg-white rounded-t-lg'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Link2 size={15} />
                        <span>Liên kết / Video</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-sm max-h-[75vh] overflow-y-auto">
                    {/* Thư mục đích lưu trữ (Defaults to currently selected category) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block font-semibold text-slate-700 text-xs">
                                Thư mục lưu trữ đích *
                            </label>
                            {targetCategory && (
                                <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Mặc định: {targetCategory.name}
                                </span>
                            )}
                        </div>
                        <select
                            value={targetCategoryId}
                            onChange={e => setTargetCategoryId(e.target.value)}
                            disabled={isUploading}
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white text-slate-800 text-xs"
                        >
                            <option value="">📁 -- Thư mục gốc (Root - Dùng chung) --</option>
                            {renderCategorySelectOptions(categories)}
                        </select>
                    </div>

                    {/* MODE 1: FILES UPLOAD (SINGLE OR MULTIPLE) */}
                    {uploadMode === 'files' && (
                        <div className="space-y-3">
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={e => handleFilesSelect(e.target.files)}
                            />

                            {/* Dropzone */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={handleDrop}
                                className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/60 hover:bg-emerald-50/30 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-emerald-600 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 transition-transform">
                                    <Files size={24} />
                                </div>
                                <div className="text-xs font-bold text-slate-700 mb-1">
                                    Nhấp để chọn file hoặc kéo thả tập tin vào đây
                                </div>
                                <div className="text-[11px] text-slate-400">
                                    Hỗ trợ chọn cùng lúc <span className="font-semibold text-emerald-600">nhiều tập tin</span>: PDF, Word, Excel, PowerPoint, Hình ảnh, Video...
                                </div>
                            </div>

                            {/* Selected Files List */}
                            {selectedFiles.length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                                    <div className="px-3.5 py-2 bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-700">
                                        <span>Đã chọn ({selectedFiles.length} tập tin)</span>
                                        <span className="font-mono text-slate-500">
                                            Tổng: {formatBytes(selectedFiles.reduce((acc, f) => acc + f.size, 0))}
                                        </span>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                                        {selectedFiles.map((f, i) => (
                                            <div key={i} className="px-3.5 py-2 flex items-center justify-between gap-2 hover:bg-white transition-colors">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-200/80 text-slate-600">
                                                        {detectFileType(f.name)}
                                                    </span>
                                                    <span className="truncate font-medium text-slate-800">{f.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="font-mono text-[11px] text-slate-400">{formatBytes(f.size)}</span>
                                                    {!isUploading && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFile(i)}
                                                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* If only 1 file is selected, allow custom title and description */}
                            {selectedFiles.length === 1 && (
                                <div className="space-y-3 pt-1">
                                    <div>
                                        <label className="block font-semibold text-slate-700 text-xs mb-1">Tên tài liệu hiển thị</label>
                                        <input
                                            type="text"
                                            value={singleTitle}
                                            onChange={e => setSingleTitle(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs text-slate-800"
                                            placeholder="Tên tài liệu..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 text-xs mb-1">Mô tả / Trích yếu nội dung</label>
                                        <input
                                            type="text"
                                            value={singleDesc}
                                            onChange={e => setSingleDesc(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs text-slate-800"
                                            placeholder="Tóm tắt nội dung tài liệu..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MODE 2: FOLDER UPLOAD */}
                    {uploadMode === 'folder' && (
                        <div className="space-y-3">
                            <input
                                ref={folderInputRef}
                                type="file"
                                // @ts-ignore
                                webkitdirectory=""
                                directory=""
                                multiple
                                className="hidden"
                                onChange={e => handleFilesSelect(e.target.files)}
                            />

                            <div
                                onClick={() => folderInputRef.current?.click()}
                                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={handleDrop}
                                className="border-2 border-dashed border-teal-200 hover:border-teal-500 rounded-2xl p-6 text-center cursor-pointer bg-teal-50/30 hover:bg-teal-50/60 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white border border-teal-200 shadow-xs text-teal-600 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 transition-transform">
                                    <FolderUp size={24} />
                                </div>
                                <div className="text-xs font-bold text-slate-800 mb-1">
                                    Nhấp để chọn một Thư Mục từ máy tính (hoặc kéo thả thư mục vào)
                                </div>
                                <div className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                                    Hệ thống sẽ tự động quét và <span className="font-semibold text-teal-700">tự động tạo toàn bộ cấu trúc các thư mục con đa cấp</span> bên trong và tải các tập tin vào đúng thư mục tương ứng.
                                </div>
                            </div>

                            {folderStructure && (
                                <div className="border border-teal-200 rounded-xl overflow-hidden bg-teal-50/40 text-xs animate-in fade-in">
                                    <div className="p-3 bg-teal-100/70 border-b border-teal-200 flex items-center justify-between font-bold text-teal-900">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FolderUp size={16} className="text-teal-700 shrink-0" />
                                            <span className="truncate">Thư mục tải lên: <strong>{folderStructure.rootName}</strong></span>
                                        </div>
                                        <span className="font-mono text-[11px] text-teal-700 font-semibold shrink-0 ml-2">
                                            {folderStructure.fileCount} tệp • {formatBytes(folderStructure.totalBytes)}
                                        </span>
                                    </div>

                                    <div className="p-3 space-y-2">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                                            <CheckCircle2 size={13} className="text-teal-600" />
                                            <span>Hệ thống sẽ tự động tạo ({folderStructure.subfolders.length}) thư mục & đường dẫn con:</span>
                                        </div>
                                        <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-2.5 rounded-lg border border-teal-200/70 font-mono text-[11px] text-slate-700 divide-y divide-slate-100">
                                            {folderStructure.subfolders.map(([pathStr, count]: [string, number], idx: number) => (
                                                <div key={idx} className="py-1 flex items-center justify-between">
                                                    <span className="truncate flex items-center gap-1.5">
                                                        <Folder size={12} className="text-teal-600 shrink-0" />
                                                        <span>{pathStr}</span>
                                                    </span>
                                                    <span className="text-[10px] bg-teal-50 text-teal-700 font-bold px-1.5 py-0.2 rounded border border-teal-200 shrink-0 ml-2">
                                                        {count} tệp
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-teal-700 italic">
                                            * Tất cả các thư mục con bên trong sẽ được tự động tạo phân cấp và sắp xếp tệp tương ứng.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MODE 3: LINK / VIDEO URL */}
                    {uploadMode === 'link' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block font-semibold text-slate-700 text-xs mb-1">Tên tài liệu / Tiêu đề liên kết *</label>
                                <input
                                    type="text"
                                    required
                                    value={singleTitle}
                                    onChange={e => setSingleTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs text-slate-800"
                                    placeholder="VD: Video hướng dẫn quy trình bán hàng, Cổng tra cứu hải quan..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 text-xs mb-1">Loại liên kết</label>
                                    <select
                                        value={singleType}
                                        onChange={e => setSingleType(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white text-xs text-slate-800"
                                    >
                                        <option value="VIDEO">🎬 Video đào tạo (YouTube, Drive...)</option>
                                        <option value="LINK">🔗 Liên kết Website / Văn bản ngoài</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 text-xs mb-1">Đường dẫn URL *</label>
                                    <input
                                        type="url"
                                        required
                                        value={singleUrl}
                                        onChange={e => setSingleUrl(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs text-slate-800"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 text-xs mb-1">Mô tả chi tiết</label>
                                <textarea
                                    value={singleDesc}
                                    onChange={e => setSingleDesc(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none h-16 resize-none text-xs text-slate-800"
                                    placeholder="Ghi chú nội dung..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Common Security & Download Settings */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Shield size={13} className="text-emerald-600" /> Cấp độ bảo mật
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDocSecurity('INHERIT')}
                                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-left flex items-center gap-1.5 ${
                                        docSecurity === 'INHERIT'
                                            ? 'bg-white border-slate-400 text-slate-800 shadow-xs'
                                            : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    Kế thừa
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDocSecurity('PUBLIC')}
                                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-left flex items-center gap-1.5 ${
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
                                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-left flex items-center gap-1.5 ${
                                        docSecurity === 'CONFIDENTIAL'
                                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs font-bold'
                                            : 'bg-transparent border-slate-200 text-slate-500 hover:bg-white'
                                    } ${!isLeadership ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    title={!isLeadership ? 'Chỉ cấp Lãnh đạo mới được đặt bảo mật Mật' : ''}
                                >
                                    <Lock size={12} className="text-rose-600" />
                                    🔒 Mật
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs text-slate-600">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isDownloadable}
                                    onChange={e => setIsDownloadable(e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                                />
                                <span>Cho phép tải file gốc về máy tính</span>
                            </label>
                        </div>
                    </div>

                    {/* Upload Progress Indicator */}
                    {isUploading && uploadProgress && (
                        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2 animate-in fade-in">
                            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                                <span>Đang xử lý tải lên ({uploadProgress.current}/{uploadProgress.total})</span>
                                <span className="font-mono">{uploadProgress.percent}%</span>
                            </div>
                            <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-emerald-600 h-full rounded-full transition-all duration-200" 
                                    style={{ width: `${uploadProgress.percent}%` }}
                                />
                            </div>
                            <div className="text-[11px] text-emerald-700 truncate">
                                Tập tin: {uploadProgress.currentFileName}
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            disabled={isUploading}
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors text-xs disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isUploading || (uploadMode !== 'link' && selectedFiles.length === 0)}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors text-xs shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang tải lên...</span>
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={15} />
                                    <span>
                                        {uploadMode === 'link' 
                                            ? 'Lưu Liên Kết' 
                                            : selectedFiles.length > 1 
                                                ? `Tải Lên ${selectedFiles.length} Tập Tin` 
                                                : 'Bắt Đầu Tải Lên'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

// ----------------------------------------------------
// 4. RENAME CATEGORY MODAL
// ----------------------------------------------------
export function RenameCategoryModal({
    isOpen,
    onClose,
    folder
}: {
    isOpen: boolean;
    onClose: () => void;
    folder: any;
}) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (folder) setName(folder.name || '');
    }, [folder]);

    if (!isOpen || !folder || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSubmitting(true);
        try {
            await renameLibraryCategory(folder.id, name.trim());
            toast.success('Đã đổi tên thư mục thành công');
            onClose();
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || 'Lỗi đổi tên thư mục');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                backgroundColor: 'rgba(15,23,42,0.6)', 
                backdropFilter: 'blur(4px)', 
                zIndex: 99999, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '1rem' 
            }}
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 p-5 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Edit3 size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Đổi Tên Thư Mục</h3>
                        <p className="text-[11px] text-slate-500">Cập nhật tên hiển thị của thư mục</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tên thư mục</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800"
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50"
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

// ----------------------------------------------------
// 5. UPDATE CATEGORY SECURITY MODAL
// ----------------------------------------------------
export function CategorySecurityModal({
    isOpen,
    onClose,
    folder
}: {
    isOpen: boolean;
    onClose: () => void;
    folder: any;
}) {
    const router = useRouter();
    const [securityLevel, setSecurityLevel] = useState<'PUBLIC' | 'DEPARTMENT' | 'CONFIDENTIAL'>('PUBLIC');
    const [targetDepartment, setTargetDepartment] = useState('KE_TOAN');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (folder) {
            setSecurityLevel(folder.securityLevel || 'PUBLIC');
            setTargetDepartment(folder.targetDepartment || 'KE_TOAN');
        }
    }, [folder]);

    if (!isOpen || !folder || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await updateCategorySecurity(folder.id, {
                securityLevel,
                targetDepartment: securityLevel === 'DEPARTMENT' ? targetDepartment : undefined
            });
            toast.success('Đã cập nhật cấp bảo mật thư mục');
            onClose();
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || 'Lỗi cập nhật bảo mật');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                backgroundColor: 'rgba(15,23,42,0.6)', 
                backdropFilter: 'blur(4px)', 
                zIndex: 99999, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '1rem' 
            }}
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 p-5 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Shield size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Cấp Độ Bảo Mật: {folder.name}</h3>
                        <p className="text-[11px] text-slate-500">Thiết lập phạm vi truy cập thư mục</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 gap-2">
                        <label
                            onClick={() => setSecurityLevel('PUBLIC')}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                securityLevel === 'PUBLIC'
                                    ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <div className="mt-0.5"><Globe size={14} className="text-indigo-600" /></div>
                            <div>
                                <div className="font-semibold text-xs">Dùng chung (Toàn công ty)</div>
                                <div className="text-[10px] text-slate-500">Mọi nhân viên đều xem được</div>
                            </div>
                        </label>

                        <label
                            onClick={() => setSecurityLevel('DEPARTMENT')}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                securityLevel === 'DEPARTMENT'
                                    ? 'bg-amber-50 border-amber-400 text-amber-950 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <div className="mt-0.5"><Building2 size={14} className="text-amber-600" /></div>
                            <div>
                                <div className="font-semibold text-xs">Thư mục Phòng ban</div>
                                <div className="text-[10px] text-slate-500">Giới hạn trong nội bộ phòng ban</div>
                            </div>
                        </label>

                        <label
                            onClick={() => setSecurityLevel('CONFIDENTIAL')}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                                securityLevel === 'CONFIDENTIAL'
                                    ? 'bg-rose-50 border-rose-400 text-rose-950 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            <div className="mt-0.5"><Lock size={14} className="text-rose-600" /></div>
                            <div>
                                <div className="font-semibold text-xs">🔒 Mật (Ban Lãnh Đạo)</div>
                                <div className="text-[10px] text-slate-500">Chỉ Giám Đốc, HĐQT & Admin</div>
                            </div>
                        </label>
                    </div>

                    {securityLevel === 'DEPARTMENT' && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Chọn phòng ban</label>
                            <select
                                value={targetDepartment}
                                onChange={e => setTargetDepartment(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none bg-white text-xs text-slate-800"
                            >
                                <option value="KE_TOAN">Phòng Kế toán & Tài chính</option>
                                <option value="NHAN_SU">Phòng Hành chính Nhân sự</option>
                                <option value="KINH_DOANH">Phòng Kinh doanh & Marketing</option>
                                <option value="KY_THUAT">Phòng Kỹ thuật & Công nghệ</option>
                                <option value="BAN_GIAM_DOC">Ban Giám Đốc</option>
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50"
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Cập Nhật Quyền'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
