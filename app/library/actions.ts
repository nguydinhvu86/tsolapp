'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { verifyActionPermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

// Helper to determine if the user has leadership privileges
export async function getLeadershipStatus() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { isLeadership: false, user: null };
    const user = session.user as any;
    const isLeadership = user.role === 'ADMIN' || user.role === 'MANAGER' || (user.permissions || []).includes('LIBRARY_CONFIDENTIAL');
    return { isLeadership, user };
}

// -- CATEGORY ACTIONS --

export async function getLibraryCategories() {
    const { isLeadership, user } = await getLeadershipStatus();
    if (!user) throw new Error('Unauthorized');

    const categories = await (prisma as any).documentCategory.findMany({
        include: {
            children: true,
            _count: {
                select: { documents: true }
            }
        },
        orderBy: { name: 'asc' }
    });

    if (!isLeadership) {
        // Collect all confidential category IDs and cascade down
        const confidentialIds = new Set<string>();
        for (const cat of categories) {
            if (cat.securityLevel === 'CONFIDENTIAL') {
                confidentialIds.add(cat.id);
            }
        }
        let changed = true;
        while (changed) {
            changed = false;
            for (const cat of categories) {
                if (cat.parentId && confidentialIds.has(cat.parentId) && !confidentialIds.has(cat.id)) {
                    confidentialIds.add(cat.id);
                    changed = true;
                }
            }
        }
        return categories.filter((c: any) => !confidentialIds.has(c.id));
    }

    return categories;
}

export async function createLibraryCategory(data: {
    name: string;
    description?: string;
    parentId?: string;
    securityLevel?: 'PUBLIC' | 'DEPARTMENT' | 'CONFIDENTIAL';
    targetDepartment?: string;
    icon?: string;
    color?: string;
}) {
    const { isLeadership, user } = await getLeadershipStatus();
    if (!user) throw new Error('Unauthorized');

    await verifyActionPermission('LIBRARY_CREATE');

    let effectiveSec = data.securityLevel || 'PUBLIC';
    let effectiveDept = data.targetDepartment || null;

    if (data.parentId) {
        const parent = await (prisma as any).documentCategory.findUnique({ where: { id: data.parentId } });
        if (parent) {
            if (parent.securityLevel === 'CONFIDENTIAL') {
                effectiveSec = 'CONFIDENTIAL';
            } else if (parent.securityLevel === 'DEPARTMENT' && effectiveSec === 'PUBLIC') {
                effectiveSec = 'DEPARTMENT';
                effectiveDept = parent.targetDepartment || effectiveDept;
            }
        }
    }

    if (effectiveSec === 'CONFIDENTIAL' && !isLeadership) {
        throw new Error('Chỉ có cấp Lãnh đạo hoặc Quản trị viên mới được tạo thư mục Mật');
    }

    const category = await (prisma as any).documentCategory.create({
        data: {
            name: data.name.trim(),
            description: data.description?.trim() || null,
            parentId: data.parentId || null,
            securityLevel: effectiveSec,
            targetDepartment: effectiveDept,
            icon: data.icon || null,
            color: data.color || (effectiveSec === 'CONFIDENTIAL' ? 'rose' : effectiveSec === 'DEPARTMENT' ? 'amber' : 'indigo'),
        }
    });

    revalidatePath('/library');
    return category;
}

export async function renameLibraryCategory(id: string, name: string) {
    const { isLeadership, user } = await getLeadershipStatus();
    if (!user) throw new Error('Unauthorized');
    await verifyActionPermission('LIBRARY_EDIT');

    if (!name || !name.trim()) throw new Error('Tên thư mục không được để trống');

    const cat = await (prisma as any).documentCategory.findUnique({ where: { id } });
    if (!cat) throw new Error('Không tìm thấy thư mục');
    if (cat.securityLevel === 'CONFIDENTIAL' && !isLeadership) {
        throw new Error('Chỉ Lãnh đạo mới có quyền đổi tên thư mục Mật');
    }

    const updated = await (prisma as any).documentCategory.update({
        where: { id },
        data: { name: name.trim() }
    });

    revalidatePath('/library');
    return updated;
}

export async function getOrCreateCategoryPath(
    pathSegments: string[],
    rootParentId?: string,
    securityLevel?: 'PUBLIC' | 'DEPARTMENT' | 'CONFIDENTIAL'
) {
    const { isLeadership, user } = await getLeadershipStatus();
    if (!user) throw new Error('Unauthorized');
    await verifyActionPermission('LIBRARY_CREATE');

    let currentParentId = rootParentId || null;

    for (const segment of pathSegments) {
        const trimmed = segment.trim();
        if (!trimmed) continue;

        let folder = await (prisma as any).documentCategory.findFirst({
            where: {
                name: trimmed,
                parentId: currentParentId
            }
        });

        if (!folder) {
            let effectiveSec = securityLevel || 'PUBLIC';
            if (currentParentId) {
                const parentCat = await (prisma as any).documentCategory.findUnique({ where: { id: currentParentId } });
                if (parentCat && parentCat.securityLevel === 'CONFIDENTIAL') {
                    effectiveSec = 'CONFIDENTIAL';
                }
            }

            if (effectiveSec === 'CONFIDENTIAL' && !isLeadership) {
                throw new Error('Không có quyền tạo thư mục Mật');
            }

            folder = await (prisma as any).documentCategory.create({
                data: {
                    name: trimmed,
                    parentId: currentParentId,
                    securityLevel: effectiveSec,
                    color: effectiveSec === 'CONFIDENTIAL' ? 'rose' : 'indigo'
                }
            });
        }

        currentParentId = folder.id;
    }

    revalidatePath('/library');
    return currentParentId;
}

export async function updateCategorySecurity(categoryId: string, data: {
    securityLevel: 'PUBLIC' | 'DEPARTMENT' | 'CONFIDENTIAL';
    targetDepartment?: string;
}) {
    const { isLeadership, user } = await getLeadershipStatus();
    if (!user || !isLeadership) throw new Error('Chỉ Lãnh đạo mới có quyền thay đổi cấp độ bảo mật');

    const category = await (prisma as any).documentCategory.update({
        where: { id: categoryId },
        data: {
            securityLevel: data.securityLevel,
            targetDepartment: data.targetDepartment || null
        }
    });

    revalidatePath('/library');
    return category;
}

export async function deleteLibraryCategory(id: string) {
    const { isLeadership } = await getLeadershipStatus();
    await verifyActionPermission('LIBRARY_DELETE');

    const category = await (prisma as any).documentCategory.findUnique({
        where: { id },
        include: { children: true, _count: { select: { documents: true } } }
    });

    if (!category) throw new Error('Không tìm thấy thư mục');
    if (category.securityLevel === 'CONFIDENTIAL' && !isLeadership) {
        throw new Error('Chỉ Lãnh đạo mới có quyền xóa thư mục Mật');
    }
    if (category.children.length > 0) throw new Error('Không thể xóa thư mục đang có thư mục con. Hãy xóa hoặc di chuyển các thư mục con trước');
    if (category._count.documents > 0) throw new Error('Hãy chuyển hoặc xóa các file trước khi xóa thư mục này');

    await (prisma as any).documentCategory.delete({ where: { id } });
    revalidatePath('/library');
}

// -- DOCUMENT ACTIONS --

export async function getLibraryDocuments(
    categoryId?: string,
    searchQuery?: string,
    filterOptions?: {
        fileType?: string;
        securityLevel?: string;
        isStarred?: boolean;
    }
) {
    const { isLeadership, user } = await getLeadershipStatus();
    if (!user) throw new Error('Unauthorized');

    const whereClause: any = {};

    // Check target category confidentiality
    if (categoryId) {
        const cat = await (prisma as any).documentCategory.findUnique({ where: { id: categoryId } });
        if (cat && cat.securityLevel === 'CONFIDENTIAL' && !isLeadership) {
            throw new Error('Thư mục này được bảo mật. Chỉ cấp Lãnh đạo mới có quyền truy cập');
        }
        whereClause.categoryId = categoryId;
    }

    // Filter out confidential documents if not leadership
    if (!isLeadership) {
        whereClause.securityLevel = { not: 'CONFIDENTIAL' };
        whereClause.OR = [
            { category: null },
            { category: { securityLevel: { not: 'CONFIDENTIAL' } } }
        ];
    }

    if (searchQuery) {
        whereClause.AND = [
            ...(whereClause.AND || []),
            {
                OR: [
                    { title: { contains: searchQuery } },
                    { description: { contains: searchQuery } }
                ]
            }
        ];
    }

    if (filterOptions?.fileType && filterOptions.fileType !== 'ALL') {
        whereClause.fileType = filterOptions.fileType;
    }

    if (filterOptions?.securityLevel && filterOptions.securityLevel !== 'ALL') {
        whereClause.securityLevel = filterOptions.securityLevel;
    }

    if (filterOptions?.isStarred) {
        whereClause.isStarred = true;
    }

    return await (prisma as any).document.findMany({
        where: whereClause,
        include: {
            creator: { select: { name: true, avatar: true, email: true } },
            category: { select: { id: true, name: true, securityLevel: true, color: true } },
            _count: { select: { comments: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function getDocumentById(id: string) {
    const { isLeadership, user } = await getLeadershipStatus();
    if (!user) throw new Error('Unauthorized');

    const doc = await (prisma as any).document.findUnique({
        where: { id },
        include: {
            creator: { select: { name: true, email: true, avatar: true } },
            category: { select: { name: true, id: true, securityLevel: true } }
        }
    });

    if (!doc) return null;

    // Check confidentiality
    const isConfidential = doc.securityLevel === 'CONFIDENTIAL' || doc.category?.securityLevel === 'CONFIDENTIAL';
    if (isConfidential && !isLeadership) {
        throw new Error('Tài liệu Mật. Chỉ cấp Lãnh đạo mới có quyền xem nội dung này');
    }

    // Log access
    try {
        await (prisma as any).documentAccessLog.create({
            data: {
                id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                documentId: id,
                userId: user.id,
                action: 'VIEW'
            }
        });
    } catch {
        // Silently skip log failures
    }

    return doc;
}

export async function createLibraryDocument(data: {
    title: string;
    description?: string;
    fileUrl?: string;
    fileType?: string;
    thumbnail?: string;
    size?: number;
    categoryId?: string;
    securityLevel?: 'INHERIT' | 'PUBLIC' | 'CONFIDENTIAL';
    isDownloadable?: boolean;
    version?: string;
}) {
    const { isLeadership, user } = await getLeadershipStatus();
    if (!user) throw new Error('Unauthorized');
    await verifyActionPermission('LIBRARY_CREATE');

    if (data.securityLevel === 'CONFIDENTIAL' && !isLeadership) {
        throw new Error('Chỉ cấp Lãnh đạo mới có quyền tạo văn bản ở mức Mật');
    }

    const document = await (prisma as any).document.create({
        data: {
            title: data.title,
            description: data.description,
            fileUrl: data.fileUrl,
            fileType: data.fileType,
            thumbnail: data.thumbnail,
            size: data.size,
            categoryId: data.categoryId || null,
            securityLevel: data.securityLevel || 'INHERIT',
            isDownloadable: data.isDownloadable ?? true,
            version: data.version || '1.0',
            creatorId: user.id
        }
    });

    revalidatePath('/library');
    if (data.categoryId) revalidatePath(`/library?category=${data.categoryId}`);
    return document;
}

export async function createBatchLibraryDocuments(items: Array<{
    title: string;
    description?: string;
    fileUrl?: string;
    fileType?: string;
    thumbnail?: string;
    size?: number;
    categoryId?: string;
    securityLevel?: 'INHERIT' | 'PUBLIC' | 'CONFIDENTIAL';
    isDownloadable?: boolean;
    version?: string;
}>) {
    const { isLeadership, user } = await getLeadershipStatus();
    if (!user) throw new Error('Unauthorized');
    await verifyActionPermission('LIBRARY_CREATE');

    const created = [];
    const touchedCategoryIds = new Set<string>();

    for (const data of items) {
        if (data.securityLevel === 'CONFIDENTIAL' && !isLeadership) {
            continue;
        }

        const doc = await (prisma as any).document.create({
            data: {
                title: data.title,
                description: data.description,
                fileUrl: data.fileUrl,
                fileType: data.fileType,
                thumbnail: data.thumbnail,
                size: data.size,
                categoryId: data.categoryId || null,
                securityLevel: data.securityLevel || 'INHERIT',
                isDownloadable: data.isDownloadable ?? true,
                version: data.version || '1.0',
                creatorId: user.id
            }
        });
        created.push(doc);
        if (data.categoryId) touchedCategoryIds.add(data.categoryId);
    }

    revalidatePath('/library');
    touchedCategoryIds.forEach(id => revalidatePath(`/library?category=${id}`));
    return created;
}

export async function toggleStarDocument(documentId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    const doc = await (prisma as any).document.findUnique({
        where: { id: documentId },
        select: { id: true, isStarred: true }
    });

    if (!doc) throw new Error('Không tìm thấy tài liệu');

    const updated = await (prisma as any).document.update({
        where: { id: documentId },
        data: { isStarred: !doc.isStarred }
    });

    revalidatePath('/library');
    return updated;
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
    const { isLeadership } = await getLeadershipStatus();
    await verifyActionPermission('LIBRARY_DELETE');

    const doc = await (prisma as any).document.findUnique({
        where: { id },
        include: { category: true }
    });

    if (doc) {
        const isConfidential = doc.securityLevel === 'CONFIDENTIAL' || doc.category?.securityLevel === 'CONFIDENTIAL';
        if (isConfidential && !isLeadership) {
            throw new Error('Chỉ Lãnh đạo mới có quyền xóa tài liệu Mật này');
        }
    }

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
