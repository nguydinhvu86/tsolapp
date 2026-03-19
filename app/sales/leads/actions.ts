'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/authOptions";
import { sendEmailWithTracking } from '@/lib/mailer';
import { sendWebPushNotification } from '@/lib/notifications/webPush';

// 1. Get List of Leads
export async function getLeads(employeeId?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Unauthorized');

    const isAdminOrManager = session.user.role === 'ADMIN' || session.user.role === 'MANAGER';
    let effectiveEmployeeId: string | undefined = undefined;

    if (!isAdminOrManager) {
        effectiveEmployeeId = session.user.id;
    } else if (employeeId) {
        effectiveEmployeeId = employeeId;
    }

    const whereClause = effectiveEmployeeId ? {
        OR: [
            { creatorId: effectiveEmployeeId },
            { assignedToId: effectiveEmployeeId },
            { assignees: { some: { userId: effectiveEmployeeId } } }
        ]
    } : {};

    try {
        const leads = await prisma.lead.findMany({
            where: whereClause,
            include: {
                assignedTo: { select: { id: true, name: true, avatar: true } },
                assignees: { include: { user: { select: { name: true, avatar: true } } } } as any,
                customer: { select: { id: true, name: true, email: true, phone: true } }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        return leads;
    } catch (error) {
        console.error('Error fetching leads:', error);
        throw new Error('Không thể tải dữ liệu Cơ hội bán hàng');
    }
}

// 2. Get Single Lead by ID
export async function getLeadById(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    const isAdminOrManager = session.user.role === 'ADMIN' || session.user.role === 'MANAGER';
    const authFilter = !isAdminOrManager ? {
        OR: [
            { creatorId: session.user.id },
            { assignedToId: session.user.id },
            { assignees: { some: { userId: session.user.id } } }
        ]
    } : {};

    try {
        const lead = await prisma.lead.findFirst({
            where: { id, ...authFilter },
            include: {
                assignedTo: { select: { id: true, name: true, avatar: true } },
                assignees: { include: { user: { select: { name: true, avatar: true } } } } as any,
                customer: { select: { id: true, name: true, phone: true, email: true } },
                activityLogs: {
                    include: {
                        user: { select: { id: true, name: true, avatar: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                leadNotes: {
                    include: {
                        user: { select: { id: true, name: true, avatar: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                tasks: {
                    include: {
                        assignees: {
                            include: { user: { select: { name: true, avatar: true } } }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                salesEstimates: {
                    include: {
                        creator: { select: { name: true, avatar: true } }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                comments: {
                    include: {
                        user: { select: { id: true, name: true, avatar: true, email: true } },
                        reactions: { include: { user: { select: { id: true, name: true, email: true } } } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                EmailLog: {
                    include: { sender: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!lead) throw new Error('Lead not found');

        return lead;
    } catch (error: any) {
        console.error('Error fetching lead details:', error);
        throw new Error(error.message || 'Không thể tải chi tiết Cơ hội bán hàng');
    }
}

// 3. Create Lead
export async function createLead(data: {
    name: string;
    company?: string | null;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    customerId?: string | null;
    source?: string | null;
    status: string;
    estimatedValue?: number | null;
    expectedCloseDate?: Date | null;
    notes?: string | null;
    assignedToId?: string | null;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    if (data.email) data.email = data.email.trim();
    if (!data.email) data.email = null;

    try {
        // Generate a code LEAD-YYYYMM-001
        const date = new Date();
        const yy = String(date.getFullYear()).slice(2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const prefix = `LEAD-${yy}${mm}-`;

        // Run in transaction to get safe code
        const result = await prisma.$transaction(async (tx) => {
            const lastLead = await tx.lead.findFirst({
                where: { code: { startsWith: prefix } },
                orderBy: { code: 'desc' }
            });

            let nextSequence = '0001';
            if (lastLead && lastLead.code) {
                const parts = lastLead.code.split('-');
                if (parts.length === 3) {
                    const lastNumber = parseInt(parts[2], 10);
                    if (!isNaN(lastNumber)) {
                        nextSequence = String(lastNumber + 1).padStart(4, '0');
                    }
                }
            }
            const finalCode = `${prefix}${nextSequence}`;

            let sourceId: string | null = null;
            if (data.source && data.source.trim() !== '') {
                const sourceName = data.source.trim();
                const leadSource = await tx.leadSource.upsert({
                    where: { name: sourceName },
                    update: {},
                    create: { name: sourceName }
                });
                sourceId = leadSource.id;
            }

            const newLead = await tx.lead.create({
                data: {
                    code: finalCode,
                    name: data.name,
                    company: data.company,
                    contactName: data.contactName,
                    email: data.email,
                    phone: data.phone,
                    customerId: data.customerId,
                    source: data.source, // Keep text version for backward compatibility
                    sourceId: sourceId,
                    status: data.status,
                    estimatedValue: data.estimatedValue,
                    expectedCloseDate: data.expectedCloseDate,
                    notes: data.notes,
                    assignedToId: data.assignedToId || session.user.id,
                }
            });

            // Tao LeadAssignee ban dau
            if (newLead.assignedToId) {
                await tx.leadAssignee.create({
                    data: {
                        leadId: newLead.id,
                        userId: newLead.assignedToId
                    }
                });
            }

            // Tao Activity Log
            await tx.leadActivityLog.create({
                data: {
                    leadId: newLead.id,
                    userId: session.user.id,
                    action: "TẠO_MỚI",
                    details: `Tạo cơ hội bán hàng mới: ${newLead.code}`
                }
            });

            return newLead;
        });

        // Send push notification to assigned user
        if (result.assignedToId && result.assignedToId !== session.user.id) {
            sendWebPushNotification(result.assignedToId, {
                title: 'Cơ hội bán hàng mới được giao',
                body: `Bạn vừa được giao quản lý cơ hội: ${result.name}`,
                url: `/sales/leads/${result.id}`
            });
        }

        return result;
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            throw new Error(`Cảnh báo: Email "${data.email}" đã tồn tại trong hệ thống.`);
        }
        console.error('Error creating lead:', error);
        throw new Error('Không thể tạo Cơ hội bán hàng');
    }
}

// 4. Update Lead
export async function updateLead(id: string, data: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    if (data.email) data.email = data.email.trim();
    if (!data.email) data.email = null;

    try {
        let sourceId: string | null = null;
        if (data.source && data.source.trim() !== '') {
            const sourceName = data.source.trim();
            const leadSource = await prisma.leadSource.upsert({
                where: { name: sourceName },
                update: {},
                create: { name: sourceName }
            });
            sourceId = leadSource.id;
        }

        const lead = await prisma.lead.update({
            where: { id },
            data: {
                name: data.name,
                company: data.company,
                contactName: data.contactName,
                email: data.email,
                phone: data.phone,
                customerId: data.customerId,
                source: data.source, // Keep text version
                sourceId: sourceId,
                estimatedValue: data.estimatedValue,
                expectedCloseDate: data.expectedCloseDate,
                notes: data.notes,
                assignedToId: data.assignedToId,
            }
        });

        // Log
        await prisma.leadActivityLog.create({
            data: {
                leadId: id,
                userId: session.user.id,
                action: "CẬP_NHẬT_THÔNG_TIN",
                details: "Cập nhật thông tin chung của Cơ hội bán hàng."
            }
        });

        return lead;
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            throw new Error(`Cảnh báo: Email "${data.email}" đã tồn tại trong hệ thống.`);
        }
        console.error('Error updating lead:', error);
        throw new Error('Không thể cập nhật Cơ hội bán hàng');
    }
}

// 5. Update Status (Kanban Drop)
export async function updateLeadStatus(id: string, status: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');
    const userId = session.user.id;

    try {
        const oldLead = await prisma.lead.findUnique({
            where: { id },
            include: {
                assignees: true,
                assignedTo: true
            }
        });

        const lead = await prisma.lead.update({
            where: { id },
            data: { status }
        });

        await prisma.leadActivityLog.create({
            data: {
                leadId: id,
                userId: session.user.id,
                action: "CHUYỂN_TRẠNG_THÁI",
                details: `Đổi trạng thái từ ${oldLead?.status} sang ${status}`
            }
        });

        // --- NOTIFICATION & EMAIL LOGIC ---
        if (oldLead && oldLead.status !== status) {
            const statusMap: Record<string, string> = {
                'NEW': 'Mới',
                'CONTACTING': 'Đang liên hệ',
                'EVALUATION': 'Đang đánh giá',
                'NEGOTIATION': 'Đang đàm phán',
                'CLOSED_WON': 'Thành công',
                'CLOSED_LOST': 'Thất bại'
            };
            const statusText = statusMap[status] || status;
            const oldStatusText = statusMap[oldLead.status] || oldLead.status;

            const creator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

            // Identify people to notify: assignedTo and all assignees
            const usersToNotify = new Set<string>();
            if (oldLead.assignedToId && oldLead.assignedToId !== userId) {
                usersToNotify.add(oldLead.assignedToId);
            }
            if (oldLead.assignees) {
                oldLead.assignees.forEach((a: any) => { if (a.userId !== userId) usersToNotify.add(a.userId); });
            }

            if (usersToNotify.size > 0) {
                const { createManyNotifications } = await import('@/app/notifications/actions');

                // 1. Create In-App Notifications
                const notifications = Array.from(usersToNotify).map(uId => ({
                    userId: uId,
                    title: 'Trạng thái cơ hội bán hàng thay đổi',
                    message: `${creator?.name || 'Ai đó'} đã chuyển trạng thái cơ hội "${oldLead.name}" từ [${oldStatusText}] sang [${statusText}].`,
                    type: 'INFO',
                    link: `/sales/leads/${id}`
                }));
                await createManyNotifications(notifications);

                // Send Push Notifications
                usersToNotify.forEach(uId => {
                    sendWebPushNotification(uId, {
                        title: 'Tình trạng Lead thay đổi',
                        body: `Lead "${oldLead.name}" đã sang trạng thái: ${statusText}`,
                        url: `/sales/leads/${id}`
                    });
                });

                // 2. Send Emails
                const { getTemplatesByModule } = await import('@/app/email-templates/actions');
                const templates = await getTemplatesByModule('LEAD');
                let template = templates[0];
                const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

                const users = await prisma.user.findMany({ where: { id: { in: Array.from(usersToNotify) } } });

                for (const u of users) {
                    if (!u.email) continue;
                    let subject = `Cập nhật trạng thái Cơ hội bán hàng: ${oldLead.name}`;
                    let htmlBody = `<p>Cơ hội bán hàng <strong>${oldLead.name}</strong> vừa được chuyển trạng thái sang: <strong>${statusText}</strong>.</p>
            <p>Người thực hiện: ${creator?.name || 'Hệ thống'}</p>
            <p><a href="${baseUrl}/sales/leads/${id}">Xem chi tiết cơ hội</a></p>`;

                    if (template) {
                        subject = template.subject || subject;
                        htmlBody = template.body || htmlBody;

                        const variables: Record<string, string> = {
                            '{{leadName}}': oldLead.name,
                            '{{leadCode}}': oldLead.code,
                            '{{company}}': oldLead.company || 'Không có',
                            '{{estimatedValue}}': oldLead.estimatedValue ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(oldLead.estimatedValue) : '0 ₫',
                            '{{expectedCloseDate}}': oldLead.expectedCloseDate ? new Date(oldLead.expectedCloseDate).toLocaleDateString('vi-VN') : 'Không có',
                            '{{assignerName}}': creator?.name || 'Hệ thống',
                            '{{assigneeName}}': u.name || u.email || 'Bạn',
                            '{{link}}': `${baseUrl}/sales/leads/${id}`
                        };

                        for (const [key, value] of Object.entries(variables)) {
                            const regexKey = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                            subject = subject.replace(new RegExp(regexKey, 'g'), value);
                            htmlBody = htmlBody.replace(new RegExp(regexKey, 'g'), value);
                        }
                    }

                    await sendEmailWithTracking({
                        to: u.email, subject, htmlBody, senderId: userId
                    });
                }
            }
        }
        // ----------------------------------

        return lead;
    } catch (error) {
        console.error('Error updating lead status:', error);
        throw new Error('Không thể cập nhật trạng thái Cơ hội bán hàng');
    }
}

// 5.5 Update Assignees
export async function updateLeadAssignees(id: string, assigneeIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Xóa hết assignees cũ
            await tx.leadAssignee.deleteMany({
                where: { leadId: id }
            });

            // Thêm mới list assignees
            if (assigneeIds && assigneeIds.length > 0) {
                await tx.leadAssignee.createMany({
                    data: assigneeIds.map(userId => ({
                        leadId: id,
                        userId
                    }))
                });
            }

            // Lấy id của người đầu tiên làm assignedToId chính (để backwards compat và hiển thị chính)
            const mainAssignedToId = assigneeIds.length > 0 ? assigneeIds[0] : null;

            const updatedLead = await tx.lead.update({
                where: { id },
                data: { assignedToId: mainAssignedToId },
                include: { assignees: { include: { user: { select: { name: true } } } } } as any
            });

            const assigneeNames = (updatedLead as any).assignees.map((a: any) => a.user.name).join(', ');

            await tx.leadActivityLog.create({
                data: {
                    leadId: id,
                    userId: session.user.id,
                    action: "CẬP_NHẬT_PHỤ_TRÁCH",
                    details: assigneeIds.length > 0
                        ? `Đã cập nhật người phụ trách: ${assigneeNames}`
                        : "Đã xóa toàn bộ người phụ trách"
                }
            });

            return updatedLead;
        });

        if (assigneeIds && assigneeIds.length > 0) {
            await notifyLeadStakeholders(id, session.user.id, 'đã thay đổi người phụ trách', session.user.name || 'Ai đó');
        }

        return result;
    } catch (error) {
        console.error('Error updating lead assignees:', error);
        throw new Error('Không thể cập nhật người phụ trách');
    }
}

// 6. Delete Lead
export async function deleteLead(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        await prisma.lead.delete({
            where: { id }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting lead:', error);
        throw new Error('Không thể xóa Cơ hội bán hàng');
    }
}

// 7. Convert Lead to Customer
export async function convertLeadToCustomer(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        const lead = await prisma.lead.findUnique({
            where: { id }
        });

        if (!lead) throw new Error('Lead not found');

        // Check if already connected to a customer
        if (lead.customerId) {
            throw new Error('Cơ hội này đã được liên kết với một Khách Hàng hiện tại.');
        }

        // DUPLICATE CHECK
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                OR: [
                    { phone: lead.phone && lead.phone !== '' ? lead.phone : undefined },
                    { email: lead.email && lead.email !== '' ? lead.email : undefined }
                ].filter(Boolean) as any
            }
        });

        if (existingCustomer) {
            return {
                success: false,
                duplicate: true,
                existingCustomer: existingCustomer,
                message: `Đã tồn tại khách hàng ${existingCustomer.name} có số điện thoại/email này.`
            };
        }

        // CREATE NEW CUSTOMER
        const result = await prisma.$transaction(async (tx) => {
            const newCustomer = await tx.customer.create({
                data: {
                    name: lead.company || lead.contactName || lead.name,
                    email: lead.email,
                    phone: lead.phone,
                }
            });

            // Update lead with new customer id
            const updatedLead = await tx.lead.update({
                where: { id },
                data: {
                    customerId: newCustomer.id,
                    status: 'WON' // Usually convert = won 
                }
            });

            // Add logs
            await tx.leadActivityLog.create({
                data: {
                    leadId: id,
                    userId: session.user.id,
                    action: "CHUYỂN_ĐỔI",
                    details: `Đã chuyển đổi thành Khách Hàng mới: ${newCustomer.name}`
                }
            });

            return { success: true, customer: newCustomer, lead: updatedLead };
        });

        return result;

    } catch (error: any) {
        console.error('Error converting lead:', error);
        throw new Error(error.message || 'Không thể chuyển đổi Khách Hàng');
    }
}

// 8. Connect Lead to Existing Customer
export async function connectLeadToExistingCustomer(leadId: string, customerId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) throw new Error("Khách hàng không tồn tại");

        const lead = await prisma.lead.update({
            where: { id: leadId },
            data: {
                customerId: customerId,
                status: 'WON' // Or assume it's just connected, but status update is explicit. 
                // We'll set it to WON as this is usually the flow of "Convert"
            }
        });

        await prisma.leadActivityLog.create({
            data: {
                leadId: leadId,
                userId: session.user.id,
                action: "LIÊN_KẾT",
                details: `Đã liên kết cơ hội này vào khách hàng cũ: ${customer.name}`
            }
        });

        return { success: true, lead, customer };
    } catch (err) {
        console.error('Error connecting lead:', err);
        throw new Error('Không thể liên kết Khách Hàng');
    }
}

// 9. Add Note or Link to Activity Log
export async function addLeadActivityLog(leadId: string, action: string, details: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

    try {
        const log = await prisma.leadActivityLog.create({
            data: {
                leadId,
                userId: session.user.id,
                action,
                details
            },
            include: { user: { select: { name: true, avatar: true } } }
        });
        return { success: true, log };
    } catch (error) {
        console.error('Error adding lead activity log:', error);
        return { success: false, error: 'Không thể thêm hoạt động' };
    }
}

export async function sendLeadEmail(leadId: string, to: string, subject: string, htmlBody: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { customer: true, assignedTo: true }
        });

        if (!lead) {
            return { success: false, error: "Không tìm thấy cơ hội." };
        }

        const res = await sendEmailWithTracking({
            to,
            subject,
            htmlBody,
            senderId: session.user.id,
            customerId: lead.customerId ?? undefined
        });

        if (res.success) {
            await prisma.leadActivityLog.create({
                data: {
                    leadId,
                    userId: session.user.id,
                    action: "GỬI_EMAIL",
                    details: `Đã gửi Email cho Lead hoặc Assignee tới ${to}`
                }
            });
        }

        return res;
    } catch (error: any) {
        console.error("Lỗi khi gửi email cơ hội bán hàng:", error);
        return { success: false, error: error.message };
    }
}

export async function notifyLeadStakeholders(
    leadId: string,
    actionUserId: string,
    actionName: string,
    actionUserName: string
) {
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { assignees: true }
    });
    if (!lead) return;

    const usersToNotify = new Set<string>();
    if (lead.assignedToId && lead.assignedToId !== actionUserId) usersToNotify.add(lead.assignedToId);
    if (lead.creatorId && lead.creatorId !== actionUserId) usersToNotify.add(lead.creatorId);
    if (lead.assignees) {
        lead.assignees.forEach(a => { if (a.userId !== actionUserId) usersToNotify.add(a.userId); });
    }

    if (usersToNotify.size > 0) {
        const title = 'Cập nhật Cơ hội bán hàng';
        const message = `${actionUserName} ${actionName} trong cơ hội "${lead.name}".`;
        const url = `/sales/leads/${leadId}`;

        const { createManyNotifications } = await import('@/app/notifications/actions');
        const notifications = Array.from(usersToNotify).map(uId => ({
            userId: uId,
            title,
            message,
            type: 'INFO',
            link: url
        }));
        await createManyNotifications(notifications);

        const { sendWebPushNotification } = await import('@/lib/notifications/webPush');
        Array.from(usersToNotify).forEach(uId => {
            sendWebPushNotification(uId, {
                title,
                body: message,
                url
            });
        });

        // 3. Send Email Notifications
        const { sendEmailWithTracking } = await import('@/lib/mailer');
        const users = await prisma.user.findMany({
            where: { id: { in: Array.from(usersToNotify) } },
            select: { id: true, email: true, name: true }
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://inside.tsol.vn';
        const absoluteUrl = `${appUrl}${url}`;

        const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-bottom: 20px;">Thông báo từ hệ thống ERP</h2>
            <p style="font-size: 16px;">Chào bạn,</p>
            <p style="font-size: 16px;">${message}</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${absoluteUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Xem chi tiết Cơ hội bán hàng
                </a>
            </div>
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 30px 0;">
            <p style="font-size: 13px; color: #888;">Đây là email tự động, vui lòng không trả lời.</p>
        </div>
        `;

        Promise.allSettled(users.map(user => {
            if (user.email) {
                return sendEmailWithTracking({
                    to: user.email,
                    subject: 'ERP Notification: ' + title,
                    htmlBody,
                    senderId: actionUserId,
                    leadId: leadId
                });
            }
            return Promise.resolve();
        })).catch(err => console.error("Error dispatching Lead Notification emails:", err));
    }
}

export async function createLeadNote(leadId: string, content: string, attachment?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        const userId = session.user.id;

        const note = await prisma.leadNote.create({
            data: {
                leadId,
                userId,
                content,
                attachment
            },
            include: {
                user: { select: { name: true, avatar: true } }
            }
        });

        const hasText = content.trim().length > 0;
        const hasFiles = attachment ? true : false;
        let actionText = 'NOTE_ADDED';
        if (hasFiles && !hasText) actionText = 'FILE_UPLOADED';
        if (hasFiles && hasText) actionText = 'NOTE_AND_FILE_ADDED';

        let finalDetails = hasText ? (hasFiles ? `${content.trim()}\n\nĐính kèm: ${attachment}` : content.trim()) : `Đã tải lên tệp: ${attachment}`;

        await prisma.leadActivityLog.create({
            data: {
                leadId,
                userId,
                action: actionText,
                details: finalDetails
            }
        });

        let actionMsg = 'đã thêm ghi chú mới';
        if (hasFiles && !hasText) actionMsg = 'đã tải lên tài liệu mới';
        if (hasFiles && hasText) actionMsg = 'đã thêm ghi chú và tài liệu mới';
        await notifyLeadStakeholders(leadId, userId, actionMsg, session.user.name || 'Ai đó');

        // revalidatePath in Next14 to refresh the lead detail page
        const { revalidatePath } = require('next/cache');
        revalidatePath(`/sales/leads/${leadId}`);
        return { success: true, data: note };
    } catch (error: any) {
        console.error("Lỗi khi thêm ghi chú cơ hội:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteLeadNote(noteId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        const userId = session.user.id;

        const note = await prisma.leadNote.findUnique({ where: { id: noteId } });
        if (!note) return { success: false, error: "Không tìm thấy ghi chú" };

        if (note.userId !== userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user?.role !== 'ADMIN') {
                return { success: false, error: "Bạn không có quyền xóa ghi chú này" };
            }
        }

        await prisma.leadNote.delete({ where: { id: noteId } });

        const { revalidatePath } = require('next/cache');
        revalidatePath(`/sales/leads/${note.leadId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Lỗi khi xóa ghi chú cơ hội:", error);
        return { success: false, error: error.message };
    }
}
