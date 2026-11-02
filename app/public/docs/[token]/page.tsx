import React from 'react';
import { getPublicDocument } from '@/app/library/actions';
import PublicDocClient from './PublicDocClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { token: string } }) {
    const data = await getPublicDocument(params.token);
    if (data.document?.title) {
        return {
            title: `${data.document.title} | ${data.company?.name || 'T-Solutions'}`,
            description: data.document.description || "Xem tài liệu trực tuyến phát hành chính thức."
        };
    }
    return {
        title: "Tài liệu trực tuyến | T-Solutions"
    };
}

export default async function PublicDocumentPage({
    params
}: {
    params: { token: string }
}) {
    const initialData = await getPublicDocument(params.token);

    return (
        <PublicDocClient
            token={params.token}
            initialData={initialData}
        />
    );
}
