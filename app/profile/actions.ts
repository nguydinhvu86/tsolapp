'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function getProfile() {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error('Unauthorized');
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatar: true,
            twoFactorEnabled: true
        }
    });

    if (!user) throw new Error('Không tìm thấy người dùng');
    return user;
}

export type UpdateProfileData = {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
};

export async function updateProfile(data: UpdateProfileData) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error('Unauthorized');
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            password: true,
            email: true,
            role: true
        }
    });

    if (!user) {
        throw new Error('Không tìm thấy tài khoản người dùng');
    }

    const updateData: any = {};

    if (data.name !== undefined && data.name !== user.name) {
        updateData.name = data.name;
    }

    // Nếu muốn đổi mật khẩu, phải xác minh mật khẩu cũ
    if (data.newPassword && data.newPassword.trim() !== '') {
        if (!data.currentPassword) {
            throw new Error('Vui lòng nhập mật khẩu hiện tại để xác minh.');
        }

        const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Mật khẩu hiện tại không chính xác.');
        }

        updateData.password = await bcrypt.hash(data.newPassword, 10);
    }

    // Nếu không có gì để update
    if (Object.keys(updateData).length === 0) {
        return user;
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData
    });

    revalidatePath('/profile');
    // Có thể cần refresh cả layout nếu tên hiển thị trên Header thay đổi
    revalidatePath('/', 'layout');

    return { success: true };
}
