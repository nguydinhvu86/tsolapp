'use server';
import { formatDate } from '@/lib/utils/formatters';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendEmailWithTracking } from '@/lib/mailer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createManyNotifications } from '@/app/notifications/actions';
import { sendWebPushNotification } from '@/lib/notifications/webPush';

export async function getTasks(filters?: any) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const isAdmin = session?.user?.role === 'ADMIN';

    let whereClause: any = {};

    const viewFilter = buildViewFilter(userId || '', session?.user?.permissions || [], 'TASKS', 'creatorId');

    // Base Privacy Filter
    if (!isAdmin && userId) {
        if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') {
            whereClause = { id: 'UNAUTHORIZED_NO_ACCESS' };
        } else if (Object.keys(viewFilter).length > 0) {
            // viewFilter returned something like { creatorId: userId }
            // For tasks, VIEW_OWN means you can see if you created it OR are assigned OR observing OR it's public
            whereClause = {
                OR: [
                    { isPublic: true },
                    { creatorId: userId },
                    { assignees: { some: { userId: userId } } },
                    { observers: { some: { userId: userId } } }
                ]
            };
        }
        // If viewFilter is empty {}, it means VIEW_ALL, so whereClause stays {}
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
    let baseStartDate = restData.startDate ? new Date(restData.startDate) : null;

    const createdTasks: any[] = [];
    let firstTaskId: string | null = null;

    for (let i = 0; i < taskCount; i++) {
        let currentDueDate = baseDueDate;
        let currentStartDate = baseStartDate;

        if (isRecurringMode && i > 0) {
            if (baseDueDate) currentDueDate = addFrequency(baseDueDate, frequency, i);
            if (baseStartDate) currentStartDate = addFrequency(baseStartDate, frequency, i);
        }

        // Add suffix to title if recurring
        const titleSuffix = isRecurringMode ? ` (Lần ${i + 1}/${taskCount})` : '';

        // Create base task
        const newTask: any = await (prisma.task as any).create({
            data: {
                ...restData,
                title: restData.title + titleSuffix,
                dueDate: currentDueDate,
                startDate: currentStartDate,
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
            await createManyNotifications(notifications);

            // Send Push
            assigneeIdsToNotify.forEach((userId: string) => {
                sendWebPushNotification(userId, {
                    title: 'Công việc mới',
                    body: `Bạn vừa được giao việc định kỳ: "${firstTask.title}".` && !isRecurringMode ? `Bạn vừa được giao công việc: "${firstTask.title}".` : `Tự động tạo: "${firstTask.title}".`,
                    url: `/tasks/${firstTask.id}`
                });
            });
        }

        // Auto send emails (fire and forget)
        triggerAutoTaskEmail(firstTask.id, assigneeIdsToNotify, creatorId).catch(console.error);
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

        await Promise.all(assigneesUsers.map(async (assignee) => {
            if (!assignee.email) return;

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
        }));
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
        if ('startDate' in restData) {
            const oldDate = oldTask.startDate ? oldTask.startDate.toISOString().split('T')[0] : 'None';
            const newDate = restData.startDate ? new Date(restData.startDate).toISOString().split('T')[0] : 'None';
            if (oldDate !== newDate) changes.push(`Ngày bắt đầu: ${oldDate} -> ${newDate}`);
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
        if (!oldTask.parentTaskId) {
            // Find and delete future incomplete child tasks generated from this parent
            await (prisma.task as any).deleteMany({
                where: {
                    parentTaskId: id,
                    status: { notIn: ['DONE', 'CANCELLED'] }
                }
            });

            // Detach remaining completed child tasks so they become independent
            await (prisma.task as any).updateMany({
                where: { parentTaskId: id },
                data: { parentTaskId: null, isRecurring: false, recurrenceRule: null }
            });
        }

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
        const baseStartDate = restData.startDate ? new Date(restData.startDate) : (oldTask.startDate || null);

        const childTasksData = [];
        for (let i = 1; i < taskCount; i++) {
            let nextDueDate = baseDueDate ? addFrequency(baseDueDate, frequency, i) : null;
            let nextStartDate = baseStartDate ? addFrequency(baseStartDate, frequency, i) : null;
            childTasksData.push({
                ...restData,
                title: restData.title + ` (Lần ${i + 1}/${taskCount})`,
                dueDate: nextDueDate,
                startDate: nextStartDate,
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
        await createManyNotifications(notifications);

        // Send push
        newAssigneesToNotify.forEach((uId: string) => {
            sendWebPushNotification(uId, {
                title: 'Công việc mới',
                body: `Bạn được gán vào việc: "${restData.title || oldTask?.title}".`,
                url: `/tasks/${id}`
            });
        });

        // Auto send emails (fire and forget)
        triggerAutoTaskEmail(id, newAssigneesToNotify, userId).catch(console.error);
    }

    revalidatePath('/tasks');
    revalidatePath(`/tasks/${id}`);
    return updated;
}

export async function updateTaskStatus(id: string, status: string, userId: string) {
    const oldTask = await prisma.task.findUnique({
        where: { id },
        include: { assignees: true, observers: true }
    });

    await prisma.task.update({ where: { id }, data: { status } });
    logActivity(id, userId, 'STATUS_CHANGED', JSON.stringify({ to: status }));

    // --- NOTIFICATION & EMAIL LOGIC ---
    if (oldTask && oldTask.status !== status) {
        const statusMap: Record<string, string> = {
            'TODO': 'Cần làm',
            'IN_PROGRESS': 'Đang làm',
            'REVIEW': 'Chờ duyệt',
            'DONE': 'Hoàn thành',
            'CANCELLED': 'Đã hủy'
        };
        const statusText = statusMap[status] || status;
        const oldStatusText = statusMap[oldTask.status] || oldTask.status;

        const creator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

        // Identify people to notify: Assignees and Observers (exclude the person making the change)
        const usersToNotify = new Set<string>();
        if (oldTask.creatorId !== userId) usersToNotify.add(oldTask.creatorId);
        oldTask.assignees.forEach(a => { if (a.userId !== userId) usersToNotify.add(a.userId); });
        oldTask.observers.forEach(o => { if (o.userId !== userId) usersToNotify.add(o.userId); });

        if (usersToNotify.size > 0) {
            // 1. Create In-App Notifications
            const notifications = Array.from(usersToNotify).map(uId => ({
                userId: uId,
                title: 'Trạng thái công việc thay đổi',
                message: `${creator?.name || 'Ai đó'} đã chuyển trạng thái công việc "${oldTask.title}" từ [${oldStatusText}] sang [${statusText}].`,
                type: 'INFO',
                link: `/tasks/${id}`
            }));
            await createManyNotifications(notifications);

            // Send Push
            Array.from(usersToNotify).forEach((uId: string) => {
                sendWebPushNotification(uId, {
                    title: 'Trạng thái công việc',
                    body: `Việc "${oldTask.title}" đổi trạng thái thành ${statusText}`,
                    url: `/tasks/${id}`
                });
            });

            // 2. Send Emails
            const { getTemplatesByModule } = await import('@/app/email-templates/actions');
            const templates = await getTemplatesByModule('TASK');
            let template = templates[0];
            const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

            const users = await prisma.user.findMany({ where: { id: { in: Array.from(usersToNotify) } } });

            // Fire all emails in parallel (fire and forget pattern so we do not block returning status to client)
            Promise.all(users.map(async (u) => {
                if (!u.email) return;
                let subject = `Cập nhật trạng thái công việc: ${oldTask.title}`;
                let htmlBody = `<p>Công việc <strong>${oldTask.title}</strong> vừa được chuyển trạng thái sang: <strong>${statusText}</strong>.</p>
        <p>Người thực hiện: ${creator?.name || 'Hệ thống'}</p>
        <p><a href="${baseUrl}/tasks/${id}">Xem công việc</a></p>`;

                if (template) {
                    subject = template.subject || subject;
                    htmlBody = template.body || htmlBody;

                    const variables: Record<string, string> = {
                        '{{taskTitle}}': oldTask.title,
                        '{{taskDescription}}': oldTask.description || 'Không có mô tả',
                        '{{dueDate}}': oldTask.dueDate ? formatDate(new Date(oldTask.dueDate)) : 'Không có hạn chót',
                        '{{priority}}': oldTask.priority === 'URGENT' ? 'Khẩn cấp' : oldTask.priority === 'HIGH' ? 'Cao' : oldTask.priority === 'MEDIUM' ? 'Trung bình' : 'Thấp',
                        '{{assignerName}}': creator?.name || 'Hệ thống',
                        '{{assigneeName}}': u.name || u.email || 'Bạn',
                        '{{link}}': `${baseUrl}/tasks/${id}`
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
            })).catch(console.error);
        }
    }
    // ----------------------------------

    revalidatePath('/tasks');
    revalidatePath(`/tasks/${id}`);
}

export async function deleteTask(id: string) {
    const task = await prisma.task.findUnique({ where: { id }, include: { childTasks: true } });

    if (task && task.childTasks && task.childTasks.length > 0) {
        // Xóa các task con chưa hoàn thành để dọn dẹp
        await prisma.task.deleteMany({
            where: {
                parentTaskId: id,
                status: { notIn: ['DONE', 'CANCELLED'] }
            }
        });

        // Hủy liên kết các task con đã hoàn thành (giữ lại lịch sử)
        await prisma.task.updateMany({
            where: { parentTaskId: id },
            data: { parentTaskId: null, isRecurring: false, recurrenceRule: null }
        });
    }

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

        await createManyNotifications(notifications);
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

import { buildViewFilter, ResourceId } from '@/lib/permissions';

export async function searchEntities(type: string, query: string = '') {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) return [];

    const perms = (session.user as any).permissions || [];
    const userId = (session.user as any).id;

    const q = query.toLowerCase();

    const getRes = (resName: ResourceId) => {
        const filter = buildViewFilter(userId, perms, resName, 'creatorId');
        return filter.id === 'UNAUTHORIZED_NO_ACCESS' ? null : filter;
    };

    switch (type) {
        case 'CUSTOMER': {
            const f = getRes('CUSTOMERS');
            return f ? prisma.customer.findMany({ where: { AND: [f as any, { name: { contains: q } }] }, take: 5, select: { id: true, name: true } }) : [];
        }
        case 'CONTRACT': {
            const f = getRes('CONTRACTS');
            return f ? prisma.contract.findMany({ where: { AND: [f as any, { title: { contains: q } }] }, take: 5, select: { id: true, title: true } }) : [];
        }
        case 'QUOTE': {
            const f = getRes('QUOTES');
            return f ? prisma.quote.findMany({ where: { AND: [f as any, { title: { contains: q } }] }, take: 5, select: { id: true, title: true } }) : [];
        }
        case 'HANDOVER': {
            const f = getRes('HANDOVERS');
            return f ? prisma.handover.findMany({ where: { AND: [f as any, { title: { contains: q } }] }, take: 5, select: { id: true, title: true } }) : [];
        }
        case 'PAYMENT_REQ': {
            const f = getRes('PAYMENTS');
            return f ? prisma.paymentRequest.findMany({ where: { AND: [f as any, { title: { contains: q } }] }, take: 5, select: { id: true, title: true } }) : [];
        }
        case 'DISPATCH': {
            const f = getRes('DISPATCHES');
            return f ? prisma.dispatch.findMany({ where: { AND: [f as any, { title: { contains: q } }] }, take: 5, select: { id: true, title: true } }) : [];
        }
        case 'SALES_ORDER': {
            const f = getRes('SALES_ORDERS');
            return f ? prisma.salesOrder.findMany({ where: { AND: [f as any, { code: { contains: q } }] }, take: 5, select: { id: true, code: true } }) : [];
        }
        case 'SALES_INVOICE': {
            const f = getRes('SALES_INVOICES');
            return f ? prisma.salesInvoice.findMany({ where: { AND: [f as any, { code: { contains: q } }] }, take: 5, select: { id: true, code: true } }) : [];
        }
        case 'SALES_ESTIMATE': {
            const f = getRes('SALES_ESTIMATES');
            return f ? prisma.salesEstimate.findMany({ where: { AND: [f as any, { code: { contains: q } }] }, take: 5, select: { id: true, code: true } }) : [];
        }
        case 'SALES_PAYMENT': {
            const f = getRes('SALES_PAYMENTS');
            return f ? prisma.salesPayment.findMany({ where: { AND: [f as any, { code: { contains: q } }] }, take: 5, select: { id: true, code: true } }) : [];
        }
        case 'LEAD': {
            return prisma.lead.findMany({ where: { OR: [{ code: { contains: q } }, { name: { contains: q } }] }, take: 5, select: { id: true, name: true, code: true } });
        }
        case 'APPENDIX': {
            const f = getRes('CONTRACTS');
            return f ? prisma.contractAppendix.findMany({ where: { AND: [{ contract: f as any }, { title: { contains: q } }] }, take: 5, select: { id: true, title: true } }) : [];
        }
        case 'SUPPLIER': {
            const f = getRes('SUPPLIERS');
            return f ? prisma.supplier.findMany({ where: { AND: [f as any, { OR: [{ code: { contains: q } }, { name: { contains: q } }] }] }, take: 5, select: { id: true, name: true, code: true } }) : [];
        }
        case 'EXPENSE': {
            const f = getRes('SALES_EXPENSES');
            return f ? prisma.expense.findMany({ where: { AND: [f as any, { OR: [{ code: { contains: q } }, { description: { contains: q } }] }] }, take: 5, select: { id: true, description: true, code: true } }) : [];
        }
        case 'PURCHASE_ORDER': {
            const f = getRes('PURCHASE_ORDERS');
            return f ? prisma.purchaseOrder.findMany({ where: { AND: [f as any, { code: { contains: q } }] }, take: 5, select: { id: true, code: true } }) : [];
        }
        case 'PURCHASE_BILL': {
            const f = getRes('PURCHASE_BILLS');
            return f ? prisma.purchaseBill.findMany({ where: { AND: [f as any, { code: { contains: q } }] }, take: 5, select: { id: true, code: true } }) : [];
        }
        case 'PURCHASE_PAYMENT': {
            const f = getRes('PURCHASE_PAYMENTS');
            return f ? prisma.purchasePayment.findMany({ where: { AND: [f as any, { code: { contains: q } }] }, take: 5, select: { id: true, code: true } }) : [];
        }
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
