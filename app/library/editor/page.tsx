import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getLibraryCategories } from '../actions';
import OnlineDocEditorClient from './OnlineDocEditorClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: "Soạn Thảo Văn Bản Mới | T-Drive" };

export default async function NewOnlineDocumentPage({
    searchParams
}: {
    searchParams: { category?: string }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return <div className="p-8 text-center text-slate-500">Chưa xác thực quyền truy cập</div>;
    }

    const user = session.user as any;
    const isLeadership = user.role === 'ADMIN' || user.role === 'MANAGER' || (user.permissions || []).includes('LIBRARY_CONFIDENTIAL');
    const categories = await getLibraryCategories();

    return (
        <OnlineDocEditorClient
            categories={categories}
            defaultCategoryId={searchParams.category}
            isLeadership={isLeadership}
            currentUser={user}
        />
    );
}
