import { prisma } from '@/lib/prisma';
import { AppendixTemplateClient } from './AppendixTemplateClient';

export default async function AppendixTemplatesPage() {
    const templates = await prisma.contractAppendixTemplate.findMany({
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div>
            <AppendixTemplateClient initialData={templates} />
        </div>
    );
}
