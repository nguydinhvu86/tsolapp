'use server'

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logCustomerActivity } from "@/lib/customerLogger";
import { revalidatePath } from 'next/cache';
import { sendEmailWithTracking } from '@/lib/mailer';

export async function createCustomer(data: { name: string, email?: string, phone?: string, address?: string, taxCode?: string }) {
    if (data.email) data.email = data.email.trim();
    if (!data.email) data.email = undefined; // Prisma expects undefined/null to not insert an empty string

    try {
        const customer = await prisma.customer.create({ data: { ...data, email: data.email || null } });

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
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            throw new Error(`Cảnh báo: Email "${data.email}" đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.`);
        }
        throw new Error("Đã xảy ra lỗi khi tạo khách hàng.");
    }
}

export async function updateCustomer(id: string, data: { name: string, email?: string, phone?: string, address?: string, taxCode?: string }) {
    if (data.email) data.email = data.email.trim();
    if (!data.email) data.email = undefined;

    try {
        const customer = await prisma.customer.update({ where: { id }, data: { ...data, email: data.email || null } });

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
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            throw new Error(`Cảnh báo: Email "${data.email}" đã được sử dụng bởi một khách hàng khác.`);
        }
        throw new Error("Đã xảy ra lỗi khi cập nhật khách hàng.");
    }
}

export async function deleteCustomer(id: string) {
    await prisma.customer.delete({ where: { id } });
    revalidatePath('/customers');
}

export async function getCustomers() {
    return await prisma.customer.findMany({ orderBy: { name: 'asc' } });
}

export async function sendDebtConfirmationEmail(customerId: string, to: string, subject: string, htmlBody: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            return { success: false, error: "Không tìm thấy khách hàng." };
        }

        const res = await sendEmailWithTracking({
            to,
            subject,
            htmlBody,
            senderId: session.user.id,
            customerId: customerId,
        });

        if (res.success) {
            await logCustomerActivity(
                customerId,
                session.user.id,
                'GỬI_EMAIL',
                `Đã gửi Email Xác nhận Công nợ đến ${to}`
            );
        }

        return res;
    } catch (error: any) {
        console.error("Lỗi khi gửi email xác nhận công nợ:", error);
        return { success: false, error: error.message };
    }
}