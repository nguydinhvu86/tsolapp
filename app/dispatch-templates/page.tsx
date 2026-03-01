import { prisma } from '@/lib/prisma';
import { DispatchTemplateClient } from './DispatchTemplateClient';

export default async function DispatchTemplatesPage() {
    const templates = await prisma.dispatchTemplate.findMany({
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div>
            <DispatchTemplateClient initialData={templates} />
        </div>
    );
}
