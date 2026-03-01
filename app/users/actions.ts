'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

// Kiểm tra quyền Admin
async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        throw new Error('Unauthorized');
    }
    return session;
}

export async function getUsers() {
    await checkAdmin();
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            permissions: true,
            createdAt: true
        } // Không trả về password hash cho client
    });
    return users.map(u => ({
        ...u,
        permissions: JSON.parse(u.permissions || "[]") as string[]
    }));
}

// Data form tạo User
export type CreateUserData = {
    email: string;
    name: string;
    role: string;
    password?: string;
    permissions?: string[];
};

export async function createUser(data: CreateUserData) {
    await checkAdmin();

    // Sinh mật khẩu tạm mặc định nếu admin không nhập
    const rawPassword = data.password || '123456';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const checkExist = await prisma.user.findUnique({
        where: { email: data.email }
    });

    if (checkExist) {
        throw new Error('Email đã tồn tại trong hệ thống!');
    }

    const newUser = await prisma.user.create({
        data: {
            email: data.email,
            name: data.name,
            role: data.role || 'USER',
            password: hashedPassword,
            permissions: JSON.stringify(data.permissions || [])
        }
    });

    revalidatePath('/users');
    return newUser;
}

// Data form cập nhật User
export type UpdateUserData = {
    email?: string;
    name?: string;
    role?: string;
    password?: string;
    permissions?: string[];
};

export async function updateUser(id: string, data: UpdateUserData) {
    const session = await checkAdmin();

    const updateData: any = {};
    if (data.email) updateData.email = data.email;
    if (data.name !== undefined) updateData.name = data.name;

    // Ngăn chặn admin tự hạ quyền của chính mình để tránh mất quyền quản trị hệ thống
    if (data.role) {
        if (id === session.user.id && data.role !== 'ADMIN') {
            throw new Error('Bạn không thể tự gỡ quyền ADMIN của chính mình.');
        }
        updateData.role = data.role;
    }

    // Nếu admin muốn đổi password của tài khoản này
    if (data.password && data.password.trim() !== '') {
        updateData.password = await bcrypt.hash(data.password, 10);
    }

    if (data.permissions !== undefined) {
        updateData.permissions = JSON.stringify(data.permissions);
    }

    const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData
    });

    revalidatePath('/users');
    return updatedUser;
}

export async function deleteUser(id: string) {
    const session = await checkAdmin();

    if (id === session.user.id) {
        throw new Error('Bạn không thể tự xóa tài khoản của chính mình.');
    }

    await prisma.user.delete({
        where: { id }
    });

    revalidatePath('/users');
    return true;
}
