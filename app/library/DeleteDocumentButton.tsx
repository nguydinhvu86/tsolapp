'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteLibraryDocument } from './actions';

export function DeleteDocumentButton({ documentId, isIconOnly = false }: { documentId: string, isIconOnly?: boolean }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này? Mọi dữ liệu (bao gồm bình luận, ghi chú) sẽ bị xóa vĩnh viễn.')) return;
        
        setIsDeleting(true);
        try {
            await deleteLibraryDocument(documentId);
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Lỗi khi xóa tài liệu');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isIconOnly) {
        return (
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                title="Xóa tài liệu"
            >
                <Trash2 size={16} />
            </button>
        );
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
        >
            <Trash2 size={16} /> {isDeleting ? 'Đang xóa...' : 'Xóa tài liệu'}
        </button>
    );
}
