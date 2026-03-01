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
            permissionGroupId: true,
            permissionGroup: {
                select: {
                    id: true,
                    name: true,
                    permissions: true
                }
            },
            createdAt: true
        } // Không trả về password hash cho client
    });
    return users.map(u => {
        let parsedPermissions = [];
        try {
            parsedPermissions = JSON.parse(u.permissions || "[]");
        } catch (e) {
            console.error("Lỗi parse JSON permissions cho user", u.email, e);
        }
        return {
            ...u,
            permissions: parsedPermissions as string[]
        };
    });
}

// Data form tạo User
export type CreateUserData = {
    email: string;
    name: string;
    role: string;
    password?: string;
    permissionGroupId?: string;
    permissions?: string[]; // Legacy/override
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
            permissionGroupId: data.permissionGroupId,
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
    permissionGroupId?: string;
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

    if (data.permissionGroupId !== undefined) {
        updateData.permissionGroupId = data.permissionGroupId;
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

// ----------------------------------------------------------------------------
// PERMISSION GROUP ACTIONS
// ----------------------------------------------------------------------------

export async function getPermissionGroups() {
    await checkAdmin();
    const groups = await prisma.permissionGroup.findMany({
        orderBy: { createdAt: 'asc' }
    });
    return groups.map(g => {
        let parsedPermissions = [];
        try {
            parsedPermissions = JSON.parse(g.permissions || "[]");
        } catch (e) {
            console.error("Lỗi parse JSON permissions cho group", g.name, e);
        }
        return {
            ...g,
            permissions: parsedPermissions as string[]
        };
    });
}

export type PermissionGroupData = {
    name: string;
    description?: string;
    permissions: string[];
};

export async function createPermissionGroup(data: PermissionGroupData) {
    await checkAdmin();

    const existing = await prisma.permissionGroup.findUnique({
        where: { name: data.name }
    });
    if (existing) throw new Error('Tên nhóm quyền đã tồn tại.');

    const group = await prisma.permissionGroup.create({
        data: {
            name: data.name,
            description: data.description,
            permissions: JSON.stringify(data.permissions)
        }
    });

    // Nơi nào dùng revalidate? Thường ở danh sách
    revalidatePath('/users');
    revalidatePath('/settings/roles'); // Giả định
    return group;
}

export async function updatePermissionGroup(id: string, data: PermissionGroupData) {
    await checkAdmin();

    const target = await prisma.permissionGroup.findUnique({ where: { id } });
    if (!target) throw new Error('Nhóm không tồn tại.');
    if (target.isSystem && target.name !== data.name) {
        throw new Error('Không thể đổi tên nhóm hệ thống mặc định.');
    } // Vẫn cho phép cập nhật quyền của nhóm hệ thống nếu admin muốn.

    const group = await prisma.permissionGroup.update({
        where: { id },
        data: {
            name: target.isSystem ? undefined : data.name, // Không đổi tên nếu system
            description: data.description,
            permissions: JSON.stringify(data.permissions)
        }
    });

    revalidatePath('/users');
    revalidatePath('/settings/roles');
    return group;
}

export async function deletePermissionGroup(id: string) {
    await checkAdmin();

    const target = await prisma.permissionGroup.findUnique({ where: { id } });
    if (!target) throw new Error('Nhóm không tồn tại.');
    if (target.isSystem) {
        throw new Error('Không thể xóa nhóm hệ thống mặc định.');
    }

    // Unassign users or block deletion? Let's just set users to NULL
    await prisma.user.updateMany({
        where: { permissionGroupId: id },
        data: { permissionGroupId: null }
    });

    await prisma.permissionGroup.delete({
        where: { id }
    });

    revalidatePath('/users');
    revalidatePath('/settings/roles');
    return true;
}
