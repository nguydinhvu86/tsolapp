import { prisma } from '@/lib/prisma';
import { NewAppendixClient } from './NewAppendixClient';

export default async function NewAppendixPage({ searchParams }: { searchParams: { contractId?: string } }) {
    // We need to fetch the existing contracts to let user select which contract this appendix belongs to
    const [contracts, templates, customers, products] = await Promise.all([
        prisma.contract.findMany({
            include: { customer: true },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.contractAppendixTemplate.findMany({
            orderBy: { createdAt: 'desc' }
        }),
        prisma.customer.findMany({
            orderBy: { name: 'asc' }
        }),
        prisma.product.findMany({
            orderBy: { name: 'asc' }
        })
    ]);

    return (
        <div>
            <NewAppendixClient
                contracts={contracts}
                templates={templates}
                customers={customers}
                products={products}
                preselectedContractId={searchParams.contractId}
            />
        </div>
    );
}
