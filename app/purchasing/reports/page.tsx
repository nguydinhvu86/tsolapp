import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PurchasingReportClient } from './PurchasingReportClient';

export default async function PurchasingReportPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    const purchaseBills = await prisma.purchaseBill.findMany({
        orderBy: { date: 'asc' },
        include: {
            supplier: { select: { name: true, id: true, code: true } },
            items: {
                include: {
                    product: { select: { name: true, sku: true, unit: true } }
                }
            }
        }
    });

    const purchasePayments = await prisma.purchasePayment.findMany({
        orderBy: { date: 'asc' },
        include: {
            supplier: { select: { name: true, id: true, code: true } },
            allocations: true
        }
    });

    const purchaseOrders = await prisma.purchaseOrder.findMany({
        orderBy: { date: 'asc' },
        include: {
            supplier: { select: { name: true, id: true, code: true } },
            items: {
                include: {
                    product: { select: { name: true, sku: true } }
                }
            }
        }
    });

    const suppliers = await prisma.supplier.findMany({
        select: { id: true, name: true, totalDebt: true, code: true }
    });

    return (
        <PurchasingReportClient
            bills={purchaseBills}
            payments={purchasePayments}
            orders={purchaseOrders}
            suppliers={suppliers}
        />
    );
}
