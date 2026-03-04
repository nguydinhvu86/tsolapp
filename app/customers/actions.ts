'use server'

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logCustomerActivity } from "@/lib/customerLogger";
import { revalidatePath } from 'next/cache';

export async function createCustomer(data: { name: string, email?: string, phone?: string, address?: string, taxCode?: string }) {
    const customer = await prisma.customer.create({ data });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
        await logCustomerActivity(
            customer.id,
            session.user.id,
            'TẠO_MỚI',
            `Tạo mới hồ sơ khách hàng: ${customer.name}`
        );
    }

    revalidatePath('/customers');
    return customer;
}

export async function updateCustomer(id: string, data: { name: string, email?: string, phone?: string, address?: string, taxCode?: string }) {
    const customer = await prisma.customer.update({ where: { id }, data });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
        await logCustomerActivity(
            customer.id,
            session.user.id,
            'CẬP_NHẬT',
            `Cập nhật hồ sơ khách hàng: ${customer.name}`
        );
    }

    revalidatePath('/customers');
    return customer;
}

export async function deleteCustomer(id: string) {
    await prisma.customer.delete({ where: { id } });
    revalidatePath('/customers');
}

export async function getCustomers() {
    return await prisma.customer.findMany({ orderBy: { name: 'asc' } });
}