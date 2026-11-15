import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';

export interface SystemActivityItem {
    id: string;
    type: 'PHOTO' | 'DOCUMENT' | 'QUOTE' | 'INVOICE' | 'TASK_DONE' | 'LEAD';
    userName: string;
    userAvatar?: string | null;
    actionText: string;
    targetTitle: string;
    targetLink: string;
    requiredPermission?: string;
    timestamp: string;
    extraDetails?: string;
    imageUrl?: string;
}

export interface CompanyAnnouncementItem {
    id: string;
    title: string;
    content: string;
    type: 'GENERAL' | 'POLICY' | 'URGENT' | 'MISSION' | 'EVENT';
    isUrgent: boolean;
    isPinned: boolean;
    authorId?: string | null;
    authorName?: string | null;
    viewsCount: number;
    createdAt: string;
    updatedAt: string;
}

/**
 * Lấy danh sách hoạt động toàn hệ thống mới nhất (Left Column)
 */
export async function getBulletinActivities(): Promise<SystemActivityItem[]> {
    try {
        const [attachments, estimates, quotes, invoices, doneTasks, leads] = await Promise.all([
            prisma.taskAttachment.findMany({
                take: 15,
                orderBy: { createdAt: 'desc' },
                include: {
                    uploadedBy: { select: { id: true, name: true, avatar: true } },
                    task: { select: { id: true, title: true } }
                }
            }).catch(() => []),
            prisma.salesEstimate.findMany({
                take: 15,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: { select: { id: true, name: true, avatar: true } },
                    customer: { select: { name: true } },
                    lead: { select: { name: true } }
                }
            }).catch(() => []),
            prisma.quote.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: { select: { id: true, name: true, avatar: true } },
                    customer: { select: { name: true } }
                }
            }).catch(() => []),
            prisma.salesInvoice.findMany({
                take: 15,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: { select: { id: true, name: true, avatar: true } },
                    customer: { select: { name: true } }
                }
            }).catch(() => []),
            prisma.task.findMany({
                where: { status: 'DONE' },
                take: 15,
                orderBy: { updatedAt: 'desc' },
                include: {
                    assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                    creator: { select: { id: true, name: true, avatar: true } }
                }
            }).catch(() => []),
            prisma.lead.findMany({
                take: 15,
                orderBy: { createdAt: 'desc' },
                include: {
                    assignedTo: { select: { id: true, name: true, avatar: true } },
                    creator: { select: { id: true, name: true, avatar: true } }
                }
            }).catch(() => [])
        ]);

        const activities: SystemActivityItem[] = [];

        // 1. Files & Photos
        for (const a of attachments) {
            const isPhoto = (a.fileType && a.fileType.startsWith('image/')) || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(a.fileName);
            activities.push({
                id: `att_${a.id}`,
                type: isPhoto ? 'PHOTO' : 'DOCUMENT',
                userName: a.uploadedBy?.name || 'Nhân viên',
                userAvatar: a.uploadedBy?.avatar,
                actionText: isPhoto ? 'vừa đăng ảnh mới trong công việc:' : 'vừa tải lên tài liệu mới:',
                targetTitle: a.task ? a.task.title : a.fileName,
                targetLink: a.task ? `/tasks/${a.task.id}` : '#',
                requiredPermission: 'TASKS_VIEW',
                timestamp: a.createdAt.toISOString(),
                extraDetails: a.fileName,
                imageUrl: isPhoto ? a.fileUrl : undefined
            });
        }

        // 2. Sales Estimates
        for (const e of estimates) {
            activities.push({
                id: `est_${e.id}`,
                type: 'QUOTE',
                userName: e.creator?.name || 'Nhân viên',
                userAvatar: e.creator?.avatar,
                actionText: 'vừa tạo báo giá kinh doanh mới:',
                targetTitle: `[${e.code}] ${e.customer?.name || e.lead?.name || 'Khách hàng'}`,
                targetLink: `/sales/estimates/${e.id}`,
                requiredPermission: 'SALES_ESTIMATES_VIEW',
                timestamp: e.createdAt.toISOString(),
                extraDetails: `${(e.totalAmount || 0).toLocaleString('vi-VN')} đ`
            });
        }

        // 3. Quotes
        for (const q of quotes) {
            activities.push({
                id: `quote_${q.id}`,
                type: 'QUOTE',
                userName: q.creator?.name || 'Nhân viên',
                userAvatar: q.creator?.avatar,
                actionText: 'vừa tạo báo giá tiêu chuẩn mới:',
                targetTitle: `${q.title} - ${q.customer?.name || 'Khách hàng'}`,
                targetLink: `/quotes/${q.id}`,
                requiredPermission: 'QUOTES_VIEW',
                timestamp: q.createdAt.toISOString()
            });
        }

        // 4. Invoices
        for (const inv of invoices) {
            activities.push({
                id: `inv_${inv.id}`,
                type: 'INVOICE',
                userName: inv.creator?.name || 'Nhân viên',
                userAvatar: inv.creator?.avatar,
                actionText: 'vừa phát hành hóa đơn bán hàng:',
                targetTitle: `[${inv.code}] ${inv.customer?.name || 'Khách hàng'}`,
                targetLink: `/sales/invoices/${inv.id}`,
                requiredPermission: 'SALES_INVOICES_VIEW',
                timestamp: inv.createdAt.toISOString(),
                extraDetails: `${(inv.totalAmount || 0).toLocaleString('vi-VN')} đ`
            });
        }

        // 5. Done Tasks
        for (const t of doneTasks) {
            const u = t.assignees?.[0]?.user || t.creator;
            activities.push({
                id: `task_${t.id}`,
                type: 'TASK_DONE',
                userName: u?.name || 'Nhân viên',
                userAvatar: u?.avatar,
                actionText: 'vừa hoàn thành công việc:',
                targetTitle: t.title,
                targetLink: `/tasks/${t.id}`,
                requiredPermission: 'TASKS_VIEW',
                timestamp: t.updatedAt.toISOString()
            });
        }

        // 6. Leads
        for (const l of leads) {
            const u = l.assignedTo || l.creator;
            activities.push({
                id: `lead_${l.id}`,
                type: 'LEAD',
                userName: u?.name || 'Nhân viên',
                userAvatar: u?.avatar,
                actionText: 'vừa tiếp nhận cơ hội bán hàng mới:',
                targetTitle: `[${l.code}] ${l.name}${l.company ? ` - ${l.company}` : ''}`,
                targetLink: `/sales/leads/${l.id}`,
                requiredPermission: 'CUSTOMERS_VIEW',
                timestamp: l.createdAt.toISOString()
            });
        }

        // Sắp xếp mới nhất lên đầu
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return activities.slice(0, 60);
    } catch (error) {
        console.error('Error fetching bulletin activities:', error);
        return [];
    }
}

/**
 * Lấy danh sách thông báo chính thức của công ty (Right Column)
 */
export async function getBulletinAnnouncements(): Promise<CompanyAnnouncementItem[]> {
    try {
        const rows: any[] = await prisma.$queryRawUnsafe(`
            SELECT id, title, content, type, isUrgent, isPinned, authorId, authorName, viewsCount, createdAt, updatedAt
            FROM company_announcements
            ORDER BY isUrgent DESC, isPinned DESC, createdAt DESC
            LIMIT 40;
        `);

        return rows.map(r => ({
            id: String(r.id),
            title: String(r.title),
            content: String(r.content),
            type: (r.type || 'GENERAL') as any,
            isUrgent: Boolean(r.isUrgent === 1 || r.isUrgent === true),
            isPinned: Boolean(r.isPinned === 1 || r.isPinned === true),
            authorId: r.authorId ? String(r.authorId) : null,
            authorName: r.authorName ? String(r.authorName) : null,
            viewsCount: Number(r.viewsCount || 0),
            createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
            updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt)
        }));
    } catch (error) {
        console.error('Error fetching bulletin announcements:', error);
        return [];
    }
}

/**
 * Thêm thông báo mới (Chỉ Admin / Manager)
 */
export async function createCompanyAnnouncement(data: {
    title: string;
    content: string;
    type?: string;
    isUrgent?: boolean;
    isPinned?: boolean;
}): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: 'Chưa đăng nhập' };
        }

        const isAdminOrManager = session.user.role === 'ADMIN' || session.user.role === 'MANAGER';
        if (!isAdminOrManager) {
            return { success: false, error: 'Chỉ Quản trị viên hoặc Trưởng phòng mới có quyền đăng thông báo công ty' };
        }

        if (!data.title?.trim() || !data.content?.trim()) {
            return { success: false, error: 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo' };
        }

        const id = 'ann_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        const type = data.type || (data.isUrgent ? 'URGENT' : 'GENERAL');
        const isUrgentVal = data.isUrgent ? 1 : 0;
        const isPinnedVal = data.isPinned ? 1 : (data.isUrgent ? 1 : 0);
        const authorId = session.user.id;
        const authorName = session.user.name || 'Ban Quản Trị';
        const now = new Date().toISOString();

        await prisma.$executeRawUnsafe(
            `INSERT INTO company_announcements (id, title, content, type, isUrgent, isPinned, authorId, authorName, viewsCount, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
            id, data.title.trim(), data.content.trim(), type, isUrgentVal, isPinnedVal, authorId, authorName, now, now
        );

        revalidatePath('/dashboard');
        return { 
            success: true, 
            data: { 
                id, 
                title: data.title.trim(), 
                content: data.content.trim(), 
                type, 
                isUrgent: Boolean(isUrgentVal), 
                isPinned: Boolean(isPinnedVal), 
                authorName, 
                createdAt: now 
            } 
        };
    } catch (error: any) {
        console.error('Error creating company announcement:', error);
        return { success: false, error: error.message || 'Lỗi hệ thống khi đăng thông báo' };
    }
}

/**
 * Xóa thông báo (Chỉ Admin)
 */
export async function deleteCompanyAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: 'Chưa đăng nhập' };

        const isAdmin = session.user.role === 'ADMIN';
        if (!isAdmin) return { success: false, error: 'Chỉ Quản trị viên cấp cao mới có quyền xóa thông báo' };

        await prisma.$executeRawUnsafe(`DELETE FROM company_announcements WHERE id = ?`, id);
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting company announcement:', error);
        return { success: false, error: error.message || 'Lỗi khi xóa thông báo' };
    }
}
