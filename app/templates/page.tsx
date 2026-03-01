import { prisma } from '@/lib/prisma';
import { TemplateClient } from './TemplateClient';

export default async function TemplatesPage() {
    const templates = await prisma.contractTemplate.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1>Quản lý Mẫu hợp đồng</h1>
            </div>
            <TemplateClient initialData={templates} />
        </div>
    );
}
