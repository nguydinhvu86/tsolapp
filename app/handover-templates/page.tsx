import { prisma } from '@/lib/prisma';
import { HandoverTemplateClient } from './HandoverTemplateClient';

export default async function HandoverTemplatesPage() {
    const templates = await prisma.handoverTemplate.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1>Quản lý Mẫu Biên Bản</h1>
            </div>
            <HandoverTemplateClient initialData={templates} />
        </div>
    );
}
