import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getLibraryCategories, getLibraryDocuments } from './actions';
import LibraryClient from './LibraryClient';

export const dynamic = 'force-dynamic';

export const metadata = { title: "T-Drive & Quản Lý Tài Liệu | T-Solutions" };

export default async function LibraryPage({
    searchParams,
}: {
    searchParams: { category?: string; search?: string; type?: string; filter?: string }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div className="p-8 text-center text-slate-500">Chưa xác thực quyền truy cập</div>;

    const user = session.user as any;
    const isLeadership = user.role === 'ADMIN' || user.role === 'MANAGER' || (user.permissions || []).includes('LIBRARY_CONFIDENTIAL');
    const canManage = ['ADMIN', 'MANAGER'].includes(user.role) || (user.permissions || []).includes('LIBRARY_CREATE');

    const [categories, documents] = await Promise.all([
        getLibraryCategories(),
        getLibraryDocuments(searchParams.category, searchParams.search)
    ]);

    return (
        <LibraryClient
            categories={categories}
            initialDocuments={documents}
            currentCategoryId={searchParams.category}
            initialSearch={searchParams.search}
            canManage={canManage}
            isLeadership={isLeadership}
            currentUser={user}
        />
    );
}
