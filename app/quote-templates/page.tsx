import { prisma } from '@/lib/prisma';
import { QuoteTemplateClient } from './QuoteTemplateClient';

export default async function QuoteTemplatesPage() {
    const templates = await prisma.quoteTemplate.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1>Quản lý Mẫu Báo Giá</h1>
            </div>
            <QuoteTemplateClient initialData={templates} />
        </div>
    );
}
