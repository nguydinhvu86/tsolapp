'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { verifyActionPermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

// -- CATEGORY ACTIONS --

// TypeScript may squawk if IDE cache is outdated, but this matches schema.prisma
export async function getLibraryCategories() {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    return await (prisma as any).documentCategory.findMany({
        include: {
            children: true,
            _count: {
                select: { documents: true }
            }
        },
        orderBy: { name: 'asc' }
    });
}
export async function createLibraryCategory(data: { name: string, description?: string, parentId?: string }) {
    await verifyActionPermission('LIBRARY_CREATE');
    const category = await (prisma as any).documentCategory.create({
        data: {
            name: data.name,
            description: data.description,
            parentId: data.parentId || null
        }
    });
    revalidatePath('/library');
    return category;
}
export async function deleteLibraryCategory(id: string) {
    await verifyActionPermission('LIBRARY_DELETE');
    const category = await (prisma as any).documentCategory.findUnique({
        where: { id },
        include: { children: true, _count: { select: { documents: true } } }
    });
    if (!category) throw new Error('Không tìm thấy thư mục');
    if (category.children.length > 0) throw new Error('Không thể xóa thư mục đang có thư mục con');
    if (category._count.documents > 0) throw new Error('Hãy chuyển file sang nơi khác trước khi xóa thư mục này');
    await (prisma as any).documentCategory.delete({ where: { id } });
    revalidatePath('/library');
}
export async function getLibraryDocuments(categoryId?: string, searchQuery?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');
    const whereClause: any = {};
    if (categoryId) {
        whereClause.categoryId = categoryId;
    }
    if (searchQuery) {
        whereClause.OR = [
            { title: { contains: searchQuery } },
            { description: { contains: searchQuery } }
        ];
    }
    return await (prisma as any).document.findMany({
        where: whereClause,
        include: {
            creator: { select: { name: true, avatar: true } },
            _count: { select: { comments: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
}
export async function getDocumentById(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');
    return await (prisma as any).document.findUnique({
        where: { id },
        include: {
            creator: { select: { name: true, email: true, avatar: true } },
            category: { select: { name: true, id: true } }
        }
    });
}
export async function createLibraryDocument(data: {
    title: string, description?: string, fileUrl?: string, fileType?: string, thumbnail?: string, size?: number, categoryId?: string
}) {
    const user = await verifyActionPermission('LIBRARY_CREATE');
    const uId = (user as any).id;
    const document = await (prisma as any).document.create({
        data: {
            ...data,
            creatorId: uId
        }
    });
    revalidatePath('/library');
    if (data.categoryId) revalidatePath(`/library?category=${data.categoryId}`);
    return document;
}

export async function moveLibraryDocument(documentId: string, newCategoryId: string | null) {
    await verifyActionPermission('LIBRARY_EDIT');

    const document = await (prisma as any).document.update({
        where: { id: documentId },
        data: { categoryId: newCategoryId }
    });

    revalidatePath('/library');
    revalidatePath(`/library/document/${documentId}`);
    return document;
}
export async function deleteLibraryDocument(id: string) {
    await verifyActionPermission('LIBRARY_DELETE');
    await (prisma as any).document.delete({ where: { id } });
    revalidatePath('/library');
}
export async function getDocumentComments(documentId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');
    return await (prisma as any).documentComment.findMany({
        where: { documentId, parentId: null },
        include: {
            user: { select: { name: true, avatar: true } },
            replies: {
                include: { user: { select: { name: true, avatar: true } } },
                orderBy: { createdAt: 'asc' }
            }
        },
        orderBy: { createdAt: 'asc' }
    });
}
export async function addDocumentComment(documentId: string, content: string, parentId?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');
    const comment = await (prisma as any).documentComment.create({
        data: {
            content,
            documentId,
            userId: session.user.id,
            parentId: parentId || null
        }
    });
    revalidatePath(`/library/document/${documentId}`);
    return comment;
}
export async function getMyDocumentNotes(documentId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');
    return await (prisma as any).documentNote.findMany({
        where: { documentId, userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    });
}
export async function addDocumentNote(documentId: string, content: string, pageNumber?: number, videoTime?: number) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');
    const note = await (prisma as any).documentNote.create({
        data: {
            content,
            documentId,
            userId: session.user.id,
            pageNumber,
            videoTime
        }
    });
    revalidatePath(`/library/document/${documentId}`);
    return note;
}
export async function deleteDocumentNote(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');
    const note = await (prisma as any).documentNote.findUnique({ where: { id } });
    if (!note || note.userId !== session.user.id) throw new Error('Unauthorized');
    await (prisma as any).documentNote.delete({ where: { id } });
    revalidatePath(`/library/document/${note.documentId}`);
}
