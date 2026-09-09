import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getLibraryCategories, getLibraryDocuments } from './actions';
import LibraryClient from './LibraryClient';

export const dynamic = 'force-dynamic';

export const metadata = { title: "Thư Viện & Đào Tạo | T-Solutions" };

export default async function LibraryPage({
    searchParams,
}: {
    searchParams: { category?: string, search?: string }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div className="p-8 text-center text-slate-500">Chưa xác thực quyền truy cập</div>;

    const [categories, documents] = await Promise.all([
        getLibraryCategories(),
        getLibraryDocuments(searchParams.category, searchParams.search)
    ]);

    const canManage = ['ADMIN', 'MANAGER'].includes(session.user.role);

    return (
        <LibraryClient
            categories={categories}
            initialDocuments={documents}
            currentCategoryId={searchParams.category}
            initialSearch={searchParams.search}
            canManage={canManage}
        />
    );
}
