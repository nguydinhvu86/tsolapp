'use server';
import { formatDate } from '@/lib/utils/formatters';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendEmailWithTracking } from '@/lib/mailer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function getTasks(filters?: any) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const isAdmin = session?.user?.role === 'ADMIN';

    let whereClause: any = {};

    // Base Privacy Filter
    if (!isAdmin && userId) {
        whereClause = {
            OR: [
                { isPublic: true },
                { creatorId: userId },
                { assignees: { some: { userId: userId } } },
                { observers: { some: { userId: userId } } }
            ]
        };
    }

    // Optionally apply filters in future iterations
    const tasks = await (prisma.task as any).findMany({
        where: whereClause,
        include: {
            creator: true,
            assignees: { include: { user: true } },
            observers: { include: { user: true } },
            checklists: { include: { completedBy: true } },
            comments: { include: { user: true } },
            customer: true,
            contract: true,
            quote: true,
            handover: true,
            paymentReq: true,
            dispatch: true,
            appendix: true,
            supplier: true,
            expense: true,
            purchaseOrder: true,
            purchaseBill: true,
            purchasePayment: true,
            lead: true,
            salesOrder: true,
            salesInvoice: true,
            salesEstimate: true,
            salesPayment: true,
            activityLogs: { include: { user: true } },
            parentTask: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    return tasks;
}

// Helper to add frequency to date
const addFrequency = (date: Date, freq: string, step: number) => {
    const d = new Date(date);
    switch (freq) {
        case 'DAILY': d.setDate(d.getDate() + step); break;
        case 'MONTHLY': d.setMonth(d.getMonth() + step); break;
        case 'QUARTERLY': d.setMonth(d.getMonth() + 3 * step); break; // 3 months
        case 'BIANNUALLY': d.setMonth(d.getMonth() + 6 * step); break; // 6 months
        case 'YEARLY': d.setFullYear(d.getFullYear() + step); break; // 1 year
    }
    return d;
};

export async function createTask(data: any, creatorId: string) {
    const { assignees, observers, recurrence, ...restData } = data;

    const isRecurringMode = recurrence && recurrence.isRecurring && recurrence.count > 1;
    const taskCount = isRecurringMode ? recurrence.count : 1;
    const frequency = isRecurringMode ? recurrence.frequency : null;
    let baseDueDate = restData.dueDate ? new Date(restData.dueDate) : null;

    const createdTasks: any[] = [];
    let firstTaskId: string | null = null;

    for (let i = 0; i < taskCount; i++) {
        let currentDueDate = baseDueDate;
        if (isRecurringMode && baseDueDate && i > 0) {
            currentDueDate = addFrequency(baseDueDate, frequency, i);
        }

        // Add suffix to title if recurring
        const titleSuffix = isRecurringMode ? ` (Lần ${i + 1}/${taskCount})` : '';

        // Create base task
        const newTask: any = await (prisma.task as any).create({
            data: {
                ...restData,
                title: restData.title + titleSuffix,
                dueDate: currentDueDate,
                isRecurring: isRecurringMode,
                recurrenceRule: frequency,
                creatorId,
                parentTaskId: isRecurringMode ? (i > 0 ? firstTaskId : null) : restData.parentTaskId
            }
        });

        if (i === 0) {
            firstTaskId = newTask.id;
        }

        // Handle Assignees
        if (assignees && assignees.length > 0) {
            await prisma.taskAssignee.createMany({
                data: assignees.map((userId: string) => ({ taskId: newTask.id, userId }))
            });
        }

        // Handle Observers (including the creator by default)
        const observerSet = new Set<string>();
        observerSet.add(creatorId);
        if (observers) observers.forEach((id: string) => observerSet.add(id));

        await prisma.taskObserver.createMany({
            data: Array.from(observerSet).map((userId: string) => ({ taskId: newTask.id, userId }))
        });

        logActivity(newTask.id, creatorId, 'CREATED_TASK', isRecurringMode ? 'Tạo tự động theo chu kỳ' : undefined);

        createdTasks.push(newTask);
    }

    // Notify Assignees (only once per assignee, for the first task or in general)
    if (assignees && assignees.length > 0 && createdTasks.length > 0) {
        const firstTask = createdTasks[0];
        const creator = await prisma.user.findUnique({ where: { id: creatorId }, select: { name: true } });

        const assigneeIdsToNotify = assignees.filter((userId: string) => userId !== creatorId);
        const notifications = assigneeIdsToNotify.map((userId: string) => ({
            userId,
            title: 'Công việc mới được giao',
            message: `${creator?.name || 'Ai đó'} đã giao cho bạn ${isRecurringMode ? taskCount + ' công việc định kỳ' : 'một công việc'}: "${firstTask.title}".`,
            type: 'INFO',
            link: `/tasks/${firstTask.id}`
        }));

        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }

        // Auto send emails
        await triggerAutoTaskEmail(firstTask.id, assigneeIdsToNotify, creatorId);
    }

    revalidatePath('/tasks');
    return createdTasks[0]; // Return the first created task
}

export async function triggerAutoTaskEmail(taskId: string, newAssigneeIds: string[], creatorId: string) {
    if (!newAssigneeIds || newAssigneeIds.length === 0) return;

    try {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { creator: true }
        });
        if (!task) return;

        const assigneesUsers = await prisma.user.findMany({
            where: { id: { in: newAssigneeIds } }
        });

        // Import inside to avoid circular deps if any
        const { getTemplatesByModule } = await import('@/app/email-templates/actions');
        const templates = await getTemplatesByModule('TASK');
        let template = templates[0];

        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        for (const assignee of assigneesUsers) {
            if (!assignee.email) continue;

            let subject = `Công việc mới: ${task.title}`;
            let htmlBody = `<p>Bạn vừa được giao một công việc mới: <strong>${task.title}</strong></p>
    <p>Bởi: ${task.creator?.name || 'Hệ thống'}</p>
    <p><a href="${baseUrl}/tasks/${task.id}">Xem công việc</a></p>`;

            if (template) {
                subject = template.subject || subject;
                htmlBody = template.body || htmlBody;

                const variables: Record<string, string> = {
                    '{{taskTitle}}': task.title,
                    '{{taskDescription}}': task.description || 'Không có mô tả',
                    '{{dueDate}}': task.dueDate ? formatDate(new Date(task.dueDate)) : 'Không có hạn chót',
                    '{{priority}}': task.priority === 'URGENT' ? 'Khẩn cấp' : task.priority === 'HIGH' ? 'Cao' : task.priority === 'MEDIUM' ? 'Trung bình' : 'Thấp',
                    '{{assignerName}}': task.creator?.name || task.creator?.email || 'Hệ thống',
                    '{{assigneeName}}': assignee.name || assignee.email || 'Bạn',
                    '{{link}}': `${baseUrl}/tasks/${task.id}`
                };

                for (const [key, value] of Object.entries(variables)) {
                    // escape regex so we replace all
                    const regexKey = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                    subject = subject.replace(new RegExp(regexKey, 'g'), value);
                    htmlBody = htmlBody.replace(new RegExp(regexKey, 'g'), value);
                }
            }

            await sendEmailWithTracking({
                to: assignee.email,
                subject,
                htmlBody,
                senderId: creatorId
            });
        }
    } catch (err: any) {
        console.error("Auto email error:", err);
    }
}


export async function updateTask(id: string, data: any, userId: string) {
    const { assignees, observers, recurrence, ...restData } = data;

    const oldTask = await prisma.task.findUnique({
        where: { id },
        include: { assignees: true, observers: true }
    });

    const changes = [];
    if (oldTask) {
        if (restData.title && oldTask.title !== restData.title) changes.push(`Tên: "${oldTask.title}" -> "${restData.title}"`);
        if ('description' in restData && oldTask.description !== restData.description) changes.push(`Mô tả bị thay đổi`);
        if (restData.priority && oldTask.priority !== restData.priority) changes.push(`Mức độ: ${oldTask.priority} -> ${restData.priority}`);
        if ('dueDate' in restData) {
            const oldDate = oldTask.dueDate ? oldTask.dueDate.toISOString().split('T')[0] : 'None';
            const newDate = restData.dueDate ? new Date(restData.dueDate).toISOString().split('T')[0] : 'None';
            if (oldDate !== newDate) changes.push(`Hạn chót: ${oldDate} -> ${newDate}`);
        }
        if (assignees) {
            const oldAssignedIds = oldTask.assignees.map((a: any) => a.userId).sort().join(',');
            const newAssignedIds = [...assignees].sort().join(',');
            if (oldAssignedIds !== newAssignedIds) changes.push('Cập nhật Người phụ trách');
        }
        if (observers) {
            const oldObserverIds = oldTask.observers.map((o: any) => o.userId).sort().join(',');
            const newObserverIds = [...observers].sort().join(',');
            if (oldObserverIds !== newObserverIds) changes.push('Cập nhật Người theo dõi');
        }

        // Recurrence changes
        if (recurrence && recurrence.isRecurring && !oldTask.isRecurring) {
            changes.push('Bật lặp lại định kỳ');
        } else if (recurrence && !recurrence.isRecurring && oldTask.isRecurring) {
            changes.push('Tắt lặp lại định kỳ');
        }
    }

    // Process Recurrence Toggle Off
    if (oldTask && oldTask.isRecurring && recurrence && !recurrence.isRecurring) {
        // Find and delete future incomplete child tasks generated from this parent
        await (prisma.task as any).deleteMany({
            where: {
                parentTaskId: id,
                status: { not: 'DONE' }
            }
        });

        // Remove tracking fields on the current task
        restData.isRecurring = false;
        restData.recurrenceRule = null;
        restData.parentTaskId = null; // Unlink if it was a child itself
    }
    // Process Recurrence Toggle On
    else if (oldTask && !oldTask.isRecurring && recurrence && recurrence.isRecurring) {
        restData.isRecurring = true;
        restData.recurrenceRule = recurrence.frequency;
    }

    // Update base fields
    const updated = await prisma.task.update({
        where: { id },
        data: restData
    });

    let newAssigneesToNotify: string[] = [];
    if (assignees && oldTask) {
        const oldAssignedIds = oldTask.assignees.map((a: any) => a.userId);
        newAssigneesToNotify = assignees.filter((aId: string) => !oldAssignedIds.includes(aId) && aId !== userId);
    }

    // Re-sync Assignees if provided
    if (assignees) {
        await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
        await prisma.taskAssignee.createMany({
            data: assignees.map((uId: string) => ({ taskId: id, userId: uId }))
        });
    }

    // Re-sync Observers if provided
    if (observers) {
        await prisma.taskObserver.deleteMany({ where: { taskId: id } });
        await prisma.taskObserver.createMany({
            data: observers.map((uId: string) => ({ taskId: id, userId: uId }))
        });
    }

    // Process Recurrence Toggle On -> generate child tasks (only after update succeeds)
    if (oldTask && !oldTask.isRecurring && recurrence && recurrence.isRecurring) {
        const taskCount = recurrence.count || 1;
        const frequency = recurrence.frequency;
        const baseDueDate = restData.dueDate ? new Date(restData.dueDate) : (oldTask.dueDate || new Date());

        const childTasksData = [];
        for (let i = 1; i < taskCount; i++) {
            let nextDueDate = addFrequency(baseDueDate, frequency, i);
            childTasksData.push({
                ...restData,
                title: restData.title + ` (Lần ${i + 1}/${taskCount})`,
                dueDate: nextDueDate,
                isRecurring: true,
                recurrenceRule: frequency,
                creatorId: oldTask.creatorId,
                parentTaskId: id, // Linking to current task as parent
                status: 'TODO'
            });
        }

        for (const childData of childTasksData) {
            const childTask: any = await prisma.task.create({ data: childData });
            // Copy relations for children
            if (assignees && assignees.length > 0) {
                await prisma.taskAssignee.createMany({
                    data: assignees.map((userId: string) => ({ taskId: childTask.id, userId }))
                });
            }
            if (observers && observers.length > 0) {
                await prisma.taskObserver.createMany({
                    data: observers.map((userId: string) => ({ taskId: childTask.id, userId }))
                });
            }
        }
    }

    if (changes.length > 0) {
        logActivity(id, userId, 'UPDATED_TASK', JSON.stringify({ summary: changes.join(' | ') }));
    }

    if (newAssigneesToNotify.length > 0) {
        // Create notifications
        const creator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        const notifications = newAssigneesToNotify.map((uId: string) => ({
            userId: uId,
            title: 'Bạn được gán vào 1 công việc',
            message: `${creator?.name || 'Ai đó'} đã gán bạn vào công việc: "${restData.title || oldTask?.title}".`,
            type: 'INFO',
            link: `/tasks/${id}`
        }));
        await prisma.notification.createMany({ data: notifications });

        // Auto send emails
        await triggerAutoTaskEmail(id, newAssigneesToNotify, userId);
    }

    revalidatePath('/tasks');
    revalidatePath(`/tasks/${id}`);
    return updated;
}

export async function updateTaskStatus(id: string, status: string, userId: string) {
    await prisma.task.update({ where: { id }, data: { status } });
    logActivity(id, userId, 'STATUS_CHANGED', JSON.stringify({ to: status }));
    revalidatePath('/tasks');
    revalidatePath(`/tasks/${id}`);
}

export async function deleteTask(id: string) {
    await prisma.task.delete({ where: { id } });
    revalidatePath('/tasks');
}

// Sub-features
export async function addChecklist(taskId: string, title: string, userId: string) {
    const cl = await prisma.taskChecklist.create({
        data: { taskId, title }
    });
    logActivity(taskId, userId, 'CHECKLIST_ADDED', JSON.stringify({ item: title }));
    revalidatePath(`/tasks/${taskId}`);
    return cl;
}

export async function toggleChecklist(checklistId: string, isCompleted: boolean, userId: string) {
    const cl = await prisma.taskChecklist.update({
        where: { id: checklistId },
        data: {
            isCompleted,
            completedById: isCompleted ? userId : null,
            completedAt: isCompleted ? new Date() : null
        }
    });
    logActivity(cl.taskId, userId, isCompleted ? 'CHECKLIST_COMPLETED' : 'CHECKLIST_UNCHECKED', JSON.stringify({ item: cl.title }));
    revalidatePath(`/tasks/${cl.taskId}`);
}

export async function editChecklist(checklistId: string, title: string, userId: string) {
    const oldCl = await prisma.taskChecklist.findUnique({ where: { id: checklistId } });
    const cl = await prisma.taskChecklist.update({
        where: { id: checklistId },
        data: { title }
    });
    if (oldCl && oldCl.title !== title) {
        logActivity(cl.taskId, userId, 'CHECKLIST_EDITED', JSON.stringify({ old: oldCl.title, new: title }));
    }
    revalidatePath(`/tasks/${cl.taskId}`);
}

export async function deleteChecklist(checklistId: string, userId: string) {
    const oldCl = await prisma.taskChecklist.findUnique({ where: { id: checklistId } });
    const cl = await prisma.taskChecklist.delete({
        where: { id: checklistId }
    });
    if (oldCl) {
        logActivity(cl.taskId, userId, 'CHECKLIST_DELETED', JSON.stringify({ item: oldCl.title }));
    }
    revalidatePath(`/tasks/${cl.taskId}`);
}

export async function addComment(taskId: string, content: string, userId: string, parentId?: string) {
    const comment = await prisma.taskComment.create({
        data: { taskId, content, userId, parentId }
    });

    // Parse Mentions
    const allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
    const mentionedUsers = allUsers.filter(u => u.name && content.includes(`@${u.name}`));
    const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    // Identify people to notify: Assginees, Observers, Mentioned
    const taskData = await prisma.task.findUnique({
        where: { id: taskId },
        include: { assignees: true, observers: true }
    });

    const usersToNotify = new Set<string>();

    if (taskData) {
        // Add creator, assignees, observers
        usersToNotify.add(taskData.creatorId);
        taskData.assignees.forEach(a => usersToNotify.add(a.userId));
        taskData.observers.forEach(o => usersToNotify.add(o.userId));
    }

    // Add mentioned
    mentionedUsers.forEach(u => usersToNotify.add(u.id));

    // Remove the sender from notifications (don't notify self)
    usersToNotify.delete(userId);

    if (usersToNotify.size > 0 && taskData) {
        const notifications = Array.from(usersToNotify).map(uId => {
            const isMentioned = mentionedUsers.some(u => u.id === uId);
            return {
                userId: uId,
                title: isMentioned ? 'Bạn được nhắc đến' : 'Bình luận mới',
                message: isMentioned
                    ? `${sender?.name || 'Ai đó'} đã nhắc đến bạn trong bình luận công việc: "${taskData.title}"`
                    : `${sender?.name || 'Ai đó'} đã bình luận vào công việc: "${taskData.title}"`,
                type: 'INFO',
                link: `/tasks/${taskId}`
            };
        });

        await prisma.notification.createMany({ data: notifications });
    }

    logActivity(taskId, userId, 'COMMENT_ADDED', JSON.stringify({ summary: parentId ? 'Đã trả lời một bình luận' : 'Đã thêm bình luận mới' }));

    revalidatePath(`/tasks/${taskId}`);
    revalidatePath(`/tasks/${taskId}`);
}

export async function uploadTaskAttachment(taskId: string, fileName: string, fileUrl: string, fileType: string, userId: string) {
    const taskData = await prisma.task.findUnique({ where: { id: taskId } });
    if (!taskData) throw new Error("Thẻ công việc không tồn tại");

    await prisma.taskAttachment.create({
        data: {
            fileName,
            fileUrl,
            fileType,
            taskId,
            uploadedById: userId
        }
    });

    logActivity(taskId, userId, 'ATTACHMENT_ADDED', JSON.stringify({ summary: `Đã tải lên tài liệu: ${fileName}` }));
    revalidatePath(`/tasks/${taskId}`);
}

export async function deleteTaskAttachment(attachmentId: string, userId: string) {
    const attachment = await prisma.taskAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) return;

    await prisma.taskAttachment.delete({ where: { id: attachmentId } });

    logActivity(attachment.taskId, userId, 'ATTACHMENT_DELETED', JSON.stringify({ summary: `Đã xóa tài liệu: ${attachment.fileName}` }));
    revalidatePath(`/tasks/${attachment.taskId}`);
}

export async function toggleReaction(commentId: string, emoji: string, userId: string) {
    const existing = await prisma.taskCommentReaction.findUnique({
        where: {
            commentId_userId_emoji: { commentId, userId, emoji }
        }
    });

    if (existing) {
        await prisma.taskCommentReaction.delete({ where: { id: existing.id } });
    } else {
        await prisma.taskCommentReaction.create({
            data: { commentId, userId, emoji }
        });
    }

    // We need to revalidate the task page, but we only have commentId. 
    // Find the taskId:
    const comment = await prisma.taskComment.findUnique({ where: { id: commentId }, select: { taskId: true } });
    if (comment) {
        logActivity(comment.taskId, userId, existing ? 'REACTION_REMOVED' : 'REACTION_ADDED', JSON.stringify({ item: emoji }));
        revalidatePath(`/tasks/${comment.taskId}`);
    }
}

export async function updateTaskLinks(taskId: string, linkData: { customerId?: string | null, contractId?: string | null, quoteId?: string | null, handoverId?: string | null, paymentReqId?: string | null, dispatchId?: string | null, salesOrderId?: string | null, salesInvoiceId?: string | null, salesEstimateId?: string | null, salesPaymentId?: string | null }, userId: string) {
    const oldTask = await prisma.task.findUnique({ where: { id: taskId } });

    await prisma.task.update({
        where: { id: taskId },
        data: linkData
    });

    if (oldTask) {
        const changes: string[] = [];
        const keysMap: any = { customerId: 'Khách hàng', contractId: 'Hợp đồng', quoteId: 'Báo giá', handoverId: 'Biên bản bàn giao', paymentReqId: 'Đề nghị thanh toán', dispatchId: 'Công văn', salesOrderId: 'Đơn hàng', salesInvoiceId: 'Hóa đơn', salesEstimateId: 'Báo giá (Sales)', salesPaymentId: 'Phiếu thu', leadId: 'Cơ hội bán hàng' };

        for (const key of Object.keys(linkData)) {
            const oldVal = (oldTask as any)[key];
            const newVal = (linkData as any)[key] ?? null;
            if (oldVal !== newVal) {
                if (newVal) changes.push(`Gắn liên kết ${keysMap[key]}`);
                else changes.push(`Gỡ liên kết ${keysMap[key]}`);
            }
        }

        if (changes.length > 0) {
            logActivity(taskId, userId, 'UPDATED_TASK', JSON.stringify({ summary: changes.join(' | ') }));
        }
    }

    revalidatePath(`/tasks/${taskId}`);
}

export async function searchEntities(type: string, query: string = '') {
    const q = query.toLowerCase();
    switch (type) {
        case 'CUSTOMER':
            return prisma.customer.findMany({ where: { name: { contains: q } }, take: 5, select: { id: true, name: true } });
        case 'CONTRACT':
            return prisma.contract.findMany({ where: { title: { contains: q } }, take: 5, select: { id: true, title: true } });
        case 'QUOTE':
            return prisma.quote.findMany({ where: { title: { contains: q } }, take: 5, select: { id: true, title: true } });
        case 'HANDOVER':
            return prisma.handover.findMany({ where: { title: { contains: q } }, take: 5, select: { id: true, title: true } });
        case 'PAYMENT_REQ':
            return prisma.paymentRequest.findMany({ where: { title: { contains: q } }, take: 5, select: { id: true, title: true } });
        case 'DISPATCH':
            return prisma.dispatch.findMany({ where: { title: { contains: q } }, take: 5, select: { id: true, title: true } });
        case 'SALES_ORDER':
            return prisma.salesOrder.findMany({ where: { code: { contains: q } }, take: 5, select: { id: true, code: true } });
        case 'SALES_INVOICE':
            return prisma.salesInvoice.findMany({ where: { code: { contains: q } }, take: 5, select: { id: true, code: true } });
        case 'SALES_ESTIMATE':
            return prisma.salesEstimate.findMany({ where: { code: { contains: q } }, take: 5, select: { id: true, code: true } });
        case 'SALES_PAYMENT':
            return prisma.salesPayment.findMany({ where: { code: { contains: q } }, take: 5, select: { id: true, code: true } });
        case 'LEAD':
            return prisma.lead.findMany({ where: { OR: [{ code: { contains: q } }, { name: { contains: q } }] }, take: 5, select: { id: true, name: true, code: true } });
        case 'APPENDIX':
            return prisma.contractAppendix.findMany({ where: { title: { contains: q } }, take: 5, select: { id: true, title: true } });
        case 'SUPPLIER':
            return prisma.supplier.findMany({ where: { OR: [{ code: { contains: q } }, { name: { contains: q } }] }, take: 5, select: { id: true, name: true, code: true } });
        case 'EXPENSE':
            return prisma.expense.findMany({ where: { OR: [{ code: { contains: q } }, { description: { contains: q } }] }, take: 5, select: { id: true, description: true, code: true } });
        case 'PURCHASE_ORDER':
            return prisma.purchaseOrder.findMany({ where: { code: { contains: q } }, take: 5, select: { id: true, code: true } });
        case 'PURCHASE_BILL':
            return prisma.purchaseBill.findMany({ where: { code: { contains: q } }, take: 5, select: { id: true, code: true } });
        case 'PURCHASE_PAYMENT':
            return prisma.purchasePayment.findMany({ where: { code: { contains: q } }, take: 5, select: { id: true, code: true } });
        default:
            return [];
    }
}

// KPI Logging Server Utility
export async function logActivity(taskId: string, userId: string, action: string, details?: string) {
    await prisma.taskActivityLog.create({
        data: {
            taskId,
            userId,
            action,
            details
        }
    });
}

// Clone Task Utility
export async function cloneTask(taskId: string, userId: string, keepAssignees: boolean = true) {
    const original = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
            assignees: true,
            observers: true,
            checklists: true,
        }
    });

    if (!original) throw new Error("Task not found");

    const { id, createdAt, updatedAt, status, completedById, completedAt, ...baseData } = original;

    const cloned = await prisma.task.create({
        data: {
            ...baseData,
            title: baseData.title + ' (Copy)',
            creatorId: userId, // The person cloning becomes the new creator
            status: 'TODO',
            assignees: keepAssignees ? {
                create: original.assignees.map(a => ({ userId: a.userId }))
            } : undefined,
            observers: keepAssignees ? {
                create: original.observers.map(o => ({ userId: o.userId }))
            } : {
                create: [{ userId }] // Default to the person cloning as observer
            },
            checklists: {
                create: original.checklists.map(c => ({
                    title: c.title,
                    isCompleted: false
                }))
            }
        }
    });

    logActivity(cloned.id, userId, 'CREATED_TASK', JSON.stringify({ summary: 'Cloned from an existing task' }));
    logActivity(original.id, userId, 'CLONED_TASK', JSON.stringify({ cloneId: cloned.id }));

    revalidatePath('/tasks');
    return cloned;
}

export async function sendTaskEmail(taskId: string, to: string, subject: string, htmlBody: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { customer: true, assignees: { include: { user: true } } }
        });

        if (!task) {
            return { success: false, error: "Không tìm thấy công việc." };
        }

        const res = await sendEmailWithTracking({
            to,
            subject,
            htmlBody,
            senderId: session.user.id,
            customerId: task.customerId || undefined
        });

        if (res.success) {
            await logActivity(
                taskId,
                session.user.id,
                'GỬI_EMAIL',
                JSON.stringify({ summary: `Đã gửi Email thông báo Công việc đến ${to}` })
            );
        }

        return res;
    } catch (error: any) {
        console.error("Lỗi khi gửi email công việc:", error);
        return { success: false, error: error.message };
    }
}
