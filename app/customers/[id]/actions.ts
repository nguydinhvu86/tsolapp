'use server'

import { prisma } from '@/lib/prisma';

export async function getCustomerWithRelations(id: string) {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                quotes: {
                    orderBy: { createdAt: 'desc' }
                },
                contracts: {
                    orderBy: { createdAt: 'desc' },
                    include: { template: true, appendices: true }
                },
                handovers: {
                    orderBy: { createdAt: 'desc' }
                },
                paymentRequests: {
                    orderBy: { createdAt: 'desc' }
                },
                dispatches: {
                    orderBy: { createdAt: 'desc' },
                    include: { template: true }
                }
            }
        });
        return customer;
    } catch (e) {
        console.error("Failed to fetch customer relations", e);
        return null;
    }
}
