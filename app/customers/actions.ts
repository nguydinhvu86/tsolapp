'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createCustomer(data: { name: string, email?: string, phone?: string, address?: string, taxCode?: string }) {
    await prisma.customer.create({ data });
    revalidatePath('/customers');
}

export async function updateCustomer(id: string, data: { name: string, email?: string, phone?: string, address?: string, taxCode?: string }) {
    await prisma.customer.update({ where: { id }, data });
    revalidatePath('/customers');
}

export async function deleteCustomer(id: string) {
    await prisma.customer.delete({ where: { id } });
    revalidatePath('/customers');
}

export async function getCustomers() {
    return await prisma.customer.findMany({ orderBy: { name: 'asc' } });
}