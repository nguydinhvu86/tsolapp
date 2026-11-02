import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getDocumentById, getLibraryCategories } from '../../actions';
import { notFound } from 'next/navigation';
import OnlineDocEditorClient from '../OnlineDocEditorClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
    const doc = await getDocumentById(params.id);
    return { title: doc?.title ? `Chỉnh sửa: ${doc.title} | T-Drive` : "Soạn thảo văn bản" };
}

export default async function EditOnlineDocumentPage({
    params
}: {
    params: { id: string }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return <div className="p-8 text-center text-slate-500">Chưa xác thực quyền truy cập</div>;
    }

    const document = await getDocumentById(params.id);
    if (!document) return notFound();

    const user = session.user as any;
    const isLeadership = user.role === 'ADMIN' || user.role === 'MANAGER' || (user.permissions || []).includes('LIBRARY_CONFIDENTIAL');
    const categories = await getLibraryCategories();

    return (
        <OnlineDocEditorClient
            initialDocument={document}
            categories={categories}
            isLeadership={isLeadership}
            currentUser={user}
        />
    );
}
