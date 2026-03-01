import { prisma } from '@/lib/prisma';
import { AppendixListClient } from './AppendixListClient';

export default async function AppendicesPage() {
    const appendices = await prisma.contractAppendix.findMany({
        include: { contract: { include: { customer: true } }, template: true },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div>
            <AppendixListClient initialData={appendices} />
        </div>
    );
}
